/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Kingdom Territory Conquest
   ═══════════════════════════════════════════════════════════════ */

/* ===== CONFIG ===== */
const ZONE_ADJACENCY = {
  plains:   ['forest', 'mountain', 'swamp'],
  forest:   ['plains', 'cave'],
  cave:     ['forest', 'dark'],
  dark:     ['cave', 'swamp'],
  swamp:    ['dark', 'mountain', 'plains'],
  mountain: ['swamp', 'plains'],
};

const ZONE_HOME_KINGDOM = {
  plains: 'europe', forest: 'asia', cave: 'north_america',
  dark: 'south_america', swamp: 'arab_world', mountain: 'africa',
};
const KINGDOM_HOME_ZONE = {};
Object.keys(ZONE_HOME_KINGDOM).forEach(z => { KINGDOM_HOME_ZONE[ZONE_HOME_KINGDOM[z]] = z; });

const TERRITORIES_PER_ZONE = 5;
const TERRITORY_CAPITAL_INDEX = 1;
const TERRITORY_BASE_DEFENSE = 60;
const TERRITORY_CAPTURE_DEFENSE = 90;
const TERRITORY_ATTACK_ENERGY = 8;
const TERRITORY_REINFORCE_GOLD = 200;
const TERRITORY_REINFORCE_AMOUNT = 40;
const ZONE_MAJORITY_THRESHOLD = Math.ceil((TERRITORIES_PER_ZONE + 1) / 2);

const ZONE_TAX_RATE = {
  plains:   0.05,
  forest:   0.08,
  mountain: 0.10,
  cave:     0.13,
  swamp:    0.16,
  dark:     0.20,
};

function isZoneAdjacent(a, b){
  return a === b || (ZONE_ADJACENCY[a] || []).includes(b);
}
function territoryDocId(zone, idx){ return `${zone}_${idx}`; }
function isCapitalTerritory(tid){
  return tid.endsWith(`_${TERRITORY_CAPITAL_INDEX}`);
}

/* ===== VIEW STATE ===== */
let territoryData = {};
let territoryLoaded = false;
let territoryLoading = false;
let territoryZoneView = null;
let zoneSubTab = 'adventure';
let pendingTax = {};
let territoryLoadError = null;

/* ===== WORLD GEOMETRY STATE (real country borders) ===== */
let worldGeometryLoaded = false;
let worldGeometryLoading = false;
let worldGeometryError = null;

/* ===== SEED & LOAD ===== */
async function ensureTerritoriesSeeded(){
  if(!db) return;
  try{
    const markerRef = db.collection('meta').doc('territorySeed');
    const marker = await markerRef.get();
    if(marker.exists) return;
    const batch = db.batch();
    Object.keys(ZONE_HOME_KINGDOM).forEach(zone => {
      const homeKingdom = ZONE_HOME_KINGDOM[zone];
      for(let i = 1; i <= TERRITORIES_PER_ZONE; i++){
        const ref = db.collection('territories').doc(territoryDocId(zone, i));
        batch.set(ref, {
          zone, ownerKingdom: homeKingdom, defense: TERRITORY_BASE_DEFENSE,
          capturedBy: null, capturedByName: null,
          capturedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });
    batch.set(markerRef, { seededAt: firebase.firestore.FieldValue.serverTimestamp() });
    await batch.commit();
    console.log('[Arcadia Territory] Seeded', TERRITORIES_PER_ZONE * 6, 'outposts across 6 zones');
  }catch(e){
    console.error('[Arcadia Territory] Seed failed:', e.code || e.name, e.message);
  }
}

async function loadTerritories(force){
  if(!db){ territoryLoaded = true; return; }
  if(territoryLoading) return;
  if(territoryLoaded && !force) return;
  territoryLoading = true;
  try{
    const snap = await db.collection('territories').get();
    const next = {};
    snap.docs.forEach(d => { next[d.id] = { id: d.id, ...d.data() }; });
    territoryData = next;
    territoryLoaded = true;
    territoryLoadError = null;
  }catch(e){
    console.error('[Arcadia Territory] Load failed:', e.code || e.name, e.message);
    territoryLoaded = true;
    territoryLoadError = e.code === 'permission-denied'
      ? "Firestore blocked access to the 'territories' collection. Add read/write rules for 'territories' and 'meta' in the Firebase console."
      : (e.message || 'Failed to load territories.');
  }
  territoryLoading = false;
  if(typeof renderBody === 'function' && activeTab === 'zones') renderBody();
}

async function retryLoadTerritories(){
  territoryLoaded = false;
  territoryLoadError = null;
  await ensureTerritoriesSeeded();
  await loadTerritories(true);
  if(typeof renderBody === 'function') renderBody();
}

async function initTerritoryOnStart(){
  if(!db) { territoryLoaded = true; worldGeometryLoaded = true; return; }
  await Promise.all([
    (async () => { await ensureTerritoriesSeeded(); await loadTerritories(true); })(),
    loadWorldGeometry(),
  ]);
}

/* ===== QUERIES ===== */
function territoriesInZone(zone){
  return Object.values(territoryData).filter(t => t.zone === zone).sort((a, b) => a.id.localeCompare(b.id));
}
function kingdomOwnsAnyIn(kingdomId, zone){
  if(!kingdomId) return false;
  return territoriesInZone(zone).some(t => t.ownerKingdom === kingdomId);
}
function kingdomHasFootholdNear(kingdomId, zone){
  if(!kingdomId) return false;
  if(kingdomOwnsAnyIn(kingdomId, zone)) return true;
  return (ZONE_ADJACENCY[zone] || []).some(adj => kingdomOwnsAnyIn(kingdomId, adj));
}
function zoneController(zone){
  const list = territoriesInZone(zone);
  if(!list.length) return ZONE_HOME_KINGDOM[zone];
  const counts = {};
  list.forEach(t => { counts[t.ownerKingdom] = (counts[t.ownerKingdom] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
}
function zoneTaxOwner(zone){
  const list = territoriesInZone(zone);
  if(!list.length) return null;
  const counts = {};
  list.forEach(t => { counts[t.ownerKingdom] = (counts[t.ownerKingdom] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topKingdom, topCount] = sorted[0] || [null, 0];
  return topCount >= ZONE_MAJORITY_THRESHOLD ? topKingdom : null;
}

/* ===== ZONE TAX ===== */
function applyZoneTax(zoneId, resourceKey, grossAmount){
  if(grossAmount <= 0) return { net: grossAmount, tax: 0 };
  if(!db || !territoryLoaded) return { net: grossAmount, tax: 0 };
  const owner = zoneTaxOwner(zoneId);
  if(!owner) return { net: grossAmount, tax: 0 };
  const rate = ZONE_TAX_RATE[zoneId] || 0;
  const tax = resourceKey === 'gold' ? Math.round(grossAmount * rate) : Math.floor(grossAmount * rate);
  if(tax <= 0) return { net: grossAmount, tax: 0 };
  if(!pendingTax[owner]) pendingTax[owner] = {};
  pendingTax[owner][resourceKey] = (pendingTax[owner][resourceKey] || 0) + tax;
  return { net: grossAmount - tax, tax, ownerKingdom: owner };
}

async function creditZoneTax(kingdomId, amounts){
  if(!db) return;
  const kdef = kingdomDef(kingdomId);
  const keys = Object.keys(amounts || {}).filter(k => amounts[k] > 0);
  if(!kdef || !keys.length) return;
  const ref = db.collection('alliances').doc(kingdomId);
  try{
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if(!doc.exists){
        tx.set(ref, {
          name: kdef.name, emblem: kdef.emblem, continent: kdef.id, description: kdef.description,
          level: 1, points: 0, memberCount: 0,
          treasury: { ...amounts },
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const updates = {};
        keys.forEach(k => { updates[`treasury.${k}`] = firebase.firestore.FieldValue.increment(amounts[k]); });
        tx.update(ref, updates);
      }
    });
  }catch(e){
    console.error('[Arcadia Territory] Tax deposit failed:', e.code || e.name, e.message);
    if(!pendingTax[kingdomId]) pendingTax[kingdomId] = {};
    keys.forEach(k => { pendingTax[kingdomId][k] = (pendingTax[kingdomId][k] || 0) + amounts[k]; });
  }
}

async function flushZoneTax(){
  if(!db) return;
  const kingdoms = Object.keys(pendingTax).filter(k => pendingTax[k] && Object.keys(pendingTax[k]).length);
  if(!kingdoms.length) return;
  const batch = pendingTax;
  pendingTax = {};
  for(const kingdomId of kingdoms){
    await creditZoneTax(kingdomId, batch[kingdomId]);
  }
}

/* ===== ATTACK / REINFORCE ===== */
async function attackTerritory(tid){
  if(!db || !UID){ showToast('❌', 'Cloud save required', 'Kingdom warfare needs Firebase configured.'); return; }
  if(!state.allianceId){ showToast('❌', 'No kingdom', 'Pledge allegiance to a kingdom first.'); return; }
  const t = territoryData[tid];
  if(!t){ showToast('❌', 'Unknown outpost', 'That outpost no longer exists.'); return; }
  if(isCapitalTerritory(tid)){ showToast('🏛️', 'Fortified Capital', "A kingdom's capital can never be attacked or captured."); return; }
  if(t.ownerKingdom === state.allianceId){ showToast('🛡️', 'Already yours', 'Reinforce it instead of attacking.'); return; }
  if(!kingdomHasFootholdNear(state.allianceId, t.zone)){
    showToast('🚫', 'Too far from home', "Your kingdom needs ground in this zone or a bordering one first.");
    return;
  }
  const cost = getEnergyCost(state, TERRITORY_ATTACK_ENERGY);
  if(state.energy < cost){ showToast('❌', 'Not enough energy', `This attack costs ${cost} energy.`); return; }

  state.energy -= cost;
  const stats = getPlayerCombatStats();
  const roll = 0.85 + Math.random() * 0.3;
  const attackPower = Math.round(stats.atk * roll);

  let result = null;
  try{
    const ref = db.collection('territories').doc(tid);
    result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if(!doc.exists) throw new Error('Outpost vanished mid-attack.');
      const cur = doc.data();
      if(cur.ownerKingdom === state.allianceId) return { alreadyOwned: true };
      const defense = cur.defense || TERRITORY_BASE_DEFENSE;
      if(attackPower >= defense){
        tx.update(ref, {
          ownerKingdom: state.allianceId,
          defense: TERRITORY_CAPTURE_DEFENSE,
          capturedBy: UID,
          capturedByName: window.__playerUsername || state.username || 'Player',
          capturedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { captured: true };
      } else {
        const chip = Math.max(Math.round(attackPower * 0.4), Math.round(defense * 0.15));
        const newDefense = Math.max(10, defense - chip);
        tx.update(ref, { defense: newDefense });
        return { captured: false, defense: newDefense };
      }
    });
  } catch(e){
    console.error('[Arcadia Territory] Attack failed:', e.code || e.name, e.message);
    showToast('❌', 'Attack failed', 'Could not reach the server — try again.');
    scheduleSave();
    renderBody();
    return;
  }

  if(result.alreadyOwned){
    showToast('🛡️', 'Already yours', 'Your kingdom captured this a moment ago.');
  } else if(result.captured){
    t.ownerKingdom = state.allianceId;
    t.defense = TERRITORY_CAPTURE_DEFENSE;
    state.combat.wins = (state.combat.wins || 0) + 1;
    pushLog(state, `Captured outpost ${tid.toUpperCase()} for your kingdom!`, 'win');
    showToast('🏴', 'Outpost Captured!', `Your kingdom now holds ${tid}.`);
  } else {
    t.defense = result.defense;
    pushLog(state, `Attacked outpost ${tid} — it held with ${result.defense} defense left.`, 'lose');
    showToast('⚔️', 'Siege Underway', `${tid} defense chipped down to ${result.defense}.`);
  }

  scheduleSave();
  syncToFirestore();
  renderBody();
}

async function reinforceTerritory(tid){
  if(!db || !UID) return;
  const t = territoryData[tid];
  if(!t || t.ownerKingdom !== state.allianceId) return;
  if(state.gold < TERRITORY_REINFORCE_GOLD){
    showToast('❌', 'Not enough gold', `Reinforcing costs ${TERRITORY_REINFORCE_GOLD}g.`);
    return;
  }
  state.gold -= TERRITORY_REINFORCE_GOLD;
  try{
    const ref = db.collection('territories').doc(tid);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if(!doc.exists) return;
      const cur = doc.data();
      if(cur.ownerKingdom !== state.allianceId) return;
      tx.update(ref, { defense: (cur.defense || TERRITORY_BASE_DEFENSE) + TERRITORY_REINFORCE_AMOUNT });
    });
    t.defense = (t.defense || TERRITORY_BASE_DEFENSE) + TERRITORY_REINFORCE_AMOUNT;
    showToast('🛠️', 'Reinforced', `${tid} defense increased.`);
  }catch(e){
    console.error('[Arcadia Territory] Reinforce failed:', e.code || e.name, e.message);
    state.gold += TERRITORY_REINFORCE_GOLD;
    showToast('❌', 'Reinforce failed', 'Could not reach the server — try again.');
  }
  scheduleSave();
  syncToFirestore();
  renderBody();
}

/* ===== VIEW STATE HELPERS ===== */
function openZoneTerritoryView(zone){ territoryZoneView = zone; renderBody(); }
function closeZoneTerritoryView(){ territoryZoneView = null; renderBody(); }
function setZoneSubTab(tab){
  zoneSubTab = tab;
  if(tab === 'territory' && !territoryLoaded) loadTerritories();
  renderBody();
}

/* ═══════════════════════════════════════════════════════════
   ARCADIA WORLD MAP — Real Country Borders
   Each zone (continent) = Capital (center) + North/East/South/West,
   built once at startup from real Natural Earth country borders.
   ═══════════════════════════════════════════════════════════ */
const ARCADIA_WORLD = {
  plains:   { label:'Europe',        color:'#3b6cb5', names:['European Capital','Northern Europe','Eastern Europe','Southern Europe','Western Europe'] },
  forest:   { label:'Asia',          color:'#d4a843', names:['Asian Capital','Northern Asia','Eastern Asia','Southern Asia','Western Asia'] },
  swamp:    { label:'Arab World',    color:'#c17f24', names:['Arab Capital','Northern Arabia','Eastern Arabia','Southern Arabia','Western Arabia'] },
  mountain: { label:'Africa',        color:'#4a9b5e', names:['African Capital','Northern Africa','Eastern Africa','Southern Africa','Western Africa'] },
  cave:     { label:'North America', color:'#b03a2e', names:['NA Capital','Northern NA','Eastern NA','Southern NA','Western NA'] },
  dark:     { label:'South America', color:'#7d3c98', names:['SA Capital','Northern SA','Eastern SA','Southern SA','Western SA'] },
};

/* ISO-3166-1 numeric codes carved out of the naive continent detector
   and forced into the Arab World / Middle East zone. */
const MIDDLE_EAST_CODES = new Set(['682','784','634','414','048','512','887','368','760','400','422','376','275','364','792','818']);
const CAPITAL_FRACTION = 0.28;
const ZONE_ORDER = ['CAP','N','E','S','W']; // idx 0..4 — idx0 must stay the capital (matches TERRITORY_CAPITAL_INDEX)

function classifyZone([lon, lat], isoId){
  if(MIDDLE_EAST_CODES.has(String(isoId))) return 'swamp';
  // Oceania has no dedicated zone in this game — folds into Asia.
  if((lat < -10 && (lon > 150 || lon < -150)) || (lon >= 110 && lat < 0)) return 'forest';
  if(lon < -30) return lat >= 13 ? 'cave' : 'dark';
  if(lat >= 35 && lon < 45) return 'plains';
  if(lat < 35 && lon < 55) return 'mountain';
  return 'forest';
}

const WORLD_VIEWBOX = { w: 1040, h: 700 };
const worldProjection = d3.geoNaturalEarth1().scale(190).translate([WORLD_VIEWBOX.w/2 - 20, WORLD_VIEWBOX.h/2 + 20]);
const worldGeoPath = d3.geoPath(worldProjection);

/* zone -> ['CAP'|'N'|'E'|'S'|'W'] -> {path, cx, cy} */
let WORLD_GEOMETRY = {};

async function loadWorldGeometry(){
  if(worldGeometryLoaded || worldGeometryLoading) return;
  worldGeometryLoading = true;
  worldGeometryError = null;
  try{
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    let topo = await res.json();
    // Drastically cut point count (real coastlines are huge) so the SVG stays
    // light enough that the app's periodic full re-renders (price ticker, etc.)
    // don't cause a visible flash when this view is on screen.
    if(typeof topojson.presimplify === 'function' && typeof topojson.simplify === 'function'){
      try{ topo = topojson.simplify(topojson.presimplify(topo), 0.35); }
      catch(simplifyErr){ console.warn('[Arcadia Territory] Simplify skipped:', simplifyErr.message); }
    }
    const collection = topojson.feature(topo, topo.objects.countries);
    const geoms = topo.objects.countries.geometries;

    const byZone = {};
    Object.keys(ARCADIA_WORLD).forEach(z => byZone[z] = []);

    collection.features.forEach(f => {
      const centroid = d3.geoCentroid(f);
      if(!isFinite(centroid[0]) || !isFinite(centroid[1])) return;
      const zone = classifyZone(centroid, f.id);
      const geom = geoms.find(gm => gm.id === f.id);
      if(geom) byZone[zone].push({ geom, centroid });
    });

    const geometry = {};
    Object.entries(byZone).forEach(([zone, list]) => {
      if(!list.length) return;
      const merged = topojson.merge(topo, list.map(c => c.geom));
      const zoneCentroid = d3.geoCentroid({ type:'MultiPolygon', coordinates: merged.coordinates });

      let maxDist = 0;
      list.forEach(c => {
        const dLon = c.centroid[0] - zoneCentroid[0];
        const dLat = c.centroid[1] - zoneCentroid[1];
        c.dist = Math.sqrt(dLon*dLon + dLat*dLat);
        c.angle = Math.atan2(dLat, dLon) * 180 / Math.PI;
        if(c.dist > maxDist) maxDist = c.dist;
      });
      const threshold = maxDist * CAPITAL_FRACTION;

      const buckets = { CAP:[], N:[], E:[], S:[], W:[] };
      list.forEach(c => {
        if(c.dist <= threshold){ buckets.CAP.push(c); return; }
        const a = c.angle;
        if(a >= -45 && a < 45) buckets.E.push(c);
        else if(a >= 45 && a < 135) buckets.N.push(c);
        else if(a <= -45 && a > -135) buckets.S.push(c);
        else buckets.W.push(c);
      });
      if(buckets.CAP.length === 0){
        list.sort((a,b)=>a.dist-b.dist);
        const closest = list[0];
        ['N','E','S','W'].forEach(k => {
          const idx = buckets[k].indexOf(closest);
          if(idx > -1) buckets[k].splice(idx,1);
        });
        buckets.CAP.push(closest);
      }

      geometry[zone] = {};
      ZONE_ORDER.forEach(kind => {
        const chunk = buckets[kind];
        if(!chunk.length){ geometry[zone][kind] = null; return; }
        const mergedChunk = topojson.merge(topo, chunk.map(c => c.geom));
        const path = worldGeoPath(mergedChunk);
        const [cx, cy] = worldGeoPath.centroid(mergedChunk);
        geometry[zone][kind] = { path: path || '', cx: isFinite(cx) ? cx : 0, cy: isFinite(cy) ? cy : 0 };
      });
    });

    WORLD_GEOMETRY = geometry;
    worldGeometryLoaded = true;
  }catch(e){
    console.error('[Arcadia Territory] World geometry load failed:', e.message);
    worldGeometryError = e.message || 'Failed to load world borders.';
    worldGeometryLoaded = true; // attempt finished (failed) — stop auto-retriggering every render
  }
  worldGeometryLoading = false;
  if(typeof renderBody === 'function' && activeTab === 'zones') renderBody();
}

async function retryLoadWorldGeometry(){
  worldGeometryLoaded = false;
  worldGeometryError = null;
  await loadWorldGeometry();
  if(typeof renderBody === 'function') renderBody();
}

function worldTerritoryPath(cx, cy, zone, idx){
  const kind = ZONE_ORDER[idx];
  const g = WORLD_GEOMETRY[zone] && WORLD_GEOMETRY[zone][kind];
  return g ? g.path : '';
}

function worldTerritoryCentroid(zone, idx){
  const kind = ZONE_ORDER[idx];
  const g = WORLD_GEOMETRY[zone] && WORLD_GEOMETRY[zone][kind];
  return g ? { x: g.cx, y: g.cy } : { x: WORLD_VIEWBOX.w/2, y: WORLD_VIEWBOX.h/2 };
}

function worldTerritoryId(zone,idx){ return `${zone}_${idx+1}`; }
function worldTerritoryMeta(zone,idx){
  const z=ARCADIA_WORLD[zone];
  const id=worldTerritoryId(zone,idx);
  const t=territoryData[id];
  return {z,id,t,name:(z?.names?.[idx]||id),capital:idx===0};
}

let arcadiaMapZoom=1, arcadiaMapPan={x:0,y:0}, arcadiaMapSelected=null;
function clampWorldZoom(z){ return Math.max(.65,Math.min(2.8,z)); }
function resetArcadiaMap(){ arcadiaMapZoom=1; arcadiaMapPan={x:0,y:0}; arcadiaMapSelected=null; renderBody(); }
function zoomArcadiaMap(delta){ arcadiaMapZoom=clampWorldZoom(arcadiaMapZoom+delta); renderArcadiaMapTransform(); }
function renderArcadiaMapTransform(){
  const g=document.getElementById('arcadia-world-layer'); if(!g) return;
  g.setAttribute('transform',`translate(${arcadiaMapPan.x} ${arcadiaMapPan.y}) scale(${arcadiaMapZoom})`);
  const readout=document.getElementById('arcadia-zoom-readout'); if(readout) readout.textContent=Math.round(arcadiaMapZoom*100)+'%';
}
function selectArcadiaTerritory(id){ arcadiaMapSelected=id; renderArcadiaMapSelection(); }
function renderArcadiaMapSelection(){
  document.querySelectorAll('#arcadia-world-layer .world-territory').forEach(el=>el.classList.toggle('selected',el.dataset.territory===arcadiaMapSelected));
  const panel=document.getElementById('arcadia-territory-info');
  if(!panel) return;
  const t=Object.values(territoryData).find(x=>x.id===arcadiaMapSelected);
  if(!t){ panel.innerHTML='<div class="map-info-empty">Select a territory on the map.</div>'; return; }
  const idx=Math.max(0,parseInt(t.id.split('_').pop(),10)-1), z=ARCADIA_WORLD[t.zone]||ARCADIA_WORLD.plains;
  const kd=kingdomDef(t.ownerKingdom); const capital=idx===0;
  const canReach=kingdomHasFootholdNear(state.allianceId,t.zone), mine=t.ownerKingdom===state.allianceId;
  panel.innerHTML=`<div class="map-info-title">${capital?'🏛️ ':''}${z.names[idx]}</div>
    <div class="map-info-sub">${kd?kd.emblem+' '+kd.name:'Unclaimed'} · ${z.label}</div>
    <div class="map-stat"><span>Defense</span><b>${t.defense}</b></div>
    <div class="map-stat"><span>Status</span><b>${capital?'Capital':(mine?'Controlled':canReach?'Reachable':'Bordered')}</b></div>
    <div class="map-stat"><span>Tax</span><b>${Math.round((ZONE_TAX_RATE[t.zone]||0)*100)}%</b></div>
    ${capital?'<div class="map-capital-note">Capital territory — protected and cannot be captured.</div>':''}
    <div class="map-actions">${mine?`<button class="act-btn buy" onclick="reinforceTerritory('${t.id}')">Reinforce</button>`:`<button class="act-btn copper" ${(!state.allianceId||!canReach||capital)?'disabled':''} onclick="attackTerritory('${t.id}')">⚔️ Attack</button>`}
      <button class="act-btn" onclick="openZoneTerritoryView('${t.zone}')">View Outposts</button></div>`;
}
function searchArcadiaTerritory(v){
  const q=(v||'').trim().toLowerCase(); if(!q) return;
  for(const [zone,z] of Object.entries(ARCADIA_WORLD)){
    const idx=z.names.findIndex(n=>n.toLowerCase().includes(q));
    if(idx>=0){ const id=worldTerritoryId(zone,idx); selectArcadiaTerritory(id); focusArcadiaTerritory(zone,idx); return; }
  }
}
function focusArcadiaTerritory(zone,idx){
  const pt=worldTerritoryCentroid(zone,idx);
  const px=pt.x, py=pt.y;
  arcadiaMapZoom=Math.max(1.35,arcadiaMapZoom); arcadiaMapPan={x:520-px*arcadiaMapZoom,y:350-py*arcadiaMapZoom}; renderArcadiaMapTransform();
}
function handleArcadiaMapClick(ev){
  const el=ev.target.closest?.('.world-territory'); if(!el) return;
  selectArcadiaTerritory(el.dataset.territory);
}
function bindArcadiaMapInteractions(){
  const viewport=document.getElementById('arcadia-map-viewport'); if(!viewport||viewport.dataset.bound) return;
  viewport.dataset.bound='1'; let drag=false,lastX=0,lastY=0,moved=false;
  viewport.addEventListener('pointerdown',e=>{ if(e.target.closest('.world-territory')) return; drag=true;moved=false;lastX=e.clientX;lastY=e.clientY;viewport.setPointerCapture?.(e.pointerId); });
  viewport.addEventListener('pointermove',e=>{ if(!drag)return; const dx=e.clientX-lastX,dy=e.clientY-lastY; if(Math.abs(dx)+Math.abs(dy)>2)moved=true; arcadiaMapPan.x+=dx;arcadiaMapPan.y+=dy;lastX=e.clientX;lastY=e.clientY;renderArcadiaMapTransform(); });
  viewport.addEventListener('pointerup',()=>{drag=false;}); viewport.addEventListener('pointercancel',()=>{drag=false;});
  viewport.addEventListener('wheel',e=>{e.preventDefault();zoomArcadiaMap(e.deltaY<0?.12:-.12);},{passive:false});
  viewport.addEventListener('click',handleArcadiaMapClick);
}
function renderKingdomMapSVG(myKingdom){
  const world=[...Object.entries(ARCADIA_WORLD)];
  const territories=world.flatMap(([zone,z])=>z.names.map((name,idx)=>({zone,z,name,idx,meta:worldTerritoryMeta(zone,idx)})));
  const svgTerritories=territories.map(o=>{
    const path=worldTerritoryPath(0,0,o.zone,o.idx), t=o.meta.t;
    const kd=t&&kingdomDef(t.ownerKingdom), mine=t&&t.ownerKingdom===myKingdom, selected=arcadiaMapSelected===o.meta.id;
    const fill=kd?kd.color:o.z.color, opacity=kd?.75:.62;
    return `<g class="world-territory ${selected?'selected':''}" data-territory="${o.meta.id}">
      <path d="${path}" fill="${fill}" fill-opacity="${opacity}" stroke="rgba(10,16,18,.92)" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="${path}" fill="none" stroke="${mine?'#ffe27a':'rgba(210,192,145,.72)'}" stroke-width="${mine?3.2:1.35}" stroke-linejoin="round"/>
      ${o.idx===0?'<text class="capital-crown" x="'+(worldTerritoryCentroid(o.zone,o.idx).x)+'" y="'+(worldTerritoryCentroid(o.zone,o.idx).y-22)+'">♛</text>':''}
      <text class="territory-label" x="${worldTerritoryCentroid(o.zone,o.idx).x}" y="${worldTerritoryCentroid(o.zone,o.idx).y+4}" text-anchor="middle">${o.name}</text>
      <text class="territory-id" x="${worldTerritoryCentroid(o.zone,o.idx).x}" y="${worldTerritoryCentroid(o.zone,o.idx).y+20}" text-anchor="middle">${o.z.label}</text>
    </g>`;
  }).join('');
  return `<div class="arcadia-map-shell">
    <div class="arcadia-map-toolbar"><div><b>ARCADIA WORLD</b><span>30 territories · 6 kingdoms</span></div><div class="map-search"><input placeholder="Search territory…" onkeydown="if(event.key==='Enter')searchArcadiaTerritory(this.value)"><button onclick="searchArcadiaTerritory(this.previousElementSibling.value)">⌕</button></div><button class="map-tool" onclick="resetArcadiaMap()">◎ World</button></div>
    <div id="arcadia-map-viewport" class="arcadia-map-viewport">
      <svg viewBox="0 0 1040 700" aria-label="ARCADIA World Map">
        <defs><filter id="mapGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="sea" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#081d2b"/><stop offset="1" stop-color="#031018"/></linearGradient></defs>
        <rect width="1040" height="700" fill="url(#sea)"/>
        <g opacity=".16" stroke="#6b8b92"><path d="M0 140H1040M0 280H1040M0 420H1040M0 560H1040"/><path d="M130 0V700M260 0V700M390 0V700M520 0V700M650 0V700M780 0V700M910 0V700"/></g>
        <g id="arcadia-world-layer">${svgTerritories}</g>
      </svg>
      <div class="map-compass">N<br><span>✦</span></div>
      <div class="map-zoom"><button onclick="zoomArcadiaMap(.15)">+</button><span id="arcadia-zoom-readout">100%</span><button onclick="zoomArcadiaMap(-.15)">−</button></div>
      <div class="map-legend"><b>LEGEND</b><span><i class="legend-swatch own"></i>Your kingdom</span><span><i class="legend-swatch"></i>Other kingdom</span><span>♛ Capital</span></div>
    </div>
    <div class="arcadia-map-bottom"><div class="kingdom-strip">${KINGDOMS.map(k=>`<span><i style="background:${k.color}"></i>${k.emblem} ${k.name}</span>`).join('')}</div><div id="arcadia-territory-info" class="map-info"><div class="map-info-empty">Select a territory on the map.</div></div></div>
  </div>`;
}
function renderKingdomMap(){
  if(!db) return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);">🔌 Kingdom warfare requires cloud save (Firebase) to be configured.</div>`;
  if(!territoryLoaded){ loadTerritories(); return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);">Loading the world map…</div>`; }
  if(territoryLoadError) return `<div class="panel" style="padding:30px;text-align:center;"><div style="font-size:32px">⚠️</div><div style="color:var(--red);font-weight:700">Couldn't load the world map</div><div style="color:var(--dim);font-size:12px;margin:8px 0 16px">${territoryLoadError}</div><button class="btn btn-primary" onclick="retryLoadTerritories()">🔄 Retry</button></div>`;
  if(!worldGeometryLoaded){ loadWorldGeometry(); return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);">🌍 Loading world borders…</div>`; }
  if(worldGeometryError) return `<div class="panel" style="padding:30px;text-align:center;"><div style="font-size:32px">⚠️</div><div style="color:var(--red);font-weight:700">Couldn't load world borders</div><div style="color:var(--dim);font-size:12px;margin:8px 0 16px">${worldGeometryError}</div><button class="btn btn-primary" onclick="retryLoadWorldGeometry()">🔄 Retry</button></div>`;
  if(territoryZoneView) return renderZoneOutposts(territoryZoneView);
  const myKingdom=state.allianceId;
  setTimeout(()=>{bindArcadiaMapInteractions(); renderArcadiaMapTransform(); renderArcadiaMapSelection();},0);
  return `<div class="wrap animate-fade"><header class="hero" style="margin-bottom:10px;"><h1 style="font-size:22px">🗺️ World Map</h1><p style="color:var(--dim);font-size:12px">Drag to move · Scroll to zoom · Click a territory to inspect it</p></header>${!myKingdom?`<div class="panel" style="padding:10px;text-align:center;color:var(--dim);font-size:12px;margin-bottom:10px">Pledge allegiance to a kingdom to participate in territory warfare.</div>`:''}${renderKingdomMapSVG(myKingdom)}</div>`;
}

function renderZoneOutposts(zone){
  const z = ZONES.find(x => x.id === zone);
  if(!z) return '';
  const list = territoriesInZone(zone);
  const myKingdom = state.allianceId;
  const reachable = kingdomHasFootholdNear(myKingdom, zone);
  const borderNames = (ZONE_ADJACENCY[zone] || []).map(a => (ZONES.find(x => x.id === a) || {}).name || a).join(', ');
  const taxOwner = zoneTaxOwner(zone);
  const taxKd = kingdomDef(taxOwner);
  const taxPct = Math.round((ZONE_TAX_RATE[zone] || 0) * 100);

  return `<div class="wrap animate-fade">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button class="act-btn" style="width:auto;padding:6px 12px;font-size:11px;" onclick="closeZoneTerritoryView()">← Back to Map</button>
      <div style="font-size:26px;">${z.icon}</div>
      <div>
        <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);">${z.name} Outposts</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">Borders: ${borderNames}</div>
      </div>
    </div>
    <div class="panel" style="padding:10px 14px;font-size:12px;margin-bottom:12px;">
      🏛️ ${taxKd ? `${taxKd.emblem} ${taxKd.name} taxes gathering and kills here at <b style="color:var(--brass-bright);">${taxPct}%</b>` : `⚡ No kingdom holds a clear majority here — the zone is contested and untaxed`}
    </div>
    ${myKingdom && !reachable ? `<div class="panel" style="padding:10px 14px;color:var(--red);font-size:12px;margin-bottom:12px;">🔒 Your kingdom doesn't hold ground here or in a bordering zone yet — you can't attack these outposts until it does.</div>` : ''}
    ${!myKingdom ? `<div class="panel" style="padding:10px 14px;color:var(--dim);font-size:12px;margin-bottom:12px;">Pledge allegiance to a kingdom to attack or reinforce outposts.</div>` : ''}
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));">
      ${list.map(t => {
        const kd = kingdomDef(t.ownerKingdom);
        const mine = t.ownerKingdom === myKingdom;
        const isCapital = isCapitalTerritory(t.id);
        const canAttack = myKingdom && !mine && reachable && !isCapital;
        return `<div class="card" style="padding:14px;text-align:center;${isCapital ? 'border-color:var(--brass);' : ''}">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">${t.id.toUpperCase()}${isCapital ? ' 🏛️' : ''}</div>
          <div style="font-size:12px;font-weight:700;color:${kd ? kd.color : 'var(--dim)'};margin:6px 0;">${kd ? kd.emblem + ' ' + kd.name : 'Unclaimed'}</div>
          <div style="font-size:11px;color:var(--dim);">🛡️ ${t.defense} defense</div>
          ${isCapital ? `<div style="margin-top:8px;font-size:10px;color:var(--brass-bright);font-weight:600;">🏛️ Capital — fortified, unconquerable</div>` : (mine
            ? `<button class="act-btn buy" style="margin-top:8px;width:100%;font-size:11px;" onclick="reinforceTerritory('${t.id}')">Reinforce (${TERRITORY_REINFORCE_GOLD}g)</button>`
            : `<button class="act-btn ${canAttack ? 'copper' : ''}" style="margin-top:8px;width:100%;font-size:11px;" ${canAttack ? '' : 'disabled'} onclick="attackTerritory('${t.id}')">${!myKingdom ? 'Join a kingdom' : (canAttack ? '⚔️ Attack' : '🔒 Unreachable')}</button>`)}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
