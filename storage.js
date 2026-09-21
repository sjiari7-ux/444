/* ============================================================
   STORAGE LAYER
   Firebase account (Google or anonymous "Guest") -> real shared
   Firestore data, so PvP/kingdoms/market are against real players.
   If Firebase can't load at all (offline, blocked script), this
   quietly falls back to a local-only guest run instead of blocking
   the game — same spirit as the original prototype.
   ============================================================ */
const LS_KEY_PREFIX = 'arcadia_v1_';
let DB = null, MY_ID = null, HAS_DB = false;

function withTimeout(promise, ms){
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')), ms)),
  ]);
}

// Thin adapter so the rest of the file can keep using the same
// doc()/collection() calls regardless of backend. DB.doc(path).acquire()
// is the one method with no native Firestore equivalent — it's a short
// lease used by buyListing() so two buyers can't race the same listing.
function buildDbAdapter(){
  if(!fbStore) return null;
  return {
    doc(path){
      const i = path.indexOf('/');
      const ref = fbStore.collection(path.slice(0,i)).doc(path.slice(i+1));
      ref.acquire = async ({holder, ttlMs})=>{
        try{
          return await fbStore.runTransaction(async tx=>{
            const snap = await tx.get(ref);
            const now = Date.now();
            const lease = snap.exists ? snap.data()._lease : null;
            if(lease && lease.expires > now && lease.holder !== holder) return {acquired:false};
            tx.set(ref, {_lease:{holder, expires: now+ttlMs}}, {merge:true});
            return {acquired:true};
          });
        }catch(e){ return {acquired:false}; }
      };
      return ref;
    },
    collection(name){ return fbStore.collection(name); }
  };
}

async function loadCharacter(){
  if(HAS_DB){
    try{
      const snap = await withTimeout(DB.doc('players/'+MY_ID).get(), 5000);
      // Guard against docs left over from the old (pre-merge) game, which
      // used a completely different shape — treat those as "no character"
      // rather than let a v1 field this build doesn't expect crash the UI.
      if(snap.exists && snap.data().resourceBag) return snap.data();
    }catch(e){ /* fall through to local */ }
  }
  try{
    const raw = localStorage.getItem(LS_KEY_PREFIX+'char_'+MY_ID);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
let _lastSaveJson = null;
async function saveCharacter(c){
  c.updatedAt = Date.now();
  const json = JSON.stringify(c);
  if(json === _lastSaveJson) return;
  _lastSaveJson = json;
  try{ localStorage.setItem(LS_KEY_PREFIX+'char_'+MY_ID, json); }catch(e){}
  if(HAS_DB){
    try{ await withTimeout(DB.doc('players/'+MY_ID).set(JSON.parse(json)), 5000); }catch(e){ /* best-effort */ }
  }
}
