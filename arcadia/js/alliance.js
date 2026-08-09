/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Alliance System
   Guilds/alliances: creation, roles, treasury, donations, activity,
   leveling, invites/requests, chat, promotion/kick, leave/disband.
   ═══════════════════════════════════════════════════════════════ */

/* ===== CONFIG ===== */
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
let allianceChatMsgs = [];
let allianceChatUnsub = null;
let allianceError = '';
let allianceCreateEmblem = '⚔️';
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
    scheduleSave();
    await loadMyAlliance();
    allianceView = 'home';
    showToast('✅ Joined Alliance','Welcome!','success');
  }catch(e){
    const msg = e.message==='FULL' ? 'Alliance is full.' : e.message==='NOT_OPEN' ? 'This alliance requires an invite or request.' : 'Failed to join.';
    showToast('❌', msg, 'error');
  }
  allianceLoading = false; renderBody();
}

async function requestJoinAlliance(allianceId){
  if(!db || state.allianceId) return;
  if(state.allianceJoinCooldownUntil && Date.now() < state.allianceJoinCooldownUntil){
    showToast('⏳ Cooldown','You must wait before joining a new alliance.','error'); return;
  }
  try{
    await db.collection('alliances').doc(allianceId).collection('requests').doc(UID).set({
      uid: UID, username: window.__playerUsername || 'Player', ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast('📨 Request Sent','Waiting for approval.','success');
  }catch(e){ console.error(e); showToast('❌','Failed to send request.','error'); }
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
    scheduleSave();
    await loadMyAlliance();
    allianceView = 'home';
    showToast('✅ Joined','Welcome to the alliance!','success');
  }catch(e){
    showToast('❌', e.message==='FULL' ? 'Alliance is full.' : 'Failed to join.', 'error');
  }
  allianceLoading = false; renderBody();
}

async function declineAllianceInvite(allianceId){
  if(!db) return;
  try{ await db.collection('alliances').doc(allianceId).collection('invites').doc(UID).delete(); }catch(e){}
  await checkMyAllianceInvites();
  renderBody();
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
}

async function rejectJoinRequest(uid){
  if(!allianceCan(state.allianceRole,'manageRequests') || !db) return;
  try{ await db.collection('alliances').doc(state.allianceId).collection('requests').doc(uid).delete(); }catch(e){}
  await loadAllianceRequests();
  renderBody();
}

async function inviteToAlliance(){
  if(!db || !state.allianceId || !allianceCan(state.allianceRole,'invite')) return;
  const input = document.getElementById('allianceInviteInput');
  const uname = input ? input.value.trim() : '';
  if(!uname) return;
  try{
    const uDoc = await db.collection('usernames').doc(uname).get();
    if(!uDoc.exists){ showToast('❌','Player not found.','error'); return; }
    const targetUid = uDoc.data().uid;
    const targetPlayerDoc = await db.collection('players').doc(targetUid).get();
    if(targetPlayerDoc.exists && targetPlayerDoc.data().allianceId){ showToast('❌','Player is already in an alliance.','error'); return; }
    await db.collection('alliances').doc(state.allianceId).collection('invites').doc(targetUid).set({
      uid: targetUid, username: uname, invitedBy: window.__playerUsername || 'Player',
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
    if(input) input.value = '';
    showToast('✉️ Invite Sent', `Invited ${uname}.`, 'success');
  }catch(e){ console.error(e); showToast('❌','Failed to invite.','error'); }
  renderBody();
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

/* ===== CHAT ===== */
function startAllianceChatListener(){
  if(!db || !state.allianceId) return;
  if(allianceChatUnsub) allianceChatUnsub();
  allianceChatUnsub = db.collection('alliances').doc(state.allianceId).collection('chat')
    .orderBy('ts','desc').limit(50)
    .onSnapshot(snap => {
      allianceChatMsgs = snap.docs.map(d => ({ id:d.id, ...d.data() })).reverse();
      if(allianceView === 'chat') renderBody();
    }, err => console.error('Alliance chat listener error', err));
}
function stopAllianceChatListener(){
  if(allianceChatUnsub){ allianceChatUnsub(); allianceChatUnsub = null; }
  allianceChatMsgs = [];
}
async function sendAllianceChatMsg(){
  const input = document.getElementById('allianceChatInput');
  let text = input ? input.value.trim() : '';
  if(!text || !db || !state.allianceId) return;
  if(text.length > 300) text = text.slice(0, 300);
  if(input) input.value = '';
  try{
    await db.collection('alliances').doc(state.allianceId).collection('chat').add({
      uid: UID, username: window.__playerUsername || 'Player', text,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
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
    if(allianceView === 'chat') startAllianceChatListener();
    if(allianceView === 'manage') await loadAllianceRequests();
  } else {
    await checkMyAllianceInvites();
    if(!allianceBrowseSearched) await browseAlliances();
  }
  renderBody();
}

function setAllianceView(v){
  allianceView = v;
  allianceError = '';
  if(v === 'browse' && !allianceBrowseSearched) browseAlliances();
  if(v === 'chat') startAllianceChatListener(); else stopAllianceChatListener();
  if(v === 'manage') loadAllianceRequests();
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
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">🏛️ Alliances</div>
      <div style="font-size:12px;color:var(--dim);padding:0 2px 10px;">Team up with other players to trade, fight, and grow together.</div>
      ${cooldown > 0 ? `<div style="background:rgba(184,92,82,0.12);border:1px solid var(--red);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--red);margin-bottom:10px;">⏳ You must wait ${Math.ceil(cooldown/3600000)}h before joining a new alliance.</div>` : ''}
      ${renderAllianceInvitesBox()}
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        ${tabs.map(t => `<button class="mini-btn ${allianceView===t.id?'buy':''}" style="flex:1;${allianceView===t.id?'background:rgba(212,162,76,0.14);border-color:var(--brass);color:var(--brass-bright);':''}" onclick="setAllianceView('${t.id}')">${t.label}</button>`).join('')}
      </div>
    </div>
    ${body}`;
}

function renderAllianceInvitesBox(){
  if(!allianceMyInvites.length) return '';
  return `
    <div style="background:rgba(212,162,76,0.10);border:1px solid var(--brass);border-radius:8px;padding:10px;margin-bottom:10px;">
      <div style="font-size:12px;font-weight:700;color:var(--brass-bright);margin-bottom:6px;">✉️ Pending Invitations</div>
      ${allianceMyInvites.map(inv => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border);">
          <div style="font-size:12px;color:var(--text);">Invited by <b>${inv.invitedBy}</b></div>
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
  const emblems = ['⚔️','🛡️','🐉','🦅','🐺','⭐','🔥','🌊','🏔️','💀','👑','🌙'];
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
        <button class="mini-btn ${allianceCreateType==='open'?'buy':''}" style="flex:1;${allianceCreateType==='open'?'background:rgba(111,162,133,0.14);border-color:var(--green);':''}" onclick="allianceCreateType='open';renderBody();">🌐 Open — anyone can join</button>
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
    return `<div style="text-align:center;padding:20px;color:var(--dim);font-size:12px;">${allianceBrowseSearched ? 'No alliances found.' : 'Search to find alliances to join.'}</div>`;
  }
  return allianceBrowseResults.map(a => {
    const full = (a.memberCount||0) >= (a.maxMembers||20);
    return `
    <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;">
      <div style="font-size:26px;">${a.emblem||'⚔️'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:var(--brass-bright);font-size:13px;">${a.name} <span style="color:var(--dim);font-size:11px;font-weight:400;">Lv.${a.level||1}</span></div>
        <div style="font-size:11px;color:var(--dim);">${a.memberCount||0}/${a.maxMembers||20} members · ${a.type==='open'?'🌐 Open':'🔒 Closed'} · Leader: ${a.leaderName||'—'}</div>
      </div>
      ${full ? `<span class="resource-chip" style="border-color:var(--red);color:var(--red);">Full</span>`
        : a.type==='open'
          ? `<button class="mini-btn buy" onclick="joinAllianceOpen('${a.id}')">Join</button>`
          : `<button class="mini-btn" onclick="requestJoinAlliance('${a.id}')">Request</button>`}
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

  const tabs = [
    { id:'home',    label:'🏛️ Home' },
    { id:'members', label:'👥 Members' },
    { id:'chat',    label:'💬 Chat' },
  ];
  if(allianceCan(role,'invite') || allianceCan(role,'editInfo')) tabs.push({ id:'manage', label:'⚙️ Manage' });

  let body = '';
  if(allianceView === 'members') body = renderAllianceMembers();
  else if(allianceView === 'chat') body = renderAllianceChat();
  else if(allianceView === 'manage') body = renderAllianceManage();
  else body = renderAllianceHome();

  return `
    <div class="panel" style="margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="font-size:34px;">${alliance.emblem||'⚔️'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);">${alliance.name}</div>
          <div style="font-size:11px;color:var(--dim);">Level ${alliance.level||1} · ${alliance.memberCount||0}/${alliance.maxMembers||20} members · ${roleInfo.icon} ${roleInfo.name}</div>
        </div>
      </div>
      <div style="margin-bottom:4px;display:flex;justify-content:space-between;font-size:10px;color:var(--dim);">
        <span>Lv.${alliance.level||1}</span><span>${nextLvl ? `${fmtG(alliance.points||0)}/${fmtG(nextLvl.cost)} pts` : 'Max level'}</span>
      </div>
      <div class="bar-track" style="height:8px;margin-bottom:10px;"><div class="bar-fill" style="width:${pointsPct}%;background:var(--prestige);"></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${tabs.map(t => `<button class="mini-btn ${allianceView===t.id?'buy':''}" style="flex:1;min-width:70px;${allianceView===t.id?'background:rgba(212,162,76,0.14);border-color:var(--brass);color:var(--brass-bright);':''}" onclick="setAllianceView('${t.id}')">${t.label}</button>`).join('')}
      </div>
    </div>
    ${body}`;
}

function renderAllianceHome(){
  const { alliance, myMember } = allianceData;
  const treasury = alliance.treasury || {};
  const treasuryEntries = Object.keys(treasury).filter(k => treasury[k] > 0);
  const canLeave = state.allianceRole !== 'leader';

  return `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">📜 About</div>
      <div style="font-size:12px;color:var(--text);margin-bottom:8px;">${alliance.description || 'No description yet.'}</div>
      <div style="font-size:11px;color:var(--dim);">${alliance.type==='open'?'🌐 Open — anyone can join':'🔒 Closed — approval required'}</div>
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
        ${state.allianceRole==='leader' ? `<button class="act-btn" style="width:auto;padding:9px 16px;border-color:var(--red);color:var(--red);" onclick="disbandAllianceConfirm()">💥 Disband Alliance</button>` : ''}
      </div>
      ${canLeave ? `<div style="font-size:10px;color:var(--dim);margin-top:6px;">Leaving forfeits 50% of your contribution record and applies a 24h cooldown before joining another alliance.</div>` : `<div style="font-size:10px;color:var(--dim);margin-top:6px;">Disbanding splits the treasury among members by contribution and applies a 7-day cooldown before founding a new alliance.</div>`}
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
  return `
    <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;${atRisk?'border-color:var(--red);':''}">
      <div style="font-size:20px;">${roleInfo.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:var(--text);font-size:13px;">${m.username}${isMe?' <span style="color:var(--dim);font-size:11px;">(you)</span>':''}</div>
        <div style="font-size:11px;color:var(--dim);">${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)} · Activity ${activity}%${atRisk?' · <span style="color:var(--red);">Inactive</span>':''}${m.exempt?' · <span style="color:var(--green);">Exempt</span>':''}</div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
        ${canPromote?`<button class="mini-btn" onclick="promoteMember('${m.uid}','${m.role}')" title="Promote">⬆️</button>`:''}
        ${canDemote?`<button class="mini-btn" onclick="demoteMember('${m.uid}','${m.role}')" title="Demote">⬇️</button>`:''}
        ${canExempt?`<button class="mini-btn" onclick="toggleMemberExempt('${m.uid}', ${!!m.exempt})" title="Toggle inactivity exemption">${m.exempt?'🔓':'🔒'}</button>`:''}
        ${canManage?`<button class="mini-btn" style="color:var(--red);border-color:var(--red);" onclick="kickMember('${m.uid}','${m.role}')" title="Kick">✕</button>`:''}
      </div>
    </div>`;
}

function renderAllianceChat(){
  return `
    <div class="panel">
      <div class="panel-header">💬 Alliance Chat</div>
      <div style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:10px;padding-right:2px;">
        ${allianceChatMsgs.length ? allianceChatMsgs.map(m => `
          <div style="background:${m.uid===UID?'rgba(212,162,76,0.12)':'var(--bg)'};border:1px solid var(--border);border-radius:8px;padding:6px 10px;">
            <div style="font-size:11px;color:var(--brass-bright);font-weight:700;">${m.username} <span style="color:var(--dim);font-weight:400;">${allianceTimeAgo(m.ts)}</span></div>
            <div style="font-size:12px;color:var(--text);">${(m.text||'').replace(/</g,'&lt;')}</div>
          </div>`).join('') : `<div style="text-align:center;color:var(--dim);font-size:12px;padding:20px;">No messages yet. Say hello!</div>`}
      </div>
      <div style="display:flex;gap:6px;">
        <input id="allianceChatInput" class="username-input" style="margin-bottom:0;flex:1;" maxlength="300" placeholder="Type a message…" onkeydown="allianceChatKeydown(event)">
        <button class="act-btn buy" style="width:auto;padding:0 16px;" onclick="sendAllianceChatMsg()">Send</button>
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
      <div style="display:flex;gap:6px;">
        <input id="allianceInviteInput" class="username-input" style="margin-bottom:0;flex:1;" placeholder="Username…">
        <button class="act-btn buy" style="width:auto;padding:0 16px;" onclick="inviteToAlliance()">Invite</button>
      </div>
    </div>`;
  }

  if(canRequests && alliance.type === 'closed'){
    html += `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header">📨 Join Requests (${allianceRequests.length})</div>
      ${allianceRequests.length ? allianceRequests.map(r => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border);">
          <div style="font-size:12px;color:var(--text);">${r.username}</div>
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
    html += `
    <div class="panel">
      <div class="panel-header">⚙️ Alliance Settings</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px;">Description</div>
      <input id="allianceEditDescInput" class="username-input" style="margin-bottom:10px;" maxlength="120" value="${(alliance.description||'').replace(/"/g,'&quot;')}">
      <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">Alliance Type</div>
      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <button class="mini-btn ${alliance.type==='open'?'buy':''}" style="flex:1;" onclick="updateAllianceType('open')">🌐 Open</button>
        <button class="mini-btn ${alliance.type==='closed'?'buy':''}" style="flex:1;" onclick="updateAllianceType('closed')">🔒 Closed</button>
      </div>
      <button class="act-btn buy" style="width:100%;padding:10px;" onclick="updateAllianceDescription()">Save Description</button>
    </div>`;
  }

  return html || `<div class="panel"><div style="padding:20px;text-align:center;color:var(--dim);">No management permissions.</div></div>`;
}

async function updateAllianceDescription(){
  if(!allianceCan(state.allianceRole,'editInfo') || !db) return;
  const input = document.getElementById('allianceEditDescInput');
  const desc = (input ? input.value : '').trim().slice(0, 120);
  try{
    await db.collection('alliances').doc(state.allianceId).update({ description: desc });
    await loadMyAlliance();
    showToast('✅ Saved','Alliance description updated.','success');
  }catch(e){ console.error(e); }
  renderBody();
}
async function updateAllianceType(type){
  if(!allianceCan(state.allianceRole,'editInfo') || !db) return;
  try{
    await db.collection('alliances').doc(state.allianceId).update({ type });
    await loadMyAlliance();
  }catch(e){ console.error(e); }
  renderBody();
}
