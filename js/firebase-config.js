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
  toggleViewElement('view-login', name === 'login');
  toggleViewElement('view-setup', name === 'setup');
  toggleViewElement('view-game', name === 'game');
}

async function enterGame(){
  showView('game');
  if (typeof startGame === 'function') {
    try { await startGame(); } catch(e){ console.error('startGame failed:', e); }
  }
  if (typeof loadUsername === 'function') {
    try { loadUsername(); } catch(e){ console.error('loadUsername failed:', e); }
  }
}

if (auth) {
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
    try{
      const playerDoc = await db.collection('players').doc(UID).get();
      if(playerDoc.exists){
        await enterGame();
      } else {
        showView('setup');
      }
    } catch(e){
      console.error(e);
    }
  });
} else {
  // Offline demo mode: show login but warn user
  showView('login');
  document.addEventListener('DOMContentLoaded', () => {
    const errorBox = document.getElementById('errorBox');
    if (errorBox) {
      errorBox.textContent = '🔌 OFFLINE MODE: No Firebase config detected. Guest play works locally, but progress will not sync to cloud. Set up Firebase credentials to enable cloud save.';
      errorBox.style.display = 'block';
    }
  });
}
