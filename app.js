/* ============================================================
   MAIN RENDER
   ============================================================ */
function render(){
  const app = document.getElementById('app');
  if(S.screen==='loading'){
    app.innerHTML = `<div class="loader-wrap">
      <div class="loader-mark">${icon('crown','style="width:100%;height:100%;stroke:var(--brass)"')}</div>
      <p>ENTERING ARCADIA</p>
    </div>`;
    return;
  }
  if(S.screen==='login'){
    app.innerHTML = renderLogin();
    return;
  }
  if(S.screen==='create'){
    app.innerHTML = renderCreate();
    bindCreateEvents();
    return;
  }
  let body = '';
  if(S.screen==='home') body = renderHome();
  else if(S.screen==='adventure') body = renderAdventure();
  else if(S.screen==='zone-detail') body = renderZoneDetail();
  else if(S.screen==='road') body = renderRoad();
  else if(S.screen==='combat') body = renderCombat();
  else if(S.screen==='pvp') body = renderPvp();
  else if(S.screen==='kingdom') body = renderKingdom();
  else if(S.screen==='market') body = renderMarket();
  else if(S.screen==='craft') body = renderCraft();
  else if(S.screen==='inventory') body = renderInventory();
  else if(S.screen==='profile') body = renderProfile();
  else if(S.screen==='settings') body = renderSettings();

  const navActive = S.screen==='combat' ? (S.combat && S.combat.mode==='pvp' ? 'pvp':'adventure') : ((S.screen==='road'||S.screen==='zone-detail') ? 'adventure' : S.screen);

  app.innerHTML = `
  <div class="app-shell">
    <div class="sidebar">
      <div class="brand">
        <div class="brand-mark">${icon('crown','style="width:100%;height:100%;stroke:var(--brass-bright)"')}</div>
        <div class="brand-name">ARCADIA</div>
      </div>
      <div class="navlist">${renderNav(navActive)}</div>
      <div class="nav-foot">PvP-first prototype<br>Core loop demo</div>
    </div>
    <div class="main">
      ${renderStatusBar()}
      <div class="view">${body}</div>
    </div>
  </div>
  <div class="tabbar">${renderTabbar(navActive)}</div>
  ${S.toast ? `<div class="toast">${esc(S.toast)}</div>` : ''}
  `;
  if(S.screen==='kingdom'){
    const input = document.getElementById('kingdom-chat-input');
    if(input){
      input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendKingdomChat(input.value); } });
    }
  }
}

/* ============================================================
   EVENT HANDLING
   ============================================================ */
function bindCreateEvents(){
  const input = document.getElementById('username-input');
  if(input){
    input.addEventListener('input', e=>{ S._create.username = e.target.value; });
  }
}

document.addEventListener('click', async (e)=>{
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const action = el.dataset.action;

  if(action==='signin-google'){ await signInWithGoogle(); return; }
  if(action==='signin-guest'){ await continueAsGuestAccount(); return; }
  if(action==='sign-out'){
    if(!confirm('Sign out?')) return;
    S.char = null;
    if(fbAuth){ try{ await fbAuth.signOut(); }catch(err){} }
    location.reload();
    return;
  }

  if(action==='pick-class'){ S._create.classId = el.dataset.class; render(); return; }
  if(action==='create-character'){
    const st = S._create;
    const uname = (st.username||'').trim().slice(0,18) || pick(BOT_NAMES);
    if(!st.classId) return;
    S.char = newCharacter(MY_ID, uname, st.classId);
    await saveCharacter(S.char);
    setScreen('home');
    return;
  }
  if(action==='nav'){
    setScreen(el.dataset.screen);
    S.pvpCandidates = null;
    if(el.dataset.screen==='kingdom'){ loadKingdomView(); }
    if(el.dataset.screen==='market'){ loadMarketListings(); }
    return;
  }

  if(action==='view-zone'){ S.zoneDetailId = el.dataset.zone; setScreen('zone-detail'); return; }
  if(action==='enter-zone'){ await startPve(el.dataset.zone, null, {returnScreen:'zone-detail'}); return; }
  if(action==='enter-zone-elite'){ await startPve(el.dataset.zone, 'elite', {returnScreen:'zone-detail'}); return; }
  if(action==='enter-zone-boss'){ await startPve(el.dataset.zone, 'boss', {returnScreen:'zone-detail'}); return; }
  if(action==='zone-road'){
    S.road = { zoneId: el.dataset.zone, log:[{text:'You set off down the road.', cls:''}], gained:{xp:0, gold:0, resources:{}} };
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
  if(action==='leave-kingdom'){ await leaveKingdom(); return; }
  if(action==='claim-leadership'){ await claimLeadership(); return; }
  if(action==='donate-kingdom'){ await donateToKingdom(el.dataset.resource, Number(el.dataset.amount)); return; }
  if(action==='kingdom-chat-send'){
    const input = document.getElementById('kingdom-chat-input');
    await sendKingdomChat(input ? input.value : '');
    return;
  }
  if(action==='kingdom-member'){ await kingdomManageMember(el.dataset.id, el.dataset.op); return; }

  if(action==='market-tab'){ S.marketTab = el.dataset.tab; render(); return; }
  if(action==='market-filter'){ S.marketFilter = el.dataset.filter; render(); return; }
  if(action==='market-sell-kind'){ S.marketSellKind = el.dataset.kind; render(); return; }
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

  if(action==='combat-attack'){ await resolveRound({kind:'attack'}); return; }
  if(action==='combat-defend'){ await resolveRound({kind:'defend'}); return; }
  if(action==='combat-flee'){ await resolveFlee(); return; }
  if(action==='combat-skill'){
    if(!S.combat) return;
    const s = S.combat.me.skills.find(x=>x.id===el.dataset.skill);
    await resolveRound({kind:'skill', skill:s, skillLevel:S.char.classSkills[s.id]||0});
    return;
  }
  if(action==='combat-item-menu'){ S.showItemMenu = !S.showItemMenu; render(); return; }
  if(action==='combat-item'){
    const it = S.char.inventory.find(x=>x.uid===el.dataset.uid);
    if(it){ await resolveRound({kind:'item', item:it}); S.showItemMenu=false; }
    return;
  }
  if(action==='close-combat'){ await finishCombat(); return; }

  if(action==='equip'){ equipItem(el.dataset.uid); await persist(); return; }
  if(action==='unequip'){ unequipSlot(el.dataset.slot); await persist(); return; }
  if(action==='upgrade-item'){ upgradeItem(el.dataset.uid); await persist(); return; }
  if(action==='sell'){ sellItem(el.dataset.uid); await persist(); return; }
  if(action==='use-item'){ useItemOutOfCombat(el.dataset.uid); await persist(); return; }
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
  if(action==='reset-general'){ resetGeneralSkills(); await persist(); return; }
  if(action==='reset-character'){
    if(confirm('Delete this character permanently?')){
      try{ localStorage.removeItem(LS_KEY_PREFIX+'char_'+MY_ID); }catch(err){}
      if(HAS_DB){ try{ await withTimeout(DB.doc('players/'+MY_ID).delete(), 5000); }catch(err){} }
      S.char = null; S._create=null;
      setScreen('create');
    }
    return;
  }
});

