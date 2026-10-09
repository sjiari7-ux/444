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
})();
