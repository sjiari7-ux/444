#!/usr/bin/env node
"use strict";
/* Tests the Country > Regions tab renderer (js/ui.js renderRegionsTab): loading / error / the three lists. Usage: node tools/test-regions-tab.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ui = fs.readFileSync(path.join(__dirname, "../js/ui.js"), "utf8");
const i = ui.indexOf("function renderRegionsTab"), j = ui.indexOf("function renderEconomy", i);
if (i < 0 || j < 0) throw new Error("anchor missing");
const ctx = { S: {}, esc: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), resName: (r) => r[0].toUpperCase() + r.slice(1), MAP_TIER: { RARE: "Rare" },
  kingdomFlag: () => "", resourceIcon: () => "<svg></svg>", icon: () => "<svg></svg>", countryName: (id) => id.toUpperCase() };
vm.createContext(ctx); vm.runInContext(ui.slice(i, j), ctx);
let pass = 0, failn = 0;
const check = (n, c, x) => { c ? pass++ : failn++; console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  -> " + JSON.stringify(x))); };
const run = (T) => { ctx.S.territory = T; return vm.runInContext("renderRegionsTab()", ctx); };
check("loading state", /Loading regions/.test(run(null)) && /Loading regions/.test(run({ status: "loading" })));
check("error state offers a retry", /territory-refresh/.test(run({ status: "error", data: null })));
ctx.S.regionsFilter = "all";
const h = run({ status: "ready", data: { own: [{ id: "a_1", name: "Alpha", resource: "iron", tier: "RARE" }], conquered: [{ id: "b_1", name: "Beta", origin: "spain", resource: null }], lost: [{ id: "a_2", name: "Gamma", owner: "germany" }, { id: "a_3", name: "Delta", owner: "italy" }] } });
check("summary counts: 2 held (1 own + 1 conquered), 2 lost", /holds <b>2<\/b> regions: 1 of its own and 1 taken/.test(h) && /<b>2<\/b> of its own are held by someone else/.test(h), h.slice(0, 400));
check("own region shows its resource and tier", /Alpha<\/b><small>Iron &middot; <em class="rg-tier t-RARE">Rare<\/em>/.test(h), h);
check("conquered region says where it came from; no-resource regions are labelled", /Beta<\/b><small>No resource<\/small><span class="rg-from">originally SPAIN/.test(h), h);
check("lost regions say who holds them now", /Gamma<\/b>.*held by GERMANY/.test(h) && /Delta<\/b>.*held by ITALY/.test(h), h);
check("stats strip and production chips", /<div class="rg-stats">/.test(h) && /rg-chip">.*Iron &times;1/.test(h), h);
check("filter chips, Frontline chip hidden when no region is on the front", /data-f="own"/.test(h) && /data-f="lost"/.test(h) && !/data-f="frontline"/.test(h));
ctx.S.regionsFilter = "lost"; const hl = run({ status: "ready", data: { own: [{ id: "a_1", name: "Alpha", resource: "iron", tier: "RARE" }], conquered: [], lost: [{ id: "a_2", name: "Gamma", owner: "germany" }] } });
check("Lost tab shows only the lost regions", /Gamma/.test(hl) && /rg-card lost/.test(hl) && !/Alpha/.test(hl) && !/rg-card own/.test(hl) && !/LOST REGIONS/.test(hl), hl);
delete ctx.S.regionsFilter; const hd = run({ status: "ready", data: { own: [{ id: "a_1", name: "Alpha", resource: "iron", tier: "RARE" }], conquered: [{ id: "b_1", name: "Beta", origin: "spain", resource: "wood" }], lost: [] } });
check("default tab is Ours: conquered cards are one tap away, own ones are shown", /rg-tabs/.test(hd) && /data-f="own"[^>]*>Ours <span>1<\/span>/.test(hd) && /rg-card own/.test(hd) && !/Beta/.test(hd), hd);
const hc = (ctx.S.regionsFilter = "conquered", run({ status: "ready", data: { own: [], conquered: [{ id: "b_1", name: "Beta", origin: "spain", resource: "wood" }], lost: [] } }));
check("conquered cards carry the Conquered badge and a resource colour class", /rg-badge">Conquered/.test(hc) && /rg-ic r-wood/.test(hc), hc);
ctx.S.regionsFilter = "frontline"; const hf = run({ status: "ready", data: { own: [{ id: "a_1", name: "Alpha", resource: "iron", frontline: true }, { id: "a_9", name: "Inner", resource: "wood" }], conquered: [], lost: [] } });
check("Frontline filter keeps only regions on the front and shows the badge", /Alpha/.test(hf) && !/Inner/.test(hf) && /rg-front/.test(hf), hf);
ctx.S.regionsFilter = "all";
check("conquered region shows how long it has been held", /Held for 3 day/.test(run({ status: "ready", data: { own: [], conquered: [{ id: "b_1", name: "Beta", origin: "spain", resource: "iron", since: Date.now() - 3.2 * 86400000 }], lost: [] } })));
const e = run({ status: "ready", data: { own: [], conquered: [], lost: [] } });
check("empty lists show their own message", /You hold none of your original regions/.test(e) && /No region taken from another country yet/.test(e) && /No original region has been lost\. Your borders hold/.test(e));
console.log("\n" + pass + " passed, " + failn + " failed"); process.exit(failn ? 1 : 0);
