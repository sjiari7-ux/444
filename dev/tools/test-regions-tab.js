#!/usr/bin/env node
"use strict";
/* Tests the Country > Regions tab renderer (js/ui.js renderRegionsTab): loading / error / the three lists. Usage: node tools/test-regions-tab.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ui = fs.readFileSync(path.join(__dirname, "../js/ui.js"), "utf8");
const i = ui.indexOf("function renderRegionsTab"), j = ui.indexOf("function renderEconomy", i);
if (i < 0 || j < 0) throw new Error("anchor missing");
const ctx = { S: {}, esc: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), resName: (r) => r[0].toUpperCase() + r.slice(1), MAP_TIER: { RARE: "Rare" },
  kingdomFlag: () => "", countryName: (id) => id.toUpperCase() };
vm.createContext(ctx); vm.runInContext(ui.slice(i, j), ctx);
let pass = 0, failn = 0;
const check = (n, c, x) => { c ? pass++ : failn++; console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  -> " + JSON.stringify(x))); };
const run = (T) => { ctx.S.territory = T; return vm.runInContext("renderRegionsTab()", ctx); };
check("loading state", /Loading regions/.test(run(null)) && /Loading regions/.test(run({ status: "loading" })));
check("error state offers a retry", /territory-refresh/.test(run({ status: "error", data: null })));
const h = run({ status: "ready", data: { own: [{ id: "a_1", name: "Alpha", resource: "iron", tier: "RARE" }], conquered: [{ id: "b_1", name: "Beta", origin: "spain", resource: null }], lost: [{ id: "a_2", name: "Gamma", owner: "germany" }, { id: "a_3", name: "Delta", owner: "italy" }] } });
check("summary counts: 2 held (1 own + 1 conquered), 2 lost", /holds <b>2<\/b> regions: 1 of its own and 1 taken/.test(h) && /<b>2<\/b> of its own are held by someone else/.test(h), h.slice(0, 400));
check("own region shows its resource and tier", /Alpha<\/b><small>Iron &middot; Rare/.test(h), h);
check("conquered region says where it came from; no-resource regions are labelled", /Beta<\/b><small>No resource &middot; originally SPAIN/.test(h), h);
check("lost regions say who holds them now", /Gamma<\/b>.*held by GERMANY/.test(h) && /Delta<\/b>.*held by ITALY/.test(h), h);
const e = run({ status: "ready", data: { own: [], conquered: [], lost: [] } });
check("empty lists show their own message", /You hold none of your original regions/.test(e) && /No region taken from another country yet/.test(e) && /No original region has been lost/.test(e));
console.log("\n" + pass + " passed, " + failn + " failed"); process.exit(failn ? 1 : 0);
