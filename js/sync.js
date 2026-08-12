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
    // Alliance (membership is the source of truth on the players doc;
    // allianceId/allianceRole are also updated directly by alliance.js actions)
    allianceId: s.allianceId, allianceRole: s.allianceRole,
    allianceJoinCooldownUntil: s.allianceJoinCooldownUntil,
    allianceDisbandCooldownUntil: s.allianceDisbandCooldownUntil,
    // Profile (previously never synced, so avatar/bio/theme/username changes were lost on reload)
    username: s.username, avatar: s.avatar, bio: s.bio,
    language: s.language, theme: s.theme, fontSize: s.fontSize, accentColor: s.accentColor,
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
  // Start with every current catalog item at 0, then overlay whatever the player already has.
  // This prevents missing keys (e.g. newly added weapons/items) from being undefined later.
  const inv = {};
  Object.keys(MARKET_CATALOG).forEach(k=> inv[k]=0);
  Object.assign(inv, data.resources || {});
  const prices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prices[k]=MARKET_CATALOG[k].basePrice);
  const prevPrices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prevPrices[k]=MARKET_CATALOG[k].basePrice);
  const priceHistory = {}; Object.keys(MARKET_CATALOG).forEach(k=> priceHistory[k]=[MARKET_CATALOG[k].basePrice]);
  return {
    version: 8, level: data.level || 1, xp: data.xp || 0, xpToNext: data.xpToNext || 35,
    gold: data.gold || 100, energy: data.stamina || 100, maxEnergy: data.maxStamina || 100,
    lastEnergyTs: Date.now(), storageCap: 500,
    inv: inv, prices: prices, prevPrices: prevPrices, priceHistory: priceHistory, lastPriceTs: Date.now(),
    combat: data.combat || { wins:0, losses:0 }, missions: null,
    log: [], lastTimestamp: Date.now(),
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
    // Alliance
    allianceId: data.allianceId || null, allianceRole: data.allianceRole || null,
    allianceJoinCooldownUntil: data.allianceJoinCooldownUntil || 0,
    allianceDisbandCooldownUntil: data.allianceDisbandCooldownUntil || 0,
    // Profile (was missing — caused the player's name to not show up in Settings)
    username: data.username || 'Player',
    avatar: data.avatar || '🧙',
    bio: data.bio || '',
    language: data.language || 'en',
    theme: data.theme || 'dark',
    fontSize: data.fontSize || 'medium',
    accentColor: data.accentColor || '#d4a24c',
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
    stopGlobalChatListener();
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

/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Real Leaderboard (live query against players collection)
   ═══════════════════════════════════════════════════════════════ */
const LEADERBOARD_SIZE = 20;
let leaderboardByGold = null;   // [{uid,name,avatar,level,gold}] or null = not loaded yet
let leaderboardByLevel = null;
let leaderboardLoading = false;
let leaderboardError = '';
let lastLeaderboardFetch = 0;
const LEADERBOARD_REFRESH_MS = 30000; // don't hammer Firestore on every tab open

function playerDocToLbRow(doc){
  const d = doc.data();
  return {
    uid: doc.id,
    name: d.username || 'Player',
    avatar: d.avatar || '🧙',
    level: d.level || 1,
    gold: d.gold || 0,
    me: doc.id === UID,
  };
}

async function loadRealLeaderboard(force){
  if(!db){ leaderboardError = 'Leaderboard needs a cloud connection.'; return; }
  if(leaderboardLoading) return;
  if(!force && leaderboardByGold && (Date.now() - lastLeaderboardFetch < LEADERBOARD_REFRESH_MS)) return;
  leaderboardLoading = true;
  leaderboardError = '';
  try{
    const [goldSnap, levelSnap] = await Promise.all([
      db.collection('players').orderBy('gold', 'desc').limit(LEADERBOARD_SIZE).get(),
      db.collection('players').orderBy('level', 'desc').limit(LEADERBOARD_SIZE).get(),
    ]);
    leaderboardByGold = goldSnap.docs.map(playerDocToLbRow);
    leaderboardByLevel = levelSnap.docs.map(playerDocToLbRow);
    lastLeaderboardFetch = Date.now();
  }catch(e){
    console.error('[Arcadia Leaderboard] Load failed:', e.code || e.name, e.message);
    leaderboardError = e.code === 'permission-denied'
      ? "Couldn't load the leaderboard (Firestore rules must allow read access to the players collection)."
      : "Couldn't load the leaderboard right now.";
  }
  leaderboardLoading = false;
}

async function openLeaderboardTab(){
  activeTab = 'leaderboard';
  renderBody();
  await loadRealLeaderboard(false);
  renderBody();
}

function refreshLeaderboard(){
  loadRealLeaderboard(true).then(renderBody);
}

/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Global Chat (server-wide, floating button + modal)
   ═══════════════════════════════════════════════════════════════ */
let globalChatMsgs = [];
let globalChatUnsub = null;
let globalChatOpen = false;
let globalChatUnread = 0;
let globalChatFirstLoad = true;
let lastGlobalChatSendTs = 0;
const GLOBAL_CHAT_COOLDOWN_MS = 1500;

function startGlobalChatListener(){
  if(!db || globalChatUnsub) return;
  globalChatFirstLoad = true;
  globalChatUnsub = db.collection('globalChat')
    .orderBy('ts','desc').limit(50)
    .onSnapshot(snap=>{
      const msgs = snap.docs.map(d=>({ id:d.id, ...d.data() })).reverse();
      const grew = !globalChatFirstLoad && msgs.length > globalChatMsgs.length;
      globalChatFirstLoad = false;
      globalChatMsgs = msgs;
      if(globalChatOpen){
        const el = document.getElementById('globalChatMsgs');
        if(el){ el.innerHTML = renderGlobalChatMsgsHTML(); el.scrollTop = el.scrollHeight; }
      } else if(grew){
        globalChatUnread++;
        renderGlobalChatFab();
      }
    }, err=> console.error('Global chat listener error', err));
}
function stopGlobalChatListener(){
  if(globalChatUnsub){ globalChatUnsub(); globalChatUnsub = null; }
}

function renderGlobalChatFab(){
  let btn = document.getElementById('globalChatFab');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'globalChatFab';
    btn.className = 'chat-fab';
    btn.title = 'Global Chat';
    btn.onclick = openGlobalChat;
    document.body.appendChild(btn);
  }
  btn.innerHTML = `💬${globalChatUnread>0?`<span class="chat-fab-badge">${globalChatUnread>99?'99+':globalChatUnread}</span>`:''}`;
}

function renderGlobalChatMsgsHTML(){
  return globalChatMsgs.length ? globalChatMsgs.map(m=>{
    const name = (m.username || 'Player').replace(/</g,'&lt;');
    const text = (m.text || '').replace(/</g,'&lt;');
    const avatar = (m.avatar || '🧙').replace(/</g,'&lt;');
    const mine = m.uid === UID;
    return `
    <div class="chat-msg-row ${mine?'mine':''}">
      <div class="chat-msg-avatar" onclick="viewChatProfile('${m.uid}')" title="View profile">${avatar}</div>
      <div class="chat-msg-bubble">
        <div class="chat-msg-meta">
          <span class="chat-msg-name" onclick="viewChatProfile('${m.uid}')">${name}</span>
          <span class="chat-msg-time">${allianceTimeAgo(m.ts)}</span>
        </div>
        <div class="chat-msg-text">${text}</div>
      </div>
    </div>`;
  }).join('') : `<div style="text-align:center;color:var(--dim);font-size:12px;padding:20px;">No messages yet. Say hello to Arcadia!</div>`;
}

async function viewChatProfile(uid){
  if(!db || !uid) return;
  let modal = document.getElementById('chatProfileModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'chatProfileModal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-overlay" style="z-index:120;" onclick="if(event.target===this)closeChatProfile()">
      <div class="modal-box" style="max-width:300px;">
        <div class="modal-header"><h3>Player Profile</h3><button class="modal-close" onclick="closeChatProfile()">✕</button></div>
        <div style="padding:30px 20px;text-align:center;color:var(--dim);font-size:13px;">Loading…</div>
      </div>
    </div>`;
  try{
    const doc = await db.collection('players').doc(uid).get();
    const box = modal.querySelector('.modal-box');
    if(!doc.exists){
      box.innerHTML = `<div class="modal-header"><h3>Player Profile</h3><button class="modal-close" onclick="closeChatProfile()">✕</button></div>
        <div style="padding:30px 20px;text-align:center;color:var(--dim);font-size:13px;">This player no longer exists.</div>`;
      return;
    }
    const d = doc.data();
    const cls = (d.class || 'adventurer').replace(/</g,'&lt;');
    const clsColor = `var(--${d.class||'brass'},var(--brass))`;
    box.innerHTML = `
      <div class="modal-header"><h3>Player Profile</h3><button class="modal-close" onclick="closeChatProfile()">✕</button></div>
      <div style="padding:24px 20px;text-align:center;">
        <div class="profile-hero-avatar" style="margin:0 auto 12px;">${d.avatar || '🧙'}</div>
        <div class="profile-hero-name">${(d.username||'Player').replace(/</g,'&lt;')}</div>
        <div style="color:${clsColor};font-size:12px;font-weight:600;text-transform:capitalize;margin:4px 0 2px;">${cls}</div>
        <div style="color:var(--dim);font-size:11px;margin-bottom:14px;">Level ${d.level||1}</div>
        <div style="display:flex;justify-content:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);">
          <div>⚔️ <b style="color:var(--green);">${(d.combat&&d.combat.wins)||0}</b>W</div>
          <div>💀 <b style="color:var(--red);">${(d.combat&&d.combat.losses)||0}</b>L</div>
          <div>💰 <b style="color:var(--brass-bright);">${d.gold||0}</b></div>
        </div>
      </div>`;
  }catch(e){
    console.error('[Arcadia Chat] Failed to load profile:', e);
    const box = modal.querySelector('.modal-box');
    if(box) box.innerHTML = `<div class="modal-header"><h3>Player Profile</h3><button class="modal-close" onclick="closeChatProfile()">✕</button></div>
      <div style="padding:30px 20px;text-align:center;color:var(--dim);font-size:13px;">Couldn't load this profile.</div>`;
  }
}
function closeChatProfile(){
  const modal = document.getElementById('chatProfileModal');
  if(modal) modal.remove();
}

function renderGlobalChatDrawerHTML(){
  if(!db || !UID){
    return `
      <div class="chat-drawer-header">
        <h3>🌐 Global Chat</h3>
        <button class="modal-close" onclick="closeGlobalChat()">✕</button>
      </div>
      <div style="text-align:center;padding:30px 20px;color:var(--dim);font-size:13px;">Global Chat needs a cloud connection. Sign in to chat with other players.</div>`;
  }
  return `
    <div class="chat-drawer-header">
      <h3>🌐 Global Chat</h3>
      <button class="modal-close" onclick="closeGlobalChat()">✕</button>
    </div>
    <div id="globalChatMsgs" class="chat-drawer-msgs">${renderGlobalChatMsgsHTML()}</div>
    <div class="chat-drawer-input-row">
      <input id="globalChatInput" class="username-input" style="margin-bottom:0;flex:1;" maxlength="300" placeholder="Message everyone…" onkeydown="globalChatKeydown(event)">
      <button class="act-btn buy" style="width:auto;padding:0 16px;" onclick="sendGlobalChatMsg()">Send</button>
    </div>`;
}

function globalChatOutsideClick(ev){
  const drawer = document.getElementById('globalChatDrawer');
  const fab = document.getElementById('globalChatFab');
  if(!drawer) return;
  if(drawer.contains(ev.target) || (fab && fab.contains(ev.target))) return;
  closeGlobalChat();
}
function globalChatEscClose(ev){ if(ev.key === 'Escape') closeGlobalChat(); }

function openGlobalChat(){
  globalChatOpen = true;
  globalChatUnread = 0;
  renderGlobalChatFab();
  let drawer = document.getElementById('globalChatDrawer');
  if(!drawer){
    drawer = document.createElement('div');
    drawer.id = 'globalChatDrawer';
    drawer.className = 'chat-drawer';
    document.body.appendChild(drawer);
  }
  drawer.innerHTML = renderGlobalChatDrawerHTML();
  requestAnimationFrame(()=> drawer.classList.add('open'));
  const el = document.getElementById('globalChatMsgs');
  if(el) el.scrollTop = el.scrollHeight;
  const input = document.getElementById('globalChatInput');
  if(input) input.focus();
  document.addEventListener('click', globalChatOutsideClick, true);
  document.addEventListener('keydown', globalChatEscClose);
  startGlobalChatListener();
}
function closeGlobalChat(){
  globalChatOpen = false;
  const drawer = document.getElementById('globalChatDrawer');
  if(drawer) drawer.classList.remove('open');
  document.removeEventListener('click', globalChatOutsideClick, true);
  document.removeEventListener('keydown', globalChatEscClose);
}
async function sendGlobalChatMsg(){
  const input = document.getElementById('globalChatInput');
  let text = input ? input.value.trim() : '';
  if(!text || !db || !UID) return;
  if(Date.now() - lastGlobalChatSendTs < GLOBAL_CHAT_COOLDOWN_MS) return;
  if(text.length > 300) text = text.slice(0, 300);
  if(input) input.value = '';
  lastGlobalChatSendTs = Date.now();
  try{
    await db.collection('globalChat').add({
      uid: UID, username: window.__playerUsername || 'Player',
      avatar: (typeof state !== 'undefined' && state && state.avatar) || '🧙',
      text, ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }catch(e){ console.error(e); }
}
function globalChatKeydown(ev){ if(ev.key === 'Enter') sendGlobalChatMsg(); }
