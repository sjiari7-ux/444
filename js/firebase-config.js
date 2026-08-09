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
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;
  } else {
    console.warn('Firebase not configured. Using offline demo mode.');
  }
} catch (e) {
  console.error('Firebase init failed:', e);
}

let UID = null;
let EMAIL = null;

function showView(name){
  document.getElementById('view-login').classList.toggle('hidden', name !== 'login');
  document.getElementById('view-setup').classList.toggle('hidden', name !== 'setup');
  document.getElementById('view-game').classList.toggle('hidden', name !== 'game');
}

async function enterGame(){
  showView('game');
  await startGame();
  loadUsername();
}

if (auth) {
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
