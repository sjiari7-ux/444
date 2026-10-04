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

  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})();
