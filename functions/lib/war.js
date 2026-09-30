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
const CFG_LIMITS = {
  prepMs: [0, 7 * W.DAY_MS], roundMs: [1000, 7 * W.DAY_MS], cooldownMs: [0, 30 * W.DAY_MS],
  minMembers: [1, 500], warTaxRate: [1, 25], warTaxDays: [1, 60], rewardClaimMs: [60 * 1000, 30 * W.DAY_MS],
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
    warTaxRate: cfg.warTaxRate, warTaxDays: cfg.warTaxDays, cooldownMs: cfg.cooldownMs,
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

  return db().runTransaction(async (tx) => {
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
    return { warId: id, startsAt: war.startsAt, serverNow: t };
  });
}

/* ============================================================
   advanceWar — moves a war forward to the current server time.
   Safe to call any number of times, from anywhere (every war call, a
   scheduled tick): a war ends correctly even if nobody is online.
   ============================================================ */
async function advanceWar(warId) {
  return db().runTransaction(async (tx) => {
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
      const loserDef = COUNTRY_BY_ID[w.loserCountryId];
      w.reward = {
        status: "awaiting_choice",
        winnerCountryId: w.winnerCountryId, loserCountryId: w.loserCountryId,
        options: loserDef ? loserDef.resources.slice() : [],
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
    return { war: w, changed: true };
  });
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

    tx.update(playerRef(uid), { energyCur: newEnergy, lastEnergyAt: energyNow });
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
async function chooseWarReward(uid, data) {
  const warId = data && data.warId, resourceId = data && data.resourceId;
  if (!warId || !resourceId) fail("invalid-argument", "INVALID_ACTION");
  return db().runTransaction(async (tx) => {
    const t = now();
    const wSnap = await tx.get(warRef(warId));
    if (!wSnap.exists) fail("not-found", "WAR_NOT_FOUND");
    const war = wSnap.data();
    if (war.status !== "finished" || !war.reward || war.reward.status !== "awaiting_choice") fail("failed-precondition", "REWARD_NOT_AVAILABLE");
    if (t > war.reward.claimExpiresAt) fail("failed-precondition", "REWARD_EXPIRED");

    const wid = war.winnerCountryId, lid = war.loserCountryId;
    const [pSnap, kSnap, winner, loser] = await Promise.all([tx.get(playerRef(uid)), tx.get(kingdomRef(wid)), E.readCountry(tx, wid), E.readCountry(tx, lid)]);
    if (!pSnap.exists || pSnap.data().kingdomId !== wid || !kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    if (!war.reward.options.includes(resourceId)) fail("invalid-argument", "INVALID_RESOURCE", { options: war.reward.options });
    if (W.isWarTaxActive(loser.warTaxOut, t)) fail("failed-precondition", "TARGET_PROTECTED");

    const rate = war.cfg.warTaxRate, days = war.cfg.warTaxDays;
    const expiresAt = t + days * W.DAY_MS;
    const tax = { warId, winnerCountryId: wid, loserCountryId: lid, resourceId, rate, startedAt: t, expiresAt };
    const inList = winner.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).concat([tax]);

    tx.set(warRef(warId), Object.assign({}, war, {
      selectedResource: resourceId,
      reward: Object.assign({}, war.reward, { status: "active", resourceId, rate, startedAt: t, expiresAt, chosenBy: uid }),
    }));
    tx.set(E.countryRef(lid), { warTaxOut: tax, pendingReward: null }, { merge: true });
    tx.set(E.countryRef(wid), { warTaxIn: inList }, { merge: true });
    return { warId, resourceId, rate, startedAt: t, expiresAt, serverNow: t };
  });
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
    startedAt: war.startedAt, endedAt: war.endedAt, startsAt: war.startsAt,
    result: war.status === "finished" ? (war.winnerCountryId === cid ? "victory" : "defeat") : null,
    rewardState,
    taxMsRemaining: r && r.status === "active" ? Math.max(0, r.expiresAt - t) : 0,
    claimExpiresAt: r ? r.claimExpiresAt : null,
  };
}

async function getCountryState(uid) {
  const pSnap = await playerRef(uid).get();
  if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap.data().kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");

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
        live.top = Object.keys(contrib).filter((u) => members[u] === cid).sort((a, b) => contrib[b] - contrib[a]).slice(0, 5).map((u) => ({ uid: u, damage: contrib[u] }));
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
  const def = COUNTRY_BY_ID[cid];
  return {
    serverNow: t, countryId: cid,
    isLeader: leaderId === uid, leaderId,
    taxRate: W.normalTaxPct(country.taxRate),
    resources: country.resources,
    naturalResources: def.resources,
    cooldownUntil: country.warCooldownUntil,
    warTaxOut: publicTax(country.warTaxOut, t),
    warTaxIn: country.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).map((x) => Object.assign(publicTax(x, t), { collected: country.warTaxCollected[x.warId] || 0 })),
    pendingReward: pending ? { warId: pending.id, loserCountryId: pending.loserCountryId, options: (COUNTRY_BY_ID[pending.loserCountryId] || { resources: [] }).resources, claimExpiresAt: pending.claimExpiresAt } : null,
    activeWar, history,
  };
}

/* ============================================================
   tickWars — run on a schedule (index.js). Finishes wars whose rounds ended,
   expires war taxes and forfeits unclaimed rewards. All of it is ALSO done
   lazily by the calls above, so nothing depends on the schedule being alive.
   ============================================================ */
async function tickWars() {
  const t = now();
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

module.exports = { declareWar, advanceWar, warStrike, chooseWarReward, getCountryState, tickWars, simulateDuel, loadConfig, _setClock };
