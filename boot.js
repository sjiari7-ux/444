/* ============================================================
   BOOT
   ============================================================ */
function migrateCharacter(c){
  if(!c.bossCooldowns) c.bossCooldowns = {};
  if(c.kingdomId===undefined) c.kingdomId = null;
  if(c.kingdomRole===undefined) c.kingdomRole = null;
  if(c.kingdomJoinedAt===undefined) c.kingdomJoinedAt = 0;
  if(c.kingdomCooldownUntil===undefined) c.kingdomCooldownUntil = 0;
  if(!c.resourceBag) c.resourceBag = {};
  Object.keys({wood:0,stone:0,food:0,coal:0,iron:0,ore:0,herbs:0,leather:0,frost:0,voidessence:0}).forEach(k=>{
    if(typeof c.resourceBag[k] !== 'number') c.resourceBag[k] = 0;
  });
  return c;
}
async function enterApp(){
  try{
    const existing = await loadCharacter();
    if(existing){
      S.char = migrateCharacter(existing);
      applyRegen(S.char);
      await saveCharacter(S.char);
    }
  }catch(e){
    // Whatever went wrong (Firestore hiccup, corrupted save, etc.), never leave
    // the player stuck on the loading screen — fall back to a fresh run.
    S.char = null;
  }
  setScreen(S.char ? 'home' : 'create');
  if(!window._arcadiaRegenLoop){
    window._arcadiaRegenLoop = true;
    setInterval(()=>{
      if(S.char && S.screen!=='combat' && S.screen!=='kingdom' && S.screen!=='market'){ applyRegen(S.char); render(); }
    }, 20000);
  }
}

async function useLocalGuest(){
  try{
    MY_ID = localStorage.getItem(LS_KEY_PREFIX+'guest_id');
    if(!MY_ID){ MY_ID = 'guest_'+uid(); localStorage.setItem(LS_KEY_PREFIX+'guest_id', MY_ID); }
  }catch(e){ MY_ID = 'guest_'+uid(); }
  HAS_DB = false;
  await enterApp();
}

function setLoginBusy(isBusy){
  const g = document.getElementById('login-google-btn'), q = document.getElementById('login-guest-btn'), err = document.getElementById('login-err');
  if(g) g.disabled = isBusy;
  if(q) q.disabled = isBusy;
  if(err) err.style.display = 'none';
}
function showLoginError(msg){
  const err = document.getElementById('login-err');
  if(err){ err.textContent = msg; err.style.display = 'block'; }
  setLoginBusy(false);
}
async function signInWithGoogle(){
  setLoginBusy(true);
  try{
    await fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    // onAuthStateChanged below picks up the signed-in user from here.
  }catch(e){
    console.error('[Arcadia Auth] Google sign-in failed:', e.code, e.message);
    showLoginError(e.code==='auth/popup-closed-by-user' ? 'Sign-in window was closed before finishing.' : ('Sign-in failed: '+(e.message||'unknown error')));
  }
}
async function continueAsGuestAccount(){
  setLoginBusy(true);
  try{
    await fbAuth.signInAnonymously();
  }catch(e){
    console.error('[Arcadia Auth] Guest sign-in failed:', e.code, e.message);
    showLoginError('Guest sign-in failed: '+(e.message||'unknown error'));
  }
}

function boot(){
  DB = buildDbAdapter();
  if(!fbAuth){
    // Firebase SDK didn't load (offline / blocked) — same graceful
    // local-only fallback the original prototype used.
    useLocalGuest();
    return;
  }
  fbAuth.onAuthStateChanged(async user=>{
    if(!user){ setScreen('login'); return; }
    MY_ID = user.uid;
    HAS_DB = !!DB;
    await enterApp();
  });
}
render();
boot();
// Absolute last resort: if something outside boot()'s own flow still hangs
// (e.g. auth never resolving), never leave the player staring at the
// loading screen forever.
setTimeout(()=>{ if(S.screen==='loading') useLocalGuest(); }, 9000);

