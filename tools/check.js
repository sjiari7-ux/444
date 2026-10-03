#!/usr/bin/env node
"use strict";
/* One command before every upload:   node tools/check.js
   1. every .js file has valid syntax
   2. js/server-local.js is exactly what functions/ builds (nobody edited the generated copy by hand)
   3. every image the code mentions exists in icons/   (catches misplaced / deleted / misspelled files)
   4. the server tests pass */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const root = path.join(__dirname, ".."); let bad = 0;
const ok = (m) => console.log("  ok   " + m), no = (m) => { bad++; console.log("  FAIL " + m); };
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);

console.log("1. syntax");
const jsFiles = ["js", "functions", "tools"].flatMap((d) => fs.existsSync(path.join(root, d)) ? walk(d) : []).filter((f) => f.endsWith(".js") && !f.includes("node_modules") && !f.startsWith("tools/parts/"));
for (const f of jsFiles) { try { new (require("vm").Script)(read(f).replace(/^#!.*\n/, ""), { filename: f }); } catch (e) { no(f + ": " + e.message); } }
if (!bad) ok(jsFiles.length + " files");

console.log("2. server-local.js matches functions/");
const before = read("js/server-local.js");
cp.execFileSync("node", [path.join(__dirname, "build-local.js")], { stdio: "pipe" });
const after = read("js/server-local.js");
if (before === after) ok("in sync"); else { no("js/server-local.js was out of date or edited by hand — it has been rebuilt from functions/, upload the rebuilt file"); }

console.log("3. images used by the code exist in icons/");
const have = new Set(fs.readdirSync(path.join(root, "icons")));
const src = ["js/config.js", "js/engine.js", "js/ui.js", "js/main.js", "js/storage.js", "style.css", "theme.css", "index.html"].map(read).join("\n");
const used = new Set([...src.matchAll(/['"`(\/]([A-Za-z0-9_\-]+\.(?:png|jpg|jpeg|webp|svg))['"`)]/g)].map((m) => m[1]));
const missing = [...used].filter((f) => !have.has(f));
missing.length ? missing.forEach((f) => no("icons/" + f + " is used but missing" + (fs.existsSync(path.join(root, f)) ? "  (it is in the project root — move it into icons/)" : ""))) : ok(used.size + " images referenced, all present");
const unused = [...have].filter((f) => !used.has(f));
console.log("  info " + unused.length + " files in icons/ are not used by the code");

console.log("4. server tests");
try { cp.execFileSync("node", [path.join(__dirname, "test-server.js")], { stdio: "pipe" }); ok("all passed"); }
catch (e) { no("server tests failed:\n" + String(e.stdout)); }

console.log("5. client rules (leagues, PvP rating)");
try { cp.execFileSync("node", [path.join(__dirname, "test-client.js")], { stdio: "pipe" }); ok("all passed"); }
catch (e) { no("client tests failed:\n" + String(e.stdout)); }

console.log(bad ? `\n${bad} problem(s)` : "\nAll good — safe to upload.");
process.exit(bad ? 1 : 0);
