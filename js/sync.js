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

// ─── Gold sync: increment-based, not overwrite-based ───
// Every other field here is safe to overwrite wholesale on each periodic
// sync because only THIS player's own client ever changes it. Gold is
// different now that the Player Market is real: another player's buy can
// credit gold to this player's `players/{uid}` doc at any moment (see
// buyFromListing() in marketplace.js), including while this client is
// mid-session. If this sync just wrote `gold: state.gold` wholesale, the
// next periodic tick would silently overwrite (and erase) any sale that
// landed in between. So instead we only ever push the *change* in this
// client's own local gold since its last successful sync, as a Firestore
// increment — which composes correctly with a remote increment no matter
// which one lands first.
let lastSyncedGold = null;

async function syncToFirestore(){
  if(!UID || isSyncing || !db) return;
  isSyncing = true;
  try{
    const data = stateToFirestore(state);
    const goldDelta = lastSyncedGold === null ? state.gold : (state.gold - lastSyncedGold);
    if(goldDelta !== 0){
      data.gold = firebase.firestore.FieldValue.increment(goldDelta);
    } else {
      delete data.gold; // nothing this client changed — don't touch the field at all
    }
    lastSyncedGold = state.gold;
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
    totalAllianceDonated: s.totalAllianceDonated,
    shards: s.shards, gems: s.gems,
    playerClass: s.playerClass, potions: s.potions,
    classResets: s.classResets, lastClassReset: s.lastClassReset,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        // Advanced Market
    marketTab: s.marketTab, marketSearch: s.marketSearch,
    marketLevelFilter: s.marketLevelFilter,
    watchedItems: s.watchedItems, marketNotifications: s.marketNotifications,
    // Last traded price per resource (real trades only — see recordTradePrice).
    prices: s.prices,
    notifications: s.notifications,
    // Alliance (membership is the source of truth on the players doc;
    // allianceId/allianceRole are also updated directly by alliance.js actions)
    allianceId: s.allianceId, allianceRole: s.allianceRole,
    allianceJoinCooldownUntil: s.allianceJoinCooldownUntil,
    allianceDisbandCooldownUntil: s.allianceDisbandCooldownUntil,
    // Arena / PVP (protectedUntil is also read directly by other players'
    // pvp.js when they search for targets, so it must stay in this doc)
    pvp: s.pvp,
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
    lastSyncedGold = state.gold; // baseline so the next sync only pushes what changes locally from here
    return true;
  }catch(e){ console.error('Load failed:', e); return false; }
}

function firestoreToState(data){
  // Start with every current catalog item at 0, then overlay whatever the player already has.
  // This prevents missing keys (e.g. newly added weapons/items) from being undefined later.
  const inv = {};
  Object.keys(MARKET_CATALOG).forEach(k=> inv[k]=0);
  Object.assign(inv, data.resources || {});
  const prices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prices[k]=(data.prices && typeof data.prices[k]==='number') ? data.prices[k] : MARKET_CATALOG[k].basePrice);
  const prevPrices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prevPrices[k]=prices[k]);
  const priceHistory = {}; Object.keys(MARKET_CATALOG).forEach(k=> priceHistory[k]=[prices[k]]);
  return {
    version: 10, level: data.level || 1, xp: data.xp || 0, xpToNext: data.xpToNext || 35,
    gold: data.gold || 100, energy: data.stamina || 100, maxEnergy: data.maxStamina || 100,
    lastEnergyTs: Date.now(), storageCap: 500,
    inv: inv, prices: prices, prevPrices: prevPrices, priceHistory: priceHistory, lastPriceTs: Date.now(),
    combat: data.combat || { wins:0, losses:0 }, missions: null,
    log: [], lastTimestamp: Date.now(),
    prestige: data.prestige || { points:0, gatherBonus:0, sellBonus:0, energyBonus:0, storageBonus:0 },
    totalGoldEarned: data.totalGoldEarned || 100,
    totalAllianceDonated: data.totalAllianceDonated || 0,
    skills: data.skills || { health:0, damage:0, defense:0, stamina:0, storage:0, profit:0 },
    skillPoints: data.skillPoints || 0, health: data.hp || 100, lastHealthRegenTs: Date.now(),
    mana: data.mana || 20, maxMana: data.maxMana || 20, lastManaRegenTs: Date.now(),
    equipped: data.gear || { weapon:null, armor:null, helmet:null, boots:null, accessory:null, gloves:null },
    gearBag: data.gearBag || [], shards: data.shards || 0, gems: data.gems || 0,
    companies: data.companies || [], companyBuildResource: null, companyMenuOpen: null, companyChangeResourceId: null,
    playerClass: data.playerClass || data.class || null, classSkills: data.classSkills || {}, classSkillPoints: data.classSkillPoints || 0,
    classResets: data.classResets || 0, lastClassReset: data.lastClassReset || 0, potions: data.potions || { health:0, energy:0 },
    battleLog: [], battleActive: false, battleResult: null,
        // Advanced Market
    marketTab: data.marketTab || 'all', marketSearch: data.marketSearch || '',
    marketLevelFilter: data.marketLevelFilter || 0,
    watchedItems: data.watchedItems || [], marketNotifications: data.marketNotifications || [],
    notifications: data.notifications || [],
    // Alliance
    allianceId: data.allianceId || null, allianceRole: data.allianceRole || null,
    allianceJoinCooldownUntil: data.allianceJoinCooldownUntil || 0,
    allianceDisbandCooldownUntil: data.allianceDisbandCooldownUntil || 0,
    // Arena / PVP
    pvp: data.pvp || { wins: 0, losses: 0, protectedUntil: 0 },
    // Profile (was missing — caused the player's name to not show up in Settings)
    username: data.username || 'Player',
    avatar: data.avatar || '🧙',
    bio: data.bio || '',
    language: data.language || 'en',
    theme: data.theme || 'dark',
    fontSize: data.fontSize || 'medium',
    accentColor: data.accentColor || '#e0623a',
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
    Promise.all([syncToFirestore(), (typeof flushZoneTax==='function'?flushZoneTax():Promise.resolve())]).then(()=>{
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
let leaderboardByPvpWins = null;
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
    pvpWins: (d.pvp && d.pvp.wins) || 0,
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
    const [goldSnap, levelSnap, pvpSnap] = await Promise.all([
      db.collection('players').orderBy('gold', 'desc').limit(LEADERBOARD_SIZE).get(),
      db.collection('players').orderBy('level', 'desc').limit(LEADERBOARD_SIZE).get(),
      db.collection('players').orderBy('pvp.wins', 'desc').limit(LEADERBOARD_SIZE).get(),
    ]);
    leaderboardByGold = goldSnap.docs.map(playerDocToLbRow);
    leaderboardByLevel = levelSnap.docs.map(playerDocToLbRow);
    leaderboardByPvpWins = pvpSnap.docs.map(playerDocToLbRow);
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
  loadRealLeaderboard(true).then(()=> (typeof renderBodyUnlessTyping==='function' ? renderBodyUnlessTyping() : renderBody()));
}

/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Unified Chat Drawer (Global + Alliance tabs,
   one floating button + one overlay panel)
   ═══════════════════════════════════════════════════════════════ */
let globalChatMsgs = [];
let globalChatUnsub = null;
let globalChatUnread = 0;
let globalChatFirstLoad = true;
let lastGlobalChatSendTs = 0;
const GLOBAL_CHAT_COOLDOWN_MS = 1500;

let chatDrawerOpen = false;
let chatActiveTab = 'global'; // 'global' | 'alliance'

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
      if(chatDrawerOpen && chatActiveTab === 'global'){
        const el = document.getElementById('chatDrawerMsgs');
        if(el){ el.innerHTML = renderChatMsgsHTML(globalChatMsgs); el.scrollTop = el.scrollHeight; }
      } else if(grew){
        globalChatUnread++;
        renderGlobalChatFab();
      }
    }, err=> console.error('Global chat listener error', err));
}
function stopGlobalChatListener(){
  if(globalChatUnsub){ globalChatUnsub(); globalChatUnsub = null; }
}

function chatTotalUnread(){
  return globalChatUnread + (typeof allianceChatUnread !== 'undefined' ? allianceChatUnread : 0);
}

function renderGlobalChatFab(){
  let btn = document.getElementById('globalChatFab');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'globalChatFab';
    btn.className = 'chat-fab';
    btn.title = 'Chat';
    btn.onclick = ()=> openChatDrawer();
    document.body.appendChild(btn);
  }
  const total = chatTotalUnread();
  btn.innerHTML = `💬${total>0?`<span class="chat-fab-badge">${total>99?'99+':total}</span>`:''}`;
}

function renderChatMsgsHTML(msgs){
  return (msgs && msgs.length) ? msgs.map(m=>{
    const name = escapeHtml(m.username || 'Player');
    const text = escapeHtml(m.text || '');
    const avatar = escapeHtml(m.avatar || '🧙');
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
  }).join('') : `<div style="text-align:center;color:var(--dim);font-size:12px;padding:20px;">No messages yet. Say hello!</div>`;
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
    const cls = escapeHtml(d.playerClass || d.class || 'adventurer');
    // d.playerClass also gets used inside a CSS var() lookup below — a raw value
    // there could break out of the style="" attribute, so restrict it to a
    // safe whitelist-like token (letters only) before interpolating.
    const safeClassToken = /^[a-zA-Z_-]{1,30}$/.test(d.playerClass || d.class || '') ? (d.playerClass || d.class) : 'brass';
    const clsColor = `var(--${safeClassToken},var(--brass))`;
    box.innerHTML = `
      <div class="modal-header"><h3>Player Profile</h3><button class="modal-close" onclick="closeChatProfile()">✕</button></div>
      <div style="padding:24px 20px;text-align:center;">
        <div class="profile-hero-avatar" style="margin:0 auto 12px;">${escapeHtml(d.avatar || '🧙')}</div>
        <div class="profile-hero-name">${escapeHtml(d.username||'Player')}</div>
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

function renderChatDrawerTabsHTML(){
  const hasAlliance = !!(typeof state !== 'undefined' && state && state.allianceId);
  const allianceUnreadCount = typeof allianceChatUnread !== 'undefined' ? allianceChatUnread : 0;
  return `
    <div class="chat-drawer-tabs">
      <button class="chat-drawer-tab ${chatActiveTab==='global'?'active':''}" onclick="switchChatTab('global')">
        <img class="ui-icon" src="${ICONS.global_chat}" alt="🌐"> Global${globalChatUnread>0 && chatActiveTab!=='global' ? `<span class="tab-dot">${globalChatUnread>9?'9+':globalChatUnread}</span>` : ''}
      </button>
      <button class="chat-drawer-tab ${chatActiveTab==='alliance'?'active':''} ${hasAlliance?'':'disabled'}" title="${hasAlliance?'':'Join a kingdom to unlock'}" onclick="${hasAlliance?"switchChatTab('alliance')":''}">
        🏰 Kingdom${allianceUnreadCount>0 && chatActiveTab!=='alliance' ? `<span class="tab-dot">${allianceUnreadCount>9?'9+':allianceUnreadCount}</span>` : ''}
      </button>
    </div>`;
}

function renderChatDrawerHTML(){
  if(!db || !UID){
    return `
      <div class="chat-drawer-header">
        <h3>💬 Chat</h3>
        <button class="modal-close" onclick="closeChatDrawer()">✕</button>
      </div>
      <div style="text-align:center;padding:30px 20px;color:var(--dim);font-size:13px;">Chat needs a cloud connection. Sign in to chat with other players.</div>`;
  }
  const hasAlliance = !!(state && state.allianceId);
  const onAlliance = chatActiveTab === 'alliance';
  if(onAlliance && !hasAlliance) chatActiveTab = 'global';
  const title = chatActiveTab === 'alliance' ? '🏰 Kingdom Chat' : '🌐 Global Chat';
  const placeholder = chatActiveTab === 'alliance' ? 'Message your kingdom…' : 'Message everyone…';
  const sendFn = chatActiveTab === 'alliance' ? 'sendAllianceChatMsg()' : 'sendGlobalChatMsg()';
  const keydownFn = chatActiveTab === 'alliance' ? 'allianceChatKeydown(event)' : 'globalChatKeydown(event)';
  const msgs = chatActiveTab === 'alliance' ? (typeof allianceChatMsgs !== 'undefined' ? allianceChatMsgs : []) : globalChatMsgs;
  return `
    <div class="chat-drawer-header">
      <h3>${title}</h3>
      <button class="modal-close" onclick="closeChatDrawer()">✕</button>
    </div>
    ${renderChatDrawerTabsHTML()}
    <div id="chatDrawerMsgs" class="chat-drawer-msgs">${renderChatMsgsHTML(msgs)}</div>
    <div class="chat-drawer-input-row">
      <input id="chatDrawerInput" class="username-input" style="margin-bottom:0;flex:1;" maxlength="300" placeholder="${placeholder}" onkeydown="${keydownFn}">
      <button class="act-btn buy" style="width:auto;padding:0 16px;" onclick="${sendFn}">Send</button>
    </div>`;
}

function switchChatTab(tab){
  if(tab === 'alliance' && !(state && state.allianceId)) return;
  chatActiveTab = tab;
  if(tab === 'alliance'){ allianceChatUnread = 0; if(typeof startAllianceChatListener==='function') startAllianceChatListener(); }
  else { globalChatUnread = 0; }
  const drawer = document.getElementById('globalChatDrawer');
  if(drawer) drawer.innerHTML = renderChatDrawerHTML();
  const el = document.getElementById('chatDrawerMsgs');
  if(el) el.scrollTop = el.scrollHeight;
  const input = document.getElementById('chatDrawerInput');
  if(input) input.focus();
  renderGlobalChatFab();
}

function chatOutsideClick(ev){
  const drawer = document.getElementById('globalChatDrawer');
  const fab = document.getElementById('globalChatFab');
  if(!drawer) return;
  if(drawer.contains(ev.target) || (fab && fab.contains(ev.target))) return;
  closeChatDrawer();
}
function chatEscClose(ev){ if(ev.key === 'Escape') closeChatDrawer(); }

function openChatDrawer(tab){
  chatDrawerOpen = true;
  if(tab === 'alliance' && !(state && state.allianceId)) tab = 'global';
  chatActiveTab = tab || chatActiveTab || 'global';
  if(chatActiveTab === 'alliance'){ allianceChatUnread = 0; if(typeof startAllianceChatListener==='function') startAllianceChatListener(); }
  else globalChatUnread = 0;
  renderGlobalChatFab();
  let drawer = document.getElementById('globalChatDrawer');
  if(!drawer){
    drawer = document.createElement('div');
    drawer.id = 'globalChatDrawer';
    drawer.className = 'chat-drawer';
    document.body.appendChild(drawer);
  }
  drawer.innerHTML = renderChatDrawerHTML();
  requestAnimationFrame(()=> drawer.classList.add('open'));
  const el = document.getElementById('chatDrawerMsgs');
  if(el) el.scrollTop = el.scrollHeight;
  const input = document.getElementById('chatDrawerInput');
  if(input) input.focus();
  document.addEventListener('click', chatOutsideClick, true);
  document.addEventListener('keydown', chatEscClose);
  startGlobalChatListener();
}
function closeChatDrawer(){
  chatDrawerOpen = false;
  const drawer = document.getElementById('globalChatDrawer');
  if(drawer) drawer.classList.remove('open');
  document.removeEventListener('click', chatOutsideClick, true);
  document.removeEventListener('keydown', chatEscClose);
}
// Back-compat aliases (older code/onclick handlers may still reference these names)
function openGlobalChat(){ openChatDrawer('global'); }
function closeGlobalChat(){ closeChatDrawer(); }

async function sendGlobalChatMsg(){
  const input = document.getElementById('chatDrawerInput');
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
