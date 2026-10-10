"use strict";

/* ============================================================
   COUNTRY ECONOMY & WAR — pure logic (no Firestore, no clock).
   Everything here is deterministic so it can be unit-tested. The
   Firestore-facing code lives in economy.js and war.js.
   ============================================================ */

// Defaults. Every value can be overridden WITHOUT a redeploy by creating the
// Firestore doc rc_config/war with any of these keys (see war.js loadConfig).
// A war snapshots the values it needs at declaration time, so changing the
// config never alters a war that is already running.
const WAR_CONFIG = {
  prepMs: 2 * 60 * 1000,           // declaration -> round 1 starts
  roundMs: 5 * 60 * 60 * 1000,     // fixed duration of every round
  roundsToWin: 2,
  maxRounds: 3,
  cooldownMs: 24 * 60 * 60 * 1000, // post-war protection for BOTH countries
  minMembers: 0,                   // no minimum: a country with 0 players can be attacked, and one without regions can attack (it still needs a Leader player to declare)
  strikeEnergyCost: 10,
  strikeCooldownMs: 0,   // unused: strikes have no waiting period any more
  maxStrikesPerPlayerPerRound: 10,
  maxHitsPerTarget: 3,             // damage vs the same enemy player counts at most this many times per round
  duelMaxRounds: 14,
  minTaxPct: 5,
  maxTaxPct: 15,
  maxEffectiveTaxPct: 30,          // the National PvE Tax can never exceed this share of a gross amount
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clampInt(v, lo, hi) { v = Math.round(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); }

// Normal country tax %, always inside the configured band.
function normalTaxPct(baseTax, cfg) {
  cfg = cfg || WAR_CONFIG;
  return clampInt(baseTax, cfg.minTaxPct, cfg.maxTaxPct);
}

/* ---------- 3-decimal economy ----------
   Every economic value (resources, PvE earnings, tax, treasury) has at most 3 decimals.
   round3 is the ONE rounding rule: 10.1574 -> 10.157, 10.1576 -> 10.158. */
function round3(v) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.round(n * 1000 + (n < 0 ? -1e-7 : 1e-7)) / 1000;
}

/* ---------- National PvE Tax split ----------
   gross is the freshly generated PvE amount (never what the player already holds).
   tax = round3(gross * pct / 100), player = round3(gross - tax). No hidden carry:
   the treasury receives exactly the tax value (10.350 @ 10% -> 1.035 / 9.315). */
function splitPvE({ gross, taxPct, cfg }) {
  cfg = cfg || WAR_CONFIG;
  gross = Math.max(0, round3(gross));
  const pct = clampInt(taxPct, 0, cfg.maxEffectiveTaxPct);
  const tax = round3(gross * pct / 100);
  return { gross, tax, player: round3(gross - tax), taxPct: pct };
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

/* ---------- round resolution ---------- */
// Winner of a round from its recorded damage. Deterministic tie-break:
//   1. more valid damage
//   2. more distinct players who actually contributed
//   3. the defender (an attacker has to actually win the fight)
function resolveRoundWinner(roundDoc, attackerId, defenderId) {
  const dmg = (roundDoc && roundDoc.damage) || {};
  const a = Math.floor(dmg[attackerId] || 0), d = Math.floor(dmg[defenderId] || 0);
  if (a !== d) return { winnerId: a > d ? attackerId : defenderId, damage: { [attackerId]: a, [defenderId]: d }, tieBreak: null };
  // distinct players who dealt damage for each country (a player who fought for both sides counts for both)
  const by = roundByCountry(roundDoc);
  const count = { [attackerId]: 0, [defenderId]: 0 };
  [attackerId, defenderId].forEach((cc) => { count[cc] = Object.values(by[cc] || {}).filter((v) => v > 0).length; });
  if (count[attackerId] !== count[defenderId]) {
    return { winnerId: count[attackerId] > count[defenderId] ? attackerId : defenderId, damage: { [attackerId]: a, [defenderId]: d }, tieBreak: "participants" };
  }
  return { winnerId: defenderId, damage: { [attackerId]: a, [defenderId]: d }, tieBreak: "defender" };
}

/* ---------- war state machine ----------
   war: plain object (see war.js declareWar for the shape).
   roundDocs: { 1: {damage, contrib, members}, 2: ..., 3: ... }
   Returns { war (new copy), changed, finished }.
   Time only ever comes from `now` (server time). Rounds chain back to back:
   round N+1 starts exactly when round N ended, even if the server only notices
   hours later, so a war that finishes while everybody is offline still ends
   with consistent timestamps. */
function advanceWarState(war, roundDocs, now) {
  const w = JSON.parse(JSON.stringify(war));
  let changed = false;
  const cfg = w.cfg;
  for (let guard = 0; guard < 10; guard++) {
    if (w.status === "preparing") {
      if (now < w.startsAt) break;
      w.status = "active";
      w.rounds = [{ round: 1, startsAt: w.startsAt, endsAt: w.startsAt + cfg.roundMs, status: "active", winner: null, damage: null }];
      w.startedAt = w.startsAt;
      changed = true;
      continue;
    }
    if (w.status !== "active") break;
    const cur = w.rounds[w.rounds.length - 1];
    if (cur.status !== "active" || now < cur.endsAt) break;

    const res = resolveRoundWinner((roundDocs || {})[cur.round], w.attackerCountryId, w.defenderCountryId);
    cur.status = "done";
    cur.winner = res.winnerId;
    cur.damage = res.damage;
    if (res.tieBreak) cur.tieBreak = res.tieBreak;
    w.finalScore[res.winnerId] = (w.finalScore[res.winnerId] || 0) + 1;
    changed = true;

    const a = w.finalScore[w.attackerCountryId] || 0, d = w.finalScore[w.defenderCountryId] || 0;
    if (a >= cfg.roundsToWin || d >= cfg.roundsToWin || w.rounds.length >= cfg.maxRounds) {
      w.status = "finished";
      w.winnerCountryId = a > d ? w.attackerCountryId : w.defenderCountryId; // after 3 rounds one side always has 2
      w.loserCountryId = w.winnerCountryId === w.attackerCountryId ? w.defenderCountryId : w.attackerCountryId;
      w.endedAt = cur.endsAt;
      break;
    }
    w.rounds.push({ round: cur.round + 1, startsAt: cur.endsAt, endsAt: cur.endsAt + cfg.roundMs, status: "active", winner: null, damage: null });
  }
  return { war: w, changed, finished: w.status === "finished" };
}

function currentRound(war) {
  if (!war || war.status !== "active" || !war.rounds || !war.rounds.length) return null;
  const r = war.rounds[war.rounds.length - 1];
  return r.status === "active" ? r : null;
}

module.exports = {
  WAR_CONFIG, DAY_MS,
  clampInt, normalTaxPct, round3, splitPvE,
  resolveRoundWinner, advanceWarState, currentRound,
};
