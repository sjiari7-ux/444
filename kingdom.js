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
      const selfSnap = await withTimeout(DB.doc('players/'+MY_ID).get(), 6000);
      if(selfSnap.exists){
        const sd = selfSnap.data();
        if(sd.kingdomId !== undefined) c.kingdomId = sd.kingdomId;
        if(sd.kingdomRole !== undefined) c.kingdomRole = sd.kingdomRole;
        if(sd.kingdomCooldownUntil !== undefined) c.kingdomCooldownUntil = sd.kingdomCooldownUntil;
      }
    }catch(e){ /* keep local copy if this fails */ }
    if(c.kingdomId){
      const [kdocSnap, memSnap] = await Promise.all([
        withTimeout(DB.doc('kingdoms/'+c.kingdomId).get(), 6000),
        withTimeout(DB.collection('players').where('kingdomId','==',c.kingdomId).limit(80).get(), 6000),
      ]);
      const kdoc = kdocSnap.exists ? kdocSnap.data() : { treasury:{}, leaderId:null, chat:[] };
      const members = memSnap.docs.map(d=>Object.assign({id:d.id}, d.data()))
        .filter(m=>m.username)
        .sort((a,b)=> kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole) || (b.level||1)-(a.level||1));
      S.kingdomView = { mode:'mine', kingdom: Object.assign({id:c.kingdomId}, kdoc), members };
    } else {
      const snaps = await Promise.all(KINGDOMS.map(k=> withTimeout(DB.doc('kingdoms/'+k.id).get(), 6000).catch(()=>({exists:false}))));
      const counts = await Promise.all(KINGDOMS.map(k=> withTimeout(DB.collection('players').where('kingdomId','==',k.id).limit(500).get(), 6000).then(s=>s.size).catch(()=>0)));
      S.kingdomView = { mode:'browse', kingdoms: KINGDOMS.map((k,i)=>Object.assign({}, k, {
        treasury: (snaps[i] && snaps[i].exists ? snaps[i].data().treasury : {}) || {},
        memberCount: counts[i],
      })) };
    }
  }catch(e){
    S.kingdomView = { error:true };
  }
  render();
}

async function joinKingdom(kingdomId){
  const c = S.char;
  if(!HAS_DB){ showToast('Kingdoms need shared storage, which isn\'t reachable right now.'); return; }
  const cd = (c.kingdomCooldownUntil||0) - Date.now();
  if(cd > 0){ showToast(`You must wait ${fmtMs(cd)} before joining a new kingdom.`); return; }
  if(c.kingdomId){ showToast('Leave your current kingdom first.'); return; }
  try{
    const kRef = DB.doc('kingdoms/'+kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    const isFirstMember = !snap.exists || !snap.data().leaderId;
    const role = isFirstMember ? 'Leader' : 'Recruit';
    if(!snap.exists){
      await withTimeout(kRef.set({ id:kingdomId, treasury:{}, leaderId: isFirstMember?MY_ID:null, chat:[], createdAt:Date.now() }), 6000);
    } else if(isFirstMember){
      await withTimeout(kRef.update({ leaderId: MY_ID }), 6000);
    }
    c.kingdomId = kingdomId; c.kingdomRole = role; c.kingdomJoinedAt = Date.now();
    await saveCharacter(c);
    showToast(`You joined ${KINGDOMS.find(k=>k.id===kingdomId).name} as ${role}.`);
    await loadKingdomView();
  }catch(e){ showToast('Could not join right now — try again.'); }
}

async function leaveKingdom(){
  const c = S.char;
  if(!c.kingdomId) return;
  if(!confirm('Leave your kingdom? You will need to wait 24 hours before joining another.')) return;
  const kingdomId = c.kingdomId;
  try{
    if(HAS_DB && c.kingdomRole==='Leader'){
      const kRef = DB.doc('kingdoms/'+kingdomId);
      try{ await withTimeout(kRef.update({leaderId:null}), 6000); }catch(e){}
    }
  }catch(e){}
  c.kingdomId = null; c.kingdomRole = null; c.kingdomJoinedAt = 0;
  c.kingdomCooldownUntil = Date.now() + KINGDOM_JOIN_COOLDOWN_MS;
  await saveCharacter(c);
  S.kingdomView = null;
  showToast('You have left the kingdom.');
  await loadKingdomView();
}

async function claimLeadership(){
  const c = S.char;
  if(!HAS_DB || !c.kingdomId) return;
  if(kingdomRank(c.kingdomRole) < 2){ showToast('Only Officers and above may claim leadership.'); return; }
  try{
    const kRef = DB.doc('kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    if(snap.exists && snap.data().leaderId){ showToast('This kingdom already has a Leader.'); await loadKingdomView(); return; }
    await withTimeout(kRef.update({leaderId: MY_ID}), 6000);
    c.kingdomRole = 'Leader';
    await saveCharacter(c);
    showToast('You are now the Leader.');
    await loadKingdomView();
  }catch(e){ showToast('Could not claim leadership right now.'); }
}

async function donateToKingdom(resource, amount){
  const c = S.char;
  if(!HAS_DB || !c.kingdomId) return;
  amount = Math.floor(amount);
  if(!amount || amount<=0) return;
  const have = resource==='gold' ? c.gold : (c.resourceBag[resource]||0);
  if(have < amount){ showToast('Not enough to donate.'); return; }
  try{
    const kRef = DB.doc('kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    const treasury = (snap.exists && snap.data().treasury) || {};
    const newVal = (treasury[resource]||0) + amount;
    await withTimeout(kRef.update({treasury: {[resource]: newVal}}), 6000);
    if(resource==='gold') c.gold -= amount; else c.resourceBag[resource] -= amount;
    await saveCharacter(c);
    showToast(`Donated ${amount} ${resource==='gold'?'Gold':RESOURCE_NAMES[resource]||resource}.`);
    await loadKingdomView();
  }catch(e){ showToast('Donation failed — try again.'); }
}

async function sendKingdomChat(text){
  const c = S.char;
  text = (text||'').trim().slice(0,200);
  if(!text || !HAS_DB || !c.kingdomId) return;
  try{
    const kRef = DB.doc('kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    const chat = (snap.exists && Array.isArray(snap.data().chat)) ? snap.data().chat.slice() : [];
    chat.push({senderId:MY_ID, senderName:c.username, text, ts:Date.now()});
    while(chat.length > KINGDOM_CHAT_MAX) chat.shift();
    await withTimeout(kRef.update({chat}), 6000);
    await loadKingdomView();
  }catch(e){ showToast('Message failed to send.'); }
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
      await withTimeout(DB.doc('players/'+targetId).update({kingdomId:null, kingdomRole:null, kingdomCooldownUntil: Date.now()+KINGDOM_JOIN_COOLDOWN_MS}), 6000);
      showToast(`${target.username} was removed from the kingdom.`);
    } else if((action==='promote'||action==='demote') && myRank >= 3){
      const newRank = clamp(targetRank + (action==='promote'?1:-1), 0, myRank-1);
      await withTimeout(DB.doc('players/'+targetId).update({kingdomRole: KINGDOM_ROLES[newRank]}), 6000);
      showToast(`${target.username} is now ${KINGDOM_ROLES[newRank]}.`);
    } else {
      showToast('You do not have permission to do that.'); return;
    }
    await loadKingdomView();
  }catch(e){ showToast('Action failed — try again.'); }
}

