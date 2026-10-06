#!/usr/bin/env node
"use strict";
/* Builds the SHORT version of the game to upload to GitHub Pages: only 3 files.

     node tools/pack.js          ->  dist/index.html  +  dist/app.css  +  dist/game.js

   - app.css  = style.css + theme.css (same order as in index.html)
   - game.js  = js/config, engine, server-local, storage, ui, main (same order as in index.html)
   - the file names get ?v=<hash> so the browser/GitHub Pages never serves an old copy after an upload.
   Upload the CONTENT of dist/ to the root of the repo (keep your icons/ folder next to them).
   Keep working in the normal files (js/*.js, style.css, theme.css): dist/ is generated, never edit it by hand. */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);

let html = read("index.html");

// the files, in the exact order index.html loads them
const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+\.css)">/g)].map((m) => m[1]).filter((f) => !/^https?:/.test(f));
const jsFiles = [...html.matchAll(/<script src="(js\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
if (!cssFiles.length || !jsFiles.length) { console.error("pack: could not find the css/js files in index.html"); process.exit(1); }

// every source file starts with "use strict"; inside one merged file that directive would make the WHOLE bundle strict,
// so it is removed from each part (the code runs exactly like before: as separate classic scripts in one global scope)
const stripStrict = (s) => s.replace(/^\s*(["'])use strict\1;?[ \t]*\r?\n/, "");

const css = cssFiles.map((f) => `/* ---- ${f} ---- */\n` + read(f)).join("\n");
const js = jsFiles.map((f) => `/* ---- ${f} ---- */\n` + stripStrict(read(f))).join("\n;\n");
const cssName = `app.css?v=${hash(css)}`, jsName = `game.js?v=${hash(js)}`;

// index.html: the css links become ONE link, the game scripts become ONE script
cssFiles.forEach((f, i) => {
  const tag = new RegExp(`[ \\t]*<link rel="stylesheet" href="${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">\\r?\\n?`);
  html = html.replace(tag, i === 0 ? `<link rel="stylesheet" href="${cssName}">\n` : "");
});
jsFiles.forEach((f, i) => {
  const tag = new RegExp(`[ \\t]*<script src="${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"></script>\\r?\\n?`);
  html = html.replace(tag, i === 0 ? `<script src="${jsName}"></script>\n` : "");
});

const out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), html);
fs.writeFileSync(path.join(out, "app.css"), css);
fs.writeFileSync(path.join(out, "game.js"), js);
console.log(`dist/ ready: index.html (${html.length} B), app.css (${css.length} B), game.js (${js.length} B)`);
console.log(`merged ${cssFiles.length} css + ${jsFiles.length} js files. Upload the content of dist/ to the repo root.`);
