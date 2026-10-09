"use strict";

/* ============================================================
   COUNTRY WARS — server-authoritative.
   Every function here runs on the server (called from index.js). The client
   can only ask for an action; it never supplies damage, winners, rewards,
   rates or durations.

   Collections (all read-only for clients, see firestore.rules):
     rc_countries/{countryId}            economy + war pointers (economy.js)
     rc_wars/{warId}                     the war: target region, rounds, score, territory (what happened to the target region)
     rc_regionWars/{regionId}            which war currently reserves a region (active:true) — two wars can never fight over one region
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
  minMembers: [0, 500],
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
    cooldownMs: cfg.cooldownMs, strikeEnergyCost: cfg.strikeEnergyCost,
    strikeCooldownMs: cfg.strikeCooldownMs, maxStrikesPerPlayerPerRound: cfg.maxStrikesPerPlayerPerRound,
    maxHitsPerTarget: cfg.maxHitsPerTarget, duelMaxRounds: cfg.duelMaxRounds,
  };
}

function newWarId() { return "war_" + now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }

/* ============================================================
   declareWar — only the Leader of the declaring country, and only against a REGION.
   The defender is never supplied by the client: it is the region's CURRENT owner (rc_world/regions, read inside the
   transaction). The historical / original country of a region plays no role at all.
   ============================================================ */
const REGION_ID_RE = /^[A-Za-z0-9_]{1,80}$/;
async function declareWar(uid, data) {
  const regionId = data && data.targetRegionId;
  if (!regionId && data && data.targetCountryId) fail("invalid-argument", "REGION_REQUIRED");     // country-targeted wars no longer exist
  if (typeof regionId !== "string" || !REGION_ID_RE.test(regionId)) fail("invalid-argument", "INVALID_REGION");
  const cfg = await loadConfig();
  await RD.ensureRegions();            // creates the default regions once if the world has none yet (idempotent, outside the transaction)

  const declared = await db().runTransaction(async (tx) => {
    const t = now();
    const pSnap = await tx.get(playerRef(uid));
    if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
    const aid = pSnap.data().kingdomId;
    if (!aid || !COUNTRY_BY_ID[aid]) fail("failed-precondition", "NO_COUNTRY");

    // Authoritative region data, read INSIDE the transaction: ownership is revalidated at the moment of commit.
    const [kSnap, rSnap, lockSnap, A] = await Promise.all([tx.get(kingdomRef(aid)), tx.get(RD.regionsRef()), tx.get(RD.regionLockRef(regionId)), E.readCountry(tx, aid)]);
    if (!kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    const regions = rSnap.exists ? (rSnap.data().regions || {}) : {};
    const region = regions[regionId];
    if (!region) fail("not-found", "INVALID_REGION");
    const targetId = region.ownerCountryId;                       // <- the defender: the CURRENT owner, nobody else
    if (!targetId || !COUNTRY_BY_ID[targetId]) fail("failed-precondition", "REGION_HAS_NO_OWNER");
    if (targetId === aid) fail("invalid-argument", "OWN_REGION");
    const D = await E.readCountry(tx, targetId);

    // One war per region: a region reserved by a war that is still running (or whose territory is not settled yet) cannot be targeted again.
    const lock = lockSnap.exists ? lockSnap.data() : null;
    if (lock && lock.active && lock.warId) {
      const lw = await tx.get(warRef(lock.warId));
      const lwd = lw.exists ? lw.data() : null;
      if (lwd && (lwd.status !== "finished" || (lwd.territory && lwd.territory.status === "pending"))) fail("failed-precondition", "REGION_ALREADY_TARGETED", { regionId, warId: lock.warId });
    }

    // A stored activeWarId only counts if that war is really still running.
    const ptrs = [A.activeWarId, D.activeWarId];
    const ptrSnaps = await Promise.all(ptrs.map((id) => (id ? tx.get(warRef(id)) : null)));
    const running = (s) => !!(s && s.exists && s.data().status !== "finished");
    if (running(ptrSnaps[0])) fail("failed-precondition", "ALREADY_AT_WAR");
    if (running(ptrSnaps[1])) fail("failed-precondition", "TARGET_AT_WAR");

    if (A.warCooldownUntil > t) fail("failed-precondition", "COOLDOWN_ACTIVE", { countryId: aid, msRemaining: A.warCooldownUntil - t });
    if (D.warCooldownUntil > t) fail("failed-precondition", "TARGET_COOLDOWN", { countryId: targetId, msRemaining: D.warCooldownUntil - t });

    if (cfg.minMembers > 0) {       // optional minimum (rc_config/war), 0 by default
      const [aMembers, dMembers] = await Promise.all([
        db().collection("rc_players").where("kingdomId", "==", aid).limit(cfg.minMembers).get(),
        db().collection("rc_players").where("kingdomId", "==", targetId).limit(cfg.minMembers).get(),
      ]);
      if (aMembers.size < cfg.minMembers || dMembers.size < cfg.minMembers) fail("failed-precondition", "NOT_ENOUGH_MEMBERS", { required: cfg.minMembers });
    }

    const id = newWarId();
    const war = {
      id, status: "preparing",
      attackerCountryId: aid, defenderCountryId: targetId,
      targetRegionId: regionId, targetRegionName: region.name || regionId,     // what the war is fought over (shown everywhere)
      declaredBy: uid, declaredAt: t, startsAt: t + cfg.prepMs,
      cfg: cfgSnapshot(cfg),
      finalScore: { [aid]: 0, [targetId]: 0 },
      rounds: [],
      winnerCountryId: null, loserCountryId: null,
      territory: null, startedAt: null, endedAt: null,
    };
    tx.set(warRef(id), war);
    tx.set(RD.regionLockRef(regionId), { regionId, warId: id, active: true, attackerCountryId: aid, defenderCountryId: targetId, at: t });
    tx.set(E.countryRef(aid), { activeWarId: id }, { merge: true });
    tx.set(E.countryRef(targetId), { activeWarId: id }, { merge: true });
    return { warId: id, startsAt: war.startsAt, serverNow: t, attackerCountryId: aid, defenderCountryId: targetId, targetRegionId: regionId, targetRegionName: war.targetRegionName };
  });
  const targetId = declared.defenderCountryId;
  const an = COUNTRY_BY_ID[declared.attackerCountryId].name, dn = COUNTRY_BY_ID[targetId].name;
  const msg = `⚔ ${an} declared war on ${dn} over ${declared.targetRegionName}! Round 1 starts in ${Math.max(1, Math.round(cfg.prepMs / 60000))} min.`;
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

    const w = res.war;
    if (res.finished) {
      // A victory has a TERRITORIAL consequence (settled right after this transaction by settleWarTerritory).
      w.territory = { status: "pending" };
      const cooldownUntil = w.endedAt + w.cfg.cooldownMs;
      [w.attackerCountryId, w.defenderCountryId].forEach((cid) => {
        tx.set(E.countryRef(cid), { activeWarId: null, warCooldownUntil: cooldownUntil }, { merge: true });
      });
    }
    tx.set(warRef(warId), w);
    announce = { before: { status: war.status, rounds: (war.rounds || []).map((r) => ({ round: r.round, status: r.status })) }, after: w };
    return { war: w, changed: true };
  });
  if (announce) await announceWarProgress(announce.before, announce.after);
  if (result.war && result.war.status === "finished" && result.war.territory && result.war.territory.status === "pending") {
    try { await settleWarTerritory(warId); } catch (e) { console.error("settle territory", warId, e); }   // tickWars retries it if this fails
    const fresh = await warRef(warId).get();
    if (fresh.exists) result.war = fresh.data();
  }
  return result;
}

// Posts the news of whatever just happened (war started, round decided, war over) to BOTH countries' chats.
/* The attacker takes the TARGETED region if it wins (ownership), see resource-distribution.captureRegionForWar. Idempotent. */
const SETTLE_REASON = {
  LEGACY_NO_TARGET: "this war was declared before wars targeted regions, so no region changes hands",
  REGION_NOT_FOUND: "the targeted region no longer exists",
  OWNER_CHANGED: "the region no longer belongs to the defender",
  REGION_NOT_RESERVED: "the region is reserved by another settlement",
};
async function settleWarTerritory(warId) {
  const territory = await RD.captureRegionForWar(warId);
  if (territory && territory.status && territory.status !== "pending") {
    const nm = (id) => (COUNTRY_BY_ID[id] ? COUNTRY_BY_ID[id].name : id);
    const wSnap = await warRef(warId).get(), w = wSnap.exists ? wSnap.data() : null;
    let text = null;
    if (territory.status === "captured") text = `🗺 ${nm(territory.toCountryId)} captured the region ${territory.regionName} from ${nm(territory.fromCountryId)}: control passes from ${nm(territory.fromCountryId)} to ${nm(territory.toCountryId)}. Its production now goes to ${nm(territory.toCountryId)}'s National Treasury.`;
    else if (territory.status === "held") text = `🛡 ${nm(territory.ownerCountryId)} held ${territory.regionName}. Control of the region does not change.`;
    else if (territory.status === "none") text = `🗺 No region changed hands${territory.regionName ? " (" + territory.regionName + ")" : ""}: ${SETTLE_REASON[territory.reason] || "the region could not be transferred"}.`;
    if (text && w) await Promise.all([Community.postSystemChat(w.attackerCountryId, text), Community.postSystemChat(w.defenderCountryId, text)]);
  }
  return territory;
}
function shortNum(n) { n = Math.floor(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); }
async function announceWarProgress(before, after) {
  const A = after.attackerCountryId, D = after.defenderCountryId;
  const nm = (id) => (COUNTRY_BY_ID[id] ? COUNTRY_BY_ID[id].name : id);
  const lines = [];
  const over = after.targetRegionName ? ` over ${after.targetRegionName}` : "";
  if (before.status === "preparing" && after.status !== "preparing") lines.push(`⚔ The war ${nm(A)} vs ${nm(D)}${over} has started! Round 1 is on.`);
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
    lines.push(`🏆 ${nm(after.winnerCountryId)} won the war against ${nm(after.loserCountryId)} (${after.finalScore[after.winnerCountryId] || 0}-${after.finalScore[after.loserCountryId] || 0}).${after.targetRegionName ? (after.winnerCountryId === A ? ` ${nm(A)} takes ${after.targetRegionName}.` : ` ${nm(D)} keeps ${after.targetRegionName}.`) : ""}`);
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

/* Damage of one round grouped by the country it was dealt for: { countryId: { uid: damage } }.
   A player may now strike for BOTH sides of a war, so the round doc keeps `contribBy`; `contrib` stays the per-player total.
   Older round docs (no contribBy) are read through their single recorded side (`members`). */
function roundByCountry(rd) {
  const contrib = (rd && rd.contrib) || {}, members = (rd && rd.members) || {}, by = (rd && rd.contribBy) || {};
  const out = {}, seen = {};
  Object.keys(by).forEach((cc) => Object.keys(by[cc] || {}).forEach((u) => {
    const v = Number(by[cc][u]) || 0;
    if (v > 0) { (out[cc] = out[cc] || {})[u] = v; seen[u] = (seen[u] || 0) + v; }
  }));
  Object.keys(contrib).forEach((u) => {
    const rest = (Number(contrib[u]) || 0) - (seen[u] || 0);
    if (!seen[u] && rest > 0 && members[u]) { out[members[u]] = out[members[u]] || {}; out[members[u]][u] = (out[members[u]][u] || 0) + rest; }
  });
  return out;
}

/* Which side ("attack" | "defend") a player last fought on in a war (informational only: sides are not locked). Older docs have no `side`; their countryId was the fighter's own country. */
function warSideOf(war, wp) {
  if (wp.side === "attack" || wp.side === "defend") return wp.side;
  if (wp.countryId && wp.countryId === war.attackerCountryId) return "attack";
  if (wp.countryId && wp.countryId === war.defenderCountryId) return "defend";
  return null;
}
// The viewer's own numbers for one war (side, strikes this round, cooldown, damage) — shown next to the Attack / Defend buttons.
function warMe(war, wp) {
  const cur = W.currentRound(war), cfg = war.cfg || {};
  return {
    side: warSideOf(war, wp),
    strikes: cur ? ((wp.strikes || {})[cur.round] || 0) : 0,
    lastStrikeAt: wp.lastStrikeAt || 0,
    damage: Object.values(wp.damage || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    maxStrikes: cfg.maxStrikesPerPlayerPerRound, cooldownMs: 0, energyCost: cfg.strikeEnergyCost,
  };
}

/* warStrike(uid, { warId?, side? })
   OPEN WARS: any player may fight in any active war, whatever his nationality.
   - side "attack" fights for the attacking country, "defend" for the defending one (also against the player's own country).
   - without `side` a citizen of one of the two countries fights for his own country (the old behaviour).
   - NO side lock: a player may strike for either side, as often as the cooldown / strike cap / energy allow. */
async function warStrike(uid, data) {
  const pSnap0 = await playerRef(uid).get();
  if (!pSnap0.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap0.data().kingdomId;      // the player's nationality
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
  const reqSide = data && data.side ? String(data.side) : null;
  if (reqSide && reqSide !== "attack" && reqSide !== "defend") fail("invalid-argument", "INVALID_SIDE");
  let warId = data && data.warId ? String(data.warId) : null;
  if (!warId) {
    const cSnap = await E.countryRef(cid).get();
    const country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
    if (!country.activeWarId) fail("failed-precondition", "NO_ACTIVE_WAR");
    warId = country.activeWarId;
  }

  const { war: war0 } = await advanceWar(warId);        // bring the war up to "now" first
  if (war0.status !== "active") fail("failed-precondition", war0.status === "preparing" ? "WAR_NOT_STARTED" : "WAR_ENDED", { startsAt: war0.startsAt });
  const isParty = cid === war0.attackerCountryId || cid === war0.defenderCountryId;
  if (!reqSide && !isParty) fail("failed-precondition", "SIDE_REQUIRED");
  const side = reqSide || (cid === war0.attackerCountryId ? "attack" : "defend");
  const fightCid = side === "attack" ? war0.attackerCountryId : war0.defenderCountryId;   // the country this strike is for
  const cur0 = W.currentRound(war0);
  if (!cur0) fail("failed-precondition", "ROUND_ENDED");
  const enemyId = side === "attack" ? war0.defenderCountryId : war0.attackerCountryId;
  const cfg = war0.cfg;
  const n = cur0.round;

  // Choose the opponent server-side, skipping enemies this player already hit the maximum times this round.
  const wpSnap0 = await warPlayerRef(warId, uid).get();
  const hits0 = (wpSnap0.exists && wpSnap0.data().hits) || {};
  const candSnap = await db().collection("rc_players").where("kingdomId", "==", enemyId).limit(40).get();
  const cands = candSnap.docs.filter((d) => { const x = d.data(); return d.id !== uid && x.username && x.class && G.CLASSES[x.class]; });
  // An enemy country with NO citizens cannot fight back: the strike is uncontested (see below). Otherwise a real citizen is the opponent.
  const undefended = !cands.length;
  const eligible = cands.filter((d) => (hits0[n + "_" + d.id] || 0) < cfg.maxHitsPerTarget);
  if (!undefended && !eligible.length) fail("failed-precondition", "TARGETS_EXHAUSTED");
  const target = undefended ? null : G.pick(eligible);
  const targetData = target ? target.data() : null;

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
    // no waiting period between strikes (only the energy cost and the per-round strike cap limit a player)
    if (target && ((wp.hits || {})[n + "_" + target.id] || 0) >= cfg.maxHitsPerTarget) fail("failed-precondition", "TARGET_LIMIT");

    const { energyCur, maxEnergy, now: energyNow } = G.applyEnergyRegen(c);
    if (energyCur < cfg.strikeEnergyCost) {
      fail("failed-precondition", "NOT_ENOUGH_ENERGY", { required: cfg.strikeEnergyCost, available: Math.floor(energyCur), perHour: G.energyRegenPerHour(maxEnergy) });
    }
    const newEnergy = G.clamp(energyCur - cfg.strikeEnergyCost, 0, maxEnergy);

    // Uncontested strike (the enemy country has no citizens): the attacker deals his full maximum HP as damage, still limited by Energy, cooldown and the per-round strike cap.
    const duel = target ? simulateDuel(c, targetData, cfg.duelMaxRounds) : { damage: Math.floor(G.effectiveStats(c).maxHp), won: true, foeMaxHp: 0, foeHpLeft: 0 };
    const d = duel.damage;

    // Weekly damage counter (week = 7-day block starting Monday 00:00 UTC) for the global rankings.
    const wkKey = Math.floor((t - 345600000) / 604800000);
    const prevWk = (c.weeklyDmg && c.weeklyDmg.week === wkKey) ? (c.weeklyDmg.dmg || 0) : 0;
    tx.update(playerRef(uid), { energyCur: newEnergy, lastEnergyAt: energyNow, weeklyDmg: { week: wkKey, dmg: prevWk + d }, totalDmg: FV().increment(d) });
    tx.set(warPlayerRef(warId, uid), {
      warId, uid, countryId: fightCid, side, nat: cid, lastStrikeAt: t,
      strikes: { [n]: FV().increment(1) },
      hits: target ? { [n + "_" + target.id]: FV().increment(1) } : {},
      damage: { [n]: FV().increment(d) },
    }, { merge: true });
    // Pure increments on the round doc: concurrent strikes never overwrite each other.
    tx.set(roundRef(warId, n), {
      damage: { [fightCid]: FV().increment(d) },
      contrib: { [uid]: FV().increment(d) },
      members: { [uid]: fightCid },                                // last side (kept for older readers)
      contribBy: { [fightCid]: { [uid]: FV().increment(d) } },   // per-country split (a player can fight for both sides)
    }, { merge: true });

    return {
      warId, round: n, side, damage: d, won: duel.won,
      target: targetData ? { name: targetData.username, level: targetData.level, maxHp: duel.foeMaxHp, hpLeft: duel.foeHpLeft } : { name: "an undefended country", level: 0, maxHp: 0, hpLeft: 0 },
      energyCur: newEnergy, lastEnergyAt: energyNow, serverNow: t,
    };
  });
}

// Every resource a citizen can gather (zones) or a country specialises in.
function allTaxableResources() {
  const set = new Set();
  G.ZONES.forEach((z) => (z.resources || []).forEach((r) => set.add(r)));
  Object.values(COUNTRY_BY_ID).forEach((c) => (c.resources || []).forEach((r) => set.add(r)));
  return Array.from(set).sort();
}
/* ============================================================
   getCountryState — everything the Economy / War tabs display, computed
   server-side (including "now"), so the client never does war maths.
   ============================================================ */
function summarizeWar(war, cid, t) {
  return {
    id: war.id, status: war.status,
    attackerCountryId: war.attackerCountryId, defenderCountryId: war.defenderCountryId,
    targetRegionId: war.targetRegionId || null, targetRegionName: war.targetRegionName || null,
    finalScore: war.finalScore, winnerCountryId: war.winnerCountryId, loserCountryId: war.loserCountryId,
    rounds: (war.rounds || []).map((x) => ({ round: x.round, winner: x.winner, damage: x.damage, startsAt: x.startsAt, endsAt: x.endsAt, status: x.status })),
    startedAt: war.startedAt, endedAt: war.endedAt, startsAt: war.startsAt,
    result: war.status === "finished" ? (war.winnerCountryId === cid ? "victory" : "defeat") : null,
    territory: war.territory || null,   // { status: pending|captured|held|none, regionId, regionName, fromCountryId, toCountryId, reason }
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
  return {
    serverNow: t, countryId: cid,
    specialities: c.natural,
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
          maxStrikes: war.cfg.maxStrikesPerPlayerPerRound, cooldownMs: 0, energyCost: war.cfg.strikeEnergyCost,
        };
        // top contributors of the country this round
        const byC = roundByCountry(rd);
        const sideTop = (cc) => Object.keys(byC[cc] || {}).sort((a, b) => byC[cc][b] - byC[cc][a]).slice(0, 5).map((u) => ({ u, cc }));
        const tops = sideTop(war.attackerCountryId).concat(sideTop(war.defenderCountryId));
        const pSnaps = await Promise.all(tops.map((x) => db().collection("rc_players").doc(x.u).get().catch(() => null)));
        live.top = tops.map((x, i) => { const pd = pSnaps[i] && pSnaps[i].exists ? pSnaps[i].data() : {}; return { uid: x.u, damage: byC[x.cc][x.u], country: x.cc, username: pd.username || "Player", level: pd.level || 1 }; });
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
  return {
    serverNow: t, countryId: cid,
    isLeader: leaderId === uid, leaderId,
    taxRate: W.normalTaxPct(country.taxRate),
    resources: country.resources,
    naturalResources: country.natural,
    specialityOptions: allTaxableResources(),
    specialityCooldownUntil: country.specialitiesChangedAt ? country.specialitiesChangedAt + SPECIALITY_COOLDOWN_MS : 0,
    cooldownUntil: country.warCooldownUntil,
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
  const live=all.filter(w=>w.status==="active" || w.status==="preparing");
  const mineWp={};
  if (uid) await Promise.all(live.map(async (w) => { try { const s = await warPlayerRef(w.id, uid).get(); mineWp[w.id] = warMe(w, s.exists ? s.data() : {}); } catch (e) { /* no personal numbers for this war */ } }));
  // The war doc only receives a round's damage when the round is RESOLVED; strikes are written to the round doc. Merge the running
  // round's live damage in, so the score bar moves with every strike instead of waiting for the round to end.
  const withLive = async (w) => {
    const s = Object.assign(summarizeWar(w, null, t), { me: mineWp[w.id] || null });
    const cur = w.status === "active" ? W.currentRound(w) : null;
    if (cur) {
      try {
        const rs = await roundRef(w.id, cur.round).get();
        const dmg = rs.exists ? (rs.data().damage || {}) : {};
        s.rounds = (s.rounds || []).map((r) => (r.round === cur.round ? Object.assign({}, r, { damage: dmg }) : r));
      } catch (e) { /* keep the stored numbers */ }
    }
    return s;
  };
  const active=(await Promise.all(live.map(withLive))).sort((a,b)=>(a.startsAt||a.startedAt||0)-(b.startsAt||b.startedAt||0));
  const recent=all.filter(w=>w.status==="finished").sort((a,b)=>(b.endedAt||0)-(a.endedAt||0)).slice(0,20).map(w=>summarizeWar(w, null, t));
  return {serverNow:t, active, recent};
}

async function tickWars() {
  const t = now();
  try { await RD.ensureDistribution(); } catch (e) { console.error("monthly resource distribution", e); }   // once per month, idempotent (no second cron job)
  const out = { advanced: 0, settled: 0 };
  const live = await db().collection("rc_wars").where("status", "in", ["preparing", "active"]).limit(100).get();
  for (const d of live.docs) {
    try { const r = await advanceWar(d.id); if (r.changed) out.advanced++; } catch (e) { console.error("tick advance", d.id, e); }
  }
  // a finished war whose territory settlement did not complete (crash / lost connection) is settled here, once
  const open = await db().collection("rc_wars").where("territory.status", "==", "pending").limit(50).get();
  for (const d of open.docs) {
    try { await settleWarTerritory(d.id); out.settled++; } catch (e) { console.error("tick settle", d.id, e); }
  }
  return out;
}

module.exports = { announceWarProgress, declareWar, advanceWar, settleWarTerritory, warStrike, setCountrySpecialities, getCountryPublic, getCountryState, getWorldWars, tickWars, simulateDuel, loadConfig, _setClock };

