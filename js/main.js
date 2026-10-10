"use strict";

/* ============================================================
   EVENT HANDLING
   ============================================================ */
function bindCreateEvents(){
  const input = document.getElementById('username-input');
  if(input){
    input.addEventListener('input', e=>{ S._create.username = e.target.value; });
  }
  const search = document.getElementById('country-search');
  if(search){
    search.addEventListener('input', e=>{
      S._create.countrySearch = e.target.value;
      document.getElementById('country-grid').innerHTML = renderCountryCards(S._create); // grid only, so the search box keeps focus
    });
  }
}

document.addEventListener('mouseover', e=>{ const a=e.target.closest('.sb-xp'); if(a && !document.getElementById('xp-card')) showXpCard(a); });
document.addEventListener('mouseout', e=>{ if(e.target.closest('.sb-xp') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.sb-xp'))) hideXpCard(); });
document.addEventListener('click', e=>{ if(!e.target.closest('.sb-xp')) hideXpCard(); });
/* One server-calling action at a time: a fast double-tap on Take a Step / Explore / Craft / Sign in used to send two requests
   (two Energy charges, two fights). The lock is released when the action finishes, or after 15s at the latest. */
const GUARDED_ACTIONS = new Set(['take-step','enter-zone','enter-zone-elite','enter-zone-boss','zone-road','craft','google-signin','create-character','claim-daily']);
let _actionLock = 0;
document.addEventListener('click', (e)=>{
  const el = e.target.closest('[data-action]');
  if(el && GUARDED_ACTIONS.has(el.dataset.action)){
    if(_actionLock && Date.now() - _actionLock < 15000) return;
    _actionLock = Date.now();
    Promise.resolve(onActionClick(e)).catch(err=>console.error('action failed', err)).finally(()=>{ _actionLock = 0; });
    return;
  }
  onActionClick(e);
});
async function onActionClick(e){
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const action = el.dataset.action;

  if(action==='xp-card'){ showXpCard(el); return; }
  if(action==='dlg-ok'){ closeDialog(true); return; }
  if(action==='dlg-cancel'){ closeDialog(false); return; }
  if(action==='dlg-backdrop'){ if(e.target===el) closeDialog(false); return; }

  if(action==='pick-class'){ S._create.classId = el.dataset.class; render(); return; }
  if(action==='pick-country'){ S._create.countryId = el.dataset.country; render(); return; }
  if(action==='create-character'){
    const st = S._create;
    const uname = (st.username||'').replace(/[<>&"'`\\]/g,'').trim().slice(0,18);
    if(!st.classId || !st.countryId) return;
    if(uname.length < 3){ showToast('Username must be at least 3 characters.'); return; }
    if(await isUsernameTaken(uname)){ showToast('That username is already taken — pick another.'); return; }
    const ch = newCharacter(MY_ID, uname, st.classId);
    try{
      ch.kingdomRole = await claimKingdomSeat(st.countryId);
    }catch(e){ showToast('Could not join your country right now — try again.'); return; }
    ch.kingdomId = st.countryId; ch.kingdomJoinedAt = Date.now();
    S.char = ch; // no onboarding step — player lands straight on Home
    setScreen('world');
    // Awaited (unlike other saveCharacter calls) because this is the doc that
    // makes the character exist at all — if the cloud write fails here and
    // nobody notices, the player only has this character on THIS device/
    // browser until something else happens to trigger a retry, and re-opening
    // the game anywhere else drops them back into character creation.
    saveCharacter(S.char).then(cloudOk=>{
      if(HAS_DB && !cloudOk) showToast('Saved on this device, but the cloud save failed — reopening on another device may ask you to create a character again. Will keep retrying.');
    });
    return;
  }
  if(action==='google-signin'){ await linkGoogleAccount(); return; }
  if(action==='md-toggle'){
    S.navOpen = !S.navOpen;
    const d=document.getElementById('mdrawer'); if(d) d.classList.toggle('open', S.navOpen);
    return;
  }
  if(action==='nav'){
    S.navOpen = false;
    setScreen(el.dataset.screen);
    S.pvpCandidates = null;
    if(el.dataset.screen==='kingdom'){ loadKingdomView(); loadCountryState(true); }
    if(el.dataset.screen==='market'){ loadMarketListings(); checkMarketSales(); }
    if(el.dataset.screen==='pvp'){ checkPvpResults(); }
    if(el.dataset.screen==='world'){ loadWorldWars(true); }
    if(el.dataset.screen==='map'){ loadWorldWars(true); }
    if(el.dataset.screen==='rankings'){ loadRankingsView(); }
    return;
  }

  if(action==='world-war'){ S.worldWarsSelected=el.dataset.id; setScreen('war-detail'); return; }
  if(action==='open-war-room'){ S.kingdomTab='war'; setScreen('kingdom'); loadKingdomView(); loadCountryState(); return; }
  if(action==='view-country'){
    const id=el.dataset.id;
    if(S.char && id===S.char.kingdomId){ S.kingdomTab='overview'; setScreen('kingdom'); return; }
    if(!['country-view','player-view'].includes(S.screen)) S.backScreen=S.screen;
    S.backCountry=false; S.viewCountryId=id; S.viewCountryTab='home'; S.chatWidgetOpen=false;
    setScreen('country-view'); loadCountryProfile(id); loadWorldWars(); return;
  }
  if(action==='view-player'){
    const id=el.dataset.id;
    if(!id) return;
    if(id===MY_ID){ setScreen('profile'); return; }
    if(!['country-view','player-view'].includes(S.screen)) S.backScreen=S.screen;
    S.backCountry = (S.screen==='country-view'); S.viewPlayerId=id; S.chatWidgetOpen=false;
    setScreen('player-view'); loadPlayerProfile(id); return;
  }
  if(action==='view-ctab'){ S.viewCountryTab=el.dataset.tab; render(); return; }
  if(action==='view-back'){
    if(S.screen==='player-view' && S.viewCountry && S.viewCountryId && S.backCountry){ S.backCountry=false; setScreen('country-view'); return; }
    setScreen(S.backScreen||'world'); return;
  }
  if(action==='rank-tab'){ S.rankTab=el.dataset.tab; S.rankSort=null; render(); return; }
  if(action==='rank-sort'){ S.rankSort=el.dataset.sort; render(); return; }
  if(action==='battle-tab'){ S.battleTab=el.dataset.tab; render(); return; }
  if(action==='battle-filter'){ S.battleFilter=el.dataset.f; render(); return; }
  if(action==='view-zone'){ S.zoneDetailId = el.dataset.zone; setScreen('zone-detail'); return; }
  if(action==='enter-zone'){ await startAdventureServer(el.dataset.zone, null, {returnScreen:'zone-detail'}); return; }
  if(action==='enter-zone-elite'){ await startAdventureServer(el.dataset.zone, 'elite', {returnScreen:'zone-detail'}); return; }
  if(action==='enter-zone-boss'){ await startAdventureServer(el.dataset.zone, 'boss', {returnScreen:'zone-detail'}); return; }
  if(action==='zone-road'){
    S.road = { zoneId: el.dataset.zone, log:[{text:'You set off down the road.', cls:'', k:'start'}], gained:{xp:0, gold:0, resources:{}}, steps:0, trail:[] };
    setScreen('road');
    return;
  }
  if(action==='take-step'){ await takeStep(); return; }
  if(action==='road-leave'){ S.road = null; setScreen(S.zoneDetailId ? 'zone-detail' : 'adventure'); return; }
  if(action==='find-opponents'){
    showToast('Searching for an opponent...');
    S.pvpCandidates = await findOpponents(S.char);
    render();
    return;
  }
  if(action==='fight-opponent'){ await startPvp(S.pvpCandidates[Number(el.dataset.idx)]); return; }

  if(action==='join-kingdom'){ await joinKingdom(el.dataset.kingdom); return; }
  if(action==='citizen-pick'){ S.citizenPick = !S.citizenPick; render(); return; }
  if(action==='citizen-request'){ await requestCitizenship(el.dataset.kingdom); return; }
  if(action==='citizen-cancel'){ await cancelCitizenshipRequest(); return; }
  if(action==='citizen-decide'){ await decideCitizenshipRequest(el.dataset.id, el.dataset.op); return; }
  if(action==='claim-leadership'){ await claimLeadership(); return; }
  if(action==='donate-kingdom'){ await donateToKingdom(el.dataset.resource, Number(el.dataset.amount)); return; }
  if(action==='kingdom-member'){ await kingdomManageMember(el.dataset.id, el.dataset.op); return; }
  if(action==='make-leader'){
    if(!(await askConfirm({title:'Transfer Leadership', facts:[['New leader', el.dataset.name||'this citizen']], body:'You will become Co-Leader.', confirmLabel:'Transfer', cancelLabel:'Cancel', danger:true}))) return;
    try{
      await callFn('transferLeadership', {targetId: el.dataset.id});
      const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; }
      showToast('Leadership transferred.');
    }catch(e){ showToast(warErrorMsg(e)); }
    loadKingdomView(); return;
  }
  if(action==='claim-daily'){
    try{
      const r = await callFn('claimDailyReward', {});
      const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; }
      showToast(`Daily reward: +${r.gold} gold, +${r.energy} energy (day ${r.streak}/${r.maxStreak}).`);
    }catch(e){ showToast(warErrorMsg(e)); }
    render(); return;
  }
  if(action==='chat-widget-toggle'){
    S.chatWidgetOpen = !S.chatWidgetOpen;
    if(S.chatWidgetOpen){
      if(S.chatPop && S.chatPop.channel==='country') S.chatChannel = 'country';
      else if(!S.chatUnread && S.chatUnreadK) S.chatChannel = 'country';
      S.chatPop = null; S.chatMembersOpen = false;
      if(chatChannelNow()==='country') S.chatUnreadK = 0; else S.chatUnread = 0;
    }
    if(S.chatWidgetOpen && S.generalChat===null) loadGeneralChat();
    render();
    return;
  }
  if(action==='chat-widget-send'){
    const input = document.getElementById('world-chat-input');
    const v = input ? input.value : ''; if(input) input.value='';
    await sendChatCurrent(v);
    return;
  }
  if(action==='chat-channel'){
    S.chatChannel = el.dataset.ch==='country' ? 'country' : 'global'; S.chatMembersOpen = false;
    if(S.chatChannel==='country') S.chatUnreadK = 0; else S.chatUnread = 0;
    render(); return;
  }
  if(action==='chat-members-toggle'){ S.chatMembersOpen = !S.chatMembersOpen; render(); return; }

  if(action==='kingdom-tab'){
    S.kingdomTab = el.dataset.tab;
    if(S.kingdomTab==='economy' || S.kingdomTab==='war'){ loadCountryState(); return; }
    if(S.kingdomTab==='overview'){ loadCountryState(true); }
    if(S.kingdomTab==='overview' || S.kingdomTab==='citizens'){ refreshCitizenshipRequests(); }
    render(); return;
  }
  if(action==='country-refresh'){ await loadCountryState(); return; }
  if(action==='spec-pick'){
    const r = el.dataset.resource, st = S.countryState && S.countryState.data;
    const cur = (S._specPick || (st && st.naturalResources) || []).slice();
    const i = cur.indexOf(r);
    if(i >= 0) cur.splice(i,1); else { cur.push(r); if(cur.length > 2) cur.shift(); }
    S._specPick = cur; render(); return;
  }
  if(action==='spec-confirm'){
    if(!S._specPick || S._specPick.length !== 2) return;
    try{
      await callFn('setCountrySpecialities', {resources: S._specPick});
      showToast('Country specialities updated.');
    }catch(e){ showToast(warErrorMsg(e)); }
    S._specPick = null;
    await loadCountryState(true); return;
  }
  if(action==='declare-war' || action==='map-declare-war'){
    const fromMap = action==='map-declare-war';
    const target = fromMap ? el.dataset.region : S._warTarget;     // a REGION id: the server derives the defender from the region's current owner
    if(!target){ showToast('Choose a region first.'); return; }
    const ownerId = fromMap ? el.dataset.owner : S._warCountry;
    const rg = fromMap ? {name: el.dataset.regionName} : (((S.mapRegions && S.mapRegions[ownerId] && S.mapRegions[ownerId].data) || {regions:[]}).regions.find(g=>g.id===target) || {});
    if(!(await askConfirm({title:'Declare War', facts:[['Target country', countryName(ownerId)],['Region', rg.name||'this region']],
      body:'The war is fought for control of this region. Its defender is the country that owns it right now. If you win, the region becomes yours.',
      confirmLabel:'Declare War', cancelLabel:'Cancel', danger:true}))) return;
    try{
      await callFn('declareWar', {targetRegionId: target});
      S.mapRegions = {}; S._warTarget = '';      // ownership / reservations changed: reload the region lists
      showToast('War declared over '+(rg.name||'the region')+'.');
      if(fromMap){ try{ await loadWorldWars(true); }catch(_){} if(typeof WorldMap!=='undefined') WorldMap.update(); }
    }catch(e){ showToast(warErrorMsg(e)); }
    await loadCountryState(true); return;
  }
  if(action==='war-round'){ S.warRoundSel = {id: el.dataset.id, n: Number(el.dataset.n)}; render(); return; }
  if(action==='war-pick-region'){ S._warTarget = el.dataset.region; render(); return; }
  if(action==='war-strike'){
    try{
      const wid = el.dataset.war, sd = el.dataset.side;   // open war: the page buttons name the war + side; the War Room button sends nothing
      const r = await callFn('warStrike', sd ? {warId: wid, side: sd} : undefined);
      S.char.energyCur = r.energyCur; S.char.lastEnergyAt = r.lastEnergyAt;
      if(wid && S.warFighters) delete S.warFighters[wid];   // refresh the top-fighter lists
      showToast(`You hit ${r.target.name} (Lv.${r.target.level}) for ${fmtNum(r.damage)} war damage.`);
    }catch(e){ showToast(warErrorMsg(e)); }
    await loadCountryState(true);
    if(S.screen==='war-detail'){ try{ await loadWorldWars(true); }catch(_){} }   // refresh the score shown on the war page
    return;
  }
  if(action==='market-tab'){ S.marketTab = el.dataset.tab; render(); return; }
  if(action==='profile-tab'){ S.profileTab = el.dataset.tab; render(); return; }
  if(action==='market-filter'){ S.marketFilter = el.dataset.filter; render(); return; }
  if(action==='market-sell-kind'){ S.marketSellKind = el.dataset.kind; S.marketSellItem = null; render(); return; }
  if(action==='market-pick'){ // no re-render, so the quantity / price you already typed stay put
    S.marketSellItem = el.dataset.id;
    const hid = document.getElementById('market-sell-item'); if(hid) hid.value = el.dataset.id;
    document.querySelectorAll('.mk-pick').forEach(b=>b.classList.toggle('on', b===el));
    return;
  }
  if(action==='market-create-listing'){
    const itemSel = document.getElementById('market-sell-item');
    const qtyInput = document.getElementById('market-sell-qty');
    const priceInput = document.getElementById('market-sell-price');
    if(!itemSel || !itemSel.value){ showToast('Nothing to list.'); return; }
    const qty = qtyInput ? parseInt(qtyInput.value,10) : 1;
    const price = priceInput ? parseInt(priceInput.value,10) : 0;
    await createListing(S.marketSellKind, itemSel.value, qty, price);
    return;
  }
  if(action==='buy-listing'){ await buyListing(el.dataset.id); return; }
  if(action==='cancel-listing'){ await cancelListing(el.dataset.id); return; }

  if(action==='combat-attack'){ await (isServerCombat()?resolveCombatRoundServer({kind:'attack'}):resolveRound({kind:'attack'})); return; }
  if(action==='combat-defend'){ await (isServerCombat()?resolveCombatRoundServer({kind:'defend'}):resolveRound({kind:'defend'})); return; }
  if(action==='combat-flee'){ await (isServerCombat()?resolveCombatRoundServer({kind:'flee'}):resolveFlee()); return; }
  if(action==='combat-skill'){
    if(!S.combat) return;
    const s = S.combat.me.skills.find(x=>x.id===el.dataset.skill);
    if(isServerCombat()) await resolveCombatRoundServer({kind:'skill', skillId:s.id});
    else await resolveRound({kind:'skill', skill:s, skillLevel:S.char.classSkills[s.id]||0});
    return;
  }
  if(action==='combat-item-menu'){ S.showItemMenu = !S.showItemMenu; render(); return; }
  if(action==='combat-item'){
    if(isServerCombat()){
      // The server owns the item — it validates ownership, consumes it, and applies
      // its effect (heal or Energy) atomically as part of resolving this round. The
      // client no longer mutates S.char.inventory/energyCur for this directly.
      S.showItemMenu = false;
      await resolveCombatRoundServer({kind:'item', itemUid: el.dataset.uid});
      return;
    }
    const it = S.char.inventory.find(x=>x.uid===el.dataset.uid);
    if(it){
      // Energy isn't part of the in-combat "fighter" model (only HP/class-resource are),
      // so an Energy Potion's effect is applied straight to the character here, capped at
      // Max Energy and without touching lastEnergyAt (so offline regen math stays correct).
      if(it.effect && it.effect.energy){
        const eff = effectiveStats(S.char);
        S.char.energyCur = clamp(S.char.energyCur + it.effect.energy, 0, eff.maxEnergy);
      }
      // Consume exactly one use of the item so potions can't be reused for free.
      it.qty = (it.qty||1) - 1;
      if(it.qty <= 0) S.char.inventory = S.char.inventory.filter(x=>x.uid!==it.uid);
      await resolveRound({kind:'item', item:it});
      S.showItemMenu=false;
    }
    return;
  }
  if(action==='close-combat'){ await finishCombat(); return; }

  if(action==='equip'){ equipItem(el.dataset.uid); await persist(); return; }
  if(action==='inv-slot'){ S.invSlot = (S.invSlot===el.dataset.slot) ? null : el.dataset.slot; render(); return; }
  if(action==='unequip'){ S.invSlot=null; unequipSlot(el.dataset.slot); await persist(); return; }
  if(action==='upgrade-item'){ upgradeItem(el.dataset.uid); await persist(); return; }
  if(action==='sell'){ sellItem(el.dataset.uid); await persist(); return; }
  if(action==='use-item'){ useItemOutOfCombat(el.dataset.uid); await persist(); return; }
  if(action==='craft-tab'){ S.craftTab = el.dataset.tab==='forge' ? 'forge' : 'craft'; render(); return; }
  if(action==='forge-slot'){ S.forgeSlot = el.dataset.slot; render(); return; }
  if(action==='forge'){ await forgeItem(el.dataset.slot, el.dataset.tier); await persist(); return; }
  if(action==='craft'){ await craftRecipe(el.dataset.recipe, (S.craftQty&&S.craftQty[el.dataset.recipe])||1); await persist(); return; }
  if(action==='craft-qty-inc'){
    S.craftQty = S.craftQty || {};
    const r = RECIPES.find(x=>x.id===el.dataset.recipe);
    const max = Math.max(1, maxCraftable(S.char, r));
    S.craftQty[el.dataset.recipe] = clamp((S.craftQty[el.dataset.recipe]||1)+1, 1, max);
    render(); return;
  }
  if(action==='craft-qty-dec'){
    S.craftQty = S.craftQty || {};
    S.craftQty[el.dataset.recipe] = clamp((S.craftQty[el.dataset.recipe]||1)-1, 1, 999);
    render(); return;
  }

  if(action==='buy-general'){ buyGeneralSkill(el.dataset.skill); await persist(); return; }
  if(action==='buy-class-skill'){ buyClassSkill(el.dataset.skill); await persist(); return; }
  if(action==='reset-skills'){ resetClassSkills(); await persist(); return; }
  if(action==='set-color-scheme'){
    S.char.colorScheme = el.dataset.color;
    await persist();
    return;
  }
  if(action==='update-username'){
    const uname = (S._settingsUsername||'').replace(/[<>&"'`\\]/g,'').trim().slice(0,18);
    if(uname.length < 3){ showToast('Username must be at least 3 characters.'); return; }
    if(uname === S.char.username){ showToast('That\'s already your username.'); return; }
    if(await isUsernameTaken(uname)){ showToast('That username is already taken — pick another.'); return; }
    S.char.username = uname;
    S._settingsUsername = uname;
    showToast('Username updated.');
    await persist();
    return;
  }
  if(action==='reset-character'){
    if(await askConfirm({title:'Delete Character', body:'This permanently deletes your character. This cannot be undone.', confirmLabel:'Delete', cancelLabel:'Cancel', danger:true})){
      try{ localStorage.removeItem(LS_KEY_PREFIX+'char_'+MY_ID); }catch(err){}
      if(HAS_DB){ try{ await withTimeout(DB.doc('players/'+MY_ID).delete(), 5000); }catch(err){} }
      S.char = null; S._create=null; S._settingsUsername=null;
      setScreen('create');
    }
    return;
  }
}

function notEnoughEnergyMsg(c, eff, required){
  return `Not enough Energy. ${required} required, ${Math.floor(c.energyCur)} available (+${energyRegenPerHour(eff.maxEnergy)}/hour).`;
}

/* ---------------- Adventure / PvE flow ---------------- */
async function startPve(zoneId, kind, opts){
  opts = opts || {};
  const c = S.char;
  const eff = effectiveStats(c);
  applyRegen(c);
  const zone = ZONES.find(z=>z.id===zoneId);
  const isBoss = kind==='boss', isElite = kind==='elite';
  const energyCost = opts.skipEnergyCost ? 0 : (isBoss ? BOSS_ENERGY_COST : isElite ? 20 : 10);
  if(c.energyCur < energyCost){ showToast(notEnoughEnergyMsg(c, eff, energyCost)); render(); return; }
  if(isBoss){
    const cd = (c.bossCooldowns[zoneId]||0) - Date.now();
    if(cd > 0){ showToast(`${zone.boss} is still recovering. Try again in ${fmtMs(cd)}.`); render(); return; }
  }
  c.energyCur = clamp(c.energyCur-energyCost, 0, eff.maxEnergy);
  const topLevel = zone.uncapped ? zone.min+80 : zone.max;
  const monsterLevel = isBoss ? clamp(c.level, zone.min, topLevel) : clamp(c.level + rndInt(-2,2) + (isElite?3:0), zone.min, topLevel);
  const monster = isBoss ? buildMonster(zone, monsterLevel, zone.boss, 'boss') : buildMonster(zone, monsterLevel, pick(zone.monsters), isElite?'elite':null);
  const me = buildCombatant(c, true);
  if(isBoss) c.bossCooldowns[zoneId] = Date.now() + BOSS_COOLDOWN_MS;
  S.combat = { mode:'pve', zone, elite:isElite, boss:isBoss, me, foe: monster, round:1, maxRounds:PVE_MAX_ROUNDS, log:[{text: isBoss ? `${monster.label} rises to meet you!` : `A ${monster.label} (Lv.${monster.level}) blocks your path!`, cls:''}], ended:false, result:null, rewardLines:[], returnScreen: opts.returnScreen || 'adventure' };
  setScreen('combat');
}

function isServerCombat(){ return !!(S.combat && S.combat.serverMode); }

// Server-authoritative entry point for the Adventure screen's Explore / Elite Hunt /
// Zone Boss buttons. Energy validation, monster spawning and (once the fight ends)
// all rewards are computed by the startAdventure/resolveCombatRound Cloud Functions —
// this function only displays what the server returns. Road's own monster encounters
// still use the local startPve() above; that path isn't migrated yet.
async function startAdventureServer(zoneId, kind, opts){
  opts = opts || {};
  let res;
  try{
    res = await callFn('startAdventure', {zoneId, kind});
  }catch(e){
    if(e.message==='NOT_ENOUGH_ENERGY'){
      showToast(`Not enough Energy.\nRequired: ${e.details.required}\nAvailable: ${e.details.available}\nRegeneration: +${e.details.perHour} Max Energy/hour`);
    } else if(e.message==='COOLDOWN_ACTIVE'){
      showToast(`Still recovering. Try again in ${fmtMs(e.details.msRemaining)}.`);
    } else {
      showToast('Could not start the fight — please try again.');
    }
    render();
    return;
  }
  S.char.energyCur = res.energyCur;
  S.char.lastEnergyAt = res.lastEnergyAt;
  const zone = ZONES.find(z=>z.id===zoneId);
  S.combat = {
    serverMode: true, sessionId: res.sessionId,
    mode:'pve', zone, elite: kind==='elite', boss: kind==='boss',
    me: res.me, foe: res.foe, round: res.round, maxRounds: res.maxRounds,
    log: res.log, ended:false, result:null, rewardLines:[],
    returnScreen: opts.returnScreen || 'adventure',
  };
  setScreen('combat');
}

// Sends the player's chosen action for the current server-authoritative round and
// renders whatever the server returns. When the fight ends, the local character is
// re-fetched from Firestore rather than trusting any locally-predicted state (spec
// requirement: the client must display authoritative results, not local guesses).
async function resolveCombatRoundServer(action){
  const cb = S.combat;
  if(!cb || cb.ended) return;
  let res;
  try{
    res = await callFn('resolveCombatRound', {sessionId: cb.sessionId, action});
  }catch(e){
    showToast(e.message==='NOT_ENOUGH_RESOURCE' ? 'Not enough resource for that skill.' : 'That action failed — please try again.');
    return;
  }
  cb.log.push(...res.logs);
  cb.me = res.me; cb.foe = res.foe;
  if(res.round) cb.round = res.round;
  if(res.ended){
    cb.ended = true; cb.result = res.result; cb.rewardLines = res.rewardLines;
    const fresh = await loadCharacter();
    if(fresh){ migrateCharacter(fresh); S.char = fresh; }
  }
  render();
  const logEl = document.getElementById('combat-log');
  if(logEl) logEl.scrollTop = 0;
}

function pickStepEvent(){
  const total = STEP_EVENT_WEIGHTS.reduce((a,x)=>a+x.w,0);
  let r = rnd(0,total);
  for(const x of STEP_EVENT_WEIGHTS){ if(r<x.w) return x.t; r-=x.w; }
  return 'flavor';
}
async function takeStep(){
  const c = S.char, road = S.road;
  if(!road) return;
  // The step (energy, event roll, rewards, country tax on resources) is resolved by the
  // takeRoadStep Cloud Function; this function only displays what the server returns.
  let res;
  try{
    res = await callFn('takeRoadStep', {zoneId: road.zoneId});
  }catch(e){
    if(e.message==='NOT_ENOUGH_ENERGY') showToast(`Not enough Energy. ${e.details.required} required, ${e.details.available} available (+${e.details.perHour}/hour).`);
    else showToast('Could not take that step — please try again.');
    render(); return;
  }
  c.energyCur = res.energyCur; c.lastEnergyAt = res.lastEnergyAt;
  const ev = res.event;
  road.steps = (road.steps||0) + 1; (road.trail = road.trail||[]).push(ev);
  if(ev==='flavor'){
    road.log.push({text: pick(FLAVOR_TEXTS), cls:'', k:'flavor'});
  } else if(ev==='gold'){
    c.gold += res.gold; road.gained.gold += res.gold;
    road.log.push({text:`You spot a few coins in the dirt.`, cls:'good', k:'gold', amt:`+${res.gold} Gold`});
  } else if(ev==='resource'){
    const r = res.resource;
    c.resourceBag[r] = r3((c.resourceBag[r]||0) + res.amount);
    road.gained.resources[r] = r3((road.gained.resources[r]||0) + res.amount);
    const taxed = res.gross - res.amount;
    road.log.push({text:`You gather ${res.amount} ${RESOURCE_NAMES[r]} along the way.${taxed>0 ? ` (${taxed} went to your country as tax)` : ''}`, cls:'good', k:'resource', rk:r, amt:`+${res.amount} ${RESOURCE_NAMES[r]}`});
  } else if(ev==='xp'){
    road.gained.xp += res.xp;
    road.log.push({text:`Something about the walk teaches you a little.`, cls:'good', k:'xp', amt:`+${res.xp} XP`});
    (res.levelLines||[]).forEach(l=> road.log.push({text:l, cls:'good'}));
    const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; }
  } else if(ev==='item'){
    road.log.push({text: res.item ? `You find a discarded ${res.item.name} by the roadside.` : 'You spot something shiny, but your bag is full.', cls: res.item ? 'good' : '', k:'item', amt: res.item ? 'Item' : 'Bag full'});
    if(res.item){ const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; } }
  } else if(ev==='monster'){
    road.log.push({text:'Something rustles in the brush ahead...', cls:'hit', k:'monster', amt:'Fight'});
    const zone = ZONES.find(z=>z.id===road.zoneId), mo = res.monster;
    S.combat = {
      serverMode: true, sessionId: mo.sessionId, mode:'pve', zone, elite:false, boss:false,
      me: mo.me, foe: mo.foe, round: mo.round, maxRounds: mo.maxRounds,
      log: mo.log, ended:false, result:null, rewardLines:[], returnScreen:'road',
    };
    setScreen('combat');
    return;
  }
  render(); // no local save: the server already persisted this step
}

async function startPvp(opponentData){
  const c = S.char;
  const eff = effectiveStats(c);
  applyRegen(c);
  if(c.energyCur < PVP_ENERGY_COST){ showToast(notEnoughEnergyMsg(c, eff, PVP_ENERGY_COST)); render(); return; }
  c.energyCur = clamp(c.energyCur-PVP_ENERGY_COST, 0, eff.maxEnergy);
  const me = buildCombatant(c, true);
  const foe = buildCombatant(opponentData, false, opponentData.username);
  foe.hp = foe.maxHp;
  S.combat = { mode:'pvp', me, foe, opponentData, round:1, maxRounds:PVP_MAX_ROUNDS, log:[{text:`You enter the Arena against ${esc(opponentData.username)}!`, cls:''}], ended:false, result:null, rewardLines:[], returnScreen:'pvp' };
  setScreen('combat');
}

function addLog(lines){ S.combat.log.push(...lines); }

async function resolveRound(playerAction){
  const cb = S.combat;
  if(!cb || cb.ended) return;
  const me = cb.me, foe = cb.foe;
  // determine order by speed
  const meFirst = liveStat(me,'spd') >= liveStat(foe,'spd');
  const order = meFirst ? [ {who:me, other:foe, act:playerAction, isMe:true}, {who:foe, other:me, act:null, isMe:false} ]
                        : [ {who:foe, other:me, act:null, isMe:false}, {who:me, other:foe, act:playerAction, isMe:true} ];
  for(const turn of order){
    if(me.hp<=0 || foe.hp<=0) break;
    let act = turn.act;
    if(!act){ act = chooseAiAction(turn.who, turn.other); }
    const skillLevel = (act.skill && turn.who.skillLevels) ? (turn.who.skillLevels[act.skill.id]||0) : 0;
    const lines = performAction(turn.who, turn.other, act, skillLevel);
    addLog(lines);
  }
  tickBuffs(me); tickBuffs(foe);
  cb.round += 1;
  if(foe.hp<=0){ await endCombat('win'); return; }
  if(me.hp<=0){ await endCombat('lose'); return; }
  if(cb.round > cb.maxRounds){ await endCombat(me.hp>=foe.hp ? (cb.mode==='pvp'?'win':'flee') : (cb.mode==='pvp'?'lose':'flee')); return; }
  render();
  const logEl = document.getElementById('combat-log');
  if(logEl) logEl.scrollTop = 0;
}

async function resolveFlee(){
  const cb = S.combat;
  if(!cb || cb.ended) return;
  const chance = clamp(50 + (liveStat(cb.me,'spd')-liveStat(cb.foe,'spd'))*2, 15, 90);
  const success = Math.random()*100 < chance;
  addLog([{text: success ? 'You escape the fight.' : 'You failed to escape!', cls: success?'good':'hit'}]);
  if(success){ await endCombat('flee'); }
  else {
    // failed flee costs a round, enemy attacks
    const fleeAct = chooseAiAction(cb.foe, cb.me);
    const fleeSkillLevel = (fleeAct.skill && cb.foe.skillLevels) ? (cb.foe.skillLevels[fleeAct.skill.id]||0) : 0;
    const lines = performAction(cb.foe, cb.me, fleeAct, fleeSkillLevel);
    addLog(lines);
    cb.round += 1;
    if(cb.me.hp<=0){ await endCombat('lose'); return; }
    render();
  }
}

async function endCombat(result){
  const cb = S.combat, c = S.char;
  cb.ended = true; cb.result = result;
  const eff = effectiveStats(c);
  c.hpCur = clamp(cb.me.hp, cb.me.hp<=0?1:0, eff.maxHp) || Math.max(1, Math.round(eff.maxHp*0.2));
  if(c.class==='mage') c.manaCur = clamp(cb.me.resource, 0, eff.maxMana);
  else c.resourceCur = 0;

  if(cb.mode==='pve'){
    if(result==='win'){
      const rewardMult = cb.boss ? 3.2 : cb.elite ? 1.9 : 1;
      const xpGain = Math.round(rnd(8,14) * cb.foe.level * rewardMult);
      const goldGain = Math.round(rnd(6,12) * cb.foe.level * rewardMult);
      c.xp += xpGain; c.gold += goldGain;
      const resList = cb.zone.resources;
      const resGain = {}; resList.forEach(r=>{ resGain[r] = Math.round(rndInt(2,6)*rewardMult); c.resourceBag[r] = (c.resourceBag[r]||0) + resGain[r]; });
      cb.rewardLines = [ {label:statIcon('xp',14)+' XP gained', value:'+'+xpGain}, {label:resourceIcon('gold',14)+' Gold gained', value:'+'+goldGain}, {label:'Resources', value: resList.map(r=>`+${resGain[r]} ${RESOURCE_NAMES[r]}`).join(', ')} ];
      await checkLevelUps(c, cb.rewardLines);
    } else if(result==='lose'){
      cb.rewardLines = [ {label:'Result', value:'Defeated &mdash; no rewards.'} ];
      c.hpCur = Math.max(1, Math.round(eff.maxHp*0.15));
    } else {
      cb.rewardLines = [ {label:'Result', value:'You retreated safely.'} ];
    }
  } else {
    // PvP
    const opp = cb.opponentData, isBot = !!opp.isBot;
    const myRating = c.pvp.rating;
    const oppRating = opp.pvp ? opp.pvp.rating : 1000;
    // Practice bots never move the ladder: no rating, no win/loss record, no protection shield.
    const chg = isBot ? { delta:0, newRating:myRating } : pvpRatingChange(myRating, oppRating, result);
    const leagueBefore = leagueOf(myRating), leagueAfter = leagueOf(chg.newRating);
    c.pvp.rating = chg.newRating;
    if(!isBot){
      if(result==='win') c.pvp.wins++;
      if(result==='lose'){ c.pvp.losses++; c.pvp.protectedUntil = Date.now() + PVP_PROTECTION_MS; }
    }
    let xpGain = 0, goldChange = 0;
    if(result==='win'){
      const mult = isBot ? PVP_BOT_REWARD_MULT : 1;
      xpGain = Math.round(rnd(10,18)*opp.level*mult); goldChange = Math.round(rnd(8,16)*opp.level*mult);
      c.xp += xpGain; c.gold += goldChange;
    }
    cb.rewardLines = [
      {label:'Result', value: result==='win'?'Victory':result==='lose'?'Defeat':'Draw'},
      {label:'Rating change', value: isBot ? 'Practice bot — no rating' : (chg.delta>=0?'+':'')+chg.delta+' &rarr; '+Math.round(chg.newRating)},
      {label:statIcon('xp',14)+' XP gained', value:'+'+xpGain},
      {label:resourceIcon('gold',14)+' Gold change', value: (goldChange>=0?'+':'')+goldChange},
      {label:'Rounds', value: String(cb.round-1)},
    ];
    if(leagueAfter.id !== leagueBefore.id) cb.rewardLines.push({label:'League', value: leagueBadge(chg.newRating,22) + ' ' + (leagueAfter.min > leagueBefore.min ? 'Promoted to ' : 'Dropped to ') + leagueAfter.name});
    if(result==='lose' && !isBot) cb.rewardLines.push({label:'Protection', value:'5:00 shield granted'});
    if(result==='win') await checkLevelUps(c, cb.rewardLines);

    // Tell a real opponent what happened. We never edit THEIR character (their own device would overwrite it
    // with its older copy); we leave a small notice in their own mailbox and their game applies it when it
    // next opens (checkPvpResults) — same idea as the market's "your listing sold" notices.
    if(HAS_DB && opp.id && !isBot){
      const theirResult = result==='win' ? 'lose' : result==='lose' ? 'win' : 'draw';
      const theirDelta = pvpRatingChange(oppRating, myRating, theirResult).delta;
      DB.collection('rc_players').doc(opp.id).collection('pvpResults')
        .add({ ts: Date.now(), fromName: c.username, result: theirResult, delta: theirDelta })
        .catch(()=>{ /* best effort: it doesn't change what this player sees */ });
    }
  }
  render(); // show the result immediately — don't wait on any network write
  saveCharacter(c); // fire-and-forget
}

async function checkLevelUps(c, rewardLines){
  let leveled = 0;
  while(c.xp >= xpNeeded(c.level)){
    c.xp -= xpNeeded(c.level);
    c.level += 1;
    c.skillPoints += 1;
    leveled++;
  }
  if(leveled>0){
    const eff = effectiveStats(c);
    // HP/Mana refill on level-up is intentional (a full-health "fresh start" at the new
    // level). Energy is intentionally NOT refilled here — Energy is the game's core
    // resource economy and must only ever change via combat/regen/potions, never as a
    // level-up side effect (see spec: "Level Up must NOT refill Energy").
    c.hpCur = eff.maxHp; c.manaCur = eff.maxMana;
    c.energyCur = clamp(c.energyCur, 0, eff.maxEnergy);
    rewardLines.push({label:'Level up!', value:`Reached level ${c.level} (+${leveled} skill point${leveled>1?'s':''})`});
  }
}

async function finishCombat(){
  const cb = S.combat;
  const back = (cb && cb.returnScreen) || 'world';
  if(back==='road' && S.road && cb){
    if(cb.result==='win') S.road.log.push({text:`You dealt with the ${cb.foe.label} and continue on.`, cls:'good'});
    else if(cb.result==='lose') S.road.log.push({text:`The ${cb.foe.label} got the better of you. You press on, bruised.`, cls:'hit'});
    else S.road.log.push({text:`You slip away from the ${cb.foe.label} and continue on.`, cls:''});
  }
  S.combat = null; S.showItemMenu = false;
  setScreen(back);
}

/* ---------------- Inventory / equip / craft actions ---------------- */
function equipItem(itemUid){
  const c = S.char;
  const idx = c.inventory.findIndex(i=>i.uid===itemUid);
  if(idx<0) return;
  const item = c.inventory[idx];
  const prev = c.equipment[item.slot];
  c.equipment[item.slot] = item;
  c.inventory.splice(idx,1);
  if(prev) c.inventory.push(prev);
  showToast(`Equipped ${item.name}.`);
}
function unequipSlot(slot){
  const c = S.char;
  const item = c.equipment[slot];
  if(!item) return;
  if(bagCount(c) >= BAG_CAPACITY){ showToast('Bag is full.'); return; }
  c.equipment[slot] = null;
  c.inventory.push(item);
}
function findEquipmentByUid(c, itemUid){
  for(const slot of EQUIP_SLOTS){ if(c.equipment[slot] && c.equipment[slot].uid===itemUid) return c.equipment[slot]; }
  return c.inventory.find(i=>i.uid===itemUid);
}
function upgradeItem(itemUid){
  const c = S.char;
  const item = findEquipmentByUid(c, itemUid);
  if(!item || item.kind!=='equipment') return;
  const cost = UPGRADE_COSTS[item.tier];
  if(!cost){ showToast('This item is already at maximum tier.'); return; }
  let affordable = c.gold >= cost.gold;
  if(cost.resources) Object.entries(cost.resources).forEach(([k,v])=>{ if((c.resourceBag[k]||0) < v) affordable = false; });
  if(cost.materials) Object.entries(cost.materials).forEach(([k,v])=>{
    const have = c.inventory.filter(i=>i.kind==='material' && i.id===k).reduce((a,i)=>a+(i.qty||1),0);
    if(have < v) affordable = false;
  });
  if(!affordable){ showToast('Not enough gold or materials to upgrade this item.'); return; }
  c.gold -= cost.gold;
  if(cost.resources) Object.entries(cost.resources).forEach(([k,v])=>{ c.resourceBag[k] = r3(c.resourceBag[k] - v); });
  if(cost.materials) Object.entries(cost.materials).forEach(([k,v])=>{
    let remaining = v;
    c.inventory.forEach(i=>{
      if(remaining<=0 || i.kind!=='material' || i.id!==k) return;
      const take = Math.min(i.qty||1, remaining);
      i.qty = (i.qty||1) - take;
      remaining -= take;
    });
    c.inventory = c.inventory.filter(i=> !(i.kind==='material' && i.id===k && (i.qty||0)<=0));
  });
  const nextTierId = TIER_ORDER[TIER_ORDER.indexOf(item.tier)+1];
  const upgraded = makeEquipment(item.slot, nextTierId, Math.max(item.level||1, c.level));
  item.tier = upgraded.tier; item.name = upgraded.name; item.stats = upgraded.stats; item.level = upgraded.level;
  delete item.starter;
  showToast(`Upgraded to ${TIERS.find(t=>t.id===nextTierId).name}!`);
}
function sellItem(itemUid){
  const c = S.char;
  const idx = c.inventory.findIndex(i=>i.uid===itemUid);
  if(idx<0) return;
  const item = c.inventory[idx];
  c.gold += sellPrice(item);
  c.inventory.splice(idx,1);
  showToast(`Sold ${item.name} for ${sellPrice(item)}g.`);
}
function useItemOutOfCombat(itemUid){
  const c = S.char;
  applyRegen(c); // fresh Energy value before an Energy Potion caps against maxEnergy
  const idx = c.inventory.findIndex(i=>i.uid===itemUid);
  if(idx<0) return;
  const item = c.inventory[idx];
  const eff = effectiveStats(c);
  if(item.effect.heal) c.hpCur = clamp(c.hpCur + Math.round(eff.maxHp*item.effect.heal), 0, eff.maxHp);
  if(item.effect.energy) c.energyCur = clamp(c.energyCur + item.effect.energy, 0, eff.maxEnergy);
  item.qty -= 1;
  if(item.qty<=0) c.inventory.splice(idx,1);
  showToast(`Used ${item.name}.`);
}
function maxCraftable(c, r){
  let max = Infinity;
  Object.entries(r.inputs).forEach(([k,v])=>{ max = Math.min(max, Math.floor((c.resourceBag[k]||0)/v)); });
  if(r.energy) max = Math.min(max, Math.floor(c.energyCur/r.energy));
  return Math.max(0, Number.isFinite(max) ? max : 0);
}
async function craftRecipe(recipeId, qty){
  const c = S.char;
  // Recompute Energy from elapsed time first, so the check below (and the deduction
  // that follows) both use the authoritative, up-to-date value — not a stale one from
  // whenever the crafting screen last rendered.
  applyRegen(c);
  const r = RECIPES.find(x=>x.id===recipeId);
  if(!r) return;
  const eff = effectiveStats(c);
  const max = maxCraftable(c, r);
  qty = clamp(Math.floor(qty||1), 1, Math.max(1,max));
  if(max <= 0){
    if(r.energy && c.energyCur < r.energy){ showToast(notEnoughEnergyMsg(c, eff, r.energy)); return; }
    showToast('Not enough resources.'); return;
  }
  // Bag capacity only actually matters when the output needs a brand-new slot: equipment
  // never stacks, but a material/consumable that already has a stack in the bag (or is
  // being crafted for the first time with room to spare) doesn't need one. Reject the
  // craft only when a new slot is genuinely required and none is free.
  const existing = r.out.kind!=='equipment' ? c.inventory.find(i=>i.kind===r.out.kind && i.id===r.out.id) : null;
  const needsNewSlot = !existing;
  if(needsNewSlot && bagCount(c) >= BAG_CAPACITY){ showToast('Bag is full.'); return; }
  // Atomic from the player's perspective: resources and Energy were both already
  // verified affordable via maxCraftable() above before anything here is deducted,
  // and the total Energy cost (r.energy * qty) is taken exactly once.
  Object.entries(r.inputs).forEach(([k,v])=>{ c.resourceBag[k] = r3(c.resourceBag[k] - v*qty); });
  if(r.energy){ c.energyCur = clamp(c.energyCur - r.energy*qty, 0, eff.maxEnergy); }
  if(existing){ existing.qty = (existing.qty||1)+qty; }
  else { c.inventory.push(Object.assign({uid:uid(), qty}, r.out)); }
  if(r.xp){
    c.xp += r.xp*qty;
    const lvlLines = [];
    await checkLevelUps(c, lvlLines);
    lvlLines.forEach(l=> showToast(l.value));
  }
  showToast(`Crafted ${qty}x ${r.out.name}${r.xp?` (+${r.xp*qty} XP)`:''}.`);
}

/* ---------------- Forge ---------------- */
function matCount(c, id){ return c.inventory.filter(i=>i.kind==='material' && i.id===id).reduce((a,i)=>a+(i.qty||1),0); }
function takeMaterial(c, id, n){
  let remaining = n;
  c.inventory.forEach(i=>{
    if(remaining<=0 || i.kind!=='material' || i.id!==id) return;
    const take = Math.min(i.qty||1, remaining);
    i.qty = (i.qty||1) - take; remaining -= take;
  });
  c.inventory = c.inventory.filter(i=> !(i.kind==='material' && i.id===id && (i.qty||0)<=0));
}
function forgeCheck(c, slot, tierId){
  const f = FORGE_TIERS[tierId];
  if(!f || !EQUIP_SLOTS.includes(slot)) return {ok:false, msg:'Invalid forge recipe.'};
  if(c.energyCur < f.energy) return {ok:false, msg:'Not enough Energy.'};
  for(const [k,v] of Object.entries(f.resources||{})) if((c.resourceBag[k]||0) < v) return {ok:false, msg:'Not enough resources.'};
  for(const [k,v] of Object.entries(f.materials||{})) if(matCount(c,k) < v) return {ok:false, msg:'Not enough materials.'};
  if(bagCount(c) >= BAG_CAPACITY) return {ok:false, msg:'Bag is full.'};
  return {ok:true};
}
async function forgeItem(slot, tierId){
  const c = S.char;
  applyRegen(c); // fresh Energy before checking cost
  const chk = forgeCheck(c, slot, tierId);
  if(!chk.ok){ showToast(chk.msg); return; }
  const f = FORGE_TIERS[tierId], eff = effectiveStats(c);
  c.energyCur = clamp(c.energyCur - f.energy, 0, eff.maxEnergy);
  Object.entries(f.resources||{}).forEach(([k,v])=>{ c.resourceBag[k] = r3(c.resourceBag[k] - v); });
  Object.entries(f.materials||{}).forEach(([k,v])=>{ takeMaterial(c, k, v); });
  const item = makeEquipment(slot, tierId, c.level);
  c.inventory.push(item);
  c.xp += f.xp;
  const lvlLines = [];
  await checkLevelUps(c, lvlLines);
  lvlLines.forEach(l=> showToast(l.value));
  showToast(`Forged ${item.name} (Lv.${item.level}) +${f.xp} XP.`);
}

/* ---------------- Skills ---------------- */
function buyGeneralSkill(skillId){
  const c = S.char;
  const lvl = c.generalSkills[skillId];
  if(lvl>=GENERAL_SKILL_MAX) return;
  const cost = generalSkillCost(lvl);
  if(c.skillPoints < cost) return;
  c.skillPoints -= cost;
  c.generalSkills[skillId] += 1;
  const eff = effectiveStats(c);
  c.hpCur = clamp(c.hpCur, 0, eff.maxHp);
  showToast('Skill improved.');
}
function buyClassSkill(skillId){
  const c = S.char;
  const lvl = c.classSkills[skillId];
  if(lvl>=MAX_SKILL_LEVEL) return;
  const cost = SKILL_UPGRADE_COST[lvl];
  if(c.skillPoints < cost) return;
  c.skillPoints -= cost;
  c.classSkills[skillId] += 1;
  showToast('Skill upgraded.');
}
function resetClassSkills(){
  const c = S.char;
  let refund = 0;
  Object.keys(c.classSkills).forEach(id=>{
    const lvl = c.classSkills[id];
    for(let i=0;i<lvl;i++) refund += SKILL_UPGRADE_COST[i];
    c.classSkills[id] = 0;
  });
  c.skillPoints += refund;
  showToast('Class skills reset.');
}

/* ============================================================
   BOOT
   ============================================================ */
function migrateCharacter(c){
  if(!c.colorScheme) c.colorScheme = 'frost';
  if(!c.bossCooldowns) c.bossCooldowns = {};
  if(c.kingdomId===undefined) c.kingdomId = null;
  if(c.kingdomRole===undefined) c.kingdomRole = null;
  if(c.kingdomJoinedAt===undefined) c.kingdomJoinedAt = 0;
  if(c.kingdomCooldownUntil===undefined) c.kingdomCooldownUntil = 0;
  if(c.kingdomId && !KINGDOMS.some(k=>k.id===c.kingdomId)){ c.kingdomId = null; c.kingdomRole = null; c.kingdomJoinedAt = 0; } // old continent kingdoms no longer exist
  if(typeof c.skillPoints !== 'number' || isNaN(c.skillPoints)) c.skillPoints = 0;
  // Skill points are only ever earned 1 per level (level-1 total), so anything missing from
  // (unspent + spent) is points a level-up failed to credit — hand them back.
  const spentPts = Object.values(c.classSkills||{}).reduce((a,l)=>{ for(let i=0;i<l;i++) a += SKILL_UPGRADE_COST[i]||0; return a; },0)
                 + Object.values(c.generalSkills||{}).reduce((a,l)=>{ for(let i=0;i<l;i++) a += GENERAL_SKILL_UPGRADE_COST[i]||0; return a; },0);
  const owedPts = (c.level-1) - spentPts - c.skillPoints;
  if(owedPts > 0) c.skillPoints += owedPts;
  if(!c.resourceBag) c.resourceBag = {};
  Object.keys({wood:0,stone:0,food:0,coal:0,iron:0,ore:0,herbs:0,leather:0,frost:0,voidessence:0}).forEach(k=>{
    if(typeof c.resourceBag[k] !== 'number') c.resourceBag[k] = 0;
  });
  return c;
}
async function boot(){
  try{
    await initCapabilities();
    if(HAS_DB && !FB_USER_EMAIL){
      setScreen('login');
      return;
    }
    const existing = await loadCharacterSure();
    if(existing){
      S.char = migrateCharacter(existing);
      applyRegen(S.char);
      saveCharacter(S.char); // fire-and-forget: the game must not wait for this write before opening
    }
  }catch(e){
    // Whatever went wrong (capability hiccup, corrupted save, etc.), never leave
    // the player stuck on the loading screen — fall back to a fresh local guest run.
    S.char = null;
  }
  setScreen(S.char ? 'world' : 'create');
  if(S.char){ checkMarketSales(); checkPvpResults(); } // don't block boot on these — they just surface toasts once they resolve
  setInterval(()=>{
    if(S.char && S.screen!=='combat' && S.screen!=='kingdom' && S.screen!=='market'){ applyRegen(S.char); render(); }
  }, 20000);
  // war page: pull the live score + top fighters every 8s so the bar follows the strikes of other players too
  setInterval(()=>{
    if(S.char && S.screen==='war-detail' && !document.hidden){
      if(S.warFighters && S.worldWarsSelected) delete S.warFighters[S.worldWarsSelected];
      loadWorldWars(true).catch(()=>{});
    }
  }, 8000);
}
render();
boot();
// Absolute last resort: if something outside boot()'s own try/catch still hangs
// (e.g. a capability promise that neither resolves, rejects, nor respects our
// timeout), never leave the player staring at the loading screen forever.
setTimeout(()=>{ if(S.screen==='loading') setScreen(S.char ? 'world' : (HAS_DB && !FB_USER_EMAIL ? 'login' : 'create')); }, 22000);


/* ---------------- Country war: helpers ---------------- */
function warErrorMsg(e){
  const d = e.details || {};
  switch(e.message){
    case 'NOT_LEADER': return 'Only the Leader of the right country can do that.';
    case 'TARGET_NOT_CITIZEN': return 'That player is not a citizen of your country.';
    case 'ALREADY_CLAIMED': return d.msRemaining ? `Already claimed today. Come back in ${Math.ceil(d.msRemaining/3600000)}h.` : 'Already claimed today.';
    case 'NOT_ENOUGH_ENERGY': return `Not enough Energy. ${d.required} required, ${d.available} available.`;
    case 'COOLDOWN_ACTIVE': return d.msRemaining ? `Not ready yet — wait ${Math.ceil(d.msRemaining/1000)}s.` : 'Your country is still in its post-war cooldown.';
    case 'TARGET_COOLDOWN': return 'The country that owns that region is still recovering from its last war.';
    case 'NOT_ADJACENT': case 'NO_NEIGHBOR_DATA': return 'You can only attack a region that borders one of your own regions (a shared land border or a short sea crossing).';
    case 'REGION_REQUIRED': return 'Wars are declared over a region. Choose a region first.';
    case 'INVALID_REGION': return 'That region does not exist.';
    case 'OWN_REGION': return 'You cannot declare war over a region your own country owns.';
    case 'REGION_ALREADY_TARGETED': return 'Another war is already being fought over that region.';
    case 'REGION_HAS_NO_OWNER': return 'That region has no owner right now.';
    case 'TARGET_PROTECTED': return 'That country is under war-tax protection and cannot be attacked yet.';
    case 'TARGET_AT_WAR': return 'The country that owns that region is already at war.';
    case 'ALREADY_AT_WAR': return 'Your country is already at war.';
    case 'NOT_ENOUGH_MEMBERS': return `Both countries need at least ${d.required} citizens.`;
    case 'SIDE_REQUIRED': return 'Pick a side first: Attack or Defend.';
    case 'INVALID_SIDE': return 'That is not a valid side.';
    case 'SIDE_LOCKED': return `You already fight for the ${d.side==='attack'?'attacker':'defender'} in this war and cannot switch sides.`;
    case 'WAR_NOT_FOUND': return 'That war no longer exists.';
    case 'STRIKE_LIMIT': return `You reached the strike limit for this round (${d.max}).`;
    case 'TARGETS_EXHAUSTED': return 'You already hit every available enemy the maximum number of times this round.';
    case 'NO_TARGET_AVAILABLE': return 'The enemy has no one to fight right now.';
    case 'ROUND_ENDED': case 'ROUND_CHANGED': case 'WAR_ENDED': return 'That round just ended — refreshing.';
    case 'WAR_NOT_STARTED': return 'The war has not started yet.';
    case 'REWARD_EXPIRED': return 'The time to choose a resource has run out.';
    case 'REWARD_NOT_AVAILABLE': return 'There is no reward to choose right now.';
    case 'INVALID_RESOURCE': return 'That resource cannot be taxed.';
    case 'INVALID_SPECIALITIES': return 'Pick exactly 2 different resources.';
    case 'SPECIALITIES_UNCHANGED': return 'Those are already your specialities.';
    case 'SPECIALITY_COOLDOWN': return d.msRemaining ? `You can change specialities again in ${Math.ceil(d.msRemaining/3600000)}h.` : 'You changed specialities recently.';
    case 'INVALID_RATE': return `The tax rate must be a whole number between ${d.min}% and ${d.max}%.`;
    default: {
      console.error('[RealmClash] action failed:', e);   // full error for debugging (F12 > Console)
      const why = String((e && (e.code || e.message)) || '').replace(/^functions\//,'').slice(0,80);
      return 'That action failed' + (why ? ' (' + why + ')' : '') + ' — please try again.';
    }
  }
}
document.addEventListener('change', e=>{
  if(e.target && e.target.id==='war-target-country'){ S._warCountry = e.target.value; S._warTarget = ''; render(); }
});
// Countdowns follow SERVER time (S.serverOffset). When one reaches zero, or every 30s while a war is open, re-ask the server.
let _countryPoll = {last:0};
setInterval(()=>{
  const off = S.serverOffset||0, nowSrv = Date.now()+off;
  let expired = false;
  document.querySelectorAll('[data-countdown]').forEach(n=>{
    const left = Number(n.dataset.countdown) - nowSrv;
    n.textContent = fmtClock(left);
    if(left<=0) expired = true;
  });
  const cs = S.countryState;
  const onTab = S.screen==='kingdom' && (S.kingdomTab==='war' || S.kingdomTab==='economy' || S.kingdomTab==='overview' || !S.kingdomTab);
  if(!onTab || !cs || cs.status==='loading') return;
  const waiting = cs.data && cs.data.activeWar;
  const t = Date.now();
  if((expired && t-_countryPoll.last > 3000) || (waiting && t-_countryPoll.last > 30000)){
    _countryPoll.last = t;
    loadCountryState(true);
  }
}, 1000)
