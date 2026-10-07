"use strict";

/* ============================================================
   COUNTRY WARS — server-authoritative.
   Every function here runs on the server (called from index.js). The client
   can only ask for an action; it never supplies damage, winners, rewards,
   rates or durations.

   Collections (all read-only for clients, see firestore.rules):
     rc_countries/{countryId}            economy + war pointers (economy.js)
     rc_wars/{warId}                     the war: rounds, score, reward
     rc_wars/{warId}/rounds/{n}          per-round damage (+ per-player contribution)
     rc_warPlayers/{warId}_{uid}         per-player strike limits for one war
     rc_config/war                       optional balance overrides
   ============================================================ */
const admin = require("firebase-admin");
const G = require("./game-core");
const { fail } = require("./errors");
const { COUNTRY_BY_ID } = require("./countries");
const W = require("./war-core");
const E = require("./economy");
const RD = require("./resource-distribution");
const Community = require("./community");

let now = () => Date.now();
function _setClock(fn) { now = fn || (() => Date.now()); }

function db() { return admin.firestore(); }
function FV() { return admin.firestore.FieldValue; }
const warRef = (id) => db().doc("rc_wars/" + id);
const roundRef = (warId, n) => db().doc(`rc_wars/${warId}/rounds/${n}`);
const warPlayerRef = (warId, uid) => db().doc(`rc_warPlayers/${warId}_${uid}`);
const playerRef = (uid) => db().doc("rc_players/" + uid);
const kingdomRef = (cid) => db().doc("rc_kingdoms/" + cid);

/* ---------- config (defaults + optional rc_config/war overrides) ---------- */
const SPECIALITY_COOLDOWN_MS = 7 * W.DAY_MS; // how often a Leader may re-pick the country's 2 specialities
const CFG_LIMITS = {
  prepMs: [0, 7 * W.DAY_MS], roundMs: [1000, 7 * W.DAY_MS], cooldownMs: [0, 30 * W.DAY_MS],
  minMembers: [1, 500], warTaxRate: [1, 25], warTaxRateMin: [1, 50], warTaxRateMax: [1, 50], warTaxDays: [1, 60], rewardClaimMs: [60 * 1000, 30 * W.DAY_MS],
  strikeEnergyCost: [0, 100], strikeCooldownMs: [0, 600000], maxStrikesPerPlayerPerRound: [1, 1000],
  maxHitsPerTarget: [1, 50],
};
async function loadConfig() {
  const cfg = Object.assign({}, W.WAR_CONFIG);
  try {
    const snap = await db().doc("rc_config/war").get();
    if (snap.exists) {
      const o = snap.data();
      Object.keys(CFG_LIMITS).forEach((k) => {
        if (typeof o[k] === "number" && isFinite(o[k])) cfg[k] = Math.max(CFG_LIMITS[k][0], Math.min(CFG_LIMITS[k][1], o[k]));
      });
    }
  } catch (e) { /* defaults */ }
  return cfg;
}

// What a war remembers about the rules it was declared under.
function cfgSnapshot(cfg) {
  return {
    roundMs: cfg.roundMs, roundsToWin: cfg.roundsToWin, maxRounds: cfg.maxRounds,
    warTaxRate: cfg.warTaxRate, warTaxRateMin: cfg.warTaxRateMin, warTaxRateMax: cfg.warTaxRateMax, warTaxDays: cfg.warTaxDays, cooldownMs: cfg.cooldownMs,
    rewardClaimMs: cfg.rewardClaimMs, strikeEnergyCost: cfg.strikeEnergyCost,
    strikeCooldownMs: cfg.strikeCooldownMs, maxStrikesPerPlayerPerRound: cfg.maxStrikesPerPlayerPerRound,
    maxHitsPerTarget: cfg.maxHitsPerTarget, duelMaxRounds: cfg.duelMaxRounds,
  };
}

function newWarId() { return "war_" + now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }

/* ============================================================
   declareWar — only the Leader of the declaring country.
   ============================================================ */
async function declareWar(uid, data) {
  const targetId = data && data.targetCountryId;
  if (!COUNTRY_BY_ID[targetId]) fail("invalid-argument", "INVALID_TARGET");
  const cfg = await loadConfig();

  const declared = await db().runTransaction(async (tx) => {
    const t = now();
    const pSnap = await tx.get(playerRef(uid));
    if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
    const aid = pSnap.data().kingdomId;
    if (!aid || !COUNTRY_BY_ID[aid]) fail("failed-precondition", "NO_COUNTRY");
    if (aid === targetId) fail("invalid-argument", "INVALID_TARGET");

    const [kSnap, A, D] = await Promise.all([tx.get(kingdomRef(aid)), E.readCountry(tx, aid), E.readCountry(tx, targetId)]);
    if (!kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");

    // A stored activeWarId only counts if that war is really still running.
    const ptrs = [A.activeWarId, D.activeWarId];
    const ptrSnaps = await Promise.all(ptrs.map((id) => (id ? tx.get(warRef(id)) : null)));
    const running = (s) => !!(s && s.exists && s.data().status !== "finished");
    if (running(ptrSnaps[0])) fail("failed-precondition", "ALREADY_AT_WAR");
    if (running(ptrSnaps[1])) fail("failed-precondition", "TARGET_AT_WAR");

    if (A.warCooldownUntil > t) fail("failed-precondition", "COOLDOWN_ACTIVE", { countryId: aid, msRemaining: A.warCooldownUntil - t });
    if (D.warCooldownUntil > t) fail("failed-precondition", "TARGET_COOLDOWN", { countryId: targetId, msRemaining: D.warCooldownUntil - t });
    // One war tax at a time per country: a country paying reparations (or whose
    // conqueror hasn't chosen yet) can't be hit again, so taxes never pile up.
    if (W.isWarTaxActive(D.warTaxOut, t) || (D.pendingReward && D.pendingReward.expiresAt > t)) {
      fail("failed-precondition", "TARGET_PROTECTED", { countryId: targetId });
    }

    const [aMembers, dMembers] = await Promise.all([
      db().collection("rc_players").where("kingdomId", "==", aid).limit(cfg.minMembers).get(),
      db().collection("rc_players").where("kingdomId", "==", targetId).limit(cfg.minMembers).get(),
    ]);
    if (aMembers.size < cfg.minMembers || dMembers.size < cfg.minMembers) fail("failed-precondition", "NOT_ENOUGH_MEMBERS", { required: cfg.minMembers });

    const id = newWarId();
    const war = {
      id, status: "preparing",
      attackerCountryId: aid, defenderCountryId: targetId,
      declaredBy: uid, declaredAt: t, startsAt: t + cfg.prepMs,
      cfg: cfgSnapshot(cfg),
      finalScore: { [aid]: 0, [targetId]: 0 },
      rounds: [],
      winnerCountryId: null, loserCountryId: null,
      selectedResource: null, warTaxRate: cfg.warTaxRate, warTaxDurationDays: cfg.warTaxDays,
      reward: null, startedAt: null, endedAt: null,
    };
    tx.set(warRef(id), war);
    tx.set(E.countryRef(aid), { activeWarId: id }, { merge: true });
    tx.set(E.countryRef(targetId), { activeWarId: id }, { merge: true });
    return { warId: id, startsAt: war.startsAt, serverNow: t, attackerCountryId: aid };
  });
  const an = COUNTRY_BY_ID[declared.attackerCountryId].name, dn = COUNTRY_BY_ID[targetId].name;
  const msg = `⚔ ${an} declared war on ${dn}! Round 1 starts in ${Math.max(1, Math.round(cfg.prepMs / 60000))} min.`;
  await Promise.all([Community.postSystemChat(declared.attackerCountryId, msg), Community.postSystemChat(targetId, msg)]);
  return declared;
}

/* ============================================================
   advanceWar — moves a war forward to the current server time.
   Safe to call any number of times, from anywhere (every war call, a
   scheduled tick): a war ends correctly even if nobody is online.
   ============================================================ */
async function advanceWar(warId) {
  let announce = null;
  const result = await db().runTransaction(async (tx) => {
    announce = null;
    const t = now();
    const wSnap = await tx.get(warRef(warId));
    if (!wSnap.exists) fail("not-found", "WAR_NOT_FOUND");
    const war = wSnap.data();
    if (war.status === "finished") return { war, changed: false };
    const cur = W.currentRound(war);
    const due = (war.status === "preparing" && t >= war.startsAt) || (cur && t >= cur.endsAt);
    if (!due) return { war, changed: false };

    const rSnaps = await Promise.all([1, 2, 3].map((n) => tx.get(roundRef(warId, n))));
    const roundDocs = {};
    rSnaps.forEach((s, i) => { roundDocs[i + 1] = s.exists ? s.data() : null; });
    const res = W.advanceWarState(war, roundDocs, t);
    if (!res.changed) return { war, changed: false };

    let A = null, D = null;
    if (res.finished) { // all reads first
      [A, D] = await Promise.all([E.readCountry(tx, war.attackerCountryId), E.readCountry(tx, war.defenderCountryId)]);
    }
    const w = res.war;
    if (res.finished) {
      const loserC = w.loserCountryId === A.id ? A : D;
      w.reward = {
        status: "awaiting_choice",
        winnerCountryId: w.winnerCountryId, loserCountryId: w.loserCountryId,
        options: allTaxableResources(), loserResources: loserC.natural.slice(),
        claimExpiresAt: w.endedAt + w.cfg.rewardClaimMs,
        resourceId: null, rate: w.cfg.warTaxRate, startedAt: null, expiresAt: null,
      };
      const cooldownUntil = w.endedAt + w.cfg.cooldownMs;
      [w.attackerCountryId, w.defenderCountryId].forEach((cid) => {
        const patch = { activeWarId: null, warCooldownUntil: cooldownUntil };
        if (cid === w.loserCountryId) patch.pendingReward = { warId: w.id, winnerCountryId: w.winnerCountryId, expiresAt: w.reward.claimExpiresAt };
        tx.set(E.countryRef(cid), patch, { merge: true });
      });
    }
    tx.set(warRef(warId), w);
    announce = { before: { status: war.status, rounds: (war.rounds || []).map((r) => ({ round: r.round, status: r.status })) }, after: w };
    return { war: w, changed: true };
  });
  if (announce) await announceWarProgress(announce.before, announce.after);
  return result;
}

// Posts the news of whatever just happened (war started, round decided, war over) to BOTH countries' chats.
function shortNum(n) { n = Math.floor(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); }
async function announceWarProgress(before, after) {
  const A = after.attackerCountryId, D = after.defenderCountryId;
  const nm = (id) => (COUNTRY_BY_ID[id] ? COUNTRY_BY_ID[id].name : id);
  const lines = [];
  if (before.status === "preparing" && after.status !== "preparing") lines.push(`⚔ The war ${nm(A)} vs ${nm(D)} has started! Round 1 is on.`);
  const was = {};
  (before.rounds || []).forEach((r) => { was[r.round] = r.status; });
  (after.rounds || []).forEach((r) => {
    if (r.status === "done" && was[r.round] !== "done") {
      const dm = r.damage || {};
      lines.push(`Round ${r.round}: ${nm(r.winner)} won (${nm(A)} ${shortNum(dm[A])} vs ${nm(D)} ${shortNum(dm[D])}).`);
    } else if (r.status === "active" && was[r.round] === undefined && r.round > 1) {
      lines.push(`Round ${r.round} has started.`);
    }
  });
  if (before.status !== "finished" && after.status === "finished") {
    lines.push(`🏆 ${nm(after.winnerCountryId)} won the war against ${nm(after.loserCountryId)} (${after.finalScore[after.winnerCountryId] || 0}-${after.finalScore[after.loserCountryId] || 0}). Its Leader now chooses a war tax.`);
  }
  for (const text of lines) await Promise.all([Community.postSystemChat(A, text), Community.postSystemChat(D, text)]);
}

/* ============================================================
   warStrike — the ONLY way war damage is produced.
   The server picks a real enemy-country player as the opponent, runs a full
   duel with both sides' real stats, and counts the enemy HP the attacker took
   off. The client sends nothing but "strike". Damage is bounded by the
   target's HP, Energy, a per-strike cooldown, a per-round strike cap and a
   per-target cap, so a huge population can't pile up meaningless damage.
   ============================================================ */
function simulateDuel(attackerDoc, defenderDoc, maxRounds) {
  const aEff = G.effectiveStats(attackerDoc);
  const me = G.buildCombatant(Object.assign({}, attackerDoc, { hpCur: aEff.maxHp }), true, attackerDoc.username);
  const foe = G.buildCombatant(defenderDoc, false, defenderDoc.username);
  me.resource = Math.round(me.resourceMax * 0.6);
  let dealt = 0, rounds = 0;
  for (; rounds < maxRounds && me.hp > 0 && foe.hp > 0; rounds++) {
    const meFirst = G.liveStat(me, "spd") >= G.liveStat(foe, "spd");
    const order = meFirst ? [[me, foe, true], [foe, me, false]] : [[foe, me, false], [me, foe, true]];
    for (const [actor, other, isMe] of order) {
      if (me.hp <= 0 || foe.hp <= 0) break;
      const act = G.chooseAiAction(actor, other);
      const lvl = (act.skill && actor.skillLevels) ? (actor.skillLevels[act.skill.id] || 0) : 0;
      const before = other.hp;
      G.performAction(actor, other, act, lvl);
      if (isMe) dealt += Math.max(0, before - other.hp);
    }
    G.tickBuffs(me); G.tickBuffs(foe);
  }
  return { damage: Math.min(Math.floor(dealt), foe.maxHp), won: foe.hp <= 0, rounds, foeMaxHp: foe.maxHp, foeHpLeft: Math.max(0, Math.round(foe.hp)) };
}

async function warStrike(uid) {
  const pSnap0 = await playerRef(uid).get();
  if (!pSnap0.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap0.data().kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
  const cSnap = await E.countryRef(cid).get();
  const country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
  if (!country.activeWarId) fail("failed-precondition", "NO_ACTIVE_WAR");
  const warId = country.activeWarId;

  const { war: war0 } = await advanceWar(warId);        // bring the war up to "now" first
  if (war0.status !== "active") fail("failed-precondition", war0.status === "preparing" ? "WAR_NOT_STARTED" : "WAR_ENDED", { startsAt: war0.startsAt });
  if (cid !== war0.attackerCountryId && cid !== war0.defenderCountryId) fail("permission-denied", "NOT_IN_WAR");
  const cur0 = W.currentRound(war0);
  if (!cur0) fail("failed-precondition", "ROUND_ENDED");
  const enemyId = cid === war0.attackerCountryId ? war0.defenderCountryId : war0.attackerCountryId;
  const cfg = war0.cfg;
  const n = cur0.round;

  // Choose the opponent server-side, skipping enemies this player already hit the maximum times this round.
  const wpSnap0 = await warPlayerRef(warId, uid).get();
  const hits0 = (wpSnap0.exists && wpSnap0.data().hits) || {};
  const candSnap = await db().collection("rc_players").where("kingdomId", "==", enemyId).limit(40).get();
  const cands = candSnap.docs.filter((d) => { const x = d.data(); return x.username && x.class && G.CLASSES[x.class]; });
  if (!cands.length) fail("failed-precondition", "NO_TARGET_AVAILABLE");
  const eligible = cands.filter((d) => (hits0[n + "_" + d.id] || 0) < cfg.maxHitsPerTarget);
  if (!eligible.length) fail("failed-precondition", "TARGETS_EXHAUSTED");
  const target = G.pick(eligible);
  const targetData = target.data();

  return db().runTransaction(async (tx) => {
    const t = now();
    const [pSnap, wSnap, wpSnap] = await Promise.all([tx.get(playerRef(uid)), tx.get(warRef(warId)), tx.get(warPlayerRef(warId, uid))]);
    if (!pSnap.exists || !wSnap.exists) fail("not-found", "WAR_NOT_FOUND");
    const c = pSnap.data();
    const war = wSnap.data();
    const cur = W.currentRound(war);
    if (war.status !== "active" || !cur) fail("failed-precondition", "WAR_ENDED");
    if (t >= cur.endsAt) fail("failed-precondition", "ROUND_ENDED");
    if (cur.round !== n) fail("aborted", "ROUND_CHANGED");
    if (c.kingdomId !== cid) fail("permission-denied", "NOT_IN_WAR");

    const wp = wpSnap.exists ? wpSnap.data() : {};
    if (((wp.strikes || {})[n] || 0) >= cfg.maxStrikesPerPlayerPerRound) fail("failed-precondition", "STRIKE_LIMIT", { max: cfg.maxStrikesPerPlayerPerRound });
    const since = t - (wp.lastStrikeAt || 0);
    if (since < cfg.strikeCooldownMs) fail("failed-precondition", "COOLDOWN_ACTIVE", { msRemaining: cfg.strikeCooldownMs - since });
    if (((wp.hits || {})[n + "_" + target.id] || 0) >= cfg.maxHitsPerTarget) fail("failed-precondition", "TARGET_LIMIT");

    const { energyCur, maxEnergy, now: energyNow } = G.applyEnergyRegen(c);
    if (energyCur < cfg.strikeEnergyCost) {
      fail("failed-precondition", "NOT_ENOUGH_ENERGY", { required: cfg.strikeEnergyCost, available: Math.floor(energyCur), perHour: G.energyRegenPerHour(maxEnergy) });
    }
    const newEnergy = G.clamp(energyCur - cfg.strikeEnergyCost, 0, maxEnergy);

    const duel = simulateDuel(c, targetData, cfg.duelMaxRounds);
    const d = duel.damage;

    // Weekly damage counter (week = 7-day block starting Monday 00:00 UTC) for the global rankings.
    const wkKey = Math.floor((t - 345600000) / 604800000);
    const prevWk = (c.weeklyDmg && c.weeklyDmg.week === wkKey) ? (c.weeklyDmg.dmg || 0) : 0;
    tx.update(playerRef(uid), { energyCur: newEnergy, lastEnergyAt: energyNow, weeklyDmg: { week: wkKey, dmg: prevWk + d }, totalDmg: FV().increment(d) });
    tx.set(warPlayerRef(warId, uid), {
      warId, uid, countryId: cid, lastStrikeAt: t,
      strikes: { [n]: FV().increment(1) },
      hits: { [n + "_" + target.id]: FV().increment(1) },
      damage: { [n]: FV().increment(d) },
    }, { merge: true });
    // Pure increments on the round doc: concurrent strikes never overwrite each other.
    tx.set(roundRef(warId, n), {
      damage: { [cid]: FV().increment(d) },
      contrib: { [uid]: FV().increment(d) },
      members: { [uid]: cid },
    }, { merge: true });

    return {
      warId, round: n, damage: d, won: duel.won,
      target: { name: targetData.username, level: targetData.level, maxHp: duel.foeMaxHp, hpLeft: duel.foeHpLeft },
      energyCur: newEnergy, lastEnergyAt: energyNow, serverNow: t,
    };
  });
}

/* ============================================================
   chooseWarReward — the winning country's CURRENT Leader picks ONE of the
   defeated country's natural resources. Rate and duration are fixed by the
   war's own rules, never by the caller.
   ============================================================ */
// Every resource a citizen can gather (zones) or a country specialises in. The winner's Leader may tax ANY of them,
// not only the loser's own specialities (citizens gather zone resources whatever their country is).
function allTaxableResources() {
  const set = new Set();
  G.ZONES.forEach((z) => (z.resources || []).forEach((r) => set.add(r)));
  Object.values(COUNTRY_BY_ID).forEach((c) => (c.resources || []).forEach((r) => set.add(r)));
  return Array.from(set).sort();
}
async function chooseWarReward(uid, data) {
  const warId = data && data.warId, resourceId = data && data.resourceId;
  if (!warId || !resourceId) fail("invalid-argument", "INVALID_ACTION");
  const chosen = await db().runTransaction(async (tx) => {
    const t = now();
    const wSnap = await tx.get(warRef(warId));
    if (!wSnap.exists) fail("not-found", "WAR_NOT_FOUND");
    const war = wSnap.data();
    if (war.status !== "finished" || !war.reward || war.reward.status !== "awaiting_choice") fail("failed-precondition", "REWARD_NOT_AVAILABLE");
    if (t > war.reward.claimExpiresAt) fail("failed-precondition", "REWARD_EXPIRED");

    const wid = war.winnerCountryId, lid = war.loserCountryId;
    const [pSnap, kSnap, winner, loser] = await Promise.all([tx.get(playerRef(uid)), tx.get(kingdomRef(wid)), E.readCountry(tx, wid), E.readCountry(tx, lid)]);
    if (!pSnap.exists || pSnap.data().kingdomId !== wid || !kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    if (!allTaxableResources().includes(resourceId) && !war.reward.options.includes(resourceId)) fail("invalid-argument", "INVALID_RESOURCE", { options: allTaxableResources() });
    if (W.isWarTaxActive(loser.warTaxOut, t)) fail("failed-precondition", "TARGET_PROTECTED");

    // The Leader picks the tax rate, but only inside the limits the war was declared under.
    const lo = war.cfg.warTaxRateMin != null ? war.cfg.warTaxRateMin : 1, hi = war.cfg.warTaxRateMax != null ? war.cfg.warTaxRateMax : 25;
    const rate = data.rate == null ? war.cfg.warTaxRate : Number(data.rate), days = war.cfg.warTaxDays;
    if (!Number.isInteger(rate) || rate < lo || rate > hi) fail("invalid-argument", "INVALID_RATE", { min: lo, max: hi });
    const expiresAt = t + days * W.DAY_MS;
    const tax = { warId, winnerCountryId: wid, loserCountryId: lid, resourceId, rate, startedAt: t, expiresAt };
    const inList = winner.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).concat([tax]);

    tx.set(warRef(warId), Object.assign({}, war, {
      selectedResource: resourceId,
      reward: Object.assign({}, war.reward, { status: "active", resourceId, rate, startedAt: t, expiresAt, chosenBy: uid }),
    }));
    tx.set(E.countryRef(lid), { warTaxOut: tax, pendingReward: null }, { merge: true });
    tx.set(E.countryRef(wid), { warTaxIn: inList }, { merge: true });
    return { warId, resourceId, rate, startedAt: t, expiresAt, serverNow: t, winnerCountryId: wid, loserCountryId: lid, days };
  });
  const text = `🏆 ${COUNTRY_BY_ID[chosen.winnerCountryId].name} chose ${chosen.resourceId} as war tax on ${COUNTRY_BY_ID[chosen.loserCountryId].name}: ${chosen.rate}% for ${chosen.days} days.`;
  await Promise.all([Community.postSystemChat(chosen.winnerCountryId, text), Community.postSystemChat(chosen.loserCountryId, text)]);
  return chosen;
}

/* ============================================================
   getCountryState — everything the Economy / War tabs display, computed
   server-side (including "now"), so the client never does war maths.
   ============================================================ */
function publicTax(x, t) {
  return x ? Object.assign({}, x, { active: W.isWarTaxActive(x, t), msRemaining: Math.max(0, (x.expiresAt || 0) - t) }) : null;
}
function summarizeWar(war, cid, t) {
  const r = war.reward || null;
  let rewardState = null;
  if (r) {
    if (r.status === "active") rewardState = t < r.expiresAt ? "active" : "expired";
    else rewardState = r.status; // awaiting_choice | forfeited
  }
  return {
    id: war.id, status: war.status,
    attackerCountryId: war.attackerCountryId, defenderCountryId: war.defenderCountryId,
    finalScore: war.finalScore, winnerCountryId: war.winnerCountryId, loserCountryId: war.loserCountryId,
    rounds: (war.rounds || []).map((x) => ({ round: x.round, winner: x.winner, damage: x.damage, startsAt: x.startsAt, endsAt: x.endsAt, status: x.status })),
    selectedResource: war.selectedResource, warTaxRate: war.warTaxRate, warTaxDurationDays: war.warTaxDurationDays,
    rateMin: war.cfg && war.cfg.warTaxRateMin != null ? war.cfg.warTaxRateMin : 1, rateMax: war.cfg && war.cfg.warTaxRateMax != null ? war.cfg.warTaxRateMax : 25,
    startedAt: war.startedAt, endedAt: war.endedAt, startsAt: war.startsAt,
    result: war.status === "finished" ? (war.winnerCountryId === cid ? "victory" : "defeat") : null,
    rewardState,
    taxMsRemaining: r && r.status === "active" ? Math.max(0, r.expiresAt - t) : 0,
    claimExpiresAt: r ? r.claimExpiresAt : null,
  };
}

/* ============================================================
   setCountrySpecialities — the country's CURRENT Leader picks exactly 2
   resources as its specialities (the only resources the normal country tax
   applies to). Limited by a cooldown so it can't be flipped back and forth.
   ============================================================ */
async function setCountrySpecialities(uid, data) {
  const list = data && Array.isArray(data.resources) ? Array.from(new Set(data.resources.map(String))) : [];
  const allowed = new Set(allTaxableResources());
  if (list.length !== 2 || !list.every((r) => allowed.has(r))) fail("invalid-argument", "INVALID_SPECIALITIES");
  return db().runTransaction(async (tx) => {
    const t = now();
    const pSnap = await tx.get(playerRef(uid));
    if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
    const cid = pSnap.data().kingdomId;
    if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
    const [kSnap, C] = await Promise.all([tx.get(kingdomRef(cid)), E.readCountry(tx, cid)]);
    if (!kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    const until = C.specialitiesChangedAt ? C.specialitiesChangedAt + SPECIALITY_COOLDOWN_MS : 0;
    if (until > t) fail("failed-precondition", "SPECIALITY_COOLDOWN", { msRemaining: until - t });
    if (list.slice().sort().join() === C.natural.slice().sort().join()) fail("invalid-argument", "SPECIALITIES_UNCHANGED");
    tx.set(E.countryRef(cid), { specialities: list, specialitiesChangedAt: t }, { merge: true });
    return { countryId: cid, specialities: list, cooldownUntil: t + SPECIALITY_COOLDOWN_MS };
  });
}

/* ============================================================
   getCountryPublic — what ANY signed-in player may see about ANY country
   (no character or country needed): war taxes it pays / collects, a pending
   victory choice, and its specialities. Read-only, never changes anything.
   ============================================================ */
async function getCountryPublic(uid, data) {
  const cid = data && data.countryId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("invalid-argument", "INVALID_TARGET");
  const t = now();
  const snap = await E.countryRef(cid).get();
  const c = E.normalizeCountry(cid, snap.exists ? snap.data() : null);
  const pr = c.pendingReward && c.pendingReward.expiresAt > t ? c.pendingReward : null;
  return {
    serverNow: t, countryId: cid,
    specialities: c.natural,
    warTaxOut: publicTax(c.warTaxOut, t),
    warTaxIn: c.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).map((x) => Object.assign(publicTax(x, t), { collected: c.warTaxCollected[x.warId] || 0 })),
    pendingChoice: pr ? { winnerCountryId: pr.winnerCountryId, expiresAt: pr.expiresAt } : null,
  };
}

async function getCountryState(uid) {
  const pSnap = await playerRef(uid).get();
  if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap.data().kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
  await Community.maybeSucceedLeader(cid);   // a Leader who has been away for 7 days is replaced here, lazily
  try { await RD.accrueRegionalProduction(cid); } catch (e) { console.error("regional production", cid, e); }   // regions are the country's main income

  let cSnap = await E.countryRef(cid).get();
  let country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
  if (country.activeWarId) {
    try { await advanceWar(country.activeWarId); } catch (e) { /* war doc missing: fall through */ }
    cSnap = await E.countryRef(cid).get();
    country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
  }
  const t = now();
  const kSnap = await kingdomRef(cid).get();
  const kd = kSnap.exists ? kSnap.data() : {};

  let activeWar = null;
  if (country.activeWarId) {
    const wSnap = await warRef(country.activeWarId).get();
    if (wSnap.exists && wSnap.data().status !== "finished") {
      const war = wSnap.data();
      const cur = W.currentRound(war);
      let live = null, mine = null;
      if (cur) {
        const [rs, wp] = await Promise.all([roundRef(war.id, cur.round).get(), warPlayerRef(war.id, uid).get()]);
        const rd = rs.exists ? rs.data() : {};
        live = { round: cur.round, damage: rd.damage || {}, participants: Object.keys(rd.contrib || {}).length };
        const wpd = wp.exists ? wp.data() : {};
        mine = {
          damage: (rd.contrib || {})[uid] || 0,
          strikes: (wpd.strikes || {})[cur.round] || 0,
          lastStrikeAt: wpd.lastStrikeAt || 0,
          maxStrikes: war.cfg.maxStrikesPerPlayerPerRound, cooldownMs: war.cfg.strikeCooldownMs, energyCost: war.cfg.strikeEnergyCost,
        };
        // top contributors of the country this round
        const contrib = rd.contrib || {}, members = rd.members || {};
        const sideTop = (cc) => Object.keys(contrib).filter((u) => members[u] === cc).sort((a, b) => contrib[b] - contrib[a]).slice(0, 5);
        const topIds = sideTop(war.attackerCountryId).concat(sideTop(war.defenderCountryId));
        const pSnaps = await Promise.all(topIds.map((u) => db().collection("rc_players").doc(u).get().catch(() => null)));
        live.top = topIds.map((u, i) => { const pd = pSnaps[i] && pSnaps[i].exists ? pSnaps[i].data() : {}; return { uid: u, damage: contrib[u], country: members[u], username: pd.username || "Player", level: pd.level || 1 }; });
      }
      activeWar = Object.assign(summarizeWar(war, cid, t), { live, mine });
    }
  }

  const [asAtt, asDef] = await Promise.all([
    db().collection("rc_wars").where("attackerCountryId", "==", cid).limit(25).get(),
    db().collection("rc_wars").where("defenderCountryId", "==", cid).limit(25).get(),
  ]);
  const history = asAtt.docs.concat(asDef.docs).map((d) => d.data()).filter((w) => w.status === "finished")
    .sort((a, b) => b.endedAt - a.endedAt).slice(0, 10).map((w) => summarizeWar(w, cid, t));

  const leaderId = kd.leaderId || null;
  const pending = history.find((h) => h.rewardState === "awaiting_choice" && h.winnerCountryId === cid && h.claimExpiresAt > t) || null;
  let pendingLoserNatural = [];
  if (pending) {
    const ls = await E.countryRef(pending.loserCountryId).get();
    pendingLoserNatural = E.normalizeCountry(pending.loserCountryId, ls.exists ? ls.data() : null).natural;
  }
  return {
    serverNow: t, countryId: cid,
    isLeader: leaderId === uid, leaderId,
    taxRate: W.normalTaxPct(country.taxRate),
    resources: country.resources,
    naturalResources: country.natural,
    specialityOptions: allTaxableResources(),
    specialityCooldownUntil: country.specialitiesChangedAt ? country.specialitiesChangedAt + SPECIALITY_COOLDOWN_MS : 0,
    cooldownUntil: country.warCooldownUntil,
    warTaxOut: publicTax(country.warTaxOut, t),
    warTaxIn: country.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).map((x) => Object.assign(publicTax(x, t), { collected: country.warTaxCollected[x.warId] || 0 })),
    pendingReward: pending ? { warId: pending.id, loserCountryId: pending.loserCountryId, options: allTaxableResources(), loserResources: pendingLoserNatural, rateMin: pending.rateMin != null ? pending.rateMin : 1, rateMax: pending.rateMax != null ? pending.rateMax : 25, defaultRate: pending.warTaxRate || 10, claimExpiresAt: pending.claimExpiresAt } : null,
    activeWar, history,
  };
}

/* ============================================================
   tickWars — run on a schedule (index.js). Finishes wars whose rounds ended,
   expires war taxes and forfeits unclaimed rewards. All of it is ALSO done
   lazily by the calls above, so nothing depends on the schedule being alive.
   ============================================================ */
async function getWorldWars(uid) {
  const t=now();
  const snap=await db().collection("rc_wars").limit(100).get();
  const all=snap.docs.map(d=>d.data());
  const active=all.filter(w=>w.status==="active" || w.status==="preparing").map(w=>summarizeWar(w, null, t)).sort((a,b)=>(a.startsAt||a.startedAt||0)-(b.startsAt||b.startedAt||0));
  const recent=all.filter(w=>w.status==="finished").sort((a,b)=>(b.endedAt||0)-(a.endedAt||0)).slice(0,20).map(w=>summarizeWar(w, null, t));
  return {serverNow:t, active, recent};
}

async function tickWars() {
  const t = now();
  try { await RD.ensureDistribution(); } catch (e) { console.error("monthly resource distribution", e); }   // once per month, idempotent (no second cron job)
  const out = { advanced: 0, expiredTaxes: 0, forfeited: 0 };
  const live = await db().collection("rc_wars").where("status", "in", ["preparing", "active"]).limit(100).get();
  for (const d of live.docs) {
    try { const r = await advanceWar(d.id); if (r.changed) out.advanced++; } catch (e) { console.error("tick advance", d.id, e); }
  }
  const expired = await db().collection("rc_countries").where("warTaxOut.expiresAt", "<=", t).limit(100).get();
  for (const d of expired.docs) {
    try {
      await db().runTransaction(async (tx) => {
        const cs = await tx.get(E.countryRef(d.id));
        const tax = cs.exists && cs.data().warTaxOut;
        if (!tax || t < tax.expiresAt) return;
        const ws = await tx.get(warRef(tax.warId));
        tx.set(E.countryRef(d.id), { warTaxOut: null }, { merge: true });
        if (ws.exists && ws.data().reward && ws.data().reward.status === "active") {
          tx.set(warRef(tax.warId), Object.assign({}, ws.data(), { reward: Object.assign({}, ws.data().reward, { status: "expired" }) }));
        }
      });
      out.expiredTaxes++;
    } catch (e) { console.error("tick expire", d.id, e); }
  }
  const open = await db().collection("rc_wars").where("reward.status", "==", "awaiting_choice").limit(100).get();
  for (const d of open.docs) {
    const w = d.data();
    if (t <= w.reward.claimExpiresAt) continue;
    try {
      await db().runTransaction(async (tx) => {
        const ws = await tx.get(warRef(w.id));
        const cur = ws.data();
        if (!cur.reward || cur.reward.status !== "awaiting_choice") return;
        tx.set(warRef(w.id), Object.assign({}, cur, { reward: Object.assign({}, cur.reward, { status: "forfeited" }) }));
        tx.set(E.countryRef(cur.loserCountryId), { pendingReward: null }, { merge: true });
      });
      out.forfeited++;
    } catch (e) { console.error("tick forfeit", d.id, e); }
  }
  return out;
}

module.exports = { announceWarProgress, declareWar, advanceWar, warStrike, chooseWarReward, setCountrySpecialities, getCountryPublic, getCountryState, getWorldWars, tickWars, simulateDuel, loadConfig, _setClock };

