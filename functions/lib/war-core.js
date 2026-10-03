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
  prepMs: 30 * 60 * 1000,          // declaration -> round 1 starts
  roundMs: 5 * 60 * 60 * 1000,     // fixed duration of every round
  roundsToWin: 2,
  maxRounds: 3,
  cooldownMs: 24 * 60 * 60 * 1000, // post-war protection for BOTH countries
  minMembers: 3,                   // both countries need at least this many citizens (a 1-player country can't be farmed or farm others)
  warTaxRate: 10,                  // default %; the winner's Leader may pick any whole % between Min and Max
  warTaxRateMin: 1,
  warTaxRateMax: 25,
  warTaxDays: 14,
  rewardClaimMs: 3 * 24 * 60 * 60 * 1000, // winner's Leader must choose within this
  strikeEnergyCost: 10,
  strikeCooldownMs: 10 * 1000,
  maxStrikesPerPlayerPerRound: 10,
  maxHitsPerTarget: 3,             // damage vs the same enemy player counts at most this many times per round
  duelMaxRounds: 14,
  minTaxPct: 5,
  maxTaxPct: 15,
  maxEffectiveTaxPct: 30,          // normal + war tax can never exceed this share of a gross amount
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clampInt(v, lo, hi) { v = Math.round(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); }

// Normal country tax %, always inside the configured band.
function normalTaxPct(baseTax, cfg) {
  cfg = cfg || WAR_CONFIG;
  return clampInt(baseTax, cfg.minTaxPct, cfg.maxTaxPct);
}

/* ---------- resource split ----------
   gross is the freshly generated amount. The country share and the war-tax
   share are both computed from the GROSS amount at the moment of generation —
   never from what the player already holds. Fractions are not lost: they sit in
   `carry` (integer "percent-units", 0..99 per bucket) on the player and are paid
   out once they add up to a whole unit, so a 10% tax on 5 units still yields
   1 unit every other gain instead of rounding to 0 forever. */
function splitGenerated({ gross, normalPct, warPct, carry, cfg }) {
  cfg = cfg || WAR_CONFIG;
  gross = Math.max(0, Math.floor(Number(gross) || 0));
  let n = clampInt(normalPct, 0, cfg.maxEffectiveTaxPct);
  let w = clampInt(warPct, 0, 100);
  if (n + w > cfg.maxEffectiveTaxPct) w = Math.max(0, cfg.maxEffectiveTaxPct - n);
  const next = { normal: (carry && carry.normal) || 0, war: (carry && carry.war) || 0 };
  next.normal += gross * n;
  next.war += gross * w;
  const normal = Math.floor(next.normal / 100);
  const war = Math.floor(next.war / 100);
  next.normal -= normal * 100;
  next.war -= war * 100;
  const player = gross - normal - war;
  return { gross, player, normal, war, carry: next, normalPct: n, warPct: w };
}

/* ---------- war tax helpers ---------- */
function isWarTaxActive(tax, now) {
  return !!(tax && tax.resourceId && tax.expiresAt && now < tax.expiresAt);
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
  const contrib = (roundDoc && roundDoc.contrib) || {};
  // contrib is {uid: damage}; which country a uid belongs to is stored in roundDoc.members
  const members = (roundDoc && roundDoc.members) || {};
  const count = { [attackerId]: 0, [defenderId]: 0 };
  Object.keys(contrib).forEach((u) => { if (contrib[u] > 0 && members[u] in count) count[members[u]]++; });
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
  clampInt, normalTaxPct, splitGenerated, isWarTaxActive,
  resolveRoundWinner, advanceWarState, currentRound,
};

