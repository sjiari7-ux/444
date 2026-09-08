/* ═══════════════════════════════════════════════════════════════
   ⚠️  FIREBASE SETUP REQUIRED
   ═══════════════════════════════════════════════════════════════
   Replace the placeholder values below with your Firebase project
   credentials from https://console.firebase.google.com/

   Without valid credentials the game runs in OFFLINE DEMO MODE only.
   Progress will NOT be saved to the cloud.
   ═══════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyDaZVxynpwb2lkHuCCJuQ4ICZfVAvjHmuU",
  authDomain: "arcadaimmo.firebaseapp.com",
  projectId: "arcadaimmo",
  storageBucket: "arcadaimmo.firebasestorage.app",
  messagingSenderId: "302453347843",
  appId: "1:302453347843:web:0c96be2b644f89b4aee036"
};
// ═══════════════════════════════════════════════

let auth = null;
let db = null;
let firebaseReady = false;

try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_')) {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      firebase.initializeApp(firebaseConfig);
      if (firebase.auth) auth = firebase.auth();
      if (firebase.firestore) db = firebase.firestore();
      firebaseReady = true;
    } else {
      console.warn('Firebase SDK not loaded or incompatible version detected.');
    }
  } else {
    console.warn('Firebase not configured. Using offline demo mode.');
  }
} catch (e) {
  console.error('Firebase init failed:', e);
}

let UID = null;
let EMAIL = null;

function toggleViewElement(id, visible) {
  const el = document.getElementById(id);
  if (el && el.classList && typeof el.classList.toggle === 'function') {
    el.classList.toggle('hidden', !visible);
  }
}

function showView(name){
  toggleViewElement('view-boot', name === 'boot');
  toggleViewElement('view-login', name === 'login');
  toggleViewElement('view-setup', name === 'setup');
  toggleViewElement('view-game', name === 'game');
  toggleViewElement('view-connlost', name === 'connlost');
}

// Updates the boot screen's progress bar + status line (see view-boot in
// index.html). Safe to call even when the boot screen isn't the visible
// view — it just writes to hidden elements.
function setBootProgress(pct, text){
  const fill = document.getElementById('bootProgressFill');
  const pctEl = document.getElementById('bootProgressPct');
  const statusEl = document.getElementById('bootStatus');
  if(fill) fill.style.width = pct + '%';
  if(pctEl) pctEl.textContent = pct + '%';
  if(statusEl && text) statusEl.textContent = text;
}

async function enterGame(){
  // Arcadia is online-only (shared gold/PvP/market economy) — don't reveal
  // the game view until startGame() has actually confirmed it loaded real
  // cloud data. Showing 'game' first and only then finding out loadState()
  // failed is exactly what left players stuck on a frozen loading screen.
  if (typeof startGame === 'function') {
    try {
      setBootProgress(85, 'Loading market, gear, player…');
      await startGame();
      setBootProgress(100, 'Ready!');
    } catch(e){
      console.error('[Arcadia] startGame failed, showing connection-problem screen:', e);
      showView('connlost');
      return;
    }
  }
  showView('game');
  if (typeof loadUsername === 'function') {
    try { loadUsername(); } catch(e){ console.error('loadUsername failed:', e); }
  }
}

if (auth) {
  // Boot screen (view-boot in index.html) is what's visible by default on
  // first paint — this avoids flashing the login form at a returning
  // player who's actually about to land straight in the game once
  // onAuthStateChanged below resolves their existing session.
  setBootProgress(20, 'Connecting to Arcadia…');

  // Pick up the result of a signInWithRedirect() fallback (see auth.js).
  // Errors here are swallowed on purpose: if there was no redirect in
  // flight, getRedirectResult() just resolves with a null user — this only
  // matters right after the browser navigates back from the Google sign-in
  // page.
  auth.getRedirectResult().catch(err => {
    console.error('[Arcadia Auth] Redirect sign-in result failed:', err.code, err.message);
  });

  auth.onAuthStateChanged(async user => {
    if(!user){
      UID = null; EMAIL = null;
      showView('login');
      return;
    }
    UID = user.uid;
    EMAIL = user.email;
    setBootProgress(50, 'Verifying your session…');
    try{
      // withTimeout (js/sync.js) caps this so a blocked/unreachable
      // Firestore connection can't leave the player stuck on the loading
      // screen forever — see the "Opening the ledger..." freeze this fixes.
      const playerDoc = await withTimeout(db.collection('players').doc(UID).get(), 8000);
      if(playerDoc.exists){
        setBootProgress(70, 'Loading your kingdom…');
        await enterGame();
      } else {
        showView('setup');
      }
    } catch(e){
      // Arcadia is online-only — a player we can't confirm one way or the
      // other (most likely a blocked/offline connection, per the console
      // errors this fixes) gets a clear retry screen, never a silent
      // offline continue that risks desyncing their shared economy data.
      console.error('[Arcadia Auth] Could not verify player doc (connection problem):', e);
      showView('connlost');
    }
  });
} else {
  // Firebase couldn't initialize at all (SDK didn't load / not configured).
  // Arcadia is online-only — signInWithGoogle()/continueAsGuest() (js/auth.js)
  // both already refuse to proceed and show an error when this happens, so
  // this just surfaces that same explanation on first load too instead of
  // silently sitting on an unusable login screen.
  showView('login');
  document.addEventListener('DOMContentLoaded', () => {
    const errorBox = document.getElementById('errorBox');
    if (errorBox) {
      errorBox.textContent = '🔌 Could not reach Firebase. Arcadia MMO needs a live connection to play — check your internet connection or disable any ad blocker / privacy extension blocking Google/Firebase, then reload.';
      errorBox.style.display = 'block';
    }
  });
}
