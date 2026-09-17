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

/* ===== ANCIENT CORE — ROUTE GRAPH =====
   The Core sits at the end of a real corridor of outposts inside each
   kingdom's own home zone, not behind a single checkpoint: Capital (always
   held — capitals can never be captured, see isCapitalTerritory) → Outpost
   → Fortress Gate → Mountain Pass → Core. Losing ANY one of those middle
   links to an enemy kingdom severs the whole route, same chokepoint idea
   as the original design doc (capture the Mountain Pass, cut Kingdom A off
   from the Core) but now checked link-by-link instead of just the last one.
   CORE_GATE_INDEX stays pointing at the Fortress Gate specifically — it's
   still the one link that's also independently meaningful (the map badge,
   and historically the sole check before this route chain existed).
   Deliberately confined to one zone's own corridor rather than a full
   inter-zone path graph: ZONE_ADJACENCY is a hexagon of 6 zones with no
   real "center" zone to route through, so each kingdom's own home-zone
   corridor IS the route. */
const CORE_GATE_INDEX = 3;
const CORE_ROUTE_INDICES = [2, 3, 4]; // Outpost -> Fortress Gate -> Mountain Pass
const CORE_ROUTE_LABELS = { 2: 'Outpost', 3: 'Fortress Gate', 4: 'Mountain Pass' };
function coreGateId(zone){ return territoryDocId(zone, CORE_GATE_INDEX); }
function isCoreGateTerritory(tid){ return tid.endsWith(`_${CORE_GATE_INDEX}`); }
function territoryRouteLabel(tid){
  const idx = parseInt(String(tid).split('_').pop(), 10);
  return CORE_ROUTE_LABELS[idx] || null;
}
// Real connectivity check: the WHOLE corridor from the (unconquerable)
// Capital out to the Core must be in the kingdom's own hands. Kept as a
// single boolean for every existing call site (canAttackCore, attackCore,
// the block-reason text) — coreRouteStatus() below is the link-by-link
// version used to actually render the chain.
function kingdomHoldsCoreGate(kingdomId){
  if(!kingdomId) return false;
  const homeZone = KINGDOM_HOME_ZONE[kingdomId];
  if(!homeZone) return false;
  return CORE_ROUTE_INDICES.every(idx => {
    const t = territoryData[territoryDocId(homeZone, idx)];
    return !!t && t.ownerKingdom === kingdomId;
  });
}
// Link-by-link version of the same check, for the route-chain UI: returns
// every node from the Capital to the Core annotated with whether the
// kingdom currently holds it (the Capital always does) and, if lost, who
// took it.
function coreRouteChainForKingdom(kingdomId){
  const homeZone = KINGDOM_HOME_ZONE[kingdomId];
  if(!homeZone) return [];
  const nodes = [{ idx: TERRITORY_CAPITAL_INDEX, id: territoryDocId(homeZone, TERRITORY_CAPITAL_INDEX), label: 'Capital', capital: true }];
  CORE_ROUTE_INDICES.forEach(idx => {
    nodes.push({ idx, id: territoryDocId(homeZone, idx), label: CORE_ROUTE_LABELS[idx] || `Outpost ${idx}` });
  });
  return nodes;
}
function coreRouteStatus(kingdomId){
  const chain = coreRouteChainForKingdom(kingdomId);
  if(!chain.length) return { open: false, brokenAt: null, chain: [] };
  let brokenAt = null;
  const annotated = chain.map(node => {
    const t = territoryData[node.id];
    const held = node.capital ? true : (!!t && t.ownerKingdom === kingdomId); // capital can never fall
    if(!held && brokenAt === null) brokenAt = node;
    return { ...node, held, ownerKingdom: t ? t.ownerKingdom : (node.capital ? kingdomId : null) };
  });
  return { open: brokenAt === null, brokenAt, chain: annotated };
}

/* ===== VIEW STATE ===== */
let territoryData = {};
let territoryLoaded = false;
let territoryLoading = false;
let territoryZoneView = null;
let zoneSubTab = 'adventure';
let pendingTax = {};
let territoryLoadError = null;

/* ===== ANCIENT CORE — VIEW STATE ===== */
let coreData = null;
let coreLoaded = false;
let coreLoading = false;

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

/* ===== ANCIENT CORE — LOAD =====
   Unlike ensureTerritoriesSeeded(), there is no client-side seed step here
   on purpose: meta/ancientCore is written exclusively server-side (Cloud
   Functions, Admin SDK) so ownership/siege state can never be forged by a
   direct client write — firestore.rules only allows writing
   meta/territorySeed, nothing else under meta/. The doc springs into
   existence the first time attackCore or resolveDueCoreSiege runs
   (functions/index.js: ensureCoreDocExists); until then loadCore() just
   sees "not found" and leaves coreData null, which the UI (a later phase)
   should render as "Ancient Core: unclaimed". */
async function loadCore(force){
  if(!db){ coreLoaded = true; return; }
  if(coreLoading) return;
  if(coreLoaded && !force) return;
  coreLoading = true;
  try{
    const doc = await db.collection('meta').doc('ancientCore').get();
    coreData = doc.exists ? { id: doc.id, ...doc.data() } : null;
    coreLoaded = true;
  }catch(e){
    console.error('[Arcadia Core] Load failed:', e.code || e.name, e.message);
    coreLoaded = true;
  }
  coreLoading = false;
  if(typeof renderBody === 'function' && activeTab === 'zones') renderBody();
}

async function initTerritoryOnStart(){
  if(!db) { territoryLoaded = true; worldGeometryLoaded = true; coreLoaded = true; return; }
  bindWarTicker();
  await Promise.all([
    (async () => { await ensureTerritoriesSeeded(); await loadTerritories(true); })(),
    loadCore(true),
    loadWorldGeometry(),
    (typeof loadKingdomLeaderboard === 'function' ? loadKingdomLeaderboard(false) : Promise.resolve()),
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
  if(!db || !UID){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Cloud save required', 'Kingdom warfare needs Firebase configured.'); return; }
  if(!state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'No kingdom', 'Pledge allegiance to a kingdom first.'); return; }
  const t = territoryData[tid];
  if(!t){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Unknown outpost', 'That outpost no longer exists.'); return; }
  if(isCapitalTerritory(tid)){ showToast(`<img class="ui-icon" src="${ICONS.alliance}" alt="🏛">`, 'Fortified Capital', "A kingdom's capital can never be attacked or captured."); return; }
  if(t.ownerKingdom === state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, 'Already yours', 'Reinforce it instead of attacking.'); return; }
  if(!kingdomHasFootholdNear(state.allianceId, t.zone)){
    showToast(`<img class="ui-icon" src="${ICONS.forbidden}" alt="🚫">`, 'Too far from home', "Your kingdom needs ground in this zone or a bordering one first.");
    return;
  }
  const cost = getEnergyCost(state, TERRITORY_ATTACK_ENERGY);
  if(state.energy < cost){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Not enough energy', `This attack costs ${cost} energy.`); return; }

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
    // Transaction didn't go through, so the attack never happened server-side —
    // give the energy back instead of silently losing it (matches the refund
    // behavior already used in contributeToWar() for the same failure case).
    state.energy = Math.min(getMaxEnergy(state), state.energy + cost);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Attack failed', 'Could not reach the server — try again.');
    scheduleSave();
    renderBody();
    return;
  }

  if(result.alreadyOwned){
    showToast(`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, 'Already yours', 'Your kingdom captured this a moment ago.');
  } else if(result.captured){
    t.ownerKingdom = state.allianceId;
    t.defense = TERRITORY_CAPTURE_DEFENSE;
    state.combat.wins = (state.combat.wins || 0) + 1;
    pushLog(state, `Captured outpost ${tid.toUpperCase()} for your kingdom!`, 'win');
    showToast(`<img class="ui-icon" src="${ICONS.flag_black}" alt="🏴">`, 'Outpost Captured!', `Your kingdom now holds ${tid}.`);
  } else {
    t.defense = result.defense;
    pushLog(state, `Attacked outpost ${tid} — it held with ${result.defense} defense left.`, 'lose');
    showToast(`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, 'Siege Underway', `${tid} defense chipped down to ${result.defense}.`);
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
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Not enough gold', `Reinforcing costs ${TERRITORY_REINFORCE_GOLD}g.`);
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
    showToast(`<img class="ui-icon" src="${ICONS.tools}" alt="🛠">`, 'Reinforced', `${tid} defense increased.`);
  }catch(e){
    console.error('[Arcadia Territory] Reinforce failed:', e.code || e.name, e.message);
    state.gold += TERRITORY_REINFORCE_GOLD;
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Reinforce failed', 'Could not reach the server — try again.');
  }
  scheduleSave();
  syncToFirestore();
  renderBody();
}

/* ===== VIEW STATE HELPERS ===== */
/* ===== KINGDOM WAR SYSTEM =====
   Declaring war on an outpost starts a best-of-3 siege. Each round lasts
   WAR_ROUND_HOURS; any citizen of the attacking kingdom can strike and any
   citizen of the defending kingdom can defend, unlimited times, each costing
   energy. Whoever deals more cumulative damage in a round wins that round.
   First kingdom to WAR_ROUNDS_TO_WIN rounds wins the war. */
const WAR_ROUND_HOURS = 6;
const WAR_ROUNDS_TO_WIN = 2;
const WAR_DECLARE_GOLD_COST = 0; // free for now
const WAR_COOLDOWN_HOURS = 12;

function warTimestampMs(ts){
  if(!ts) return 0;
  if(typeof ts.toMillis === 'function') return ts.toMillis();
  if(typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}
function formatWarNumber(n){
  n = n || 0;
  if(n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  if(n >= 1000) return (n / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
  return String(n);
}
function formatWarCountdown(ms){
  if(ms <= 0) return 'resolving…';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
}
function isOnWarCooldown(t){
  return t && t.warCooldownUntil && warTimestampMs(t.warCooldownUntil) > Date.now();
}
function canDeclareWar(t){
  if(!t || !state.allianceId) return false;
  if(isCapitalTerritory(t.id)) return false;
  if(t.ownerKingdom === state.allianceId) return false;
  if(t.war) return false;
  if(isOnWarCooldown(t)) return false;
  if(allianceRankOf(state.allianceRole) < allianceRankOf('officer')) return false;
  return kingdomHasFootholdNear(state.allianceId, t.zone);
}

/* ===== ANCIENT CORE — SHARED HELPERS ===== */
function isOnCoreCooldown(){
  return !!coreData && coreData.coreCooldownUntil && warTimestampMs(coreData.coreCooldownUntil) > Date.now();
}
function canAttackCore(){
  if(!state.allianceId) return false;
  if(coreData && coreData.ownerKingdom === state.allianceId) return false;
  if(coreData && coreData.siege) return false;
  if(isOnCoreCooldown()) return false;
  if(allianceRankOf(state.allianceRole) < allianceRankOf('officer')) return false;
  return kingdomHoldsCoreGate(state.allianceId);
}
async function refreshCoreDoc(){
  if(!db) return;
  try{
    const doc = await db.collection('meta').doc('ancientCore').get();
    if(doc.exists) coreData = { id: doc.id, ...doc.data() };
  }catch(e){ console.error('[Arcadia Core] Refresh failed:', e.message); }
}

async function refreshTerritoryDoc(tid){
  if(!db) return;
  try{
    const doc = await db.collection('territories').doc(tid).get();
    if(doc.exists) territoryData[tid] = { id: doc.id, ...doc.data() };
  }catch(e){ console.error('[Arcadia Territory] Refresh failed:', e.message); }
}

async function declareWar(tid){
  if(!db || !UID){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Cloud save required', 'Kingdom warfare needs Firebase configured.'); return; }
  if(!state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'No kingdom', 'Pledge allegiance to a kingdom first.'); return; }
  if(allianceRankOf(state.allianceRole) < allianceRankOf('officer')){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Officers only', 'Only an officer, co-leader or leader can declare war.'); return;
  }
  const t = territoryData[tid];
  if(!t){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Unknown outpost', 'That outpost no longer exists.'); return; }
  if(isCapitalTerritory(tid)){ showToast(`<img class="ui-icon" src="${ICONS.alliance}" alt="🏛">`, 'Fortified Capital', "A kingdom's capital can never be attacked."); return; }
  if(t.ownerKingdom === state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, 'Already yours', 'You already hold this outpost.'); return; }
  if(isOnWarCooldown(t)){ showToast('⏳', 'Still recovering', 'This outpost is on cooldown after a recent siege.'); return; }
  if(!kingdomHasFootholdNear(state.allianceId, t.zone)){
    showToast(`<img class="ui-icon" src="${ICONS.forbidden}" alt="🚫">`, 'Too far from home', "Your kingdom needs ground in this zone or a bordering one first."); return;
  }
  if(state.gold < WAR_DECLARE_GOLD_COST){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Not enough gold', `Declaring war costs ${WAR_DECLARE_GOLD_COST}g.`); return;
  }
  // Declaring a war now runs server-side (functions/index.js: declareWar)
  // instead of writing territories/{tid} directly — the client can no
  // longer touch the `war` field at all (see firestore.rules), so every
  // check here is re-verified against real Firestore data on the server.
  if(!fns){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Unavailable', 'Cloud functions are not configured.'); return; }
  try{
    await fns.httpsCallable('declareWar')({ tid, kingdomId: state.allianceId });
    await refreshTerritoryDoc(tid);
    pushLog(state, `Declared war on outpost ${tid.toUpperCase()}!`, 'win');
    showToast(`<img class="ui-icon" src="${ICONS.horn}" alt="📯">`, 'War Declared!', `Round 1 of 3 has begun — ${WAR_ROUND_HOURS}h to fight.`);
  }catch(e){
    console.error('[Arcadia Territory] Declare war failed:', e.code || e.name, e.message);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Could not declare war', e.message || 'Try again.');
  }
  scheduleSave(); syncToFirestore(); renderBody();
}

async function contributeToWar(tid, side){
  if(!db || !UID) return;
  if(!state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'No kingdom', 'Pledge allegiance to a kingdom first.'); return; }
  const t = territoryData[tid];
  if(!t || !t.war){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'No siege here', 'There is no active war on this outpost.'); return; }
  const isAttacker = side === 'attack';
  // Flat cost (no stamina-skill discount) so what's shown here always
  // matches what the server actually deducts in contributeToWar below.
  const cost = TERRITORY_ATTACK_ENERGY;
  if(state.energy < cost){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Not enough energy', `Fighting costs ${cost} energy.`); return; }
  state.energy -= cost;
  const stats = getPlayerCombatStats();
  const roll = 0.85 + Math.random() * 0.3;
  const dmg = Math.max(1, Math.round(stats.atk * roll));

  // Contributing now runs server-side (functions/index.js: contributeToWar)
  // instead of writing territories/{tid} directly — the client can no
  // longer touch the `war` field at all (see firestore.rules). The
  // server re-checks side/membership/energy and clamps `dmg`; it still
  // trusts the *value* of dmg computed above, since that in turn depends
  // on the player's own stored stats (see the open item in chat about
  // players/{uid}).
  if(!fns){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Unavailable', 'Cloud functions are not configured.'); return; }
  try{
    const result = await fns.httpsCallable('contributeToWar')({ tid, side, kingdomId: state.allianceId, dmg });
    const appliedDmg = (result.data && result.data.dmg) || dmg;
    await refreshTerritoryDoc(tid);
    pushLog(state, `${isAttacker ? 'Struck' : 'Defended'} outpost ${tid.toUpperCase()} for ${appliedDmg} damage.`, isAttacker ? 'win' : 'info');
    showToast(isAttacker ? `<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">` : `<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, isAttacker ? 'Strike!' : 'Defended!', `+${appliedDmg} damage this round`);
  }catch(e){
    state.energy += cost;
    console.error('[Arcadia Territory] War contribution failed:', e.code || e.name, e.message);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Action failed', e.message || 'Could not reach the server — try again.');
  }

  await resolveWarRoundIfDue(tid);
  scheduleSave(); syncToFirestore();
  renderHeader();
  if(!patchWarDetailModal()) renderBody();
}

async function resolveWarRoundIfDue(tid){
  // Round resolution is no longer decided by the client — territories/{tid}
  // rules reject any write that touches `war`, on purpose (see chat: a
  // client could otherwise forge its own "I won" result). The
  // resolveDueWarRounds scheduled Cloud Function (functions/index.js) is
  // now the only thing that flips a round or finishes a siege, on a
  // 5-minute cadence, whether or not anyone is online. All this does is
  // opportunistically re-read the doc in case that function already ran,
  // so an active player sees the outcome without waiting for their own
  // next periodic sync.
  if(!db) return;
  const t = territoryData[tid];
  if(!t || !t.war) return;
  if(Date.now() < warTimestampMs(t.war.roundEndsAt)) return;

  const before = { hadWar: !!t.war, ownerKingdom: t.ownerKingdom, round: t.war.round };
  await refreshTerritoryDoc(tid);
  const after = territoryData[tid];
  if(!after) return;

  if(before.hadWar && !after.war){
    const winner = after.ownerKingdom !== before.ownerKingdom ? 'attacker' : 'defender';
    if(winner === 'attacker') showToast(`<img class="ui-icon" src="${ICONS.flag_black}" alt="🏴">`, 'War Won!', `${tid.toUpperCase()} has fallen!`);
    else showToast(`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, 'Siege Repelled', `${tid.toUpperCase()} held strong.`);
  } else if(after.war && after.war.round > before.round){
    showToast(`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, 'Round Over', `Round ${after.war.round} of 3 begins.`);
  }
}

/* ═══════════════════════════════════════════════════════════════
   ANCIENT CORE — CLIENT ACTIONS
   Mirrors declareWar/contributeToWar/resolveWarRoundIfDue exactly,
   just aimed at meta/ancientCore's `siege` field instead of a
   territories/{tid}.war field. No UI hooks these up yet (Phase H) —
   they're ready to be wired to a button once the World War tab exists.
   ═══════════════════════════════════════════════════════════════ */
async function attackCore(){
  if(!db || !UID){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Cloud save required', 'The Ancient Core needs Firebase configured.'); return; }
  if(!state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'No kingdom', 'Pledge allegiance to a kingdom first.'); return; }
  if(allianceRankOf(state.allianceRole) < allianceRankOf('officer')){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Officers only', 'Only an officer, co-leader or leader can attack the Core.'); return;
  }
  if(coreData && coreData.ownerKingdom === state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, 'Already yours', 'Your kingdom already holds the Core.'); return; }
  if(coreData && coreData.siege){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Already under siege', 'Another kingdom is already attacking the Core.'); return; }
  if(isOnCoreCooldown()){ showToast('⏳', 'Still recovering', 'The Core is still recovering from a recent siege.'); return; }
  if(!kingdomHoldsCoreGate(state.allianceId)){
    showToast(`<img class="ui-icon" src="${ICONS.forbidden}" alt="🚫">`, 'Route cut', "Your kingdom's corridor to the Core has been broken — retake the lost outpost first."); return;
  }
  if(!fns){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Unavailable', 'Cloud functions are not configured.'); return; }
  try{
    const result = await fns.httpsCallable('attackCore')({ kingdomId: state.allianceId });
    await refreshCoreDoc();
    if(result.data && result.data.captured){
      pushLog(state, 'Your kingdom has claimed the Ancient Core!', 'win');
      showToast(`<img class="ui-icon" src="${ICONS.flag_black}" alt="🏴">`, 'Core Claimed!', 'The Ancient Core is unclaimed no more.');
    } else {
      pushLog(state, 'Your kingdom has laid siege to the Ancient Core!', 'win');
      showToast(`<img class="ui-icon" src="${ICONS.horn}" alt="📯">`, 'Siege Begun!', `Round 1 of 3 has begun — ${WAR_ROUND_HOURS}h to fight.`);
    }
  }catch(e){
    console.error('[Arcadia Core] Attack failed:', e.code || e.name, e.message);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Could not attack the Core', e.message || 'Try again.');
  }
  scheduleSave(); syncToFirestore(); renderBody();
}

async function contributeToCore(side){
  if(!db || !UID) return;
  if(!state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'No kingdom', 'Pledge allegiance to a kingdom first.'); return; }
  if(!coreData || !coreData.siege){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'No siege underway', 'There is no active siege on the Ancient Core.'); return; }
  const isAttacker = side === 'attack';
  const cost = TERRITORY_ATTACK_ENERGY;
  if(state.energy < cost){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Not enough energy', `Fighting costs ${cost} energy.`); return; }
  state.energy -= cost;
  const stats = getPlayerCombatStats();
  const roll = 0.85 + Math.random() * 0.3;
  const dmg = Math.max(1, Math.round(stats.atk * roll));

  if(!fns){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Unavailable', 'Cloud functions are not configured.'); return; }
  try{
    const result = await fns.httpsCallable('contributeToCore')({ side, kingdomId: state.allianceId, dmg });
    const appliedDmg = (result.data && result.data.dmg) || dmg;
    await refreshCoreDoc();
    pushLog(state, `${isAttacker ? 'Struck' : 'Defended'} the Ancient Core for ${appliedDmg} damage.`, isAttacker ? 'win' : 'info');
    showToast(isAttacker ? `<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">` : `<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, isAttacker ? 'Strike!' : 'Defended!', `+${appliedDmg} damage this round`);
  }catch(e){
    state.energy += cost;
    console.error('[Arcadia Core] Contribution failed:', e.code || e.name, e.message);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, 'Action failed', e.message || 'Could not reach the server — try again.');
  }

  await resolveCoreSiegeIfDue();
  scheduleSave(); syncToFirestore();
  renderHeader();
  if(!patchCoreDetailModal()) renderBody();
}

async function resolveCoreSiegeIfDue(){
  // Same idea as resolveWarRoundIfDue: the client never decides the
  // outcome itself, it just opportunistically re-reads meta/ancientCore
  // in case resolveDueCoreSiege (functions/index.js) already ran.
  if(!db || !coreData || !coreData.siege) return;
  if(Date.now() < warTimestampMs(coreData.siege.roundEndsAt)) return;

  const before = { hadSiege: true, ownerKingdom: coreData.ownerKingdom, round: coreData.siege.round };
  await refreshCoreDoc();
  if(!coreData) return;

  if(before.hadSiege && !coreData.siege){
    const winner = coreData.ownerKingdom !== before.ownerKingdom ? 'attacker' : 'defender';
    if(winner === 'attacker') showToast(`<img class="ui-icon" src="${ICONS.flag_black}" alt="🏴">`, 'Core Has Fallen!', 'A new kingdom controls the Ancient Core!');
    else showToast(`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, 'Core Defended', 'The Ancient Core held strong.');
  } else if(coreData.siege && coreData.siege.round > before.round){
    showToast(`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, 'Round Over', `Round ${coreData.siege.round} of 3 begins.`);
  }
}

/* ═══════════════════════════════════════════════════════════════
   ANCIENT CORE — UI (Phase H)
   Everything below is presentation only — it reads coreData/territoryData
   and calls the client actions already defined above (attackCore,
   contributeToCore, resolveCoreSiegeIfDue). Deliberately reuses the
   territory-war renderers (renderWarFightersColumn, renderWarFullRanking,
   formatWarCountdown/Number, the .war-modal* / .war-fighters* CSS) since
   meta/ancientCore.siege is shaped exactly like territories/{tid}.war —
   only the wrapper markup below (.core-hero, .core-siege-*) is new.
   ═══════════════════════════════════════════════════════════════ */
let activeCoreModalOpen = false;
let lastCoreSignature = '';

function openCoreModal(){
  if(!coreData || !coreData.siege) return;
  activeCoreModalOpen = true;
  renderBody();
}
function closeCoreModal(){ activeCoreModalOpen = false; renderBody(); }

function coreSignature(c){
  if(!c) return '';
  const s = c.siege;
  return [
    c.ownerKingdom, c.status,
    s ? s.round : '', s ? s.attackerKingdom : '',
    s ? s.attackerDamage : '', s ? s.defenderDamage : '',
    s ? s.attackerWins : '', s ? s.defenderWins : '',
  ].join('|');
}

// Mirrors canAttackCore()'s checks but returns *why* the button is
// disabled instead of a boolean, so the panel can show a reason under it
// (canAttackCore alone can't tell "no kingdom" apart from "on cooldown").
function coreAttackBlockReason(){
  if(!state.allianceId) return 'Pledge allegiance to a kingdom first.';
  if(allianceRankOf(state.allianceRole) < allianceRankOf('officer')) return 'Only an officer, co-leader or leader can attack the Core.';
  if(coreData && coreData.ownerKingdom === state.allianceId) return 'Your kingdom already holds the Core.';
  if(coreData && coreData.siege) return 'The Core is already under siege.';
  if(isOnCoreCooldown()) return `The Core is recovering — ${formatWarCountdown(warTimestampMs(coreData.coreCooldownUntil) - Date.now())} left.`;
  if(!kingdomHoldsCoreGate(state.allianceId)) return "Your kingdom's route to the Core has been cut — you need the whole corridor to your Fortress Gate back.";
  return null;
}

// Visual rendering of the route chain (Capital → Outpost → Fortress Gate →
// Mountain Pass → CORE) for the Core hero panel — shows exactly which link,
// if any, is severed and who holds it now.
function renderCoreRouteChain(kingdomId){
  const status = coreRouteStatus(kingdomId);
  if(!status.chain.length) return '';
  let broken = false;
  const items = status.chain.map(node => {
    const nodeState = broken ? 'unreachable' : (node.held ? 'held' : 'lost');
    if(!node.held) broken = true;
    const kd = (nodeState === 'lost' && node.ownerKingdom) ? kingdomDef(node.ownerKingdom) : null;
    return { label: node.label, capital: node.capital, gate: node.idx === CORE_GATE_INDEX, state: nodeState, kd };
  });
  items.push({ label: 'CORE', core: true, state: broken ? 'unreachable' : 'held' });

  const nodeIcon = it => it.core ? ICONS.gem : it.capital ? ICONS.alliance : it.gate ? ICONS.castle : ICONS.compass;
  const nodeAlt = it => it.core ? '💎' : it.capital ? '🏛' : it.gate ? '🏯' : '🧭';
  const parts = items.map((it, i) => {
    const node = `<div class="core-route-node ${it.state}">
      <div class="core-route-node-icon"><img class="ui-icon" src="${nodeIcon(it)}" alt="${nodeAlt(it)}"></div>
      <div class="core-route-node-label">${it.label}</div>
      ${it.state === 'lost' && it.kd ? `<div class="core-route-node-owner">${it.kd.emblem} ${it.kd.name}</div>` : ''}
    </div>`;
    if(i === items.length - 1) return node;
    const arrowClass = it.state === 'lost' ? 'cut' : it.state === 'unreachable' ? 'muted' : 'ok';
    return `${node}<div class="core-route-arrow ${arrowClass}">${it.state === 'lost' ? '✕' : '→'}</div>`;
  });
  return `<div class="core-route-chain">${parts.join('')}</div>`;
}

function renderCoreSiegeBlock(core){
  const siege = core.siege;
  const kdAtk = kingdomDef(siege.attackerKingdom);
  const kdDef = kingdomDef(core.ownerKingdom);
  const endsAtMs = warTimestampMs(siege.roundEndsAt);
  const startedMs = warTimestampMs(siege.startedAt) || Date.now();
  const totalDmg = (siege.attackerDamage || 0) + (siege.defenderDamage || 0);
  const atkPct = totalDmg > 0 ? (siege.attackerDamage / totalDmg) * 100 : 50;
  const defPct = 100 - atkPct;
  const cost = getEnergyCost(state, TERRITORY_ATTACK_ENERGY);
  const atkColor = kdAtk ? kdAtk.color : 'var(--copper)';
  const defColor = kdDef ? kdDef.color : 'var(--brass)';
  const pips = (wins, color) => Array.from({ length: WAR_ROUNDS_TO_WIN }).map((_, i) =>
    `<i style="width:6px;height:6px;border-radius:50%;display:inline-block;margin:0 1px;background:${i < wins ? color : 'rgba(255,255,255,.18)'};"></i>`
  ).join('');

  return `<div class="core-siege-block">
    <div class="core-siege-top">
      <div class="core-siege-round"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> Round ${siege.round}<span style="color:var(--dim);font-weight:500;">/3</span></div>
      <div class="core-siege-started">Started ${formatWarCountdown(Date.now() - startedMs)} ago</div>
      <div class="war-countdown core-siege-timer" data-ends="${endsAtMs}">⏱ ${formatWarCountdown(endsAtMs - Date.now())}</div>
    </div>

    <div class="war-fighters-grid">
      <div class="war-fighters-col">${renderWarFightersColumn(siege, 'attack', kdAtk)}</div>
      <div class="war-fighters-col reverse">${renderWarFightersColumn(siege, 'defend', kdDef)}</div>
    </div>

    <div class="core-siege-labels">
      <span style="color:${atkColor};">${kdAtk ? kdAtk.emblem + ' ' + kdAtk.name : 'Attacker'} ${pips(siege.attackerWins, atkColor)}</span>
      <span style="color:${defColor};">${pips(siege.defenderWins, defColor)} ${kdDef ? kdDef.emblem + ' ' + kdDef.name : 'Defender'}</span>
    </div>
    <div class="core-siege-bar">
      <div class="core-siege-bar-seg atk" style="width:${atkPct}%;background:${atkColor};">${atkPct >= 15 ? atkPct.toFixed(0) + '%' : ''}</div>
      <div class="core-siege-bar-seg def" style="width:${defPct}%;background:${defColor};">${defPct >= 15 ? defPct.toFixed(0) + '%' : ''}</div>
    </div>
    <div class="core-siege-dmg-row">
      <span><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> ${formatWarNumber(siege.attackerDamage)} · ${siege.attackerHits || 0} strikes</span>
      <span>${siege.defenderHits || 0} strikes · ${formatWarNumber(siege.defenderDamage)} <img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"></span>
    </div>

    <div class="core-siege-actions">
      <button onclick="contributeToCore('defend')" class="core-siege-btn defend">
        <img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"> DEFEND<div class="core-siege-btn-cost">−${cost} energy</div>
      </button>
      <button onclick="contributeToCore('attack')" class="core-siege-btn attack">
        <img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> ATTACK<div class="core-siege-btn-cost">−${cost} energy</div>
      </button>
    </div>
    <div class="core-siege-note">Fight for either side — your strikes count for whichever banner you choose.</div>
    <button class="mini-btn" style="display:block;width:calc(100% - 20px);margin:0 10px 10px;text-align:center;" onclick="openCoreModal()"><img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> Full Battle Ranking</button>
  </div>`;
}

// Main entry point — the hero panel shown at the top of the Battles tab
// (renderActiveWarsList). Handles every coreData state: no Firebase, still
// loading, never-seeded (coreData null → "unclaimed"), held, and under siege.
function renderCoreHeader(){
  if(!db) return '';
  if(!coreLoaded){ loadCore(); return `<div class="panel core-hero-loading">Loading the Ancient Core…</div>`; }
  const core = coreData || { ownerKingdom: null, status: 'unclaimed', seasonId: 1, siege: null };
  const ownerKd = kingdomDef(core.ownerKingdom);
  const myKingdom = state.allianceId;
  const gateHeld = myKingdom ? kingdomHoldsCoreGate(myKingdom) : null;
  const blockReason = coreAttackBlockReason();
  const cooldownMs = isOnCoreCooldown() ? warTimestampMs(core.coreCooldownUntil) - Date.now() : 0;

  const statusLabel = core.siege ? 'Under siege' : (core.ownerKingdom ? 'Held' : 'Unclaimed');
  const statusColor = core.siege ? 'var(--red)' : (core.ownerKingdom ? 'var(--brass-bright)' : 'var(--dim)');

  return `<div class="core-hero">
    <div class="core-hero-glow"></div>
    <div class="core-hero-top">
      <div class="core-hero-icon"><img class="ui-icon" src="${ICONS.gem}" alt="💎"></div>
      <div class="core-hero-heading">
        <div class="core-hero-title">ANCIENT CORE</div>
        <div class="core-hero-sub">Season ${core.seasonId || 1}</div>
      </div>
      <div class="core-hero-status" style="color:${statusColor};">${statusLabel}</div>
    </div>

    <div class="core-hero-owner">
      ${ownerKd
        ? `<span class="core-hero-owner-emblem" style="background:${ownerKd.color}">${ownerKd.emblem}</span><span>Controlled by ${ownerKd.name}</span>`
        : `<img class="ui-icon" src="${ICONS.forbidden}" alt="🚫"> No kingdom controls the Core yet — the first attack claims it outright.`}
    </div>

    ${myKingdom ? `<div class="core-hero-gate ${gateHeld ? 'ok' : 'cut'}">
      <img class="ui-icon" src="${gateHeld ? ICONS.unlock : ICONS.lock}" alt="${gateHeld ? '🔓' : '🔒'}">
      ${gateHeld ? 'Your route to the Core is open.' : 'Your route to the Core has been cut.'}
    </div>
    ${renderCoreRouteChain(myKingdom)}` : ''}

    ${!core.siege && cooldownMs > 0 ? `<div class="core-cooldown-note">⏳ The Core is recovering — ${formatWarCountdown(cooldownMs)} until it can be attacked again.</div>` : ''}

    ${core.siege ? renderCoreSiegeBlock(core) : `
      <button class="act-btn ${blockReason ? '' : 'copper'}" style="margin-top:10px;" ${blockReason ? 'disabled' : ''} onclick="attackCore()">
        ${core.ownerKingdom ? `<img class="ui-icon" src="${ICONS.horn}" alt="📯"> Attack the Core` : `<img class="ui-icon" src="${ICONS.flag_black}" alt="🏴"> Claim the Core`}
      </button>
      ${blockReason ? `<div class="core-hero-block-reason">${blockReason}</div>` : ''}
    `}
  </div>`;
}

/* ===== CORE DETAIL MODAL — full contributor ranking, mirrors the war modal ===== */
function renderCoreModalContent(){
  const core = coreData;
  if(!core || !core.siege) return '';
  const siege = core.siege;
  const kdAtk = kingdomDef(siege.attackerKingdom), kdDef = kingdomDef(core.ownerKingdom);
  const endsAtMs = warTimestampMs(siege.roundEndsAt);
  const startedMs = warTimestampMs(siege.startedAt) || Date.now();
  const totalDmg = (siege.attackerDamage || 0) + (siege.defenderDamage || 0);
  const atkPct = totalDmg > 0 ? (siege.attackerDamage / totalDmg) * 100 : 50;
  const defPct = 100 - atkPct;
  const cost = getEnergyCost(state, TERRITORY_ATTACK_ENERGY);
  const atkColor = kdAtk ? kdAtk.color : 'var(--copper)';
  const defColor = kdDef ? kdDef.color : 'var(--brass)';

  return `<button class="war-modal-close" onclick="closeCoreModal()"><img class="ui-icon" src="${ICONS.close}" alt="✕"></button>
      <div class="war-modal-started"><img class="ui-icon" src="${ICONS.gem}" alt="💎"> Ancient Core · Started ${formatWarCountdown(Date.now() - startedMs)} ago</div>

      <div class="war-modal-fighters">
        <div class="war-modal-fighters-col">${renderWarFightersColumn(siege, 'attack', kdAtk)}</div>
        <div class="war-modal-round-box">
          <div class="war-modal-round-pip" style="color:${atkColor};">${siege.attackerWins || 0}</div>
          <div class="war-modal-round-icon"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"></div>
          <div class="war-modal-round-pip" style="color:${defColor};">${siege.defenderWins || 0}</div>
        </div>
        <div class="war-modal-fighters-col reverse">${renderWarFightersColumn(siege, 'defend', kdDef)}</div>
      </div>

      <div class="war-modal-title"><img class="ui-icon" src="${ICONS.gem}" alt="💎"> The Ancient Core</div>

      <div class="war-modal-kingdoms">
        <div class="war-modal-kd" style="flex-direction:column;align-items:flex-start;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="war-modal-kd-emblem" style="background:${atkColor}">${kdAtk ? kdAtk.emblem : '❔'}</span>
            <span class="war-modal-kd-name" style="color:${atkColor}">${kdAtk ? kdAtk.name : 'Attacker'}</span>
          </div>
          <button class="war-modal-btn attack" onclick="contributeToCore('attack')" style="width:100%;background:color-mix(in srgb, ${atkColor} 18%, transparent);border:1px solid color-mix(in srgb, ${atkColor} 55%, transparent);color:${atkColor};">
            <img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> ATTACK<div class="war-modal-btn-cost">−${cost} energy</div>
          </button>
        </div>
        <div class="war-modal-kd reverse" style="flex-direction:column;align-items:flex-end;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="war-modal-kd-name" style="color:${defColor}">${kdDef ? kdDef.name : 'Defender'}</span>
            <span class="war-modal-kd-emblem" style="background:${defColor}">${kdDef ? kdDef.emblem : '❔'}</span>
          </div>
          <button class="war-modal-btn defend" onclick="contributeToCore('defend')" style="width:100%;background:color-mix(in srgb, ${defColor} 18%, transparent);border:1px solid color-mix(in srgb, ${defColor} 55%, transparent);color:${defColor};">
            <img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"> DEFEND<div class="war-modal-btn-cost">−${cost} energy</div>
          </button>
        </div>
      </div>

      <div class="war-modal-timerbar">
        <span class="war-modal-round-label"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> Round ${siege.round}<span style="opacity:.6">/3</span></span>
        <span class="war-countdown war-modal-timer" data-ends="${endsAtMs}">⏱ ${formatWarCountdown(endsAtMs - Date.now())}</span>
      </div>

      <div class="war-modal-bar">
        <div class="war-modal-bar-atk" style="width:${atkPct}%;background:${atkColor};">${atkPct >= 15 ? atkPct.toFixed(0) + '%' : ''}</div>
        <div class="war-modal-bar-def" style="width:${defPct}%;background:${defColor};">${defPct >= 15 ? defPct.toFixed(0) + '%' : ''}</div>
      </div>
      <div class="war-modal-dmg-row">
        <span><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> ${formatWarNumber(siege.attackerDamage)} · ${siege.attackerHits || 0} strikes</span>
        <span>${siege.defenderHits || 0} strikes · ${formatWarNumber(siege.defenderDamage)} <img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"></span>
      </div>

      <div class="war-modal-note">Fight for either side — your strikes count for whichever banner you choose.</div>

      <div class="war-modal-ranking-title"><img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> Full Battle Ranking</div>
      ${renderWarFullRanking(siege, kdAtk, kdDef)}`;
}

function renderCoreDetailModal(){
  if(!coreData || !coreData.siege){ activeCoreModalOpen = false; return ''; }
  return `<div class="war-modal-backdrop" onclick="if(event.target===this)closeCoreModal()">
    <div class="war-modal core-modal">${renderCoreModalContent()}</div>
  </div>`;
}

// Same idea as patchWarDetailModal(): update the modal's contents in place
// instead of tearing down #app via renderBody(), so the entrance animation
// doesn't replay on every attack/defend click.
function patchCoreDetailModal(){
  if(!activeCoreModalOpen) return false;
  const box = document.querySelector('.war-modal-backdrop > .war-modal.core-modal');
  if(!box) return false;
  if(!coreData || !coreData.siege) return false;
  box.innerHTML = renderCoreModalContent();
  return true;
}


function territorySignature(t){
  if(!t) return '';
  const w = t.war;
  return [
    t.ownerKingdom, t.defense,
    w ? w.round : '', w ? w.attackerKingdom : '',
    w ? w.attackerDamage : '', w ? w.defenderDamage : '',
    w ? w.attackerWins : '', w ? w.defenderWins : '',
  ].join('|');
}

async function pollTerritories(){
  if(!db || territoryLoading) return;
  try{
    const snap = await db.collection('territories').get();
    let changed = false;
    const next = {};
    snap.docs.forEach(d => {
      const fresh = { id: d.id, ...d.data() };
      next[d.id] = fresh;
      if(territorySignature(fresh) !== territorySignature(territoryData[d.id])) changed = true;
    });
    if(Object.keys(next).length !== Object.keys(territoryData).length) changed = true;
    territoryData = next;
    if(activeWarModalId) patchWarDetailModal();
    if(changed && activeTab === 'zones'){
      if(typeof renderBodySilently === 'function') renderBodySilently(); else renderBody();
    }
  }catch(e){
    console.error('[Arcadia Territory] Poll failed:', e.code || e.name, e.message);
  }
}

let warTickerBound = false;
function bindWarTicker(){
  if(warTickerBound) return;
  warTickerBound = true;
  setInterval(() => {
    document.querySelectorAll('.war-countdown').forEach(el => {
      const endsAt = parseInt(el.dataset.ends, 10) || 0;
      el.textContent = formatWarCountdown(endsAt - Date.now());
    });
    Object.keys(territoryData).forEach(tid => {
      const t = territoryData[tid];
      if(t && t.war && Date.now() >= warTimestampMs(t.war.roundEndsAt)){
        resolveWarRoundIfDue(tid).then(() => {
          if(activeWarModalId === tid) patchWarDetailModal();
          if(activeTab === 'zones'){
            if(typeof renderBodySilently === 'function') renderBodySilently(); else renderBody();
          }
        });
      }
    });
    pollTerritories();
    pollCore();
  }, 30000);
}

// Same idea as pollTerritories(), just for the single meta/ancientCore doc —
// picks up siege damage/round changes from other players, resolves a round
// if the scheduled Cloud Function already flipped it, and refreshes
// whichever view is on screen (Battles hero panel and/or its modal).
async function pollCore(){
  if(!db || coreLoading) return;
  try{
    if(coreData && coreData.siege && Date.now() >= warTimestampMs(coreData.siege.roundEndsAt)){
      await resolveCoreSiegeIfDue();
    } else {
      await refreshCoreDoc();
    }
    const sig = coreSignature(coreData);
    if(sig !== lastCoreSignature){
      lastCoreSignature = sig;
      if(activeCoreModalOpen) patchCoreDetailModal();
      if(activeTab === 'battles' || activeTab === 'zones'){
        if(typeof renderBodySilently === 'function') renderBodySilently(); else renderBody();
      }
    }
  }catch(e){
    console.error('[Arcadia Core] Poll failed:', e.code || e.name, e.message);
  }
}

function topWarFighters(war, side, limit=5){
  const list = Object.entries(war.contributions || {}).map(([uid, c]) => ({ uid, ...c })).filter(c => c.side === side);
  return list.sort((a, b) => (b.dmg || 0) - (a.dmg || 0)).slice(0, limit);
}
function renderWarFighterRow(c, kd, isTop){
  const dmgLabel = formatWarNumber(c.dmg) + (isTop ? '!' : '');
  return `<div class="war-fighter-row ${isTop ? 'top' : ''}">
    <span class="war-fighter-emblem" style="background:${kd ? kd.color : '#555'}">${kd ? kd.emblem : '❔'}</span>
    <span class="war-fighter-name">${escapeHtml(c.name || 'Player')}</span>
    <span class="war-fighter-dmg"><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> ${dmgLabel}</span>
  </div>`;
}
function renderWarFightersColumn(war, side, kd){
  const fighters = topWarFighters(war, side);
  if(!fighters.length) return `<div class="war-fighters-empty">No strikes yet</div>`;
  return fighters.map((c, i) => renderWarFighterRow(c, kd, i === 0)).join('');
}
function renderWarRankRow(c, kd, rank){
  return `<div class="war-rank-row">
    <span class="war-rank-num">${rank}</span>
    <span class="war-rank-emblem" style="background:${kd ? kd.color : '#555'}">${kd ? kd.emblem : '❔'}</span>
    <span class="war-rank-name">${escapeHtml(c.name || 'Player')}</span>
    <span class="war-rank-dmg"><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> ${formatWarNumber(c.dmg)}</span>
  </div>`;
}
function renderWarFullRankingColumn(war, side, kd){
  const fighters = topWarFighters(war, side, Infinity);
  if(!fighters.length) return `<div class="war-fighters-empty">No strikes yet</div>`;
  return fighters.map((c, i) => renderWarRankRow(c, kd, i + 1)).join('');
}
function renderWarFullRanking(war, kdAtk, kdDef){
  return `<div class="war-modal-ranking">
    <div class="war-rank-col">
      <div class="war-rank-col-title">${kdDef ? kdDef.emblem + ' ' + kdDef.name : 'Defenders'}</div>
      <div class="war-rank-col-list">${renderWarFullRankingColumn(war, 'defend', kdDef)}</div>
    </div>
    <div class="war-rank-col">
      <div class="war-rank-col-title">${kdAtk ? kdAtk.emblem + ' ' + kdAtk.name : 'Attackers'}</div>
      <div class="war-rank-col-list">${renderWarFullRankingColumn(war, 'attack', kdAtk)}</div>
    </div>
  </div>`;
}

function renderWarBlock(t){
  const war = t.war;
  const kdAtk = kingdomDef(war.attackerKingdom);
  const kdDef = kingdomDef(t.ownerKingdom);
  const endsAtMs = warTimestampMs(war.roundEndsAt);
  const startedMs = warTimestampMs(war.startedAt) || Date.now();
  const totalDmg = (war.attackerDamage || 0) + (war.defenderDamage || 0);
  const atkPct = totalDmg > 0 ? (war.attackerDamage / totalDmg) * 100 : 50;
  const defPct = 100 - atkPct;
  const iAmAttacker = state.allianceId && state.allianceId === war.attackerKingdom;
  const iAmDefender = state.allianceId && state.allianceId === t.ownerKingdom;
  const cost = getEnergyCost(state, TERRITORY_ATTACK_ENERGY);
  const atkColor = kdAtk ? kdAtk.color : 'var(--copper)';
  const defColor = kdDef ? kdDef.color : 'var(--brass)';
  const pips = (wins, color) => Array.from({ length: WAR_ROUNDS_TO_WIN }).map((_, i) =>
    `<i style="width:6px;height:6px;border-radius:50%;display:inline-block;margin:0 1px;background:${i < wins ? color : 'rgba(255,255,255,.18)'};"></i>`
  ).join('');

  return `<div class="war-panel" style="margin-top:8px;border:1px solid var(--brass-dim);border-radius:12px;overflow:hidden;background:linear-gradient(160deg,rgba(0,0,0,.35),rgba(0,0,0,.15));">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid var(--border);gap:6px;">
      <div style="font-size:11px;font-weight:800;color:var(--brass-bright);white-space:nowrap;"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> Round ${war.round}<span style="color:var(--dim);font-weight:500;">/3</span></div>
      <div style="font-size:9px;color:var(--dim);font-family:var(--font-mono);white-space:nowrap;">Started ${formatWarCountdown(Date.now() - startedMs)} ago</div>
      <div class="war-countdown" data-ends="${endsAtMs}" style="font-size:10px;font-weight:700;color:var(--brass-bright);font-family:var(--font-mono);white-space:nowrap;">⏱ ${formatWarCountdown(endsAtMs - Date.now())}</div>
    </div>

    <div class="war-fighters-grid">
      <div class="war-fighters-col">${renderWarFightersColumn(war, 'attack', kdAtk)}</div>
      <div class="war-fighters-col reverse">${renderWarFightersColumn(war, 'defend', kdDef)}</div>
    </div>

    <div style="padding:8px 10px 4px;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:700;margin-bottom:4px;">
        <span style="color:${atkColor};">${kdAtk ? kdAtk.emblem + ' ' + kdAtk.name : 'Attacker'} ${pips(war.attackerWins, atkColor)}</span>
        <span style="color:${defColor};">${pips(war.defenderWins, defColor)} ${kdDef ? kdDef.emblem + ' ' + kdDef.name : 'Defender'}</span>
      </div>
      <div style="height:16px;border-radius:8px;overflow:hidden;display:flex;background:rgba(255,255,255,.06);">
        <div style="width:${atkPct}%;background:${atkColor};display:flex;align-items:center;padding-left:6px;font-size:9px;font-weight:800;color:#fff;white-space:nowrap;transition:width .3s;">${atkPct >= 15 ? atkPct.toFixed(0) + '%' : ''}</div>
        <div style="width:${defPct}%;background:${defColor};display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:9px;font-weight:800;color:#fff;white-space:nowrap;transition:width .3s;">${defPct >= 15 ? defPct.toFixed(0) + '%' : ''}</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--dim);margin-top:3px;font-family:var(--font-mono);">
        <span><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> ${formatWarNumber(war.attackerDamage)} · ${war.attackerHits || 0} strikes</span>
        <span>${war.defenderHits || 0} strikes · ${formatWarNumber(war.defenderDamage)} <img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"></span>
      </div>
    </div>

    <div style="display:flex;gap:1px;margin-top:6px;background:var(--border);">
      <button onclick="contributeToWar('${t.id}','defend')" style="flex:1;border:none;padding:10px 6px;cursor:pointer;background:rgba(79,209,255,.16);color:#cfeeff;font-family:var(--font-head);font-weight:800;font-size:11px;">
        <img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"> DEFEND<div style="font-size:8px;font-weight:500;margin-top:2px;">−${cost} energy</div>
      </button>
      <button onclick="contributeToWar('${t.id}','attack')" style="flex:1;border:none;padding:10px 6px;cursor:pointer;background:rgba(255,107,71,.18);color:#ffd7c9;font-family:var(--font-head);font-weight:800;font-size:11px;">
        <img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> ATTACK<div style="font-size:8px;font-weight:500;margin-top:2px;">−${cost} energy</div>
      </button>
    </div>
    <div style="text-align:center;font-size:8px;color:var(--dim);padding:4px 0 6px;">Fight for either side — your strikes count for whichever banner you choose.</div>
  </div>`;
}

function openZoneTerritoryView(zone){ zoneSubTab = 'territory'; territoryZoneView = zone; renderBody(); }
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
// NOTE: d3/topojson come from CDN <script> tags in index.html. If that CDN
// is slow, blocked (ad-blocker, restrictive network, offline), or fails for
// any reason, `d3`/`topojson` won't exist yet. We used to call d3 directly
// here at file-load time, which threw a ReferenceError and silently killed
// every function defined *after* this point in the file — including the
// Kingdom Map and Active Wars renderers. Everything d3-related is now
// created lazily inside loadWorldGeometry() so a missing library only
// disables the map (with a clear retry message) instead of breaking it.
let worldProjection = null;
let worldGeoPath = null;

/* zone -> ['CAP'|'N'|'E'|'S'|'W'] -> {path, cx, cy} */
let WORLD_GEOMETRY = {};

async function loadWorldGeometry(){
  if(worldGeometryLoaded || worldGeometryLoading) return;
  worldGeometryLoading = true;
  worldGeometryError = null;
  try{
    if(typeof d3 === 'undefined' || typeof topojson === 'undefined'){
      throw new Error('Map library (d3/topojson) failed to load — check your connection or ad-blocker and retry.');
    }
    if(!worldProjection){
      worldProjection = d3.geoNaturalEarth1().scale(190).translate([WORLD_VIEWBOX.w/2 - 20, WORLD_VIEWBOX.h/2 + 20]);
      worldGeoPath = d3.geoPath(worldProjection);
    }
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const topo = await res.json();
    // NOTE: this used to run the topology through topojson-simplify
    // (presimplify + simplify) to cut the point count further, for SVG
    // performance. That's what was producing the "only one landmass shows
    // up" bug (visible in-game as most of the 6 continent zones rendering
    // as nothing at all): topojson.quantile() computes its weight
    // threshold across every point in the WHOLE topology at once, but the
    // 110m world-atlas file is already a low-detail/pre-simplified tier
    // (that's what "110m" means — it's the small-map resolution, not the
    // full-detail one). Stripping another ~35% of points off data that's
    // already this coarse pushed most merged zone shapes (each is many
    // individual countries merged together) down to degenerate/empty
    // paths, while only the zone containing the single largest, highest-
    // weight country (enough points on its own to survive) kept a visible
    // shape. The 110m file is small and light enough on its own for this
    // map's size — no extra simplification needed.
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
  const canWar=canDeclareWar(t), onCooldown=isOnWarCooldown(t);
  const routeLabel = territoryRouteLabel(t.id);
  panel.innerHTML=`<div class="map-info-title">${capital?`<img class="ui-icon" src="${ICONS.alliance}" alt="🏛"> `:''}${z.names[idx]}</div>
    <div class="map-info-sub">${kd?kd.emblem+' '+kd.name:'Unclaimed'} · ${z.label}${routeLabel?` · <span style="color:var(--brass-bright);">${isCoreGateTerritory(t.id)?'🏯':'↳'} ${routeLabel} (Core route)</span>`:''}</div>
    <div class="map-stat"><span>Defense</span><b>${t.defense}</b></div>
    <div class="map-stat"><span>Status</span><b>${capital?'Capital':(mine?'Controlled':(t.war?'Under Siege':canReach?'Reachable':'Bordered'))}</b></div>
    <div class="map-stat"><span>Tax</span><b>${Math.round((ZONE_TAX_RATE[t.zone]||0)*100)}%</b></div>
    ${capital?'<div class="map-capital-note">Capital territory — protected and cannot be captured.</div>':''}
    ${t.war ? renderWarBlock(t) : `<div class="map-actions">${mine?`<button class="act-btn buy" onclick="reinforceTerritory('${t.id}')">Reinforce</button>`:(capital?'':`<button class="act-btn ${canWar?'copper':''}" ${canWar?'':'disabled'} onclick="declareWar('${t.id}')">${onCooldown?'⏳ Cooldown':`<img class="ui-icon" src="${ICONS.horn}" alt="📯"> Declare War`}</button>`)}
      <button class="act-btn" onclick="openZoneTerritoryView('${t.zone}')">View Outposts</button></div>`}</div>`;
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
  const pointers=new Map(); let pinchStartDist=0,pinchStartZoom=1;
  const dist=()=>{ const pts=[...pointers.values()]; return Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y); };
  viewport.addEventListener('pointerdown',e=>{
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    viewport.setPointerCapture?.(e.pointerId);
    if(pointers.size===2){ drag=false; pinchStartDist=dist(); pinchStartZoom=arcadiaMapZoom; return; }
    if(e.target.closest('.world-territory')) return;
    drag=true;moved=false;lastX=e.clientX;lastY=e.clientY;
  });
  viewport.addEventListener('pointermove',e=>{
    if(pointers.has(e.pointerId)) pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      const d=dist(); if(pinchStartDist>0){ arcadiaMapZoom=clampWorldZoom(pinchStartZoom*(d/pinchStartDist)); renderArcadiaMapTransform(); }
      return;
    }
    if(!drag)return; const dx=e.clientX-lastX,dy=e.clientY-lastY; if(Math.abs(dx)+Math.abs(dy)>2)moved=true; arcadiaMapPan.x+=dx;arcadiaMapPan.y+=dy;lastX=e.clientX;lastY=e.clientY;renderArcadiaMapTransform();
  });
  const release=e=>{ pointers.delete(e.pointerId); if(pointers.size<2) pinchStartDist=0; if(pointers.size===0) drag=false; };
  viewport.addEventListener('pointerup',release); viewport.addEventListener('pointercancel',release); viewport.addEventListener('pointerleave',release);
  viewport.addEventListener('wheel',e=>{e.preventDefault();zoomArcadiaMap(e.deltaY<0?.12:-.12);},{passive:false});
  viewport.addEventListener('click',handleArcadiaMapClick);
}
function renderKingdomMapSVG(myKingdom){
  const world=[...Object.entries(ARCADIA_WORLD)];
  const territories=world.flatMap(([zone,z])=>z.names.map((name,idx)=>({zone,z,name,idx,meta:worldTerritoryMeta(zone,idx)})));
  const svgTerritories=territories.map(o=>{
    const path=worldTerritoryPath(0,0,o.zone,o.idx), t=o.meta.t;
    const kd=t&&kingdomDef(t.ownerKingdom), mine=t&&t.ownerKingdom===myKingdom, selected=arcadiaMapSelected===o.meta.id;
    const cx=worldTerritoryCentroid(o.zone,o.idx).x, cy=worldTerritoryCentroid(o.zone,o.idx).y;
    const fill=kd?kd.color:o.z.color, opacity=kd?.75:.62;
    return `<g class="world-territory ${selected?'selected':''}" data-territory="${o.meta.id}">
      <path d="${path}" fill="${fill}" fill-opacity="${opacity}" stroke="rgba(7,9,16,.92)" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="${path}" fill="none" stroke="${mine?'#c4b5fd':'rgba(199,210,231,.45)'}" stroke-width="${mine?3.2:1.35}" stroke-linejoin="round"/>
      ${o.idx===0?`<image class="capital-crown" href="${ICONS.chess_queen}" x="${cx-9}" y="${cy-36}" width="18" height="18"/>`:''}
      ${o.idx===(CORE_GATE_INDEX-1)?`<image class="capital-crown" href="${ICONS.castle}" x="${cx-8}" y="${cy-34}" width="16" height="16"/>`:''}
      <text class="territory-label" x="${cx}" y="${cy+4}" text-anchor="middle">${o.name}</text>
      <text class="territory-id" x="${cx}" y="${cy+20}" text-anchor="middle">${o.z.label}</text>
    </g>`;
  }).join('');
  return `<div class="arcadia-map-shell">
    <div class="arcadia-map-toolbar"><div><b>ARCADIA WORLD</b><span>30 territories · 6 kingdoms</span></div><div class="map-search"><input placeholder="Search territory…" onkeydown="if(event.key==='Enter')searchArcadiaTerritory(this.value)"><button onclick="searchArcadiaTerritory(this.previousElementSibling.value)">⌕</button></div><button class="map-tool" onclick="resetArcadiaMap()">◎ World</button></div>
    <div id="arcadia-map-viewport" class="arcadia-map-viewport">
      <svg viewBox="0 0 1040 700" aria-label="ARCADIA World Map">
        <defs>
          <filter id="mapGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <radialGradient id="sea" cx="50%" cy="38%" r="75%"><stop offset="0%" stop-color="#111726"/><stop offset="55%" stop-color="#0a0d14"/><stop offset="100%" stop-color="#070910"/></radialGradient>
          <radialGradient id="mapVignette" cx="50%" cy="42%" r="70%"><stop offset="60%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity=".55"/></radialGradient>
        </defs>
        <rect width="1040" height="700" fill="url(#sea)"/>
        <g opacity=".10" stroke="#7c5cff"><path d="M0 140H1040M0 280H1040M0 420H1040M0 560H1040"/><path d="M130 0V700M260 0V700M390 0V700M520 0V700M650 0V700M780 0V700M910 0V700"/></g>
        <g id="arcadia-world-layer">${svgTerritories}</g>
        <rect width="1040" height="700" fill="url(#mapVignette)" pointer-events="none"/>
      </svg>
      <div class="map-compass">N<br><span><img class="ui-icon" src="${ICONS.star_small}" alt="✦"></span></div>
      <div class="map-zoom"><button onclick="zoomArcadiaMap(.15)">+</button><span id="arcadia-zoom-readout">100%</span><button onclick="zoomArcadiaMap(-.15)">−</button></div>
      <div class="map-legend"><b>LEGEND</b><span><i class="legend-swatch own"></i>Your kingdom</span><span><i class="legend-swatch"></i>Other kingdom</span><span><img class="ui-icon" src="${ICONS.chess_queen}" alt="♛"> Capital</span><span><img class="ui-icon" src="${ICONS.castle}" alt="🏯"> Fortress Gate (Core route)</span></div>
    </div>
    <div class="arcadia-map-bottom"><div class="kingdom-strip">${KINGDOMS.map(k=>`<span><i style="background:${k.color}"></i>${k.emblem} ${k.name}</span>`).join('')}</div><div id="arcadia-territory-info" class="map-info"><div class="map-info-empty">Select a territory on the map.</div></div></div>
  </div>`;
}
function renderKingdomMap(){
  if(!db) return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);"><img class="ui-icon" src="${ICONS.offline}" alt="🔌"> Kingdom warfare requires cloud save (Firebase) to be configured.</div>`;
  if(!territoryLoaded){ loadTerritories(); return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);">Loading the world map…</div>`; }
  if(territoryLoadError) return `<div class="panel" style="padding:30px;text-align:center;"><div style="font-size:32px"><img class="ui-icon" src="${ICONS.warning}" alt="⚠"></div><div style="color:var(--red);font-weight:700">Couldn't load the world map</div><div style="color:var(--dim);font-size:12px;margin:8px 0 16px">${territoryLoadError}</div><button class="btn btn-primary" onclick="retryLoadTerritories()"><img class="ui-icon" src="${ICONS.refresh}" alt="🔄"> Retry</button></div>`;
  if(!worldGeometryLoaded){ loadWorldGeometry(); return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);"><img class="ui-icon" src="${ICONS.globe}" alt="🌍"> Loading world borders…</div>`; }
  if(worldGeometryError) return `<div class="panel" style="padding:30px;text-align:center;"><div style="font-size:32px"><img class="ui-icon" src="${ICONS.warning}" alt="⚠"></div><div style="color:var(--red);font-weight:700">Couldn't load world borders</div><div style="color:var(--dim);font-size:12px;margin:8px 0 16px">${worldGeometryError}</div><button class="btn btn-primary" onclick="retryLoadWorldGeometry()"><img class="ui-icon" src="${ICONS.refresh}" alt="🔄"> Retry</button></div>`;
  if(territoryZoneView) return renderZoneOutposts(territoryZoneView);
  const myKingdom=state.allianceId;
  if(typeof loadKingdomLeaderboard === 'function' && !kingdomLeaderboard && !kingdomLeaderboardLoading) loadKingdomLeaderboard(false).then(()=>{ if(activeTab==='zones') renderBody(); });
  setTimeout(()=>{bindArcadiaMapInteractions(); renderArcadiaMapTransform(); renderArcadiaMapSelection();},0);
  return `<div class="wrap animate-fade"><header class="hero" style="margin-bottom:10px;"><h1 style="font-size:22px"><img class="ui-icon" src="${ICONS.zones_map}" alt="🗺"> World Map</h1><p style="color:var(--dim);font-size:12px">Drag to move · Scroll to zoom · Click a territory to inspect it</p></header>${!myKingdom?`<div class="panel" style="padding:10px;text-align:center;color:var(--dim);font-size:12px;margin-bottom:10px">Pledge allegiance to a kingdom to participate in territory warfare.</div>`:''}${renderKingdomMapSVG(myKingdom)}${typeof renderKingdomLeaderboardPanel==='function'?renderKingdomLeaderboardPanel():''}</div>`;
}

/* ===== ACTIVE WARS LIST ===== */
let warsFilter = 'all';
function setWarsFilter(f){ warsFilter = f; renderBody(); }
function allActiveWars(){
  return Object.values(territoryData).filter(t => t.war)
    .sort((a, b) => warTimestampMs(a.war.roundEndsAt) - warTimestampMs(b.war.roundEndsAt));
}
function warInvolvesKingdom(t, kingdomId){
  return !!kingdomId && (t.war.attackerKingdom === kingdomId || t.ownerKingdom === kingdomId);
}
function renderWarListCard(t, myKingdom){
  const war = t.war;
  const kdAtk = kingdomDef(war.attackerKingdom), kdDef = kingdomDef(t.ownerKingdom);
  const z = ARCADIA_WORLD[t.zone] || ARCADIA_WORLD.plains;
  const idx = Math.max(0, parseInt(t.id.split('_').pop(), 10) - 1);
  const totalDmg = (war.attackerDamage || 0) + (war.defenderDamage || 0);
  const atkPct = totalDmg > 0 ? (war.attackerDamage / totalDmg) * 100 : 50;
  const mine = warInvolvesKingdom(t, myKingdom);
  const endsAtMs = warTimestampMs(war.roundEndsAt);
  const pips = (wins, color) => Array.from({ length: WAR_ROUNDS_TO_WIN }).map((_, i) =>
    `<i style="width:5px;height:5px;border-radius:50%;display:inline-block;margin:0 1px;background:${i < wins ? color : 'rgba(255,255,255,.18)'};"></i>`
  ).join('');
  return `<div class="war-list-card ${mine ? 'mine' : ''}" onclick="openWarModal('${t.id}')">
    <div class="war-list-title"><span>${z.names[idx]}</span><span class="war-list-round"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> Round ${war.round}/3</span></div>
    <div class="war-list-sides">
      <div class="war-list-side">
        <span class="war-list-flag" style="background:${kdAtk ? kdAtk.color : '#555'}">${kdAtk ? kdAtk.emblem : '❔'}</span>
        <span class="war-list-name">${kdAtk ? kdAtk.name : 'Attacker'}</span>
      </div>
      <div class="war-list-vs">VS</div>
      <div class="war-list-side reverse">
        <span class="war-list-name">${kdDef ? kdDef.name : 'Defender'}</span>
        <span class="war-list-flag" style="background:${kdDef ? kdDef.color : '#555'}">${kdDef ? kdDef.emblem : '❔'}</span>
      </div>
    </div>
    <div class="war-list-bar"><div class="war-list-bar-atk" style="width:${atkPct}%"></div></div>
    <div class="war-list-stats">
      <span><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> ${formatWarNumber(war.attackerDamage)}</span>
      <span class="war-list-pips">${pips(war.attackerWins, 'var(--brass-bright)')}<span class="war-list-timer">⏱ ${formatWarCountdown(endsAtMs - Date.now())}</span>${pips(war.defenderWins, 'var(--brass-bright)')}</span>
      <span>${formatWarNumber(war.defenderDamage)} <img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"></span>
    </div>
  </div>`;
}
function goToKingdomMap(){ activeTab = 'zones'; zoneSubTab = 'territory'; territoryZoneView = null; if(!territoryLoaded) loadTerritories(); if(!worldGeometryLoaded) loadWorldGeometry(); renderBody(); }

// Jump from a kingdom's row in the rankings panel straight to their capital
// on the World Map — lets the rankings and the map work as one screen
// instead of two disconnected views (the "country list next to the map"
// layout WarEra's world page uses, applied to our own kingdoms/capitals).
function focusKingdomOnWorldMap(kingdomId){
  activeTab = 'zones'; zoneSubTab = 'territory'; territoryZoneView = null;
  if(!territoryLoaded) loadTerritories();
  if(!worldGeometryLoaded) loadWorldGeometry();
  renderBody();
  setTimeout(()=>{
    const owned = Object.values(territoryData).filter(t => t.ownerKingdom === kingdomId);
    if(!owned.length) return;
    const capital = owned.find(t => isCapitalTerritory(t.id)) || owned[0];
    const idx = Math.max(0, parseInt(capital.id.split('_').pop(), 10) - 1);
    selectArcadiaTerritory(capital.id);
    focusArcadiaTerritory(capital.zone, idx);
  }, 60);
}
function renderActiveWarsList(){
  if(!db) return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);"><img class="ui-icon" src="${ICONS.offline}" alt="🔌"> Kingdom warfare requires cloud save (Firebase) to be configured.</div>`;
  if(!territoryLoaded){ loadTerritories(); return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);">Loading active wars…</div>`; }
  if(!worldGeometryLoaded){ loadWorldGeometry(); return `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);"><img class="ui-icon" src="${ICONS.globe}" alt="🌍"> Loading world borders…</div>`; }
  const myKingdom = state.allianceId;
  const all = allActiveWars();
  const tabs = [
    { id:'all', label:`<img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> All`, wars: all },
    { id:'mine', label:`<img class="ui-icon" src="${ICONS.flag_red}" alt="🚩"> Your Kingdom`, wars: all.filter(t => warInvolvesKingdom(t, myKingdom)) },
    { id:'others', label:`<img class="ui-icon" src="${ICONS.eye}" alt="👁"> Others`, wars: all.filter(t => !warInvolvesKingdom(t, myKingdom)) },
  ];
  const active = tabs.find(tb => tb.id === warsFilter) || tabs[0];
  const tabsHtml = `<div class="wars-filter-tabs">${tabs.map(tb =>
    `<button class="wars-filter-btn ${warsFilter === tb.id ? 'active' : ''}" onclick="setWarsFilter('${tb.id}')">${tb.label}<span class="wars-filter-count">${tb.wars.length}</span></button>`
  ).join('')}</div>`;
  // The world map is shown here too (not just inside Kingdom Map), so this
  // view is never just an empty list when there are no active sieges —
  // worldGeometryError isn't fatal for this view (the list still works),
  // so the map is only skipped, not the whole tab.
  const mapHtml = !worldGeometryError
    ? renderKingdomMapSVG(myKingdom)
    : `<div class="panel" style="padding:16px;text-align:center;color:var(--dim);font-size:12px;margin-bottom:12px;"><img class="ui-icon" src="${ICONS.warning}" alt="⚠"> Couldn't load world borders for the map (list below still works). <button class="mini-btn" onclick="retryLoadWorldGeometry()">Retry</button></div>`;
  if(typeof loadKingdomLeaderboard === 'function' && !kingdomLeaderboard && !kingdomLeaderboardLoading) loadKingdomLeaderboard(false).then(()=>{ if(activeTab==='zones') renderBody(); });
  const body = active.wars.length
    ? `<div class="wars-grid">${active.wars.map(t => renderWarListCard(t, myKingdom)).join('')}</div>`
    : `<div class="panel" style="padding:30px;text-align:center;color:var(--dim);"><img class="ui-icon" src="${ICONS.dove}" alt="🕊"> No active sieges in this view right now.</div>`;
  setTimeout(()=>{bindArcadiaMapInteractions(); renderArcadiaMapTransform(); renderArcadiaMapSelection();},0);
  return `<div class="wrap animate-fade">${renderCoreHeader()}${mapHtml}${typeof renderKingdomLeaderboardPanel==='function'?renderKingdomLeaderboardPanel():''}${tabsHtml}${body}</div>`;
}

/* ===== WAR DETAIL MODAL ===== */
let activeWarModalId = null;
function openWarModal(tid){ activeWarModalId = tid; renderBody(); }
function closeWarModal(){ activeWarModalId = null; renderBody(); }

// Renders everything INSIDE .war-modal (not the .war-modal-backdrop wrapper
// itself) — split out so patchWarDetailModal() below can refresh the modal's
// contents without recreating the backdrop, which is what was making the
// modal flash/reset on every single attack or defend click (the backdrop
// carries the warModalFade CSS entrance animation — see style.css — and a
// plain renderBody() tears down and recreates it along with the rest of
// #app on every state change, replaying that fade-in each time). Same fix
// as patchMarketDetailModal() above, applied to the war modal.
function renderWarModalContent(t){
  const war = t.war;
  const kdAtk = kingdomDef(war.attackerKingdom), kdDef = kingdomDef(t.ownerKingdom);
  const z = ARCADIA_WORLD[t.zone] || ARCADIA_WORLD.plains;
  const idx = Math.max(0, parseInt(t.id.split('_').pop(), 10) - 1);
  const endsAtMs = warTimestampMs(war.roundEndsAt);
  const startedMs = warTimestampMs(war.startedAt) || Date.now();
  const totalDmg = (war.attackerDamage || 0) + (war.defenderDamage || 0);
  const atkPct = totalDmg > 0 ? (war.attackerDamage / totalDmg) * 100 : 50;
  const defPct = 100 - atkPct;
  const cost = getEnergyCost(state, TERRITORY_ATTACK_ENERGY);
  const atkColor = kdAtk ? kdAtk.color : 'var(--copper)';
  const defColor = kdDef ? kdDef.color : 'var(--brass)';

  return `<button class="war-modal-close" onclick="closeWarModal()"><img class="ui-icon" src="${ICONS.close}" alt="✕"></button>
      <div class="war-modal-started">Started ${formatWarCountdown(Date.now() - startedMs)} ago</div>

      <div class="war-modal-fighters">
        <div class="war-modal-fighters-col">${renderWarFightersColumn(war, 'attack', kdAtk)}</div>
        <div class="war-modal-round-box">
          <div class="war-modal-round-pip" style="color:${atkColor};">${war.attackerWins || 0}</div>
          <div class="war-modal-round-icon"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"></div>
          <div class="war-modal-round-pip" style="color:${defColor};">${war.defenderWins || 0}</div>
        </div>
        <div class="war-modal-fighters-col reverse">${renderWarFightersColumn(war, 'defend', kdDef)}</div>
      </div>

      <div class="war-modal-title">${z.icon || `<img class="ui-icon" src="${ICONS.zones_map}" alt="🗺">`} ${z.names[idx]}</div>

      <div class="war-modal-kingdoms">
        <div class="war-modal-kd" style="flex-direction:column;align-items:flex-start;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="war-modal-kd-emblem" style="background:${atkColor}">${kdAtk ? kdAtk.emblem : '❔'}</span>
            <span class="war-modal-kd-name" style="color:${atkColor}">${kdAtk ? kdAtk.name : 'Attacker'}</span>
          </div>
          <button class="war-modal-btn attack" onclick="contributeToWar('${t.id}','attack')" style="width:100%;background:color-mix(in srgb, ${atkColor} 18%, transparent);border:1px solid color-mix(in srgb, ${atkColor} 55%, transparent);color:${atkColor};">
            <img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> ATTACK<div class="war-modal-btn-cost">−${cost} energy</div>
          </button>
        </div>
        <div class="war-modal-kd reverse" style="flex-direction:column;align-items:flex-end;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="war-modal-kd-name" style="color:${defColor}">${kdDef ? kdDef.name : 'Defender'}</span>
            <span class="war-modal-kd-emblem" style="background:${defColor}">${kdDef ? kdDef.emblem : '❔'}</span>
          </div>
          <button class="war-modal-btn defend" onclick="contributeToWar('${t.id}','defend')" style="width:100%;background:color-mix(in srgb, ${defColor} 18%, transparent);border:1px solid color-mix(in srgb, ${defColor} 55%, transparent);color:${defColor};">
            <img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"> DEFEND<div class="war-modal-btn-cost">−${cost} energy</div>
          </button>
        </div>
      </div>

      <div class="war-modal-timerbar">
        <span class="war-modal-round-label"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"> Round ${war.round}<span style="opacity:.6">/3</span></span>
        <span class="war-countdown war-modal-timer" data-ends="${endsAtMs}">⏱ ${formatWarCountdown(endsAtMs - Date.now())}</span>
      </div>

      <div class="war-modal-bar">
        <div class="war-modal-bar-atk" style="width:${atkPct}%;background:${atkColor};">${atkPct >= 15 ? atkPct.toFixed(0) + '%' : ''}</div>
        <div class="war-modal-bar-def" style="width:${defPct}%;background:${defColor};">${defPct >= 15 ? defPct.toFixed(0) + '%' : ''}</div>
      </div>
      <div class="war-modal-dmg-row">
        <span><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"> ${formatWarNumber(war.attackerDamage)} · ${war.attackerHits || 0} strikes</span>
        <span>${war.defenderHits || 0} strikes · ${formatWarNumber(war.defenderDamage)} <img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥"></span>
      </div>

      <div class="war-modal-note">Fight for either side — your strikes count for whichever banner you choose.</div>

      <div class="war-modal-ranking-title"><img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> Full Battle Ranking</div>
      ${renderWarFullRanking(war, kdAtk, kdDef)}`;
}

function renderWarDetailModal(){
  const t = territoryData[activeWarModalId];
  if(!t || !t.war){ activeWarModalId = null; return ''; }
  return `<div class="war-modal-backdrop" onclick="if(event.target===this)closeWarModal()">
    <div class="war-modal">${renderWarModalContent(t)}</div>
  </div>`;
}

// Same idea as patchMarketDetailModal(): update the war modal's contents
// in place instead of tearing the whole thing down via renderBody().
// Returns false (caller falls back to renderBody()) if it isn't mounted,
// its territory data isn't loaded, or the war already ended.
function patchWarDetailModal(){
  if(!activeWarModalId) return false;
  const box = document.querySelector('.war-modal-backdrop > .war-modal');
  if(!box) return false;
  const t = territoryData[activeWarModalId];
  if(!t || !t.war) return false;
  box.innerHTML = renderWarModalContent(t);
  return true;
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
      <button class="act-btn" style="width:auto;padding:6px 12px;font-size:11px;" onclick="closeZoneTerritoryView()"><img class="ui-icon" src="${ICONS.arrow_left}" alt="←"> Back to Map</button>
      <div style="font-size:26px;">${z.icon}</div>
      <div>
        <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);">${z.name} Outposts</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">Borders: ${borderNames}</div>
      </div>
    </div>
    <div class="panel" style="padding:10px 14px;font-size:12px;margin-bottom:12px;">
      <img class="ui-icon" src="${ICONS.alliance}" alt="🏛"> ${taxKd ? `${taxKd.emblem} ${taxKd.name} taxes gathering and kills here at <b style="color:var(--brass-bright);">${taxPct}%</b>` : `<img class="ui-icon" src="${ICONS.energy}" alt="⚡"> No kingdom holds a clear majority here — the zone is contested and untaxed`}
    </div>
    ${myKingdom && !reachable ? `<div class="panel" style="padding:10px 14px;color:var(--red);font-size:12px;margin-bottom:12px;"><img class="ui-icon" src="${ICONS.lock}" alt="🔒"> Your kingdom doesn't hold ground here or in a bordering zone yet — you can't declare war on these outposts until it does.</div>` : ''}
    ${!myKingdom ? `<div class="panel" style="padding:10px 14px;color:var(--dim);font-size:12px;margin-bottom:12px;">Pledge allegiance to a kingdom to wage war or reinforce outposts.</div>` : ''}
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));">
      ${list.map(t => {
        const kd = kingdomDef(t.ownerKingdom);
        const mine = t.ownerKingdom === myKingdom;
        const isCapital = isCapitalTerritory(t.id);
        const canWar = canDeclareWar(t);
        const onCooldown = isOnWarCooldown(t);
        const routeLabel = territoryRouteLabel(t.id);
        return `<div class="card" style="padding:14px;text-align:center;${isCapital ? 'border-color:var(--brass);' : ''}">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">${t.id.toUpperCase()}${isCapital ? ` <img class="ui-icon" src="${ICONS.alliance}" alt="🏛">` : ''}</div>
          ${routeLabel ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--brass-dim);text-transform:uppercase;letter-spacing:.04em;margin-top:2px;">${isCoreGateTerritory(t.id) ? `<img class="ui-icon" src="${ICONS.castle}" alt="🏯">` : '↳'} ${routeLabel} — Core route</div>` : ''}
          <div style="font-size:12px;font-weight:700;color:${kd ? kd.color : 'var(--dim)'};margin:6px 0;">${kd ? kd.emblem + ' ' + kd.name : 'Unclaimed'}</div>
          <div style="font-size:11px;color:var(--dim);"><img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"> ${t.defense} defense</div>
          ${isCapital ? `<div style="margin-top:8px;font-size:10px;color:var(--brass-bright);font-weight:600;"><img class="ui-icon" src="${ICONS.alliance}" alt="🏛"> Capital — fortified, unconquerable</div>`
            : t.war ? renderWarBlock(t)
            : (mine
              ? `<button class="act-btn buy" style="margin-top:8px;width:100%;font-size:11px;" onclick="reinforceTerritory('${t.id}')">Reinforce (${TERRITORY_REINFORCE_GOLD}g)</button>`
              : `<button class="act-btn ${canWar ? 'copper' : ''}" style="margin-top:8px;width:100%;font-size:11px;" ${canWar ? '' : 'disabled'} onclick="declareWar('${t.id}')">${!myKingdom ? 'Join a kingdom' : onCooldown ? '⏳ Cooldown' : canWar ? '<img class="ui-icon" src="${ICONS.horn}" alt="📯"> Declare War' : '<img class="ui-icon" src="${ICONS.lock}" alt="🔒"> Officers only / Unreachable'}</button>`)}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
