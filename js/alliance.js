/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Kingdom System
   Six fixed kingdoms, one per real-world continent/region. Players
   pledge allegiance to a kingdom (not create their own). Roles,
   treasury, donations, activity, leveling, chat, promotion/kick,
   and leave (with automatic leadership succession) all operate
   within a kingdom exactly like the old alliance system did.
   ═══════════════════════════════════════════════════════════════ */

/* ===== CONFIG: THE SIX KINGDOMS (fixed — cannot be created/renamed/disbanded) ===== */
const KINGDOMS = [
  { id:'europe',        name:'Kingdom of Europe',              emblem:'🏰', color:'#5b7fb8', description:'Castles, chivalry, and old-world craftsmanship unite the realms of Europe.' },
  { id:'asia',           name:'Empire of Asia',                 emblem:'🏯', color:'#c0392b', description:'Ancient dynasties and boundless ambition drive the Empire of Asia.' },
  { id:'arab_world',     name:'Sultanate of the Arab World',    emblem:'🕌', color:'#1a9c74', description:'Desert traders and desert warriors, bound by honor and hospitality.' },
  { id:'africa',         name:'Kingdom of Africa',              emblem:'🦁', color:'#d68910', description:'The cradle of civilization rises again under a united banner.' },
  { id:'north_america',  name:'Union of North America',         emblem:'🦬', color:'#2874a6', description:'Pioneers and industry — the frontier spirit of a new union.' },
  { id:'south_america',  name:'Federation of South America',    emblem:'🐆', color:'#27ae60', description:'Rainforest warriors and carnival spirit fuel the Federation.' },
];
function kingdomDef(id){ return KINGDOMS.find(k => k.id === id) || null; }

const ALLIANCE_ROLES = {
  leader:   { key:'leader',   name:'Leader',    icon:'👑', rank:5 },
  coleader: { key:'coleader', name:'Co-Leader', icon:'⭐', rank:4 },
  officer:  { key:'officer',  name:'Officer',   icon:'🛡️', rank:3 },
  member:   { key:'member',   name:'Member',    icon:'⚔️', rank:2 },
  recruit:  { key:'recruit',  name:'Recruit',   icon:'🔰', rank:1 },
};
const ALLIANCE_ROLE_ORDER = ['recruit','member','officer','coleader','leader'];

const ALLIANCE_LEVELS = [
  { level:1,  cost:0     },
  { level:2,  cost:800   },
  { level:3,  cost:1800  },
  { level:4,  cost:2600  },
  { level:5,  cost:3500  },
  { level:6,  cost:6500  },
  { level:7,  cost:10000 },
  { level:8,  cost:14000 },
  { level:9,  cost:17000 },
  { level:10, cost:20000 },
];

const ALLIANCE_JOIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;      // 24h — applies whenever you leave a kingdom
const ALLIANCE_RECRUIT_TRIAL_MS = 3 * 24 * 60 * 60 * 1000;   // 3 days
const ALLIANCE_INACTIVITY_DAYS = 7;
const ALLIANCE_INACTIVITY_PCT = 0.10;

const ALLIANCE_DONATABLE = ['gold','wood','stone','iron','food','herbs','gemstones','magic_stones'];

/* ===== VIEW STATE (not persisted) ===== */
let allianceData = null;         // { alliance, members[], myMember }
let allianceView = 'browse';     // browse | home | members | treasury | manage
let allianceLoading = false;
let allianceBrowseResults = [];  // the 6 kingdoms, merged with live Firestore stats
let allianceBrowseSearched = false;
let allianceChatMsgs = [];
let allianceChatUnsub = null;
let allianceChatUnread = 0;
let allianceChatFirstLoad = true;
let allianceError = '';

/* ===== PERMISSIONS ===== */
function allianceCan(role, perm){
  const perms = {
    leader:   ['kick','promote','demote','editInfo','removeInactive'],
    coleader: ['kick','promote','demote','editInfo','removeInactive'],
    officer:  [],
    member:   [],
    recruit:  [],
  };
  return (perms[role] || []).includes(perm);
}
function allianceRankOf(role){ return (ALLIANCE_ROLES[role] || {rank:0}).rank; }
function nextRoleUp(role){
  const i = ALLIANCE_ROLE_ORDER.indexOf(role);
  return ALLIANCE_ROLE_ORDER[Math.min(i+1, ALLIANCE_ROLE_ORDER.length-2)]; // caps at coleader
}
function nextRoleDown(role){
  const i = ALLIANCE_ROLE_ORDER.indexOf(role);
  return ALLIANCE_ROLE_ORDER[Math.max(i-1, 0)];
}

/* ===== LEVELING ===== */
function allianceLevelForPoints(points){
  let lvl = 1;
  for(const l of ALLIANCE_LEVELS){ if(points >= l.cost) lvl = l.level; }
  return lvl;
}
function allianceLevelInfo(level){
  return ALLIANCE_LEVELS.find(l => l.level === level) || ALLIANCE_LEVELS[0];
}
function allianceNextLevelInfo(level){
  return ALLIANCE_LEVELS.find(l => l.level === level + 1) || null;
}

/* ===== ACTIVITY ===== */
function memberActivityPct(m){
  const daysSinceActive = (Date.now() - (m.lastActiveTs || 0)) / 86400000;
  let pct = 0;
  if(daysSinceActive < 1) pct = 100;
  else if(daysSinceActive < 3) pct = 60;
  else if(daysSinceActive < 7) pct = 25;
  else pct = 0;
  if((m.weeklyDonated || 0) > 0) pct = Math.min(100, pct + 20);
  return pct;
}
function isMemberAtRisk(m){
  if(m.exempt || m.role === 'leader') return false;
  const daysSinceActive = (Date.now() - (m.lastActiveTs || 0)) / 86400000;
  return daysSinceActive >= ALLIANCE_INACTIVITY_DAYS && memberActivityPct(m) < ALLIANCE_INACTIVITY_PCT * 100;
}
function allianceTimeAgo(ts){
  let ms;
  if(!ts) return 'just now';
  if(typeof ts === 'number') ms = ts;
  else if(ts.toDate) ms = ts.toDate().getTime();
  else return 'just now';
  const diff = Date.now() - ms;
  if(diff < 60000) return 'just now';
  if(diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if(diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

/* ═══════════════════ FIRESTORE OPS ═══════════════════ */

function knownAllianceStorageKey(){ return 'arcadia_known_alliance_' + (UID || 'anon'); }
function markAllianceKnown(allianceId){
  try{
    if(allianceId) localStorage.setItem(knownAllianceStorageKey(), allianceId);
    else localStorage.removeItem(knownAllianceStorageKey());
  }catch(e){}
}

async function initAllianceOnStart(){
  if(!db || !UID) return;
  try{
    const pdoc = await db.collection('players').doc(UID).get();
    const pdata = pdoc.exists ? pdoc.data() : {};
    if(pdata.allianceId){
      state.allianceId = pdata.allianceId;
      state.allianceRole = pdata.allianceRole || 'member';
      await loadMyAlliance();
      if(allianceData) allianceView = 'home';
      markAllianceKnown(pdata.allianceId);
    } else {
      markAllianceKnown(null);
    }
    state.allianceJoinCooldownUntil = pdata.allianceJoinCooldownUntil || 0;
    if(state.allianceId) startAllianceChatListener();
  }catch(e){ console.error('Kingdom init failed', e); }
}

async function loadMyAlliance(){
  if(!db || !state.allianceId) return;
  allianceLoading = true;
  try{
    const aDoc = await db.collection('alliances').doc(state.allianceId).get();
    if(!aDoc.exists){
      state.allianceId = null; state.allianceRole = null;
      allianceData = null; scheduleSave();
      allianceLoading = false;
      return;
    }
    const alliance = { id: aDoc.id, ...aDoc.data() };
    const membersSnap = await db.collection('alliances').doc(state.allianceId)
      .collection('members').orderBy('joinedAt','asc').get();
    const members = membersSnap.docs.map(d => ({ uid:d.id, ...d.data() }));
    const myMember = members.find(m => m.uid === UID) || null;
    if(myMember) state.allianceRole = myMember.role;
    allianceData = { alliance, members, myMember };
  }catch(e){ console.error('Load alliance failed', e); }
  allianceLoading = false;
}

async function loadKingdomsList(){
  if(!db){
    allianceBrowseResults = KINGDOMS.map(k => ({ ...k, level:1, points:0, memberCount:0, leaderName:null }));
    allianceBrowseSearched = true;
    return;
  }
  allianceLoading = true; renderBody();
  try{
    const snaps = await Promise.all(KINGDOMS.map(k => db.collection('alliances').doc(k.id).get()));
    allianceBrowseResults = KINGDOMS.map((k, i) => {
      const d = snaps[i].exists ? snaps[i].data() : {};
      return {
        ...k,
        level: d.level || 1,
        points: d.points || 0,
        memberCount: d.memberCount || 0,
        leaderName: d.leaderName || null,
      };
    });
  }catch(e){
    console.error('Load kingdoms failed', e);
    allianceBrowseResults = KINGDOMS.map(k => ({ ...k, level:1, points:0, memberCount:0, leaderName:null }));
  }
  allianceBrowseSearched = true;
  allianceLoading = false; renderBody();
}

async function joinKingdom(kingdomId){
  allianceError = '';
  if(!db){ showToast('❌','Cloud save (Firebase) must be configured to join a kingdom.','error'); return; }
  if(state.allianceId){ showToast('❌','You already belong to a kingdom.','error'); return; }
  if(state.allianceJoinCooldownUntil && Date.now() < state.allianceJoinCooldownUntil){
    showToast('⏳ Cooldown','You must wait before pledging to a new kingdom.','error'); return;
  }
  const kdef = kingdomDef(kingdomId);
  if(!kdef) return;

  allianceLoading = true; renderBody();
  try{
    const allianceRef = db.collection('alliances').doc(kingdomId);
    const assignedRole = await db.runTransaction(async (tx) => {
      const aDoc = await tx.get(allianceRef);
      const exists = aDoc.exists;
      const memberCount = exists ? (aDoc.data().memberCount || 0) : 0;
      const isFirstMember = memberCount <= 0;
      const role = isFirstMember ? 'leader' : 'recruit';
      const username = window.__playerUsername || 'Player';

      if(exists){
        tx.update(allianceRef, {
          memberCount: firebase.firestore.FieldValue.increment(1),
          ...(isFirstMember ? { leaderId: UID, leaderName: username } : {}),
        });
      } else {
        tx.set(allianceRef, {
          name: kdef.name, emblem: kdef.emblem, continent: kdef.id, description: kdef.description,
          leaderId: UID, leaderName: username,
          level: 1, points: 0, treasury: { gold: 0 },
          memberCount: 1,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      tx.set(allianceRef.collection('members').doc(UID), {
        uid: UID, username, role,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalDonated: 0, weeklyDonated: 0, lastActiveTs: Date.now(), warnings: 0, exempt: false,
      });
      tx.update(db.collection('players').doc(UID), { allianceId: kingdomId, allianceRole: role });
      return role;
    });
    state.allianceId = kingdomId; state.allianceRole = assignedRole;
    markAllianceKnown(kingdomId);
    updateMissionProgress('alliance_joined', 1);
    scheduleSave();
    await loadMyAlliance();
    allianceView = 'home';
    startAllianceChatListener();
    showToast('🏰 Kingdom Joined', `Welcome to the ${kdef.name}!`, 'success');
  }catch(e){
    console.error(e);
    showToast('❌','Failed to join the kingdom.','error');
  }
  allianceLoading = false; renderBody();
}

function alliancePendingBadgeCount(){
  return 0;
}

async function checkAllianceLevelUp(){
  if(!allianceData) return;
  const a = allianceData.alliance;
  const newLevel = allianceLevelForPoints(a.points || 0);
  if(newLevel > (a.level || 1)){
    try{
      await db.collection('alliances').doc(state.allianceId).update({ level: newLevel });
      showToast('🎉 Kingdom Level Up!', `Now level ${newLevel}`, 'success');
      await loadMyAlliance();
    }catch(e){ console.error(e); }
  }
}

async function donateToAlliance(resourceKey, amount){
  if(!db || !state.allianceId) return;
  amount = Math.floor(amount);
  if(amount <= 0) return;
  const have = resourceKey === 'gold' ? state.gold : (state.inv[resourceKey] || 0);
  if(have < amount){ showToast('❌','Not enough resources.','error'); return; }
  const allianceRef = db.collection('alliances').doc(state.allianceId);
  const memberRef = allianceRef.collection('members').doc(UID);
  try{
    await db.runTransaction(async (tx) => {
      const aDoc = await tx.get(allianceRef);
      if(!aDoc.exists) throw new Error('GONE');
      tx.update(allianceRef, {
        [`treasury.${resourceKey}`]: firebase.firestore.FieldValue.increment(amount),
        points: firebase.firestore.FieldValue.increment(amount),
      });
      tx.update(memberRef, {
        totalDonated: firebase.firestore.FieldValue.increment(amount),
        weeklyDonated: firebase.firestore.FieldValue.increment(amount),
        lastActiveTs: Date.now(),
      });
    });
    if(resourceKey === 'gold') state.gold -= amount; else state.inv[resourceKey] -= amount;
    state.totalAllianceDonated = (state.totalAllianceDonated || 0) + amount;
    updateMissionProgress('alliance_donated', amount);
    scheduleSave();
    await loadMyAlliance();
    await checkAllianceLevelUp();
    showToast('💰 Donated', `+${fmtG(amount)} to the treasury`, 'success');
  }catch(e){ console.error(e); showToast('❌','Donation failed.','error'); }
  renderBody();
}

/* ===== HEADER ICONS: DONATE MODAL + DISCORD ===== */
function openAllianceDonateModal(){
  if(!state.allianceId) return;
  let modal = document.getElementById('allianceDonateModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'allianceDonateModal';
    document.body.appendChild(modal);
  }
  const startAmt = Math.max(1, Math.min(state.gold, 5));
  modal.innerHTML = `
    <div class="modal-overlay" style="z-index:130;" onclick="if(event.target===this)closeAllianceDonateModal()">
      <div class="modal-box" style="max-width:320px;">
        <div class="modal-header"><h3>Donate Gold</h3><button class="modal-close" onclick="closeAllianceDonateModal()">✕</button></div>
        <div style="padding:20px;">
          <div style="font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Amount</div>
          <div class="donate-amount-row">
            <button class="donate-step-btn" onclick="adjustAllianceDonateAmount(-5)">−</button>
            <input id="allianceDonateAmountInput" type="number" min="1" max="${state.gold}" value="${startAmt}">
            <button class="donate-step-btn" onclick="adjustAllianceDonateAmount(5)">+</button>
          </div>
          <div class="donate-hint">Donate gold to support this alliance's treasury (you have ${fmtG(state.gold)}).</div>
          <button class="act-btn buy" style="width:100%;padding:12px;margin-bottom:8px;" onclick="submitAllianceDonateModal()">Donate Gold</button>
          <button class="act-btn" style="width:100%;padding:10px;" onclick="closeAllianceDonateModal()">Close</button>
        </div>
      </div>
    </div>`;
}
function adjustAllianceDonateAmount(delta){
  const input = document.getElementById('allianceDonateAmountInput');
  if(!input) return;
  let n = (parseInt(input.value, 10) || 0) + delta;
  n = Math.max(1, Math.min(state.gold, n));
  input.value = n;
}
function closeAllianceDonateModal(){
  const modal = document.getElementById('allianceDonateModal');
  if(modal) modal.remove();
}
async function submitAllianceDonateModal(){
  const input = document.getElementById('allianceDonateAmountInput');
  const amt = Math.floor(parseInt(input ? input.value : 0, 10) || 0);
  if(amt <= 0){ showToast('❌','Enter a valid amount.','error'); return; }
  if(amt > state.gold){ showToast('❌','Not enough gold.','error'); return; }
  closeAllianceDonateModal();
  await donateToAlliance('gold', amt);
}

function openAllianceDiscord(){
  const link = allianceData && allianceData.alliance && allianceData.alliance.discordLink;
  if(link){ window.open(link, '_blank', 'noopener'); return; }
  if(allianceCan(state.allianceRole,'editInfo')){
    showToast('💬 No Discord Link', 'Add one in Manage → Kingdom Rallying Cry.', 'error');
    setAllianceView('manage');
  } else {
    showToast('💬 No Discord Link', "This alliance hasn't set one up yet.", 'error');
  }
}
async function saveAllianceDiscordLink(){
  if(!allianceCan(state.allianceRole,'editInfo') || !db) return;
  const input = document.getElementById('allianceDiscordInput');
  let link = (input ? input.value : '').trim();
  if(link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
  if(link && !/^https:\/\/(discord\.gg|discord\.com\/invite)\//i.test(link)){
    showToast('❌','Enter a valid Discord invite link (discord.gg/...).','error'); return;
  }
  try{
    await db.collection('alliances').doc(state.allianceId).update({ discordLink: link });
    await loadMyAlliance();
    showToast('✅ Saved','Discord link updated.','success');
  }catch(e){ console.error(e); showToast('❌','Failed to save link.','error'); }
  renderBody();
}

async function promoteMember(targetUid, currentRole){
  if(!allianceCan(state.allianceRole,'promote') || !db) return;
  if(currentRole === 'officer' && state.allianceRole !== 'leader'){
    showToast('❌','Only the leader can promote to Co-Leader.','error'); return;
  }
  const newRole = nextRoleUp(currentRole);
  if(allianceRankOf(newRole) >= allianceRankOf(state.allianceRole) && state.allianceRole !== 'leader'){
    showToast('❌','Cannot promote above your own rank.','error'); return;
  }
  try{
    await db.collection('alliances').doc(state.allianceId).collection('members').doc(targetUid).update({ role: newRole });
    await db.collection('players').doc(targetUid).update({ allianceRole: newRole });
    if(targetUid === UID){ state.allianceRole = newRole; scheduleSave(); }
    await loadMyAlliance();
  }catch(e){ console.error(e); }
  renderBody();
}

async function demoteMember(targetUid, currentRole){
  if(!allianceCan(state.allianceRole,'demote') || !db) return;
  if(currentRole === 'leader'){ showToast('❌','Cannot demote the leader.','error'); return; }
  const newRole = nextRoleDown(currentRole);
  try{
    await db.collection('alliances').doc(state.allianceId).collection('members').doc(targetUid).update({ role: newRole });
    await db.collection('players').doc(targetUid).update({ allianceRole: newRole });
    await loadMyAlliance();
  }catch(e){ console.error(e); }
  renderBody();
}

async function kickMember(targetUid, targetRole){
  if(!allianceCan(state.allianceRole,'kick') || !db) return;
  if(targetRole === 'leader'){ showToast('❌','Cannot kick the leader.','error'); return; }
  if(allianceRankOf(targetRole) >= allianceRankOf(state.allianceRole)){
    showToast('❌','Cannot remove a member of equal or higher rank.','error'); return;
  }
  if(!confirm('Remove this member from the alliance?')) return;
  try{
    await db.collection('alliances').doc(state.allianceId).collection('members').doc(targetUid).delete();
    await db.collection('alliances').doc(state.allianceId).update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
    await db.collection('players').doc(targetUid).update({
      allianceId: null, allianceRole: null, allianceJoinCooldownUntil: Date.now() + ALLIANCE_JOIN_COOLDOWN_MS,
    });
    await loadMyAlliance();
    showToast('🚪 Removed','Member removed from the alliance.','success');
  }catch(e){ console.error(e); }
  renderBody();
}

async function toggleMemberExempt(targetUid, exempt){
  if(!allianceCan(state.allianceRole,'removeInactive') || !db) return;
  try{
    await db.collection('alliances').doc(state.allianceId).collection('members').doc(targetUid).update({ exempt: !exempt });
    await loadMyAlliance();
  }catch(e){ console.error(e); }
  renderBody();
}

async function warnMember(targetUid){
  if(!allianceCan(state.allianceRole,'removeInactive') || !db) return;
  // Look up the display name ourselves instead of trusting a value baked
  // into the caller's onclick string — a username is free text the player
  // controls, so it must never be interpolated straight into inline JS.
  const targetName = (allianceData.members || []).find(m => m.uid === targetUid)?.username || 'Member';
  try{
    await db.collection('alliances').doc(state.allianceId).collection('members').doc(targetUid).update({
      warnings: firebase.firestore.FieldValue.increment(1),
    });
    await loadMyAlliance();
    showToast('⚠️ Warned', `${escapeHtml(targetName)} has been warned for inactivity.`, 'success');
  }catch(e){ console.error(e); }
  renderBody();
}

async function leaveAllianceConfirm(){
  const msg = state.allianceRole === 'leader'
    ? 'Leave your kingdom? Leadership will automatically pass to the next-highest-ranking member (or to whoever joins next, if you are the last one). You must wait 24h before pledging to another kingdom.'
    : 'Leave your kingdom? Your lifetime donation total is kept, but you must wait 24h before pledging to another kingdom.';
  if(!confirm(msg)) return;
  await leaveAlliance();
}
async function leaveAlliance(){
  if(!db || !state.allianceId) return;
  const kingdomId = state.allianceId;
  const wasLeader = state.allianceRole === 'leader';
  allianceLoading = true; renderBody();
  try{
    const allianceRef = db.collection('alliances').doc(kingdomId);

    if(wasLeader){
      // Automatic succession: hand leadership to the highest-ranked
      // remaining member (ties broken by lifetime donation). Kingdoms
      // are permanent — they can never be disbanded, only left leaderless
      // until the next member joins or is promoted.
      const membersSnap = await allianceRef.collection('members').get();
      const candidates = membersSnap.docs
        .map(d => ({ uid:d.id, ...d.data() }))
        .filter(m => m.uid !== UID);
      if(candidates.length){
        candidates.sort((a,b) => allianceRankOf(b.role) - allianceRankOf(a.role) || (b.totalDonated||0) - (a.totalDonated||0));
        const successor = candidates[0];
        await allianceRef.collection('members').doc(successor.uid).update({ role: 'leader' });
        await db.collection('players').doc(successor.uid).update({ allianceRole: 'leader' });
        await allianceRef.update({ leaderId: successor.uid, leaderName: successor.username || 'Player' });
      } else {
        await allianceRef.update({ leaderId: null, leaderName: null });
      }
    }

    await allianceRef.collection('members').doc(UID).delete();
    await allianceRef.update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
    const cooldownUntil = Date.now() + ALLIANCE_JOIN_COOLDOWN_MS;
    await db.collection('players').doc(UID).update({ allianceId: null, allianceRole: null, allianceJoinCooldownUntil: cooldownUntil });
    state.allianceId = null; state.allianceRole = null; state.allianceJoinCooldownUntil = cooldownUntil;
    allianceData = null; stopAllianceChatListener(); scheduleSave();
    markAllianceKnown(null);
    allianceView = 'browse';
    showToast('🚪 Left Kingdom','','success');
  }catch(e){ console.error(e); showToast('❌','Failed to leave.','error'); }
  allianceLoading = false; renderBody();
}

/* ===== CHAT (renders into the unified chat drawer — see sync.js) ===== */
function startAllianceChatListener(){
  if(!db || !state.allianceId || allianceChatUnsub) return;
  allianceChatFirstLoad = true;
  allianceChatUnsub = db.collection('alliances').doc(state.allianceId).collection('chat')
    .orderBy('ts','desc').limit(50)
    .onSnapshot(snap => {
      const msgs = snap.docs.map(d => ({ id:d.id, ...d.data() })).reverse();
      const grew = !allianceChatFirstLoad && msgs.length > allianceChatMsgs.length;
      allianceChatFirstLoad = false;
      allianceChatMsgs = msgs;
      const drawerShowingAlliance = typeof chatDrawerOpen !== 'undefined' && chatDrawerOpen && chatActiveTab === 'alliance';
      if(drawerShowingAlliance){
        const el = document.getElementById('chatDrawerMsgs');
        if(el){ el.innerHTML = renderChatMsgsHTML(allianceChatMsgs); el.scrollTop = el.scrollHeight; }
      } else if(grew){
        allianceChatUnread++;
        if(typeof renderGlobalChatFab === 'function') renderGlobalChatFab();
      }
    }, err => console.error('Alliance chat listener error', err));
}
function stopAllianceChatListener(){
  if(allianceChatUnsub){ allianceChatUnsub(); allianceChatUnsub = null; }
  allianceChatMsgs = [];
}
async function sendAllianceChatMsg(){
  const input = document.getElementById('chatDrawerInput');
  let text = input ? input.value.trim() : '';
  if(!text || !db || !state.allianceId) return;
  if(text.length > 300) text = text.slice(0, 300);
  if(input) input.value = '';
  try{
    await db.collection('alliances').doc(state.allianceId).collection('chat').add({
      uid: UID, username: window.__playerUsername || 'Player',
      avatar: (typeof state !== 'undefined' && state && state.avatar) || '🧙',
      text, ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }catch(e){ console.error(e); }
}
function allianceChatKeydown(ev){ if(ev.key === 'Enter') sendAllianceChatMsg(); }

/* ═══════════════════ NAVIGATION HELPERS ═══════════════════ */
async function openAllianceTab(){
  activeTab = 'alliance';
  renderBody();
  if(!db) return;
  if(state.allianceId){
    if(!allianceData) await loadMyAlliance();
  } else if(!allianceBrowseSearched){
    await loadKingdomsList();
  }
  renderBody();
  if(typeof renderBottomNav === 'function') renderBottomNav();
}

function setAllianceView(v){
  allianceView = v;
  allianceError = '';
  renderBody();
}

/* ═══════════════════ RENDERING ═══════════════════ */
function renderAlliance(){
  if(!db){
    return `
      <div class="panel">
        <div class="panel-header">🏰 Kingdoms</div>
        <div style="padding:20px;text-align:center;color:var(--dim);font-size:13px;">
          🔌 Kingdoms require cloud save (Firebase) to be configured.<br>
          Set up your Firebase credentials to unlock this feature.
        </div>
      </div>`;
  }
  if(state.allianceId && allianceData) return renderAllianceDashboard();
  if(state.allianceId && !allianceData && allianceLoading) return `<div class="panel"><div style="padding:30px;text-align:center;color:var(--dim);">Loading kingdom…</div></div>`;
  return renderAllianceLanding();
}

function renderAllianceLanding(){
  if(!allianceBrowseSearched && !allianceLoading) loadKingdomsList();
  const cooldown = state.allianceJoinCooldownUntil && Date.now() < state.allianceJoinCooldownUntil
    ? state.allianceJoinCooldownUntil - Date.now() : 0;

  return `
    <div class="alliance-hero">
      <div class="alliance-hero-top">
        <div class="alliance-hero-emblem">🌍</div>
        <div style="flex:1;min-width:0;">
          <div class="alliance-hero-name">Choose Your Kingdom</div>
          <div class="alliance-hero-meta">Six kingdoms, six continents. Pledge allegiance and fight for territory and resources.</div>
        </div>
      </div>
      ${cooldown > 0 ? `<div style="background:rgba(184,92,82,0.12);border:1px solid var(--red);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--red);margin-top:12px;">⏳ You must wait ${Math.ceil(cooldown/3600000)}h before pledging to a new kingdom.</div>` : ''}
    </div>
    ${allianceLoading ? `<div style="text-align:center;padding:24px;color:var(--dim);">Surveying the realms…</div>` : renderAllianceBrowseList()}`;
}

function renderAllianceBrowseList(){
  if(!allianceBrowseResults.length){
    return `<div class="alliance-empty"><div class="ae-icon">🌍</div><div class="ae-text">Loading kingdoms…</div></div>`;
  }
  const cooldownActive = state.allianceJoinCooldownUntil && Date.now() < state.allianceJoinCooldownUntil;
  return allianceBrowseResults.map(k => `
    <div class="card alliance-list-card" style="border-left:3px solid ${k.color};">
      <div class="alliance-list-emblem"><img class="ui-icon-lg" src="${ICONS['kingdom_'+k.id]}" alt="${k.emblem}" onerror="this.replaceWith(document.createTextNode('${k.emblem}'))"></div>
      <div style="flex:1;min-width:0;">
        <div class="alliance-list-name">${k.name} <span style="color:var(--dim);font-size:11px;font-weight:400;">Lv.${k.level}</span></div>
        <div class="alliance-list-meta" style="margin-bottom:2px;">${k.description}</div>
        <div class="alliance-list-meta">${k.memberCount} member${k.memberCount===1?'':'s'}${k.leaderName?` · Leader: ${k.leaderName}`:''}</div>
      </div>
      <button class="mini-btn buy" ${cooldownActive?'disabled':''} onclick="joinKingdom('${k.id}')">${cooldownActive?'⏳':'Join'}</button>
    </div>`).join('');
}

function renderAllianceDashboard(){
  const { alliance, members, myMember } = allianceData;
  const role = state.allianceRole;
  const roleInfo = ALLIANCE_ROLES[role] || ALLIANCE_ROLES.member;
  const lvlInfo = allianceLevelInfo(alliance.level || 1);
  const nextLvl = allianceNextLevelInfo(alliance.level || 1);
  const pointsPct = nextLvl ? Math.min(100, ((alliance.points||0) - lvlInfo.cost) / (nextLvl.cost - lvlInfo.cost) * 100) : 100;

  const tabs = [
    { id:'home',     label:'🏰 Home' },
    { id:'members',  label:'👥 Members' },
    { id:'treasury', label:'💰 Treasury' },
  ];
  if(allianceCan(role,'editInfo')) tabs.push({ id:'manage', label:`<img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️"> Manage` });

  let body = '';
  if(allianceView === 'members') body = renderAllianceMembers();
  else if(allianceView === 'treasury') body = renderAllianceTreasury();
  else if(allianceView === 'manage') body = renderAllianceManage();
  else body = renderAllianceHome();

  return `
    <div class="alliance-hero">
      <div class="alliance-hero-icons">
        <button class="alliance-icon-btn discord" title="${alliance.discordLink ? 'Open Discord' : 'No Discord link set'}" onclick="openAllianceDiscord()">💬</button>
        <button class="alliance-icon-btn donate" title="Donate Gold" onclick="openAllianceDonateModal()"><img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙"></button>
      </div>
      <div class="alliance-hero-top" style="padding-right:44px;">
        <div class="alliance-hero-emblem"><img class="ui-icon-xl" src="${ICONS['kingdom_'+alliance.continent]}" alt="${alliance.emblem||'⚔️'}" onerror="this.replaceWith(document.createTextNode('${alliance.emblem||'⚔️'}'))"></div>
        <div style="flex:1;min-width:0;">
          <div class="alliance-hero-name">${alliance.name}</div>
          <div class="alliance-hero-meta">${alliance.memberCount||0} member${alliance.memberCount===1?'':'s'} · ${roleInfo.icon} ${roleInfo.name}</div>
        </div>
      </div>
      <div class="alliance-hero-progress">
        <div class="alliance-hero-progress-labels"><span>Lv.${alliance.level||1}</span><span>${nextLvl ? `${fmtG(alliance.points||0)}/${fmtG(nextLvl.cost)} pts` : 'Max level'}</span></div>
        <div class="bar-track" style="height:8px;"><div class="bar-fill" style="width:${pointsPct}%;background:var(--prestige);"></div></div>
      </div>
      <div class="alliance-tabbar">
        ${tabs.map(t => `<button class="alliance-tab ${!t.onclick && allianceView===t.id?'active':''}" onclick="${t.onclick || `setAllianceView('${t.id}')`}">${t.label}${t.badge?`<span class="tab-badge">${t.badge}</span>`:''}</button>`).join('')}
      </div>
    </div>
    ${body}`;
}

function renderAllianceOverview(){
  const { alliance, members } = allianceData;
  const weeklyTotal = (members||[]).reduce((sum,m)=> sum + (m.weeklyDonated||0), 0);
  const activeThisWeek = (members||[]).filter(m => (m.weeklyDonated||0) > 0).length;
  const memberCount = (members||[]).length;
  const weeklyPerMember = activeThisWeek > 0 ? weeklyTotal / activeThisWeek : 0;

  const rankCards = [
    { cls:'gold', icon:`<img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙">`, label:'Weekly Donated', value: fmtG(weeklyTotal) },
    { cls:'gold', icon:'📊', label:'Donated / Member', value: fmtG(weeklyPerMember) },
    { cls:'gold', icon:'🏆', label:'Total Contribution', value: fmtG(alliance.points||0) },
    { cls:'mint', icon:'👥', label:'Active Members', value: `${activeThisWeek}/${memberCount}` },
    { cls:'mint', icon:'🏰', label:'Kingdom Level', value: alliance.level||1 },
    { cls:'mint', icon:'🎖️', label:'Roster', value: `${alliance.memberCount||memberCount}` },
  ];

  const govOrder = [...members].sort((a,b) => allianceRankOf(b.role) - allianceRankOf(a.role) || (b.totalDonated||0) - (a.totalDonated||0))
    .filter(m => allianceRankOf(m.role) >= allianceRankOf('officer'))
    .slice(0, 8);

  return `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">📈 Rankings</div>
      <div class="alliance-rank-grid">
        ${rankCards.map(c => `
          <div class="alliance-rank-card ${c.cls}">
            <div class="arc-label">${c.icon} ${c.label}</div>
            <div class="arc-value">${c.value}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">🏰 Government</div>
      ${govOrder.length ? `
        <div class="gov-row">
          ${govOrder.map(m => {
            const roleInfo = ALLIANCE_ROLES[m.role] || ALLIANCE_ROLES.member;
            const cls = m.role === 'leader' ? 'leader' : m.role === 'coleader' ? 'coleader' : 'officer';
            return `
            <div class="gov-card" title="${escapeHtml(m.username)} · ${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)}">
              <div class="gov-avatar-wrap">
                <div class="gov-avatar ${cls}">${roleInfo.icon}</div>
                <div class="gov-badge">${fmtG(m.totalDonated||0)}</div>
              </div>
              <div class="gov-name">${escapeHtml(m.username)}</div>
              <div class="gov-role">${roleInfo.name}</div>
            </div>`;
          }).join('')}
        </div>` : `<div style="text-align:center;padding:12px;color:var(--dim);font-size:12px;">No officers appointed yet.</div>`}
    </div>`;
}

function renderAllianceHome(){
  const { alliance, myMember, members } = allianceData;
  const kdef = kingdomDef(alliance.continent) || {};
  const weeklyTotal = (members||[]).reduce((sum,m)=> sum + (m.weeklyDonated||0), 0);
  const activeThisWeek = (members||[]).filter(m => (m.weeklyDonated||0) > 0).length;

  return `
    ${renderAllianceOverview()}
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">📜 About</div>
      <div style="font-size:12px;color:var(--text);margin-bottom:8px;">${alliance.description || kdef.description || ''}</div>
      <div style="font-size:11px;color:var(--dim);"><img class="ui-icon" src="${ICONS.globe}" alt="🌐"> Open to every player pledged to this kingdom — everyone belongs the moment they join.</div>
    </div>
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">📈 This Week</div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:var(--brass-bright);font-family:'Cairo',sans-serif;">${fmtG(weeklyTotal)}</div>
          <div style="font-size:10px;color:var(--dim);">Value Donated</div>
        </div>
        <div style="flex:1;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:var(--green);font-family:'Cairo',sans-serif;">${activeThisWeek}/${(members||[]).length}</div>
          <div style="font-size:10px;color:var(--dim);">Members Contributing</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">🚪 Kingdom Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="act-btn" style="width:auto;padding:9px 16px;border-color:var(--red);color:var(--red);" onclick="leaveAllianceConfirm()">🚪 Leave Kingdom</button>
      </div>
      <div style="font-size:10px;color:var(--dim);margin-top:6px;">${state.allianceRole==='leader' ? 'Leadership passes automatically to the next-ranking member when you leave.' : 'Your lifetime donation record is kept.'} A 24h cooldown applies before pledging to another kingdom.</div>
    </div>`;
}

function renderAllianceTreasury(){
  const { alliance } = allianceData;
  const treasury = alliance.treasury || {};
  const treasuryEntries = Object.keys(treasury).filter(k => treasury[k] > 0);

  return `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">💰 Treasury</div>
      ${treasuryEntries.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${treasuryEntries.map(k => `<span class="resource-chip">${k==='gold'?`<img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙">`:(ITEMS[k]?ITEMS[k].icon:'')} ${k==='gold'?'Gold':(ITEMS[k]?ITEMS[k].name:k)}: ${fmtG(treasury[k])}</span>`).join('')}
        </div>` : `<div style="font-size:12px;color:var(--dim);margin-bottom:12px;">The treasury is empty. Be the first to donate!</div>`}
      <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">Donate to the treasury (earns kingdom points):</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${ALLIANCE_DONATABLE.map(k => {
          const have = k==='gold' ? state.gold : (state.inv[k]||0);
          const icon = k==='gold' ? `<img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙">` : (ITEMS[k] ? ITEMS[k].icon : '');
          const name = k==='gold' ? 'Gold' : (ITEMS[k] ? ITEMS[k].name : k);
          const amt = Math.min(have, k==='gold'?500:50);
          return `<button class="mini-btn" style="font-size:11px;" ${have<=0?'disabled':''} onclick="donateToAlliance('${k}', promptAllianceDonateAmount('${k}','${name}', ${have}))">${icon} ${name} (${fmtG(have)})</button>`;
        }).join('')}
      </div>
    </div>`;
}

function promptAllianceDonateAmount(key, name, have){
  const val = prompt(`How much ${name} to donate? (max ${have})`, String(Math.min(have, key==='gold'?100:10)));
  const n = parseInt(val, 10);
  if(!n || n <= 0) return 0;
  return Math.min(n, have);
}

function renderAllianceMembers(){
  const { members } = allianceData;
  const sorted = [...members].sort((a,b) => allianceRankOf(b.role) - allianceRankOf(a.role) || (b.totalDonated||0) - (a.totalDonated||0));
  return `
    <div class="panel">
      <div class="panel-header">👥 Members (${members.length})</div>
      ${sorted.map(renderAllianceMemberRow).join('')}
    </div>`;
}

function renderAllianceMemberRow(m){
  const roleInfo = ALLIANCE_ROLES[m.role] || ALLIANCE_ROLES.member;
  const isMe = m.uid === UID;
  const myRank = allianceRankOf(state.allianceRole);
  const canManage = allianceCan(state.allianceRole,'kick') && allianceRankOf(m.role) < myRank;
  const canPromote = allianceCan(state.allianceRole,'promote') && m.role !== 'leader' && allianceRankOf(m.role) < myRank
    && (m.role !== 'officer' || state.allianceRole === 'leader');
  const canDemote = allianceCan(state.allianceRole,'demote') && m.role !== 'leader' && m.role !== 'recruit' && allianceRankOf(m.role) < myRank;
  const canExempt = allianceCan(state.allianceRole,'removeInactive') && !isMe;
  const hasActions = !isMe && (canPromote || canDemote || canExempt || canManage);
  const atRisk = isMemberAtRisk(m);
  const activity = memberActivityPct(m);
  const dotColor = activity >= 60 ? 'var(--green)' : activity >= 25 ? 'var(--brass-bright)' : 'var(--red)';
  return `
    <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;${atRisk?'border-color:var(--red);':''}">
      <div style="position:relative;">
        <div style="font-size:20px;">${roleInfo.icon}</div>
        <div title="Activity ${activity}%" style="position:absolute;bottom:-2px;right:-2px;width:9px;height:9px;border-radius:50%;background:${dotColor};border:1.5px solid var(--panel);"></div>
      </div>
      <div style="flex:1;min-width:0;${hasActions?'cursor:pointer;':''}" ${hasActions?`onclick="openMemberActionsModal('${m.uid}')"`:''}>
        <div style="font-weight:700;color:var(--text);font-size:13px;${hasActions?'text-decoration:underline;text-decoration-color:var(--border-light);text-underline-offset:2px;':''}">${escapeHtml(m.username)}${isMe?' <span style="color:var(--dim);font-size:11px;">(you)</span>':''}</div>
        <div style="font-size:11px;color:var(--dim);">${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)} · Activity ${activity}%${atRisk?' · <span style="color:var(--red);">Inactive</span>':''}${m.exempt?' · <span style="color:var(--green);">Exempt</span>':''}${(m.warnings||0)>0?` · <span style="color:var(--brass-bright);">⚠️ ${m.warnings}</span>`:''}</div>
      </div>
      ${hasActions?`<button class="mini-btn" onclick="openMemberActionsModal('${m.uid}')" title="Member actions">⋯</button>`:''}
    </div>`;
}

function openMemberActionsModal(uid){
  const m = (allianceData.members || []).find(x => x.uid === uid);
  if(!m) return;
  const roleInfo = ALLIANCE_ROLES[m.role] || ALLIANCE_ROLES.member;
  const myRank = allianceRankOf(state.allianceRole);
  const canManage = allianceCan(state.allianceRole,'kick') && allianceRankOf(m.role) < myRank;
  const canPromote = allianceCan(state.allianceRole,'promote') && m.role !== 'leader' && allianceRankOf(m.role) < myRank
    && (m.role !== 'officer' || state.allianceRole === 'leader');
  const canDemote = allianceCan(state.allianceRole,'demote') && m.role !== 'leader' && m.role !== 'recruit' && allianceRankOf(m.role) < myRank;
  const canExempt = allianceCan(state.allianceRole,'removeInactive') && m.uid !== UID;
  const promoteTo = ALLIANCE_ROLES[nextRoleUp(m.role)];
  const demoteTo = ALLIANCE_ROLES[nextRoleDown(m.role)];

  let modal = document.getElementById('memberActionsModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'memberActionsModal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-overlay" style="z-index:130;" onclick="if(event.target===this)closeMemberActionsModal()">
      <div class="modal-box" style="max-width:320px;">
        <div class="modal-header">
          <h3>${roleInfo.icon} ${escapeHtml(m.username)}</h3>
          <button class="modal-close" onclick="closeMemberActionsModal()">✕</button>
        </div>
        <div style="padding:16px 18px;">
          <div style="font-size:11px;color:var(--dim);margin-bottom:14px;">${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)}${(m.warnings||0)>0?` · <span style="color:var(--brass-bright);">⚠️ ${m.warnings} warning${m.warnings===1?'':'s'}</span>`:''}</div>
          ${canPromote?`<button class="member-action-btn" onclick="closeMemberActionsModal();promoteMember('${m.uid}','${m.role}')"><span class="icon">⬆️</span> Promote to ${promoteTo.name}</button>`:''}
          ${canDemote?`<button class="member-action-btn" onclick="closeMemberActionsModal();demoteMember('${m.uid}','${m.role}')"><span class="icon">⬇️</span> Demote to ${demoteTo.name}</button>`:''}
          ${canExempt?`<button class="member-action-btn" onclick="closeMemberActionsModal();warnMember('${m.uid}')"><span class="icon">⚠️</span> Warn for Inactivity</button>`:''}
          ${canExempt?`<button class="member-action-btn" onclick="closeMemberActionsModal();toggleMemberExempt('${m.uid}', ${!!m.exempt})"><span class="icon">${m.exempt?'🔓':'🔒'}</span> ${m.exempt?'Remove Inactivity Exemption':'Exempt from Inactivity'}</button>`:''}
          ${canManage?`<button class="member-action-btn danger" onclick="closeMemberActionsModal();kickMember('${m.uid}','${m.role}')"><span class="icon">✕</span> Remove from Kingdom</button>`:''}
          ${(!canPromote && !canDemote && !canExempt && !canManage)?`<div style="font-size:12px;color:var(--dim);text-align:center;padding:8px 0;">No actions available for this member.</div>`:''}
        </div>
      </div>
    </div>`;
}
function closeMemberActionsModal(){
  const modal = document.getElementById('memberActionsModal');
  if(modal) modal.remove();
}

function renderAllianceManage(){
  const { alliance } = allianceData;
  const canEdit = allianceCan(state.allianceRole,'editInfo');
  let html = '';

  const atRiskMembers = allianceData.members.filter(isMemberAtRisk);
  if(allianceCan(state.allianceRole,'removeInactive')){
    html += `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">⚠️ Inactivity Review</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Members inactive 7+ days with activity below 10% are flagged. Exempt them below or remove them from the Members tab.</div>
      ${atRiskMembers.length ? atRiskMembers.map(m => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border);">
          <div style="font-size:12px;color:var(--red);">${escapeHtml(m.username)} — ${memberActivityPct(m)}% activity${(m.warnings||0)>0?` <span style="color:var(--brass-bright);">(⚠️${m.warnings})</span>`:''}</div>
          <div style="display:flex;gap:6px;">
            <button class="mini-btn" onclick="warnMember('${m.uid}')">Warn</button>
            <button class="mini-btn" onclick="toggleMemberExempt('${m.uid}', ${!!m.exempt})">Exempt</button>
            <button class="mini-btn" style="color:var(--red);border-color:var(--red);" onclick="kickMember('${m.uid}','${m.role}')">Remove</button>
          </div>
        </div>`).join('') : `<div style="font-size:12px;color:var(--dim);">No inactive members right now.</div>`}
    </div>`;
  }

  if(canEdit){
    html += `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header"><img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️"> Kingdom Rallying Cry</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">The kingdom's name and emblem are fixed to its continent, but you can set a rallying message for your members.</div>
      <input id="allianceEditDescInput" class="username-input" style="margin-bottom:10px;" maxlength="120" value="${(alliance.description||'').replace(/"/g,'&quot;')}">
      <button class="act-btn buy" style="width:100%;padding:10px;" onclick="saveAllianceProfile()">Save Changes</button>
    </div>
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">💬 Discord Server</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Set your kingdom's Discord invite link. Members tap the 💬 icon on the kingdom header to join.</div>
      <div style="display:flex;gap:6px;">
        <input id="allianceDiscordInput" class="username-input" style="margin-bottom:0;flex:1;" placeholder="https://discord.gg/…" value="${(alliance.discordLink||'').replace(/"/g,'&quot;')}">
        <button class="act-btn buy" style="width:auto;padding:0 16px;" onclick="saveAllianceDiscordLink()">Save</button>
      </div>
    </div>`;
  }

  return html || `<div class="panel"><div style="padding:20px;text-align:center;color:var(--dim);">No management permissions.</div></div>`;
}

async function saveAllianceProfile(){
  if(!allianceCan(state.allianceRole,'editInfo') || !db) return;
  const descInput = document.getElementById('allianceEditDescInput');
  const desc = (descInput ? descInput.value : '').trim().slice(0, 120);
  allianceLoading = true; renderBody();
  try{
    await db.collection('alliances').doc(state.allianceId).update({ description: desc });
    await loadMyAlliance();
    showToast('✅ Saved','Kingdom message updated.','success');
  }catch(e){ console.error(e); showToast('❌','Failed to save changes.','error'); }
  allianceLoading = false; renderBody();
}
