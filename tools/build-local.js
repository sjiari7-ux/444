#!/usr/bin/env node
"use strict";
/* Rebuilds js/server-local.js from functions/ (the ONE source of truth for the server logic).
   Usage:  node tools/build-local.js          (from the project root)
   Never edit js/server-local.js by hand — edit functions/index.js or functions/lib/*.js, then run this. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const order = JSON.parse(read("tools/parts/order.json"));      // module load order
const fileOf = (name) => (name === "index" ? "functions/index.js" : `functions/lib/${name}.js`);

let out = read("tools/parts/header.js");                        // loader + fake firebase-admin/functions
for (const name of order) {
  const body = read(fileOf(name)).replace(/\n$/, "");
  out += `__defs['${name}'] = function(module, exports, require){\n${body}\n};\n`;
}
out += read("tools/parts/footer.js");                           // window.LocalFn dispatcher
fs.writeFileSync(path.join(root, "js/server-local.js"), out);
console.log("js/server-local.js rebuilt from functions/ (" + order.length + " modules, " + out.length + " bytes)");
