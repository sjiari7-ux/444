#!/usr/bin/env node
"use strict";
/* Runs the server logic (js/server-local.js) against a fake in-memory Firestore and checks the rules.
   Usage: node tools/test-server.js */
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
const DAY = 86400000, HOUR = 3600000;
let pass = 0, failn = 0;
const check = (name, cond, extra) => { cond ? pass++ : failn++; console.log((cond ? "  ok   " : "  FAIL ") + name + (cond ? "" : "  -> " + JSON.stringify(extra))); };
const char = (o) => Object.assign({ class: "warrior", level: 5, gold: 100, energyCur: 50, lastEnergyAt: clock, classSkills: {}, generalSkills: { stamina: 2 }, equipment: {}, buffs: [], updatedAt: clock }, o);
const lastChat = (cid) => { const c = store["rc_kingdoms/" + cid].chat || []; return c.length ? c[c.length - 1] : null; };
const chatTexts = (cid) => (store["rc_kingdoms/" + cid].chat || []).map((m) => m.text);
const addCitizens = (cid, n, leader) => { for (let i = 0; i < n; i++) { const id = `${cid}_${i}`; store["rc_players/" + id] = char({ username: id, kingdomId: cid, kingdomRole: i === 0 ? "Leader" : "Member", level: 10 - i, kingdomJoinedAt: 1000 + i }); } store["rc_kingdoms/" + cid] = { id: cid, leaderId: `${cid}_0`, chat: [], treasury: {} }; };

(async () => {
  console.log("1. minimum citizens before a war");
  addCitizens("germany", 1); addCitizens("france", 1);
  let r = await call("declareWar", { targetCountryId: "france" }, "germany_0");
  check("1 citizen each -> NOT_ENOUGH_MEMBERS (required 3)", r.err === "NOT_ENOUGH_MEMBERS" && r.details.required === 3, r);
  addCitizens("germany", 3); addCitizens("france", 3);
  r = await call("declareWar", { targetCountryId: "france" }, "germany_0");
  check("3 citizens each -> war declared", !!(r.ok && r.ok.warId), r);
  const warId = r.ok && r.ok.warId;

  console.log("2. chat announcements");
  check("both countries got the declaration", /declared war/.test((lastChat("germany") || {}).text || "") && /declared war/.test((lastChat("france") || {}).text || ""), [chatTexts("germany"), chatTexts("france")]);
  check("message is flagged as system", lastChat("germany").system === true && lastChat("germany").senderId === "system");
  clock += 31 * 60000; await call("getWorldWars", {}, "germany_0");
  r = await call("getCountryState", {}, "germany_0");
  check("war start announced", chatTexts("germany").some((t) => /has started/.test(t)), chatTexts("germany"));
  const cfgRound = store["rc_wars/" + warId].cfg.roundMs; check("round length is 5h", cfgRound === 5 * HOUR, cfgRound);
  clock += 5 * HOUR + 1000; await call("getCountryState", {}, "germany_0");
  check("round 1 result announced", chatTexts("france").some((t) => /^Round 1: /.test(t)), chatTexts("france"));
  check("round 2 start announced", chatTexts("france").some((t) => /Round 2 has started/.test(t)), chatTexts("france"));
  clock += 5 * HOUR + 1000; await call("getCountryState", {}, "germany_0");
  const w = store["rc_wars/" + warId];
  if (w.status !== "finished") { clock += 5 * HOUR + 1000; await call("getCountryState", {}, "germany_0"); }
  const wf = store["rc_wars/" + warId];
  check("war finished + winner announced", wf.status === "finished" && chatTexts("germany").some((t) => /won the war/.test(t)), wf.status);
  const winner = wf.winnerCountryId, loser = wf.loserCountryId;
  r = await call("chooseWarReward", { warId, resourceId: "iron", rate: 10 }, winner + "_0");
  check("winner Leader chooses tax", !!r.ok, r);
  check("war tax choice announced to both", /chose iron/.test((lastChat(winner) || {}).text || "") && /chose iron/.test((lastChat(loser) || {}).text || ""), [lastChat(winner), lastChat(loser)]);

  console.log("3. transfer leadership");
  r = await call("transferLeadership", { targetId: "germany_1" }, "germany_2");
  check("a non-leader cannot", r.err === "NOT_LEADER", r);
  r = await call("transferLeadership", { targetId: "france_1" }, "germany_0");
  check("cannot give it to a foreign player", r.err === "TARGET_NOT_CITIZEN", r);
  r = await call("transferLeadership", { targetId: "germany_0" }, "germany_0");
  check("cannot give it to yourself", r.err === "INVALID_TARGET", r);
  r = await call("transferLeadership", { targetId: "germany_1" }, "germany_0");
  check("Leader hands over", !!r.ok && store["rc_kingdoms/germany"].leaderId === "germany_1", r);
  check("roles swapped (new Leader / old Co-Leader)", store["rc_players/germany_1"].kingdomRole === "Leader" && store["rc_players/germany_0"].kingdomRole === "Co-Leader");
  check("announced", /handed leadership to germany_1/.test(lastChat("germany").text), lastChat("germany"));
  r = await call("setCountrySpecialities", { resources: ["food", "wood"] }, "germany_1");
  check("new Leader can use Leader powers", !!r.ok || r.err === "SPECIALITIES_UNCHANGED" || r.err === "SPECIALITY_COOLDOWN", r);
  r = await call("setCountrySpecialities", { resources: ["food", "wood"] }, "germany_0");
  check("old Leader no longer can", r.err === "NOT_LEADER", r);

  console.log("4. automatic succession of an absent Leader");
  addCitizens("spain", 4);
  store["rc_players/spain_0"].updatedAt = clock - 3 * DAY;
  store["rc_players/spain_2"].kingdomRole = "Officer";
  await call("getCountryState", {}, "spain_1");
  check("Leader away only 3 days -> unchanged", store["rc_kingdoms/spain"].leaderId === "spain_0");
  store["rc_players/spain_0"].updatedAt = clock - 8 * DAY;
  store["rc_players/spain_1"].level = 30;               // highest level, but lower rank than the Officer
  await call("getCountryState", {}, "spain_1");
  check("Leader away 8 days -> highest-ranking active citizen (Officer) takes over", store["rc_kingdoms/spain"].leaderId === "spain_2", store["rc_kingdoms/spain"]);
  check("new Leader role set, old Leader becomes Officer", store["rc_players/spain_2"].kingdomRole === "Leader" && store["rc_players/spain_0"].kingdomRole === "Officer");
  check("announced", /spain_2 is the new Leader/.test(lastChat("spain").text), lastChat("spain"));
  addCitizens("italy", 3);
  ["italy_0", "italy_1", "italy_2"].forEach((id) => { store["rc_players/" + id].updatedAt = clock - 20 * DAY; });
  await call("getCountryState", {}, "italy_1");
  check("everyone away -> nothing changes", store["rc_kingdoms/italy"].leaderId === "italy_0");
  addCitizens("poland", 3); store["rc_kingdoms/poland"].leaderId = null; store["rc_players/poland_0"].updatedAt = clock - 30 * DAY;
  await call("getCountryState", {}, "poland_1");
  check("vacant leadership left to the existing Claim button", store["rc_kingdoms/poland"].leaderId === null);

  console.log("5. daily reward");
  store["rc_players/dailyguy"] = char({ username: "dailyguy", gold: 100, energyCur: 10 });
  r = await call("claimDailyReward", {}, "dailyguy");
  check("day 1: 20 gold, streak 1", r.ok && r.ok.gold === 20 && r.ok.streak === 1 && store["rc_players/dailyguy"].gold === 120, r);
  check("energy increased", store["rc_players/dailyguy"].energyCur > 10, store["rc_players/dailyguy"].energyCur);
  r = await call("claimDailyReward", {}, "dailyguy");
  check("same day again -> ALREADY_CLAIMED", r.err === "ALREADY_CLAIMED" && r.details.msRemaining > 0, r);
  clock += DAY; r = await call("claimDailyReward", {}, "dailyguy");
  check("next day: streak 2 = 40 gold", r.ok && r.ok.streak === 2 && r.ok.gold === 40, r);
  clock += 3 * DAY; r = await call("claimDailyReward", {}, "dailyguy");
  check("missed days: streak resets to 1", r.ok && r.ok.streak === 1 && r.ok.gold === 20, r);
  for (let i = 0; i < 9; i++) { clock += DAY; r = await call("claimDailyReward", {}, "dailyguy"); }
  check("streak capped at 7 = 140 gold", r.ok && r.ok.streak === 7 && r.ok.gold === 140, r);
  r = await call("claimDailyReward", {}, "nobody-here");
  check("no character -> NO_CHARACTER", r.err === "NO_CHARACTER", r);


  console.log("6. monthly resource distribution");
  const RD = window.__req("resource-distribution");
  const KEY = RD.monthKeyOf(clock), cycPath = (k) => "rc_resource_cycles/" + k;
  const cycleDocs = (k) => Object.keys(store).filter((p) => p === cycPath(k));
  const ownersNow = () => { const o = {}, rg = store["rc_world/regions"].regions; Object.keys(rg).sort().forEach((id) => { o[id] = rg[id].ownerCountryId; }); return o; };
  // earlier tests already opened country pages, which lazily generate the month -> prove it, then test the service directly
  check("T1 a distribution exists for the current month (generated lazily, complete)", !!store[cycPath(KEY)] && store[cycPath(KEY)].status === "complete" && typeof store[cycPath(KEY)].seed === "number", Object.keys(store).filter((p) => p.startsWith("rc_resource")));
  const c0 = clone(store[cycPath(KEY)]);
  check("T1 every region got a resource (780 = 195 countries x 4)", Object.keys(c0.assign).length === 780, Object.keys(c0.assign).length);
  check("T1 monthKey, seed, algorithmVersion, createdAt stored", c0.monthKey === KEY && c0.algorithmVersion >= 1 && c0.createdAt > 0 && c0.prevMonthKey !== undefined, c0.monthKey);
  RD._resetCache(); await RD.ensureDistribution();
  check("T2 same month twice -> still ONE document, unchanged", cycleDocs(KEY).length === 1 && JSON.stringify(store[cycPath(KEY)]) === JSON.stringify(c0));
  const ownersBefore = ownersNow();
  RD._resetCache(); let r1 = await call("getRegionResources", { countryId: "germany" }, "germany_0");
  check("T3 restart simulation (cache cleared) -> same distribution loaded from the database", JSON.stringify(store[cycPath(KEY)]) === JSON.stringify(c0) && r1.ok && r1.ok.monthKey === KEY, r1.err);
  const [a, b] = await Promise.all([RD.ensureDistribution("2026-11"), RD.ensureDistribution("2026-11")]);
  check("T10 two simultaneous generations of one month -> ONE document, same seed and layout", cycleDocs("2026-11").length === 1 && a.seed === b.seed && JSON.stringify(a.assign) === JSON.stringify(b.assign));
  check("T4 a different month generates a NEW distribution (new seed, prevMonthKey linked)", store[cycPath("2026-11")].seed !== c0.seed && store[cycPath("2026-11")].monthKey === "2026-11", store[cycPath("2026-11")].seed);
  const c1 = store[cycPath("2026-11")];
  let diff = 0; Object.keys(c0.assign).forEach((id) => { if (c0.assign[id].r !== c1.assign[id].r) diff++; });
  check("T5 resource layout changes between months (>50% of regions differ, but repeats are still possible)", diff > 390 && diff < 780, diff);
  const same2 = RD.generateDistribution(store["rc_world/regions"].regions, c1.seed, c0.assign, Object.assign({}, window.__req("resource-config").RESOURCE_DISTRIBUTION_CONFIG));
  check("same seed + same inputs reproduce the exact same distribution (auditable)", JSON.stringify(same2.assign) === JSON.stringify(c1.assign));
  for (const k of [KEY, "2026-11"]) {
    const vals = Object.values(store[cycPath(k)].countryValues), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
    check("T6 " + k + ": every country within the 10% tolerance (spread " + ((mx - mn) / mx * 100).toFixed(2) + "%)", (mx - mn) / mx <= 0.10 && store[cycPath(k)].stats.withinTolerance, store[cycPath(k)].stats);
  }
  const resSets = new Set(); Object.keys(c1.assign).forEach((id) => { if (id.startsWith("germany_")) resSets.add(c1.assign[id].r); });
  const tiers = window.__req("resource-config").TIER_OF, countByTier = {}; Object.values(c1.assign).forEach((x) => { countByTier[tiers[x.r]] = (countByTier[tiers[x.r]] || 0) + 1; });
  check("valuable resources are concentrated (very rare <= 4% of regions, rare <= 12%)", (countByTier.VERY_RARE || 0) <= 31 && (countByTier.RARE || 0) <= 93, countByTier);

  // T7 ownership: simulate a conquest, then generate another month
  store["rc_world/regions"].regions["germany_2"].ownerCountryId = "france"; RD.invalidateRegions();
  const conquered = ownersNow();
  await RD.ensureDistribution("2026-12");
  check("T7 ownership is NOT changed by a monthly redistribution (conquered region stays with its new owner)", JSON.stringify(ownersNow()) === JSON.stringify(conquered) && ownersNow().germany_2 === "france");
  check("T7 the new month balances the countries as they are now owned (france has 5 regions)", store[cycPath("2026-12")].stats.withinTolerance, store[cycPath("2026-12")].stats);

  // T8 production uses the new regional resource and flows into the country economy
  RD._resetCache();
  r1 = await call("getRegionResources", { countryId: "spain" }, "germany_0");
  const sp = r1.ok, spAssign = store[cycPath(KEY)].assign;
  check("T8 region view shows the resource/tier/production/owner of the current cycle", sp.regions.length === 4 && sp.regions.every((g) => g.resource === spAssign[g.id].r && g.tier && g.production > 0 && g.owner === "spain"), sp.regions);
  check("T8 country overview totals match its regions", Math.abs(sp.overview.totalPerHour - sp.regions.reduce((t, g) => t + g.production, 0)) < 0.6 && sp.overview.valuePerHour > 0, sp.overview);
  store["rc_countries/spain"] = Object.assign({}, store["rc_countries/spain"], { regionalLastAt: clock });
  const before = clone((store["rc_countries/spain"] || {}).resources || {});
  clock += 5 * HOUR; await call("getCountryState", {}, "spain_1");
  const after = (store["rc_countries/spain"] || {}).resources || {}, gained = {};
  Object.keys(sp.overview.perHour).forEach((rid) => { gained[rid] = (after[rid] || 0) - (before[rid] || 0); });
  check("T8 country gains regional production over time (5h x production per hour)", Object.keys(gained).every((rid) => Math.abs(gained[rid] - sp.overview.perHour[rid] * 5) <= 1.5), { gained, expected: sp.overview.perHour });
  const none = (store["rc_countries/spain"] || {}).regionalLastAt === clock; check("accrual timestamp advanced", none);

  // T9 occupation reduces production but keeps the resource
  const cfgR = window.__req("resource-config").RESOURCE_DISTRIBUTION_CONFIG, rgn = store["rc_world/regions"].regions["spain_1"], asg = spAssign["spain_1"];
  const base = RD.regionProduction(rgn, asg, cfgR);
  const occ = RD.regionProduction(Object.assign({}, rgn, { occupiedBy: "france", resistance: 0 }), asg, cfgR);
  const hot = RD.regionProduction(Object.assign({}, rgn, { occupiedBy: "france", resistance: 80 }), asg, cfgR);
  check("T9 occupied = 70%, high resistance = 50% of normal production", Math.abs(occ / base - 0.7) < 1e-9 && Math.abs(hot / base - 0.5) < 1e-9, [base, occ, hot]);
  store["rc_world/regions"].regions["spain_1"].occupiedBy = "france"; RD.invalidateRegions();
  r1 = await call("getRegionResources", { countryId: "spain" }, "germany_0");
  const gv = r1.ok.regions.find((g) => g.id === "spain_1");
  check("T9 occupied region still has its resource, only production drops", gv.resource === asg.r && gv.occupiedBy === "france" && gv.production < gv.baseProduction, gv);
  store["rc_world/regions"].regions["spain_1"].occupiedBy = null; RD.invalidateRegions();

  // T11/T12 restart + migration safety
  const snapCycles = JSON.stringify(Object.keys(store).filter((p) => p.startsWith("rc_resource_cycles/")).sort().map((p) => store[p]));
  RD._resetCache(); await call("getCountryState", {}, "spain_1"); await call("getRegionResources", {}, "spain_1");
  check("T11 repeated server restarts / requests never regenerate anything", JSON.stringify(Object.keys(store).filter((p) => p.startsWith("rc_resource_cycles/")).sort().map((p) => store[p])) === snapCycles);
  const regionOwners = JSON.stringify(ownersNow()), players = JSON.stringify(Object.keys(store).filter((p) => p.startsWith("rc_players/")).sort().map((p) => store[p].kingdomId));
  delete store["rc_world/regions"].regions["poland_3"]; RD.invalidateRegions();
  await RD.ensureRegions(); await RD.ensureRegions();
  check("T12 migration is idempotent: missing region recreated once, nothing duplicated", Object.keys(store["rc_world/regions"].regions).length === 780 && !!store["rc_world/regions"].regions["poland_3"]);
  check("T12 existing ownership and players are untouched by the migration", JSON.stringify(ownersNow()) === regionOwners && JSON.stringify(Object.keys(store).filter((p) => p.startsWith("rc_players/")).sort().map((p) => store[p].kingdomId)) === players && ownersNow().germany_2 === "france");

  // admin tools are closed to players and disabled by default
  r1 = await call("adminResourceDistribution", { op: "balance" }, "germany_0");
  check("admin tools: normal players are refused (ADMIN_ONLY)", r1.err === "ADMIN_ONLY", r1);
  store["rc_config/resources"] = { ADMIN_TOOLS_ENABLED: true, ADMIN_UIDS: ["germany_0"] };
  r1 = await call("adminResourceDistribution", { op: "balance" }, "germany_0");
  check("admin tools: enabled admin sees the balance table (value, resource count, rare count, diff %)", !!r1.ok && r1.ok.table.length === 195 && "diffPct" in r1.ok.table[0] && "rareCount" in r1.ok.table[0], r1.err);
  r1 = await call("adminResourceDistribution", { op: "regenerate", monthKey: KEY }, "germany_0");
  check("admin regenerate needs explicit confirmation", r1.err === "CONFIRM_REQUIRED", r1);
  delete store["rc_config/resources"];

  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})();
