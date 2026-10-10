"use strict";
/* Who borders whom — used by tools/gen-war-map.js (the result is written to functions/lib/world-regions.js as WORLD_NEIGHBORS,
   and the server only lets a country declare war on a region that touches one of ITS regions).

   input : [{ id, rings: [[ [lon,lat], ... ], ...] }]      real regions (rings = the pieces of the region, lon/lat)
           [{ id, point: [lon,lat] }]                      micro-states that only have a position
   output: { nb: { id: [ids sorted] }, stats }

   three kinds of links, all symmetric:
     1. LAND  – two regions share a border (>= 2 identical vertices = a shared edge, or their outlines are within a few km)
     2. SEA   – the closest points of two regions are at most SEA_KM apart (islands, straits: Japan-Korea, UK-France, Cuba-Florida...)
     3. BRIDGE – any group that is still cut off from the rest of the world (Australia, New Zealand, Pacific islands) gets ONE link
                 to the nearest region of another group, repeated until the whole world is one connected graph,
                 so nobody can end up unreachable (or unable to attack anybody). */
const SEA_KM = +process.env.SEA_KM || 200;
const TOUCH_KM = 14;                     // outlines this close = a shared land border (a strait is wider than that, e.g. Gibraltar 14 km is handled as sea only if the shapes do not touch)
const THIN_KM = 8;                       // points closer than this along a border are dropped for the sea search (land links use ALL vertices)
const CELL = 4;                          // degrees, bucket size for the nearest-point search

const RAD = Math.PI / 180;
function km(a, b) {                      // fast distance (equirectangular, wraps at the antimeridian) — plenty for a 300 km threshold
  let dx = Math.abs(a[0] - b[0]); if (dx > 180) dx = 360 - dx;
  const la = (a[1] + b[1]) / 2 * RAD;
  return 111.32 * Math.hypot(dx * Math.cos(la), a[1] - b[1]);
}
const cellOf = (lon, lat) => [((Math.floor((lon + 180) / CELL) % 90) + 90) % 90, Math.floor((lat + 90) / CELL)];

function compute(items) {
  const n = items.length, idx = new Map(items.map((it, i) => [it.id, i]));
  const adj = items.map(() => new Map());          // i -> Map(j -> "land" | "sea" | "bridge")
  const link = (i, j, kind) => { if (i === j) return; const a = adj[i].get(j); if (a === "land" || (a === "sea" && kind === "bridge")) return; adj[i].set(j, kind); adj[j].set(i, kind); };

  /* ---- 1. land: shared vertices ---- */
  const byVertex = new Map();
  items.forEach((it, i) => { for (const r of it.rings || []) for (const [x, y] of r) { const k = x.toFixed(2) + "," + y.toFixed(2); let s = byVertex.get(k); if (!s) byVertex.set(k, (s = new Set())); s.add(i); } });
  const shared = new Map();
  for (const s of byVertex.values()) { if (s.size < 2) continue; const a = [...s]; for (let p = 0; p < a.length; p++) for (let q = p + 1; q < a.length; q++) { const k = a[p] < a[q] ? a[p] * 100000 + a[q] : a[q] * 100000 + a[p]; shared.set(k, (shared.get(k) || 0) + 1); } }
  for (const [k, c] of shared) if (c >= 2) link(Math.floor(k / 100000), k % 100000, "land");

  /* ---- thinned points per region + bucket grid ---- */
  const pts = items.map((it) => {
    if (it.point) return [it.point];
    const out = []; let last = null;
    for (const r of it.rings) for (const p of r) { if (!last || km(last, p) >= THIN_KM) { out.push(p); last = p; } }
    return out;
  });
  const grid = new Map();
  pts.forEach((arr, i) => arr.forEach((p) => { const [cx, cy] = cellOf(p[0], p[1]); const k = cx + "," + cy; let b = grid.get(k); if (!b) grid.set(k, (b = [])); b.push([p, i]); }));
  function near(p, radiusKm, visit) {                 // visit([point, regionIndex]) for every bucketed point within the cells that cover radiusKm
    const [cx, cy] = cellOf(p[0], p[1]);
    const ny = Math.ceil(radiusKm / (111.32 * CELL));
    const nx = Math.min(45, Math.ceil(radiusKm / (111.32 * Math.max(0.12, Math.cos(p[1] * RAD)) * CELL)));
    for (let dy = -ny; dy <= ny; dy++) { const y = cy + dy; if (y < 0 || y >= 45) continue;
      for (let dx = -nx; dx <= nx; dx++) { const b = grid.get((((cx + dx) % 90) + 90) % 90 + "," + y); if (b) for (const e of b) visit(e); } }
  }

  /* ---- 1b. land, part two: borders whose vertices are not identical in the two source polygons (Morocco-Mauritania...)
         still count as a shared border when the two outlines come within TOUCH_KM of each other ---- */
  for (let i = 0; i < n; i++) {
    const hit = new Set();
    for (const p of pts[i]) near(p, TOUCH_KM, ([q, j]) => { if (j !== i && !hit.has(j) && km(p, q) <= TOUCH_KM) hit.add(j); });
    for (const j of hit) link(i, j, "land");
  }

  /* ---- 2. sea: only between DIFFERENT land masses (a land mass = regions chained together by land links),
         closest points within SEA_KM. Two regions of the same continent that merely are close do NOT become neighbours. ---- */
  const land = (() => { const c = new Array(n).fill(-1); let k = 0; for (let s = 0; s < n; s++) { if (c[s] >= 0) continue; const st = [s]; c[s] = k; while (st.length) { const u = st.pop(); for (const v of adj[u].keys()) if (c[v] < 0) { c[v] = k; st.push(v); } } k++; } return c; })();
  for (let i = 0; i < n; i++) {
    const best = new Map();
    for (const p of pts[i]) near(p, SEA_KM, ([q, j]) => { if (j === i || land[j] === land[i]) return; const d = km(p, q); if (d <= SEA_KM && d < (best.get(j) ?? 1e9)) best.set(j, d); });
    for (const j of best.keys()) link(i, j, "sea");
  }

  /* ---- 3. bridges: join every cut-off group to the nearest region outside it ---- */
  const comp = () => { const c = new Array(n).fill(-1); let k = 0; for (let s = 0; s < n; s++) { if (c[s] >= 0) continue; const st = [s]; c[s] = k; while (st.length) { const u = st.pop(); for (const v of adj[u].keys()) if (c[v] < 0) { c[v] = k; st.push(v); } } k++; } return { c, k }; };
  let bridges = 0, { c, k } = comp();
  while (k > 1) {
    const size = new Array(k).fill(0); c.forEach((x) => size[x]++);
    let small = 0; for (let x = 1; x < k; x++) if (size[x] < size[small] || (size[x] === size[small] && x < small)) small = x;   // smallest group first
    let best = null;
    for (const R of [SEA_KM, 600, 1200, 2500, 5000, 20000]) {
      for (let i = 0; i < n; i++) if (c[i] === small) for (const p of pts[i]) near(p, R, ([q, j]) => { if (c[j] === small) return; const d = km(p, q); if (!best || d < best.d) best = { d, i, j }; });
      if (best && best.d <= R) break;
    }
    if (!best) break;
    link(best.i, best.j, "bridge"); bridges++;
    ({ c, k } = comp());
  }

  const nb = {}; let landN = 0, sea = 0, br = 0, maxDeg = 0, minDeg = 1e9;
  items.forEach((it, i) => { const ids = [...adj[i].keys()].map((j) => items[j].id).sort(); nb[it.id] = ids; maxDeg = Math.max(maxDeg, ids.length); minDeg = Math.min(minDeg, ids.length);
    for (const [j, kd] of adj[i]) if (j > i) { if (kd === "land") landN++; else if (kd === "sea") sea++; else br++; } });
  return { nb, stats: { regions: n, links: landN + sea + br, land: landN, sea, bridge: br, minDegree: minDeg, maxDegree: maxDeg, components: k } };
}
module.exports = { compute, SEA_KM };
