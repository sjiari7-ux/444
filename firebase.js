/* ============================================================
   FIREBASE (real accounts + shared multiplayer data)
   Same project the old build used, so this still needs a live
   connection to work fully — but unlike the old build, losing that
   connection here just falls back to a local guest run instead of
   blocking the whole game (see STORAGE LAYER below).
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDaZVxynpwb2lkHuCCJuQ4ICZfVAvjHmuU",
  authDomain: "arcadaimmo.firebaseapp.com",
  projectId: "arcadaimmo",
  storageBucket: "arcadaimmo.firebasestorage.app",
  messagingSenderId: "302453347843",
  appId: "1:302453347843:web:0c96be2b644f89b4aee036"
};
let fbAuth = null, fbStore = null;
try{
  if(typeof firebase !== 'undefined' && firebase.initializeApp){
    firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbStore = firebase.firestore();
  }
}catch(e){ console.error('[Arcadia] Firebase init failed:', e); }

