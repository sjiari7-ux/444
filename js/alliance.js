/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Alliance System
   Guilds/alliances: creation, roles, treasury, donations, activity,
   leveling, invites/requests, chat, promotion/kick, leave/disband.
   ═══════════════════════════════════════════════════════════════ */

/* ===== CONFIG ===== */
const ALLIANCE_EMBLEMS = ['⚔️','🛡️','🐉','🦅','🐺','⭐','🔥','🌊','🏔️','💀','👑','🌙'];
const ALLIANCE_ROLES = {
  leader:   { key:'leader',   name:'Leader',    icon:'👑', rank:5 },
  coleader: { key:'coleader', name:'Co-Leader', icon:'⭐', rank:4 },
  officer:  { key:'officer',  name:'Officer',   icon:'🛡️', rank:3 },
  member:   { key:'member',   name:'Member',    icon:'⚔️', rank:2 },
  recruit:  { key:'recruit',  name:'Recruit',   icon:'🔰', rank:1 },
};
const ALLIANCE_ROLE_ORDER = ['recruit','member','officer','coleader','leader'];

const ALLIANCE_LEVELS = [
  { level:1,  cost:0,     maxMembers:20 },
  { level:2,  cost:800,   maxMembers:22 },
  { level:3,  cost:1800,  maxMembers:24 },
  { level:4,  cost:2600,  maxMembers:26 },
  { level:5,  cost:3500,  maxMembers:28 },
  { level:6,  cost:6500,  maxMembers:32 },
  { level:7,  cost:10000, maxMembers:36 },
  { level:8,  cost:14000, maxMembers:40 },
  { level:9,  cost:17000, maxMembers:45 },
  { level:10, cost:20000, maxMembers:50 },
];

const ALLIANCE_CREATE_MIN_LEVEL = 5;
const ALLIANCE_CREATE_COST = 5000;
const ALLIANCE_LEAVE_LOSS_PCT = 0.5;
const ALLIANCE_JOIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;      // 24h
const ALLIANCE_DISBAND_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ALLIANCE_RECRUIT_TRIAL_MS = 3 * 24 * 60 * 60 * 1000;   // 3 days
const ALLIANCE_INACTIVITY_DAYS = 7;
const ALLIANCE_INACTIVITY_PCT = 0.10;

const ALLIANCE_DONATABLE = ['gold','wood','stone','iron','food','herbs','gemstones','magic_stones'];

/* ===== VIEW STATE (not persisted) ===== */
let allianceData = null;         // { alliance, members[], myMember }
let allianceView = 'browse';     // browse | create | home | members | chat | manage
let allianceLoading = false;
let allianceBrowseResults = [];
let allianceBrowseSearched = false;
let allianceMyInvites = [];
let allianceRequests = [];
let allianceSentInvites = [];
let allianceRequestedIds = new Set();
let allianceChatMsgs = [];
let allianceChatUnsub = null;
let allianceChatUnread = 0;
let allianceChatFirstLoad = true;
let allianceError = '';
let allianceCreateEmblem = '⚔️';
let allianceEditEmblem = null;
let allianceCreateType = 'open';

/* ===== PERMISSIONS ===== */
function allianceCan(role, perm){
  const perms = {
    leader:   ['invite','kick','promote','demote','editInfo','disband','manageRequests','removeInactive'],
    coleader: ['invite','kick','promote','demote','editInfo','manageRequests','removeInactive'],
    officer:  ['invite','manageRequests'],
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
    }
    state.allianceJoinCooldownUntil = pdata.allianceJoinCooldownUntil || 0;
    state.allianceDisbandCooldownUntil = pdata.allianceDisbandCooldownUntil || 0;
    if(state.allianceId){
      if(allianceCan(state.allianceRole,'manageRequests')) await loadAllianceRequests();
      startAllianceChatListener();
    } else {
      await checkMyAllianceInvites();
    }
  }catch(e){ console.error('Alliance init failed', e); }
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

async function createAllianceSubmit(){
  allianceError = '';
  if(!db){ allianceError = 'Cloud save (Firebase) must be configured to use alliances.'; renderBody(); return; }
  if(state.allianceId){ allianceError = 'You are already in an alliance.'; renderBody(); return; }
  if(state.allianceDisbandCooldownUntil && Date.now() < state.allianceDisbandCooldownUntil){
    allianceError = 'You must wait before founding a new alliance.'; renderBody(); return;
  }
  const nameInput = document.getElementById('allianceNameInput');
  const descInput = document.getElementById('allianceDescInput');
  const name = (nameInput ? nameInput.value : '').trim();
  const description = (descInput ? descInput.value : '').trim().slice(0, 120);
  if(name.length < 3 || name.length > 20){ allianceError = 'Name must be 3-20 characters.'; renderBody(); return; }
  if(!/^[\p{L}\p{N} _\-]+$/u.test(name)){ allianceError = 'Name contains disallowed characters.'; renderBody(); return; }
  if(state.level < ALLIANCE_CREATE_MIN_LEVEL){ allianceError = `Requires level ${ALLIANCE_CREATE_MIN_LEVEL}.`; renderBody(); return; }
  if(state.gold < ALLIANCE_CREATE_COST){ allianceError = `Requires ${ALLIANCE_CREATE_COST} gold.`; renderBody(); return; }

  const nameKey = name.toLowerCase();
  allianceLoading = true; renderBody();
  try{
    const nameRef = db.collection('allianceNames').doc(nameKey);
    const allianceRef = db.collection('alliances').doc();
    await db.runTransaction(async (tx) => {
      const nameDoc = await tx.get(nameRef);
      if(nameDoc.exists) throw new Error('NAME_TAKEN');
      tx.set(nameRef, { allianceId: allianceRef.id, name });
      tx.set(allianceRef, {
        name, emblem: allianceCreateEmblem || '⚔️', description, type: allianceCreateType || 'open',
        leaderId: UID, leaderName: window.__playerUsername || 'Player',
        level: 1, points: 0, treasury: { gold: 0 },
        memberCount: 1, maxMembers: ALLIANCE_LEVELS[0].maxMembers,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(allianceRef.collection('members').doc(UID), {
        uid: UID, username: window.__playerUsername || 'Player', role: 'leader',
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalDonated: 0, weeklyDonated: 0, lastActiveTs: Date.now(), warnings: 0, exempt: false,
      });
      tx.update(db.collection('players').doc(UID), { allianceId: allianceRef.id, allianceRole: 'leader' });
    });
    state.gold -= ALLIANCE_CREATE_COST;
    state.allianceId = allianceRef.id; state.allianceRole = 'leader';
    scheduleSave();
    await loadMyAlliance();
    allianceView = 'home';
    showToast('🏛️ Alliance Founded', `${name} has been created!`, 'success');
  }catch(e){
    allianceError = e.message === 'NAME_TAKEN' ? 'That name is already taken.' : 'Failed to create alliance.';
    if(e.message !== 'NAME_TAKEN') console.error(e);
  }
  allianceLoading = false; renderBody();
}

async function browseAlliances(){
  if(!db) return;
  const searchInput = document.getElementById('allianceSearchInput');
  const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
  allianceLoading = true; renderBody();
  try{
    const snap = await db.collection('alliances').orderBy('points','desc').limit(30).get();
    allianceBrowseResults = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      .filter(a => !term || (a.name||'').toLowerCase().includes(term));
  }catch(e){ console.error(e); allianceBrowseResults = []; }
  allianceBrowseSearched = true;
  allianceLoading = false; renderBody();
}

async function joinAllianceOpen(allianceId){
  if(!db) return;
  if(state.allianceId){ showToast('❌','Already in an alliance.','error'); return; }
  if(state.allianceJoinCooldownUntil && Date.now() < state.allianceJoinCooldownUntil){
    showToast('⏳ Cooldown','You must wait before joining a new alliance.','error'); return;
  }
  allianceLoading = true; renderBody();
  try{
    const allianceRef = db.collection('alliances').doc(allianceId);
    await db.runTransaction(async (tx) => {
      const aDoc = await tx.get(allianceRef);
      if(!aDoc.exists) throw new Error('NOT_FOUND');
      const a = aDoc.data();
      if(a.type !== 'open') throw new Error('NOT_OPEN');
      if((a.memberCount||0) >= (a.maxMembers||20)) throw new Error('FULL');
      tx.update(allianceRef, { memberCount: firebase.firestore.FieldValue.increment(1) });
      tx.set(allianceRef.collection('members').doc(UID), {
        uid: UID, username: window.__playerUsername || 'Player', role: 'recruit',
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalDonated: 0, weeklyDonated: 0, lastActiveTs: Date.now(), warnings: 0, exempt: false,
      });
      tx.update(db.collection('players').doc(UID), { allianceId, allianceRole: 'recruit' });
    });
    state.allianceId = allianceId; state.allianceRole = 'recruit';
    updateMissionProgress('alliance_joined', 1);
    scheduleSave();
    await loadMyAlliance();
    allianceView = 'home';
    startAllianceChatListener();
    showToast('✅ Joined Alliance','Welcome!','success');
  }catch(e){
    const msg = e.message==='FULL' ? 'Alliance is full.' : e.message==='NOT_OPEN' ? 'This alliance requires an invite or request.' : 'Failed to join.';
    showToast('❌', msg, 'error');
  }
  allianceLoading = false; renderBody();
}

async function requestJoinAlliance(allianceId){
  if(!db || state.allianceId) return;
  if(allianceRequestedIds.has(allianceId)) return;
  if(state.allianceJoinCooldownUntil && Date.now() < state.allianceJoinCooldownUntil){
    showToast('⏳ Cooldown','You must wait before joining a new alliance.','error'); return;
  }
  try{
    await db.collection('alliances').doc(allianceId).collection('requests').doc(UID).set({
      uid: UID, username: window.__playerUsername || 'Player', ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
    allianceRequestedIds.add(allianceId);
    showToast('📨 Request Sent','Waiting for approval.','success');
  }catch(e){ console.error(e); showToast('❌','Failed to send request.','error'); }
  renderBody();
}

async function checkMyAllianceInvites(){
  if(!db || state.allianceId){ allianceMyInvites = []; return; }
  try{
    const snap = await db.collectionGroup('invites').where('uid','==',UID).get();
    allianceMyInvites = snap.docs.map(d => ({ allianceId: d.ref.parent.parent.id, ...d.data() }));
  }catch(e){ console.error('Invite check failed (composite index may be required)', e); allianceMyInvites = []; }
}

async function acceptAllianceInvite(allianceId){
  if(!db || state.allianceId) return;
  allianceLoading = true; renderBody();
  try{
    const allianceRef = db.collection('alliances').doc(allianceId);
    await db.runTransaction(async (tx) => {
      const aDoc = await tx.get(allianceRef);
      if(!aDoc.exists) throw new Error('NOT_FOUND');
      const a = aDoc.data();
      if((a.memberCount||0) >= (a.maxMembers||20)) throw new Error('FULL');
      tx.update(allianceRef, { memberCount: firebase.firestore.FieldValue.increment(1) });
      tx.set(allianceRef.collection('members').doc(UID), {
        uid: UID, username: window.__playerUsername || 'Player', role: 'recruit',
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalDonated: 0, weeklyDonated: 0, lastActiveTs: Date.now(), warnings: 0, exempt: false,
      });
      tx.delete(allianceRef.collection('invites').doc(UID));
      tx.update(db.collection('players').doc(UID), { allianceId, allianceRole: 'recruit' });
    });
    state.allianceId = allianceId; state.allianceRole = 'recruit';
    updateMissionProgress('alliance_joined', 1);
    scheduleSave();
    await loadMyAlliance();
    allianceView = 'home';
    startAllianceChatListener();
    showToast('✅ Joined','Welcome to the alliance!','success');
  }catch(e){
    showToast('❌', e.message==='FULL' ? 'Alliance is full.' : 'Failed to join.', 'error');
  }
  allianceLoading = false; renderBody();
  if(typeof renderBottomNav === 'function') renderBottomNav();
}

async function declineAllianceInvite(allianceId){
  if(!db) return;
  try{ await db.collection('alliances').doc(allianceId).collection('invites').doc(UID).delete(); }catch(e){}
  await checkMyAllianceInvites();
  renderBody();
  if(typeof renderBottomNav === 'function') renderBottomNav();
}

async function loadAllianceRequests(){
  if(!db || !state.allianceId || !allianceCan(state.allianceRole,'manageRequests')){ allianceRequests = []; return; }
  try{
    const snap = await db.collection('alliances').doc(state.allianceId).collection('requests').get();
    allianceRequests = snap.docs.map(d => ({ uid:d.id, ...d.data() }));
  }catch(e){ console.error(e); allianceRequests = []; }
}

async function approveJoinRequest(uid, username){
  if(!allianceCan(state.allianceRole,'manageRequests') || !db) return;
  const allianceRef = db.collection('alliances').doc(state.allianceId);
  try{
    await db.runTransaction(async (tx) => {
      const aDoc = await tx.get(allianceRef);
      const a = aDoc.data();
      if((a.memberCount||0) >= (a.maxMembers||20)) throw new Error('FULL');
      tx.update(allianceRef, { memberCount: firebase.firestore.FieldValue.increment(1) });
      tx.set(allianceRef.collection('members').doc(uid), {
        uid, username, role: 'recruit', joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalDonated: 0, weeklyDonated: 0, lastActiveTs: Date.now(), warnings: 0, exempt: false,
      });
      tx.delete(allianceRef.collection('requests').doc(uid));
      tx.update(db.collection('players').doc(uid), { allianceId: state.allianceId, allianceRole: 'recruit' });
    });
    await loadAllianceRequests();
    await loadMyAlliance();
    showToast('✅ Approved', `${username} joined the alliance.`, 'success');
  }catch(e){
    showToast('❌', e.message==='FULL' ? 'Alliance is full.' : 'Failed.', 'error');
  }
  renderBody();
  if(typeof renderBottomNav === 'function') renderBottomNav();
}

async function rejectJoinRequest(uid){
  if(!allianceCan(state.allianceRole,'manageRequests') || !db) return;
  try{ await db.collection('alliances').doc(state.allianceId).collection('requests').doc(uid).delete(); }catch(e){}
  await loadAllianceRequests();
  renderBody();
  if(typeof renderBottomNav === 'function') renderBottomNav();
}

async function findUsernameDoc(uname){
  const tried = new Set();
  const candidates = [
    uname,
    uname.toLowerCase(),
    uname.toUpperCase(),
    uname.charAt(0).toUpperCase() + uname.slice(1).toLowerCase(),
  ];
  for(const cand of candidates){
    if(!cand || tried.has(cand)) continue;
    tried.add(cand);
    const doc = await db.collection('usernames').doc(cand).get();
    if(doc.exists) return doc;
  }
  return null;
}

async function inviteToAlliance(){
  if(!db || !state.allianceId || !allianceCan(state.allianceRole,'invite')) return;
  const input = document.getElementById('allianceInviteInput');
  const uname = input ? input.value.trim() : '';
  if(!uname) return;
  try{
    const uDoc = await findUsernameDoc(uname);
    if(!uDoc){ showToast('❌','Player not found. Check the spelling.','error'); return; }
    const targetUid = uDoc.data().uid;
    if(targetUid === UID){ showToast('❌',"You can't invite yourself.",'error'); return; }
    const targetPlayerDoc = await db.collection('players').doc(targetUid).get();
    if(targetPlayerDoc.exists && targetPlayerDoc.data().allianceId){ showToast('❌','Player is already in an alliance.','error'); return; }
    const realUname = (targetPlayerDoc.exists && targetPlayerDoc.data().username) || uname;
    await db.collection('alliances').doc(state.allianceId).collection('invites').doc(targetUid).set({
      uid: targetUid, username: realUname, invitedBy: window.__playerUsername || 'Player',
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
    if(input) input.value = '';
    await loadSentInvites();
    showToast('✉️ Invite Sent', `Invited ${realUname}.`, 'success');
  }catch(e){ console.error(e); showToast('❌','Failed to invite.','error'); }
  renderBody();
}

async function loadSentInvites(){
  if(!db || !state.allianceId || !allianceCan(state.allianceRole,'invite')){ allianceSentInvites = []; return; }
  try{
    const snap = await db.collection('alliances').doc(state.allianceId).collection('invites').get();
    allianceSentInvites = snap.docs.map(d => ({ uid:d.id, ...d.data() }));
  }catch(e){ console.error('Load sent invites failed', e); allianceSentInvites = []; }
}

async function cancelAllianceInvite(targetUid){
  if(!allianceCan(state.allianceRole,'invite') || !db) return;
  try{
    await db.collection('alliances').doc(state.allianceId).collection('invites').doc(targetUid).delete();
    await loadSentInvites();
    showToast('✉️ Invite Cancelled','','success');
  }catch(e){ console.error(e); }
  renderBody();
}

function alliancePendingBadgeCount(){
  if(state.allianceId){
    return allianceCan(state.allianceRole,'manageRequests') ? allianceRequests.length : 0;
  }
  return allianceMyInvites.length;
}

async function checkAllianceLevelUp(){
  if(!allianceData) return;
  const a = allianceData.alliance;
  const newLevel = allianceLevelForPoints(a.points || 0);
  if(newLevel > (a.level || 1)){
    try{
      await db.collection('alliances').doc(state.allianceId).update({
        level: newLevel, maxMembers: allianceLevelInfo(newLevel).maxMembers,
      });
      showToast('🎉 Alliance Level Up!', `Now level ${newLevel}`, 'success');
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
    updateMissionProgress('alliance_donated', amount);
    scheduleSave();
    await loadMyAlliance();
    await checkAllianceLevelUp();
    showToast('💰 Donated', `+${fmtG(amount)} to the treasury`, 'success');
  }catch(e){ console.error(e); showToast('❌','Donation failed.','error'); }
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

async function leaveAllianceConfirm(){
  if(!confirm('Leave the alliance? You will lose 50% of your contribution record and must wait 24h before joining another.')) return;
  await leaveAlliance();
}
async function leaveAlliance(){
  if(!db || !state.allianceId) return;
  if(state.allianceRole === 'leader'){ showToast('❌','Transfer leadership or disband instead.','error'); return; }
  try{
    await db.collection('alliances').doc(state.allianceId).collection('members').doc(UID).delete();
    await db.collection('alliances').doc(state.allianceId).update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
    const cooldownUntil = Date.now() + ALLIANCE_JOIN_COOLDOWN_MS;
    await db.collection('players').doc(UID).update({ allianceId: null, allianceRole: null, allianceJoinCooldownUntil: cooldownUntil });
    state.allianceId = null; state.allianceRole = null; state.allianceJoinCooldownUntil = cooldownUntil;
    allianceData = null; stopAllianceChatListener(); scheduleSave();
    allianceView = 'browse';
    showToast('🚪 Left Alliance','','success');
  }catch(e){ console.error(e); showToast('❌','Failed to leave.','error'); }
  renderBody();
}

async function disbandAllianceConfirm(){
  if(!confirm('Disband the alliance permanently? The treasury will be split among members by contribution. This cannot be undone.')) return;
  await disbandAlliance();
}
async function disbandAlliance(){
  if(!db || state.allianceRole !== 'leader') return;
  allianceLoading = true; renderBody();
  try{
    const allianceRef = db.collection('alliances').doc(state.allianceId);
    const [membersSnap, aDoc] = await Promise.all([allianceRef.collection('members').get(), allianceRef.get()]);
    const members = membersSnap.docs.map(d => ({ uid:d.id, ...d.data() }));
    const treasury = (aDoc.data() || {}).treasury || {};
    const totalDonated = members.reduce((s,m) => s + (m.totalDonated||0), 0) || 1;
    const goldPool = treasury.gold || 0;
    const batch = db.batch();
    for(const m of members){
      const share = (m.totalDonated || 0) / totalDonated;
      const goldShare = Math.floor(goldPool * share);
      if(m.uid === UID){
        state.gold += goldShare;
      } else if(goldShare > 0){
        batch.update(db.collection('players').doc(m.uid), { gold: firebase.firestore.FieldValue.increment(goldShare) });
      }
      batch.update(db.collection('players').doc(m.uid), {
        allianceId: null, allianceRole: null,
        ...(m.uid === UID
          ? { allianceDisbandCooldownUntil: Date.now() + ALLIANCE_DISBAND_COOLDOWN_MS }
          : { allianceJoinCooldownUntil: Date.now() + ALLIANCE_JOIN_COOLDOWN_MS }),
      });
      batch.delete(allianceRef.collection('members').doc(m.uid));
    }
    batch.delete(db.collection('allianceNames').doc(((aDoc.data()||{}).name || '').toLowerCase()));
    batch.delete(allianceRef);
    await batch.commit();
    state.allianceId = null; state.allianceRole = null;
    state.allianceDisbandCooldownUntil = Date.now() + ALLIANCE_DISBAND_COOLDOWN_MS;
    allianceData = null; stopAllianceChatListener(); scheduleSave();
    allianceView = 'browse';
    showToast('💥 Alliance Disbanded','Treasury distributed to members.','success');
  }catch(e){ console.error(e); showToast('❌','Failed to disband.','error'); }
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
    if(allianceView === 'manage'){ await loadAllianceRequests(); await loadSentInvites(); }
  } else {
    await checkMyAllianceInvites();
    if(!allianceBrowseSearched) await browseAlliances();
  }
  renderBody();
  if(typeof renderBottomNav === 'function') renderBottomNav();
}

function setAllianceView(v){
  allianceView = v;
  allianceError = '';
  if(v === 'browse' && !allianceBrowseSearched) browseAlliances();
  if(v === 'manage'){ loadAllianceRequests().then(()=>{ if(typeof renderBottomNav==='function') renderBottomNav(); }); loadSentInvites().then(renderBodyUnlessTyping); }
  renderBody();
}

/* ═══════════════════ RENDERING ═══════════════════ */
function renderAlliance(){
  if(!db){
    return `
      <div class="panel">
        <div class="panel-header">🏛️ Alliances</div>
        <div style="padding:20px;text-align:center;color:var(--dim);font-size:13px;">
          🔌 Alliances require cloud save (Firebase) to be configured.<br>
          Set up your Firebase credentials to unlock this feature.
        </div>
      </div>`;
  }
  if(state.allianceId && allianceData) return renderAllianceDashboard();
  if(state.allianceId && !allianceData && allianceLoading) return `<div class="panel"><div style="padding:30px;text-align:center;color:var(--dim);">Loading alliance…</div></div>`;
  return renderAllianceLanding();
}

function renderAllianceLanding(){
  const cooldown = state.allianceJoinCooldownUntil && Date.now() < state.allianceJoinCooldownUntil
    ? state.allianceJoinCooldownUntil - Date.now() : 0;
  const tabs = [
    { id:'browse', label:'🔍 Browse' },
    { id:'create', label:'🏛️ Create' },
  ];
  let body = '';
  if(allianceView === 'create') body = renderAllianceCreateForm();
  else body = renderAllianceBrowse();

  return `
    <div class="alliance-hero">
      <div class="alliance-hero-top">
        <div class="alliance-hero-emblem">🏛️</div>
        <div style="flex:1;min-width:0;">
          <div class="alliance-hero-name">Alliances</div>
          <div class="alliance-hero-meta">Team up with other players to trade, fight, and grow together.</div>
        </div>
      </div>
      ${cooldown > 0 ? `<div style="background:rgba(184,92,82,0.12);border:1px solid var(--red);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--red);margin-top:12px;">⏳ You must wait ${Math.ceil(cooldown/3600000)}h before joining a new alliance.</div>` : ''}
      <div class="alliance-tabbar">
        ${tabs.map(t => `<button class="alliance-tab ${allianceView===t.id?'active':''}" onclick="setAllianceView('${t.id}')">${t.label}</button>`).join('')}
      </div>
    </div>
    ${renderAllianceInvitesBox()}
    ${body}`;
}

function renderAllianceInvitesBox(){
  if(!allianceMyInvites.length) return '';
  return `
    <div class="alliance-notice-card">
      <div class="alliance-notice-title">✉️ Pending Invitations (${allianceMyInvites.length})</div>
      ${allianceMyInvites.map(inv => `
        <div class="alliance-notice-row">
          <div class="who">Invited by <b>${inv.invitedBy}</b></div>
          <div style="display:flex;gap:6px;">
            <button class="mini-btn buy" onclick="acceptAllianceInvite('${inv.allianceId}')">Accept</button>
            <button class="mini-btn" onclick="declineAllianceInvite('${inv.allianceId}')">Decline</button>
          </div>
        </div>`).join('')}
    </div>`;
}

function renderAllianceCreateForm(){
  const canAfford = state.gold >= ALLIANCE_CREATE_COST;
  const meetsLevel = state.level >= ALLIANCE_CREATE_MIN_LEVEL;
  const emblems = ALLIANCE_EMBLEMS;
  return `
    <div class="panel">
      <div class="panel-header">🏛️ Found a New Alliance</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:10px;">Requires level ${ALLIANCE_CREATE_MIN_LEVEL}+ and ${fmtG(ALLIANCE_CREATE_COST)} gold.</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="font-size:11px;color:${meetsLevel?'var(--green)':'var(--red)'};">Level ${state.level}/${ALLIANCE_CREATE_MIN_LEVEL} ${meetsLevel?'✓':'✗'}</div>
        <div style="font-size:11px;color:${canAfford?'var(--green)':'var(--red)'};">Gold ${fmtG(state.gold)}/${fmtG(ALLIANCE_CREATE_COST)} ${canAfford?'✓':'✗'}</div>
      </div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px;">Alliance Name</div>
      <input id="allianceNameInput" class="username-input" style="margin-bottom:10px;" maxlength="20" placeholder="e.g. Iron Vanguard">
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px;">Description (optional)</div>
      <input id="allianceDescInput" class="username-input" style="margin-bottom:10px;" maxlength="120" placeholder="What is this alliance about?">
      <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">Emblem</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:10px;">
        ${emblems.map(e => `<button class="mini-btn ${allianceCreateEmblem===e?'buy':''}" style="font-size:18px;padding:8px 0;${allianceCreateEmblem===e?'background:rgba(212,162,76,0.14);border-color:var(--brass);':''}" onclick="allianceCreateEmblem='${e}';renderBody();">${e}</button>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">Alliance Type</div>
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        <button class="mini-btn ${allianceCreateType==='open'?'buy':''}" style="flex:1;${allianceCreateType==='open'?'background:rgba(111,162,133,0.14);border-color:var(--green);':''}" onclick="allianceCreateType='open';renderBody();"><img class="ui-icon" src="${ICONS.globe}" alt="🌐"> Open — anyone can join</button>
        <button class="mini-btn ${allianceCreateType==='closed'?'buy':''}" style="flex:1;${allianceCreateType==='closed'?'background:rgba(111,162,133,0.14);border-color:var(--green);':''}" onclick="allianceCreateType='closed';renderBody();">🔒 Closed — approval required</button>
      </div>
      ${allianceError ? `<div style="color:var(--red);font-size:12px;margin-bottom:10px;">${allianceError}</div>` : ''}
      <button class="act-btn buy" style="width:100%;padding:12px;" ${(!canAfford||!meetsLevel||allianceLoading)?'disabled':''} onclick="createAllianceSubmit()">
        ${allianceLoading ? 'Founding…' : `🏛️ Found Alliance (${fmtG(ALLIANCE_CREATE_COST)} gold)`}
      </button>
    </div>`;
}

function renderAllianceBrowse(){
  return `
    <div class="panel">
      <div class="panel-header">🔍 Browse Alliances</div>
      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <input id="allianceSearchInput" class="username-input" style="margin-bottom:0;flex:1;" placeholder="Search by name…" onkeydown="if(event.key==='Enter')browseAlliances()">
        <button class="act-btn buy" style="width:auto;padding:0 16px;" onclick="browseAlliances()">Search</button>
      </div>
      ${allianceLoading ? `<div style="text-align:center;padding:20px;color:var(--dim);">Loading…</div>` : renderAllianceBrowseList()}
    </div>`;
}

function renderAllianceBrowseList(){
  if(!allianceBrowseResults.length){
    return `<div class="alliance-empty"><div class="ae-icon">🔍</div><div class="ae-text">${allianceBrowseSearched ? 'No alliances found.' : 'Search to find alliances to join.'}</div></div>`;
  }
  return allianceBrowseResults.map(a => {
    const full = (a.memberCount||0) >= (a.maxMembers||20);
    const requested = allianceRequestedIds.has(a.id);
    let action;
    if(full) action = `<span class="alliance-status-chip full">Full</span>`;
    else if(a.type==='open') action = `<button class="mini-btn buy" onclick="joinAllianceOpen('${a.id}')">Join</button>`;
    else if(requested) action = `<span class="alliance-status-chip pending">📨 Requested</span>`;
    else action = `<button class="mini-btn" onclick="requestJoinAlliance('${a.id}')">Request</button>`;
    return `
    <div class="card alliance-list-card">
      <div class="alliance-list-emblem">${a.emblem||'⚔️'}</div>
      <div style="flex:1;min-width:0;">
        <div class="alliance-list-name">${a.name} <span style="color:var(--dim);font-size:11px;font-weight:400;">Lv.${a.level||1}</span></div>
        <div class="alliance-list-meta">${a.memberCount||0}/${a.maxMembers||20} members · ${a.type==='open'?`<img class=\"ui-icon\" src=\"${ICONS.globe}\" alt=\"🌐\">  Open`:'🔒 Closed'} · Leader: ${a.leaderName||'—'}</div>
      </div>
      ${action}
    </div>`;
  }).join('');
}

function renderAllianceDashboard(){
  const { alliance, members, myMember } = allianceData;
  const role = state.allianceRole;
  const roleInfo = ALLIANCE_ROLES[role] || ALLIANCE_ROLES.member;
  const lvlInfo = allianceLevelInfo(alliance.level || 1);
  const nextLvl = allianceNextLevelInfo(alliance.level || 1);
  const pointsPct = nextLvl ? Math.min(100, ((alliance.points||0) - lvlInfo.cost) / (nextLvl.cost - lvlInfo.cost) * 100) : 100;

  const manageBadge = allianceCan(role,'manageRequests') ? allianceRequests.length : 0;
  const chatBadge = typeof allianceChatUnread !== 'undefined' ? allianceChatUnread : 0;
  const tabs = [
    { id:'home',    label:'🏛️ Home' },
    { id:'members', label:'👥 Members' },
    { id:'chat',    label:'💬 Chat', badge: chatBadge, onclick: "openChatDrawer('alliance')" },
  ];
  if(allianceCan(role,'invite') || allianceCan(role,'editInfo')) tabs.push({ id:'manage', label:`<img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️"> Manage`, badge: manageBadge });

  let body = '';
  if(allianceView === 'members') body = renderAllianceMembers();
  else if(allianceView === 'manage') body = renderAllianceManage();
  else body = renderAllianceHome();

  return `
    <div class="alliance-hero">
      <div class="alliance-hero-top">
        <div class="alliance-hero-emblem">${alliance.emblem||'⚔️'}</div>
        <div style="flex:1;min-width:0;">
          <div class="alliance-hero-name">${alliance.name}</div>
          <div class="alliance-hero-meta">${alliance.memberCount||0}/${alliance.maxMembers||20} members · ${roleInfo.icon} ${roleInfo.name}</div>
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
    { cls:'gold', icon:'🪙', label:'Weekly Donated', value: fmtG(weeklyTotal) },
    { cls:'gold', icon:'📊', label:'Donated / Member', value: fmtG(weeklyPerMember) },
    { cls:'gold', icon:'🏆', label:'Total Contribution', value: fmtG(alliance.points||0) },
    { cls:'mint', icon:'👥', label:'Active Members', value: `${activeThisWeek}/${memberCount}` },
    { cls:'mint', icon:'🏛️', label:'Alliance Level', value: alliance.level||1 },
    { cls:'mint', icon:'🎖️', label:'Roster', value: `${alliance.memberCount||memberCount}/${alliance.maxMembers||20}` },
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
      <div class="panel-header">🏛️ Government</div>
      ${govOrder.length ? `
        <div class="gov-row">
          ${govOrder.map(m => {
            const roleInfo = ALLIANCE_ROLES[m.role] || ALLIANCE_ROLES.member;
            const cls = m.role === 'leader' ? 'leader' : m.role === 'coleader' ? 'coleader' : 'officer';
            return `
            <div class="gov-card" title="${m.username} · ${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)}">
              <div class="gov-avatar-wrap">
                <div class="gov-avatar ${cls}">${roleInfo.icon}</div>
                <div class="gov-badge">${fmtG(m.totalDonated||0)}</div>
              </div>
              <div class="gov-name">${m.username}</div>
              <div class="gov-role">${roleInfo.name}</div>
            </div>`;
          }).join('')}
        </div>` : `<div style="text-align:center;padding:12px;color:var(--dim);font-size:12px;">No officers appointed yet.</div>`}
    </div>`;
}

function renderAllianceHome(){
  const { alliance, myMember, members } = allianceData;
  const treasury = alliance.treasury || {};
  const treasuryEntries = Object.keys(treasury).filter(k => treasury[k] > 0);
  const canLeave = state.allianceRole !== 'leader';
  const weeklyTotal = (members||[]).reduce((sum,m)=> sum + (m.weeklyDonated||0), 0);
  const activeThisWeek = (members||[]).filter(m => (m.weeklyDonated||0) > 0).length;

  return `
    ${renderAllianceOverview()}
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">📜 About</div>
      <div style="font-size:12px;color:var(--text);margin-bottom:8px;">${alliance.description || 'No description yet.'}</div>
      <div style="font-size:11px;color:var(--dim);">${alliance.type==='open'?`<img class=\"ui-icon\" src=\"${ICONS.globe}\" alt=\"🌐\">  Open — anyone can join`:'🔒 Closed — approval required'}</div>
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
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">💰 Treasury</div>
      ${treasuryEntries.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${treasuryEntries.map(k => `<span class="resource-chip">${k==='gold'?'🪙':(ITEMS[k]?ITEMS[k].icon:'')} ${k==='gold'?'Gold':(ITEMS[k]?ITEMS[k].name:k)}: ${fmtG(treasury[k])}</span>`).join('')}
        </div>` : `<div style="font-size:12px;color:var(--dim);margin-bottom:12px;">The treasury is empty. Be the first to donate!</div>`}
      <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">Donate to the treasury (earns alliance points):</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${ALLIANCE_DONATABLE.map(k => {
          const have = k==='gold' ? state.gold : (state.inv[k]||0);
          const icon = k==='gold' ? '🪙' : (ITEMS[k] ? ITEMS[k].icon : '');
          const name = k==='gold' ? 'Gold' : (ITEMS[k] ? ITEMS[k].name : k);
          const amt = Math.min(have, k==='gold'?500:50);
          return `<button class="mini-btn" style="font-size:11px;" ${have<=0?'disabled':''} onclick="donateToAlliance('${k}', promptAllianceDonateAmount('${k}','${name}', ${have}))">${icon} ${name} (${fmtG(have)})</button>`;
        }).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">🚪 Alliance Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${canLeave ? `<button class="act-btn" style="width:auto;padding:9px 16px;border-color:var(--red);color:var(--red);" onclick="leaveAllianceConfirm()">🚪 Leave Alliance</button>` : ''}
      </div>
      ${canLeave ? `<div style="font-size:10px;color:var(--dim);margin-top:6px;">Leaving forfeits 50% of your contribution record and applies a 24h cooldown before joining another alliance.</div>` : ''}
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
  const atRisk = isMemberAtRisk(m);
  const activity = memberActivityPct(m);
  const dotColor = activity >= 60 ? 'var(--green)' : activity >= 25 ? 'var(--brass-bright)' : 'var(--red)';
  return `
    <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;${atRisk?'border-color:var(--red);':''}">
      <div style="position:relative;">
        <div style="font-size:20px;">${roleInfo.icon}</div>
        <div title="Activity ${activity}%" style="position:absolute;bottom:-2px;right:-2px;width:9px;height:9px;border-radius:50%;background:${dotColor};border:1.5px solid var(--panel);"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:var(--text);font-size:13px;">${m.username}${isMe?' <span style="color:var(--dim);font-size:11px;">(you)</span>':''}</div>
        <div style="font-size:11px;color:var(--dim);">${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)} · Activity ${activity}%${atRisk?' · <span style="color:var(--red);">Inactive</span>':''}${m.exempt?' · <span style="color:var(--green);">Exempt</span>':''}</div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
        ${canPromote?`<button class="mini-btn" onclick="promoteMember('${m.uid}','${m.role}')" title="Promote"><img class="ui-icon" src="${ICONS.upgrade}" alt="⬆️"></button>`:''}
        ${canDemote?`<button class="mini-btn" onclick="demoteMember('${m.uid}','${m.role}')" title="Demote">⬇️</button>`:''}
        ${canExempt?`<button class="mini-btn" onclick="toggleMemberExempt('${m.uid}', ${!!m.exempt})" title="Toggle inactivity exemption">${m.exempt?'🔓':'🔒'}</button>`:''}
        ${canManage?`<button class="mini-btn" style="color:var(--red);border-color:var(--red);" onclick="kickMember('${m.uid}','${m.role}')" title="Kick">✕</button>`:''}
      </div>
    </div>`;
}

function renderAllianceManage(){
  const { alliance } = allianceData;
  const canInvite = allianceCan(state.allianceRole,'invite');
  const canRequests = allianceCan(state.allianceRole,'manageRequests');
  const canEdit = allianceCan(state.allianceRole,'editInfo');
  let html = '';

  if(canInvite){
    html += `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">✉️ Invite a Player</div>
      <div style="display:flex;gap:6px;margin-bottom:${allianceSentInvites.length?'10px':'0'};">
        <input id="allianceInviteInput" class="username-input" style="margin-bottom:0;flex:1;" placeholder="Username…" onkeydown="if(event.key==='Enter')inviteToAlliance()">
        <button class="act-btn buy" style="width:auto;padding:0 16px;" onclick="inviteToAlliance()">Invite</button>
      </div>
      ${allianceSentInvites.length ? `
        <div style="font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;">Sent Invites (${allianceSentInvites.length})</div>
        ${allianceSentInvites.map(inv => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border);">
            <div style="font-size:12px;color:var(--text);">${inv.username}</div>
            <button class="mini-btn" onclick="cancelAllianceInvite('${inv.uid}')">Cancel</button>
          </div>`).join('')}` : ''}
    </div>`;
  }

  if(canRequests && alliance.type === 'closed'){
    html += `
    <div class="alliance-notice-card">
      <div class="alliance-notice-title">📨 Join Requests (${allianceRequests.length})</div>
      ${allianceRequests.length ? allianceRequests.map(r => `
        <div class="alliance-notice-row">
          <div class="who">${r.username}</div>
          <div style="display:flex;gap:6px;">
            <button class="mini-btn buy" onclick="approveJoinRequest('${r.uid}','${r.username}')">Approve</button>
            <button class="mini-btn" onclick="rejectJoinRequest('${r.uid}')">Reject</button>
          </div>
        </div>`).join('') : `<div style="font-size:12px;color:var(--dim);">No pending requests.</div>`}
    </div>`;
  }

  const atRiskMembers = allianceData.members.filter(isMemberAtRisk);
  if(allianceCan(state.allianceRole,'removeInactive')){
    html += `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">⚠️ Inactivity Review</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Members inactive 7+ days with activity below 10% are flagged. Exempt them below or remove them from the Members tab.</div>
      ${atRiskMembers.length ? atRiskMembers.map(m => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border);">
          <div style="font-size:12px;color:var(--red);">${m.username} — ${memberActivityPct(m)}% activity</div>
          <div style="display:flex;gap:6px;">
            <button class="mini-btn" onclick="toggleMemberExempt('${m.uid}', ${!!m.exempt})">Exempt</button>
            <button class="mini-btn" style="color:var(--red);border-color:var(--red);" onclick="kickMember('${m.uid}','${m.role}')">Remove</button>
          </div>
        </div>`).join('') : `<div style="font-size:12px;color:var(--dim);">No inactive members right now.</div>`}
    </div>`;
  }

  if(canEdit){
    if(allianceEditEmblem === null) allianceEditEmblem = alliance.emblem || '⚔️';
    html += `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header"><img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️"> Alliance Profile</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px;">Alliance Name</div>
      <input id="allianceEditNameInput" class="username-input" style="margin-bottom:10px;" maxlength="20" value="${(alliance.name||'').replace(/"/g,'&quot;')}">
      <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">Emblem</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:10px;">
        ${ALLIANCE_EMBLEMS.map(e => `<button class="mini-btn ${allianceEditEmblem===e?'buy':''}" style="font-size:18px;padding:8px 0;${allianceEditEmblem===e?'background:rgba(212,162,76,0.14);border-color:var(--brass);':''}" onclick="allianceEditEmblem='${e}';renderBody();">${e}</button>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px;">Description</div>
      <input id="allianceEditDescInput" class="username-input" style="margin-bottom:10px;" maxlength="120" value="${(alliance.description||'').replace(/"/g,'&quot;')}">
      <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">Alliance Type</div>
      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <button class="mini-btn ${alliance.type==='open'?'buy':''}" style="flex:1;" onclick="updateAllianceType('open')"><img class="ui-icon" src="${ICONS.globe}" alt="🌐"> Open</button>
        <button class="mini-btn ${alliance.type==='closed'?'buy':''}" style="flex:1;" onclick="updateAllianceType('closed')">🔒 Closed</button>
      </div>
      <button class="act-btn buy" style="width:100%;padding:10px;" onclick="saveAllianceProfile()">Save Changes</button>
    </div>`;
  }

  if(state.allianceRole === 'leader'){
    html += `
    <div class="panel" style="border-color:var(--red);">
      <div class="panel-header" style="color:var(--red);">💀 Danger Zone</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:10px;">Disbanding splits the treasury among members by contribution and applies a 7-day cooldown before founding a new alliance. This cannot be undone.</div>
      <button class="act-btn" style="width:100%;padding:10px;border-color:var(--red);color:var(--red);" onclick="disbandAllianceConfirm()">💥 Disband Alliance</button>
    </div>`;
  }

  return html || `<div class="panel"><div style="padding:20px;text-align:center;color:var(--dim);">No management permissions.</div></div>`;
}

async function saveAllianceProfile(){
  if(!allianceCan(state.allianceRole,'editInfo') || !db) return;
  const nameInput = document.getElementById('allianceEditNameInput');
  const descInput = document.getElementById('allianceEditDescInput');
  const newName = (nameInput ? nameInput.value : '').trim();
  const desc = (descInput ? descInput.value : '').trim().slice(0, 120);
  const newEmblem = allianceEditEmblem || allianceData.alliance.emblem || '⚔️';
  const oldName = allianceData.alliance.name || '';

  if(newName.length < 3 || newName.length > 20){ showToast('❌','Name must be 3-20 characters.','error'); return; }
  if(!/^[\p{L}\p{N} _\-]+$/u.test(newName)){ showToast('❌','Name contains disallowed characters.','error'); return; }

  allianceLoading = true; renderBody();
  try{
    const allianceRef = db.collection('alliances').doc(state.allianceId);
    if(newName.toLowerCase() !== oldName.toLowerCase()){
      const oldKey = oldName.toLowerCase();
      const newKey = newName.toLowerCase();
      const newNameRef = db.collection('allianceNames').doc(newKey);
      await db.runTransaction(async (tx) => {
        const newNameDoc = await tx.get(newNameRef);
        if(newNameDoc.exists) throw new Error('NAME_TAKEN');
        tx.set(newNameRef, { allianceId: state.allianceId, name: newName });
        tx.delete(db.collection('allianceNames').doc(oldKey));
        tx.update(allianceRef, { name: newName, emblem: newEmblem, description: desc });
      });
    } else {
      await allianceRef.update({ name: newName, emblem: newEmblem, description: desc });
    }
    await loadMyAlliance();
    showToast('✅ Saved','Alliance profile updated.','success');
  }catch(e){
    if(e.message === 'NAME_TAKEN') showToast('❌','That name is already taken.','error');
    else { console.error(e); showToast('❌','Failed to save changes.','error'); }
  }
  allianceLoading = false; renderBody();
}

async function updateAllianceType(type){
  if(!allianceCan(state.allianceRole,'editInfo') || !db) return;
  try{
    await db.collection('alliances').doc(state.allianceId).update({ type });
    await loadMyAlliance();
  }catch(e){ console.error(e); }
  renderBody();
}
