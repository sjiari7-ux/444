#!/usr/bin/env node
"use strict";
/* Builds the world from the "WarEra map" html (tools/data/map-war.html):
     js/map.js                      map data (countries + REAL war regions, Mercator 12000 frame) + renderer (tools/parts/map-renderer.js)
     functions/lib/world-regions.js server list of regions (id, country, name, geography, capital) — then run  node tools/build-local.js
   usage:  node tools/gen-war-map.js [source.html]

   - every <title> in the source = one piece of a war region: "Name (capital)\nOwner: xx\nDevelopment: n\nPopulation: n\nResources: r"
     pieces with the same (name, owner) are ONE region (647 regions, max 6 per country)
   - the 7 pieces drawn through a <clipPath> are cut here (Sutherland–Hodgman), so every region is a plain polygon set
   - owner codes (ISO-2) -> game country ids (ISO below); gl / pr / tw / xk are not playable countries: they become neutral land
   - the 19 micro-states that the source map does not contain keep their old shape (tools/data/old-map-data.json) as ONE region each
   - region ids are  <countryId>_<n>  (n = 1.. by name) and are the ids used by the server (wars, ownership, resources)
   - WORLD_NEIGHBORS (written next to WORLD_REGIONS): which regions border each other (land borders, short sea links, bridges so the world is
     one connected graph) — see tools/region-neighbors.js. The server uses it: a war can only target a region that touches one of the attacker's regions. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const src = process.argv[2] || path.join(__dirname, "data/map-war.html");
const html = fs.readFileSync(src, "utf8");
const OLD = JSON.parse(fs.readFileSync(path.join(__dirname, "data/old-map-data.json"), "utf8"));
const GW = 12000, TOL = +process.env.TOL || 0.6;      // grid units (1 unit = 0.03 deg at the equator)

const ISO = { ad: "andorra", ae: "united_arab_emirates", af: "afghanistan", al: "albania", am: "armenia", ao: "angola", ar: "argentina", at: "austria", au: "australia", az: "azerbaijan",
  ba: "bosnia_and_herzegovina", bd: "bangladesh", be: "belgium", bf: "burkina_faso", bg: "bulgaria", bh: "bahrain", bi: "burundi", bj: "benin", bn: "brunei", bo: "bolivia", br: "brazil",
  bs: "bahamas", bt: "bhutan", bw: "botswana", by: "belarus", bz: "belize", ca: "canada", cd: "dr_congo", cf: "central_african_republic", cg: "republic_of_the_congo", ch: "switzerland",
  ci: "ivory_coast", cl: "chile", cm: "cameroon", cn: "china", co: "colombia", cr: "costa_rica", cu: "cuba", cv: "cape_verde", cy: "cyprus", cz: "czechia", de: "germany", dj: "djibouti",
  dk: "denmark", do: "dominican_republic", dz: "algeria", ec: "ecuador", ee: "estonia", eg: "egypt", er: "eritrea", es: "spain", et: "ethiopia", fi: "finland", fj: "fiji", fr: "france",
  ga: "gabon", ge: "georgia", gh: "ghana", gm: "gambia", gn: "guinea", gq: "equatorial_guinea", gr: "greece", gt: "guatemala", gw: "guinea_bissau", gy: "guyana", hn: "honduras",
  hr: "croatia", ht: "haiti", hu: "hungary", id: "indonesia", ie: "ireland", il: "israel", in: "india", iq: "iraq", ir: "iran", is: "iceland", it: "italy", jm: "jamaica", jo: "jordan",
  jp: "japan", ke: "kenya", kg: "kyrgyzstan", kh: "cambodia", km: "comoros", kp: "north_korea", kr: "south_korea", kw: "kuwait", kz: "kazakhstan", la: "laos", lb: "lebanon",
  li: "liechtenstein", lk: "sri_lanka", lr: "liberia", ls: "lesotho", lt: "lithuania", lu: "luxembourg", lv: "latvia", ly: "libya", ma: "morocco", md: "moldova", me: "montenegro",
  mg: "madagascar", mk: "north_macedonia", ml: "mali", mm: "myanmar", mn: "mongolia", mr: "mauritania", mt: "malta", mu: "mauritius", mw: "malawi", mx: "mexico", my: "malaysia",
  mz: "mozambique", na: "namibia", ne: "niger", ng: "nigeria", ni: "nicaragua", nl: "netherlands", no: "norway", np: "nepal", nz: "new_zealand", om: "oman", pa: "panama", pe: "peru",
  pg: "papua_new_guinea", ph: "philippines", pk: "pakistan", pl: "poland", ps: "palestine", pt: "portugal", py: "paraguay", qa: "qatar", ro: "romania", rs: "serbia", ru: "russia",
  rw: "rwanda", sa: "saudi_arabia", sb: "solomon_islands", sd: "sudan", se: "sweden", sg: "singapore", si: "slovenia", sk: "slovakia", sl: "sierra_leone", sn: "senegal", so: "somalia",
  sr: "suriname", ss: "south_sudan", st: "sao_tome_and_principe", sv: "el_salvador", sy: "syria", sz: "eswatini", td: "chad", tg: "togo", th: "thailand", tj: "tajikistan",
  tl: "timor_leste", tm: "turkmenistan", tn: "tunisia", tr: "turkey", tt: "trinidad_and_tobago", tz: "tanzania", ua: "ukraine", ug: "uganda", uk: "united_kingdom", us: "united_states",
  uy: "uruguay", uz: "uzbekistan", va: "vatican_city", ve: "venezuela", vn: "vietnam", vu: "vanuatu", ye: "yemen", za: "south_africa", zm: "zambia", zw: "zimbabwe" };
const NEUTRAL = new Set(["gl", "pr", "tw", "xk"]);       // in the source map but not playable countries -> neutral land

/* ---------- parse the svg ---------- */
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function rings(d) {                       // "Mx,yLx,y...ZMx,y..." -> [[ [lon,lat] ...], ...]   (svg y = -lat)
  const out = [];
  for (const part of d.split("M")) {
    if (!part.trim()) continue;
    const pts = part.replace(/Z/g, "").split("L").map((p) => p.split(",").map(Number)).filter((p) => p.length === 2 && isFinite(p[0]) && isFinite(p[1]));
    if (pts.length > 2) out.push(pts.map(([x, y]) => [x, -y]));
  }
  return out;
}
const clips = {};
for (const m of html.matchAll(/<clipPath id="(p\d+)"><path d="([^"]*)"/g)) clips[m[1]] = rings(m[2]);
const body = html.slice(html.indexOf("</defs>"));
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
function clipPoly(subject, clipper) {     // Sutherland–Hodgman: subject (any) clipped by a CONVEX clipper
  const s = Math.sign(area(clipper)) || 1; let out = subject;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const a = clipper[i], b = clipper[(i + 1) % clipper.length], inp = out; out = [];
    const side = (p) => s * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length], sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
    }
  }
  return out;
}
const convex = (r) => { let sg = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], c = r[(i + 2) % r.length], z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(z) < 1e-9) continue; if (!sg) sg = Math.sign(z); else if (Math.sign(z) !== sg) return false; } return true; };

function triangulate(poly) {               // ear clipping (small polygons only): non-convex clipper -> convex triangles
  let v = poly.slice(); if (area(v) < 0) v.reverse(); const tris = [];
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  while (v.length > 3 && guard++ < 1000) {
    let cut = false;
    for (let i = 0; i < v.length; i++) {
      const a = v[(i + v.length - 1) % v.length], b = v[i], c = v[(i + 1) % v.length];
      if (cross(a, b, c) <= 1e-12) continue;
      if (v.some((p) => p !== a && p !== b && p !== c && inTri(p, a, b, c))) continue;
      tris.push([a, b, c]); v.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (v.length === 3) tris.push(v);
  return tris;
}
const LEG = {};                            // iso -> [hue, base lightness]: the legend of the source map (same colours as the original)
for (const m of html.matchAll(/<i style="background:hsl\((\d+) 58% ([\d.]+)%\)"><\/i>(\w+)<\/span>/g)) LEG[m[3]] = [+m[1], +m[2]];
const pieces = [];                         // {key, owner, name, cap, res, dev, pop, rings}
const tok = /<g clip-path="url\(#(p\d+)\)">|<\/g>|<path d="([^"]*)"[^>]*>\s*<title>([\s\S]*?)<\/title>\s*<\/path>/g;
let clipId = null, m;
while ((m = tok.exec(body))) {
  if (m[1]) { clipId = m[1]; continue; }
  if (m[0] === "</g>") { clipId = null; continue; }
  const title = unesc(m[3]), ow = /Owner: (\w+)/.exec(title); if (!ow) continue;
  const lines = title.split("\n"), cap = / \(capital\)$/.test(lines[0]), name = lines[0].replace(/ \(capital\)$/, "").trim();
  const get = (k) => { const r = new RegExp(k + ": (.*)").exec(title); return r ? r[1].trim() : null; };
  const fm = /fill="hsl\((\d+) 58% ([\d.]+)%\)"/.exec(m[0]), fillL = fm ? +fm[2] : null;   // region lightness: shades of the country's hue
  let rs = rings(m[2]);
  if (clipId) {                            // the piece is drawn through a clipPath: region = clip polygon ∩ the (convex) drawn shape
    const cl = clips[clipId]; let out = [];
    for (const bg of rs) { const parts = convex(bg) ? [bg] : triangulate(bg); for (const part of parts) for (const c of cl) { const r = clipPoly(c, part); if (r.length > 2) out.push(r); } }
    rs = out;
  }
  pieces.push({ key: ow[1] + "|" + name, owner: ow[1], name, cap, l: fillL, rings: rs });
}

function dissolve(rs) {                    // union of adjacent pieces: edges shared by two pieces (same two vertices, opposite directions) cancel, what is left is the outline
  const key = (p) => p[0].toFixed(4) + "," + p[1].toFixed(4), E = new Map();
  for (const r0 of rs) {
    const r = area(r0) < 0 ? r0.slice().reverse() : r0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], ka = key(a), kb = key(b); if (ka === kb) continue;
      if (E.has(kb + ">" + ka)) E.delete(kb + ">" + ka); else E.set(ka + ">" + kb, [a, b]);
    }
  }
  const from = new Map(), used = new Set();
  for (const [k, e] of E) { const ka = key(e[0]); if (!from.has(ka)) from.set(ka, []); from.get(ka).push(k); }
  const out = [];
  for (const [k0, e0] of E) {
    if (used.has(k0)) continue;
    used.add(k0); const ring = [e0[0]], startK = key(e0[0]); let cur = e0[1], guard = 0;
    while (key(cur) !== startK && guard++ < 200000) {
      ring.push(cur);
      const nk = (from.get(key(cur)) || []).find((x) => !used.has(x)); if (!nk) break;
      used.add(nk); cur = E.get(nk)[1];
    }
    if (ring.length > 2) out.push(ring);
  }
  return out;
}
/* ---------- projection / encoding (same frame as the old map: 12000 wide Mercator) ---------- */
const K = GW / (2 * Math.PI);
const proj = ([lon, lat]) => { const f = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180; return [Math.round(GW / 2 + K * lon * Math.PI / 180), Math.round(GW / 2 - K * Math.log(Math.tan(Math.PI / 4 + f / 2)))]; };
const unproj = ([x, y]) => [((x - GW / 2) / K) * 180 / Math.PI, (2 * Math.atan(Math.exp((GW / 2 - y) / K)) - Math.PI / 2) * 180 / Math.PI];
function dp(pts, tol) {                    // Douglas–Peucker on a closed ring (grid units)
  const n = pts.length; if (n <= 4) return pts;
  const keep = new Uint8Array(n); keep[0] = 1; let far = 1, fd = -1;
  for (let i = 1; i < n; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  keep[far] = 1;
  const seg = (a, b) => { const st = [[a, b]]; while (st.length) { const [s, e] = st.pop(); if (e <= s + 1) continue; let mx = -1, mi = -1;
    const [x1, y1] = pts[s % n], [x2, y2] = pts[e % n], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    for (let i = s + 1; i < e; i++) { const [x, y] = pts[i]; let d; if (!L) d = Math.hypot(x - x1, y - y1); else { const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)); d = Math.hypot(x - x1 - t * dx, y - y1 - t * dy); } if (d > mx) { mx = d; mi = i; } }
    if (mx > tol) { keep[mi % n] = 1; st.push([s, mi], [mi, e]); } } };
  seg(0, far); seg(far, n);
  return pts.filter((_, i) => keep[i]);
}
function gridRings(rs, keep) {                   // lon/lat rings -> simplified integer rings, ALL wound the same way (so a union of pieces never makes holes), dust removed
  const out = [];
  for (const r of rs) {
    let q = []; for (const p of r.map(proj)) { const l = q[q.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) q.push(p); }
    if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
    if (q.length < 3) continue;
    q = dp(q, TOL); if (q.length < 3) continue;
    const a = area(q); if (Math.abs(a) < 3) continue;       // dust
    out.push(keep || a >= 0 ? q : q.slice().reverse());
  }
  return out;
}
function enc(rs) {                         // integer rings -> compact relative path "Mx,yl dx,dy,...z"
  let out = "";
  for (const q of rs) { out += "M" + q[0][0] + "," + q[0][1] + "l"; let px = q[0][0], py = q[0][1], first = 1; for (let i = 1; i < q.length; i++) { out += (first ? "" : ",") + (q[i][0] - px) + "," + (q[i][1] - py); first = 0; px = q[i][0]; py = q[i][1]; } out += "z"; }
  return out;
}
function shape(rs) {                       // {d, x, y, bw, b}; label point = centroid of the biggest ring
  if (!rs.length) return null;
  let big = rs[0], ba = -1, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of rs) { const a = area(r); if (a > ba) { ba = a; big = r; } for (const [x, y] of r) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  let cx = 0, cy = 0, A = 0; for (let i = 0; i < big.length; i++) { const p = big[i], q = big[(i + 1) % big.length], c = p[0] * q[1] - q[0] * p[1]; A += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }
  const lx = A ? Math.round(cx / (3 * A)) : big[0][0], ly = A ? Math.round(cy / (3 * A)) : big[0][1];
  return { d: enc(rs), x: lx, y: ly, bw: x1 - x0, b: [x0, y0, x1, y1] };
}
const hueOf = (t) => { let h = 7; for (const ch of t) h = (h * 33 + ch.charCodeAt(0)) % 360; return h; };   // same hash the renderer used before
const diamond = (x, y) => ({ d: `M${x},${y - 2}l2,2,-2,2,-2,-2z`, x, y, bw: 4, b: [x - 2, y - 2, x + 2, y + 2] });

/* ---------- regions per country ---------- */
const byRegion = new Map(), order = [];    // painter order = order of the first piece
for (const p of pieces) { let g = byRegion.get(p.key); if (!g) { g = { owner: p.owner, name: p.name, cap: p.cap, l: p.l, rings: [] }; byRegion.set(p.key, g); order.push(g); } g.rings.push(...p.rings); }
const byOwner = new Map(); for (const g of order) { if (!byOwner.has(g.owner)) byOwner.set(g.owner, []); byOwner.get(g.owner).push(g); }

const countries = [], neutral = [], worldRegions = [];
const KS = Object.values(ISO); const oldC = Object.fromEntries(OLD.c.map((c) => [c.id, c]));
const nameOf = (id) => (oldC[id] && oldC[id].n) || id;
for (const [iso, regs] of byOwner) {
  if (NEUTRAL.has(iso)) { for (const g of regs) { const s = shape(gridRings(dissolve(g.rings), true)); if (s) neutral.push(s); } continue; }
  const id = ISO[iso]; if (!id) throw new Error("no game country for owner code " + iso);
  const list = regs.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  list.forEach((g, i) => { g.rid = id + "_" + (i + 1); });
  const out = [], all = [];
  for (const g of regs) {                  // painter order for drawing, ids by name
    const gr = gridRings(dissolve(g.rings), true); all.push(...gr);
    let s = shape(gr);
    if (!s) { const big = g.rings.slice().sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0], c = proj(big[0]); s = diamond(c[0], c[1]); all.push([[c[0], c[1] - 2], [c[0] + 2, c[1]], [c[0], c[1] + 2], [c[0] - 2, c[1]]]); }
    out.push({ n: g.name, rid: g.rid, ...s, ...(g.l != null ? { l: g.l } : {}), ...(g.cap ? { cap: 1 } : {}) });
  }
  const cs = shape(gridRings(dissolve(regs.flatMap((g) => g.rings)), true)) || shape(all);
  const lg = LEG[iso] || [0, 46];
  countries.push({ id, n: nameOf(id), h: lg[0], l: lg[1], ...cs, r: out });
  list.forEach((g) => worldRegions.push({ id: g.rid, countryId: id, name: g.name, cap: !!g.cap }));
}
// micro-states the source map does not have: keep their old shape, ONE region each
let micro = 0; const microPts = [];
for (const id of KS.concat(OLD.c.map((c) => c.id))) {
  if (countries.some((c) => c.id === id) || !oldC[id]) continue;
  const o = oldC[id]; const rid = id + "_1";
  const mh = hueOf(id);
  countries.push({ id, n: o.n, h: mh, l: 46, d: o.d, x: o.x, y: o.y, bw: o.bw, b: o.b, r: [{ n: o.n, rid, d: o.d, x: o.x, y: o.y, bw: o.bw, b: o.b }] });
  worldRegions.push({ id: rid, countryId: id, name: o.n, cap: true }); microPts.push({ id: rid, point: unproj([o.x, o.y]) }); micro++;
}
const have = new Set(countries.map((c) => c.id));
const missing = OLD.c.map((c) => c.id).filter((id) => !have.has(id));
if (missing.length) throw new Error("countries without any shape: " + missing.join(", "));

const nShapes = OLD.nl ? OLD.nl : "";
const all = [...countries];
const y0 = Math.min(...all.map((c) => c.b[1])), y1 = Math.max(...all.map((c) => c.b[3]));
const out = { w: GW, h: Math.max(y1, OLD.h), y0: Math.min(y0, OLD.y0), c: countries, nl: nShapes + neutral.map((s) => s.d).join(""), p: OLD.p };
const tpl = fs.readFileSync(path.join(__dirname, "parts/map-renderer.js"), "utf8");
fs.writeFileSync(path.join(root, "js/map.js"), tpl.replace("__DATA__", () => JSON.stringify(out)));

/* ---------- neighbours ---------- */
const NBR = require("./region-neighbors").compute(order.filter((g) => g.rid).map((g) => ({ id: g.rid, rings: g.rings })).concat(microPts));
const nbLines = Object.keys(NBR.nb).sort().map((k) => JSON.stringify(k) + ":" + JSON.stringify(NBR.nb[k])).join(",\n");
console.error("neighbours:", JSON.stringify(NBR.stats));

/* ---------- server list ---------- */
worldRegions.sort((a, b) => (a.id < b.id ? -1 : 1));
const LAYOUT = "warmap-1";
const js = `"use strict";\n\n// GENERATED by tools/gen-war-map.js from the WarEra map — do not edit by hand (run the generator again).\n// One entry per REAL war region: id = <countryId>_<n>, the same ids the map (js/map.js) draws and the server uses for wars / ownership / resources.\n// the source map's own resources are NOT used: the game only knows its own resources (see resource-config.js).\nconst WORLD_LAYOUT = ${JSON.stringify(LAYOUT)};\nconst WORLD_REGIONS = ${JSON.stringify(worldRegions).replace(/\},\{/g, "},\n{").replace(/^\[/, "[\n").replace(/\]$/, "\n]")};\n\n// WORLD_NEIGHBORS: region id -> ids of the regions it borders (land), is a short sea hop from, or is bridged to (see tools/region-neighbors.js)\nconst WORLD_NEIGHBORS = {\n${nbLines}\n};\n\nmodule.exports = { WORLD_LAYOUT, WORLD_REGIONS, WORLD_NEIGHBORS };\n`;
fs.writeFileSync(path.join(root, "functions/lib/world-regions.js"), js);

const nreg = countries.reduce((s, c) => s + c.r.length, 0), per = countries.map((c) => c.r.length);
console.error(`countries ${countries.length} (micro kept from the old map: ${micro}) · regions ${nreg} · max per country ${Math.max(...per)} · neutral extra ${neutral.length}`);
console.error("js/map.js bytes", fs.statSync(path.join(root, "js/map.js")).size, " world-regions.js bytes", js.length);
