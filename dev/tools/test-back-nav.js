#!/usr/bin/env node
"use strict";
/* Tests the phone / browser BACK button logic (setScreen in js/ui.js + the popstate handler in js/main.js) with a fake history. Usage: node tools/test-back-nav.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ui = fs.readFileSync(path.join(__dirname, "../js/ui.js"), "utf8"), main = fs.readFileSync(path.join(__dirname, "../js/main.js"), "utf8");
const a = ui.indexOf("const NAV_REPLACE"), b = ui.indexOf("async function persist()", a);
const c = main.indexOf("window.addEventListener('popstate'");
if (a < 0 || b < 0 || c < 0) throw new Error("anchor missing");
let pass = 0, failn = 0;
const check = (n, ok, x) => { ok ? pass++ : failn++; console.log((ok ? "  ok   " : "  FAIL ") + n + (ok ? "" : "  -> " + JSON.stringify(x))); };

function makeEnv() {
  const hist = { list: [null], i: 0 }, listeners = {}, calls = [];
  const fire = () => listeners.popstate({ state: hist.list[hist.i] });
  const history = {
    pushState(s) { hist.list = hist.list.slice(0, hist.i + 1); hist.list.push(JSON.parse(JSON.stringify(s))); hist.i++; },
    replaceState(s) { hist.list[hist.i] = JSON.parse(JSON.stringify(s)); },
    back() { if (hist.i > 0) { hist.i--; fire(); } },
    forward() { if (hist.i < hist.list.length - 1) { hist.i++; fire(); } },
    get state() { return hist.list[hist.i]; }
  };
  const ctx = { S: { screen: "loading" }, history, setTimeout: () => 0, window: { addEventListener: (n, f) => { listeners[n] = f; }, scrollTo() {} }, NAV: hist, renders: 0, toasts: [], calls,
    render() { ctx.renders++; vm.runInContext("_navLast = navCtx()", ctx); }, showToast(m) { ctx.toasts.push(m); }, closeDialog() { ctx.S.dialog = null; calls.push("closeDialog"); } };
  for (const f of ["loadKingdomView", "loadCountryState", "loadMarketListings", "loadShop", "loadWorldWars", "loadRegionOwners", "loadRankingsView", "loadPlayerProfile", "loadCountryProfile"]) ctx[f] = (...x) => calls.push(f + (x.length ? "(" + x.join(",") + ")" : ""));
  vm.createContext(ctx);
  vm.runInContext(ui.slice(a, b), ctx);
  vm.runInContext(main.slice(c), ctx);
  ctx.back = () => history.back();
  ctx.go = (scr, patch) => { Object.assign(ctx.S, patch || {}); vm.runInContext("setScreen(" + JSON.stringify(scr) + ")", ctx); };
  return ctx;
}

console.log("history entries");
let E = makeEnv();
E.go("world");
check("loading -> world replaces the entry (no extra Back step)", E.NAV.list.length === 1 && E.NAV.list[0].screen === "world", E.NAV);
E.go("map"); E.go("market"); E.go("profile");
check("each screen change is a history entry", E.NAV.list.length === 4 && E.NAV.i === 3, E.NAV.list.map(x => x && x.screen));
E.go("profile");
check("opening the same screen again does not add an entry", E.NAV.list.length === 4);

console.log("Back goes to the previous screen");
E.back(); check("profile -> market", E.S.screen === "market", E.S.screen);
check("market data is reloaded", E.calls.includes("loadMarketListings"));
E.back(); check("market -> map", E.S.screen === "map" && E.calls.includes("loadRegionOwners(true)"), E.S.screen);
E.back(); check("map -> world", E.S.screen === "world", E.S.screen);
const before = E.S.screen; E.back();
check("at the first screen there is nothing to go back to (the browser leaves, the game does not break)", E.S.screen === before && E.NAV.i === 0);

console.log("context is restored");
E = makeEnv(); E.go("world"); E.go("kingdom", { kingdomTab: "overview" });
E.S.kingdomTab = "regions"; E.render();               // the player switches tab inside Kingdom (no history entry), then opens a citizen
E.go("player-view", { viewPlayerId: "p1", backScreen: "kingdom" }); E.calls.length = 0;
E.go("player-view", { viewPlayerId: "p2" });         // same screen, another player: no new entry
E.back();
check("Back from a player returns to Kingdom on the tab he was on", E.S.screen === "kingdom" && E.S.kingdomTab === "regions", [E.S.screen, E.S.kingdomTab]);
E = makeEnv(); E.go("world"); E.go("country-view", { viewCountryId: "fr" }); E.go("player-view", { viewPlayerId: "p9" });
E.back(); check("player -> the country page he came from, with the same country", E.S.screen === "country-view" && E.S.viewCountryId === "fr" && E.calls.includes("loadCountryProfile(fr)"), [E.S.screen, E.S.viewCountryId]);
E.back(); check("country -> world", E.S.screen === "world");

console.log("Back closes what is on top first");
E = makeEnv(); E.go("world"); E.go("market"); E.S.dialog = { title: "x" }; const n = E.NAV.list.length;
E.back(); check("an open dialog is closed and we stay on the same screen", E.S.screen === "market" && E.calls.includes("closeDialog"), E.S.screen);
E.S.navOpen = true; E.back(); check("the open menu is closed first", E.S.screen === "market" && E.S.navOpen === false);
E.S.shopPreview = "cover_royal"; E.back(); check("a shop preview is closed first", E.S.screen === "market" && E.S.shopPreview === null);
E.back(); check("then Back really goes back", E.S.screen === "world", E.S.screen);

console.log("fights and login are protected");
E = makeEnv(); E.go("world"); E.go("zone-detail"); E.go("combat");
check("combat is not a history entry of its own", E.NAV.list.length === 2 && E.NAV.list.every(x => x.screen !== "combat"), E.NAV.list.map(x => x && x.screen));
E.back(); check("Back during a fight does not leave it", E.S.screen === "combat" && E.toasts.length === 1, [E.S.screen, E.toasts]);
E = makeEnv(); E.go("login"); E.go("create"); E.go("world");
check("login / create / world share ONE entry, so Back can never return to the login form", E.NAV.list.length === 1 && E.NAV.list[0].screen === "world", E.NAV.list);
console.log("\n" + pass + " passed, " + failn + " failed"); process.exit(failn ? 1 : 0);
