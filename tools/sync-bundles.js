#!/usr/bin/env node
"use strict";
/* Copies functions/lib/{war,war-core,resource-distribution,economy}.js into the two generated bundles
   (js/server-local.js and the inline copy inside index.html). Source of truth = functions/lib.
   Usage: node tools/sync-bundles.js [--check] */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const MODS = ["war", "war-core", "resource-distribution", "economy"];
const check = process.argv.includes("--check");
const re = (name) => new RegExp("(__defs\\['" + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "'\\] = function\\(module, exports, require\\)\\{\\n)([\\s\\S]*?)(\\n\\};\\n(?=__defs|\\nconst api|const api))");
let bad = 0;
for (const target of ["js/server-local.js", "index.html"]) {
  const tp = path.join(root, target); let txt = fs.readFileSync(tp, "utf8"), changed = false;
  for (const m of MODS) {
    const src = fs.readFileSync(path.join(root, "functions/lib", m + ".js"), "utf8").replace(/\s+$/, "");
    const mm = txt.match(re(m));
    if (!mm) { console.error("module not found in " + target + ": " + m); bad++; continue; }
    if (mm[2].replace(/\s+$/, "") === src) continue;
    if (check) { console.error("OUT OF SYNC: " + target + " / " + m); bad++; continue; }
    txt = txt.replace(re(m), (_, a, _b, c) => a + src + c); changed = true; console.log("updated " + target + " <- " + m);
  }
  if (changed) fs.writeFileSync(tp, txt);
}
if (bad) process.exit(1);
console.log(check ? "bundles in sync" : "done");
