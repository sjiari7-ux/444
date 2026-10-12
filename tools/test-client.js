#!/usr/bin/env node
"use strict";
/* Tests the pure client-side game rules (js/config.js + js/engine.js): leagues and the PvP rating formula.
   Usage: node tools/test-client.js */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = { console, Math, JSON, Object, Array, Number, String, Set, Map, Date, isFinite, window: {}, document: {}, localStorage: {} };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(["config.js", "engine.js"].map((f) => fs.readFileSync(path.join(__dirname, "../js", f), "utf8")).join("\n;\n") +
  "\n;globalThis.__t={LEAGUES,leagueOf,leagueProgress,pvpRatingChange,RATING_FLOOR,ELO_K,PVP_BOT_REWARD_MULT};", ctx);
const T = ctx.__t;
let pass = 0, fails = 0;
const check = (n, c, x) => { c ? pass++ : fails++; console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  -> " + JSON.stringify(x))); };

console.log("leagues");
const at = (r) => T.leagueOf(r).id;
check("new player (1000) is Bronze", at(1000) === "bronze");
check("1099 Bronze / 1100 Silver", at(1099) === "bronze" && at(1100) === "silver");
check("1299 Silver / 1300 Gold", at(1299) === "silver" && at(1300) === "gold");
check("1500 Platinum, 1700 Diamond, 2000 Champion", at(1500) === "platinum" && at(1700) === "diamond" && at(2000) === "champion");
check("rating floor (100) and nonsense input stay Bronze", at(100) === "bronze" && at(undefined) === "bronze" && at(-5) === "bronze");
check("leagues are sorted by min and start at 0", T.LEAGUES.every((l, i) => i === 0 ? l.min === 0 : l.min > T.LEAGUES[i - 1].min));
let p = T.leagueProgress(1000);
check("new player (1000): Bronze, 100 to Silver, bar at 50%", p.next.id === "silver" && p.toNext === 100 && p.pct === 50, p);
p = T.leagueProgress(300); check("very low rating: bar at 0%, never negative", p.pct === 0, p);
p = T.leagueProgress(1200); check("1200 -> halfway through Silver (50%)", p.league.id === "silver" && p.pct === 50 && p.toNext === 100, p);
p = T.leagueProgress(2500); check("Champion has no next league, bar full", p.next === null && p.pct === 100 && p.toNext === 0, p);
p = T.leagueProgress(1100); check("exactly 1100 -> Silver at 0%", p.league.id === "silver" && p.pct === 0, p);

console.log("PvP rating");
let w = T.pvpRatingChange(1000, 1000, "win"), l = T.pvpRatingChange(1000, 1000, "lose"), d = T.pvpRatingChange(1000, 1000, "draw");
check("equal ratings: win +16, lose -16, draw 0", w.delta === 16 && l.delta === -16 && d.delta === 0, [w, l, d]);
check("newRating = rating + delta", w.newRating === 1016 && l.newRating === 984);
w = T.pvpRatingChange(1000, 1400, "win"); check("beating a much stronger player pays more (+29..+32)", w.delta >= 29 && w.delta <= 32, w);
w = T.pvpRatingChange(1400, 1000, "win"); check("beating a much weaker player still gives at least +1", w.delta >= 1 && w.delta <= 3, w);
l = T.pvpRatingChange(1400, 1000, "lose"); check("losing to a much weaker player costs a lot (-29..-32)", l.delta <= -29 && l.delta >= -32, l);
l = T.pvpRatingChange(1000, 1400, "lose"); check("losing to a much stronger player costs at least -1", l.delta <= -1 && l.delta >= -3, l);
l = T.pvpRatingChange(100, 1000, "lose"); check("rating never drops below the floor (100)", l.newRating === 100 && l.delta === 0, l);
check("attacker's +delta and defender's -delta stay in balance (equal ratings)", T.pvpRatingChange(1200, 1200, "win").delta === -T.pvpRatingChange(1200, 1200, "lose").delta);
let drift = 0; for (const [a, b] of [[1000, 1000], [1300, 1100], [1100, 1300], [1800, 900], [900, 1800]]) drift += T.pvpRatingChange(a, b, "win").delta + T.pvpRatingChange(b, a, "lose").delta;
check("whole ladder stays balanced: winner's gain ~ loser's loss (drift <= 5 over 5 fights)", Math.abs(drift) <= 5, drift);
check("a single fight can never move rating by more than ELO_K", [[1000, 3000, "win"], [3000, 1000, "lose"], [1000, 100, "win"]].every(([a, b, r]) => Math.abs(T.pvpRatingChange(a, b, r).delta) <= T.ELO_K));
check("practice bots pay a quarter of the XP/gold", T.PVP_BOT_REWARD_MULT === 0.25);

console.log(`\n${pass} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
