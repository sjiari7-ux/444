"use strict";

/* ============================================================
   COUNTRY ECONOMY — Firestore-facing helpers.
   Country economy state lives in rc_countries/{countryId}, which clients can
   READ but never write (see firestore.rules). The existing rc_kingdoms doc keeps
   the Leader / members / chat / donated Treasury; this doc holds the new
   server-owned economy: resources, war state pointers and war taxes.
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
  Object.keys(d.resources || {}).forEach((r) => { resources[r] = d.resources[r]; });
  return {
    id,
    exists: !!data,
    natural,
    specialitiesChangedAt: d.specialitiesChangedAt || 0,
    taxRate: d.taxRate != null ? d.taxRate : (def ? def.tax : 10),
    resources,
    activeWarId: d.activeWarId || null,
    warCooldownUntil: d.warCooldownUntil || 0,
    warTaxOut: d.warTaxOut || null,        // war tax this country is paying to a winner
    warTaxIn: Array.isArray(d.warTaxIn) ? d.warTaxIn : [], // war taxes this country collects
    warTaxCollected: d.warTaxCollected || {},
    pendingReward: d.pendingReward || null, // this country LOST a war and the winner hasn't chosen yet
  };
}

async function readCountry(tx, id) {
  const snap = await tx.get(countryRef(id));
  return normalizeCountry(id, snap.exists ? snap.data() : null);
}

/* ---------- normal tax + war tax on newly generated resources ---------- */

// Read phase. Must run BEFORE any tx write in the same transaction.
// Returns null when the player has no (known) country — nothing is taxed then.
async function readEconomyForPlayer(tx, player) {
  const cid = player && player.kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) return null;
  return { countryId: cid, country: await readCountry(tx, cid) };
}

// Pure phase: splits `gains` ({resourceId: grossAmount}) and mutates player.taxCarry.
// The normal tax only applies to the country's own natural resources (the ones it
// lists in its economy); the war tax only to the single resource the winner chose.
function applyTaxToGains(econ, player, gains, now, cfg) {
  cfg = cfg || W.WAR_CONFIG;
  const out = { net: {}, lines: [], countryInc: {}, winnerInc: {}, winnerId: null, warId: null };
  if (!player.taxCarry) player.taxCarry = {};
  Object.keys(gains).forEach((res) => {
    const gross = Math.max(0, Math.floor(gains[res] || 0));
    if (!econ) { out.net[res] = gross; return; }
    const natural = econ.country.natural.includes(res);
    const normalPct = natural ? W.normalTaxPct(econ.country.taxRate, cfg) : 0;
    const wt = econ.country.warTaxOut;
    const warActive = W.isWarTaxActive(wt, now) && wt.resourceId === res;
    const warPct = warActive ? wt.rate : 0;
    if (!normalPct && !warPct) { out.net[res] = gross; return; }
    const carry = player.taxCarry[res] || { normal: 0, war: 0 };
    const s = W.splitGenerated({ gross, normalPct, warPct, carry, cfg });
    player.taxCarry[res] = s.carry;
    out.net[res] = s.player;
    if (s.normal) out.countryInc[res] = (out.countryInc[res] || 0) + s.normal;
    if (s.war && warActive) {
      out.winnerInc[res] = (out.winnerInc[res] || 0) + s.war;
      out.winnerId = wt.winnerCountryId;
      out.warId = wt.warId;
    }
    out.lines.push({ resource: res, gross: s.gross, player: s.player, normal: s.normal, war: s.war });
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
  if (out.winnerId && Object.keys(out.winnerInc).length) {
    const winInc = {}, collected = {};
    Object.keys(out.winnerInc).forEach((r) => { winInc[r] = FV().increment(out.winnerInc[r]); });
    collected[out.warId] = FV().increment(Object.values(out.winnerInc).reduce((a, b) => a + b, 0));
    tx.set(countryRef(out.winnerId), { resources: winInc, warTaxCollected: collected }, { merge: true });
  }
}

module.exports = { countryRef, normalizeCountry, readCountry, readEconomyForPlayer, applyTaxToGains, commitEconomy };

