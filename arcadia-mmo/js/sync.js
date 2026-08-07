/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Firestore Sync Helpers (shared by setup + game)
   ═══════════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════════
// ARCADIA MMO — Game Engine
// ═══════════════════════════════════════════════════════════════
// Sections:
//   1. Firebase Config (replace with your credentials)
//   2. Game Data (items, recipes, zones, classes, gear tables)
//   3. State & Save System
//   4. Core Game Logic
//   5. Battle System
//   6. Renderers (UI generation)
//   7. Event Handlers
// ═══════════════════════════════════════════════════════════════
let isSyncing = false;
const SYNC_INTERVAL = 10000;
let lastSyncTime = 0;

async function syncToFirestore(){
  if(!UID || isSyncing || !db) return;
  isSyncing = true;
  try{
    const data = stateToFirestore(state);
    await db.collection('players').doc(UID).update(data);
    lastSyncTime = Date.now();
    const dot = document.querySelector('.save-dot');
    if(dot){ dot.classList.add('flash'); setTimeout(()=>dot.classList.remove('flash'), 500); }
  }catch(e){ console.error('Sync failed:', e); }
  isSyncing = false;
}

function stateToFirestore(s){
  return {
    level: s.level, xp: s.xp, xpToNext: s.xpToNext, gold: s.gold,
    stamina: s.energy, maxStamina: s.maxEnergy,
    hp: s.health, maxHp: getMaxHealth(s),
    mana: s.mana, maxMana: s.maxMana,
    resources: s.inv, companies: s.companies,
    gear: s.equipped, gearBag: s.gearBag,
    skills: s.skills, skillPoints: s.skillPoints,
    classSkills: s.classSkills, classSkillPoints: s.classSkillPoints,
    prestige: s.prestige, combat: s.combat,
    totalGoldEarned: s.totalGoldEarned,
    shards: s.shards, gems: s.gems,
    playerClass: s.playerClass, potions: s.potions,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        // Advanced Market
    marketTab: s.marketTab, marketSearch: s.marketSearch,
    marketLevelFilter: s.marketLevelFilter,
    watchedItems: s.watchedItems, marketNotifications: s.marketNotifications,
  };
}

async function loadFromFirestore(){
  if(!UID || !db) return false;
  try{
    const doc = await db.collection('players').doc(UID).get();
    if(!doc.exists) return false;
    const data = doc.data();
    state = firestoreToState(data);
    migrateState(state);
    return true;
  }catch(e){ console.error('Load failed:', e); return false; }
}

function firestoreToState(data){
  const inv = data.resources || {};
  const prices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prices[k]=MARKET_CATALOG[k].basePrice);
  const prevPrices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prevPrices[k]=MARKET_CATALOG[k].basePrice);
  const priceHistory = {}; Object.keys(MARKET_CATALOG).forEach(k=> priceHistory[k]=[MARKET_CATALOG[k].basePrice]);
  return {
    version: 8, level: data.level || 1, xp: data.xp || 0, xpToNext: data.xpToNext || 35,
    gold: data.gold || 100, energy: data.stamina || 100, maxEnergy: data.maxStamina || 100,
    lastEnergyTs: Date.now(), storageCap: 500,
    inv: inv, prices: prices, prevPrices: prevPrices, priceHistory: priceHistory, lastPriceTs: Date.now(),
    combat: data.combat || { wins:0, losses:0 }, missions: null, leaderboard: null,
    lastLbEvolve: Date.now(), log: [], lastTimestamp: Date.now(),
    prestige: data.prestige || { points:0, gatherBonus:0, sellBonus:0, energyBonus:0, storageBonus:0 },
    totalGoldEarned: data.totalGoldEarned || 100,
    skills: data.skills || { health:0, damage:0, defense:0, stamina:0, storage:0, profit:0 },
    skillPoints: data.skillPoints || 0, health: data.hp || 100, lastHealthRegenTs: Date.now(),
    mana: data.mana || 20, maxMana: data.maxMana || 20, lastManaRegenTs: Date.now(),
    equipped: data.gear || { weapon:null, armor:null, helmet:null, boots:null, accessory:null, gloves:null },
    gearBag: data.gearBag || [], shards: data.shards || 0, gems: data.gems || 0,
    companies: data.companies || [], companyBuildResource: null, companyMenuOpen: null, companyChangeResourceId: null,
    playerClass: data.playerClass || null, classSkills: data.classSkills || {}, classSkillPoints: data.classSkillPoints || 0,
    classResets: 0, lastClassReset: 0, potions: data.potions || { health:0, energy:0 },
    battleLog: [], battleActive: false, battleResult: null,
        // Advanced Market
    marketTab: data.marketTab || 'all', marketSearch: data.marketSearch || '',
    marketLevelFilter: data.marketLevelFilter || 0,
    watchedItems: data.watchedItems || [], marketNotifications: data.marketNotifications || [],
  };
}

async function loadUsername(){
  if(!UID || !db) return;
  try{
    const doc = await db.collection('players').doc(UID).get();
    if(doc.exists){
      const data = doc.data();
      window.__playerUsername = data.username || 'Player';
      renderHeader();
    }
  }catch(e){}
}

function logout(){
  if(confirm('Do you want to log out? Your progress will be saved.')){
    syncToFirestore().then(()=>{
      if (auth) auth.signOut().then(()=>{ location.reload(); });
      else location.reload();
    });
  }
}

async function linkGoogleAccount(){
  if(!auth || !auth.currentUser || !auth.currentUser.isAnonymous) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  try{
    const result = await auth.currentUser.linkWithPopup(provider);
    EMAIL = result.user.email;
    await syncToFirestore();
    if (db) await db.collection('players').doc(UID).update({ email: EMAIL });
    renderBody();
    alert('Your account has been linked successfully! You can now log in with this account from any device.');
  } catch(err){
    console.error(err);
    if(err.code === 'auth/credential-already-in-use'){
      alert('This account is already linked to another Arcadia account.');
    } else {
      alert('Account linking failed: ' + (err.message || 'Unknown error'));
    }
  }
}
