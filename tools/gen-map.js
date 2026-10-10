#!/usr/bin/env node
"use strict";
// OBSOLETE: js/map.js and the server's regions now come from the WarEra map — use  node tools/gen-war-map.js  (then  node tools/build-local.js).
// This old generator would overwrite js/map.js with the OLD map and desynchronise it from functions/lib/world-regions.js, so it refuses to run unless --force is given.
if (!process.argv.includes("--force")) { console.error("tools/gen-map.js is obsolete: run  node tools/gen-war-map.js  (use --force only if you really want the old map)"); process.exit(1); }
/* Builds js/map.js (data + renderer) from the source map file (the "Morocco Strategy Map" html:
   it carries Natural Earth admin-1 regions, countries and cities as TopoJSON). Renderer code = tools/parts/map-renderer.js
     node tools/gen-map.js <Morocco_Strategy_Map.html> [out=js/map.js]
   - arcs are simplified once (shared borders stay shared)
   - admin-1 regions are merged per country by AREA: <2k km2 ->1 · <30k ->2 · <150k ->3 · <400k ->4 · <800k ->5 · <1.5M ->6 · <3M ->8 · <8M ->10 · else 12
   - Morocco: hand-made 5 regions
   - output paths are relative-integer SVG paths in a 12000-unit wide Mercator frame */
const fs = require("fs"), vm = require("vm");
const path = require("path"), root = path.join(__dirname, "..");
const [src, outArg] = process.argv.slice(2), outFile = outArg || path.join(root, "js/map.js");
if (!src) { console.error("usage: node tools/gen-map.js <source.html> [out.js]"); process.exit(1); }
const html = fs.readFileSync(src, "utf8");
const sc = (k) => { const i = html.indexOf("<script>// " + k); return html.slice(i, html.indexOf("</script>", i)).replace("<script>", ""); };
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(sc("https://d3js.org"), ctx); vm.runInContext(sc("https://github.com/topojson"), ctx);
const { d3, topojson } = ctx;
const i0 = html.indexOf('<script type="application/json" id="data">') + '<script type="application/json" id="data">'.length;
const D = JSON.parse(html.slice(i0, html.indexOf("</script>", i0)));
const cfg = fs.readFileSync(path.join(root, "js/config.js"), "utf8"), kb = cfg.slice(cfg.indexOf("const KINGDOMS = ["));
const KS = [...kb.slice(0, kb.indexOf("];")).matchAll(/\{id:'([^']+)'[^}]*?name:'([^']*)'/g)].map((m) => [m[1], m[2]]);   // game KINGDOMS: [[id, name], ...]

/* ---------- names -> game ids ---------- */
const nz = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^the /, "").replace(/[^a-z0-9]/g, "");
const ALIAS = { // game name -> other spellings used by Natural Earth
  "DR Congo": ["Democratic Republic of the Congo", "Dem. Rep. Congo"], "Republic of the Congo": ["Congo"], "Ivory Coast": ["Côte d'Ivoire"],
  "Eswatini": ["Swaziland", "eSwatini"], "North Macedonia": ["Macedonia"], "Tanzania": ["United Republic of Tanzania"], "Serbia": ["Republic of Serbia"],
  "Czech Republic": ["Czechia"], "Czechia": ["Czech Republic"], "Bahamas": ["The Bahamas"], "Cape Verde": ["Cabo Verde"], "United States": ["United States of America"],
  "East Timor": ["Timor-Leste"], "Timor-Leste": ["East Timor"], "Micronesia": ["Federated States of Micronesia"], "Guinea-Bissau": ["Guinea Bissau"],
  "Sao Tome and Principe": ["São Tomé and Principe"], "Vatican City": ["Vatican"], "Saint Kitts and Nevis": ["St. Kitts and Nevis"],
  "Saint Vincent and the Grenadines": ["St. Vin. and Gren."], "Central African Republic": ["Central African Rep."], "Bosnia and Herzegovina": ["Bosnia and Herz."],
  "Equatorial Guinea": ["Eq. Guinea"], "Dominican Republic": ["Dominican Rep."], "South Sudan": ["S. Sudan"], "Solomon Islands": ["Solomon Is."],
  "Antigua and Barbuda": ["Antigua and Barb."], "Marshall Islands": ["Marshall Is."], "Palestine": ["West Bank", "Gaza Strip"] };
const idOf = new Map();
for (const [id, n] of KS) { idOf.set(nz(n), id); for (const a of ALIAS[n] || []) idOf.set(nz(a), id); }
const nameOf = Object.fromEntries(KS);
const gid = (n) => idOf.get(nz(n));

/* ---------- simplify arcs once (keeps shared borders identical) ---------- */
const TOL = +process.env.TOL || 0.03;   // degrees
function dp(pts, tol) {
  const n = pts.length; if (n <= 2) return pts;
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const seg = (a, b) => { const st = [[a, b]]; while (st.length) { const [s, e] = st.pop(); if (e <= s + 1) continue; let mx = -1, mi = -1;
    const [x1, y1] = pts[s], [x2, y2] = pts[e], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    for (let i = s + 1; i < e; i++) { const [x, y] = pts[i]; let d;
      if (!L) d = Math.hypot(x - x1, y - y1); else { const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)); d = Math.hypot(x - x1 - t * dx, y - y1 - t * dy); }
      if (d > mx) { mx = d; mi = i; } }
    if (mx > tol) { keep[mi] = 1; st.push([s, mi], [mi, e]); } } };
  if (pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1] && n > 3) { // closed ring in one arc: split at the farthest point
    let mi = 1, mx = -1; for (let i = 1; i < n - 1; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > mx) { mx = d; mi = i; } }
    keep[mi] = 1; seg(0, mi); seg(mi, n - 1);
  } else seg(0, n - 1);
  return pts.filter((_, i) => keep[i]);
}
function simplify(T, TOL) {
  const [sx, sy] = T.transform.scale, [tx, ty] = T.transform.translate;
  const arcs = T.arcs.map((a) => { let x = 0, y = 0; const p = a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); return dp(p, TOL); });
  return { type: "Topology", objects: T.objects, arcs };
}
const R = simplify(D.R, TOL), R2 = simplify(D.R2, 0.006), C = simplify(D.C, TOL);
const pts = (T) => T.arcs.reduce((s, a) => s + a.length, 0);
console.error("points after simplify  R", pts(R), " R2", pts(R2), " C", pts(C));

// rewind rings so d3 sees them as spherical polygons (topojson.merge does not guarantee the winding)
const rewind = (g) => {
  const fix = (rings) => rings.map((r, k) => { const a = d3.geoArea({ type: "Polygon", coordinates: [r] }); const big = a > 2 * Math.PI; return (k === 0 ? big : !big) ? r.slice().reverse() : r; });
  if (g.type === "Polygon") return { type: "Polygon", coordinates: fix(g.coordinates) };
  if (g.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: g.coordinates.map(fix) };
  return g;
};
/* ---------- grouping by area ---------- */
const nFor = (a) => a < 2e3 ? 1 : a < 3e4 ? 2 : a < 15e4 ? 3 : a < 4e5 ? 4 : a < 8e5 ? 5 : a < 15e5 ? 6 : a < 3e6 ? 8 : a < 8e6 ? 10 : 12;
function groups(T, only) {
  const G = T.objects.r.geometries, F = topojson.feature(T, T.objects.r).features, NB = topojson.neighbors(G);
  const SPH = 4 * Math.PI, ra = F.map((f) => { const a = d3.geoArea({ type: "Feature", properties: {}, geometry: rewind(f.geometry) }); return (a > 2 * Math.PI ? SPH - a : a) * 6371 * 6371; }), by = new Map(); // rewound first: the source rings are not all spherically wound
  G.forEach((g, i) => { const id = gid(g.properties.c); if (!id || (only && !only.includes(id))) return; if (!by.has(id)) by.set(id, []); by.get(id).push(i); });
  const out = new Map();
  for (const [id, ids] of by) {
    const tot = ids.reduce((s, i) => s + ra[i], 0), N = nFor(tot); let gr = ids.map((i) => ({ m: [i], a: ra[i] }));
    if (gr.length > N) {
      const own = new Map(); gr.forEach((g) => g.m.forEach((i) => own.set(i, g)));
      const cen = (g) => d3.geoCentroid(F[g.m.reduce((b, i) => ra[i] > ra[b] ? i : b, g.m[0])]);
      while (gr.length > N) {
        gr.sort((x, y) => x.a - y.a); const g = gr[0], cand = new Set();
        g.m.forEach((i) => NB[i].forEach((j) => { const o = own.get(j); if (o && o !== g) cand.add(o); }));
        let t; if (cand.size) t = [...cand].reduce((b, x) => x.a < b.a ? x : b);
        else { const c0 = cen(g); t = gr.slice(1).reduce((b, x) => d3.geoDistance(c0, cen(x)) < d3.geoDistance(c0, cen(b)) ? x : b); }
        t.m.push(...g.m); t.a += g.a; g.m.forEach((i) => own.set(i, t)); gr.shift();
      }
    }
    out.set(id, gr.map((g) => ({ m: g.m, big: g.m.reduce((b, i) => ra[i] > ra[b] ? i : b, g.m[0]), a: g.a })));
  }
  return { G, groups: out };
}
const gR = groups(R), gM = groups(R2, ["morocco"]);
// Morocco (hand-made, 5 regions)
{ const G2 = R2.objects.r.geometries, ix = {}; G2.forEach((g, i) => ix[g.properties.n] = i);
  const custom = [["Tanger-Rabat", "طنجة-الرباط", ["Tanger-Tétouan-Al Hoceïma", "Rabat-Salé-Kénitra"]], ["Fès-Oriental", "فاس-الشرق", ["Fès-Meknès", "L'Oriental"]],
    ["Casablanca-Marrakech", "الدار البيضاء-مراكش", ["Casablanca-Settat", "Marrakech-Safi", "Béni Mellal-Khénifra"]], ["Drâa-Souss", "درعة-سوس", ["Drâa-Tafilalet", "Souss-Massa", "Guelmim-Oued Noun"]],
    ["Sahara", "الصحراء", ["Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab"]]];
  gM.groups.set("morocco", custom.map(([n, ar, ms]) => { const m = ms.map((x) => ix[x]); return { m, big: m[0], name: n, ar, a: 0 }; })); }

/* ---------- projection / path encoding ---------- */
const GW = 12000;
const proj = d3.geoMercator().scale(GW / (2 * Math.PI)).translate([GW / 2, GW / 2]).precision(0.1);
const pg = d3.geoPath(proj).digits(0);
function enc(d) { // absolute "M x,y L ..." (integers)  ->  compact relative path
  let out = "", m;
  const re = /M([^MLZ]*)((?:L[^MLZ]*)*)Z?/g, pr = (s) => s.split(",").map(Number);
  const rings = d.match(/M[^M]*/g) || [];
  for (const ring of rings) {
    const p = ring.replace(/Z/g, "").split(/[ML]/).filter(Boolean).map(pr);
    const q = []; for (const pt of p) { const l = q[q.length - 1]; if (!l || l[0] !== pt[0] || l[1] !== pt[1]) q.push(pt); }
    if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
    if (q.length < 3) continue;
    let ar = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; ar += a[0] * b[1] - b[0] * a[1]; } if (Math.abs(ar) / 2 < 3) continue; // dust
    out += "M" + q[0][0] + "," + q[0][1] + "l"; let px = q[0][0], py = q[0][1], first = 1;
    for (let i = 1; i < q.length; i++) { out += (first ? "" : ",") + (q[i][0] - px) + "," + (q[i][1] - py); first = 0; px = q[i][0]; py = q[i][1]; }
    out += "z";
  }
  return out;
}
function shape(geom) { // geometry (lon/lat) -> {d, x, y, bw, b:[x0,y0,x1,y1]}
  geom = rewind(geom);
  let d = enc(pg(geom) || "");
  const b = pg.bounds(geom);
  if (!d) { // micro-state: keep a small diamond (the map also draws a dot for tiny countries)
    const c = proj(d3.geoCentroid(geom)), x = Math.round(c[0]), y = Math.round(c[1]);
    return { d: `M${x},${y - 2}l2,2,-2,2,-2,-2z`, x, y, bw: 4, b: [x - 2, y - 2, x + 2, y + 2] };
  }
  // label point = centroid of the biggest polygon
  let best = geom, ba = -1;
  if (geom.type === "MultiPolygon") for (const c of geom.coordinates) { const g1 = { type: "Polygon", coordinates: c }, a = pg.area(g1); if (a > ba) { ba = a; best = g1; } }
  const c = pg.centroid(best);
  return { d, x: Math.round(c[0]), y: Math.round(c[1]), bw: Math.round(b[1][0] - b[0][0]), b: [Math.floor(b[0][0]), Math.floor(b[0][1]), Math.ceil(b[1][0]), Math.ceil(b[1][1])] };
}
const mergeGeoms = (T, G, ids) => ids.length === 1 ? topojson.feature(T, G[ids[0]]).geometry : topojson.merge(T, ids.map((i) => G[i]));

/* ---------- build countries + regions ---------- */
const countries = {}, order = [];
const build = (T, gg) => { for (const [id, grs] of gg.groups) {
  const G = gg.G || T.objects.r.geometries;
  const all = grs.flatMap((g) => g.m), country = shape(mergeGeoms(T, G, all)); if (!country) continue;
  const regions = grs.map((g) => {
    const p = G[g.big].properties, s = shape(mergeGeoms(T, G, g.m)); if (!s) return null;
    const r = { n: g.name || (grs.length === 1 ? nameOf[id] : g.m.length > 1 ? (/region|province|okrug|oblast|republic|territory|state|county|district|autonomous|krai|governorate/i.test(p.n) ? p.n : p.n + " Region") : p.n), ...s };
    if (g.ar) r.ar = g.ar; else if (g.m.length === 1 && p.ar) r.ar = p.ar;
    if (g.m.length > 1) r.mem = g.m.map((i) => G[i].properties.n).sort();
    return r; }).filter(Boolean).sort((a, b) => (a.n < b.n ? -1 : 1));
  countries[id] = { id, n: nameOf[id], ...country, r: regions }; order.push(id);
} };
build(R, gR); build(R2, gM);
/* ---------- neutral land (territories that are not playable countries) ---------- */
const CG = C.objects.countries.geometries, neutral = CG.filter((g) => { const n = g.properties.name; return n !== "Antarctica" && n !== "W. Sahara" && !gid(n); });
const nShapes = neutral.map((g) => shape(topojson.feature(C, g).geometry)).filter(Boolean);
const missing = KS.filter(([id]) => !countries[id]).map((k) => k[1]);
/* ---------- cities ---------- */
const cities = D.P.map(([n, cn, lo, la, cap, pop]) => { const id = gid(cn); if (!id || !countries[id]) return null; const p = proj([lo, la]); return [n, id, Math.round(p[0]), Math.round(p[1]), cap ? 1 : 0, Math.round(pop / 1000)]; }).filter(Boolean);

const all = [...Object.values(countries), ...nShapes];
const y0 = Math.min(...all.map((c) => c.b[1])), y1 = Math.max(...all.map((c) => c.b[3]));
const out = { w: GW, h: y1, y0, c: order.map((id) => countries[id]), nl: nShapes.map((s) => s.d).join(""), p: cities };
const tpl = fs.readFileSync(path.join(__dirname, "parts/map-renderer.js"), "utf8");
fs.writeFileSync(outFile, tpl.replace("__DATA__", () => JSON.stringify(out)));
const nreg = out.c.reduce((s, c) => s + c.r.length, 0);
console.error(`countries ${out.c.length}/${KS.length} (missing: ${missing.join(", ") || "none"}) · regions ${nreg} · neutral shapes ${nShapes.length} · cities ${cities.length} · y ${y0}..${y1}`);
console.error("map data bytes", JSON.stringify(out).length, " countries d", out.c.reduce((s, c) => s + c.d.length, 0), " regions d", out.c.reduce((s, c) => s + c.r.reduce((q, r) => q + r.d.length, 0), 0), " neutral", out.nl.length);
