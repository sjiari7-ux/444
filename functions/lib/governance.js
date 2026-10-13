"use strict";

/* ============================================================
   GOVERNANCE — how a country gets (and loses) its Leader.
   Server-authoritative: the client only asks for an action.

   TERM        a Leader rules for 30 days (rc_kingdoms/{cid}.termEndsAt). When it ends an election starts.
   ELECTION    lasts 48 h in total, stored in rc_kingdoms/{cid}.election:
                 hours  0-24  NOMINATION  any citizen may register as a candidate
                 hours 24-48  VOTING      every citizen above level 10 has ONE vote
               The candidate with the most votes wins. A tie goes to the higher level, then to the
               citizen who joined the country first.
               The sitting Leader keeps ruling (and may run) until the result.
               While an election is open the Leader cannot hand over leadership, change ranks, kick, or declare war.
               Winner = old Leader  -> keeps the post and the team, gets a fresh term.
               Winner = someone new -> becomes Leader; the old Leader and the whole government
                                       (Co-Leader / Officers) go back to Member, the new Leader picks a new team.
               Nobody registered   -> the sitting Leader simply stays for another term.
   ABSENCE     a Leader who has not played for 4 days is replaced by the highest-ranking ACTIVE government member
               (Co-Leader first, then Officer; ties: higher level, then older citizen). With nobody to hand it to, an election starts.
   VACANT      no Leader + citizens above level 10 -> an election starts.
               no Leader + nobody above level 10 (or a one-citizen country) -> the "Claim leadership" button.
   Everything runs lazily (whenever a citizen opens the country), so no scheduler is needed.
   ============================================================ */
const admin = require("firebase-admin");
const Community = require("./community");
const { fail } = require("./errors");

let now = () => Date.now();
function _setClock(fn) { now = fn || (() => Date.now()); }
function db() { return admin.firestore(); }
const playerRef = (uid) => db().doc("rc_players/" + uid);
const kingdomRef = (cid) => db().doc("rc_kingdoms/" + cid);

const HOUR_MS = 60 * 60 * 1000, DAY_MS = 24 * HOUR_MS;
const TERM_MS = 30 * DAY_MS;                 // length of one term
const NOMINATION_MS = 24 * HOUR_MS;          // candidate registration
const VOTING_MS = 24 * HOUR_MS;              // voting (starts right after the registration)
const LEADER_INACTIVE_MS = 4 * DAY_MS;       // Leader away this long -> the government takes over (or an election starts)
const VOTE_MIN_LEVEL = 10;                   // a citizen may vote only ABOVE this level (11+)
const ROLE_RANK = Community.ROLE_RANK;
const GOV_ROLES = ["Co-Leader", "Officer"];  // the Leader's team

/* ---------- small helpers ---------- */
const lvl = (d) => Number(d.level) || 1;
const seen = (d) => Number(d.updatedAt) || 0;
const joinedAt = (d) => Number(d.kingdomJoinedAt) || 0;
const canVote = (d) => lvl(d) > VOTE_MIN_LEVEL;
const isActive = (d, t) => seen(d) > 0 && t - seen(d) < LEADER_INACTIVE_MS;

async function loadCitizens(cid) {
  const snap = await db().collection("rc_players").where("kingdomId", "==", cid).limit(80).get();
  return snap.docs.filter((d) => d.data().username).map((d) => ({ id: d.id, d: d.data() }));
}
// One citizen? Or nobody above level 10? Then nobody can run a proper vote and the Claim button is used instead.
const electionPossible = (citizens) => citizens.length > 1 && citizens.some((x) => canVote(x.d));
const byRankLevelAge = (a, b) =>
  (ROLE_RANK[b.d.kingdomRole] || 0) - (ROLE_RANK[a.d.kingdomRole] || 0) || lvl(b.d) - lvl(a.d) || joinedAt(a.d) - joinedAt(b.d);

function phaseOf(el, t) {
  if (!el) return null;
  return t < el.nominationEndsAt ? "nomination" : t < el.votingEndsAt ? "voting" : "ended";
}
function newElection(t, reason) {
  return { reason, startedAt: t, nominationEndsAt: t + NOMINATION_MS, votingEndsAt: t + NOMINATION_MS + VOTING_MS, candidates: {}, votes: {} };
}
// votes per candidate (only votes for registered candidates count)
function tallyOf(el) {
  const cands = el.candidates || {}, votes = el.votes || {}, n = {};
  Object.keys(cands).forEach((id) => { n[id] = 0; });
  Object.keys(votes).forEach((v) => { if (n[votes[v]] !== undefined) n[votes[v]]++; });
  return n;
}

// small single-document write, done as a transaction like everything else here
async function patchKingdom(cid, fields) {
  await db().runTransaction(async (tx) => {
    const k = await tx.get(kingdomRef(cid));
    if (k.exists) tx.update(kingdomRef(cid), fields);
  });
}

/* ---------- starting an election ---------- */
async function startElection(cid, reason) {
  const started = await db().runTransaction(async (tx) => {
    const k = await tx.get(kingdomRef(cid));
    if (!k.exists || k.data().election) return false;
    if (reason === "vacant" && k.data().leaderId) return false;
    tx.update(kingdomRef(cid), { election: newElection(now(), reason) });
    return true;
  });
  if (started) {
    const why = reason === "term" ? "The Leader's 30-day term is over." : reason === "absent" ? "The Leader has been away for 4 days." : "The country has no Leader.";
    await Community.postSystemChat(cid, `${why} An election has started: register as a candidate within 24 hours, then vote for the next 24 hours.`);
  }
  return started;
}

/* ---------- the Leader was away: the government takes over ---------- */
async function promoteSuccessor(cid, oldLeaderId, next, why) {
  const done = await db().runTransaction(async (tx) => {
    const k = await tx.get(kingdomRef(cid));
    if (!k.exists || k.data().leaderId !== oldLeaderId || k.data().election) return false;   // someone else already changed it
    const old = await tx.get(playerRef(oldLeaderId));
    tx.update(kingdomRef(cid), { leaderId: next.id, termEndsAt: now() + TERM_MS });
    tx.update(playerRef(next.id), { kingdomRole: "Leader" });
    if (old.exists && old.data().kingdomId === cid) tx.update(playerRef(oldLeaderId), { kingdomRole: "Officer" });
    return true;
  });
  if (done) await Community.postSystemChat(cid, `${next.d.username} is the new Leader (${why}).`);
  return done;
}

/* ---------- the election is over: count and install the winner ---------- */
async function resolveElection(cid, k, t) {
  const el = k.election;
  const citizens = await loadCitizens(cid);
  const byId = {}; citizens.forEach((x) => { byId[x.id] = x; });
  const votes = tallyOf(el);
  const cands = Object.keys(el.candidates || {}).filter((id) => byId[id]);        // someone who left the country cannot win
  cands.sort((a, b) => (votes[b] - votes[a]) || lvl(byId[b].d) - lvl(byId[a].d) || joinedAt(byId[a].d) - joinedAt(byId[b].d));
  const winnerId = cands[0] || null;

  const out = await db().runTransaction(async (tx) => {
    const k2 = await tx.get(kingdomRef(cid));
    if (!k2.exists || !k2.data().election || k2.data().election.startedAt !== el.startedAt) return null;   // already resolved by someone else
    const leaderId = k2.data().leaderId || null;
    const upd = { election: null, termEndsAt: t + TERM_MS };
    let kind;
    if (!winnerId) {
      kind = "none";
      if (el.reason === "absent") upd.absenceElectionBlockedUntil = t + LEADER_INACTIVE_MS;   // no endless 48 h loops for an absent Leader nobody wants to replace
    } else if (winnerId === leaderId) {
      kind = "kept";
    } else {
      kind = "new";
      upd.leaderId = winnerId;
      citizens.forEach((x) => {
        if (x.id === winnerId) return;
        const r = x.d.kingdomRole;
        if (r === "Leader" || GOV_ROLES.includes(r)) tx.update(playerRef(x.id), { kingdomRole: "Member" });   // the old team goes
      });
      tx.update(playerRef(winnerId), { kingdomRole: "Leader" });
    }
    upd.lastElection = { endedAt: t, kind, winnerId, winnerName: winnerId ? byId[winnerId].d.username : null, votes: winnerId ? votes[winnerId] : 0, reason: el.reason };
    tx.update(kingdomRef(cid), upd);
    return { kind, name: winnerId ? byId[winnerId].d.username : null, n: winnerId ? votes[winnerId] : 0 };
  });
  if (!out) return false;
  const s = (n) => `${n} vote${n === 1 ? "" : "s"}`;
  await Community.postSystemChat(cid, out.kind === "new" ? `${out.name} won the election with ${s(out.n)} and is the new Leader. The previous government has been dismissed.`
    : out.kind === "kept" ? `${out.name} won the election with ${s(out.n)} and stays Leader for a new 30-day term.`
    : "The election ended without any candidate: the Leader stays for another term.");
  return true;
}

/* ---------- the lazy "clock": returns true when something changed ---------- */
async function tick(cid) {
  const kSnap = await kingdomRef(cid).get();
  if (!kSnap.exists) return false;
  const k = kSnap.data(), t = now();

  if (k.election) return phaseOf(k.election, t) === "ended" ? resolveElection(cid, k, t) : false;   // an open election blocks everything else

  const citizens = await loadCitizens(cid);

  if (!k.leaderId) {                                                 // vacant seat
    if (electionPossible(citizens)) return startElection(cid, "vacant");
    return false;                                                    // -> the Claim button
  }

  if (!k.termEndsAt) {                                               // a country that existed before terms: its term starts now
    await patchKingdom(cid, { termEndsAt: t + TERM_MS });
    return true;
  }

  const lead = citizens.find((x) => x.id === k.leaderId);
  const gone = !lead || (seen(lead.d) > 0 && t - seen(lead.d) >= LEADER_INACTIVE_MS);   // left the country, or away too long
  if (gone) {
    const next = citizens.filter((x) => x.id !== k.leaderId && GOV_ROLES.includes(x.d.kingdomRole) && isActive(x.d, t)).sort(byRankLevelAge)[0];
    if (next) return promoteSuccessor(cid, k.leaderId, next, lead ? "the previous Leader was away for 4 days" : "the previous Leader left the country");
    if ((k.absenceElectionBlockedUntil || 0) <= t && electionPossible(citizens)) return startElection(cid, "absent");
    return false;
  }

  if (t >= k.termEndsAt) {
    if (electionPossible(citizens)) return startElection(cid, "term");
    await patchKingdom(cid, { termEndsAt: t + TERM_MS });            // nobody could vote anyway: the term simply continues
    return true;
  }
  return false;
}

async function processCountry(cid) {
  try {
    for (let i = 0; i < 3 && (await tick(cid)); i++) { /* one stage per round: e.g. a finished election, then nothing more */ }
  } catch (e) { console.error("governance", cid, e); }
}

/* ---------- actions ---------- */
async function myCountry(tx, uid) {
  const me = await tx.get(playerRef(uid));
  if (!me.exists) fail("not-found", "NO_CHARACTER");
  const cid = me.data().kingdomId;
  if (!cid) fail("failed-precondition", "NO_COUNTRY");
  return { me, cid };
}

async function nominateCandidate(uid) {
  const out = await db().runTransaction(async (tx) => {
    const { me, cid } = await myCountry(tx, uid);
    const k = await tx.get(kingdomRef(cid));
    const el = k.exists ? k.data().election : null;
    if (!el) fail("failed-precondition", "NO_ELECTION");
    if (phaseOf(el, now()) !== "nomination") fail("failed-precondition", "NOMINATION_CLOSED");
    if ((el.candidates || {})[uid]) fail("failed-precondition", "ALREADY_CANDIDATE");
    const cands = Object.assign({}, el.candidates, { [uid]: { name: me.data().username || "Player", level: lvl(me.data()), at: now() } });
    tx.update(kingdomRef(cid), { election: Object.assign({}, el, { candidates: cands }) });
    return { cid, name: me.data().username || "A citizen" };
  });
  await Community.postSystemChat(out.cid, `${out.name} registered as a candidate for Leader.`);
  return { countryId: out.cid };
}

async function voteCandidate(uid, data) {
  const candidateId = data && data.candidateId;
  if (!candidateId || typeof candidateId !== "string") fail("invalid-argument", "INVALID_TARGET");
  return db().runTransaction(async (tx) => {
    const { me, cid } = await myCountry(tx, uid);
    const k = await tx.get(kingdomRef(cid));
    const el = k.exists ? k.data().election : null;
    if (!el) fail("failed-precondition", "NO_ELECTION");
    const ph = phaseOf(el, now());
    if (ph === "nomination") fail("failed-precondition", "VOTING_NOT_OPEN", { opensAt: el.nominationEndsAt });
    if (ph !== "voting") fail("failed-precondition", "VOTING_CLOSED");
    if (!canVote(me.data())) fail("failed-precondition", "LEVEL_TOO_LOW", { required: VOTE_MIN_LEVEL + 1 });
    if (joinedAt(me.data()) > el.startedAt) fail("failed-precondition", "JOINED_AFTER_ELECTION_START");   // no joining a country just to vote
    if ((el.votes || {})[uid]) fail("failed-precondition", "ALREADY_VOTED");
    if (!(el.candidates || {})[candidateId]) fail("failed-precondition", "NOT_A_CANDIDATE");
    const tg = await tx.get(playerRef(candidateId));
    if (!tg.exists || tg.data().kingdomId !== cid) fail("failed-precondition", "CANDIDATE_LEFT");
    tx.update(kingdomRef(cid), { election: Object.assign({}, el, { votes: Object.assign({}, el.votes, { [uid]: candidateId }) }) });
    return { countryId: cid, candidateId };
  });
}

// An empty seat in a country where a real vote is impossible (one citizen, or nobody above level 10).
async function claimLeadership(uid) {
  const p = await playerRef(uid).get();
  if (!p.exists) fail("not-found", "NO_CHARACTER");
  const cid = p.data().kingdomId;
  if (!cid) fail("failed-precondition", "NO_COUNTRY");
  const citizens = await loadCitizens(cid);
  if (electionPossible(citizens)) fail("failed-precondition", "ELECTION_REQUIRED");
  const name = await db().runTransaction(async (tx) => {
    const k = await tx.get(kingdomRef(cid));
    if (k.exists && k.data().leaderId) fail("failed-precondition", "ALREADY_HAS_LEADER");
    if (k.exists && k.data().election) fail("failed-precondition", "ELECTION_RUNNING");
    const me = await tx.get(playerRef(uid));
    const upd = { leaderId: uid, termEndsAt: now() + TERM_MS };
    if (k.exists) tx.update(kingdomRef(cid), upd);
    else tx.set(kingdomRef(cid), Object.assign({ id: cid, treasury: {}, chat: [] }, upd));
    tx.update(playerRef(uid), { kingdomRole: "Leader" });
    return me.data().username || "A citizen";
  });
  await Community.postSystemChat(cid, `${name} claimed the empty leadership seat.`);
  return { countryId: cid, leaderId: uid };
}

// Everything the Government tab needs. Also runs the lazy clock first, so the answer is never stale.
async function getGovernance(uid) {
  const p = await playerRef(uid).get();
  if (!p.exists) fail("not-found", "NO_CHARACTER");
  const cid = p.data().kingdomId;
  if (!cid) fail("failed-precondition", "NO_COUNTRY");
  await processCountry(cid);
  const [kSnap, citizens, meSnap] = await Promise.all([kingdomRef(cid).get(), loadCitizens(cid), playerRef(uid).get()]);
  const k = kSnap.exists ? kSnap.data() : {}, me = meSnap.data(), t = now(), el = k.election || null;
  let election = null;
  if (el) {
    const votes = tallyOf(el);
    election = {
      reason: el.reason, phase: phaseOf(el, t), startedAt: el.startedAt, nominationEndsAt: el.nominationEndsAt, votingEndsAt: el.votingEndsAt,
      candidates: Object.keys(el.candidates || {}).map((id) => ({ id, name: el.candidates[id].name, level: el.candidates[id].level, votes: votes[id] }))
        .sort((a, b) => b.votes - a.votes || b.level - a.level),
      totalVotes: Object.keys(el.votes || {}).length,
    };
  }
  const phase = election ? election.phase : null;
  const alreadyVoted = !!(el && (el.votes || {})[uid]);
  return {
    serverNow: t, countryId: cid, leaderId: k.leaderId || null, termEndsAt: k.termEndsAt || null, election,
    lastElection: k.lastElection || null,
    voteMinLevel: VOTE_MIN_LEVEL + 1,
    me: {
      level: lvl(me),
      isCandidate: !!(el && (el.candidates || {})[uid]),
      votedFor: el ? (el.votes || {})[uid] || null : null,
      canNominate: phase === "nomination" && !(el.candidates || {})[uid],
      canVote: phase === "voting" && canVote(me) && !alreadyVoted && !(joinedAt(me) > el.startedAt),
    },
    claimAllowed: !k.leaderId && !el && !electionPossible(citizens),
  };
}

// Used by the actions an open election freezes (hand-over, war declaration...).
function assertNoElection(kingdomData) {
  if (kingdomData && kingdomData.election) fail("failed-precondition", "ELECTION_IN_PROGRESS");
}

module.exports = {
  processCountry, getGovernance, nominateCandidate, voteCandidate, claimLeadership, assertNoElection,
  TERM_MS, NOMINATION_MS, VOTING_MS, LEADER_INACTIVE_MS, VOTE_MIN_LEVEL, _setClock,
};
