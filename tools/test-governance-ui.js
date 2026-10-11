#!/usr/bin/env node
"use strict";
/* Tests the Government screen (js/ui.js govAlerts / governancePanel) and the client helpers in js/storage.js
   (loadGovernance, refreshGovernance, claimLeadership, adoptServerRank) with the REAL code cut out of those files.
   Usage: node tools/test-governance-ui.js */
const fs = require("fs"), vm = require("vm"), path = require("path");
const J = (f) => fs.readFileSync(path.join(__dirname, "../js", f), "utf8");
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error("anchor missing: " + a); return s.slice(i, j); };
let pass = 0, failn = 0;
const check = (name, cond, extra) => { cond ? pass++ : failn++; console.log((cond ? "  ok   " : "  FAIL ") + name + (cond ? "" : "  -> " + JSON.stringify(extra))); };

const ui = J("ui.js"), st = J("storage.js");
const code = [J("config.js"), J("engine.js"),
  "function icon(){ return ''; }",
  between(ui, "function srvNow", "function resName"),                       // srvNow, dailyPanel (unused), fmtClock, countdown
  between(ui, "function govFor", "/* Citizenship box"),                     // THE governance UI under test
  between(st, "let _rankCheckAt", "async function saveCharacter"),          // adoptServerRank
  between(st, "// An empty seat can be claimed ONLY", "async function donateToKingdom"),   // claimLeadership, loadGovernance, refreshGovernance
  "globalThis.__t = { govFor, govAlerts, governancePanel, adoptServerRank, loadGovernance, refreshGovernance, claimLeadership, S: ()=>S };"].join("\n;\n");

const calls = [], toasts = [], views = { kingdom: 0, render: 0 };
let reply = null, rankDoc = null, rankReads = 0;
const ctx = {
  console, Math, JSON, Object, Array, Number, String, Set, Map, Date, isFinite, Promise, setTimeout, clearTimeout, document: {}, localStorage: {},
  S: { char: { kingdomId: "france", kingdomRole: "Officer", level: 20 }, screen: "kingdom", serverOffset: 0 },
  HAS_DB: true, MY_ID: "me", withTimeout: (p) => p,
  DB: { doc: () => ({ get: async () => { rankReads++; return { exists: !!rankDoc, data: () => rankDoc }; } }) },
  callFn: async (n, p) => { calls.push([n, p]); if (reply instanceof Error) throw reply; return typeof reply === "function" ? reply(p) : reply; },
  showToast: (m) => toasts.push(m), warErrorMsg: (e) => "ERR:" + e.message,
  loadCharacter: async () => ({ kingdomId: "france", kingdomRole: "Leader" }), migrateCharacter: () => {},
  loadKingdomView: () => { views.kingdom++; }, render: () => { views.render++; },
};
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(code, ctx);
const U = ctx.__t, S = ctx.S;
const NOW = 1_800_000_000_000, H = 3600000;
const K = { id: "france", leaderId: "lead" };
const base = (over) => Object.assign({ serverNow: NOW, countryId: "france", leaderId: "lead", termEndsAt: NOW + 20 * 86400000, election: null, lastElection: null, voteMinLevel: 11,
  me: { level: 20, isCandidate: false, votedFor: null, canNominate: false, canVote: false }, claimAllowed: false }, over || {});
const election = (phaseStartOffset, over) => Object.assign({ reason: "term", startedAt: NOW - phaseStartOffset, nominationEndsAt: NOW - phaseStartOffset + 24 * H, votingEndsAt: NOW - phaseStartOffset + 48 * H,
  candidates: [{ id: "a", name: "Alice", level: 30, votes: 2 }, { id: "me", name: "Me", level: 20, votes: 1 }], totalVotes: 3 }, over || {});
const setGov = (g) => { S.gov = g; S.serverOffset = g.serverNow - Date.now(); };
const tick = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  console.log("banner on the country screen");
  setGov(base({ election: election(2 * H, { phase: "nomination" }), me: { level: 20, canNominate: true } }));
  let h = U.govAlerts(S.char, K, false);
  check("election open -> 'Election in progress' with a button to the Government tab", /Election in progress/.test(h) && /data-tab="government"/.test(h) && !/claim-leadership/.test(h), h);
  setGov(base({ leaderId: null, claimAllowed: true }));
  h = U.govAlerts(S.char, { id: "france", leaderId: null }, true);
  check("vacant + nobody can hold a vote -> the Claim button", /claim-leadership/.test(h) && /Leadership is vacant/.test(h), h);
  setGov(base({ leaderId: null, claimAllowed: false }));
  h = U.govAlerts(S.char, { id: "france", leaderId: null }, true);
  check("vacant but a real vote is possible -> NO claim button", h === "", h);
  S.gov = null;
  h = U.govAlerts(S.char, { id: "france", leaderId: null }, true);
  check("server unreachable + vacant -> Claim button still shown (the server will refuse if it must)", /claim-leadership/.test(h), h);
  setGov(base());
  check("normal times -> no banner", U.govAlerts(S.char, K, false) === "");
  S.gov = base({ countryId: "spain" });
  check("governance data of ANOTHER country is ignored", U.govFor(K) === null);

  console.log("Government tab, no election");
  setGov(base());
  h = U.governancePanel(S.char, { kingdom: K });
  check("shows the term countdown and the 24 h + 24 h rule", /term ends in/.test(h) && /24 h/.test(h) && /data-countdown/.test(h), h);
  setGov(base({ lastElection: { kind: "new", winnerName: "Alice", votes: 5 } }));
  check("shows the last result", /Alice<\/b> won with 5 votes/.test(U.governancePanel(S.char, { kingdom: K })));

  console.log("Government tab, registration phase");
  setGov(base({ election: election(2 * H, { phase: "nomination" }), me: { level: 20, canNominate: true } }));
  h = U.governancePanel(S.char, { kingdom: K });
  check("'Run for Leader' button, candidates listed, NO vote buttons", /data-action="gov-nominate"/.test(h) && /Alice/.test(h) && !/data-action="gov-vote"/.test(h) && /Registration closes in/.test(h), h);
  setGov(base({ election: election(2 * H, { phase: "nomination" }), me: { level: 20, isCandidate: true } }));
  h = U.governancePanel(S.char, { kingdom: K });
  check("already registered -> no button, a note instead", !/gov-nominate/.test(h) && /registered as a candidate/.test(h), h);

  console.log("Government tab, voting phase");
  setGov(base({ election: election(30 * H, { phase: "voting" }), me: { level: 20, canVote: true } }));
  h = U.governancePanel(S.char, { kingdom: K });
  check("one Vote button per candidate, live counts, countdown to the end", (h.match(/data-action="gov-vote"/g) || []).length === 2 && /2 votes/.test(h) && /1 vote\b/.test(h) && /Voting ends in/.test(h), h);
  check("registration button is gone during voting", !/gov-nominate/.test(h));
  setGov(base({ election: election(30 * H, { phase: "voting" }), me: { level: 20, votedFor: "a", canVote: false } }));
  h = U.governancePanel(S.char, { kingdom: K });
  check("after voting: no vote buttons, 'your vote' marked on the candidate", !/gov-vote/.test(h) && /your vote/.test(h), h);
  setGov(base({ election: election(30 * H, { phase: "voting" }), me: { level: 8, canVote: false } }));
  h = U.governancePanel(S.char, { kingdom: K });
  check("level 8: no vote buttons, told that level 11 is needed", !/gov-vote/.test(h) && /need level 11 to vote/.test(h), h);
  check("the freeze is explained", /cannot hand over leadership, change ranks, remove citizens or declare war/.test(h));
  setGov(base({ election: election(10 * H, { phase: "nomination", candidates: [{ id: "x", name: "<b>x</b>", level: 3, votes: 0 }] }) }));
  { const e = U.governancePanel(S.char, { kingdom: K });
    check("names are escaped (no HTML injection)", e.includes("&lt;b&gt;x&lt;/b&gt;") && !e.includes("<b>x</b>"), e); }

  console.log("client helpers");
  calls.length = 0; reply = base({ serverNow: NOW + 5000 });
  await U.loadGovernance();
  check("loadGovernance asks getGovernance, stores it, follows SERVER time", calls[0][0] === "getGovernance" && S.gov.serverNow === NOW + 5000 && Math.abs(S.serverOffset - (NOW + 5000 - Date.now())) < 50, [calls, S.serverOffset]);
  const before = S.gov; reply = new Error("boom"); const errs = console.error; console.error = () => {};
  const g = await U.loadGovernance(); console.error = errs;
  check("a failing server call keeps the previous data (no crash)", g === before, g);
  S.char.kingdomId = null; check("no country -> nothing to load", (await U.loadGovernance()) === null && S.gov === null); S.char.kingdomId = "france";

  reply = base({ election: election(2 * H, { phase: "nomination" }) }); setGov(base({ election: null })); views.kingdom = views.render = 0;
  await U.refreshGovernance();
  check("refresh: an election appeared -> the whole Kingdom view reloads", views.kingdom === 1, views);
  views.kingdom = views.render = 0; const same = base({ election: election(2 * H, { phase: "nomination" }) }); setGov(same); reply = same;
  await U.refreshGovernance();
  check("refresh: nothing changed -> just a re-render", views.kingdom === 0 && views.render === 1, views);

  calls.length = 0; toasts.length = 0; reply = { countryId: "france" };
  await U.claimLeadership();
  check("claimLeadership goes through the SERVER function (no direct database write)", calls[0][0] === "claimLeadership" && toasts.includes("You are now the Leader."), [calls, toasts]);
  toasts.length = 0; reply = Object.assign(new Error("ELECTION_REQUIRED"), { message: "ELECTION_REQUIRED" });
  await U.claimLeadership();
  check("a refused claim shows the server's reason", toasts.includes("ERR:ELECTION_REQUIRED") && !toasts.includes("You are now the Leader."), toasts);

  console.log("a stale device must not undo the server's decision on the next save");
  const c = { kingdomId: "france", kingdomRole: "Officer" };
  rankDoc = { kingdomId: "france", kingdomRole: "Member" }; rankReads = 0;
  await U.adoptServerRank(c);
  check("dismissed Officer: the device adopts 'Member' from its own doc before saving", c.kingdomRole === "Member" && rankReads === 1, [c, rankReads]);
  c.kingdomRole = "Officer"; await U.adoptServerRank(c);
  check("at most one extra read per minute", rankReads === 1, rankReads);
  const c2 = { kingdomId: "spain", kingdomRole: "Leader" }; ctx.Date = Date; vm.runInContext("_rankCheckAt = 0;", ctx);
  rankDoc = { kingdomId: "france", kingdomRole: "Member" };
  await U.adoptServerRank(c2);
  check("a citizenship change in progress (different country) is left alone", c2.kingdomRole === "Leader", c2);

  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})();
