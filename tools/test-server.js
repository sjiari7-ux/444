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
const WRG = window.__req("world-regions").WORLD_REGIONS, regionsOfCountry = (c) => WRG.filter((w) => w.countryId === c).length;
const DAY = 86400000, HOUR = 3600000;
const RD = window.__req("resource-distribution"), RCFG = window.__req("resource-config"), WAR = window.__req("war");
let pass = 0, failn = 0;
const check = (name, cond, extra) => { cond ? pass++ : failn++; console.log((cond ? "  ok   " : "  FAIL ") + name + (cond ? "" : "  -> " + JSON.stringify(extra))); };
const char = (o) => Object.assign({ class: "warrior", level: 5, gold: 100, energyCur: 50, lastEnergyAt: clock, classSkills: {}, generalSkills: { stamina: 2 }, equipment: {}, buffs: [], updatedAt: clock }, o);
const lastChat = (cid) => { const c = store["rc_kingdoms/" + cid].chat || []; return c.length ? c[c.length - 1] : null; };
const chatTexts = (cid) => (store["rc_kingdoms/" + cid].chat || []).map((m) => m.text);
const addCitizens = (cid, n, leader) => { for (let i = 0; i < n; i++) { const id = `${cid}_${i}`; store["rc_players/" + id] = char({ username: id, kingdomId: cid, kingdomRole: i === 0 ? "Leader" : "Member", level: 10 - i, kingdomJoinedAt: 1000 + i }); } store["rc_kingdoms/" + cid] = { id: cid, leaderId: `${cid}_0`, chat: [], treasury: {} }; };

(async () => {
  // Region-targeted wars: the attacker picks a REGION, the defender is the region's CURRENT owner.
  const cyc0 = await RD.ensureDistribution(), regs0 = await RD.ensureRegions();
  const regValue = (id) => { const a = cyc0.assign[id]; return RD.regionProduction(regs0[id], a, RCFG.RESOURCE_DISTRIBUTION_CONFIG) * RCFG.RESOURCE_VALUES[a.r]; };
  const franceIds = ["france_1", "france_2", "france_3", "france_4"].sort((x, y) => regValue(x) - regValue(y));
  const TARGET = franceIds[0], MOST_VALUABLE = franceIds[franceIds.length - 1];      // fight over the LEAST valuable region: a capture of the best one would prove nothing
  console.log("1. region wars: declaration rules (no minimum number of players)");
  let r;
  addCitizens("germany", 3); addCitizens("france", 3);
  r = await call("declareWar", { targetCountryId: "france" }, "germany_0");
  check("R1 the old country-targeted call is refused (REGION_REQUIRED), no war is created", r.err === "REGION_REQUIRED" && !Object.keys(store).some((k) => k.startsWith("rc_wars/")), r);
  r = await call("declareWar", { targetRegionId: "nowhere_9" }, "germany_0");
  check("R1 unknown region -> INVALID_REGION", r.err === "INVALID_REGION", r);
  r = await call("declareWar", { targetRegionId: "../rc_players/x" }, "germany_0");
  check("R1 malformed region id (path injection) -> INVALID_REGION", r.err === "INVALID_REGION", r);
  r = await call("declareWar", { targetRegionId: "germany_1" }, "germany_0");
  check("R1 attacking a region your own country owns -> OWN_REGION", r.err === "OWN_REGION", r);
  r = await call("declareWar", { targetRegionId: TARGET }, "germany_2");
  check("R10 only the Leader can declare (NOT_LEADER)", r.err === "NOT_LEADER", r);
  r = await call("declareWar", { targetRegionId: TARGET, targetCountryId: "spain", defenderCountryId: "spain" }, "germany_0");
  check("R1 war declared over the targeted region", !!(r.ok && r.ok.warId) && r.ok.targetRegionId === TARGET, r);
  const warId = r.ok && r.ok.warId;
  check("R2 the defender is the region's CURRENT owner (france); a client-supplied country is ignored", store["rc_wars/" + warId].defenderCountryId === "france" && store["rc_wars/" + warId].attackerCountryId === "germany", store["rc_wars/" + warId]);
  check("R2 the war stores its target region (id + name) for display", store["rc_wars/" + warId].targetRegionId === TARGET && store["rc_wars/" + warId].targetRegionName === regs0[TARGET].name, store["rc_wars/" + warId]);
  check("R5 the region is reserved by this war (lock doc)", store["rc_regionWars/" + TARGET] && store["rc_regionWars/" + TARGET].active === true && store["rc_regionWars/" + TARGET].warId === warId, store["rc_regionWars/" + TARGET]);
  r = await call("declareWar", { targetRegionId: TARGET }, "germany_0");
  check("R5 a second war on the same region is rejected while the first is unresolved", r.err === "REGION_ALREADY_TARGETED", r);
  check("R5 the reserved region is flagged in the region view", ((await call("getRegionResources", { countryId: "france" }, "germany_0")).ok.regions.find((g) => g.id === TARGET) || {}).reservedByWarId === warId);
  // the attacker (germany) out-damages france in both rounds -> wins 2-0; the defender never strikes
  const dmgDoc = { damage: { germany: 900 }, contrib: { germany_0: 900 }, members: { germany_0: "germany" } };
  store["rc_wars/" + warId + "/rounds/1"] = clone(dmgDoc); store["rc_wars/" + warId + "/rounds/2"] = clone(dmgDoc);

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
  check("R3 announcements name the target region", chatTexts("france").some((t) => t.indexOf("over " + regs0[TARGET].name) >= 0), chatTexts("france"));
  const winner = wf.winnerCountryId, loser = wf.loserCountryId;
  // Phase 2: the old War Tax is gone, a victory has a TERRITORIAL consequence instead
  r = await call("chooseWarReward", { warId, resourceId: "iron", rate: 10 }, winner + "_0");
  check("P2 old war tax: chooseWarReward no longer exists", r.err === "UNKNOWN_FUNCTION", r);
  check("P2 war has no reward / war tax fields any more", wf.reward === undefined && wf.selectedResource === undefined && wf.warTaxRate === undefined, wf);
  const terr = store["rc_wars/" + warId].territory;
  check("P2 winner captured one region of the loser", terr && terr.status === "captured" && terr.toCountryId === winner && terr.fromCountryId === loser, terr);
  check("R3 the region captured is EXACTLY the targeted one (not the loser's most valuable region)", terr.regionId === TARGET && TARGET !== MOST_VALUABLE && store["rc_world/regions"].regions[MOST_VALUABLE].ownerCountryId === "france", { terr, TARGET, MOST_VALUABLE });
  check("R3 the loser's other regions are untouched", franceIds.filter((id) => id !== TARGET).every((id) => store["rc_world/regions"].regions[id].ownerCountryId === "france"));
  check("R3 the region keeps its resource identity / production setup (no field other than ownership + occupation changed)", ["geo", "stability", "infrastructure", "development", "name"].every((k) => store["rc_world/regions"].regions[TARGET][k] === regs0[TARGET][k]));
  check("R5 the reservation is released after settlement", store["rc_regionWars/" + TARGET].active === false);
  const capRegion = store["rc_world/regions"].regions[terr.regionId];
  check("P2 region ownership changed to the winner and occupation cleared", capRegion.ownerCountryId === winner && capRegion.occupiedBy === null, capRegion);
  check("P2 conquest announced to both countries", [winner, loser].every((c) => chatTexts(c).some((t) => /captured the region/.test(t))), [chatTexts(winner), chatTexts(loser)]);
  check("P2 no player nationality / citizenship changed by the conquest", [0, 1, 2].every((i) => store["rc_players/" + loser + "_" + i].kingdomId === loser && store["rc_players/" + winner + "_" + i].kingdomId === winner));
  check("P2 country docs carry no war tax state", ["rc_countries/" + winner, "rc_countries/" + loser].every((k) => !store[k] || (store[k].warTaxOut === undefined && store[k].warTaxIn === undefined && store[k].pendingReward === undefined)));
  const wallet = (id) => JSON.stringify([store["rc_players/" + id].gold, store["rc_players/" + id].resourceBag]);
  const walletBefore = wallet(winner + "_0") + wallet(loser + "_0");
  globalThis.__capture = { warId, winner, loser, terr, walletBefore };

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
  const KEY = RD.monthKeyOf(clock), cycPath = (k) => "rc_resource_cycles/" + k;
  const cycleDocs = (k) => Object.keys(store).filter((p) => p === cycPath(k));
  const ownersNow = () => { const o = {}, rg = store["rc_world/regions"].regions; Object.keys(rg).sort().forEach((id) => { o[id] = rg[id].ownerCountryId; }); return o; };
  // earlier tests already opened country pages, which lazily generate the month -> prove it, then test the service directly
  check("T1 a distribution exists for the current month (generated lazily, complete)", !!store[cycPath(KEY)] && store[cycPath(KEY)].status === "complete" && typeof store[cycPath(KEY)].seed === "number", Object.keys(store).filter((p) => p.startsWith("rc_resource")));
  const c0 = clone(store[cycPath(KEY)]);
  check("T1 every region of the world map got a resource (" + WRG.length + " regions)", Object.keys(c0.assign).length === WRG.length, Object.keys(c0.assign).length);
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
    const stt = store[cycPath(k)].stats, spreadK = (stt.max - stt.min) / stt.max;   // countries own 1..6 real regions: what is balanced is the MEAN value per region
    check("T6 " + k + ": mean value per region within the 10% tolerance for every country (spread " + (spreadK * 100).toFixed(2) + "%)", spreadK <= 0.10 && stt.withinTolerance, stt);
  }
  const resSets = new Set(); Object.keys(c1.assign).forEach((id) => { if (id.startsWith("germany_")) resSets.add(c1.assign[id].r); });
  const tiers = window.__req("resource-config").TIER_OF, countByTier = {}; Object.values(c1.assign).forEach((x) => { countByTier[tiers[x.r]] = (countByTier[tiers[x.r]] || 0) + 1; });
  check("valuable resources are concentrated (very rare <= 4% of regions, rare <= 12%)", (countByTier.VERY_RARE || 0) <= 31 && (countByTier.RARE || 0) <= 93, countByTier);

  // T7 ownership: simulate a conquest, then generate another month
  RD.invalidateRegions();
  const conquered = ownersNow();
  await RD.ensureDistribution("2026-12");
  check("T7 ownership is NOT changed by a monthly redistribution (conquered region stays with its new owner)", JSON.stringify(ownersNow()) === JSON.stringify(conquered) && ownersNow()[globalThis.__capture.terr.regionId] === globalThis.__capture.winner);
  check("T7 the new month balances the countries as they are now owned (the war winner has 5 regions)", store[cycPath("2026-12")].stats.withinTolerance, store[cycPath("2026-12")].stats);

  // T8 production uses the new regional resource and flows into the country economy
  RD._resetCache();
  r1 = await call("getRegionResources", { countryId: "spain" }, "germany_0");
  const sp = r1.ok, spAssign = store[cycPath(KEY)].assign;
  check("T8 region view shows the resource/tier/production/owner of the current cycle", sp.regions.length === regionsOfCountry("spain") && sp.regions.every((g) => g.resource === spAssign[g.id].r && g.tier && g.production > 0 && g.owner === "spain"), sp.regions);
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
  check("T12 migration is idempotent: missing region recreated once, nothing duplicated", Object.keys(store["rc_world/regions"].regions).length === window.__req("world-regions").WORLD_REGIONS.length && !!store["rc_world/regions"].regions["poland_3"]);
  check("T12 existing ownership and players are untouched by the migration", JSON.stringify(ownersNow()) === regionOwners && JSON.stringify(Object.keys(store).filter((p) => p.startsWith("rc_players/")).sort().map((p) => store[p].kingdomId)) === players && ownersNow()[globalThis.__capture.terr.regionId] === globalThis.__capture.winner);

  // admin tools are closed to players and disabled by default
  r1 = await call("adminResourceDistribution", { op: "balance" }, "germany_0");
  check("admin tools: normal players are refused (ADMIN_ONLY)", r1.err === "ADMIN_ONLY", r1);
  store["rc_config/resources"] = { ADMIN_TOOLS_ENABLED: true, ADMIN_UIDS: ["germany_0"] };
  r1 = await call("adminResourceDistribution", { op: "balance" }, "germany_0");
  check("admin tools: enabled admin sees the balance table (value, resource count, rare count, diff %)", !!r1.ok && r1.ok.table.length === 195 && "diffPct" in r1.ok.table[0] && "rareCount" in r1.ok.table[0], r1.err);
  r1 = await call("adminResourceDistribution", { op: "regenerate", monthKey: KEY }, "germany_0");
  check("admin regenerate needs explicit confirmation", r1.err === "CONFIRM_REQUIRED", r1);
  delete store["rc_config/resources"];

  // ---- Phase 1: National PvE Tax (3 decimals, nationality based, no carry) ----
  const WC = window.__req("war-core"), EC = window.__req("economy");
  check("P1 round3: 10.1574 -> 10.157 / 10.1576 -> 10.158", WC.round3(10.1574) === 10.157 && WC.round3(10.1576) === 10.158);
  let p1a = WC.splitPvE({ gross: 10.35, taxPct: 10 });
  check("P1 tax: 10.350 @10% = 1.035 tax / 9.315 player", p1a.tax === 1.035 && p1a.player === 9.315, p1a);
  p1a = WC.splitPvE({ gross: 10.157, taxPct: 10 });
  check("P1 tax: 10.157 @10% = 1.016 tax / 9.141 player", p1a.tax === 1.016 && p1a.player === 9.141, p1a);
  p1a = WC.splitPvE({ gross: 3, taxPct: 10 });
  check("P1 tax: small gains are not rounded to 0 or 1 (3 @10% = 0.300)", p1a.tax === 0.3 && p1a.player === 2.7, p1a);
  check("P1 nationality wins over citizenship/region", EC.nationalityOf({ nationality: "morocco", kingdomId: "spain" }) === "morocco");
  check("P1 legacy player without nationality falls back to kingdomId", EC.nationalityOf({ kingdomId: "spain" }) === "spain");
  const econ = { countryId: "morocco", country: { taxRate: 10 } };
  const ptx = EC.applyTaxToGains(econ, { nationality: "morocco" }, { wood: 10.35, iron: 2 }, clock);
  check("P1 applyTaxToGains: net + tax per resource, any resource is taxed", ptx.net.wood === 9.315 && ptx.countryInc.wood === 1.035 && ptx.net.iron === 1.8 && ptx.countryInc.iron === 0.2, ptx);
  store["rc_countries/morocco"] = { resources: { wood: 5 } };
  await db.runTransaction(async (t) => { EC.commitEconomy(t, econ, ptx); });
  check("P1 treasury receives exactly the tax (5 + 1.035)", store["rc_countries/morocco"].resources.wood === 6.035, store["rc_countries/morocco"]);
  check("P1 no leader/player wallet is credited by the tax commit", Object.keys(store).every((k) => !k.startsWith("rc_players/") || !("taxCarry" in store[k])));
  delete store["rc_countries/morocco"];

  // ---- Phase 2: territorial economy -> current owner's National Treasury (3 decimals) ----
  {
    const cap = globalThis.__capture, cfgR = window.__req("resource-config").RESOURCE_DISTRIBUTION_CONFIG;
    const cyc = await RD.ensureDistribution(null), regs = await RD.ensureRegions();
    const pw = RD.countryProduction(cap.winner, regs, cyc.assign, cfgR), pl = RD.countryProduction(cap.loser, regs, cyc.assign, cfgR);
    const a = cyc.assign[cap.terr.regionId], regionPerHour = RD.regionProduction(regs[cap.terr.regionId], a, cfgR);
    check("P2 captured region counts for the winner's production now, not the loser's", pw.perHour[a.r] >= Math.round(regionPerHour * 1000) / 1000 - 0.001 && regs[cap.terr.regionId].ownerCountryId === cap.winner);
    await RD.accrueRegionalProduction(cap.winner); await RD.accrueRegionalProduction(cap.loser);
    const res = (c) => Object.assign({}, (store["rc_countries/" + c] || {}).resources || {});
    const w0 = res(cap.winner), l0 = res(cap.loser);
    clock += 5 * HOUR + 1234;
    await RD.accrueRegionalProduction(cap.winner); await RD.accrueRegionalProduction(cap.loser);
    const w1 = res(cap.winner), l1 = res(cap.loser), r3 = (v) => Math.round(v * 1000) / 1000;
    const expect = (p, before, after) => Object.keys(p.perHour).every((k) => r3((after[k] || 0) - (before[k] || 0)) === r3(p.perHour[k] * (5 * HOUR + 1234) / HOUR));
    check("P2 winner's National Treasury gains exactly production x time (3 decimals, no floor)", expect(pw, w0, w1), { pw: pw.perHour, w0, w1 });
    check("P2 former owner is paid only for the regions it still owns", expect(pl, l0, l1), { pl: pl.perHour, l0, l1 });
    check("P2 treasury values keep at most 3 decimals", Object.values(w1).concat(Object.values(l1)).every((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6), { w1, l1 });
    check("P2 fractional production is NOT lost to integers (a non-whole amount arrived)", Object.keys(pw.perHour).some((k) => (w1[k] - (w0[k] || 0)) % 1 !== 0), { w0, w1 });
    check("P2 leader/player wallets are NOT credited by territorial production", (["_0"].map((x) => JSON.stringify([store["rc_players/" + cap.winner + x].gold, store["rc_players/" + cap.winner + x].resourceBag]) + JSON.stringify([store["rc_players/" + cap.loser + x].gold, store["rc_players/" + cap.loser + x].resourceBag])).join("")) === cap.walletBefore);
    const again = await window.__req("war").settleWarTerritory(cap.warId);
    check("P2 settling the same war twice never captures a second region", again && again.regionId === cap.terr.regionId && Object.keys(store["rc_world/regions"].regions).filter((id) => store["rc_world/regions"].regions[id].ownerCountryId === cap.winner).length === pw.regionCount);
  }

  // ---- Phase 3: end-to-end PvE (Road) -> National PvE Tax goes to the NATIONALITY country's treasury ----
  {
    store["rc_players/natguy"] = char({ username: "natguy", level: 12, energyCur: 100, kingdomId: "spain", nationality: "morocco", kingdomRole: "Member", resourceBag: { wood: 0, food: 0 } });
    store["rc_countries/morocco"] = { resources: {}, taxRate: 10 }; store["rc_countries/spain"] = { resources: {}, taxRate: 10 };
    let hit = null; const goldBefore = store["rc_players/natguy"].gold;
    for (let i = 0; i < 80 && !hit; i++) {
      store["rc_players/natguy"].energyCur = 100; store["rc_players/natguy"].lastEnergyAt = clock;
      const rr = await call("takeRoadStep", { zoneId: "plains" }, "natguy");
      if (rr.ok && rr.ok.event === "resource") hit = rr.ok;
    }
    const m = store["rc_countries/morocco"].resources, sp = store["rc_countries/spain"].resources, bag = store["rc_players/natguy"].resourceBag;
    const taxed = hit ? Math.round((hit.gross - hit.amount) * 1000) / 1000 : null;
    check("P3 PvE step produced a resource gain", !!hit, hit);
    check("P3 tax went to the NATIONALITY country (morocco), exactly gross x 10% (3 decimals)", hit && m[hit.resource] === Math.round(hit.gross * 100) / 1000 && taxed === m[hit.resource], { hit, m });
    check("P3 the citizenship/region country (spain) received no PvE tax", Object.values(sp).every((v) => !v), sp);
    check("P3 player kept exactly the net amount, in his bag", hit && bag[hit.resource] === hit.amount, { bag, hit });
    check("P3 PvE tax never touched the player's gold wallet or a leader wallet", store["rc_players/natguy"].gold >= goldBefore && !("taxCarry" in store["rc_players/natguy"]));
    check("P3 nationality persisted on the player and not changed", store["rc_players/natguy"].nationality === "morocco");
    store["rc_players/legacy"] = char({ username: "legacy", level: 12, energyCur: 100, kingdomId: "spain", resourceBag: {} });
    let lh = null;
    for (let i = 0; i < 80 && !lh; i++) { store["rc_players/legacy"].energyCur = 100; store["rc_players/legacy"].lastEnergyAt = clock; const rr = await call("takeRoadStep", { zoneId: "plains" }, "legacy"); if (rr.ok && rr.ok.event === "resource") lh = rr.ok; }
    check("P3 legacy player without nationality: taxed via citizenship, nationality saved", !!lh && store["rc_players/legacy"].nationality === "spain" && store["rc_countries/spain"].resources[lh.resource] > 0, store["rc_players/legacy"]);
  }

  // ---- Phase 4: region-targeted wars (third countries, held regions, races, legacy wars) ----
  console.log("7. region-targeted wars");
  {
    const cap = globalThis.__capture, R = cap.terr.regionId, regsNow = () => store["rc_world/regions"].regions;
    const ownersSnap = () => JSON.stringify(Object.keys(regsNow()).sort().map((id) => [id, regsNow()[id].ownerCountryId]));
    const winBy = (warId, cid, uid) => { const d = { damage: { [cid]: 900 }, contrib: { [uid]: 900 }, members: { [uid]: cid } }; store["rc_wars/" + warId + "/rounds/1"] = clone(d); store["rc_wars/" + warId + "/rounds/2"] = clone(d); };
    const play = async (uid) => { clock += 31 * 60000; await call("getCountryState", {}, uid); clock += 5 * HOUR + 1000; await call("getCountryState", {}, uid); clock += 5 * HOUR + 1000; await call("getCountryState", {}, uid); };
    check("R4 after the first war Region R belongs to germany (captured from france)", regsNow()[R].ownerCountryId === "germany" && regsNow()[R].countryId === "france", regsNow()[R]);

    // cooldowns / leader permissions keep working for a region war
    store["rc_countries/germany"].warCooldownUntil = clock + HOUR;
    let q = await call("declareWar", { targetRegionId: R }, "spain_2");
    check("R10 the post-war cooldown of the region's CURRENT owner still protects it (TARGET_COOLDOWN)", q.err === "TARGET_COOLDOWN" && q.details.countryId === "germany", q);
    q = await call("declareWar", { targetRegionId: R }, "spain_1");
    check("R10 a non-Leader of the attacking country is refused (NOT_LEADER)", q.err === "NOT_LEADER", q);
    clock += 25 * HOUR;

    // R4: a THIRD country attacks Region R -> the defender is germany (current owner), not france (historical owner)
    q = await call("declareWar", { targetRegionId: R }, "spain_2");
    check("R4 spain declares war on Region R", !!(q.ok && q.ok.warId), q);
    const w2id = q.ok.warId, w2 = store["rc_wars/" + w2id];
    check("R4 the new war is spain vs GERMANY (current owner), NOT spain vs france (historical owner)", w2.attackerCountryId === "spain" && w2.defenderCountryId === "germany" && w2.defenderCountryId !== "france", w2);
    check("R4 france is not dragged into the war", !store["rc_countries/france"].activeWarId && store["rc_countries/spain"].activeWarId === w2id && store["rc_countries/germany"].activeWarId === w2id);
    check("R4 the declaration is announced with the region", chatTexts("germany").some((x) => /Spain declared war on Germany over /.test(x) && x.indexOf(regsNow()[R].name) >= 0), chatTexts("germany"));
    q = await call("declareWar", { targetRegionId: R }, "italy_0");
    check("R5 while spain-germany is unresolved, nobody else can target Region R", q.err === "REGION_ALREADY_TARGETED", q);
    check("R5 the region view of its CURRENT owner shows it as reserved", ((await call("getRegionResources", { countryId: "germany" }, "germany_1")).ok.regions.find((g) => g.id === R) || {}).reservedByWarId === w2id);
    // spain wins; the capture is settled once and moves exactly R from germany to spain
    winBy(w2id, "spain", "spain_2");
    await play("spain_2");
    const w2f = store["rc_wars/" + w2id];
    check("R4 spain won the war", w2f.status === "finished" && w2f.winnerCountryId === "spain", w2f.status);
    check("R4 Region R passes germany -> spain; france (the historical owner) has no claim", w2f.territory.status === "captured" && w2f.territory.regionId === R && w2f.territory.fromCountryId === "germany" && w2f.territory.toCountryId === "spain" && regsNow()[R].ownerCountryId === "spain", w2f.territory);
    check("R4 the transfer is announced to both countries (who -> who)", [ "spain", "germany" ].every((c) => chatTexts(c).some((x) => /captured the region .* from Germany: control passes from Germany to Spain/.test(x))), chatTexts("spain"));
    check("R5 the lock is released and no second capture exists", store["rc_regionWars/" + R].active === false && Object.keys(regsNow()).filter((id) => regsNow()[id].ownerCountryId === "spain").length === regionsOfCountry("spain") + 1);

    // R7/R8: production before the change goes to the old owner, after it to the new owner
    {
      const cyc = await RD.ensureDistribution(null), regs = await RD.ensureRegions(), a = cyc.assign[R];
      const ps = RD.countryProduction("spain", regs, cyc.assign, RCFG.RESOURCE_DISTRIBUTION_CONFIG), pg = RD.countryProduction("germany", regs, cyc.assign, RCFG.RESOURCE_DISTRIBUTION_CONFIG);
      const regionPerHour = RD.regionProduction(regs[R], a, RCFG.RESOURCE_DISTRIBUTION_CONFIG), r3 = (v) => Math.round(v * 1000) / 1000;
      await RD.accrueRegionalProduction("spain"); await RD.accrueRegionalProduction("germany");
      const res = (c) => Object.assign({}, (store["rc_countries/" + c] || {}).resources || {});
      const s0 = res("spain"), g0 = res("germany");
      clock += 4 * HOUR + 777;
      await RD.accrueRegionalProduction("spain"); await RD.accrueRegionalProduction("germany");
      const s1 = res("spain"), g1 = res("germany"), el = 4 * HOUR + 777;
      const exp = (p, b, c) => Object.keys(p.perHour).every((k) => r3((c[k] || 0) - (b[k] || 0)) === r3(p.perHour[k] * el / HOUR));
      check("R7 spain's National Treasury now earns Region R's production (included in its per-hour total)", ps.perHour[a.r] >= r3(regionPerHour) - 0.001 && exp(ps, s0, s1), { ps: ps.perHour, s0, s1 });
      check("R8 germany earns nothing from Region R after the transfer (only its remaining regions)", exp(pg, g0, g1) && Object.keys(pg.perHour).length <= 4 + 1, { pg: pg.perHour, g0, g1 });
      check("R7 production never lands in a leader's wallet", [ "spain_2", "germany_1" ].every((u) => store["rc_players/" + u].resourceBag === undefined || Object.values(store["rc_players/" + u].resourceBag).every((v) => !v)));
    }
    // R6: a monthly redistribution never resets ownership (also after the second conquest)
    {
      const before = ownersSnap(); RD._resetCache();
      await RD.ensureDistribution("2027-03"); await RD.ensureDistribution("2027-04");
      check("R6 monthly redistribution does not reset region ownership (Region R stays with spain)", ownersSnap() === before && regsNow()[R].ownerCountryId === "spain");
    }

    // defender wins -> the region stays; nothing else is taken
    {
      addCitizens("poland", 3); store["rc_kingdoms/poland"].leaderId = "poland_0";
      const before = ownersSnap(), P2 = "poland_2";
      q = await call("declareWar", { targetRegionId: P2 }, "italy_0");
      check("R9 italy declares war on a poland region", !!(q.ok && q.ok.warId) && store["rc_wars/" + q.ok.warId].defenderCountryId === "poland", q);
      const hid = q.ok.warId; await play("italy_0");
      const hw = store["rc_wars/" + hid];
      check("R9 defender (poland) won with no damage dealt (existing tie-break unchanged)", hw.status === "finished" && hw.winnerCountryId === "poland", hw.status);
      check("R9 the defender's win leaves control of the region unchanged (explicit result, nothing captured)", hw.territory.status === "held" && hw.territory.regionId === P2 && ownersSnap() === before && store["rc_regionWars/" + P2].active === false, hw.territory);
      q = await call("declareWar", { targetRegionId: "poland_3" }, "italy_0");
      check("R10 both countries are in the post-war cooldown (COOLDOWN_ACTIVE)", q.err === "COOLDOWN_ACTIVE", q);
    }

    // protections: a country always keeps one region; legacy wars never invent a target; settlements never race
    {
      addCitizens("belgium", 3); addCitizens("sweden", 3);
      ["belgium_2", "belgium_3"].forEach((id) => { regsNow()[id].ownerCountryId = "portugal"; }); RD.invalidateRegions();
      // a country CAN lose its last region: sweden takes it, then belgium (0 regions) starts a war to win it back
      q = await call("declareWar", { targetRegionId: "belgium_1" }, "sweden_0");
      check("R11 a country's last region can be targeted", !!(q.ok && q.ok.warId), q);
      winBy(q.ok.warId, "sweden", "sweden_0"); await play("sweden_0");
      check("R11 sweden took belgium's last region: belgium now owns 0 regions", regsNow()["belgium_1"].ownerCountryId === "sweden" && Object.keys(regsNow()).every((id) => regsNow()[id].ownerCountryId !== "belgium"), store["rc_wars/" + q.ok.warId].territory);
      clock += 25 * HOUR;
      q = await call("declareWar", { targetRegionId: "belgium_1" }, "belgium_0");
      check("R11 belgium (0 regions) can declare war on the region sweden holds: defender = sweden", !!(q.ok && q.ok.warId) && store["rc_wars/" + q.ok.warId].defenderCountryId === "sweden", q);
      winBy(q.ok.warId, "belgium", "belgium_0"); await play("belgium_0");
      check("R11 belgium wins and takes its region back", regsNow()["belgium_1"].ownerCountryId === "belgium" && store["rc_wars/" + q.ok.warId].territory.status === "captured", store["rc_wars/" + q.ok.warId].territory);
      ["belgium_2", "belgium_3"].forEach((id) => { regsNow()[id].ownerCountryId = "belgium"; }); RD.invalidateRegions();

      const before = ownersSnap(), mk = (id, over) => { store["rc_wars/" + id] = Object.assign({ id, status: "finished", attackerCountryId: "sweden", defenderCountryId: "belgium", winnerCountryId: "sweden", loserCountryId: "belgium", finalScore: { sweden: 2, belgium: 0 }, rounds: [], endedAt: clock, cfg: {}, territory: { status: "pending" } }, over || {}); };
      mk("legacy1");
      let lt = await WAR.settleWarTerritory("legacy1");
      check("R7 a legacy war without a target region transfers NOTHING (explicit LEGACY_NO_TARGET result)", lt.status === "none" && lt.reason === "LEGACY_NO_TARGET" && ownersSnap() === before, lt);
      // two settlements racing for Region R: the lock belongs to ANOTHER war -> the second one must not capture it
      store["rc_regionWars/" + R] = { regionId: R, warId: "someone_else", active: true };
      mk("race1", { targetRegionId: R, targetRegionName: "R", defenderCountryId: "spain", loserCountryId: "spain" });
      lt = await WAR.settleWarTerritory("race1");
      check("R5 a settlement for a region reserved by another war captures nothing (REGION_NOT_RESERVED)", lt.status === "none" && lt.reason === "REGION_NOT_RESERVED" && regsNow()[R].ownerCountryId === "spain", lt);
      // stale defender: the region is no longer the defender's
      store["rc_regionWars/" + R] = { regionId: R, warId: "stale1", active: true };
      mk("stale1", { targetRegionId: R, targetRegionName: "R", defenderCountryId: "germany", loserCountryId: "germany" });
      lt = await WAR.settleWarTerritory("stale1");
      check("R3 a region that is no longer the defender's is NOT transferred and no other region is taken (OWNER_CHANGED)", lt.status === "none" && lt.reason === "OWNER_CHANGED" && ownersSnap() === before && store["rc_regionWars/" + R].active === false, lt);
      check("R3 the explicit non-capture result is announced", chatTexts("sweden").some((x) => /No region changed hands/.test(x)), chatTexts("sweden"));
    }

    // R12: no player minimum. A country with 0 players can be attacked; the attacker's strikes are uncontested.
    {
      store["rc_players/norway_0"] = char({ username: "norway_0", kingdomId: "norway", kingdomRole: "Leader", level: 10, generalSkills: { health: 0, damage: 0, defense: 0, stamina: 2 } }); store["rc_kingdoms/norway"] = { id: "norway", leaderId: "norway_0", chat: [], treasury: {} };
      q = await call("declareWar", { targetRegionId: "portugal_1" }, "norway_0");
      check("R12 a 1-player country attacks a country with 0 players (no minimum)", !!(q.ok && q.ok.warId) && store["rc_wars/" + q.ok.warId].defenderCountryId === "portugal", q);
      const zid = q.ok.warId; clock += 31 * 60000; await call("getCountryState", {}, "norway_0");
      let sr = await call("warStrike", {}, "norway_0");
      check("R12 strike against a country with no citizens is uncontested and deals damage", !!sr.ok && sr.ok.damage > 0, sr);
      clock += 5 * HOUR + 1000; await call("getCountryState", {}, "norway_0"); store["rc_players/norway_0"].energyCur = 50; store["rc_players/norway_0"].lastEnergyAt = clock;
      sr = await call("warStrike", {}, "norway_0");
      clock += 5 * HOUR + 1000; await call("getCountryState", {}, "norway_0");
      const zw = store["rc_wars/" + zid];
      check("R12 the attacker wins and takes the targeted region from the empty country", zw.status === "finished" && zw.winnerCountryId === "norway" && zw.territory.status === "captured" && regsNow()["portugal_1"].ownerCountryId === "norway", zw);
    }

    // history, nationality and the National PvE Tax are independent of territory
    {
      const st = (await call("getCountryState", {}, "germany_1")).ok;
      const h1 = st.history.find((h) => h.id === warId), h2 = st.history.find((h) => h.id === w2id);
      check("R10 war history keeps working and now carries the target region and the transfer", !!h1 && h1.targetRegionId === TARGET && h1.territory.status === "captured" && !!h2 && h2.targetRegionId === R && h2.territory.fromCountryId === "germany" && h2.territory.toCountryId === "spain", st.history);
      check("R10 world war list shows the target region", (await call("getWorldWars", {}, "germany_1")).ok.recent.some((w) => w.targetRegionName === regsNow()[R].name), 1);
      check("R9 no player's nationality or citizenship changed by any conquest", [0, 1, 2].every((i) => store["rc_players/spain_" + i].kingdomId === "spain" && store["rc_players/germany_" + i].kingdomId === "germany" && store["rc_players/france_" + i].kingdomId === "france"));
      store["rc_players/frguy"] = char({ username: "frguy", level: 12, energyCur: 100, kingdomId: "germany", nationality: "france", kingdomRole: "Member", resourceBag: {} });
      store["rc_countries/france"] = { resources: {}, taxRate: 10 }; store["rc_countries/germany"] = Object.assign({}, store["rc_countries/germany"], { resources: {}, taxRate: 10 });
      let hit = null;
      for (let i = 0; i < 80 && !hit; i++) { store["rc_players/frguy"].energyCur = 100; store["rc_players/frguy"].lastEnergyAt = clock; const rr = await call("takeRoadStep", { zoneId: "plains" }, "frguy"); if (rr.ok && rr.ok.event === "resource") hit = rr.ok; }
      const fr = store["rc_countries/france"].resources, ge = store["rc_countries/germany"].resources;
      check("R9 a French national living in germany still pays the National PvE Tax to FRANCE, though france lost a region", !!hit && fr[hit.resource] === Math.round(hit.gross * 100) / 1000 && Object.values(ge).every((v) => !v), { hit, fr, ge });
      check("R9 the player's nationality is unchanged by territory", store["rc_players/frguy"].nationality === "france");
    }
  }

  // R13: OPEN WARS — any player may fight in any live war, for either side, whatever his nationality.
  {
    console.log("R13. open wars: neutral players pick a side");
    const regsLive = store["rc_world/regions"].regions, usedC = new Set(["france", "germany", "spain", "italy", "poland", "sweden", "belgium", "portugal", "norway", "austria", "greece"]);
    const orid = Object.keys(regsLive).find((k) => regsLive[k].ownerCountryId && !usedC.has(regsLive[k].ownerCountryId)), dc = regsLive[orid].ownerCountryId;
    addCitizens("austria", 2); addCitizens(dc, 2); addCitizens("greece", 2);
    ["austria_0", "austria_1", dc + "_0", dc + "_1", "greece_0", "greece_1"].forEach((u) => { store["rc_players/" + u].generalSkills = { health: 0, damage: 0, defense: 0, stamina: 2 }; });
    const aq = await call("declareWar", { targetRegionId: orid }, "austria_0");
    check("R13 austria declares war on " + dc, !!(aq.ok && aq.ok.warId), aq);
    const owid = aq.ok && aq.ok.warId;
    clock += 31 * 60000; await call("getWorldWars", {}, "greece_0");
    const refill = (u) => { store["rc_players/" + u].energyCur = 50; store["rc_players/" + u].lastEnergyAt = clock; };
    ["greece_0", "greece_1", "austria_1", dc + "_0"].forEach(refill);
    let s = await call("warStrike", { warId: owid }, "greece_0");
    check("R13 a neutral citizen who names a war but no side gets SIDE_REQUIRED", s.err === "SIDE_REQUIRED", s);
    s = await call("warStrike", { warId: owid, side: "bogus" }, "greece_0");
    check("R13 an invalid side is rejected", s.err === "INVALID_SIDE", s);
    s = await call("warStrike", { warId: "nope", side: "attack" }, "greece_0");
    check("R13 an unknown war is rejected", s.err === "WAR_NOT_FOUND", s);
    s = await call("warStrike", { warId: owid, side: "attack" }, "greece_0");
    check("R13 a neutral citizen (greece) strikes for the ATTACKER; the opponent is a citizen of the defender", !!s.ok && s.ok.side === "attack" && s.ok.damage > 0 && new RegExp("^" + dc + "_").test(s.ok.target.name), s);
    const rd1 = store["rc_wars/" + owid + "/rounds/1"], wp0 = store["rc_warPlayers/" + owid + "_greece_0"];
    check("R13 his damage is counted for austria and he is listed on austria's side", rd1.damage.austria > 0 && rd1.members.greece_0 === "austria", rd1);
    check("R13 the war player doc keeps the fighting side and the real nationality", wp0.side === "attack" && wp0.countryId === "austria" && wp0.nat === "greece", wp0);
    s = await call("warStrike", { warId: owid, side: "attack" }, "greece_0");
    check("R13 no waiting period: an immediate second strike is accepted", !!s.ok && s.ok.damage > 0, s);
    clock += 11000; refill("greece_0");
    s = await call("warStrike", { warId: owid, side: "defend" }, "greece_0");
    check("R13 NO side lock: the same player may now strike for the OTHER side in the same war", !!s.ok && s.ok.side === "defend", s);
    const rdB = store["rc_wars/" + owid + "/rounds/1"];
    check("R13 his damage is split per country (contribBy) and the player total is the sum of both sides", rdB.contribBy.austria.greece_0 > 0 && rdB.contribBy[dc].greece_0 > 0 && rdB.contrib.greece_0 === rdB.contribBy.austria.greece_0 + rdB.contribBy[dc].greece_0, rdB.contribBy);
    check("R13 the round damage of each country includes what he dealt for it", rdB.damage.austria >= rdB.contribBy.austria.greece_0 && rdB.damage[dc] >= rdB.contribBy[dc].greece_0);
    s = await call("warStrike", { warId: owid, side: "defend" }, "greece_1");
    check("R13 another neutral citizen strikes for the DEFENDER; the opponent is an austrian citizen", !!s.ok && s.ok.side === "defend" && /^austria_/.test(s.ok.target.name), s);
    check("R13 defender damage is counted for the defending country", store["rc_wars/" + owid + "/rounds/1"].damage[dc] > 0 && store["rc_wars/" + owid + "/rounds/1"].members.greece_1 === dc);
    s = await call("warStrike", { warId: owid, side: "defend" }, "austria_1");
    check("R13 an austrian may fight AGAINST his own country (never himself as the opponent)", !!s.ok && s.ok.side === "defend" && s.ok.target.name === "austria_0", s);
    s = await call("warStrike", {}, dc + "_0");
    check("R13 a citizen of a warring country with no side still fights for his own country", !!s.ok && s.ok.side === "defend" && /^austria_/.test(s.ok.target.name), s);
    const ww = (await call("getWorldWars", {}, "greece_0")).ok, mw = ww.active.find((x) => x.id === owid);
    const liveR = (mw.rounds || []).find((r) => r.round === 1);
    check("R13 the war list carries the RUNNING round's live damage (bar moves before the round ends)", !!liveR && Number(liveR.damage[mw.attackerCountryId] || 0) === store["rc_wars/" + owid + "/rounds/1"].damage[mw.attackerCountryId] && Number(liveR.damage[mw.attackerCountryId]) > 0, liveR);
    check("R13 the war list carries the viewer's strikes and total damage (both sides)", !!mw && mw.me.strikes === 3 && mw.me.damage > 0 && mw.me.maxStrikes > 0, mw && mw.me);
    const ww2 = (await call("getWorldWars", {}, "greece_1")).ok.active.find((x) => x.id === owid);
    check("R13 a player who never fought has no side yet", ((await call("getWorldWars", {}, "austria_0")).ok.active.find((x) => x.id === owid).me || {}).side === null);
  }

  {   // a world saved with an OLDER map layout (no `layout` field) is replaced as a whole, and its stale month is regenerated for the new regions
    const wl = window.__req("world-regions");
    store["rc_world/regions"] = { regions: { france_9: { id: "france_9", countryId: "france", name: "Old Region", ownerCountryId: "spain" } }, version: 1 };
    delete store[cycPath(KEY)].layout; RD.invalidateRegions(); RD._resetCache();
    const fresh = await RD.ensureRegions(), cyc = await RD.ensureDistribution(KEY);
    check("T13 old-layout world replaced by the map's regions (ids, names, owners fresh)", Object.keys(fresh).length === wl.WORLD_REGIONS.length && !fresh.france_9 && fresh.france_1.name === "Brittany" && fresh.france_1.ownerCountryId === "france" && store["rc_world/regions"].layout === wl.WORLD_LAYOUT, Object.keys(fresh).length);
    check("T13 the stale month was regenerated for the new regions", cyc.layout === wl.WORLD_LAYOUT && Object.keys(cyc.assign).length === wl.WORLD_REGIONS.length && !!cyc.assign.france_1, Object.keys(cyc.assign || {}).length);
  }
  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})();
