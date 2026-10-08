"use strict";

/* ============================================================
   STORAGE LAYER (Firebase Firestore + Auth -> falls back to localStorage)
   ============================================================ */
const LS_KEY_PREFIX = 'arcadia_v1_';

// Shares the same Firebase project as the Arcadia MMO game ("444-main") on
// purpose — one project, two games. To avoid stepping on Arcadia's data,
// every RealmClash collection is namespaced with an 'rc_' prefix (rc_players,
// rc_kingdoms, rc_marketListings, meta/rc_generalChat) instead of the bare
// names Arcadia uses (players, kingdoms/alliances, marketListings, etc). Keep
// that prefix on any NEW collection you add here too, or the two games will
// silently overwrite each other's documents.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDaZVxynpwb2lkHuCCJuQ4ICZfVAvjHmuU',
  authDomain: 'arcadaimmo.firebaseapp.com',
  projectId: 'arcadaimmo',
  storageBucket: 'arcadaimmo.firebasestorage.app',
  messagingSenderId: '302453347843',
  appId: '1:302453347843:web:0c96be2b644f89b4aee036',
  measurementId: 'G-SB1HFYTBHY',
};

let DB = null, USER = null, MY_ID = null, HAS_DB = false;
// Analytics is optional — guarded separately below since the -compat script
// can fail to load (ad-blockers, offline) without taking the rest of
// Firebase (Auth/Firestore/Functions) down with it.
let ANALYTICS = null;
// Callable Cloud Functions — the server-authoritative endpoints for actions that
// spend Energy and grant rewards. Only PvE/Elite/Boss are migrated so far (see
// startAdventure/resolveCombatRound in functions/index.js); Crafting, Market, PvP,
// Kingdom and Equipment upgrades still resolve locally until they're migrated too.
let FUNCTIONS = null;
// Spark mode: no Cloud Functions. The same logic runs in the browser (js/server-local.js).
// Set to false (and remove the server-local.js <script> in index.html) once Blaze is on.
const USE_LOCAL_FN = true;
let FB_AUTH = null, FB_USER_EMAIL = null;

function withTimeout(promise, ms){
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')), ms)),
  ]);
}

// Firestore's native API already speaks the doc/collection shape the game
// logic expects (doc().get/set/update/delete, collection().where().orderBy()
// .limit().get/add), so DB below is just the Firestore instance itself —
// no translation layer needed like the old Supabase version required.
// The one thing Firestore has no built-in for is the short-lived market
// lock, so that's a small helper (acquireDocLock) instead of a ref method.
async function acquireDocLock(ref, holder, ttlMs){
  const now = Date.now();
  try{
    const acquired = await DB.runTransaction(async (tx)=>{
      const snap = await tx.get(ref);
      if(!snap.exists) return false;
      const d = snap.data() || {};
      const lockUntil = d.__lockUntil || 0;
      const lockHolder = d.__lockHolder || null;
      if(lockUntil > now && lockHolder !== holder) return false;
      tx.update(ref, { __lockHolder: holder, __lockUntil: now + ttlMs });
      return true;
    });
    return { acquired: !!acquired };
  }catch(e){ return { acquired: false }; }
}

// Resolves once Firebase Auth has settled its initial state (signed-in
// already, or definitely signed-out), mirroring Supabase's getSession().
function waitForAuthUser(auth){
  return new Promise(resolve=>{
    const unsub = auth.onAuthStateChanged(u=>{ unsub(); resolve(u); });
  });
}

// Case-insensitive check that no OTHER player already has this username.
// Best-effort: a network hiccup here never blocks character creation.
// Matched against a lowercased `usernameLower` field written alongside the
// character in saveCharacter(), since Firestore has no ILIKE.
async function isUsernameTaken(username){
  if(!HAS_DB) return false;
  try{
    const q = await withTimeout(
      DB.collection('rc_players').where('usernameLower','==', (username||'').toLowerCase()).limit(5).get(),
      6000
    );
    return q.docs.some(d=> d.id !== MY_ID);
  }catch(e){ return false; }
}

async function initCapabilities(){
  try{
    const configured = FIREBASE_CONFIG.apiKey.indexOf('YOUR_FIREBASE')===-1;
    if(configured && window.firebase){
      if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      FB_AUTH = firebase.auth();
      DB = firebase.firestore();
      try{ if(firebase.functions) FUNCTIONS = firebase.functions(); }catch(e){ console.warn('Functions SDK unavailable:', e); }
      try{ if(firebase.analytics) ANALYTICS = firebase.analytics(); }catch(e){ console.warn('Analytics init failed:', e); }
      // If we're bouncing back from a Google redirect sign-in, pick that up
      // first. Most errors here (e.g. the user closed the popup) are safe to
      // ignore, but 'credential-already-in-use' means this Google identity
      // is already linked to a DIFFERENT Firebase user (e.g. from an earlier
      // test run) — the current anonymous session can't claim it, so we sign
      // in as that existing account directly using the credential attached
      // to the error, instead of silently staying anonymous forever.
      try{ await withTimeout(FB_AUTH.getRedirectResult(), 3000); }
      catch(e){
        if(e && e.code === 'auth/credential-already-in-use' && e.credential){
          try{ await withTimeout(FB_AUTH.signInWithCredential(e.credential), 8000); }catch(e2){}
        } else if(e){
          console.warn('Google redirect sign-in failed:', e.code || e.message || e);
        }
      }
      // Every visitor gets a real Firebase Auth session, starting anonymous.
      // Linking Google later keeps the SAME uid, so existing progress
      // carries over automatically instead of needing a data migration.
      let user = await withTimeout(waitForAuthUser(FB_AUTH), 6000).catch(()=>null);
      if(!user){
        const cred = await withTimeout(FB_AUTH.signInAnonymously(), 8000);
        user = cred.user;
      }
      MY_ID = user.uid;
      FB_USER_EMAIL = user.email || null;
      FB_AUTH.onAuthStateChanged(u=>{
        FB_USER_EMAIL = u ? (u.email || null) : null;
        if(u) MY_ID = u.uid;
        if(S.screen==='profile' && S.profileTab==='settings') render();
      });
    }
  }catch(e){ console.warn('Firebase init failed — falling back to local-only storage:', e); DB = null; FB_AUTH = null; }
  if(!MY_ID){
    try{
      MY_ID = localStorage.getItem(LS_KEY_PREFIX+'guest_id');
      if(!MY_ID){ MY_ID = 'guest_'+uid(); localStorage.setItem(LS_KEY_PREFIX+'guest_id', MY_ID); }
    }catch(e){ MY_ID = 'guest_'+uid(); }
  }
  HAS_DB = !!DB;
}

// Starts Google sign-in via a popup window. If the visitor is still on their
// anonymous session this LINKS Google to that same account (uid unchanged,
// progress kept); if they're already signed in it just re-auths.
// Uses a popup (not a full-page redirect) because Chrome's bounce-tracking
// mitigation can wipe the sessionStorage a redirect flow depends on when it
// bounces through the authDomain (firebaseapp.com) — a popup avoids that
// multi-hop navigation chain entirely, and resolves in-place with no reload.
async function linkGoogleAccount(){
  if(!FB_AUTH){ showToast('Google sign-in needs shared storage, unavailable in this view.'); return; }
  showToast('Opening Google sign-in…');
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    const user = FB_AUTH.currentUser;
    let result;
    try{
      result = (user && user.isAnonymous)
        ? await user.linkWithPopup(provider)
        : await FB_AUTH.signInWithPopup(provider);
    }catch(e){
      // This Google identity is already linked to a DIFFERENT Firebase user
      // (e.g. from an earlier test run) — sign in as that existing account
      // directly using the credential attached to the error, instead of
      // failing the whole flow.
      if(e && e.code === 'auth/credential-already-in-use' && e.credential){
        result = await FB_AUTH.signInWithCredential(e.credential);
      } else throw e;
    }
    MY_ID = result.user.uid;
    FB_USER_EMAIL = result.user.email || null;
    // No page reload happens with a popup, so pick the next screen ourselves
    // instead of relying on boot() to re-run. Show the loading screen meanwhile (otherwise the login page looks frozen).
    setScreen('loading');
    const existing = await loadCharacterSure();
    if(existing){ S.char = migrateCharacter(existing); applyRegen(S.char); }
    setScreen(S.char ? 'home' : 'create');
    if(existing) saveCharacter(S.char); // fire-and-forget: persists the migration/regen in the background
  }catch(e){ if(S.screen==='loading') setScreen(S.char ? 'home' : 'login'); showToast('Google sign-in error: ' + (e && e.message ? e.message : String(e))); }
}

// Calls a server-authoritative Cloud Function and normalizes its errors into
// {code, message, details} so callers can show a specific reason (e.g.
// NOT_ENOUGH_ENERGY with required/available) instead of a generic failure —
// per spec: never fall back to a silent/generic "Something went wrong".
async function callFn(name, payload){
  if(USE_LOCAL_FN && window.LocalFn){
    try{
      if(!MY_ID) throw {code:'unauthenticated', message:'UNAUTHORIZED', details:{}};
      return await withTimeout(window.LocalFn(name, payload||{}, MY_ID), 20000);
    }catch(e){
      throw { code: e.code || 'unknown', message: e.message || 'UNKNOWN_ERROR', details: e.details || {} };
    }
  }
  if(!FUNCTIONS){ throw {code:'unavailable', message:'UNAVAILABLE', details:{}}; }
  try{
    const res = await withTimeout(FUNCTIONS.httpsCallable(name)(payload||{}), 15000);
    return res.data;
  }catch(e){
    throw { code: e.code || 'unknown', message: e.message || 'UNKNOWN_ERROR', details: e.details || {} };
  }
}

/* Same as loadCharacter(), but if the cloud read FAILS/TIMES OUT (cold Firestore connection right after sign-in) it tries again
   with a longer wait before giving up -- so a slow connection no longer sends a returning player to "create character". */
async function loadCharacterSure(){
  if(HAS_DB){
    for(const ms of [6000, 9000]){
      try{
        const snap = await withTimeout(DB.doc('rc_players/'+MY_ID).get(), ms);
        if(snap.exists) return snap.data();
        break; // the read worked and there is really no character in the cloud
      }catch(e){ /* timed out / network hiccup: try once more */ }
    }
  }
  try{
    const raw = localStorage.getItem(LS_KEY_PREFIX+'char_'+MY_ID);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
async function loadCharacter(){
  if(HAS_DB){
    try{
      const snap = await withTimeout(DB.doc('rc_players/'+MY_ID).get(), 5000);
      if(snap.exists) return snap.data();
    }catch(e){ /* fall through to local */ }
  }
  try{
    const raw = localStorage.getItem(LS_KEY_PREFIX+'char_'+MY_ID);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
let _lastSaveJson = null;
// Tracks whether the LAST attempted cloud write for _lastSaveJson actually
// succeeded. Without this, a save that fails (dropped connection, cold
// Firestore/Auth handshake right after character creation, etc.) would still
// set _lastSaveJson, and every later call with that same unchanged JSON would
// hit the dedupe check below and skip retrying forever — silently stranding
// the character in localStorage only. A player who then opens the game on
// another device/browser (or after clearing storage) finds no doc in
// Firestore and gets sent back to character creation. Gating the dedupe on
// _lastCloudSaveOk too means an unchanged character keeps retrying the cloud
// write on every saveCharacter() call until one actually lands.
let _lastCloudSaveOk = false;
async function saveCharacter(c){
  c.updatedAt = Date.now();
  const json = JSON.stringify(c);
  if(json === _lastSaveJson && (!HAS_DB || _lastCloudSaveOk)) return _lastCloudSaveOk;
  _lastSaveJson = json;
  try{ localStorage.setItem(LS_KEY_PREFIX+'char_'+MY_ID, json); }catch(e){}
  if(HAS_DB){
    try{
      // usernameLower rides along in the Firestore doc only, so
      // isUsernameTaken() can query it — it's not part of the saved shape.
      const withLower = Object.assign({}, JSON.parse(json), { usernameLower: (c.username||'').toLowerCase() });
      await withTimeout(DB.doc('rc_players/'+MY_ID).set(withLower), 5000);
      _lastCloudSaveOk = true;
    }catch(e){ console.warn('Cloud save failed (kept locally):', e); _lastCloudSaveOk = false; }
  } else {
    _lastCloudSaveOk = true; // no cloud to confirm against — local write above is the whole story
  }
  return _lastCloudSaveOk;
}
/* ---------------- Kingdom system ---------------- */
async function loadKingdomView(){
  if(!HAS_DB){ S.kingdomView = {unavailable:true}; render(); return; }
  S.kingdomView = {loading:true};
  render();
  const c = S.char;
  try{
    // Another member may have promoted/demoted/kicked us since our last load —
    // resync our own membership fields from our own doc (the source of truth)
    // before rendering, rather than trusting our possibly-stale in-memory copy.
    try{
      const selfSnap = await withTimeout(DB.doc('rc_players/'+MY_ID).get(), 6000);
      if(selfSnap.exists){
        const sd = selfSnap.data();
        if(sd.kingdomId !== undefined) c.kingdomId = sd.kingdomId;
        if(sd.nationality !== undefined) c.nationality = sd.nationality;
        if(sd.kingdomRole !== undefined) c.kingdomRole = sd.kingdomRole;
        if(sd.kingdomCooldownUntil !== undefined) c.kingdomCooldownUntil = sd.kingdomCooldownUntil;
      }
    }catch(e){ /* keep local copy if this fails */ }
    if(c.kingdomId){
      const [kdocSnap, memSnap] = await Promise.all([
        withTimeout(DB.doc('rc_kingdoms/'+c.kingdomId).get(), 6000),
        withTimeout(DB.collection('rc_players').where('kingdomId','==',c.kingdomId).limit(80).get(), 6000),
      ]);
      const kdoc = kdocSnap.exists ? kdocSnap.data() : { treasury:{}, leaderId:null, chat:[] };
      // Leadership can change on the server (hand-over, absent Leader replaced) while this device still holds an old copy
      // of our player doc — make our own role agree with the country's Leader pointer before rendering.
      if(kdoc.leaderId === MY_ID && c.kingdomRole !== 'Leader'){ c.kingdomRole = 'Leader'; saveCharacter(c); }
      else if(kdoc.leaderId && kdoc.leaderId !== MY_ID && c.kingdomRole === 'Leader'){ c.kingdomRole = 'Co-Leader'; saveCharacter(c); }
      const members = memSnap.docs.map(d=>Object.assign({id:d.id}, d.data()))
        .filter(m=>m.username)
        .sort((a,b)=> kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole) || (b.level||1)-(a.level||1));
      S.kingdomView = { mode:'mine', kingdom: Object.assign({id:c.kingdomId}, kdoc), members };
    } else {
      const [kSnap, pSnap] = await Promise.all([
        withTimeout(DB.collection('rc_kingdoms').get(), 8000).catch(()=>null),
        withTimeout(DB.collection('rc_players').limit(500).get(), 8000).catch(()=>null),
      ]);
      const treasuries = {}, counts = {};
      if(kSnap) kSnap.docs.forEach(d=>{ treasuries[d.id] = d.data().treasury || {}; });
      if(pSnap) pSnap.docs.forEach(d=>{ const id = d.data().kingdomId; if(id) counts[id] = (counts[id]||0)+1; });
      S.kingdomView = { mode:'browse', kingdoms: KINGDOMS.map(k=>Object.assign({}, k, {
        treasury: treasuries[k.id] || {},
        memberCount: counts[k.id] || 0,
      })) };
    }
  }catch(e){
    S.kingdomView = { error:true };
  }
  render();
}

// Creates the kingdom doc if needed and returns the role this player gets (first member = Leader).
// Country economy + war state. Everything shown comes from the getCountryState Cloud
// Function (including the server's clock), so the client never does any war maths.

async function loadWorldWars(silent=false){
  if(!HAS_DB && !(USE_LOCAL_FN && window.LocalFn)){ S.worldWars = {active:[], recent:[], unavailable:true}; render(); return; }
  try{
    const data=await callFn('getWorldWars');
    S.serverOffset=(data.serverNow||Date.now())-Date.now();
    S.worldWars={active:data.active||[], recent:data.recent||[], at:Date.now()};
    S.worldWarsAt=Date.now();
    claimWarRewards();
  }catch(e){
    if(!S.worldWars) S.worldWars={active:[],recent:[],error:true};
  }
  render();
}
/* Territories of any country for the world-map sheet (read-only, cached 5 min per country). */
const _mrBusy = {};
async function loadMapRegions(id){
  S.mapRegions = S.mapRegions || {};
  if(_mrBusy[id]) return;
  if(!HAS_DB || (!FUNCTIONS && !(USE_LOCAL_FN && window.LocalFn))){ S.mapRegions[id] = {at:Date.now(), data:null}; return; }
  _mrBusy[id] = 1; if(!S.mapRegions[id]) S.mapRegions[id] = 'loading';
  try{ S.mapRegions[id] = {at:Date.now(), data: await withTimeout(callFn('getRegionResources', {countryId:id}), 6000)}; }
  catch(e){ S.mapRegions[id] = {at:Date.now(), data:null}; }
  _mrBusy[id] = 0;
  if(S.screen==='map' && typeof WorldMap!=='undefined') WorldMap.update();
  else if(S.screen==='kingdom' && S._warCountry===id) render();     // Wars tab: the region picker was waiting for this list
}
async function loadCountryState(silent){
  if(!HAS_DB || (!FUNCTIONS && !(USE_LOCAL_FN && window.LocalFn))){ S.countryState = {status:'unavailable', data:null}; render(); return; }
  const prev = S.countryState && S.countryState.data;
  if(!silent || !prev){ S.countryState = {status:'loading', data:prev||null}; render(); }
  try{
    const data = await callFn('getCountryState');
    S.serverOffset = data.serverNow - Date.now();
    S.regionRes = await withTimeout(callFn('getRegionResources', {countryId:data.countryId}), 6000).catch(()=>null);   // monthly regional resources (optional panel)
    S.countryState = {status:'ready', data, at:Date.now()};
  }catch(e){
    S.countryState = {status:'error', data:prev||null, message:e.message};
  }
  render();
}

function weekKeyNow(){ return Math.floor((Date.now() + (S.serverOffset||0) - 345600000) / 604800000); }
function weekResetsAt(){ return (weekKeyNow()+1) * 604800000 + 345600000; }
async function loadRankingsView(){
  if(!HAS_DB){ S.rankingsView = {unavailable:true}; render(); return; }
  S.rankingsView = {loading:true};
  render();
  try{
    const snap = await withTimeout(DB.collection('rc_players').limit(500).get(), 8000);
    const byCountry = {}, players = [];
    snap.docs.forEach(d=>{
      const p = d.data();
      if(!p.username) return;
      p.id = d.id; players.push(p);
      if(!KINGDOMS.some(k=>k.id===p.kingdomId)) return;
      const r = byCountry[p.kingdomId] || (byCountry[p.kingdomId] = {id:p.kingdomId, players:0, totalLevel:0, ratingSum:0});
      r.players++; r.totalLevel += (p.level||1); r.ratingSum += (p.pvp && p.pvp.rating) || 1000;
    });
    const ratingOf = p=> (p.pvp && p.pvp.rating) || 1000;
    const wk = weekKeyNow(), wdmg = p=> (p.weeklyDmg && p.weeklyDmg.week===wk) ? (p.weeklyDmg.dmg||0) : 0;
    const cw = {};
    players.forEach(p=>{ const d=wdmg(p); if(d>0 && KINGDOMS.some(k=>k.id===p.kingdomId)){ const r=cw[p.kingdomId]||(cw[p.kingdomId]={id:p.kingdomId,dmg:0,fighters:0}); r.dmg+=d; r.fighters++; } });
    const list = players.map(p=>({id:p.id, username:p.username, level:p.level||1, kingdomId:p.kingdomId, rating:Math.round(ratingOf(p)), dmg:wdmg(p), cls:p.class}));
    const countries = Object.values(byCountry).map(r=>({id:r.id, players:r.players, totalLevel:r.totalLevel, avgRating:Math.round(r.ratingSum/r.players), dmg:(cw[r.id]&&cw[r.id].dmg)||0, fighters:(cw[r.id]&&cw[r.id].fighters)||0}));
    S.rankingsView = { at: Date.now(), list, countries };
  }catch(e){
    S.rankingsView = { error:true };
  }
  render();
}

async function claimKingdomSeat(kingdomId){
  if(!HAS_DB) return 'Recruit';
  const kRef = DB.doc('rc_kingdoms/'+kingdomId);
  const snap = await withTimeout(kRef.get(), 6000);
  const isFirstMember = !snap.exists || !snap.data().leaderId;
  const role = isFirstMember ? 'Leader' : 'Recruit';
  if(!snap.exists){
    await withTimeout(kRef.set({ id:kingdomId, treasury:{}, leaderId: isFirstMember?MY_ID:null, chat:[], createdAt:Date.now() }), 6000);
  } else if(isFirstMember){
    // The security rules require you to already be a member to take an empty Leader seat.
    await withTimeout(DB.doc('rc_players/'+MY_ID).update({ kingdomId }), 6000);
    await withTimeout(kRef.update({ leaderId: MY_ID }), 6000);
  }
  return role;
}

async function joinKingdom(kingdomId){
  const c = S.char;
  if(!HAS_DB){ showToast('Kingdoms need shared storage, which is unavailable in this view.'); return; }
  const cd = (c.kingdomCooldownUntil||0) - Date.now();
  if(cd > 0){ showToast(`You must wait ${fmtMs(cd)} before joining a new kingdom.`); return; }
  if(c.kingdomId){ showToast('Leave your current kingdom first.'); return; }
  showToast('Joining kingdom…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const role = await claimKingdomSeat(kingdomId);
    c.kingdomId = kingdomId; c.nationality = kingdomId; c.kingdomRole = role; c.kingdomJoinedAt = Date.now();   // nationality = the country whose National Treasury receives this player's PvE tax; leaving a kingdom never clears it
    saveCharacter(c); // fire-and-forget: our own character write doesn't need to block the success message
    showToast(`You joined ${KINGDOMS.find(k=>k.id===kingdomId).name} as ${role}.`);
    loadKingdomView(); // don't block on the follow-up refresh — it renders its own loading/final state as it goes
  }catch(e){ showToast('Could not join right now — try again.'); }
}

async function leaveKingdom(){
  const c = S.char;
  if(!c.kingdomId) return;
  if(!confirm('Leave your kingdom? You will need to wait 24 hours before joining another.')) return;
  const kingdomId = c.kingdomId;
  showToast('Leaving kingdom…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    if(HAS_DB && c.kingdomRole==='Leader'){
      const kRef = DB.doc('rc_kingdoms/'+kingdomId);
      try{ await withTimeout(kRef.update({leaderId:null}), 6000); }catch(e){}
    }
  }catch(e){}
  c.kingdomId = null; c.kingdomRole = null; c.kingdomJoinedAt = 0;
  c.kingdomCooldownUntil = Date.now() + KINGDOM_JOIN_COOLDOWN_MS;
  saveCharacter(c); // fire-and-forget
  S.kingdomView = null;
  showToast('You have left the kingdom.');
  loadKingdomView(); // don't block — it renders its own loading/final state
}

async function claimLeadership(){
  const c = S.char;
  if(!HAS_DB || !c.kingdomId) return;
  const _mem = (S.kingdomView && S.kingdomView.members) || [];
  const _hasOfficer = _mem.some(m=>kingdomRank(m.kingdomRole) >= 2);
  if(kingdomRank(c.kingdomRole) < 2 && _hasOfficer){ showToast('Only Officers and above may claim leadership.'); return; }
  showToast('Claiming leadership…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const kRef = DB.doc('rc_kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    if(snap.exists && snap.data().leaderId){ showToast('This kingdom already has a Leader.'); loadKingdomView(); return; }
    await withTimeout(kRef.update({leaderId: MY_ID}), 6000);
    c.kingdomRole = 'Leader';
    saveCharacter(c); // fire-and-forget
    showToast('You are now the Leader.');
    loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){ showToast('Could not claim leadership right now.'); }
}

async function donateToKingdom(resource, amount){
  const c = S.char;
  if(!HAS_DB || !c.kingdomId) return;
  amount = Math.floor(amount);
  if(!amount || amount<=0) return;
  const have = resource==='gold' ? c.gold : (c.resourceBag[resource]||0);
  if(have < amount){ showToast('Not enough to donate.'); return; }
  showToast('Donating…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const kRef = DB.doc('rc_kingdoms/'+c.kingdomId);
    // increment() adds on the server, so two members donating at the same moment can't overwrite each other's gift.
    // Dot-notation targets just this one resource inside the treasury map — a plain
    // {treasury: {...}} update would silently WIPE every other resource already
    // donated by other members, since Firestore replaces the whole map field.
    await withTimeout(kRef.update({['treasury.'+resource]: firebase.firestore.FieldValue.increment(amount)}), 6000);
    if(resource==='gold') c.gold -= amount; else c.resourceBag[resource] = r3(c.resourceBag[resource] - amount);
    saveCharacter(c); // fire-and-forget
    showToast(`Donated ${amount} ${resource==='gold'?'Gold':RESOURCE_NAMES[resource]||resource}.`);
    loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('donateToKingdom', e);
    const why = e && e.code==='permission-denied' ? 'the server rules refused it (permission denied)' : e && e.code==='not-found' ? 'this country has no treasury yet' : e && e.message==='timeout' ? 'the server took too long' : (e && (e.code||e.message)) || 'unknown error';
    showToast('Donation failed — '+why+'.');
  }
}

async function sendKingdomChat(text, quiet){
  const c = S.char;
  text = (text||'').trim().slice(0,200);
  if(!text || !HAS_DB || !c.kingdomId) return;
  try{
    const kRef = DB.doc('rc_kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    const chat = (snap.exists && Array.isArray(snap.data().chat)) ? snap.data().chat.slice() : [];
    chat.push({senderId:MY_ID, senderName:c.username, senderLevel:c.level||1, senderXp:xpPct(c), text, ts:Date.now()});
    while(chat.length > KINGDOM_CHAT_MAX) chat.shift();
    await withTimeout(kRef.update({chat}), 6000);
    if(quiet && S.kingdomView && S.kingdomView.mode==='mine'){
      S.kingdomView.kingdom = Object.assign({}, S.kingdomView.kingdom, {chat});
      S.kChatLastTs = Math.max(S.kChatLastTs||0, Date.now());
      render();
    } else loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){ showToast('Message failed to send.'); }
}

/* ---------------- General Chat ---------------- */
// Server-wide chat, visible to every player regardless of kingdom. Stored as a
// single capped array (same shape/approach as Kingdom Chat above) in one shared
// doc, rather than a per-message collection like marketListings — there's no
// need to query/filter/paginate this, so one doc is simpler and cheaper.
async function loadGeneralChat(){
  if(!HAS_DB){ S.generalChat = []; S.generalChatUnavailable = true; render(); return; }
  S.generalChat = null;
  render();
  try{
    const snap = await withTimeout(DB.doc('meta/rc_generalChat').get(), 6000);
    S.generalChat = (snap.exists && Array.isArray(snap.data().messages)) ? snap.data().messages : [];
  }catch(e){
    S.generalChat = [];
    console.error('loadGeneralChat failed:', e && e.code, e && e.message, e);
    showToast('Could not load chat — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
  render();
}

async function sendGeneralChat(text){
  const c = S.char;
  text = (text||'').trim().slice(0,200);
  if(!text || !HAS_DB) return;
  try{
    const ref = DB.doc('meta/rc_generalChat');
    const snap = await withTimeout(ref.get(), 6000);
    const chat = (snap.exists && Array.isArray(snap.data().messages)) ? snap.data().messages.slice() : [];
    chat.push({senderId:MY_ID, senderName:c.username, senderKingdom:c.kingdomId||null, senderLevel:c.level||1, senderXp:xpPct(c), text, ts:Date.now()});
    while(chat.length > GENERAL_CHAT_MAX) chat.shift();
    if(snap.exists) await withTimeout(ref.update({messages:chat}), 6000);
    else await withTimeout(ref.set({messages:chat}), 6000);
    loadGeneralChat(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('sendGeneralChat failed:', e && e.code, e && e.message, e);
    showToast('Message failed to send.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function kingdomManageMember(targetId, action){
  const c = S.char, kv = S.kingdomView;
  if(!HAS_DB || !kv || kv.mode!=='mine') return;
  const target = kv.members.find(m=>m.id===targetId);
  if(!target) return;
  const myRank = kingdomRank(c.kingdomRole), targetRank = kingdomRank(target.kingdomRole);
  if(myRank < 2 || myRank <= targetRank){ showToast('You do not have permission to do that.'); return; }
  try{
    if(action==='kick'){
      await withTimeout(DB.doc('rc_players/'+targetId).update({kingdomId:null, kingdomRole:null, kingdomCooldownUntil: Date.now()+KINGDOM_JOIN_COOLDOWN_MS}), 6000);
      showToast(`${target.username} was removed from the kingdom.`);
    } else if((action==='promote'||action==='demote') && myRank >= 3){
      const newRank = clamp(targetRank + (action==='promote'?1:-1), 0, myRank-1);
      await withTimeout(DB.doc('rc_players/'+targetId).update({kingdomRole: KINGDOM_ROLES[newRank]}), 6000);
      showToast(`${target.username} is now ${KINGDOM_ROLES[newRank]}.`);
    } else {
      showToast('You do not have permission to do that.'); return;
    }
    loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){ showToast('Action failed — try again.'); }
}

// Picks up any "your listing sold" notices left by buyListing() (below) while
// we were away — self-writes/reads/deletes only, so this needs no extra
// Firestore rule beyond "owner can touch their own subcollection". Call this
// on boot and it'll surface a toast per sale, oldest first, then clear them.
// Picks up the results of fights other players had AGAINST us (left by endCombat in their own game) and applies
// them to our own character, which only our own device is allowed to rewrite. Each notice moves the rating by at
// most one ELO step (ELO_K), so a forged notice can't swing the ladder.
async function checkPvpResults(){
  if(!HAS_DB || !MY_ID || !S.char) return;
  try{
    const snap = await withTimeout(DB.collection('rc_players').doc(MY_ID).collection('pvpResults').orderBy('ts').limit(20).get(), 6000);
    if(snap.empty) return;
    const c = S.char, backup = JSON.parse(JSON.stringify(c.pvp));
    snap.docs.forEach((d,i)=>{
      const r = d.data();
      const delta = clamp(Math.round(Number(r.delta)||0), -ELO_K, ELO_K);
      c.pvp.rating = clamp((c.pvp.rating||1000) + delta, RATING_FLOOR, 100000);
      if(r.result==='win') c.pvp.wins++; else if(r.result==='lose') c.pvp.losses++;
      const verb = r.result==='win' ? 'You won' : r.result==='lose' ? 'You lost' : 'It was a draw';
      setTimeout(()=> showToast(`${r.fromName||'A player'} challenged you in PvP. ${verb} (${delta>=0?'+':''}${delta} rating).`), i*3000);
    });
    const saved = await saveCharacter(c);
    if(!saved){ c.pvp = backup; return; } // keep the notices and try again next time — never apply them twice
    const batch = DB.batch(); snap.docs.forEach(d=>batch.delete(d.ref)); await batch.commit();
    render();
  }catch(e){ console.warn('checkPvpResults failed:', e && e.code, e); }
}

async function checkMarketSales(){
  if(!HAS_DB || !MY_ID) return;
  try{
    const snap = await withTimeout(DB.collection('rc_players').doc(MY_ID).collection('marketSales').orderBy('ts').limit(20).get(), 6000);
    if(snap.empty) return;
    const batch = DB.batch();
    snap.docs.forEach((d,i)=>{
      const s = d.data();
      // Stagger so each sale gets its own readable toast instead of all of
      // them stomping on the single S.toast slot at once.
      setTimeout(()=> showToast(`Sold ${s.itemLabel} to ${s.buyerName} for ${s.totalPrice}g.`), i*3000);
      batch.delete(d.ref);
    });
    await batch.commit();
  }catch(e){ console.warn('checkMarketSales failed:', e && e.code, e); }
}

/* ---------------- Marketplace ---------------- */
function marketItemLabel(l){
  if(l.kind==='equipment'){
    const gear = l.equipmentSnapshot || {slot:l.slot, tier:l.tier, name:l.itemName};
    const chips = gearStatChips(gear.stats);
    return `${marketIcon('equipment', l.itemId, gear)}${esc(l.itemName)} <span class="tag tag-${l.tier}">${l.tier}</span>${gear.level?` <span class="tag">Lv.${gear.level}</span>`:''}${chips?`<div class="rc-chips2" style="margin-top:6px;font-weight:400;">${chips}</div>`:''}`;
  }
  return `${marketIcon(l.kind, l.itemId)}${esc(l.itemName)} x${l.qty}`;
}
async function loadMarketListings(){
  if(!HAS_DB){ S.marketListings = []; S.marketUnavailable = true; render(); return; }
  S.marketListings = null;
  render();
  try{
    const snap = await withTimeout(DB.collection('rc_marketListings').orderBy('createdAt','desc').limit(MARKET_BROWSE_LIMIT).get(), 6000);
    S.marketListings = snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
  }catch(e){
    S.marketListings = [];
    console.error('loadMarketListings failed:', e && e.code, e && e.message, e);
    showToast('Could not load the market — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
  render();
}

function sellableResources(c){ return Object.entries(c.resourceBag).filter(([,v])=>v>0).map(([k,v])=>({id:k, name:RESOURCE_NAMES[k]||k, have:v, itemId:k})); }
function sellableByKind(c, kind){
  if(kind==='resource') return sellableResources(c);
  if(kind==='material') return c.inventory.filter(i=>i.kind==='material').map(i=>({id:i.uid, name:i.name, have:i.qty||1, itemId:i.id}));
  if(kind==='consumable') return c.inventory.filter(i=>i.kind==='consumable').map(i=>({id:i.uid, name:i.name, have:i.qty||1, itemId:i.id}));
  if(kind==='equipment') return c.inventory.filter(i=>i.kind==='equipment').map(i=>({id:i.uid, name:i.name+' ('+i.tier+')', have:1, itemId:i.id, gear:i}));
  return [];
}

async function createListing(kind, itemKey, qty, pricePerUnit){
  const c = S.char;
  if(!HAS_DB){ showToast('The market needs shared storage, unavailable in this view.'); return; }
  qty = Math.max(1, Math.floor(qty||1));
  pricePerUnit = Math.max(1, Math.floor(pricePerUnit||0));
  if(!pricePerUnit){ showToast('Set a price first.'); return; }
  if(bagCount(c) >= BAG_CAPACITY && kind!=='resource'){ /* listing removes an item so this is fine, no-op guard */ }

  let listing = { sellerId: MY_ID, sellerName: c.username, sellerKingdom: c.kingdomId||null, kind, createdAt: Date.now() };

  if(kind==='resource'){
    const have = c.resourceBag[itemKey]||0;
    if(have < qty){ showToast('Not enough of that resource.'); return; }
    c.resourceBag[itemKey] = r3(c.resourceBag[itemKey] - qty);
    listing.itemId = itemKey; listing.itemName = RESOURCE_NAMES[itemKey]||itemKey; listing.qty = qty; listing.pricePerUnit = pricePerUnit; listing.totalPrice = qty*pricePerUnit;
  } else {
    const idx = c.inventory.findIndex(i=>i.uid===itemKey);
    if(idx<0){ showToast('Item not found in your bag.'); return; }
    const item = c.inventory[idx];
    if(kind==='equipment'){
      c.inventory.splice(idx,1);
      listing.itemId = item.id||item.uid; listing.itemName = item.name; listing.qty = 1; listing.pricePerUnit = pricePerUnit; listing.totalPrice = pricePerUnit;
      listing.tier = item.tier; listing.equipmentSnapshot = item;
    } else {
      qty = Math.min(qty, item.qty||1);
      if(qty >= (item.qty||1)) c.inventory.splice(idx,1); else item.qty -= qty;
      listing.itemId = item.id; listing.itemName = item.name; listing.qty = qty; listing.pricePerUnit = pricePerUnit; listing.totalPrice = qty*pricePerUnit;
      if(item.effect) listing.effect = item.effect;
    }
  }

  try{
    await withTimeout(DB.collection('rc_marketListings').add(listing), 6000);
    saveCharacter(c); // fire-and-forget
    showToast('Listing created.');
    loadMarketListings(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('createListing failed:', e && e.code, e && e.message, e);
    showToast('Could not create the listing — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function buyListing(listingId){
  const c = S.char;
  if(!HAS_DB) return;
  const ref = DB.doc('rc_marketListings/'+listingId);
  showToast('Buying…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const lease = await withTimeout(acquireDocLock(ref, MY_ID, 6000), 6000);
    if(!lease.acquired){ showToast('Someone else is buying this right now — try again in a moment.'); return; }
    const snap = await withTimeout(ref.get(), 6000);
    if(!snap.exists){ showToast('That listing is already gone.'); await loadMarketListings(); return; }
    const l = snap.data();
    if(l.sellerId === MY_ID){ showToast("You can't buy your own listing."); return; }
    if(c.gold < l.totalPrice){ showToast('Not enough gold.'); return; }
    if(l.kind!=='resource' && bagCount(c) >= BAG_CAPACITY){ showToast('Your bag is full.'); return; }

    // Credit the seller FIRST, while the listing this credit is justified by still
    // exists — the Firestore rule for this cross-account write checks that (see
    // firestore.rules). Doing it in this order (before the listing is deleted)
    // means if it's rejected, the buyer hasn't lost anything yet either.
    const sellerRef = DB.doc('rc_players/'+l.sellerId);
    const sellerSnap = await withTimeout(sellerRef.get(), 6000);
    if(!sellerSnap.exists){ showToast('Seller no longer exists — purchase cancelled.'); await ref.delete().catch(()=>{}); return; }
    const sd = sellerSnap.data();
    await withTimeout(sellerRef.update({ gold: (sd.gold||0) + l.totalPrice, lastCreditedListingId: listingId }), 6000);

    // Tell the seller what sold, next time they check the market — the gold
    // above already landed even if they're offline right now, but without
    // this they'd just see a gold change with no idea why. Same pattern as
    // Arcadia's marketSales notices: a create-only doc in the seller's own
    // subcollection (a buyer can't write anywhere else on the seller's
    // player doc), which the seller's own client reads and clears. Best
    // effort — if this fails the sale itself already went through above.
    DB.collection('rc_players').doc(l.sellerId).collection('marketSales').add({
      buyerName: S.char && S.char.username || 'A player',
      itemLabel: marketItemLabel(l).replace(/<[^>]+>/g,''),
      totalPrice: l.totalPrice,
      ts: Date.now(),
    }).catch(e=>console.warn('Could not deliver sale notice to seller:', e && e.code, e));

    // Only after the seller has been paid do we transfer the item and remove the listing.
    c.gold -= l.totalPrice;
    if(l.kind==='resource'){
      c.resourceBag[l.itemId] = r3((c.resourceBag[l.itemId]||0) + l.qty);
    } else if(l.kind==='equipment'){
      const item = Object.assign({}, l.equipmentSnapshot, {uid: uid()});
      c.inventory.push(item);
    } else {
      const existing = c.inventory.find(i=>i.kind===l.kind && i.id===l.itemId);
      if(existing) existing.qty = (existing.qty||1) + l.qty;
      else c.inventory.push({uid: uid(), kind: l.kind, id: l.itemId, name: l.itemName, qty: l.qty, effect: l.effect});
    }
    await ref.delete();
    saveCharacter(c); // fire-and-forget

    showToast(`Bought ${marketItemLabel(l).replace(/<[^>]+>/g,'')} for ${l.totalPrice}g.`);
    loadMarketListings(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('buyListing failed:', e && e.code, e && e.message, e);
    showToast('Purchase failed — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function cancelListing(listingId){
  const c = S.char;
  if(!HAS_DB) return;
  const ref = DB.doc('rc_marketListings/'+listingId);
  try{
    const snap = await withTimeout(ref.get(), 6000);
    if(!snap.exists){ await loadMarketListings(); return; }
    const l = snap.data();
    if(l.sellerId !== MY_ID){ showToast('This is not your listing.'); return; }
    if(l.kind!=='resource' && bagCount(c) >= BAG_CAPACITY){ showToast('Your bag is full — make room before cancelling.'); return; }
    if(l.kind==='resource'){
      c.resourceBag[l.itemId] = r3((c.resourceBag[l.itemId]||0) + l.qty);
    } else if(l.kind==='equipment'){
      c.inventory.push(Object.assign({}, l.equipmentSnapshot, {uid: uid()}));
    } else {
      const existing = c.inventory.find(i=>i.kind===l.kind && i.id===l.itemId);
      if(existing) existing.qty = (existing.qty||1) + l.qty;
      else c.inventory.push({uid: uid(), kind: l.kind, id: l.itemId, name: l.itemName, qty: l.qty, effect: l.effect});
    }
    await ref.delete();
    saveCharacter(c); // fire-and-forget
    showToast('Listing cancelled — item returned to your bag.');
    loadMarketListings(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('cancelListing failed:', e && e.code, e && e.message, e);
    showToast('Could not cancel — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function findOpponents(myChar){
  const myLevel = myChar.level;
  const tolerance = Math.max(4, Math.round(myLevel*0.2));
  let candidates = [];
  if(HAS_DB){
    try{
      const snap = await withTimeout(DB.collection('rc_players').limit(60).get(), 5000);
      const now = Date.now();
      snap.docs.forEach(d=>{
        const data = d.data();
        if(!data || d.id===MY_ID) return;
        if(!data.username || !data.class) return;
        if(Math.abs((data.level||1)-myLevel) > tolerance) return;
        if((data.pvp && data.pvp.protectedUntil||0) > now) return;
        candidates.push(Object.assign({id:d.id}, data));
      });
    }catch(e){ /* ignore, fall back to bots */ }
  }
  // top up with bots so there is always something to fight
  while(candidates.length < 3){
    const lvl = clamp(myLevel + rndInt(-Math.min(3,tolerance), Math.min(3,tolerance)), 1, 400);
    const rating = clamp((myChar.pvp.rating||1000) + rndInt(-70,70), RATING_FLOOR, 5000);
    candidates.push(buildBotOpponent(lvl, rating));
  }
  candidates.sort((a,b)=> Math.abs((a.pvp?.rating||1000)-(myChar.pvp.rating||1000)) - Math.abs((b.pvp?.rating||1000)-(myChar.pvp.rating||1000)));
  return candidates.slice(0,3);
}


/* ---- Live chat listener: new-message popup + unread badge ---- */
let _chatSub = null, _chatInit = false, _chatPopTimer = null;
function startChatListener(){
  if(_chatSub || !HAS_DB || !S.char) return;
  try{
    _chatSub = DB.doc('meta/rc_generalChat').onSnapshot(snap=>{
      const msgs = (snap.exists && Array.isArray(snap.data().messages)) ? snap.data().messages : [];
      const prevTs = S.chatLastTs || 0;
      const fresh = msgs.filter(m=>(m.ts||0) > prevTs && m.senderId !== MY_ID);
      const first = !_chatInit; _chatInit = true;
      S.generalChat = msgs; S.generalChatUnavailable = false;
      S.chatLastTs = Math.max(prevTs, msgs.reduce((a,m)=>Math.max(a,m.ts||0),0));
      if(first || !fresh.length){ render(); return; }
      if(S.chatWidgetOpen){ S.chatUnread = 0; render(); return; }
      S.chatUnread = (S.chatUnread||0) + fresh.length;
      S.chatPop = fresh[fresh.length-1];
      clearTimeout(_chatPopTimer);
      _chatPopTimer = setTimeout(()=>{ S.chatPop = null; render(); }, 5000);
      render();
    }, e=>{ console.error('chat listener failed:', e && e.code, e && e.message); _chatSub = null; });
  }catch(e){ console.error(e); }
}


/* ---- Victory reward: every fighter of the WINNING country gets gold + XP, once per war ---- */
let _claimingWars = false;
async function claimWarRewards(){
  const c = S.char;
  if(_claimingWars || !c || !c.kingdomId || !HAS_DB || !S.worldWars) return;
  const done = c.claimedWars || [];
  const todo = (S.worldWars.recent||[]).filter(w=>w.winnerCountryId===c.kingdomId && !done.includes(w.id)).slice(0,5);
  if(!todo.length) return;
  _claimingWars = true;
  try{
    let gold = 0, xp = 0;
    for(const w of todo){
      const snap = await withTimeout(DB.doc('rc_warPlayers/'+w.id+'_'+MY_ID).get(), 6000);
      if(snap.exists){
        const dmg = Object.values(snap.data().damage||{}).reduce((a,b)=>a+(Number(b)||0),0);
        if(dmg > 0){ gold += 100 + Math.min(3000, Math.round(dmg/40)); xp += 60 + Math.min(400, Math.round(dmg/200)); }
      }
      done.push(w.id);
    }
    // S.char may have been replaced (fresh load after a fight) while we were awaiting reads above — write to the live one.
    const cur = S.char || c;
    cur.claimedWars = done.slice(-30);
    if(gold){
      cur.gold += gold; cur.xp += xp;
      await checkLevelUps(cur, []); // war XP can level the player up — that must also grant skill points
    }
    saveCharacter(cur);
    if(gold) showToast('War victory! +'+fmtNum(gold)+' gold, +'+fmtNum(xp)+' XP for your fights.');
  }catch(e){ console.error('claimWarRewards', e); }
  _claimingWars = false;
}

/* ---- Public fighter list for any war (read from the public round docs) ---- */
async function loadWarFighters(warId){
  S.warFighters = S.warFighters || {};
  const cur = S.warFighters[warId];
  if(cur && (cur.loading || Date.now()-cur.at < 20000)) return;
  S.warFighters[warId] = {loading:true, at:Date.now(), list:(cur&&cur.list)||[]};
  try{
    const snaps = await Promise.all([1,2,3].map(n=>withTimeout(DB.doc('rc_wars/'+warId+'/rounds/'+n).get(), 6000).catch(()=>null)));
    const tot = {}, side = {};
    snaps.forEach(s=>{ if(s && s.exists){ const d=s.data(); Object.entries(d.contrib||{}).forEach(([u,v])=>{ tot[u]=(tot[u]||0)+(Number(v)||0); }); Object.entries(d.members||{}).forEach(([u,c])=>{ side[u]=c; }); }});
    const top = Object.keys(tot).sort((a,b)=>tot[b]-tot[a]).slice(0,16);
    const players = await Promise.all(top.map(u=>withTimeout(DB.doc('rc_players/'+u).get(), 6000).then(s=>s.exists?s.data():null).catch(()=>null)));
    const list = top.map((u,i)=>({uid:u, dmg:tot[u], countryId:side[u], username:players[i]?players[i].username:'Unknown', level:players[i]?players[i].level:1}));
    S.warFighters[warId] = {loading:false, at:Date.now(), list};
  }catch(e){ S.warFighters[warId] = {loading:false, at:Date.now(), list:[], error:true}; }
  render();
}


function sendChatCurrent(text){ return chatChannelNow()==='country' ? sendKingdomChat(text, true) : sendGeneralChat(text); }

/* ---- Live country chat: unread badge + popup for messages from fellow citizens ---- */
let _kSub = null, _kSubId = null, _kInit = false;
function startKingdomChatListener(){
  const c = S.char;
  if(!HAS_DB || !c || !c.kingdomId){
    if(_kSub){ _kSub(); _kSub = null; _kSubId = null; _kInit = false; }
    return;
  }
  if(_kSub && _kSubId === c.kingdomId) return;
  if(_kSub){ _kSub(); _kSub = null; }
  _kInit = false; _kSubId = c.kingdomId; S.kChatLastTs = 0;
  try{
    _kSub = DB.doc('rc_kingdoms/'+c.kingdomId).onSnapshot(snap=>{
      if(!snap.exists) return;
      const d = snap.data(), chat = Array.isArray(d.chat) ? d.chat : [];
      const prev = S.kChatLastTs || 0;
      const fresh = chat.filter(m=>(m.ts||0) > prev && m.senderId !== MY_ID);
      S.kChatLastTs = chat.reduce((a,m)=>Math.max(a, m.ts||0), prev);
      const kv = S.kingdomView;
      if(kv && kv.mode==='mine' && kv.kingdom){
        kv.kingdom = Object.assign({}, kv.kingdom, {chat, treasury: d.treasury || kv.kingdom.treasury, leaderId: d.leaderId !== undefined ? d.leaderId : kv.kingdom.leaderId});
      }
      const first = !_kInit; _kInit = true;
      if(first || !fresh.length){ render(); return; }
      if(S.chatWidgetOpen && chatChannelNow()==='country'){ render(); return; }
      S.chatUnreadK = (S.chatUnreadK||0) + fresh.length;
      S.chatPop = Object.assign({senderKingdom:c.kingdomId, senderLevel:1, channel:'country'}, fresh[fresh.length-1]);
      clearTimeout(_chatPopTimer);
      _chatPopTimer = setTimeout(()=>{ S.chatPop = null; render(); }, 5000);
      render();
    }, e=>{ console.error('country chat listener failed:', e && e.code, e && e.message); _kSub = null; _kSubId = null; });
  }catch(e){ console.error(e); }
}


/* ---- Read-only profiles: any country / any player (nothing here writes) ---- */
async function loadCountryProfile(id){
  const cur = S.viewCountry;
  if(cur && cur.id===id && !cur.error && (cur.loading || Date.now()-(cur.at||0) < 30000)) return;
  S.viewCountry = {id, loading:true};
  render();
  if(!HAS_DB){ S.viewCountry = {id, unavailable:true}; render(); return; }
  try{
    const [kSnap, mSnap, econ] = await Promise.all([
      withTimeout(DB.doc('rc_kingdoms/'+id).get(), 6000),
      withTimeout(DB.collection('rc_players').where('kingdomId','==',id).limit(80).get(), 6000),
      withTimeout(callFn('getCountryPublic', {countryId:id}), 6000).catch(()=>null), // war taxes: visible to everyone, even without a country
    ]);
    const kingdom = kSnap.exists ? kSnap.data() : {treasury:{}, leaderId:null};
    const members = mSnap.docs.map(d=>Object.assign({id:d.id}, d.data())).filter(m=>m.username)
      .sort((a,b)=>kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole)||(b.level||1)-(a.level||1));
    S.viewCountry = {id, at:Date.now(), kingdom, members, econ};
  }catch(e){ console.error('loadCountryProfile', e); S.viewCountry = {id, error:true}; }
  render();
}
async function loadPlayerProfile(id){
  const cur = S.viewPlayer;
  if(cur && cur.id===id && !cur.error && (cur.loading || Date.now()-(cur.at||0) < 30000)) return;
  S.viewPlayer = {id, loading:true};
  render();
  if(!HAS_DB){ S.viewPlayer = {id, unavailable:true}; render(); return; }
  try{
    const snap = await withTimeout(DB.doc('rc_players/'+id).get(), 6000);
    S.viewPlayer = snap.exists ? {id, at:Date.now(), data:snap.data()} : {id, missing:true};
  }catch(e){ console.error('loadPlayerProfile', e); S.viewPlayer = {id, error:true}; }
  render();
}
