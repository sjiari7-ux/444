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
  leader:   { key:'leader',   name:'Leader',    icon:`<img class="ui-icon" src="${ICONS.crown}" alt="👑">`, rank:5 },
  coleader: { key:'coleader', name:'Co-Leader', icon:`<img class="ui-icon" src="${ICONS.star_white}" alt="⭐">`, rank:4 },
  officer:  { key:'officer',  name:'Officer',   icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, rank:3 },
  member:   { key:'member',   name:'Member',    icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, rank:2 },
  recruit:  { key:'recruit',  name:'Recruit',   icon:`<img class="ui-icon" src="${ICONS.beginner_badge}" alt="🔰">`, rank:1 },
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

/* ===== PRESIDENTIAL ELECTIONS — see functions/index.js:resolveOneElection ===== */
const ELECTION_TERM_MS = 7 * 24 * 60 * 60 * 1000;      // 7-day presidential term — keep in sync with functions/index.js
const ELECTION_VOTING_WINDOW_MS = 24 * 60 * 60 * 1000; // polls open in the final 24h of a term
let electionData = null;    // { candidates:[{uid,name,votes,mine}], myVote: uid|null, termNumber, termEndsAt }
let electionLoading = false;

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
    const pdoc = await withTimeout(db.collection('players').doc(UID).get(), 8000);
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
  }catch(e){ console.error('Kingdom init failed (continuing without kingdom data):', e); }
}

async function loadMyAlliance(){
  if(!db || !state.allianceId) return;
  allianceLoading = true;
  try{
    const aDoc = await withTimeout(db.collection('alliances').doc(state.allianceId).get(), 8000);
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
    loadElectionData(); // fire-and-forget — the panel shows a loading state until this resolves
  }catch(e){ console.error('Load alliance failed', e); }
  allianceLoading = false;
}

async function loadElectionData(){
  if(!db || !allianceData) return;
  electionLoading = true;
  try{
    const kingdomId = allianceData.alliance.id;
    const termNumber = allianceData.alliance.electionTermNumber || 1;
    const ref = db.collection('alliances').doc(kingdomId);
    const [candSnap, voteSnap] = await Promise.all([
      ref.collection('electionCandidates').where('termNumber', '==', termNumber).get(),
      ref.collection('electionVotes').where('termNumber', '==', termNumber).get(),
    ]);
    const votesByCandidate = {};
    let myVote = null;
    voteSnap.docs.forEach(d => {
      const c = d.data().candidateUid;
      votesByCandidate[c] = (votesByCandidate[c] || 0) + 1;
      if(d.id === UID) myVote = c;
    });
    const candidates = candSnap.docs.map(d => ({
      uid: d.id, name: d.data().name,
      votes: votesByCandidate[d.id] || 0,
      mine: d.id === UID,
    })).sort((a, b) => b.votes - a.votes);
    electionData = { termNumber, candidates, myVote, totalVotes: voteSnap.size };
  }catch(e){
    console.error('Load election failed', e);
    electionData = null;
  }
  electionLoading = false;
  if(activeTab === 'alliance') renderBody();
}

function electionTermEndsMs(){
  const ts = allianceData && allianceData.alliance && allianceData.alliance.presidentTermEndsAt;
  return ts && ts.toMillis ? ts.toMillis() : (ts && ts.seconds ? ts.seconds * 1000 : 0);
}
// True once we're within the final ELECTION_VOTING_WINDOW_MS of the current
// term — campaigning and voting both happen in this same window. Before a
// kingdom's very first term has been initialized by the server (see
// resolveOneElection), there's nothing to vote on yet.
function electionIsOpen(){
  const endsAt = electionTermEndsMs();
  return endsAt > 0 && Date.now() >= endsAt - ELECTION_VOTING_WINDOW_MS;
}

async function runForPresident(){
  if(!db || !UID || !allianceData) return;
  if(allianceRankOf(state.allianceRole) < allianceRankOf('member')){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌"> Not eligible`, 'New recruits become eligible to run once they\'re a full member.', 'error'); return;
  }
  if(!electionIsOpen()){
    showToast('⏳ Polls are closed', 'Candidacy opens in the final 24h of the current term.', 'error'); return;
  }
  try{
    const kingdomId = allianceData.alliance.id;
    const termNumber = allianceData.alliance.electionTermNumber || 1;
    await db.collection('alliances').doc(kingdomId).collection('electionCandidates').doc(UID).set({
      name: window.__playerUsername || 'Player',
      termNumber,
      registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast(`<img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> Candidacy filed`, "You're on the ballot for this election.", 'success');
    await loadElectionData(); renderBody();
  }catch(e){
    console.error('Run for president failed', e);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, "Couldn't file your candidacy.", 'error');
  }
}

async function withdrawCandidacy(){
  if(!db || !UID || !allianceData) return;
  try{
    await db.collection('alliances').doc(allianceData.alliance.id).collection('electionCandidates').doc(UID).delete();
    showToast('👋 Withdrawn', 'You are no longer running.', 'success');
    await loadElectionData(); renderBody();
  }catch(e){
    console.error('Withdraw candidacy failed', e);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, "Couldn't withdraw.", 'error');
  }
}

async function castVote(candidateUid){
  if(!db || !UID || !allianceData) return;
  if(!electionIsOpen()){
    showToast('⏳ Polls are closed', 'Voting opens in the final 24h of the current term.', 'error'); return;
  }
  try{
    const kingdomId = allianceData.alliance.id;
    const termNumber = allianceData.alliance.electionTermNumber || 1;
    await db.collection('alliances').doc(kingdomId).collection('electionVotes').doc(UID).set({
      candidateUid, termNumber,
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast(`<img class="ui-icon" src="${ICONS.chess_queen}" alt="♛"> Vote cast`, 'You can change your vote until polls close.', 'success');
    await loadElectionData(); renderBody();
  }catch(e){
    console.error('Cast vote failed', e);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, "Couldn't cast your vote.", 'error');
  }
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
  if(!db){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Cloud save (Firebase) must be configured to join a kingdom.','error'); return; }
  if(state.allianceId){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'You already belong to a kingdom.','error'); return; }
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
    showToast(`<img class="ui-icon" src="${ICONS.castle}" alt="🏰"> Kingdom Joined`, `Welcome to the ${kdef.name}!`, 'success');
  }catch(e){
    console.error(e);
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Failed to join the kingdom.','error');
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
      showToast(`<img class="ui-icon" src="${ICONS.party}" alt="🎉"> Kingdom Level Up!`, `Now level ${newLevel}`, 'success');
      await loadMyAlliance();
    }catch(e){ console.error(e); }
  }
}

async function donateToAlliance(resourceKey, amount){
  if(!db || !state.allianceId) return;
  amount = Math.floor(amount);
  if(amount <= 0) return;
  const have = resourceKey === 'gold' ? state.gold : (state.inv[resourceKey] || 0);
  if(have < amount){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Not enough resources.','error'); return; }
  const allianceRef = db.collection('alliances').doc(state.allianceId);
  const memberRef = allianceRef.collection('members').doc(UID);
  const playerRef = db.collection('players').doc(UID);
  try{
    await db.runTransaction(async (tx) => {
      const aDoc = await tx.get(allianceRef);
      if(!aDoc.exists) throw new Error('GONE');
      // For gold specifically, check the authoritative server-side balance
      // in the SAME transaction and charge it here — same reasoning as
      // buyFromListing()/buyGearListing() in marketplace.js: the local
      // `have < amount` check above is only a client-side hint and can't
      // be trusted to actually prevent donating gold you don't have.
      // Inventory resources still rely on the client's own save (like
      // every other inventory change in the game), since there's no
      // separate server-side inventory ledger to check against here.
      if(resourceKey === 'gold'){
        const pDoc = await tx.get(playerRef);
        const serverGold = (pDoc.exists && typeof pDoc.data().gold === 'number') ? pDoc.data().gold : 0;
        if(serverGold < amount) throw new Error('INSUFFICIENT_GOLD');
        tx.update(playerRef, { gold: firebase.firestore.FieldValue.increment(-amount) });
      }
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
    if(resourceKey === 'gold'){ state.gold -= amount; if(lastSyncedGold !== null) lastSyncedGold -= amount; }
    else state.inv[resourceKey] -= amount;
    state.totalAllianceDonated = (state.totalAllianceDonated || 0) + amount;
    updateMissionProgress('alliance_donated', amount);
    scheduleSave();
    await loadMyAlliance();
    await checkAllianceLevelUp();
    showToast(`<img class="ui-icon" src="${ICONS.business}" alt="💰"> Donated`, `+${fmtG(amount)} to the treasury`, 'success');
  }catch(e){
    console.error(e);
    const msg = e.message === 'INSUFFICIENT_GOLD' ? "You don't have enough gold for that." : 'Donation failed.';
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`, msg, 'error');
  }
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
        <div class="modal-header"><h3>Donate Gold</h3><button class="modal-close" onclick="closeAllianceDonateModal()"><img class="ui-icon" src="${ICONS.close}" alt="✕"></button></div>
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
  if(amt <= 0){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Enter a valid amount.','error'); return; }
  if(amt > state.gold){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Not enough gold.','error'); return; }
  closeAllianceDonateModal();
  await donateToAlliance('gold', amt);
}

function openAllianceDiscord(){
  const link = allianceData && allianceData.alliance && allianceData.alliance.discordLink;
  if(link){ window.open(link, '_blank', 'noopener'); return; }
  if(allianceCan(state.allianceRole,'editInfo')){
    showToast(`<img class="ui-icon" src="${ICONS.chat}" alt="💬"> No Discord Link`, `Add one in Manage <img class="ui-icon" src="${ICONS.arrow_right}" alt="→"> Kingdom Rallying Cry.`, 'error');
    setAllianceView('manage');
  } else {
    showToast(`<img class="ui-icon" src="${ICONS.chat}" alt="💬"> No Discord Link`, "This alliance hasn't set one up yet.", 'error');
  }
}
async function saveAllianceDiscordLink(){
  if(!allianceCan(state.allianceRole,'editInfo') || !db) return;
  const input = document.getElementById('allianceDiscordInput');
  let link = (input ? input.value : '').trim();
  if(link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
  if(link && !/^https:\/\/(discord\.gg|discord\.com\/invite)\//i.test(link)){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Enter a valid Discord invite link (discord.gg/...).','error'); return;
  }
  try{
    await db.collection('alliances').doc(state.allianceId).update({ discordLink: link });
    await loadMyAlliance();
    showToast(`<img class="ui-icon" src="${ICONS.check_circle}" alt="✅"> Saved`,'Discord link updated.','success');
  }catch(e){ console.error(e); showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Failed to save link.','error'); }
  renderBody();
}

async function promoteMember(targetUid, currentRole){
  if(!allianceCan(state.allianceRole,'promote') || !db) return;
  if(currentRole === 'officer' && state.allianceRole !== 'leader'){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Only the leader can promote to Co-Leader.','error'); return;
  }
  const newRole = nextRoleUp(currentRole);
  if(allianceRankOf(newRole) >= allianceRankOf(state.allianceRole) && state.allianceRole !== 'leader'){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Cannot promote above your own rank.','error'); return;
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
  if(currentRole === 'leader'){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Cannot demote the leader.','error'); return; }
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
  if(targetRole === 'leader'){ showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Cannot kick the leader.','error'); return; }
  if(allianceRankOf(targetRole) >= allianceRankOf(state.allianceRole)){
    showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Cannot remove a member of equal or higher rank.','error'); return;
  }
  if(!confirm('Remove this member from the alliance?')) return;
  try{
    await db.collection('alliances').doc(state.allianceId).collection('members').doc(targetUid).delete();
    await db.collection('alliances').doc(state.allianceId).update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
    await db.collection('players').doc(targetUid).update({
      allianceId: null, allianceRole: null, allianceJoinCooldownUntil: Date.now() + ALLIANCE_JOIN_COOLDOWN_MS,
    });
    await loadMyAlliance();
    showToast(`<img class="ui-icon" src="${ICONS.door}" alt="🚪"> Removed`,'Member removed from the alliance.','success');
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
    showToast(`<img class="ui-icon" src="${ICONS.warning}" alt="⚠"> Warned`, `${escapeHtml(targetName)} has been warned for inactivity.`, 'success');
  }catch(e){ console.error(e); }
  renderBody();
}

async function leaveAllianceConfirm(){
  const msg = state.allianceRole === 'leader'
    ? "Leave your kingdom? The presidency doesn't pass by hand anymore — a caretaker president is appointed automatically within about 30 minutes, and the next scheduled election decides who holds the seat after that. You must wait 24h before pledging to another kingdom."
    : 'Leave your kingdom? Your lifetime donation total is kept, but you must wait 24h before pledging to another kingdom.';
  if(!confirm(msg)) return;
  await leaveAlliance();
}
async function leaveAlliance(){
  if(!db || !state.allianceId) return;
  const kingdomId = state.allianceId;
  allianceLoading = true; renderBody();
  try{
    const allianceRef = db.collection('alliances').doc(kingdomId);

    // No client-side succession here on purpose: rewriting another member's
    // role to 'leader' is blocked by firestore.rules (only the elected-by-
    // vote resolver is trusted to crown a president — see the note in
    // runForPresident() above). If the departing player was leader, the
    // seat sits vacant until resolveDueElections notices and hands it to a
    // caretaker (functions/index.js: resolveOneElection's seatVacant path).

    // Delete the membership doc and decrement memberCount together in one
    // atomic transaction. This matters for the Firestore security rules:
    // the rule that lets a plain (non-officer) member decrement memberCount
    // checks that the caller's own membership doc exists before this write
    // and will NOT exist after it — that check only makes sense if both
    // writes happen inside the same transaction.
    await db.runTransaction(async (tx) => {
      const memberRef = allianceRef.collection('members').doc(UID);
      tx.delete(memberRef);
      tx.update(allianceRef, { memberCount: firebase.firestore.FieldValue.increment(-1) });
    });
    const cooldownUntil = Date.now() + ALLIANCE_JOIN_COOLDOWN_MS;
    await db.collection('players').doc(UID).update({ allianceId: null, allianceRole: null, allianceJoinCooldownUntil: cooldownUntil });
    state.allianceId = null; state.allianceRole = null; state.allianceJoinCooldownUntil = cooldownUntil;
    allianceData = null; stopAllianceChatListener(); scheduleSave();
    markAllianceKnown(null);
    allianceView = 'browse';
    showToast(`<img class="ui-icon" src="${ICONS.door}" alt="🚪"> Left Kingdom`,'','success');
  }catch(e){ console.error(e); showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Failed to leave.','error'); }
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
        <div class="panel-header"><img class="ui-icon" src="${ICONS.castle}" alt="🏰"> Kingdoms</div>
        <div style="padding:20px;text-align:center;color:var(--dim);font-size:13px;">
          <img class="ui-icon" src="${ICONS.offline}" alt="🔌"> Kingdoms require cloud save (Firebase) to be configured.<br>
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
        <div class="alliance-hero-emblem"><img class="ui-icon-lg" src="${ICONS.globe}" alt="🌍" onerror="this.replaceWith(document.createTextNode('🌍'))"></div>
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
    return `<div class="alliance-empty"><div class="ae-icon"><img class="ui-icon" src="${ICONS.globe}" alt="🌍"></div><div class="ae-text">Loading kingdoms…</div></div>`;
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
  const kdef = kingdomDef(alliance.continent) || {};
  const role = state.allianceRole;
  const roleInfo = ALLIANCE_ROLES[role] || ALLIANCE_ROLES.member;
  const lvlInfo = allianceLevelInfo(alliance.level || 1);
  const nextLvl = allianceNextLevelInfo(alliance.level || 1);
  const pointsPct = nextLvl ? Math.min(100, ((alliance.points||0) - lvlInfo.cost) / (nextLvl.cost - lvlInfo.cost) * 100) : 100;

  const tabs = [
    { id:'home',     label:`<img class="ui-icon" src="${ICONS.castle}" alt="🏰"> Home` },
    { id:'members',  label:`<img class="ui-icon" src="${ICONS.group}" alt="👥"> Members` },
    { id:'treasury', label:`<img class="ui-icon" src="${ICONS.business}" alt="💰"> Treasury` },
  ];
  if(allianceCan(role,'editInfo')) tabs.push({ id:'manage', label:`<img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️"> Manage` });

  let body = '';
  if(allianceView === 'members') body = renderAllianceMembers();
  else if(allianceView === 'treasury') body = renderAllianceTreasury();
  else if(allianceView === 'manage') body = renderAllianceManage();
  else body = renderAllianceHome();

  if(typeof loadKingdomLeaderboard === 'function' && !kingdomLeaderboard && !kingdomLeaderboardLoading){
    loadKingdomLeaderboard(false).then(()=>{ if(state.allianceId) renderBody(); });
  }
  const myRankRow = kingdomLeaderboard ? kingdomLeaderboard.find(k => k.id === alliance.continent) : null;
  const territoriesHeld = myRankRow ? myRankRow.territories : null;

  return `
    <div class="country-hero">
      <div class="country-hero-banner">
        <div class="country-hero-icons">
          <button class="alliance-icon-btn discord" title="${alliance.discordLink ? 'Open Discord' : 'No Discord link set'}" onclick="openAllianceDiscord()"><img class="ui-icon" src="${ICONS.chat}" alt="💬"></button>
          <button class="alliance-icon-btn donate" title="Donate Gold" onclick="openAllianceDonateModal()"><img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙"></button>
        </div>
        <div class="country-flag-block">
          <div class="country-flag" style="background:${kdef.color||'#555'};"><img class="ui-icon-lg" src="${ICONS['kingdom_'+alliance.continent]}" alt="${alliance.emblem||kdef.emblem||'⚔️'}" onerror="this.replaceWith(document.createTextNode('${alliance.emblem||kdef.emblem||'⚔️'}'))"></div>
          <div class="country-title-block">
            <div class="country-eyebrow"><img class="ui-icon" src="${ICONS.castle}" alt="🏰"> Kingdom</div>
            <div class="country-title">${alliance.name}</div>
          </div>
        </div>
      </div>
      <div class="country-pills">
        <div class="country-pill"><span class="cp-label">Citizens</span><span class="cp-value">${alliance.memberCount||0}</span></div>
        <div class="country-pill"><span class="cp-label">Level</span><span class="cp-value">${alliance.level||1}</span></div>
        <div class="country-pill"><span class="cp-label">Territories</span><span class="cp-value">${territoriesHeld===null?'…':territoriesHeld}</span></div>
        <div class="country-pill"><span class="cp-label">Your Role</span><span class="cp-value">${roleInfo.icon} ${roleInfo.name}</span></div>
      </div>
      <div class="country-tabbar">
        ${tabs.map(t => `<button class="country-tab ${!t.onclick && allianceView===t.id?'active':''}" onclick="${t.onclick || `setAllianceView('${t.id}')`}">${t.label}${t.badge?`<span class="tab-badge">${t.badge}</span>`:''}</button>`).join('')}
      </div>
    </div>
    ${body}`;
}

// Where this kingdom sits among all 6 on a given kingdomLeaderboard field
// (territories, warsWon, totalWarDamage, memberCount…). Returns null until
// the leaderboard has loaded, so callers just skip the badge meanwhile.
function kingdomRankFor(kingdomId, key){
  if(!kingdomLeaderboard) return null;
  const sorted = [...kingdomLeaderboard].sort((a,b) => (b[key]||0) - (a[key]||0));
  const idx = sorted.findIndex(k => k.id === kingdomId);
  return idx === -1 ? null : { rank: idx+1, total: sorted.length };
}
function rankBadge(r){
  if(!r) return '';
  return `<span class="arc-rank ${r.rank<=1?'top':''}">#<b>${r.rank}</b>/${r.total}</span>`;
}

function renderAllianceOverview(){
  const { alliance, members } = allianceData;
  const weeklyTotal = (members||[]).reduce((sum,m)=> sum + (m.weeklyDonated||0), 0);
  const activeThisWeek = (members||[]).filter(m => (m.weeklyDonated||0) > 0).length;
  const memberCount = (members||[]).length;
  const weeklyPerMember = activeThisWeek > 0 ? weeklyTotal / activeThisWeek : 0;
  const myRow = kingdomLeaderboard ? kingdomLeaderboard.find(k => k.id === alliance.continent) : null;

  const rankCards = [
    { cls:'gold', icon:`<img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙">`, label:'Weekly Donated', value: fmtG(weeklyTotal) },
    { cls:'gold', icon:`<img class="ui-icon" src="${ICONS.market_chart}" alt="📊">`, label:'Donated / Member', value: fmtG(weeklyPerMember) },
    { cls:'gold', icon:`<img class="ui-icon" src="${ICONS.trophy}" alt="🏆">`, label:'Total War Damage', value: fmtG(myRow?myRow.totalWarDamage:(alliance.totalWarDamage||0)), rank: kingdomRankFor(alliance.continent,'totalWarDamage') },
    { cls:'mint', icon:`<img class="ui-icon" src="${ICONS.zones_map}" alt="🗺">`, label:'Territories Held', value: myRow?myRow.territories:'…', rank: kingdomRankFor(alliance.continent,'territories') },
    { cls:'mint', icon:`<img class="ui-icon" src="${ICONS.group}" alt="👥">`, label:'Active Members', value: `${activeThisWeek}/${memberCount}` },
    { cls:'mint', icon:`<img class="ui-icon" src="${ICONS.medal}" alt="🎖">`, label:'Sieges Won-Lost', value: myRow?`${myRow.warsWon}-${myRow.warsLost}`:'0-0', rank: kingdomRankFor(alliance.continent,'warsWon') },
  ];

  const govOrder = [...members].sort((a,b) => allianceRankOf(b.role) - allianceRankOf(a.role) || (b.totalDonated||0) - (a.totalDonated||0))
    .filter(m => allianceRankOf(m.role) >= allianceRankOf('officer'))
    .slice(0, 8);

  return `
    <div class="panel" style="margin-bottom:10px;">
      <div class="section-link-header"><span class="slh-main"><img class="ui-icon" src="${ICONS.upgrade_scroll}" alt="📈"> Rankings</span><span class="slh-arrow">→</span></div>
      <div class="alliance-rank-grid">
        ${rankCards.map(c => `
          <div class="alliance-rank-card ${c.cls}">
            <div class="arc-label">${c.icon} ${c.label}</div>
            <div class="arc-bottom"><div class="arc-value">${c.value}</div>${rankBadge(c.rank)}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="panel" style="margin-bottom:10px;">
      <div class="section-link-header"><span class="slh-main"><img class="ui-icon" src="${ICONS.castle}" alt="🏰"> Government</span><span class="slh-arrow">→</span></div>
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
    </div>
    ${renderElectionPanel()}
    ${renderKingdomBulletin()}`;
}

// Active sieges touching this kingdom, laid out like a Country page's
// "Laws" feed — a compact scrollable list rather than the full war cards
// (those still live on the World Map / Active Wars screen).
function renderKingdomBulletin(){
  const myKingdom = state.allianceId;
  if(typeof territoryLoaded !== 'undefined' && !territoryLoaded && typeof loadTerritories === 'function') loadTerritories();
  let wars = [];
  try{ wars = (typeof allActiveWars === 'function' ? allActiveWars() : []).filter(t => warInvolvesKingdom(t, myKingdom)); }catch(e){ wars = []; }
  const header = `<div class="section-link-header"><span class="slh-main"><img class="ui-icon" src="${ICONS.horn}" alt="📯"> Kingdom Bulletin</span><span class="slh-arrow" style="cursor:pointer;" onclick="goToKingdomMap()">Wars →</span></div>`;
  if(!wars.length){
    return `<div class="panel" style="margin-bottom:10px;">${header}<div style="text-align:center;padding:14px;color:var(--dim);font-size:12px;">No active sieges involving your kingdom right now.</div></div>`;
  }
  const rows = wars.slice(0, 5).map(t => {
    const war = t.war;
    const iAmAttacker = war.attackerKingdom === myKingdom;
    const foe = kingdomDef(iAmAttacker ? t.ownerKingdom : war.attackerKingdom);
    const z = (typeof ARCADIA_WORLD !== 'undefined' && ARCADIA_WORLD[t.zone]) || null;
    const idx = Math.max(0, parseInt(String(t.id).split('_').pop(), 10) - 1);
    const territoryName = z && z.names ? z.names[idx] : t.id;
    const endsAtMs = warTimestampMs(war.roundEndsAt);
    return `<div class="bulletin-row" onclick="openWarModal('${t.id}')">
      <div class="bulletin-icon" style="background:${foe?foe.color:'#555'}33;">${foe?foe.emblem:'⚔️'}</div>
      <div class="bulletin-body">
        <div class="bulletin-title">${iAmAttacker?'Besieging':'Defending'} ${escapeHtml(territoryName)}</div>
        <div class="bulletin-sub">vs ${foe?escapeHtml(foe.name):'Unknown kingdom'} · Round ${war.round}/3</div>
      </div>
      <div class="bulletin-side">
        <span class="bulletin-status live">LIVE</span>
        <div class="bulletin-time">${formatWarCountdown(endsAtMs - Date.now())}</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="panel" style="margin-bottom:10px;">${header}<div>${rows}</div></div>`;
}

// The president's seat isn't handed out by promotion — it's the "leader"
// role, but who holds it is decided every ELECTION_TERM_MS by a vote among
// the kingdom's own members (WarEra-style), resolved server-side by
// resolveDueElections in functions/index.js.
function renderElectionPanel(){
  const { alliance, myMember } = allianceData;
  const termEndsAt = electionTermEndsMs();
  if(!termEndsAt){
    return `<div class="panel" style="margin-bottom:10px;">
      <div class="panel-header"><img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> Presidential Election</div>
      <div style="text-align:center;padding:12px;color:var(--dim);font-size:12px;">The first term's clock hasn't started yet — check back shortly.</div>
    </div>`;
  }
  const open = electionIsOpen();
  const list = (electionData && electionData.termNumber === (alliance.electionTermNumber || 1)) ? electionData.candidates : [];
  const iAmCandidate = list.some(c => c.mine);
  const canRun = allianceRankOf(state.allianceRole) >= allianceRankOf('member');

  const candidateRows = list.length ? list.map(c => `
    <div class="gov-card" style="${c.uid===(electionData.myVote)?'border-color:var(--brass-bright);':''}" title="${escapeHtml(c.name)} · ${c.votes} vote${c.votes===1?'':'s'}">
      <div class="gov-avatar-wrap">
        <div class="gov-avatar ${c.mine?'leader':'officer'}">${c.mine?`<img class="ui-icon" src="${ICONS.crown}" alt="👑">`:`<img class="ui-icon" src="${ICONS.group}" alt="👥">`}</div>
        <div class="gov-badge">${c.votes}</div>
      </div>
      <div class="gov-name">${escapeHtml(c.name)}${c.mine?' (You)':''}</div>
      <div class="gov-role">${electionData.myVote===c.uid?'Your vote':`${c.votes} vote${c.votes===1?'':'s'}`}</div>
      ${open ? `<button class="mini-btn" style="margin-top:6px;font-size:10px;" ${electionData.myVote===c.uid?'disabled':''} onclick="castVote('${c.uid}')">${electionData.myVote===c.uid?'Voted':'Vote'}</button>` : ''}
    </div>`).join('') : `<div style="text-align:center;padding:12px;color:var(--dim);font-size:12px;">${open?'No candidates yet — be the first to run.':'No one ran last election — the incumbent kept the seat.'}</div>`;

  return `<div class="panel" style="margin-bottom:10px;">
    <div class="panel-header"><img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> Presidential Election</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:12px;color:var(--dim);">
      <span>${open ? `<img class="ui-icon" src="${ICONS.horn}" alt="📯"> Polls open — closes in <b style="color:var(--brass-bright);">${humanCountdown(termEndsAt)}</b>` : `Next election opens in <b style="color:var(--brass-bright);">${humanCountdown(termEndsAt - ELECTION_VOTING_WINDOW_MS)}</b>`}</span>
      <span><img class="ui-icon" src="${ICONS.crown}" alt="👑"> ${escapeHtml(alliance.leaderName||'Vacant')}</span>
    </div>
    <div class="gov-row">${candidateRows}</div>
    ${open ? (canRun ? `<div style="margin-top:10px;text-align:center;">${iAmCandidate
        ? `<button class="act-btn" style="width:auto;padding:8px 16px;border-color:var(--red);color:var(--red);" onclick="withdrawCandidacy()">Withdraw Candidacy</button>`
        : `<button class="act-btn copper" style="width:auto;padding:8px 16px;" onclick="runForPresident()"><img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> Run for President</button>`}</div>`
      : `<div style="text-align:center;padding:8px 0 0;color:var(--dim);font-size:10px;">New recruits become eligible to run once they're full members.</div>`) : ''}
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
      <div class="panel-header"><img class="ui-icon" src="${ICONS.scroll_plain}" alt="📜"> About</div>
      <div style="font-size:12px;color:var(--text);margin-bottom:8px;">${alliance.description || kdef.description || ''}</div>
      <div style="font-size:11px;color:var(--dim);"><img class="ui-icon" src="${ICONS.globe}" alt="🌐"> Open to every player pledged to this kingdom — everyone belongs the moment they join.</div>
    </div>
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-header"><img class="ui-icon" src="${ICONS.upgrade_scroll}" alt="📈"> This Week</div>
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
      <div class="panel-header"><img class="ui-icon" src="${ICONS.door}" alt="🚪"> Kingdom Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="act-btn" style="width:auto;padding:9px 16px;border-color:var(--red);color:var(--red);" onclick="leaveAllianceConfirm()"><img class="ui-icon" src="${ICONS.door}" alt="🚪"> Leave Kingdom</button>
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
      <div class="panel-header"><img class="ui-icon" src="${ICONS.business}" alt="💰"> Treasury</div>
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
      <div class="panel-header"><img class="ui-icon" src="${ICONS.group}" alt="👥"> Members (${members.length})</div>
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
        <div style="font-size:11px;color:var(--dim);">${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)} · Activity ${activity}%${atRisk?' · <span style="color:var(--red);">Inactive</span>':''}${m.exempt?' · <span style="color:var(--green);">Exempt</span>':''}${(m.warnings||0)>0?` · <span style="color:var(--brass-bright);"><img class="ui-icon" src="${ICONS.warning}" alt="⚠"> ${m.warnings}</span>`:''}</div>
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
          <button class="modal-close" onclick="closeMemberActionsModal()"><img class="ui-icon" src="${ICONS.close}" alt="✕"></button>
        </div>
        <div style="padding:16px 18px;">
          <div style="font-size:11px;color:var(--dim);margin-bottom:14px;">${roleInfo.name} · Donated ${fmtG(m.totalDonated||0)}${(m.warnings||0)>0?` · <span style="color:var(--brass-bright);"><img class="ui-icon" src="${ICONS.warning}" alt="⚠"> ${m.warnings} warning${m.warnings===1?'':'s'}</span>`:''}</div>
          ${canPromote?`<button class="member-action-btn" onclick="closeMemberActionsModal();promoteMember('${m.uid}','${m.role}')"><span class="icon"><img class="ui-icon" src="${ICONS.upgrade}" alt="⬆"></span> Promote to ${promoteTo.name}</button>`:''}
          ${canDemote?`<button class="member-action-btn" onclick="closeMemberActionsModal();demoteMember('${m.uid}','${m.role}')"><span class="icon"><img class="ui-icon" src="${ICONS.arrow_down}" alt="⬇"></span> Demote to ${demoteTo.name}</button>`:''}
          ${canExempt?`<button class="member-action-btn" onclick="closeMemberActionsModal();warnMember('${m.uid}')"><span class="icon"><img class="ui-icon" src="${ICONS.warning}" alt="⚠"></span> Warn for Inactivity</button>`:''}
          ${canExempt?`<button class="member-action-btn" onclick="closeMemberActionsModal();toggleMemberExempt('${m.uid}', ${!!m.exempt})"><span class="icon">${m.exempt?'<img class="ui-icon" src="${ICONS.unlock}" alt="🔓">':'<img class="ui-icon" src="${ICONS.lock}" alt="🔒">'}</span> ${m.exempt?'Remove Inactivity Exemption':'Exempt from Inactivity'}</button>`:''}
          ${canManage?`<button class="member-action-btn danger" onclick="closeMemberActionsModal();kickMember('${m.uid}','${m.role}')"><span class="icon"><img class="ui-icon" src="${ICONS.close}" alt="✕"></span> Remove from Kingdom</button>`:''}
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
      <div class="panel-header"><img class="ui-icon" src="${ICONS.warning}" alt="⚠"> Inactivity Review</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Members inactive 7+ days with activity below 10% are flagged. Exempt them below or remove them from the Members tab.</div>
      ${atRiskMembers.length ? atRiskMembers.map(m => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border);">
          <div style="font-size:12px;color:var(--red);">${escapeHtml(m.username)} — ${memberActivityPct(m)}% activity${(m.warnings||0)>0?` <span style="color:var(--brass-bright);">(<img class="ui-icon" src="${ICONS.warning}" alt="⚠">${m.warnings})</span>`:''}</div>
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
      <div class="panel-header"><img class="ui-icon" src="${ICONS.chat}" alt="💬"> Discord Server</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Set your kingdom's Discord invite link. Members tap the <img class="ui-icon" src="${ICONS.chat}" alt="💬"> icon on the kingdom header to join.</div>
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
    showToast(`<img class="ui-icon" src="${ICONS.check_circle}" alt="✅"> Saved`,'Kingdom message updated.','success');
  }catch(e){ console.error(e); showToast(`<img class="ui-icon" src="${ICONS.cancel}" alt="❌">`,'Failed to save changes.','error'); }
  allianceLoading = false; renderBody();
}
