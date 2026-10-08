"use strict";

/* ============================================================
   COUNTRY ECONOMY — Firestore-facing helpers.
   Country economy state lives in rc_countries/{countryId}, which clients can
   READ but never write (see firestore.rules). The existing rc_kingdoms doc keeps
   the Leader / members / chat; this doc holds the server-owned NATIONAL TREASURY
   (`resources`, 3 decimals) and war state pointers. The treasury belongs to the
   country, never to the Leader's personal wallet. It is fed by TWO separate sources:
   the National PvE Tax (by player nationality) and the territorial production
   (by current region owner).
   ============================================================ */
const admin = require("firebase-admin");
const { COUNTRY_BY_ID } = require("./countries");
const W = require("./war-core");

function db() { return admin.firestore(); }
function FV() { return admin.firestore.FieldValue; }

function countryRef(id) { return db().doc("rc_countries/" + id); }

// A country doc is created lazily (the first time anything touches it), so
// every read merges the stored data over these defaults.
function normalizeCountry(id, data) {
  const def = COUNTRY_BY_ID[id];
  const d = data || {};
  // The Leader can replace the built-in specialities (exactly 2); until then the country's defaults apply.
  const natural = (Array.isArray(d.specialities) && d.specialities.length === 2 && d.specialities.every((r) => typeof r === "string"))
    ? d.specialities.slice() : (def ? def.resources.slice() : []);
  const resources = {};
  (def ? def.resources : []).forEach((r) => { resources[r] = 0; });
  natural.forEach((r) => { resources[r] = 0; });
  Object.keys(d.resources || {}).forEach((r) => { resources[r] = W.round3(d.resources[r]); });
  return {
    id,
    exists: !!data,
    natural,
    specialitiesChangedAt: d.specialitiesChangedAt || 0,
    taxRate: d.taxRate != null ? d.taxRate : (def ? def.tax : 10),
    resources,
    activeWarId: d.activeWarId || null,
    warCooldownUntil: d.warCooldownUntil || 0,
  };
}

async function readCountry(tx, id) {
  const snap = await tx.get(countryRef(id));
  return normalizeCountry(id, snap.exists ? snap.data() : null);
}

/* ---------- National PvE Tax ----------
   Player -> nationality -> nationality country -> National Treasury.
   The destination depends ONLY on the player's nationality: never on the region the player
   stands in, never on who owns that region, never on the country's territorial resources. */

// A player's nationality. Legacy players that have none yet fall back to their citizenship (kingdomId).
function nationalityOf(player) {
  const n = player && (player.nationality || player.kingdomId);
  return n && COUNTRY_BY_ID[n] ? n : null;
}

// Read phase. Must run BEFORE any tx write in the same transaction.
// Returns null when the player has no (known) nationality — nothing is taxed then.
async function readEconomyForPlayer(tx, player) {
  const cid = nationalityOf(player);
  if (!cid) return null;
  return { countryId: cid, country: await readCountry(tx, cid) };
}

// Pure phase: splits `gains` ({resourceId: grossAmount}) into player net + national tax (3 decimals, no carry).
// The tax applies to EVERY PvE resource gain, whatever the country's territorial resources are.
function applyTaxToGains(econ, player, gains, now, cfg) {
  cfg = cfg || W.WAR_CONFIG;
  const out = { net: {}, lines: [], countryInc: {} };
  Object.keys(gains).forEach((res) => {
    const gross = Math.max(0, W.round3(gains[res]));
    if (!econ) { out.net[res] = gross; return; }
    const s = W.splitPvE({ gross, taxPct: W.normalTaxPct(econ.country.taxRate, cfg), cfg });
    out.net[res] = s.player;
    if (s.tax) out.countryInc[res] = W.round3((out.countryInc[res] || 0) + s.tax);
    out.lines.push({ resource: res, gross: s.gross, player: s.player, tax: s.tax });
  });
  return out;
}

// Write phase (after every read). Pure increments: nothing is read-modified-written,
// so concurrent players of the same country never overwrite each other.
function commitEconomy(tx, econ, out) {
  if (!econ || !out) return;
  const inc = {};
  Object.keys(out.countryInc).forEach((r) => { inc[r] = FV().increment(out.countryInc[r]); });
  if (Object.keys(inc).length) tx.set(countryRef(econ.countryId), { resources: inc }, { merge: true });
}

module.exports = { nationalityOf, countryRef, normalizeCountry, readCountry, readEconomyForPlayer, applyTaxToGains, commitEconomy };

