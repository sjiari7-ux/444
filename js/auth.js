/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Login (Google Sign-In)
   ═══════════════════════════════════════════════════════════════ */
const googleBtn = document.getElementById('googleBtn');
const guestBtn = document.getElementById('guestBtn');
const loadingBox = document.getElementById('loadingBox');
const errorBox = document.getElementById('errorBox');

function showError(msg){
  console.error('[Arcadia Auth]', msg);
  if(!errorBox){ alert(msg); return; }
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
  loadingBox.style.display = 'none';
  googleBtn.disabled = false;
  guestBtn.disabled = false;
}

function setLoading(isLoading){
  googleBtn.disabled = isLoading;
  guestBtn.disabled = isLoading;
  loadingBox.style.display = isLoading ? 'flex' : 'none';
  errorBox.style.display = 'none';
}

async function signInWithGoogle(){
  console.log('[Arcadia Auth] Sign-in button clicked');

  if (typeof firebase === 'undefined') {
    showError('⚠️ لم يتم تحميل مكتبة Firebase. تأكد أن متصفحك أو أي أداة حجب إعلانات (مثل Brave Shields أو AdBlock) لا تمنع gstatic.com');
    return;
  }

  if (!auth) {
    showError('Firebase not configured. Please set up Firebase credentials in the code.');
    return;
  }

  setLoading(true);

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');

  try{
    await auth.signInWithPopup(provider);
    console.log('[Arcadia Auth] Sign-in succeeded (popup)');
  } catch(err){
    console.error('[Arcadia Auth] Popup sign-in failed:', err.code, err.message);
    // Popups are unreliable on mobile browsers and in-app webviews (they're
    // often blocked outright, or the environment doesn't support them at
    // all). Fall back to a full-page redirect for those specific failure
    // modes only — NOT when the user deliberately closed the popup, since
    // silently redirecting them away after a cancel would be surprising.
    // The redirect result is picked up by getRedirectResult() in
    // firebase-config.js on the next page load.
    const redirectableCodes = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'];
    if(redirectableCodes.includes(err.code)){
      try{
        console.log('[Arcadia Auth] Falling back to redirect sign-in...');
        await auth.signInWithRedirect(provider);
        return; // page will navigate away
      } catch(redirectErr){
        console.error('[Arcadia Auth] Redirect sign-in failed:', redirectErr.code, redirectErr.message);
        err = redirectErr;
      }
    }
    let friendly = err.message || 'Unknown error';
    if(err.code === 'auth/popup-blocked'){
      friendly = 'المتصفح منع النافذة المنبثقة (popup). فعّل popups لهذا الموقع وحاول من جديد.';
    } else if(err.code === 'auth/unauthorized-domain'){
      friendly = 'هذا الدومين غير مصرح به في Firebase. زد الدومين ديالك في Authentication > Settings > Authorized domains.';
    } else if(err.code === 'auth/popup-closed-by-user'){
      friendly = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
    }
    showError('Login failed: ' + friendly);
    setLoading(false);
  }
}

async function continueAsGuest(){
  console.log('[Arcadia Auth] Guest button clicked');

  if (typeof firebase === 'undefined') {
    showError('⚠️ لم يتم تحميل مكتبة Firebase. تأكد أن متصفحك أو أي أداة حجب إعلانات (مثل Brave Shields أو AdBlock) لا تمنع gstatic.com');
    return;
  }

  if (!auth) {
    showError('Firebase not configured. Please set up Firebase credentials in the code.');
    return;
  }
  
  setLoading(true);
  try{
    console.log('[Arcadia Auth] Attempting anonymous sign-in...');
    await auth.signInAnonymously();
    console.log('[Arcadia Auth] Guest sign-in succeeded');
  } catch(err){
    console.error('[Arcadia Auth] Guest sign-in failed:', err.code, err.message);
    const errorMsg = err.message || 'Unknown error';
    showError('Guest login failed: ' + errorMsg);
    setLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Account Setup (username + class)
   ═══════════════════════════════════════════════════════════════ */
function logoutDuringSetup(){
  console.log('[Arcadia Setup] Logout initiated during setup');
  if(auth){ 
    auth.signOut().then(()=>{
      console.log('[Arcadia Setup] Sign-out successful, reloading page');
      location.reload();
    }).catch(err => {
      console.error('[Arcadia Setup] Sign-out failed:', err.message);
      location.reload();
    });
  } else { 
    location.reload(); 
  }
}

let selectedUsername = '';
let selectedClass = null;
let usernameAvailable = false;
let checkTimeout = null;

function checkUsername(){
  const input = document.getElementById('usernameInput');
  const val = input.value.trim();
  const errorBox2 = document.getElementById('inputError');
  const successBox = document.getElementById('inputSuccess');
  const nextBtn = document.getElementById('nextBtn');

  if(!errorBox2 || !successBox || !nextBtn) {
    console.error('[Arcadia Setup] Required DOM elements not found for username check');
    return;
  }

  errorBox2.style.display = 'none';
  successBox.style.display = 'none';
  nextBtn.disabled = true;
  usernameAvailable = false;

  if(!val) {
    console.debug('[Arcadia Setup] Username input empty');
    return;
  }

  if(val.length < 3){
    errorBox2.textContent = 'Name must be at least 3 characters';
    errorBox2.style.display = 'block';
    console.debug('[Arcadia Setup] Username too short:', val.length, 'characters');
    return;
  }

  if(!/^[a-zA-Z0-9_]+$/.test(val)){
    errorBox2.textContent = 'Contains disallowed symbols';
    errorBox2.style.display = 'block';
    console.debug('[Arcadia Setup] Username contains invalid characters');
    return;
  }

  clearTimeout(checkTimeout);
  checkTimeout = setTimeout(async () => {
    try{
      console.log('[Arcadia Setup] Checking username availability:', val);
      if (db) {
        const doc = await db.collection('usernames').doc(val).get();
        if(doc.exists){
          errorBox2.textContent = '❌ This name is already taken';
          errorBox2.style.display = 'block';
          console.warn('[Arcadia Setup] Username already taken:', val);
          return;
        }
      }
      successBox.style.display = 'block';
      usernameAvailable = true;
      selectedUsername = val;
      nextBtn.disabled = false;
      console.log('[Arcadia Setup] Username available:', val);
    } catch(e){
      console.error('[Arcadia Setup] Username availability check failed:', e.message);
      errorBox2.textContent = 'Connection error, try again';
      errorBox2.style.display = 'block';
    }
  }, 400);
}

function goToStep2(){
  if(!usernameAvailable) {
    console.warn('[Arcadia Setup] Attempted to advance to step 2 with unavailable username');
    return;
  }
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  if(!step1 || !step2) {
    console.error('[Arcadia Setup] Step elements not found');
    return;
  }
  step1.classList.add('hidden');
  step2.classList.remove('hidden');
  console.log('[Arcadia Setup] Progressed to step 2');
}

function goToStep1(){
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  if(!step1 || !step2) {
    console.error('[Arcadia Setup] Step elements not found');
    return;
  }
  step2.classList.add('hidden');
  step1.classList.remove('hidden');
  console.log('[Arcadia Setup] Returned to step 1');
}

function selectSetupClass(cls){
  const classCard = document.querySelector(`.class-card[data-class="${cls}"]`);
  if(!classCard) {
    console.error('[Arcadia Setup] Class card not found for class:', cls);
    return;
  }
  selectedClass = cls;
  document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
  classCard.classList.add('selected');
  const finishBtn = document.getElementById('finishBtn');
  if(finishBtn) {
    finishBtn.disabled = false;
  }
  console.log('[Arcadia Setup] Selected class:', cls);
}

async function finishSetup(){
  if(!selectedClass || !usernameAvailable) {
    console.warn('[Arcadia Setup] Attempted to finish setup with invalid state', { selectedClass, usernameAvailable });
    return;
  }

  const overlay = document.getElementById('loadingOverlay');
  if(!overlay) {
    console.error('[Arcadia Setup] Loading overlay not found');
    return;
  }
  overlay.classList.add('active');
  console.log('[Arcadia Setup] Starting account creation for username:', selectedUsername, 'class:', selectedClass);

  try{
    if (db) {
      // Reserve the username AND create the player document in a single
      // atomic transaction. This closes the race condition where two
      // players who pass the availability check around the same time
      // could both end up writing the same username.
      console.log('[Arcadia Setup] Reserving username + creating player (atomic)...');
      const nameRef = db.collection('usernames').doc(selectedUsername);
      const playerRef = db.collection('players').doc(UID);
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const playerData = {
        uid: UID,
        email: EMAIL,
        username: selectedUsername,
        playerClass: selectedClass,
        level: 1,
        xp: 0,
        xpToNext: 35,
        gold: 100,
        stamina: 100,
        maxStamina: 100,
        hp: 100,
        maxHp: 100,
        mana: 20,
        maxMana: 20,
        stats: {
          attack: 10,
          defense: 5,
          speed: 10,
          crit: 5,
          dodge: 5
        },
        resources: {
          wood: 0, stone: 0, food: 0, coal: 0, iron: 0, gold_ore: 0,
          cotton: 0, leather: 0, sand: 0, gemstones: 0, water: 0,
          salt: 0, copper: 0, silver: 0, zinc: 0, lead: 0,
          magic_stones: 0, herbs: 0, honey: 0
        },
        companies: [{
          id: 1,
          resource: 'wood',
          engineLevel: 1,
          stored: 0,
          disabled: false
        }],
        gear: {
          weapon: null,
          armor: null,
          helmet: null,
          boots: null,
          accessory: null,
          gloves: null
        },
        gearBag: [],
        skills: {
          health: 0, damage: 0, defense: 0,
          stamina: 0, storage: 0, profit: 0
        },
        skillPoints: 0,
        classSkills: {},
        classSkillPoints: 0,
        prestige: {
          points: 0, gatherBonus: 0, sellBonus: 0,
          energyBonus: 0, storageBonus: 0
        },
        combat: { wins: 0, losses: 0 },
        totalGoldEarned: 100,
        shards: 0,
        gems: 0,
        createdAt: now,
        lastLogin: now
      };

      await db.runTransaction(async (tx) => {
        const nameDoc = await tx.get(nameRef);
        if (nameDoc.exists) {
          const err = new Error('This name was just taken by another player. Please pick a different one.');
          err.code = 'username-taken';
          throw err;
        }
        tx.set(nameRef, { uid: UID, createdAt: now });
        tx.set(playerRef, playerData);
      });
      console.log('[Arcadia Setup] Account created successfully (atomic transaction)');
    } else {
      console.warn('[Arcadia Setup] Database not available, skipping data persistence');
    }

    // Go to game (works even without db)
    console.log('[Arcadia Setup] Setup complete, entering game');
    await enterGame();

  } catch(err){
    console.error('[Arcadia Setup] Account creation failed:', err.code || err.name, err.message);
    overlay.classList.remove('active');
    if (err.code === 'username-taken') {
      usernameAvailable = false;
      const step1 = document.getElementById('step1');
      const step2 = document.getElementById('step2');
      if (step1 && step2) { step2.classList.add('hidden'); step1.classList.remove('hidden'); }
      const errorBox2 = document.getElementById('inputError');
      const successBox = document.getElementById('inputSuccess');
      const nextBtn = document.getElementById('nextBtn');
      if (errorBox2) { errorBox2.textContent = '❌ ' + err.message; errorBox2.style.display = 'block'; }
      if (successBox) successBox.style.display = 'none';
      if (nextBtn) nextBtn.disabled = true;
      return;
    }
    const errorMsg = err.message || 'Unknown error occurred';
    alert('Account creation failed: ' + errorMsg);
  }
}
