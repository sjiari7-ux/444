#!/usr/bin/env node
"use strict";
/* Tests the world-map territory panel (js/ui.js renderMapTerritories + js/storage.js loadMapRegions) against REAL getRegionResources data
   from the local server logic. Usage: node tools/test-map-panel.js */
const fs = require("fs"), vm = require("vm"), path = require("path");
let src = fs.readFileSync(path.join(__dirname, "../js/server-local.js"), "utf8").replace(/\}\)\(\);\s*$/, "window.__req=__require;})();");
const store = {}, clone = (o) => JSON.parse(JSON.stringify(o));
let clock = Date.UTC(2026, 9, 3, 12, 0, 0);
class FakeDate extends Date { static now() { return clock; } constructor(...a) { super(...(a.length ? a : [clock])); } }
const isInc = (v) => v && typeof v === "object" && v.__inc !== undefined;
function merge(a, b) { for (const k of Object.keys(b)) { const v = b[k]; if (isInc(v)) a[k] = (a[k] || 0) + v.__inc; else if (v && typeof v === "object" && !Array.isArray(v)) a[k] = merge(a[k] && typeof a[k] === "object" ? a[k] : {}, v); else a[k] = v; } return a; }
const snap = (p) => ({ exists: p in store, data: () => clone(store[p]), id: p.split("/").pop() });
const ref = (p) => ({ path: p, get: async () => snap(p) });
function coll(name) {
  let f = null, lim = 1e9;
  const q = { where: (k, op, v) => { f = [k, v]; return q; }, limit: (n) => { lim = n; return q; }, orderBy: () => q,
    get: async () => { const docs = Object.keys(store).filter((p) => p.startsWith(name + "/") && !p.slice(name.length + 1).includes("/") && (!f || store[p][f[0]] === f[1])).slice(0, lim).map((p) => ({ id: p.split("/").pop(), data: () => clone(store[p]) })); return { docs, size: docs.length, empty: !docs.length }; } };
  return q;
}
const tx = { get: async (r) => snap(r.path), set: (r, d, o) => { store[r.path] = o && o.merge ? merge(store[r.path] || {}, d) : clone(d); }, update: (r, d) => { if (!(r.path in store)) throw new Error("update of missing doc " + r.path); store[r.path] = merge(store[r.path], d); } };
const db = { doc: ref, collection: coll, runTransaction: async (fn) => fn(tx) };
const firebase = { firestore: Object.assign(() => db, { FieldValue: { increment: (n) => ({ __inc: n }) } }) };
const window = {};
vm.runInNewContext(src, { window, firebase, console, Date: FakeDate, Math, JSON, Promise, Object, Array, Set, Map, Number, String, isFinite, setTimeout, clearTimeout, Error });
const call = async (n, p, u) => { try { return { ok: await window.LocalFn(n, p || {}, u) }; } catch (e) { return { err: e.message, details: e.details }; } };

const DAYMS = 86400000;
let pass = 0, failn = 0;
const check = (name, cond, extra) => { cond ? pass++ : failn++; console.log((cond ? "  ok   " : "  FAIL ") + name + (cond ? "" : "  -> " + JSON.stringify(extra))); };
const J = (f) => fs.readFileSync(path.join(__dirname, "../js", f), "utf8");
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error("anchor missing: " + a); return s.slice(i, j); };

/* UI context: real config.js + engine.js + the REAL panel/loader code cut out of ui.js and storage.js */
const calls = []; let reply = null, updates = 0, dbOn = true;
const ui = J("ui.js"), st = J("storage.js");
const code = [J("config.js"), J("engine.js"),
  "function mapWarsList(){ return (S.worldWars && S.worldWars.active) || []; }",
  "function countryName(id){ const k = KINGDOMS.find(x=>x.id===id); return k ? k.name : id; }",
  "function resName(r){ return RESOURCE_NAMES[r] || (r.charAt(0).toUpperCase()+r.slice(1)); }",
  "function kingdomFlag(){ return ''; }",
  between(ui, "/* Simple one-colour line icons", "function renderMapScreen"),
  between(st, "const _mrBusy", "async function loadCountryState"),
  "globalThis.__t = { terrForMap, RES_PATH, MAP_TIER_COL, resName, renderMapPanel, renderMapTerritories, loadMapRegions, S: ()=>S };"].join("\n;\n");
const uctx = { console, Math, JSON, Object, Array, Number, String, Set, Map, Date, isFinite, Promise, setTimeout, clearTimeout, document: {}, localStorage: {},
  S: { char: { kingdomId: "morocco" }, screen: "map", worldWars: { active: [] } },
  get HAS_DB() { return dbOn; }, FUNCTIONS: null, USE_LOCAL_FN: true, withTimeout: (p) => p,
  callFn: async (n, p) => { calls.push([n, p]); if (reply instanceof Error) throw reply; return typeof reply === "function" ? reply(p) : reply; },
  WorldMap: { update() { updates++; } } };
uctx.window = uctx; uctx.LocalFn = () => {}; vm.createContext(uctx); vm.runInContext(code, uctx);
const U = uctx.__t, S = uctx.S;
const tick = () => new Promise((r) => setTimeout(r, 0));
const reset = () => { calls.length = 0; updates = 0; S.mapRegions = undefined; };

(async () => {
  console.log("territory panel with REAL server data (getRegionResources from the local server)");
  const seedP = { "rc_players/u1": { kingdomId: "morocco", level: 5, username: "tester" } }; Object.assign(store, seedP);
  const real = await call("getRegionResources", { countryId: "morocco" }, "u1");
  check("server returns this month's regions for a country", real.ok && real.ok.enabled && real.ok.regions.length > 0 && /^\d{4}-\d{2}$/.test(real.ok.monthKey), real);
  const d = real.ok;
  reset(); reply = d;
  let html = U.renderMapPanel("morocco");
  check("first render: shows 'Loading territories' and no numbers", /Loading territories/.test(html) && !/\/h<\/small>/.test(html));
  U.renderMapPanel("morocco"); U.renderMapPanel("morocco"); U.renderMapPanel("morocco");
  await tick(); await tick();
  check("many renders while loading cause exactly ONE server read", calls.length === 1 && calls[0][0] === "getRegionResources" && calls[0][1].countryId === "morocco", calls);
  check("after loading the open sheet is refreshed once", updates === 1, updates);
  html = U.renderMapPanel("morocco");
  const allShown = d.regions.every((g) => html.includes(g.name) && html.includes(Math.round(g.production).toLocaleString("en-US") + '<small style="font-weight:500;opacity:.6;font-size:.72em;">/h</small>'));
  check("every territory is listed with the server's own name and production", allShown, d.regions.map((g) => g.name));
  check("resource name + rarity of every territory match the server", d.regions.every((g) => (!g.resource || html.includes(U.resName(g.resource))) && html.includes({ COMMON: "Common", UNCOMMON: "Uncommon", RARE: "Rare", VERY_RARE: "Very rare" }[g.tier])), d.regions.map((g) => [g.resource, g.tier]));
  check("month key and days to rotation are shown", html.includes(d.monthKey) && html.includes(d.daysToRotation + " day"));
  check("states that the monthly rotation never changes ownership", /never changes who owns/.test(html));
  const sumShown = d.regions.reduce((a, g) => a + Math.round(g.production), 0), sumServer = Math.round(Object.values(d.overview.perHour).reduce((a, b) => a + b, 0));
  check("listed production adds up to the server's overview (within rounding)", Math.abs(sumShown - sumServer) <= d.regions.length, [sumShown, sumServer]);
  const n0 = calls.length; U.renderMapPanel("morocco"); U.renderMapPanel("morocco");
  check("cached: further renders do not call the server again", calls.length === n0);
  check("war + 'View Country' parts of the panel are untouched", /At peace/.test(html) && /data-action="view-country"/.test(html));

  const RC = require("../functions/lib/resource-config.js");   // read-only: the server's own resource + tier list
  check("every game resource has a badge icon (" + RC.ALL_RESOURCES.length + " resources)", RC.ALL_RESOURCES.every((r) => typeof U.RES_PATH[r] === "string" && U.RES_PATH[r].length > 20), RC.ALL_RESOURCES.filter((r) => !U.RES_PATH[r]));
  check("every rarity tier has its own colour", Object.keys(RC.RESOURCE_TIERS).every((t) => /^#[0-9a-f]{6}$/i.test(U.MAP_TIER_COL[t])) && new Set(Object.values(U.MAP_TIER_COL)).size === 4, U.MAP_TIER_COL);
  check("each badge is coloured by the rarity of ITS resource", d.regions.every((g) => html.includes("border:2px solid " + U.MAP_TIER_COL[g.tier])));
  check("badge layout: icon svg + number + '/h' under it + resource name", (html.match(/<svg /g) || []).length === d.regions.length && /font-weight:700;font-size:15px/.test(html));

  console.log("edge cases");
  reset(); reply = { enabled: false, countryId: "france" }; U.renderMapPanel("france"); await tick(); await tick();
  html = U.renderMapPanel("france");
  check("distribution disabled on the server -> no territory section, no made-up numbers", !/TERRITORIES/.test(html) && !/Loading/.test(html) && !/\/h<\/small>/.test(html));
  reset(); reply = new Error("boom"); U.renderMapPanel("spain"); await tick(); await tick();
  html = U.renderMapPanel("spain"); const nErr = calls.length; U.renderMapPanel("spain");
  check("server error -> no section, and no retry storm inside the cache window", !/TERRITORIES/.test(html) && calls.length === nErr && nErr === 1, calls.length);
  reset(); dbOn = false; U.renderMapPanel("italy"); await tick(); html = U.renderMapPanel("italy"); dbOn = true;
  check("no database/functions available -> no call, no section", calls.length === 0 && !/TERRITORIES/.test(html) && !/Loading/.test(html));
  reset(); reply = { enabled: true, monthKey: "2026-10", daysToRotation: 1, regions: [{ name: "<img src=x onerror=alert(1)>", resource: "wood", tier: "COMMON", stability: 99.6, production: 12.4, occupiedBy: "france" }] };
  U.renderMapPanel("morocco"); await tick(); await tick(); html = U.renderMapPanel("morocco");
  check("region names are HTML-escaped", !html.includes("<img src=x") && html.includes("&lt;img"));
  check("occupation and rounded stability are shown; '1 day' is singular", /Occupied by/.test(html) && /Stability 100%/.test(html) && /in 1 day\./.test(html), html.slice(-300));
  reset(); reply = (p) => ({ enabled: true, monthKey: "2026-10", daysToRotation: 3, regions: [{ name: "R-" + p.countryId, resource: "iron", tier: "UNCOMMON", stability: 80, production: 5 }] });
  U.renderMapPanel("morocco"); U.renderMapPanel("egypt"); await tick(); await tick();
  check("each country is cached separately", U.renderMapPanel("morocco").includes("R-morocco") && U.renderMapPanel("egypt").includes("R-egypt") && !U.renderMapPanel("egypt").includes("R-morocco"));
  const realNow = Date.now; const t0 = realNow.call(Date); Date.now = () => t0 + 6 * 60 * 1000; const nb = calls.length; reply = (p) => ({ enabled: true, monthKey: "2026-10", daysToRotation: 3, regions: [{ name: "NEW-" + p.countryId, resource: "iron", tier: "UNCOMMON", stability: 80, production: 6 }] });
  const stale = U.renderMapPanel("morocco"); U.renderMapPanel("morocco"); U.renderMapPanel("morocco"); await tick(); await tick(); Date.now = realNow;
  check("after 5 min the data is refreshed ONCE (even with several renders meanwhile), old data stays visible meanwhile", stale.includes("R-morocco") && calls.length === nb + 1 && S.mapRegions.morocco.data.regions[0].name === "NEW-morocco");

  console.log("canvas badges (terrForMap)");
  reset(); reply = d;
  const first = U.terrForMap("morocco"); U.terrForMap("morocco"); U.terrForMap("morocco"); await tick(); await tick();
  const bl = U.terrForMap("morocco");
  check("unknown country: returns null at first and loads it exactly once", first === null && calls.length === 1, [first, calls.length]);
  check("then returns one badge per territory with the server's id/name", Array.isArray(bl) && bl.length === d.regions.length && bl.every((b, i) => b.id === d.regions[i].id && b.name === d.regions[i].name), bl);
  check("badge colour = rarity colour, icon path = the resource's icon", bl.every((b, i) => b.col === U.MAP_TIER_COL[d.regions[i].tier] && b.d === U.RES_PATH[d.regions[i].resource]));
  check("the list is the same object on every frame (renderer can cache placement)", U.terrForMap("morocco") === bl && calls.length === 1);
  reset(); reply = { enabled: true, monthKey: "2026-10", daysToRotation: 3, regions: [{ id: "x_1", name: "Northern X", resource: "iron", tier: "UNCOMMON", stability: 90, production: 5, occupiedBy: "france" }, { id: "x_2", name: "Southern X", resource: null, tier: null, stability: 90, production: 0 }] };
  U.terrForMap("x"); await tick(); await tick(); const xl = U.terrForMap("x");
  check("territory without a resource gets no badge; occupied flag is passed on", xl.length === 1 && xl[0].occ === true, xl);
  reset(); reply = { enabled: false }; U.terrForMap("y"); await tick(); await tick();
  check("distribution disabled -> null, no badges", U.terrForMap("y") === null);
  reset(); reply = new Error("boom"); U.terrForMap("z"); await tick(); await tick(); const nz = calls.length;
  check("error -> null, no retry storm", U.terrForMap("z") === null && calls.length === nz && nz === 1);

  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})();
