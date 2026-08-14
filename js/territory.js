/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Kingdom Territory Conquest
   Each of the 6 adventure zones (ZONES, defined in state.js) doubles
   as a kingdom's homeland. Every zone holds a handful of outposts;
   kingdoms fight over them via Firestore, and the golden rule of
   expansion applies everywhere:

     A kingdom may only attack (or otherwise claim) outposts in a
     zone that already borders a zone it holds ground in.

   Zone adjacency (ring + one chord, exactly as designed):
     Plains  (Europe)         ↔ Forest, Mountain, Swamp
     Forest  (Asia)           ↔ Plains, Cave
     Cave    (North America)  ↔ Forest, Dark
     Dark    (South America)  ↔ Cave, Swamp
     Swamp   (Arab World)     ↔ Dark, Mountain, Plains
     Mountain(Africa)         ↔ Swamp, Plains
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

// Each adventure zone is a kingdom's ancestral homeland (matches KINGDOMS in alliance.js).
const ZONE_HOME_KINGDOM = {
  plains: 'europe', forest: 'asia', cave: 'north_america',
  dark: 'south_america', swamp: 'arab_world', mountain: 'africa',
};
const KINGDOM_HOME_ZONE = {};
Object.keys(ZONE_HOME_KINGDOM).forEach(z => { KINGDOM_HOME_ZONE[ZONE_HOME_KINGDOM[z]] = z; });

const TERRITORIES_PER_ZONE = 5;
const TERRITORY_CAPITAL_INDEX = 1;      // outpost N°1 in every zone is that kingdom's capital — fortified, can never be captured
const TERRITORY_BASE_DEFENSE = 60;      // starting defense when the world is seeded
const TERRITORY_CAPTURE_DEFENSE = 90;   // defense an outpost gets right after being captured (garrison dug in)
const TERRITORY_ATTACK_ENERGY = 8;      // base energy cost per attack (before class/skill reduction)
const TERRITORY_REINFORCE_GOLD = 200;
const TERRITORY_REINFORCE_AMOUNT = 40;

// A kingdom needs a clear majority of a zone's outposts to be its taxable "owner" — a contested
// zone (no majority) is neutral and collects no tax, per the golden rule that ownership must be real.
const ZONE_MAJORITY_THRESHOLD = Math.ceil((TERRITORIES_PER_ZONE + 1) / 2); // 3 of 5

// Tax rate scales with a zone's monster/resource tier (see ZONES.levelMin in state.js) —
// stronger zones tax higher, since they're worth more to hold.
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

/* ===== VIEW STATE (not persisted — mirrors the allianceView pattern) ===== */
let territoryData = {};        // { [territoryId]: {id, zone, ownerKingdom, defense, capturedBy, capturedByName} }
let territoryLoaded = false;
let territoryLoading = false;
let territoryZoneView = null;  // zone id currently expanded in the map UI, or null for the overview
let zoneSubTab = 'adventure';  // 'adventure' | 'territory' — sub-tab inside the Zones nav tab
let pendingTax = {};           // { [kingdomId]: { [resourceKey]: amount } } accrued locally, flushed to Firestore periodically
let territoryLoadError = null; // last load/seed failure message (e.g. Firestore rules blocking 'territories'/'meta'), or null

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
    // Mark as "loaded" (attempted) even on failure so the UI doesn't loop calling
    // loadTerritories() on every render — instead it shows territoryLoadError with
    // a manual retry button. Permission-denied here almost always means the
    // 'territories'/'meta' collections are missing from the Firestore security rules.
    territoryLoaded = true;
    territoryLoadError = e.code === 'permission-denied'
      ? "Firestore blocked access to the 'territories' collection. Add read/write rules for 'territories' and 'meta' in the Firebase console."
      : (e.message || 'Failed to load territories.');
  }
  territoryLoading = false;
  // Lazy loads (triggered from inside a render pass) need to repaint once data lands,
  // the same way loadKingdomsList() does for the kingdom browse list.
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
  if(!db) { territoryLoaded = true; return; }
  await ensureTerritoriesSeeded();
  await loadTerritories(true);
}

/* ===== QUERIES ===== */
function territoriesInZone(zone){
  return Object.values(territoryData).filter(t => t.zone === zone).sort((a, b) => a.id.localeCompare(b.id));
}
function kingdomOwnsAnyIn(kingdomId, zone){
  if(!kingdomId) return false;
  return territoriesInZone(zone).some(t => t.ownerKingdom === kingdomId);
}
// The golden rule: a kingdom can only act on a zone that borders (or contains) ground it already holds.
function kingdomHasFootholdNear(kingdomId, zone){
  if(!kingdomId) return false;
  if(kingdomOwnsAnyIn(kingdomId, zone)) return true;
  return (ZONE_ADJACENCY[zone] || []).some(adj => kingdomOwnsAnyIn(kingdomId, adj));
}
// Majority owner among a zone's outposts — used to tint the zone on the overview map.
function zoneController(zone){
  const list = territoriesInZone(zone);
  if(!list.length) return ZONE_HOME_KINGDOM[zone];
  const counts = {};
  list.forEach(t => { counts[t.ownerKingdom] = (counts[t.ownerKingdom] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
}
// The kingdom that actually TAXES this zone — requires a clear majority (>=3/5), not just a plurality.
// A contested zone (no majority owner) is neutral: nobody collects tax there.
function zoneTaxOwner(zone){
  const list = territoriesInZone(zone);
  if(!list.length) return null;
  const counts = {};
  list.forEach(t => { counts[t.ownerKingdom] = (counts[t.ownerKingdom] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topKingdom, topCount] = sorted[0] || [null, 0];
  return topCount >= ZONE_MAJORITY_THRESHOLD ? topKingdom : null;
}

/* ===== ZONE TAX (economy) =====
   Every gather or monster kill in an owned zone skims a cut for that
   zone's controlling kingdom's treasury — applies to every player,
   including members of the owning kingdom itself. Neutral (contested)
   zones charge no tax. Amounts are accrued locally and flushed to
   Firestore in a batch (see flushZoneTax), the same cadence as
   syncToFirestore, so a busy player doesn't hammer the database. */
function applyZoneTax(zoneId, resourceKey, grossAmount){
  if(grossAmount <= 0) return { net: grossAmount, tax: 0 };
  if(!db || !territoryLoaded) return { net: grossAmount, tax: 0 }; // don't guess ownership before we've loaded it
  const owner = zoneTaxOwner(zoneId);
  if(!owner) return { net: grossAmount, tax: 0 }; // contested/neutral zone — no tax
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
        // First tax ever collected for this kingdom — seed the doc exactly like joinKingdom() does,
        // so it renders correctly even before anyone has formally pledged to it.
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
    keys.forEach(k => { pendingTax[kingdomId][k] = (pendingTax[kingdomId][k] || 0) + amounts[k]; }); // retry next flush
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
  const roll = 0.85 + Math.random() * 0.3; // 0.85x–1.15x swing per attack
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
      if(cur.ownerKingdom !== state.allianceId) return; // lost it since — don't spend gold on someone else's outpost
      tx.update(ref, { defense: (cur.defense || TERRITORY_BASE_DEFENSE) + TERRITORY_REINFORCE_AMOUNT });
    });
    t.defense = (t.defense || TERRITORY_BASE_DEFENSE) + TERRITORY_REINFORCE_AMOUNT;
    showToast('🛠️', 'Reinforced', `${tid} defense increased.`);
  }catch(e){
    console.error('[Arcadia Territory] Reinforce failed:', e.code || e.name, e.message);
    state.gold += TERRITORY_REINFORCE_GOLD; // refund on failure
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
