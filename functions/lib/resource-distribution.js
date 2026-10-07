"use strict";

/* ============================================================
   MONTHLY BALANCED RANDOM RESOURCE DISTRIBUTION

   World model (unchanged): ONE persistent world, ~195 countries. Resources belong to REGIONS,
   countries get resources by owning regions. Once per month (UTC, key "YYYY-MM") the resource of
   every region is re-rolled with seeded weighted randomness and then BALANCED so every country's
   total economic value stays within RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE.

   Never touched by a monthly cycle: countries, players, region ownership, wars, buildings, progress.
   Firestore documents:
     rc_world/regions            region definitions + OWNERSHIP (created once, migration is idempotent)
     rc_world/resourceState      pointer to the current cycle
     rc_resource_cycles/{YYYY-MM} one document per month (doc id = unique constraint), history is kept
     rc_countries/{id}           gets regionalLastAt / regionalCarry for lazy production accrual
   Everything here is server-side; clients only read via getRegionResources.
   ============================================================ */
const admin = require("firebase-admin");
const { COUNTRIES, COUNTRY_BY_ID } = require("./countries");
const RC = require("./resource-config");
const { fail } = require("./errors");

function db() { return admin.firestore(); }
function FV() { return admin.firestore.FieldValue; }
const now = () => Date.now();
const HOUR = 3600000;

/* ---------------- pure helpers: seed, PRNG, month ---------------- */

function hash32(str) {            // FNV-1a -> 32-bit unsigned
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function monthKeyOf(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
function nextMonthStartMs(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0);
}
function seedFor(monthKey, cfg, salt) {
  return hash32("realmclash-resources|" + monthKey + "|v" + cfg.ALGORITHM_VERSION + (salt ? "|" + salt : ""));
}
function isMonthKey(k) { return typeof k === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(k); }

/* ---------------- pure: regions, values, production ---------------- */

// Default region list built from the EXISTING country data (natural resources inspire the geography of the first regions).
function buildDefaultRegions(cfg) {
  const out = {};
  COUNTRIES.forEach((c) => {
    for (let i = 0; i < cfg.REGIONS_PER_COUNTRY; i++) {
      const id = c.id + "_" + (i + 1);
      const rnd = mulberry32(hash32("region|" + id));
      const geo = i < c.resources.length ? (RC.NATURAL_TO_GEO[c.resources[i]] || "plains") : RC.GEOGRAPHIES[Math.floor(rnd() * RC.GEOGRAPHIES.length)];
      out[id] = newRegion(id, c, i, geo);
    }
  });
  return out;
}
function newRegion(id, country, i, geo) {
  return {
    id, countryId: country.id, name: RC.REGION_NAME_PREFIX[i % RC.REGION_NAME_PREFIX.length] + " " + country.name, geo,
    ownerCountryId: country.id,               // OWNERSHIP: only wars / conquest may change this, never the monthly cycle
    occupiedBy: null, resistance: 0, stability: 100, infrastructure: 1, development: 1,
  };
}

function tierOf(resource) { return RC.TIER_OF[resource]; }
function geoWeight(geo, resource) {
  const g = RC.RESOURCE_GEOGRAPHY_WEIGHTS[geo];
  return (g && g[resource]) || RC.RESOURCE_GEOGRAPHY_WEIGHTS.baseline;
}
// economic value of one hour of a region's BASE production: production x value x quality
function economicValue(resource, quality) {
  return RC.RESOURCE_BASE_PRODUCTION[resource] * (quality == null ? 1 : quality) * RC.RESOURCE_VALUES[resource];
}
function baseProduction(resource, quality) { return RC.RESOURCE_BASE_PRODUCTION[resource] * (quality == null ? 1 : quality); }

// FinalProduction = Base x Quality x Infrastructure x Development x Stability x Occupation
function regionProduction(region, a, cfg) {
  if (!a) return 0;
  const infra = 1 + cfg.INFRASTRUCTURE_STEP * Math.max(0, (region.infrastructure || 1) - 1);
  const dev = 1 + cfg.DEVELOPMENT_STEP * Math.max(0, (region.development || 1) - 1);
  const stab = Math.max(cfg.MIN_STABILITY_MODIFIER, Math.min(1, (region.stability == null ? 100 : region.stability) / 100));
  const occ = occupationModifier(region, cfg);
  return baseProduction(a.r, a.q) * infra * dev * stab * occ;
}
function occupationModifier(region, cfg) {
  if (!region.occupiedBy) return 1;
  return (region.resistance || 0) >= cfg.HIGH_RESISTANCE_FROM ? cfg.HIGH_RESISTANCE_MODIFIER : cfg.OCCUPATION_MODIFIER;
}

/* ---------------- pure: the RANDOM + BALANCED algorithm ---------------- */

// regions: {id: region}, prevAssign: {id:{r,q}} | null  ->  { assign, countryValues, stats }
function generateDistribution(regions, seed, prevAssign, cfg) {
  const rnd = mulberry32(seed);
  const ids = Object.keys(regions).sort();
  const n = ids.length;
  const countryIds = Array.from(new Set(ids.map((id) => regions[id].ownerCountryId))).sort();
  const cIndex = {}; countryIds.forEach((c, i) => { cIndex[c] = i; });

  // 1) RANDOM phase: seeded weighted pick, tier caps keep valuable resources concentrated in few regions
  const caps = {}, used = {};
  Object.keys(RC.RESOURCE_TIERS).forEach((t) => { caps[t] = Math.max(1, Math.floor(RC.TIER_MAX_SHARE[t] * n)); used[t] = 0; });
  const order = ids.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  const res = new Array(n), qual = new Array(n), geo = new Array(n), owner = new Array(n), pos = {};
  ids.forEach((id, i) => { pos[id] = i; geo[i] = regions[id].geo; owner[i] = cIndex[regions[id].ownerCountryId]; });
  order.forEach((id) => {
    const i = pos[id];
    const weights = RC.ALL_RESOURCES.map((r) => {
      const tier = tierOf(r);
      if (used[tier] >= caps[tier]) return 0;
      let w = RC.TIER_BASE_WEIGHT[tier] * geoWeight(geo[i], r);
      if (prevAssign && prevAssign[id] && prevAssign[id].r === r) w *= cfg.VARIETY_REPEAT_PENALTY;   // variety, not forced rotation
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let x = rnd() * total, pick = RC.ALL_RESOURCES[0];
    for (let k = 0; k < weights.length; k++) { x -= weights[k]; if (x <= 0) { pick = RC.ALL_RESOURCES[k]; break; } }
    res[i] = pick; used[tierOf(pick)]++;
    qual[i] = Math.round((cfg.QUALITY_MIN + rnd() * (cfg.QUALITY_MAX - cfg.QUALITY_MIN)) * 100) / 100;
  });

  // 2) BALANCING phase: swap deposits (resource + quality) between a rich and a poor country while it helps
  const val = new Array(n), tot = new Array(countryIds.length).fill(0);
  for (let i = 0; i < n; i++) { val[i] = economicValue(res[i], qual[i]); tot[owner[i]] += val[i]; }
  const byCountry = countryIds.map(() => []);
  for (let i = 0; i < n; i++) byCountry[owner[i]].push(i);
  const spreadOf = () => { let mx = -Infinity, mn = Infinity; for (const t of tot) { if (t > mx) mx = t; if (t < mn) mn = t; } return { mx, mn, spread: mx > 0 ? (mx - mn) / mx : 0 }; };
  const okSwap = (a, b) => geoWeight(geo[b], res[a]) >= cfg.MIN_SWAP_GEO_WEIGHT && geoWeight(geo[a], res[b]) >= cfg.MIN_SWAP_GEO_WEIGHT;
  const doSwap = (a, b) => {
    const ca = owner[a], cb = owner[b];
    const r = res[a], q = qual[a], v = val[a];
    res[a] = res[b]; qual[a] = qual[b]; val[a] = val[b];
    res[b] = r; qual[b] = q; val[b] = v;
    tot[ca] += val[a] - v; tot[cb] += val[b] - val[a] + 0; // recomputed below for exactness
    // exact recompute for the two touched countries (cheap, avoids float drift)
    tot[ca] = byCountry[ca].reduce((s, k) => s + val[k], 0);
    tot[cb] = byCountry[cb].reduce((s, k) => s + val[k], 0);
  };
  // best swap between two given countries (S richer than W): value moved d must satisfy 0 < d < gap, closest to gap/2
  const bestBetween = (S, W) => {
    const gap = tot[S] - tot[W]; let best = null, bestScore = Infinity;
    for (const a of byCountry[S]) for (const b of byCountry[W]) {
      const d = val[a] - val[b];
      if (d <= 0 || d >= gap) continue;
      if (!okSwap(a, b)) continue;
      const score = Math.abs(gap / 2 - d);
      if (score < bestScore) { bestScore = score; best = [a, b]; }
    }
    return best;
  };
  let iterations = 0, stalls = 0, st = spreadOf();
  const TOP = 6, C = countryIds.length;
  while (st.spread > cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE && iterations < cfg.MAX_BALANCING_ITERATIONS && stalls < 60 && C > 1) {
    iterations++;
    const idx = countryIds.map((_, i) => i).sort((x, y) => tot[y] - tot[x]);
    let moved = false, bestPair = null, bestScore = Infinity;
    for (let s = 0; s < Math.min(TOP, C); s++) for (let w = 0; w < Math.min(TOP, C); w++) {
      const S = idx[s], W = idx[C - 1 - w];
      if (S === W || tot[S] <= tot[W]) continue;
      const p = bestBetween(S, W);
      if (p) { const sc = Math.abs((tot[S] - tot[W]) / 2 - (val[p[0]] - val[p[1]])) - (tot[S] - tot[W]) * 0.5; if (sc < bestScore) { bestScore = sc; bestPair = p; } }
    }
    if (!bestPair) {          // fall back to random rich/poor pairs
      for (let k = 0; k < 60 && !bestPair; k++) {
        const S = Math.floor(rnd() * C), W = Math.floor(rnd() * C);
        if (S === W || tot[S] <= tot[W]) continue;
        bestPair = bestBetween(S, W);
      }
    }
    if (bestPair) { doSwap(bestPair[0], bestPair[1]); moved = true; }
    stalls = moved ? 0 : stalls + 1;
    st = spreadOf();
  }

  const assign = {};
  ids.forEach((id, i) => { assign[id] = { r: res[i], q: qual[i] }; });
  const countryValues = {}; countryIds.forEach((c, i) => { countryValues[c] = Math.round(tot[i]); });
  const avg = tot.reduce((a, b) => a + b, 0) / Math.max(1, tot.length);
  const within = st.spread <= cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE;
  const stats = {
    max: Math.round(st.mx), min: Math.round(st.mn), avg: Math.round(avg), spreadPct: Math.round(st.spread * 10000) / 100,
    tolerancePct: cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE * 100, withinTolerance: within, iterations, regions: n, countries: countryIds.length,
    warning: within ? null : "Balance tolerance not reached; closest distribution kept.",
  };
  return { assign, countryValues, stats };
}

/* ---------------- pure: per-country views ---------------- */

function countryProduction(countryId, regions, assign, cfg) {
  const perHour = {}; let valuePerHour = 0, count = 0, rare = 0;
  Object.keys(regions).forEach((id) => {
    const rg = regions[id];
    if (rg.ownerCountryId !== countryId) return;
    const a = assign[id]; if (!a) return;
    const p = regionProduction(rg, a, cfg);
    perHour[a.r] = (perHour[a.r] || 0) + p;
    valuePerHour += p * RC.RESOURCE_VALUES[a.r]; count++;
    if (tierOf(a.r) === "RARE" || tierOf(a.r) === "VERY_RARE") rare++;
  });
  Object.keys(perHour).forEach((r) => { perHour[r] = Math.round(perHour[r] * 100) / 100; });
  return { perHour, valuePerHour: Math.round(valuePerHour), regionCount: count, rareCount: rare };
}

function balanceTable(regions, assign, cfg) {
  const owners = Array.from(new Set(Object.keys(regions).map((id) => regions[id].ownerCountryId))).sort();
  const rows = owners.map((c) => { const p = countryProduction(c, regions, assign, cfg); return { countryId: c, totalValue: p.valuePerHour, resourceCount: Object.keys(p.perHour).length, rareCount: p.rareCount, avgProduction: p.regionCount ? Math.round(Object.values(p.perHour).reduce((a, b) => a + b, 0) / p.regionCount) : 0 }; });
  const avg = rows.reduce((a, r) => a + r.totalValue, 0) / Math.max(1, rows.length);
  rows.forEach((r) => { r.diffPct = avg ? Math.round((r.totalValue - avg) / avg * 1000) / 10 : 0; });
  return rows;
}

/* ---------------- Firestore: config, regions (migration), cycles ---------------- */

async function loadConfig() {
  const cfg = Object.assign({}, RC.RESOURCE_DISTRIBUTION_CONFIG, { ADMIN_UIDS: [] });
  try {
    const snap = await db().doc("rc_config/resources").get();
    if (snap.exists) {
      const o = snap.data();
      Object.keys(RC.CFG_NUMBER_LIMITS).forEach((k) => { if (typeof o[k] === "number" && isFinite(o[k])) cfg[k] = Math.max(RC.CFG_NUMBER_LIMITS[k][0], Math.min(RC.CFG_NUMBER_LIMITS[k][1], o[k])); });
      ["MONTHLY_DISTRIBUTION_ENABLED", "ADMIN_TOOLS_ENABLED"].forEach((k) => { if (typeof o[k] === "boolean") cfg[k] = o[k]; });
      if (Array.isArray(o.ADMIN_UIDS)) cfg.ADMIN_UIDS = o.ADMIN_UIDS.filter((u) => typeof u === "string");
    }
  } catch (e) { /* defaults */ }
  return cfg;
}

const regionsRef = () => db().doc("rc_world/regions");
const stateRef = () => db().doc("rc_world/resourceState");
const cycleRef = (key) => db().doc("rc_resource_cycles/" + key);

/* MIGRATION: creates missing regions from the existing country data. Idempotent, and it NEVER overwrites a region
   that already exists (so ownership / occupation / development set by wars or admins is preserved). */
let _regionsCache = null;       // {at, regions}: the regions doc is ~170 KB, so country pages must not re-read it on every call
const REGIONS_TTL_MS = 30000;   // ownership changes (wars) become visible within 30s; call invalidateRegions() right after changing a region
function invalidateRegions() { _regionsCache = null; }
async function ensureRegions(cfg) {
  if (_regionsCache && now() - _regionsCache.at < REGIONS_TTL_MS) return _regionsCache.regions;
  cfg = cfg || await loadConfig();
  const snap = await regionsRef().get();
  const existing = snap.exists ? (snap.data().regions || {}) : {};
  const wanted = buildDefaultRegions(cfg);
  const missing = Object.keys(wanted).filter((id) => !existing[id]);
  if (!missing.length) { _regionsCache = { at: now(), regions: existing }; return existing; }
  await db().runTransaction(async (tx) => {
    const cur = await tx.get(regionsRef());
    const have = cur.exists ? (cur.data().regions || {}) : {};
    const add = {}; Object.keys(wanted).forEach((id) => { if (!have[id]) add[id] = wanted[id]; });
    if (Object.keys(add).length) tx.set(regionsRef(), { regions: add, version: 1, updatedAt: now() }, { merge: true });
  });
  const again = await regionsRef().get();
  const out = again.exists ? (again.data().regions || {}) : {};
  _regionsCache = { at: now(), regions: out };
  return out;
}

let _cache = null;     // {key, cycle} — read-through cache, never the source of truth (a restart just reloads from Firestore)

async function loadCycle(key) {
  const s = await cycleRef(key).get();
  return s.exists ? s.data() : null;
}

async function previousAssign(key) {
  try {
    const st = await stateRef().get();
    const prevKey = st.exists ? st.data().currentMonthKey : null;
    if (prevKey && prevKey !== key) { const c = await loadCycle(prevKey); if (c) return { key: prevKey, assign: c.assign || {} }; }
  } catch (e) { /* no history */ }
  return { key: null, assign: null };
}

// Returns the cycle document for `monthKey` (default: the current UTC month), generating it ONCE if it does not exist.
async function ensureDistribution(monthKey, opts) {
  const cfg = (opts && opts.cfg) || await loadConfig();
  const key = monthKey || monthKeyOf(now());
  if (!isMonthKey(key)) fail("invalid-argument", "INVALID_MONTH");
  if (_cache && _cache.key === key && !(opts && opts.fresh)) return _cache.cycle;
  const existing = await loadCycle(key);
  if (existing && existing.status === "complete") { _cache = { key, cycle: existing }; return existing; }
  if (!cfg.MONTHLY_DISTRIBUTION_ENABLED) return null;
  const regions = await ensureRegions(cfg);
  const prev = await previousAssign(key);
  const seed = seedFor(key, cfg);
  const gen = generateDistribution(regions, seed, prev.assign, cfg);
  if (!gen.stats.withinTolerance) console.warn("[resources] " + key + ": balance spread " + gen.stats.spreadPct + "% > tolerance " + gen.stats.tolerancePct + "% after " + gen.stats.iterations + " iterations");
  const t = now();
  const doc = { monthKey: key, seed, status: "complete", algorithmVersion: cfg.ALGORITHM_VERSION, createdAt: t, completedAt: t, prevMonthKey: prev.key, assign: gen.assign, countryValues: gen.countryValues, stats: gen.stats };
  // doc id == monthKey is the unique constraint; the transaction makes "check then create" atomic
  const saved = await db().runTransaction(async (tx) => {
    const s = await tx.get(cycleRef(key));
    if (s.exists && s.data().status === "complete") return s.data();
    tx.set(cycleRef(key), doc);
    tx.set(stateRef(), { currentMonthKey: key, updatedAt: t }, { merge: true });
    return doc;
  });
  _cache = { key, cycle: saved };
  return saved;
}

/* Lazy production: the owner country accrues what its regions produced since the last accrual (timestamp based, no cron needed). */
async function accrueRegionalProduction(countryId) {
  const cfg = await loadConfig();
  if (!cfg.MONTHLY_DISTRIBUTION_ENABLED || !COUNTRY_BY_ID[countryId]) return null;
  const cycle = await ensureDistribution(null, { cfg });
  if (!cycle) return null;
  const regions = await ensureRegions(cfg);
  const prod = countryProduction(countryId, regions, cycle.assign, cfg);
  const cRef = db().doc("rc_countries/" + countryId), t = now();
  return db().runTransaction(async (tx) => {
    const s = await tx.get(cRef);
    const d = s.exists ? s.data() : {};
    const last = d.regionalLastAt || 0;
    if (!last) { tx.set(cRef, { regionalLastAt: t }, { merge: true }); return { gained: {} }; }
    const elapsed = Math.min(Math.max(0, t - last), cfg.MAX_ACCRUAL_MS);
    if (t - last < 60000) return { gained: {} };
    const carry = Object.assign({}, d.regionalCarry || {}), inc = {}, gained = {};
    Object.keys(prod.perHour).forEach((r) => {
      const total = (carry[r] || 0) + prod.perHour[r] * elapsed / HOUR, whole = Math.floor(total);
      carry[r] = Math.round((total - whole) * 1000) / 1000;
      if (whole > 0) { inc[r] = FV().increment(whole); gained[r] = whole; }
    });
    tx.set(cRef, { resources: inc, regionalLastAt: t, regionalCarry: carry }, { merge: true });
    return { gained };
  });
}

/* ---------------- read APIs ---------------- */

function regionView(rg, a, cfg) {
  const tier = a ? tierOf(a.r) : null;
  return {
    id: rg.id, name: rg.name, geo: rg.geo, owner: rg.ownerCountryId, occupiedBy: rg.occupiedBy || null,
    stability: rg.stability == null ? 100 : rg.stability, resistance: rg.resistance || 0,
    resource: a ? a.r : null, tier, quality: a ? a.q : null,
    baseProduction: a ? Math.round(baseProduction(a.r, a.q) * 10) / 10 : 0,
    production: a ? Math.round(regionProduction(rg, a, cfg) * 10) / 10 : 0,
    unitValue: a ? RC.RESOURCE_VALUES[a.r] : 0,
    value: a ? Math.round(regionProduction(rg, a, cfg) * RC.RESOURCE_VALUES[a.r]) : 0,
    occupationModifier: occupationModifier(rg, cfg),
  };
}

async function getRegionResources(countryId) {
  if (!countryId || !COUNTRY_BY_ID[countryId]) fail("invalid-argument", "INVALID_TARGET");
  const cfg = await loadConfig();
  const t = now();
  const cycle = await ensureDistribution(null, { cfg });
  if (!cycle) return { serverNow: t, enabled: false, countryId };
  const regions = await ensureRegions(cfg);
  const mine = Object.keys(regions).filter((id) => regions[id].ownerCountryId === countryId).sort();
  const prod = countryProduction(countryId, regions, cycle.assign, cfg);
  const totalProd = Object.values(prod.perHour).reduce((a, b) => a + b, 0);
  return {
    serverNow: t, enabled: true, countryId, monthKey: cycle.monthKey,
    nextRotationAt: nextMonthStartMs(t), daysToRotation: Math.max(0, Math.ceil((nextMonthStartMs(t) - t) / 86400000)),
    overview: { perHour: prod.perHour, valuePerHour: prod.valuePerHour, regionCount: prod.regionCount, rareCount: prod.rareCount, totalPerHour: Math.round(totalProd * 10) / 10 },
    regions: mine.map((id) => regionView(regions[id], cycle.assign[id], cfg)),
    tiers: RC.TIER_OF, values: RC.RESOURCE_VALUES,
  };
}

/* ---------------- admin / debug (never reachable by normal players) ---------------- */

function assertAdmin(uid, cfg) {
  if (!cfg.ADMIN_TOOLS_ENABLED || !cfg.ADMIN_UIDS.includes(uid)) fail("permission-denied", "ADMIN_ONLY");
}
async function adminResourceDistribution(uid, data) {
  const cfg = await loadConfig();
  assertAdmin(uid, cfg);
  const op = data && data.op, key = (data && data.monthKey) || monthKeyOf(now());
  if (!isMonthKey(key)) fail("invalid-argument", "INVALID_MONTH");
  if (op === "history") {
    const q = await db().collection("rc_resource_cycles").get();
    return { cycles: q.docs.map((d) => d.data()).map((c) => ({ monthKey: c.monthKey, seed: c.seed, createdAt: c.createdAt, algorithmVersion: c.algorithmVersion, stats: c.stats })).sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1)) };
  }
  if (op === "generate") { const c = await ensureDistribution(key, { cfg, fresh: true }); return { monthKey: key, created: !!c, stats: c && c.stats }; }
  if (op === "preview") {
    const regions = await ensureRegions(cfg), prev = await previousAssign(key);
    const gen = generateDistribution(regions, seedFor(key, cfg, data.salt || "preview"), prev.assign, cfg);
    return { monthKey: key, preview: true, stats: gen.stats, table: balanceTable(regions, gen.assign, cfg).sort((a, b) => b.totalValue - a.totalValue).slice(0, 50) };
  }
  if (op === "balance") {
    const cycle = await ensureDistribution(key, { cfg }), regions = await ensureRegions(cfg);
    return { monthKey: key, stats: cycle.stats, table: balanceTable(regions, cycle.assign, cfg).sort((a, b) => b.totalValue - a.totalValue) };
  }
  if (op === "regenerate") {      // replaces ONE month's resources; keeps the old one in rc_resource_cycles_archive. Ownership is untouched.
    if (data.confirm !== true) fail("failed-precondition", "CONFIRM_REQUIRED");
    const old = await loadCycle(key), regions = await ensureRegions(cfg), prev = await previousAssign(key);
    const n = ((old && old.regenerations) || 0) + 1, t = now();
    const gen = generateDistribution(regions, seedFor(key, cfg, "regen" + n), prev.assign, cfg);
    if (old) await db().doc("rc_resource_cycles_archive/" + key + "_" + t).set(old);
    const doc = { monthKey: key, seed: seedFor(key, cfg, "regen" + n), status: "complete", algorithmVersion: cfg.ALGORITHM_VERSION, createdAt: (old && old.createdAt) || t, completedAt: t, regenerations: n, prevMonthKey: prev.key, assign: gen.assign, countryValues: gen.countryValues, stats: gen.stats };
    await db().doc("rc_resource_cycles/" + key).set(doc);
    _cache = null;
    return { monthKey: key, regenerated: n, stats: gen.stats };
  }
  fail("invalid-argument", "UNKNOWN_OP");
}

function _resetCache() { _cache = null; _regionsCache = null; }

module.exports = {
  hash32, mulberry32, monthKeyOf, nextMonthStartMs, seedFor, isMonthKey,
  buildDefaultRegions, economicValue, baseProduction, regionProduction, occupationModifier, generateDistribution, countryProduction, balanceTable,
  loadConfig, ensureRegions, invalidateRegions, ensureDistribution, accrueRegionalProduction, getRegionResources, adminResourceDistribution, _resetCache,
};
