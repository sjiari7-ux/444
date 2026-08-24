// ─── UI Renderers ───
function renderBodyHTML(){
  if(battleState) return renderBattle();
  if(pvpBattleState) return renderPvpBattle();
  let html;
  switch(activeTab){
    case 'production': html = renderProduction(); break;
    case 'inventory': html = renderInventory(); break;
    case 'market': html = renderMarket(); break;
    case 'gear': html = renderGear(); break;
    case 'class': html = renderClass(); break;
    case 'skills': html = renderSkills(); break;
    case 'missions': html = renderMissions(); break;
    case 'leaderboard': html = renderLeaderboard(); break;
    case 'companies': html = renderCompanies(); break;
    case 'alliance': html = renderAlliance(); break;
    case 'pvp': html = renderPvpTab(); break;
    case 'settings': html = renderSettings(); break;
    case 'zones': html = renderZonesTab(); break;
    default: html = ''; break;
  }
  if(typeof activeWarModalId !== 'undefined' && activeWarModalId) html += renderWarDetailModal();
  return html;
}

function renderProduction(){
  const cap = getStorageCap(state);
  const maxH = getMaxHealth(state);
  const maxE = getMaxEnergy(state);
  const ePct = maxE > 0 ? (state.energy/maxE)*100 : 0;
  return `
    <div class="section-title"><h2>🛠️ Crafting</h2><span class="rule"></span><div class="sub">Backpack ${fmtG(getTotalStorageUsed(state))}/${fmtG(cap)}</div></div>
    ${renderCrafting()}
    <div class="panel" style="margin-top:14px;">
      <div class="panel-header">🍖 Recovery</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
        <div class="card" style="padding:12px;">
          <div style="font-size:13px;color:var(--dim);margin-bottom:8px;"><img class="ui-icon" src="${ICONS.energy}" alt="⚡"> Energy</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="flex:1;"><div class="bar-track" style="height:10px;"><div class="bar-fill ${ePct<20?'warn':''}" style="width:${ePct}%"></div></div></div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--brass-bright);">${state.energy}/${maxE}</span>
          </div>
          <div style="font-size:11px;color:var(--dim);">Regenerates 1 point every 5 minutes</div>
        </div>
        <div class="card" style="padding:12px;">
          <div style="font-size:13px;color:var(--dim);margin-bottom:8px;"><img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️"> Health</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="flex:1;"><div class="bar-track" style="height:10px;"><div class="bar-fill health ${state.health<maxH*0.3?'health':''}" style="width:${(state.health/maxH)*100}%"></div></div></div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--health);">${Math.floor(state.health)}/${maxH}</span>
          </div>
          <div style="font-size:11px;color:var(--dim);">Regenerates 1 point every 30 seconds</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <button class="act-btn copper" style="width:auto;padding:9px 18px;" ${state.inv.food<5?'disabled':''} onclick="eat()">🍞 Eat 5 Food (+5<img class="ui-icon" src="${ICONS.energy}" alt="⚡">)</button>
        <button class="act-btn red" style="width:auto;padding:9px 18px;" ${(state.inv.food<5||state.health>=maxH)?'disabled':''} onclick="healWithFood()">🩹 Heal (+20<img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️">)</button>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🍞 Crafted Consumables — No Energy Cost</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${Object.keys(BREAD_TIERS).map(key=>{
            const b = BREAD_TIERS[key];
            const have = state.inv[key]||0;
            const maxed = state.health >= getMaxHealth(state);
            return `<button class="mini-btn" style="border-color:var(--health);color:var(--health);" ${(have<1||maxed)?'disabled':''} onclick="consumeBread('${key}')">${ITEMS[key].icon} ${b.name} (+${b.heal} HP) ×${have}</button>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          ${Object.keys(ENERGY_POTION_TIERS).map(key=>{
            const p = ENERGY_POTION_TIERS[key];
            const have = state.inv[key]||0;
            const maxed = state.energy >= getMaxEnergy(state);
            return `<button class="mini-btn" style="border-color:var(--brass-bright);color:var(--brass-bright);" ${(have<1||maxed)?'disabled':''} onclick="consumeEnergyPotion('${key}')">${ITEMS[key].icon} ${p.name} (+${p.energy}<img class="ui-icon" src="${ICONS.energy}" alt="⚡">) ×${have}</button>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function renderInventory(){
  const cap = getStorageCap(state);
  const totalItems = getTotalStorageUsed(state);
  const storagePct = Math.min(100, (totalItems/cap)*100);

  // Only show items that player actually has (quantity > 0)
  const ownedKeys = Object.keys(MARKET_CATALOG).filter(key => (state.inv[key] || 0) > 0);

  const allCards = ownedKeys.map(key=>{
    const it = MARKET_CATALOG[key];
    const qty = state.inv[key] || 0;
    const isResource = RESOURCES[key] !== undefined;
    const isWeapon = WEAPONS[key] !== undefined;
    const isBread = BREAD_TIERS[key] !== undefined;
    const isEnergy = ENERGY_POTION_TIERS[key] !== undefined;
    const isHealthPotion = key === 'health_potion';
    const isConsumable = isBread || isEnergy || isHealthPotion;
    const typeLabel = isResource?'Resource':(isConsumable?'Consumable':(isWeapon?'Trade Good':'Good'));
    const typeColor = isResource?'var(--dim)':(isConsumable?'var(--health)':(isWeapon?'var(--brass-bright)':'var(--skill)'));
    let effectLine = '';
    let consumeBtn = '';
    if(isBread){
      const maxed = state.health >= getMaxHealth(state);
      effectLine = `<div class="item-effect" style="color:var(--health);">❤️ +${BREAD_TIERS[key].heal} HP</div>`;
      consumeBtn = `<button class="mini-btn" style="border-color:var(--health);color:var(--health);margin-top:8px;width:100%;" ${maxed?'disabled':''} onclick="consumeBread('${key}')">${maxed?'HP Full':'🍽️ Eat'}</button>`;
    } else if(isEnergy){
      const maxed = state.energy >= getMaxEnergy(state);
      effectLine = `<div class="item-effect" style="color:var(--brass-bright);">⚡ +${ENERGY_POTION_TIERS[key].energy} Energy</div>`;
      consumeBtn = `<button class="mini-btn" style="border-color:var(--brass-bright);color:var(--brass-bright);margin-top:8px;width:100%;" ${maxed?'disabled':''} onclick="consumeEnergyPotion('${key}')">${maxed?'Energy Full':'🧪 Drink'}</button>`;
    } else if(isHealthPotion){
      const maxed = state.health >= getMaxHealth(state);
      effectLine = `<div class="item-effect" style="color:var(--health);">❤️ +30-50 HP</div>`;
      consumeBtn = `<button class="mini-btn" style="border-color:var(--health);color:var(--health);margin-top:8px;width:100%;" ${maxed?'disabled':''} onclick="consumeBread('${key}')">${maxed?'HP Full':'🍽️ Use'}</button>`;
    }
    return `<div class="card item-card-v2">
      <div class="inv-qty-badge">${fmtG(qty)}</div>
      <div class="card-top"><div class="card-icon" style="font-size:32px;">${it.icon}</div>
        <div style="min-width:0;">
          <div class="card-name">${it.name}</div>
          <div class="item-type-tag" style="color:${typeColor};">${typeLabel}</div>
        </div>
      </div>
      ${effectLine}
      ${consumeBtn}
    </div>`;
  }).join('');

  const emptyState = ownedKeys.length === 0 ? `
    <div class="panel" style="text-align:center;padding:40px 20px;">
      <div style="font-size:48px;margin-bottom:12px;">🎒</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);margin-bottom:6px;">Your bag is empty</div>
      <div style="font-size:12px;color:var(--dim);">Gather resources from zones or craft items to fill your bag.</div>
    </div>
  ` : '';

  return `
    <div class="section-title"><h2>🎒 Bag</h2><span class="rule"></span><div class="sub">${ownedKeys.length} item${ownedKeys.length===1?'':'s'}</div></div>
    <div class="panel" style="margin-bottom:14px;padding:12px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;color:var(--dim);">Total Backpack Used (resources + gear)</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--brass-bright);">${fmtG(totalItems)} / ${fmtG(cap)}</span>
      </div>
      <div class="bar-track" style="height:10px;"><div class="bar-fill ${storagePct>90?'warn':''}" style="width:${storagePct}%"></div></div>
    </div>
    ${emptyState}
    <div class="grid-compact">${allCards}</div>`;
}

function renderCrafting(){
  const cap = getStorageCap(state);
  const readyCards = [];
  const blockedCards = [];
  const lockedRows = [];

  Object.keys(RECIPES).forEach(key=>{
    const r = RECIPES[key];
    const g = GOODS[key];
    const locked = state.level < r.minLevel;

    if(locked){
      lockedRows.push(`<div class="item-row" style="opacity:0.55;">
        <div class="ir-icon">${g.icon}</div>
        <div class="ir-info"><div class="ir-name">${g.name}</div><div class="ir-meta"><span class="ir-type" style="color:var(--dim);"><img class="ui-icon" src="${ICONS.lock}" alt="🔒"> Requires level ${r.minLevel}</span></div></div>
      </div>`);
      return;
    }

    const hasInputs = Object.keys(r.inputs).every(inp=> state.inv[inp] >= r.inputs[inp]);
    const inputsSum = Object.values(r.inputs).reduce((a,b)=>a+b,0);
    const hasSpace = getTotalStorageUsed(state) - inputsSum + r.output <= cap;
    const cost = getEnergyCost(state, r.energyCost);
    const hasEnergy = state.energy >= cost;
    const canCraft = hasInputs && hasSpace && hasEnergy;

    // Max craftable quantity, so the "Craft Max" button always shows a real number.
    let maxQty = Infinity;
    Object.keys(r.inputs).forEach(inp=>{ maxQty = Math.min(maxQty, Math.floor((state.inv[inp]||0) / r.inputs[inp])); });
    if(cost > 0) maxQty = Math.min(maxQty, Math.floor(state.energy / cost));
    const netStorage = r.output - inputsSum;
    if(netStorage > 0) maxQty = Math.min(maxQty, Math.floor((cap - getTotalStorageUsed(state)) / netStorage));
    maxQty = Number.isFinite(maxQty) ? Math.max(0, maxQty) : 0;

    const inputsHtml = Object.keys(r.inputs).map(inp=>{
      const have = state.inv[inp] || 0;
      const need = r.inputs[inp];
      const enough = have >= need;
      return `<span class="resource-chip" style="border-color:${enough?'var(--green)':'var(--red)'};color:${enough?'var(--green)':'var(--red)'};">${ITEMS[inp].icon} ${have}/${need}</span>`;
    }).join(' ');
    const energyChip = `<span class="resource-chip" style="border-color:${hasEnergy?'var(--brass-bright)':'var(--red)'};color:${hasEnergy?'var(--brass-bright)':'var(--red)'};"><img class="ui-icon" src="${ICONS.energy}" alt="⚡">${cost}</span>`;

    const stateClass = canCraft ? 'ready' : (!hasEnergy ? 'blocked-energy' : (!hasSpace ? 'blocked-space' : 'blocked-mats'));

    const card = `<div class="card recipe-card ${stateClass}">
      <div class="xp-badge">+${r.xp}XP</div>
      <div class="card-top"><div class="card-icon-box">${g.icon}</div><div><div class="card-name">${g.name}</div><div class="card-sub">Produces ${r.output}</div></div></div>
      <div class="req-label">Requires</div>
      <div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:5px;">${energyChip}${inputsHtml}</div>
      <div style="display:flex;gap:6px;">
        <button class="act-btn" style="flex:1;" ${!canCraft?'disabled':''} onclick="craft('${key}')">Craft</button>
        <button class="act-btn buy" style="flex:1;" ${maxQty<1?'disabled':''} onclick="craftMax('${key}')">Craft ×${maxQty}</button>
      </div>
    </div>`;
    (canCraft ? readyCards : blockedCards).push(card);
  });

  const lockedSection = lockedRows.length ? `
    <div class="section-title" style="margin-top:18px;"><h2>🔒 Locked</h2><span class="rule"></span><div class="sub">${lockedRows.length} recipe${lockedRows.length===1?'':'s'}</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;">${lockedRows.join('')}</div>` : '';

  return `<div class="grid">${readyCards.join('')}${blockedCards.join('')}</div>${lockedSection}`;
}
function sparklineSVG(history){
  if(!history || history.length < 2) return '';
  const w = 60, h = 20, min = Math.min(...history), max = Math.max(...history);
  const range = max - min || 1;
  const points = history.map((v,i) => {
    const x = (i / (history.length-1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const last = history[history.length-1], prev = history[history.length-2] || last;
  const color = last >= prev ? '#6fa285' : '#c2694a';
  return `<svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/>
  </svg>`;
}
function renderMarket(){
  if(!db || !UID){
    return `
    <div class="panel" style="padding:20px;text-align:center;color:var(--dim);font-size:13px;">
      <img class="ui-icon" src="${ICONS.market_chart}" alt="📊" style="width:28px;height:28px;opacity:.5;display:block;margin:0 auto 10px;">
      The Player Market needs a cloud connection — sign in to buy and sell with other players.
    </div>`;
  }
  const category = state.marketCategory || 'resources';
  const isGear = category === 'gear';
  const view = isGear ? (state.gearMarketView || 'browse') : (state.marketView || 'browse');
  const subtext = isGear
    ? "Every listing here is a real piece of gear someone forged — exact stats and upgrade level included."
    : "Every price here is a real player's listing — no auto-generated prices.";
  const body = isGear ? renderGearMarketSection() : (view === 'mine' ? renderMyListingsView() : renderMarketBrowseView());
  return `
    <div class="panel" style="padding:0;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--panel-light);flex-wrap:wrap;gap:8px;">
        <div class="panel-header" style="margin-bottom:0;"><img class="ui-icon" src="${ICONS.market_chart}" alt="📊"> Player Market</div>
        <div style="font-size:11px;color:var(--dim);">${subtext}</div>
      </div>
      <div style="display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--panel);">
        <button class="market-tab-btn ${category==='resources'?'active':''}" onclick="setMarketCategory('resources')">🌲 Resources</button>
        <button class="market-tab-btn ${category==='gear'?'active':''}" onclick="setMarketCategory('gear')">⚔️ Gear</button>
      </div>
      <div style="display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--panel);flex-wrap:wrap;">
        <button class="market-tab-btn ${view==='browse'?'active':''}" onclick="${isGear?"setGearMarketView('browse')":"setMarketView('browse')"}">🛒 Browse</button>
        <button class="market-tab-btn ${view==='mine'?'active':''}" onclick="${isGear?"setGearMarketView('mine')":"setMarketView('mine')"}">🏷️ My Listings</button>
        ${isGear ? `<button class="market-tab-btn ${view==='mygear'?'active':''}" onclick="setGearMarketView('mygear')">🎒 My Gear</button>` : ''}
      </div>
      ${body}
    </div>
    ${state.marketDetailItem ? renderMarketDetailModal(state.marketDetailItem) : ''}
    ${state.marketSellItem ? renderSellModal(state.marketSellItem) : ''}
    ${state.gearMarketSellItem !== null ? renderGearSellModal(state.gearMarketSellItem) : ''}`;
}

// Gear Market section, embedded inside the same Player Market panel as
// Resources (see renderMarket above) instead of its own modal — same
// browse/mine tabs, just filtered to crafted gear listings. Rendering
// logic (rows, empty/loading states) lives in js/gear.js since it shares
// helpers (GEAR_TIERS, GEAR_SLOTS, getGearEffectiveStats) with the rest
// of the Gear tab.
function renderGearMarketSection(){
  const view = state.gearMarketView || 'browse';
  const filterButtons = ['all', ...Object.keys(GEAR_SLOTS)].map(slot=>{
    const active = state.gearMarketSlotFilter === slot;
    const label = slot === 'all' ? 'All' : GEAR_SLOTS[slot].name;
    const icon = slot === 'all' ? '🗂️' : GEAR_SLOTS[slot].icon;
    return `<button class="mini-btn ${active?'buy':''}" onclick="setGearMarketSlotFilter('${slot}')">${icon} ${label}</button>`;
  }).join('');
  const rows = view === 'mine' ? renderMyGearListingsRows() : view === 'mygear' ? renderMyGearBagRows() : renderGearMarketBrowseRows();
  return `
    ${view==='browse' ? `<div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--panel);">${filterButtons}</div>` : ''}
    ${rows}`;
}

// Resources section of the Player Market — RESOURCES + GOODS only. Real
// weapons/armor never appear here: those are either unique crafted Gear
// (Market → Gear) or, previously, a "Weapon Goods" tradeable-goods filter
// that lived in this same view and kept confusingly surfacing swords/axes
// under what's supposed to be a pure resources list — removed for good.
function renderMarketBrowseView(){
  const search = (state.marketSearch || '').toLowerCase();
  const allKeys = Object.keys(ITEMS); // ITEMS = {...RESOURCES, ...GOODS} — WEAPONS is never included
  const filteredKeys = allKeys.filter(key => {
    const it = MARKET_CATALOG[key];
    if (search) {
      const name = (it.name || '').toLowerCase();
      if (!name.includes(search)) return false;
    }
    return true;
  });
  const rows = filteredKeys.map(key=>{
    const it = MARKET_CATALOG[key];
    const price = state.prices[key];
    const prev = state.prevPrices[key];
    const trendUp = price >= prev;
    const trendPct = prev > 0 ? ((price/prev)-1)*100 : 0;
    const owned = state.inv[key];
    const sparkline = sparklineSVG(state.priceHistory[key] || []);
    return `<div class="market-row">
      <div class="market-left">
        <div class="card-icon" style="font-size:26px;">${it.icon}</div>
        <div>
          <div class="card-name">${it.name}</div>
          <div class="market-owned">${fmtG(owned)} owned</div>
        </div>
      </div>
      <div style="text-align:center;min-width:60px;">
        ${sparkline}
      </div>
      <div style="text-align:center;min-width:90px;">
        <div class="market-price" style="font-size:15px;">${price>0?price.toFixed(1)+'g':'—'}</div>
        <div style="font-size:10px;color:var(--dim);">last trade${trendPct?` · <span class="market-trend ${trendUp?'up':'down'}">${trendUp?'▲':'▼'}${Math.abs(trendPct).toFixed(0)}%</span>`:''}</div>
      </div>
      <div class="market-actions">
        <button class="mini-btn buy" onclick="openMarketDetail('${key}')">🛒 Browse offers</button>
        <button class="mini-btn sell" ${owned>0?'':'disabled'} onclick="openSellModal('${key}')">🏷️ Sell</button>
      </div>
    </div>`;
  }).join('');
  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--panel);">
      <input type="text" class="market-search" placeholder="Search resources..." value="${state.marketSearch||''}" oninput="setMarketSearch(this.value)" style="flex:1;min-width:160px;">
      <button class="mini-btn" onclick="clearMarketFilters()" style="padding:8px 12px;">✕ Clear</button>
    </div>
    ${rows}`;
}

function renderMyListingsView(){
  if(state.myListingsLoading && !state.myListingsCache.length){
    return `<div style="padding:30px 20px;text-align:center;color:var(--dim);font-size:13px;">Loading your listings…</div>`;
  }
  if(!state.myListingsCache.length){
    return `<div style="padding:30px 20px;text-align:center;color:var(--dim);font-size:13px;">You have nothing listed. Go to Browse and hit 🏷️ Sell on anything you own.</div>`;
  }
  const rows = state.myListingsCache.map(l=>{
    const it = MARKET_CATALOG[l.itemKey];
    if(!it) return '';
    return `<div class="market-row">
      <div class="market-left">
        <div class="card-icon" style="font-size:26px;">${it.icon}</div>
        <div>
          <div class="card-name">${it.name}</div>
          <div class="market-owned">${fmtG(l.quantity)} left</div>
        </div>
      </div>
      <div style="text-align:center;min-width:90px;">
        <div class="market-price" style="font-size:15px;">${(l.pricePerUnit||0).toFixed(1)}g<span style="color:var(--dim);font-size:10px;"> /ea</span></div>
      </div>
      <div class="market-actions">
        <button class="mini-btn sell" onclick="cancelListing('${l.id}')">✕ Cancel & return items</button>
      </div>
    </div>`;
  }).join('');
  return rows;
}

// Just the listings-rows portion of the "Browse offers" modal. Split out
// from renderMarketDetailModal() so it can be re-rendered on its own (see
// patchMarketDetailModal below) without rebuilding the modal-overlay /
// modal-box wrapper around it.
function renderMarketDetailBody(key){
  const it = MARKET_CATALOG[key];
  if(!it) return '';
  const listings = state.marketListingsCache[key] || [];
  const loading = state.marketListingsLoading;
  const cap = getStorageCap(state);
  const used = getTotalStorageUsed(state);
  const roomLeft = Math.max(0, cap - used);
  if(loading && !listings.length){
    return `<div class="offer-empty"><span class="oe-icon">⏳</span>Loading offers…</div>`;
  }
  if(!listings.length){
    return `<div class="offer-empty"><span class="oe-icon">${it.icon}</span>No one is selling ${escapeHtml(it.name)} right now.<br>Be the first — hit Sell from the Browse list.</div>`;
  }
  const bestPrice = listings[0].pricePerUnit;
  const subhead = `<div class="offers-subhead"><span><b>${listings.length}</b> offer${listings.length===1?'':'s'}</span><span>Sorted: lowest price first</span></div>`;
  const rows = listings.map(l=>{
    const mine = l.sellerId === UID;
    const isBest = l.pricePerUnit === bestPrice;
    const affordableQty = Math.floor(state.gold / (l.pricePerUnit || 1));
    const maxQty = Math.max(0, Math.min(l.quantity, roomLeft, affordableQty));
    const buy1Cost = Math.ceil(l.pricePerUnit);
    const sellerName = l.sellerName || 'Player';
    const initial = escapeHtml(sellerName.trim().charAt(0).toUpperCase() || '?');
    return `<div class="offer-row${mine?' mine':''}${isBest?' best':''}">
      <div class="offer-seller">
        <div class="offer-avatar">${initial}</div>
        <div class="offer-seller-info">
          <div class="offer-seller-name">${escapeHtml(sellerName)}${mine?' <span class="stat-pill">You</span>':''}${isBest?' <span class="offer-best-badge">Best</span>':''}</div>
          <div class="market-owned">${fmtG(l.quantity)} available</div>
        </div>
      </div>
      <div class="offer-price-block">
        <div class="offer-price">${l.pricePerUnit.toFixed(1)}g<span class="unit"> /ea</span></div>
      </div>
      <div class="market-actions">
        ${mine ? `<span style="font-size:11px;color:var(--dim);">Manage in My Listings</span>` : `
        <button class="mini-btn buy" ${state.gold>=buy1Cost && roomLeft>=1 ? '':'disabled'} onclick="buyFromListing('${l.id}',1)">Buy ×1</button>
        ${l.quantity>=10 ? `<button class="mini-btn buy" ${maxQty>=10?'':'disabled'} onclick="buyFromListing('${l.id}',10)">×10</button>` : ''}
        <button class="mini-btn buy" ${maxQty>0?'':'disabled'} onclick="buyFromListing('${l.id}',${Math.max(1,maxQty)})">Max (${Math.max(0,maxQty)})</button>`}
      </div>
    </div>`;
  }).join('');
  return subhead + rows;
}

function renderMarketDetailModal(key){
  const it = MARKET_CATALOG[key];
  if(!it) return '';
  return `
    <div class="modal-overlay" onclick="if(event.target===this)closeMarketDetail()">
      <div class="modal-box">
        <div class="modal-header"><h3>${it.icon} ${escapeHtml(it.name)} — offers</h3><button class="modal-close" onclick="closeMarketDetail()">✕</button></div>
        <div class="modal-body" style="padding:8px 20px 18px;">
          ${renderMarketDetailBody(key)}
        </div>
      </div>
    </div>`;
}

// Updates just the listing rows inside an already-open "Browse offers"
// modal, in place — WITHOUT touching the .modal-overlay/.modal-box
// wrapper. Those wrapper elements carry the fadeIn/slideUp CSS entrance
// animations (see style.css); a full renderBody() replaces #app's entire
// innerHTML, which destroys and recreates that wrapper too, restarting
// the animation from opacity:0 every time. That's what made the modal
// look like it was flashing/disappearing every ~15s as background price
// polls came back. Returns false (so the caller can fall back to a full
// renderBody()) if the modal isn't actually mounted right now.
function patchMarketDetailModal(key){
  const overlay = document.querySelector('.modal-overlay');
  if(!overlay) return false;
  const bodyEl = overlay.querySelector('.modal-body');
  if(!bodyEl) return false;
  bodyEl.innerHTML = renderMarketDetailBody(key);
  return true;
}

function renderSellModal(key){
  const it = MARKET_CATALOG[key];
  if(!it) return '';
  const owned = state.inv[key] || 0;
  const lastPrice = state.prices[key] || it.basePrice || 1;
  const mine = state.myListingsCache.filter(l => l.itemKey === key);
  const mineRows = mine.length ? mine.map(l => `
    <div class="market-row" style="padding:8px 0;">
      <div class="market-left"><div class="market-owned">Listed: ${fmtG(l.quantity)} @ ${l.pricePerUnit.toFixed(1)}g</div></div>
      <div class="market-actions"><button class="mini-btn sell" onclick="cancelListing('${l.id}')">✕ Cancel</button></div>
    </div>`).join('') : '';
  return `
    <div class="modal-overlay" onclick="if(event.target===this)closeSellModal()">
      <div class="modal-box">
        <div class="modal-header"><h3>${it.icon} Sell ${escapeHtml(it.name)}</h3><button class="modal-close" onclick="closeSellModal()">✕</button></div>
        <div class="modal-body">
          <div class="market-owned" style="margin-bottom:12px;">You own ${fmtG(owned)}</div>
          <div style="display:flex;gap:10px;margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--dim);display:block;margin-bottom:4px;">Quantity</label>
              <input type="number" id="sellQtyInput" class="username-input" style="margin-bottom:0;" min="1" max="${owned}" value="${Math.min(owned,1)}">
            </div>
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--dim);display:block;margin-bottom:4px;">Price per unit (g)</label>
              <input type="number" id="sellPriceInput" class="username-input" style="margin-bottom:0;" min="0.1" step="0.1" value="${lastPrice.toFixed(1)}">
            </div>
          </div>
          <button class="act-btn buy" ${(owned<1||listingSubmitInFlight)?'disabled':''} onclick="submitSellForm('${key}')">${listingSubmitInFlight?'Listing…':'List for sale'}</button>
          ${mineRows ? `<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:10px;"><div style="font-size:11px;color:var(--dim);margin-bottom:4px;">Your current listings of this item</div>${mineRows}</div>` : ''}
        </div>
      </div>
    </div>`;
}

function submitSellForm(key){
  if(listingSubmitInFlight) return; // already posting one — ignore extra clicks
  const qtyEl = document.getElementById('sellQtyInput');
  const priceEl = document.getElementById('sellPriceInput');
  const qty = qtyEl ? qtyEl.value : 0;
  const price = priceEl ? priceEl.value : 0;
  createListing(key, qty, price);
}


// ─── Companies & Class Rendering ───
function renderCompanies(){
  const cap = getStorageCap(state);
  const mgmtLevel = getCompanyManagementLevel(state.level);
  const maxAllowed = getMaxAllowedCompanies(state.level);
  const currentCount = state.companies.length;
  const canBuild = currentCount < MAX_COMPANIES && currentCount < maxAllowed;
  const nextConcreteCost = currentCount > 0 && currentCount < MAX_COMPANIES ? getConcreteCost(currentCount + 1) : 0;

  // Build modal
  let buildModal = '';
  if(state.companyBuildResource !== null){
    const chosenRes = state.companyBuildResource || COMPANY_RESOURCES[0];
    const it = ITEMS[chosenRes];
    const isFirstCompany = currentCount === 0;
    const hasConcrete = isFirstCompany || state.inv.concrete >= nextConcreteCost;
    const costText = isFirstCompany 
      ? '<span class="resource-chip" style="border-color:var(--green);color:var(--green);">🎁 Free!</span>'
      : `<span class="resource-chip" style="${hasConcrete?'border-color:var(--green);color:var(--green);':'border-color:var(--red);color:var(--red);'}">🧱 ${nextConcreteCost} Concrete</span>`;

    buildModal = `
      <div class="modal-overlay" onclick="if(event.target===this)cancelBuild()">
        <div class="modal-box">
          <div class="modal-header"><h3>🏗️ Build New Company</h3><button class="modal-close" onclick="cancelBuild()">✕</button></div>
          <div class="modal-body">
            <div style="font-size:12px;color:var(--dim);margin-bottom:12px;">Choose what resource this company will produce:</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;">
              ${COMPANY_RESOURCES.map(res => {
                const rIt = ITEMS[res];
                const active = res === chosenRes;
                return `<button class="mini-btn ${active?'buy':''}" style="padding:8px 4px;font-size:11px;${active?'background:rgba(255,195,92,0.14);':''}" onclick="selectBuildResource('${res}')">
                  <div style="font-size:18px;margin-bottom:2px;">${rIt.icon}</div><div>${rIt.name}</div>
                </button>`;
              }).join('')}
            </div>
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:40px;margin-bottom:6px;">${it.icon}</div>
              <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;color:var(--brass-bright);">${it.name}</div>
              <div style="font-size:11px;color:var(--dim);margin-top:4px;">Production: ${ENGINE_PRODUCTION[1]}/hour · Engine Lv.1</div>
            </div>
            <div style="margin-top:14px;text-align:center;">
              <div style="font-size:12px;color:var(--dim);margin-bottom:8px;">Cost: ${costText}</div>
              <button class="act-btn buy" style="width:100%;padding:12px;" ${hasConcrete?'':'disabled'} onclick="buildCompany()">
                ${hasConcrete ? `🏗️ Build ${it.name} Company` : 'Not Enough Concrete'}
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  // Company cards
  const companyCards = state.companies.map((c, idx) => {
    const it = ITEMS[c.resource];
    const rate = ENGINE_PRODUCTION[c.engineLevel];
    const maxCap = rate * 24;
    const pct = maxCap > 0 ? (c.stored / maxCap) * 100 : 0;
    const canCollect = c.stored >= 1 && !c.disabled;
    const space = cap - getTotalStorageUsed(state);
    const canUpgrade = c.engineLevel < 10;
    const upgradeCost = canUpgrade ? ENGINE_UPGRADE_COST[c.engineLevel + 1] : 0;
    const hasSteel = state.inv.steel >= upgradeCost;
    const menuOpen = state.companyMenuOpen === c.id;
    const isDisabled = c.disabled;
    const isChanging = state.companyChangeResourceId === c.id;

    const menuItems = [];
    menuItems.push({icon:'🔄', label:'Change production', action:`startChangeResource(${c.id});`, cls:''});

    if(canUpgrade){
      const ok = hasSteel ? '✓' : '✗';
      const okCls = hasSteel ? 'ok' : 'fail';
      menuItems.push({icon:`<img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️">`, label:'Upgrade automated engine', cost:`<img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️"> ${state.inv.steel}/${upgradeCost} ${ok}`, action:`upgradeEngine(${c.id});closeCompanyMenu();`, cls:hasSteel?'':'disabled', checkCls:okCls});
    } else {
      menuItems.push({icon:`<img class="ui-icon" src="${ICONS.settings_ui}" alt="⚙️">`, label:'Upgrade automated engine', cost:'Max level', action:'', cls:'disabled', checkCls:''});
    }

    if(idx > 0){
      menuItems.push({icon:`<img class="ui-icon" src="${ICONS.upgrade}" alt="⬆️">`, label:'Move to top', action:`moveCompanyToTop(${c.id});`, cls:''});
    }

    menuItems.push({icon:isDisabled?'▶️':'⏸️', label:isDisabled?'Enable company':'Disable company', action:`disableCompany(${c.id});`, cls:''});

    const menuHtml = menuOpen ? `
      <div class="company-menu" onclick="event.stopPropagation()">
        ${menuItems.map(item => `
          <div class="company-menu-item ${item.cls}" ${item.action ? `onclick="${item.action}"` : ''}>
            <span class="icon">${item.icon}</span>
            <span class="label">${item.label}</span>
            ${item.cost ? `<span class="check ${item.checkCls}">${item.cost}</span>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';

    const changeResourcePicker = isChanging ? `
      <div style="margin-top:10px;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;" onclick="event.stopPropagation()">
        <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Select new production (500g):</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
          ${COMPANY_RESOURCES.map(res => {
            const rIt = ITEMS[res];
            const active = res === c.resource;
            return `<button class="mini-btn ${active?'buy':''}" style="padding:6px 2px;font-size:10px;${active?'opacity:0.4;cursor:not-allowed;':''}" ${active?'disabled':''} onclick="selectChangeResource(${c.id},'${res}')">
              <div style="font-size:16px;">${rIt.icon}</div><div>${rIt.name}</div>
            </button>`;
          }).join('')}
        </div>
        <button class="mini-btn" style="width:100%;margin-top:8px;" onclick="cancelChangeResource()">Cancel</button>
      </div>
    ` : '';

    return `<div class="company-card" style="${isDisabled?'opacity:0.5;':''}${canCollect?'border-color:rgba(255,195,92,0.3);':''}">
      <button class="company-menu-btn" onclick="event.stopPropagation();toggleCompanyMenu(${c.id})"><img class="ui-icon" src="${ICONS.ellipsis}" alt="⋯"></button>
      ${menuHtml}
      <div class="company-header">
        <div class="company-icon">${it.icon}</div>
        <div class="company-info">
          <div class="company-name">${it.name}${isDisabled?' <span style="color:var(--dim);font-size:11px;">(paused)</span>':''}</div>
          <div class="company-meta">Company #${c.id} · Engine Lv.${c.engineLevel} · ${rate}/hr</div>
        </div>
      </div>
      <div class="company-bar"><div class="company-bar-fill ${pct>90?'warn':''}" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:4px;font-family:'JetBrains Mono',monospace;">
        <span>${Math.floor(c.stored)} stored</span>
        <span>${pct.toFixed(0)}% · ${maxCap} cap</span>
      </div>
      <button class="act-btn buy" style="width:100%;margin-top:10px;padding:10px;" ${(!canCollect || space<=0)?'disabled':''} onclick="collectFromCompany(${c.id})">
        ${space<=0?'❌ Storage Full':(canCollect?`📦 Collect ${Math.min(Math.floor(c.stored),space)} ${it.icon}`:'⏳ Nothing to Collect')}
      </button>
      ${changeResourcePicker}
    </div>`;
  }).join('');

  const buildSection = currentCount >= MAX_COMPANIES ? '' : `
    <div class="panel" style="text-align:center;padding:24px;background:radial-gradient(ellipse at center,rgba(255,195,92,0.06) 0%,transparent 70%);">
      <div style="font-size:36px;margin-bottom:8px;">🏗️</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);margin-bottom:6px;">Build New Company</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:12px;"><b>${currentCount}</b> / ${MAX_COMPANIES} companies · Management <b>Lv.${mgmtLevel}</b></div>
      ${canBuild ? `
        <div style="font-size:12px;color:var(--dim);margin-bottom:10px;">
          ${currentCount === 0 ? '<span class="resource-chip" style="border-color:var(--green);color:var(--green);">🎁 First company is FREE</span>' : `<span class="resource-chip">🧱 ${nextConcreteCost} Concrete</span>`}
          ${currentCount >= 2 ? `<span style="margin-left:8px;" class="resource-chip">🏭 Lv.${currentCount-1} Mgmt</span>` : ''}
        </div>
        <button class="act-btn buy" style="width:auto;padding:10px 24px;" onclick="openBuildSelector()">🏗️ Build Company</button>
      ` : `<div class="locked-tag"><img class="ui-icon" src="${ICONS.lock}" alt="🔒"> ${currentCount >= MAX_COMPANIES ? 'Maximum reached' : `Reach level ${(currentCount-1)*5} for next slot`}</div>`}
    </div>
  `;

  return `
    ${buildModal}
    <div class="section-title"><h2>🏭 Your Companies</h2><div class="sub">${currentCount}/${MAX_COMPANIES} companies · Collect below · ⋯ for more · 1-9 tabs</div></div>
    ${state.companies.length === 0 ? `
      <div class="panel" style="text-align:center;padding:32px;">
        <div style="font-size:48px;margin-bottom:12px;">🏭</div>
        <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:18px;color:var(--brass-bright);margin-bottom:8px;">No Companies Yet</div>
        <div style="font-size:13px;color:var(--dim);margin-bottom:16px;max-width:320px;margin-left:auto;margin-right:auto;">Build your first company to start automatic resource production.</div>
        ${canBuild ? `
          <div style="font-size:12px;color:var(--dim);margin-bottom:10px;">First company is <b>free</b> — pick any resource!</div>
          <button class="act-btn buy" style="width:auto;padding:12px 28px;font-size:14px;" onclick="openBuildSelector()">🏗️ Build First Company</button>
        ` : `<div class="locked-tag"><img class="ui-icon" src="${ICONS.lock}" alt="🔒"> Reach level ${(currentCount-1)*5} to unlock next slot</div>`}
      </div>
    ` : `<div class="grid">${companyCards}</div>`}
    ${buildSection}
  `;
}


function renderClass(){
  const backLink = `<button class="mini-btn" style="margin-bottom:12px;" onclick="activeTab='settings';renderBody();">← Back to Settings</button>`;
  if(!state.playerClass){
    return `
      ${backLink}
      <div class="section-title"><h2><img class="ui-icon" src="${ICONS.class_shield}" alt="🧙"> Select Your Class</h2><div class="sub">Each class has unique stats and 3 exclusive skills. You can change later for a gold cost.</div></div>
      <div class="class-select-grid">${Object.keys(CLASS_DATA).map(key=>{
        const c = CLASS_DATA[key];
        return `<div class="class-select-card" style="--cc:${c.color};" onclick="selectClass('${key}')">
          <div class="cs-icon">${c.icon}</div>
          <div class="cs-name">${c.nameAr}</div>
          <div class="cs-desc">${c.desc}</div>
          <div class="cs-stats">
            <span>HP <b>${(c.stats.hp*100).toFixed(0)}%</b></span>
            <span>ATK <b>${(c.stats.atk*100).toFixed(0)}%</b></span>
            <span>DEF <b>${(c.stats.def*100).toFixed(0)}%</b></span>
            <span>SPD <b>${(c.stats.spd*100).toFixed(0)}%</b></span>
          </div>
          <button class="cs-select-btn" onclick="event.stopPropagation();selectClass('${key}')">Select</button>
        </div>`;
      }).join('')}</div>`;
  }

  const cls = CLASS_DATA[state.playerClass];
  const stats = cls.stats;
  const canReset = canResetClass();
  const resetCost = getClassResetCost();
  const cooldownLeft = Math.max(0, 7*24*60*60*1000 - (Date.now() - state.lastClassReset));
  const cooldownText = cooldownLeft > 0 ? `${Math.floor(cooldownLeft/3600000)}h ${Math.floor((cooldownLeft%3600000)/60000)}m` : 'Ready';

  const skillCards = cls.skills.map((sk, idx)=>{
    const lvl = state.classSkills[sk.key] || 0;
    const maxed = lvl >= CLASS_SKILL_MAX;
    const nextCost = maxed ? 0 : CLASS_SKILL_COST_TABLE[lvl];
    const canUpgrade = !maxed && state.classSkillPoints >= nextCost;
    const pct = (lvl / CLASS_SKILL_MAX) * 100;

    // Build effect text
    let effects = [];
    Object.keys(sk.perLevel).forEach(ef=>{
      const val = sk.perLevel[ef];
      const total = val * lvl;
      const nextTotal = val * (lvl + 1);
      let label = '';
      if(ef==='dmgBonus') label = `+${(total*100).toFixed(0)}% damage`;
      else if(ef==='critBonus') label = `+${(total*100).toFixed(0)}% crit`;
      else if(ef==='defBonus') label = `+${total} defense`;
      else if(ef==='drBonus') label = `+${(total*100).toFixed(0)}% damage reduction`;
      else if(ef==='regenBonus') label = `+${(total*100).toFixed(0)}% HP regen`;
      else if(ef==='pierceBonus') label = `+${(total*100).toFixed(0)}% pierce`;
      else if(ef==='spdBonus') label = `+${total} speed`;
      else if(ef==='dodgeBonus') label = `+${(total*100).toFixed(0)}% dodge`;
      else if(ef==='energyReduction') label = `-${(total*100).toFixed(0)}% energy cost`;
      else if(ef==='energyBonus') label = `+${total} max energy`;
      else if(ef==='healPerTurn') label = `+${total} HP/turn`;
      else if(ef==='healBonus') label = `+${(total*100).toFixed(0)}% healing`;
      else if(ef==='hpBonus') label = `+${total} max HP`;
      else if(ef==='sellBonus') label = `+${(total*100).toFixed(0)}% sell price`;
      else if(ef==='goldCapBonus') label = `+${(total*100).toFixed(0)}% battle gold`;
      else if(ef==='lootBonus') label = `+${(total*100).toFixed(0)}% loot chance`;
      else if(ef==='magicResist') label = `+${(total*100).toFixed(0)}% magic resist`;
      effects.push(label);
    });

    const effectsHtml = effects.map(e=>`<span class="sk-effect-tag">${e}</span>`).join('');
    return `<div class="skill-card-v2 ${canUpgrade?'upgradable':''}" style="--sk:${cls.color};">
      <div class="sk-top">
        <div class="sk-icon-box">${sk.icon}</div>
        <div>
          <div class="sk-name">${sk.nameAr}</div>
          <div class="sk-level">Level ${lvl}/${CLASS_SKILL_MAX}</div>
        </div>
      </div>
      <div class="sk-bar-track"><div class="sk-bar-fill" style="width:${pct}%;"></div></div>
      <div class="sk-desc">${sk.desc}</div>
      <div class="sk-effects">${effectsHtml}</div>
      ${maxed ? '<div class="sk-maxed">✨ Maxed</div>' : `<button class="sk-upgrade-btn" ${canUpgrade?'':'disabled'} onclick="upgradeClassSkill('${sk.key}')">UPGRADE · ${nextCost} CSP</button>`}
    </div>`;
  }).join('');

  return `
    ${backLink}
    <div class="gear-hero-card" style="--tc:${cls.color};border-color:${cls.color}40;">
      <div class="gh-icon" style="background:linear-gradient(135deg,${cls.color},${cls.color}99);border-color:${cls.color};">${state.playerClass==='merchant'?`<img class="ui-icon" src="${ICONS.business}" alt="💰" style="width:100%;height:100%;object-fit:contain;">`:cls.icon}</div>
      <div class="gh-name" style="color:${cls.color};">${cls.nameAr}</div>
      <div class="gh-sub">${cls.name} · ${cls.desc}</div>
    </div>
    <div class="stat-overview-grid">
      <div class="stat-overview-box"><div class="label">❤️ HP</div><div class="value">${(stats.hp*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">⚔️ ATK</div><div class="value">${(stats.atk*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">🛡️ DEF</div><div class="value">${(stats.def*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">💨 SPD</div><div class="value">${(stats.spd*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">🎯 CRIT</div><div class="value">${(stats.crit*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">🌀 DODGE</div><div class="value">${(stats.dodge*100).toFixed(0)}%</div></div>
    </div>
    <div class="sp-banner" style="background:linear-gradient(135deg,${cls.color} 0%,${cls.color}99 100%);">
      <div class="sp-label"><img class="ui-icon" src="${ICONS.spellbook}" alt="🎯"> Class Skill Points</div>
      <div class="sp-value">${state.classSkillPoints}</div>
    </div>
    <div class="section-title"><h2><img class="ui-icon" src="${ICONS.spellbook}" alt="🎯"> Unique Skills</h2></div>
    <div class="skill-grid-v2">${skillCards}</div>
    <div class="panel" style="margin-top:16px;text-align:center;padding:20px;">
      <div style="font-size:24px;margin-bottom:8px;">🔄</div>
      <div class="panel-header" style="margin-bottom:6px;">Reset Class</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:12px;">Change your class. You will lose all class skill progress but regain the points spent.</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:10px;">Cooldown: ${cooldownText} · Resets: ${state.classResets}</div>
      <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:12px;">
        ${Object.keys(CLASS_DATA).filter(k=>k!==state.playerClass).map(k=>{
          const c = CLASS_DATA[k];
          return `<button class="mini-btn" style="border-color:${c.color};color:${c.color};" ${canReset?'':'disabled'} onclick="if(confirm('Reset to ${c.nameAr} ${c.icon} for ${fmtG(resetCost)}g?'))resetClass('${k}')">${c.icon} ${c.nameAr}</button>`;
        }).join('')}
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--dim);">Cost: <b style="color:var(--brass-bright);">${fmtG(resetCost)}g</b></div>
    </div>
  `;
}


// ─── Skills, Missions, Leaderboard, Settings, Log ───
const SKILL_COLORS = {
  health: '#d44c4c', damage: '#e8bd6e', defense: '#6fa285',
  stamina: '#7ab8d4', storage: '#b8a0d4', profit: '#d4a24c',
};

function renderSkills(){
  // ── Top stat overview strip ──
  const maxH = getMaxHealth(state);
  const maxE = getMaxEnergy(state);
  const overview = [
    { icon:`<img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️">`, label:'Health', value: Math.floor(maxH) },
    { icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔️">`, label:'Attack', value: playerPower(state) },
    { icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡️">`, label:'Defense', value: `${(getDamageReduction(state)*100).toFixed(0)}%` },
    { icon:`<img class="ui-icon" src="${ICONS.energy}" alt="🔋">`, label:'Energy', value: maxE },
    { icon:`<img class="ui-icon" src="${ICONS.bag_full}" alt="📦">`, label:'Storage', value: getStorageCap(state) },
    { icon:'💰', label:'Profit', value: `+${((getSellMult(state)-1)*100).toFixed(0)}%` },
  ].map(o=>`<div class="stat-overview-box"><div class="label">${o.icon} ${o.label}</div><div class="value">${o.value}</div></div>`).join('');

  const cards = Object.keys(SKILLS).map(key=>{
    const sk = SKILLS[key];
    const lvl = state.skills[key];
    const cost = lvl + 1;
    const canUpgrade = state.skillPoints >= cost && lvl < sk.max;
    const maxed = lvl >= sk.max;
    const pct = (lvl / sk.max) * 100;
    const color = SKILL_COLORS[key];
    let effects = [];
    if(key === 'health'){
      effects.push(`+${lvl*sk.perLevel} HP`);
      if(!maxed) effects.push(`next +${(lvl+1)*sk.perLevel} HP`);
    } else if(key === 'damage'){
      effects.push(`+${lvl*sk.perLevel} DMG`);
      if(!maxed) effects.push(`next +${(lvl+1)*sk.perLevel} DMG`);
    } else if(key === 'defense'){
      effects.push(`-${(lvl*sk.perLevel*100).toFixed(0)}% dmg taken`);
      if(!maxed) effects.push(`next -${((lvl+1)*sk.perLevel*100).toFixed(0)}%`);
    } else if(key === 'stamina'){
      const reduction = Math.min(0.5, lvl*0.03);
      effects.push(`+${lvl*sk.perLevel} energy`);
      effects.push(`-${(reduction*100).toFixed(0)}% cost`);
    } else if(key === 'storage'){
      effects.push(`+${lvl*sk.perLevel} storage`);
      if(!maxed) effects.push(`next +${(lvl+1)*sk.perLevel}`);
    } else if(key === 'profit'){
      effects.push(`+${(lvl*sk.perLevel*100).toFixed(0)}% profit`);
      if(!maxed) effects.push(`next +${((lvl+1)*sk.perLevel*100).toFixed(0)}%`);
    }
    const effectsHtml = effects.map(e=>`<span class="sk-effect-tag">${e}</span>`).join('');

    return `<div class="skill-card-v2 ${canUpgrade?'upgradable':''}" style="--sk:${color};">
      <div class="sk-top">
        <div class="sk-icon-box">${sk.icon}</div>
        <div>
          <div class="sk-name">${sk.name}</div>
          <div class="sk-level">Level ${lvl}/${sk.max}</div>
        </div>
      </div>
      <div class="sk-bar-track"><div class="sk-bar-fill" style="width:${pct}%;"></div></div>
      <div class="sk-desc">${sk.desc}</div>
      <div class="sk-effects">${effectsHtml}</div>
      ${maxed
        ? '<div class="sk-maxed">✨ Maxed</div>'
        : `<button class="sk-upgrade-btn" ${canUpgrade?'':'disabled'} onclick="upgradeSkill('${key}')">UPGRADE · ${cost} SP</button>`}
    </div>`;
  }).join('');

  return `
    <button class="mini-btn" style="margin-bottom:12px;" onclick="activeTab='settings';renderBody();">← Back to Settings</button>
    <div class="stat-overview-grid">${overview}</div>
    <div class="sp-banner">
      <div class="sp-label"><img class="ui-icon" src="${ICONS.spellbook}" alt="🎯"> Skill Points</div>
      <div class="sp-value">${state.skillPoints}</div>
    </div>
    <div class="skill-grid-v2">${cards}</div>
    <div class="panel" style="margin-top:14px;padding:14px 16px;">
      <div style="font-size:12px;color:var(--dim);">Earn 1 skill point with every new level. Spend wisely.</div>
    </div>`;
}

function renderMissions(){
  if(!state.missions) initMissions();

  const activeTab = state.activeMissionTab || 'daily';
  const mData = state.missions || {};

  const tabs = [
    { id:'daily', label:'Daily', icon:'📅', data: mData.daily, pool: DAILY_MISSIONS },
    { id:'weekly', label:'Weekly', icon:'📅', data: mData.weekly, pool: WEEKLY_MISSIONS },
    { id:'starting', label:'Starting', icon:`<img class="ui-icon" src="${ICONS.star_coin}" alt="⭐">`, data: mData.starting, pool: STARTING_MISSIONS },
  ];

  const tabHtml = tabs.map(t => {
    const d = t.data || { completed:0, claimed:[], progress:{}, lastReset:0 };
    const completed = d.claimed ? d.claimed.length : 0;
    const total = t.pool.length;
    const isActive = activeTab === t.id;
    const isDone = completed >= total;
    const pct = total > 0 ? (completed/total)*100 : 0;

    return `
      <div class="mission-tab ${isActive?'active':''} ${isDone?'done':''}" onclick="state.activeMissionTab='${t.id}';renderBody();">
        <div class="mission-tab-header">
          <span class="mission-tab-icon">${t.icon}</span>
          <span class="mission-tab-label">${t.label}</span>
          ${isDone?'<span class="mission-tab-check">✓</span>':''}
        </div>
        <div class="mission-tab-bar-track">
          <div class="mission-tab-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="mission-tab-count">${completed}/${total}</div>
        ${t.id!=='starting'?`<div class="mission-tab-timer">⏳ ${hmsUntil(d.lastReset||0)}</div>`:''}
      </div>
    `;
  }).join('');

  const current = tabs.find(t=>t.id===activeTab);
  const pool = current.pool;
  const data = current.data || { progress:{}, claimed:[] };

  const rows = pool.map(m => {
    const target = missionTarget(m, state.level);
    const reward = missionReward(m, state.level);
    const title = missionTitle(m, state.level);
    const progress = data.progress[m.id] || 0;
    const isClaimed = data.claimed.includes(m.id);
    const isComplete = progress >= target;
    const pct = Math.min(100, (progress/target)*100);

    const rewards = [];
    if(reward.xp) rewards.push(`<span class="mission-reward-xp">✨ ${reward.xp}</span>`);
    if(reward.gold) rewards.push(`<span class="mission-reward-gold"><img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙"> ${reward.gold}</span>`);

    return `
      <div class="mission-card ${isClaimed?'claimed':''} ${isComplete&&!isClaimed?'ready':''}">
        <div class="mission-icon">${m.icon}</div>
        <div class="mission-body">
          <div class="mission-title">${title}</div>
          <div class="mission-progress-bar-track">
            <div class="mission-progress-bar-fill" style="width:${pct}%"></div>
            <span class="mission-progress-text">${progress}/${target}</span>
          </div>
        </div>
        <div class="mission-rewards">${rewards.join('')}</div>
        <div class="mission-action">
          ${isClaimed 
            ? `<button class="mission-btn claimed" disabled>CLAIMED</button>`
            : isComplete 
              ? `<button class="mission-btn claim" onclick="claimMissionReward('${m.id}','${activeTab}')">CLAIM</button>`
              : `<button class="mission-btn arrow" onclick="goToMissionTarget('${m.track}')">→</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  const totalCompleted = (current.data?.claimed?.length || 0);
  const totalAll = pool.length;

  return `
    <div class="missions-container">
      <div class="missions-header">
        <h2>Missions</h2>
        <span class="missions-sub">${totalCompleted}/${totalAll} completed</span>
      </div>
      <div class="missions-tabs">${tabHtml}</div>
      <div class="missions-list">${rows}</div>
    </div>
  `;
}

function renderLeaderboard(){
  if(!db){
    return `<div class="lb-note">🔌 Leaderboard needs a cloud connection. Sign in with Google to compete on the real, server-wide leaderboard.</div>`;
  }
  if(leaderboardLoading && !leaderboardByGold){
    return `<div class="lb-note">Loading leaderboard…</div>`;
  }
  if(leaderboardError && !leaderboardByGold){
    return `
      <div class="lb-note">⚠️ ${leaderboardError}</div>
      <button class="btn btn-secondary" style="margin-top:8px;" onclick="refreshLeaderboard()">Retry</button>`;
  }
  const tbl = (list, valueKey)=> `
    <table class="lb-table">
      <tr><th>#</th><th>Player</th><th>${valueKey==='gold'?'Gold':valueKey==='level'?'Level':'Wins'}</th></tr>
      ${list.map((r,i)=>`<tr class="${r.me?'me':''}"><td class="lb-rank">${i+1}</td><td><span style="cursor:pointer;color:var(--brass-bright);" onclick="viewChatProfile('${r.uid}')">${escapeHtml(r.me?'You':r.name)}</span></td><td>${valueKey==='gold'?fmtG(r.gold)+'g':valueKey==='level'?r.level:r.pvpWins}</td></tr>`).join('')}
    </table>`;
  return `
    <div class="lb-note">🌐 Live server-wide leaderboard, top ${LEADERBOARD_SIZE} players.
      <span style="cursor:pointer;color:var(--brass-bright);" onclick="refreshLeaderboard()">↻ Refresh</span>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));">
      <div class="panel"><div class="section-title" style="margin-top:0;"><h2>🥇 Richest</h2></div>${tbl(leaderboardByGold||[],'gold')}</div>
      <div class="panel"><div class="section-title" style="margin-top:0;"><h2>🥈 Highest Level</h2></div>${tbl(leaderboardByLevel||[],'level')}</div>
      <div class="panel"><div class="section-title" style="margin-top:0;"><h2>⚔️ Most PvP Wins</h2></div>${tbl(leaderboardByPvpWins||[],'pvpWins')}</div>
    </div>`;
}

function settingsRow(icon, title, sub, onclick, danger){
  return `
    <div class="settings-row${danger?' danger':''}" onclick="${onclick}">
      <div class="settings-row-icon">${icon}</div>
      <div class="settings-row-body">
        <div class="settings-row-title">${title}</div>
        ${sub ? `<div class="settings-row-sub">${sub}</div>` : ''}
      </div>
      <div class="settings-row-chevron">›</div>
    </div>`;
}

function renderSettings(){
  const p = state.prestige;
  const canPrest = canPrestige(state);
  const isGuest = !!(auth && auth.currentUser && auth.currentUser.isAnonymous);
  const classInfo = CLASS_DATA[state.playerClass] || null;
  const className = classInfo ? classInfo.name : 'Adventurer';
  const classIcon = classInfo ? classInfo.icon : '🧭';

  return `
    <div class="grid" style="grid-template-columns:1fr;">

      <!-- Profile Hero -->
      <div class="profile-hero" style="cursor:pointer;" onclick="showPlayerProfile()">
        <div class="profile-hero-top">
          <div class="profile-hero-avatar">${state.avatar || '🧙'}</div>
          <div>
            <div class="profile-hero-name">${state.username || 'Player'}</div>
            <div class="profile-hero-sub">Level ${state.level} · ${classIcon} ${className}</div>
          </div>
        </div>
        <div class="profile-hero-stats">
          <div class="profile-hero-stat"><div class="num">${fmtG(state.gold)}g</div><div class="lbl">Gold</div></div>
          <div class="profile-hero-divider"></div>
          <div class="profile-hero-stat"><div class="num" style="color:var(--green);">${state.combat.wins}</div><div class="lbl">Wins</div></div>
          <div class="profile-hero-divider"></div>
          <div class="profile-hero-stat"><div class="num" style="color:var(--red);">${state.combat.losses}</div><div class="lbl">Losses</div></div>
        </div>
        <div class="profile-hero-info" style="min-width:0;">
          <span style="font-size:15px;flex-shrink:0;">${isGuest ? '🎮' : '✉️'}</span>
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><b>${isGuest ? 'Guest Account' : (EMAIL || 'Linked Account')}</b> ${state.bio ? '· '+state.bio : ''}</span>
        </div>
      </div>

      <!-- PROFILE -->
      <div>
        <div class="settings-group-label">Profile</div>
        <div class="settings-list">
          ${settingsRow('👤','Personal Details','Avatar, name & bio','openPersonalDetailsModal()')}
          ${settingsRow('🎨','Appearance','Theme, language & accent','openPreferencesModal()')}
          ${settingsRow('🏆','Stats & Achievements','Session totals','openAchievementsModal()')}
        </div>
      </div>

      <!-- CHARACTER -->
      <div>
        <div class="settings-group-label">Character</div>
        <div class="settings-list">
          ${settingsRow(classIcon,'Class',`${className} · Unique skills`,`activeTab='class';renderBody();`)}
          ${settingsRow(`<img class="ui-icon" src="${ICONS.spellbook}" alt="🎯">`,'Skills','Spend skill points',`activeTab='skills';renderBody();`)}
        </div>
      </div>

      <!-- ACCOUNT -->
      <div>
        <div class="settings-group-label">Account</div>
        <div class="settings-list">
          ${settingsRow('🔐','Login & Security', isGuest ? 'Playing as guest' : ('Linked to '+EMAIL), 'openSecurityModal()')}
          ${settingsRow('📊','Data & Backup','Export, import or clear local data','openDataModal()')}
        </div>
      </div>

      <!-- GAME -->
      <div>
        <div class="settings-group-label">Game</div>
        <div class="settings-list">
          ${settingsRow('✨','Prestige', canPrest ? 'Ready — Spiritual Renewal available' : `Requires level ${PRESTIGE_LEVEL_REQ}`, 'openPrestigeModal()')}
          ${settingsRow('ℹ️','About','Version, credits & support','openAboutModal()')}
          ${settingsRow('🗑️','Erase All Progress','Permanently delete saved data — cannot be undone','if(confirm(\'Erase all progress? This cannot be undone.\'))hardReset()', true)}
        </div>
      </div>

    </div>`;
}

// ===== PROFILE FUNCTIONS =====

function changeAvatar(avatarEmoji) {
    state.avatar = avatarEmoji;
    scheduleSave();
    renderHeader();
    renderBody();
    showToast('Success', 'Avatar updated', 'win');
}

function changeLanguage(lang) {
    state.language = lang;
    localStorage.setItem('arcadia_language', lang);
    showToast('Updated', lang === 'ar' ? 'Language: Arabic' : 'Language: English', 'win');
    renderBody();
    scheduleSave();
}

async function changeUsername(newName) {
    newName = newName.trim();
    if (newName.length < 3) {
        showToast('Error', 'Username must be at least 3 characters', 'lose');
        return;
    }
    if (!/^[a-zA-Z0-9_\u0600-\u06FF]+$/.test(newName)) {
        showToast('Error', 'Contains invalid characters', 'lose');
        return;
    }
    if (newName === state.username) return;
    try {
        if (db) {
            const oldName = state.username;
            const newNameRef = db.collection('usernames').doc(newName);
            const playerRef = db.collection('players').doc(UID);
            await db.runTransaction(async (tx) => {
                const nameDoc = await tx.get(newNameRef);
                if (nameDoc.exists) {
                    const err = new Error('This name was just taken by another player.');
                    err.code = 'username-taken';
                    throw err;
                }
                if (oldName) {
                    tx.delete(db.collection('usernames').doc(oldName));
                }
                tx.set(newNameRef, { uid: UID });
                tx.update(playerRef, { username: newName });
            });
        }
        state.username = newName;
        window.__playerUsername = newName;
        showToast('Success', `Username changed to ${newName}`, 'win');
        renderHeader();
        renderBody();
        scheduleSave();
    } catch (e) {
        if (e.code === 'username-taken') {
            showToast('Error', 'Username already taken', 'lose');
        } else {
            showToast('Error', 'Failed to change username', 'lose');
        }
        console.error(e);
    }
}

// ===== SETTINGS MODALS =====

function showModal(title, bodyHtml) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function openPersonalDetailsModal() {
    const avatarOptions = ['🧙', '⚔️', '🏹', '🔮', '💚', '💰', '🐉', '🐺', '🦅', '🛡️'];
    const avatarHtml = avatarOptions.map(a => `
        <button class="mini-btn ${state.avatar === a ? 'buy' : ''}"
                onclick="changeAvatar('${a}');this.closest('.modal-body').querySelectorAll('.mini-btn').forEach(b=>b.classList.remove('buy'));this.classList.add('buy');"
                style="font-size:22px;padding:6px 10px;">
            ${a}
        </button>`).join('');

    const body = `
        <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">📷 Choose your avatar:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${avatarHtml}</div>
        </div>
        <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">Display name</div>
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="font-family:'Cairo',sans-serif;font-weight:700;color:var(--text);">${state.username || 'Player'}</div>
                <button class="mini-btn buy" onclick="openNameModal()">✏️ Change</button>
            </div>
        </div>
        <div>
            <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">📝 Bio</div>
            <input type="text" class="username-input" id="bioInput" value="${state.bio || ''}" maxlength="60"
                   placeholder="Write something about yourself..."
                   oninput="state.bio=this.value;scheduleSave();renderHeader();"
                   style="padding:8px 12px;font-size:13px;">
        </div>
    `;
    showModal('👤 Personal Details', body);
}

function openPreferencesModal() {
    const themeOptions = `
        <button class="mini-btn ${state.theme === 'dark' ? 'buy' : ''}" onclick="changeTheme('dark');this.closest('.modal-overlay').remove();openPreferencesModal();">🌙 Dark</button>
        <button class="mini-btn ${state.theme === 'light' ? 'buy' : ''}" onclick="changeTheme('light');this.closest('.modal-overlay').remove();openPreferencesModal();">☀️ Light</button>
    `;
    const fontSizeOptions = ['small', 'medium', 'large'].map(size => `
        <button class="mini-btn ${state.fontSize === size ? 'buy' : ''}"
                onclick="changeFontSize('${size}');this.closest('.modal-overlay').remove();openPreferencesModal();">
            ${size.charAt(0).toUpperCase() + size.slice(1)}
        </button>`).join('');
    const accentColors = ['#d4a24c', '#4a8cc4', '#6fa285', '#c44c4c', '#b8a0d4'];
    const accentHtml = accentColors.map(color => `
        <button class="mini-btn ${state.accentColor === color ? 'buy' : ''}"
                onclick="changeAccentColor('${color}');this.closest('.modal-overlay').remove();openPreferencesModal();"
                style="background:${color};width:30px;height:30px;border-radius:50%;border:2px solid ${state.accentColor === color ? 'var(--brass)' : 'var(--border)'};padding:0;"
                title="${color}"></button>`).join('');
    const langHtml = `
        <button class="mini-btn ${state.language === 'ar' ? 'buy' : ''}" onclick="changeLanguage('ar');this.closest('.modal-overlay').remove();openPreferencesModal();">🇸🇦 Arabic</button>
        <button class="mini-btn ${state.language === 'en' ? 'buy' : ''}" onclick="changeLanguage('en');this.closest('.modal-overlay').remove();openPreferencesModal();">🇬🇧 English</button>
    `;

    const body = `
        <div style="margin-bottom:16px;">
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;"><img class="ui-icon" src="${ICONS.globe}" alt="🌐"> Language</div>
            <div style="display:flex;gap:8px;">${langHtml}</div>
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;">🎨 Theme</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${themeOptions}</div>
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;">Font Size</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${fontSizeOptions}</div>
        </div>
        <div>
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;">Accent Color</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${accentHtml}</div>
        </div>
    `;
    showModal('🎨 Appearance', body);
}

function openAchievementsModal() {
    const body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px;color:var(--dim);">
            <div>🪙 Gold: <b style="color:var(--text);">${fmtG(state.gold)}</b></div>
            <div>🏅 Level: <b style="color:var(--text);">${state.level}</b></div>
            <div>⚔️ Wins: <b style="color:var(--green);">${state.combat.wins}</b></div>
            <div>💀 Losses: <b style="color:var(--red);">${state.combat.losses}</b></div>
            <div>🎒 Gear Items: <b style="color:var(--text);">${state.gearBag.length}</b></div>
            <div>🔷 Shards: <b style="color:var(--text);">${state.shards}</b></div>
            <div>💎 Gems: <b style="color:var(--text);">${state.gems}</b></div>
            <div><img class="ui-icon" src="${ICONS.spellbook}" alt="🎯"> Skill Points: <b style="color:var(--text);">${state.skillPoints}</b></div>
            <div>💰 Total Gold Earned: <b style="color:var(--text);">${fmtG(state.totalGoldEarned)}</b></div>
            <div>🤝 Total Donated to Alliances: <b style="color:var(--text);">${fmtG(state.totalAllianceDonated || 0)}</b></div>
            <div>✨ Prestige Points: <b style="color:var(--prestige);">${state.prestige.points}</b></div>
        </div>
    `;
    showModal('🏆 Stats & Achievements', body);
}

function openSecurityModal() {
    const isGuest = !!(auth && auth.currentUser && auth.currentUser.isAnonymous);
    const body = isGuest ? `
        <p style="font-size:12.5px;color:var(--dim);margin-bottom:14px;">You are playing as a guest. Link your Google account to save progress and play across devices.</p>
        <button class="act-btn buy" style="width:auto;padding:8px 16px;font-size:12px;" onclick="linkGoogleAccount()">🔗 Link Google Account</button>
    ` : `
        <p style="font-size:12.5px;color:var(--dim);margin-bottom:14px;">Account linked to <b style="color:var(--text);">${EMAIL}</b></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="act-btn skill" style="width:auto;padding:8px 16px;font-size:12px;" onclick="changePassword()">🔒 Reset Password</button>
            <button class="act-btn red" style="width:auto;padding:8px 16px;font-size:12px;" onclick="if(confirm('Delete your account permanently?'))deleteAccount()">🗑️ Delete Account</button>
        </div>
    `;
    showModal('🔐 Login & Security', body);
}

function openDataModal() {
    const body = `
        <p style="font-size:12.5px;color:var(--dim);margin-bottom:14px;">Manage your locally saved game data.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="mini-btn buy" onclick="exportData()">📥 Export Data</button>
            <button class="mini-btn" onclick="document.getElementById('importInput').click()">📤 Import Data</button>
            <input type="file" id="importInput" accept=".json" style="display:none;" onchange="importData(this.files[0])">
            <button class="mini-btn red" onclick="if(confirm('Clear all local data?'))clearLocalData()">🗑️ Clear Local</button>
        </div>
    `;
    showModal('📊 Data & Backup', body);
}

function openPrestigeModal() {
    const p = state.prestige;
    const canPrest = canPrestige(state);
    const body = `
        <div style="text-align:center;">
            <div style="font-size:36px;margin-bottom:6px;">✨</div>
            <div style="font-size:12.5px;color:var(--dim);margin-bottom:12px;">At level ${PRESTIGE_LEVEL_REQ}, restart for permanent bonuses. Your gear stays with you! Companies will be reset.</div>
            <div style="max-width:300px;margin:0 auto 14px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:4px;">
                    <span>Progress to Prestige</span><span>${state.level} / ${PRESTIGE_LEVEL_REQ}</span>
                </div>
                <div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${Math.min(100,(state.level/PRESTIGE_LEVEL_REQ)*100)}%;background:var(--prestige);"></div></div>
            </div>
            <div style="font-size:12.5px;color:var(--dim);margin-bottom:4px;">Current Prestige Points: <b style="color:var(--prestige);">${p.points}</b></div>
            <div style="font-size:12.5px;color:var(--dim);margin-bottom:12px;">Total Gold Earned: <b style="color:var(--text);">${fmtG(state.totalGoldEarned)}g</b></div>
            ${canPrest ? `<div style="color:var(--prestige);margin:8px 0;font-size:13px;">🎉 You will gain <b>${Math.floor(state.level/5) + Math.floor(state.totalGoldEarned/5000)}</b> prestige points!</div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:14px 0;">
                <div class="bonus-tag">+${p.gatherBonus} gather</div>
                <div class="bonus-tag">+${(p.sellBonus*100).toFixed(0)}% sell</div>
                <div class="bonus-tag">+${p.energyBonus} max energy</div>
                <div class="bonus-tag">+${p.storageBonus} storage</div>
            </div>
            <button class="act-btn prestige ${canPrest?'animate-pulse':''}" style="width:auto;padding:12px 28px;font-size:13px;" ${canPrest?'':'disabled'} onclick="doPrestige();this.closest('.modal-overlay').remove();">
                ${canPrest ? '✨ Spiritual Renewal' : `🔒 Requires level ${PRESTIGE_LEVEL_REQ}`}
            </button>
        </div>
    `;
    showModal('✨ Prestige — Spiritual Renewal', body);
}

function openAboutModal() {
    const body = `
        <div style="font-size:12.5px;color:var(--dim);">
            <div><b>Version:</b> v1.0.0</div>
            <div><b>Developer:</b> Arcadia MMO Team</div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button class="mini-btn" onclick="alert('Report a bug: arcadia@email.com')">🐛 Report Bug</button>
                <button class="mini-btn buy" onclick="alert('Send feedback: arcadia@email.com')">💡 Feedback</button>
            </div>
        </div>
    `;
    showModal('ℹ️ About', body);
}

function openNameModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3>✏️ Change Username</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom:12px;">
                    <label style="font-size:13px;color:var(--dim);">Current name: <b style="color:var(--text);">${state.username}</b></label>
                </div>
                <input type="text" id="newUsernameInput" class="username-input" 
                       placeholder="Enter new username..." maxlength="15"
                       style="margin-bottom:8px;">
                <div id="nameError" style="color:var(--red);font-size:12px;display:none;"></div>
                <div id="nameSuccess" style="color:var(--green);font-size:12px;display:none;">✓ Username available!</div>
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" id="confirmNameBtn" onclick="confirmNameChange()">Confirm Change</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const input = document.getElementById('newUsernameInput');
    let nameCheckTimeout = null;
    input.addEventListener('input', function() {
        const val = this.value.trim();
        const errorEl = document.getElementById('nameError');
        const successEl = document.getElementById('nameSuccess');
        const confirmBtn = document.getElementById('confirmNameBtn');

        clearTimeout(nameCheckTimeout);
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        confirmBtn.disabled = true;

        if (val.length < 3) {
            errorEl.textContent = 'Username must be at least 3 characters';
            errorEl.style.display = 'block';
            return;
        }
        if (!/^[a-zA-Z0-9_\u0600-\u06FF]+$/.test(val)) {
            errorEl.textContent = 'Contains invalid characters';
            errorEl.style.display = 'block';
            return;
        }
        if (val === state.username) {
            errorEl.textContent = 'This is your current username';
            errorEl.style.display = 'block';
            return;
        }

        nameCheckTimeout = setTimeout(async () => {
            try {
                if (db) {
                    const doc = await db.collection('usernames').doc(val).get();
                    if (doc.exists) {
                        errorEl.textContent = '❌ Username already taken';
                        errorEl.style.display = 'block';
                        return;
                    }
                }
                successEl.style.display = 'block';
                confirmBtn.disabled = false;
            } catch(e) {
                errorEl.textContent = 'Connection error, try again';
                errorEl.style.display = 'block';
            }
        }, 400);
    });
}

async function confirmNameChange() {
    const input = document.getElementById('newUsernameInput');
    const newName = input.value.trim();
    if (!newName) return;
    const modal = document.querySelector('.modal-overlay');
    await changeUsername(newName);
    if (modal) modal.remove();
}

// ===== DATA FUNCTIONS =====

function exportData() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arcadia_save.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Success', 'Data exported!', 'win');
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('This will replace your current progress. Continue?')) {
                state = migrateState(data);
                scheduleSave();
                render();
                showToast('Success', 'Data imported!', 'win');
            }
        } catch(err) {
            showToast('Error', 'Invalid file format', 'lose');
        }
    };
    reader.readAsText(file);
}

function clearLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    render();
    scheduleSave();
    showToast('Cleared', 'Local data cleared', 'win');
}

// ===== SECURITY FUNCTIONS =====

function changePassword() {
    if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
        showToast('Error', 'Guest accounts cannot change password. Link Google account first.', 'lose');
        return;
    }
    try {
        auth.sendPasswordResetEmail(auth.currentUser.email);
        showToast('Sent', `Password reset email sent to ${auth.currentUser.email}`, 'win');
    } catch(e) {
        showToast('Error', 'Failed to send reset email', 'lose');
    }
}

async function deleteAccount() {
    if (!auth || !auth.currentUser) return;
    if (!confirm('Are you sure? This will permanently delete your account and all progress!')) return;
    if (!confirm('This cannot be undone. Are you absolutely sure?')) return;
    
    try {
        // Delete Firestore data
        if (db) {
            await db.collection('players').doc(UID).delete();
            if (state.username) {
                await db.collection('usernames').doc(state.username).delete();
            }
        }
        // Delete auth account
        await auth.currentUser.delete();
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    } catch(e) {
        showToast('Error', 'Failed to delete account: ' + e.message, 'lose');
    }
}
function renderLog(){
  const el = document.getElementById('log-panel');
  if(el) el.innerHTML = renderLogHTML();
}

function renderLogHTML(){
  return state.log.slice().reverse().map(l=>`<div class="log-line ${l.cls}"><span class="t">${timeLabel(l.t)}</span>${l.text}</div>`).join('') || '<div class="log-line">Nothing yet.</div>';
}



/* ===== MISSING CONSTANTS ===== */

// ─── Misc Render Helpers ───
const BREAD_TIERS = {
  toasted_bread:     { name:'Toasted Bread',     heal:25 },
  honey_bread:       { name:'Honey Bread',       heal:50 },
  legendary_bread:   { name:'Legendary Bread',   heal:100 },
};

const ENERGY_POTION_TIERS = {
  small_energy_potion:    { name:'Small Energy Potion',    energy:15 },
  medium_energy_potion:   { name:'Medium Energy Potion',   energy:35 },
  large_energy_potion:    { name:'Large Energy Potion',    energy:80 },
  legendary_energy_potion:{ name:'Legendary Energy Potion',energy:200 },
};

const MAX_COMPANIES = 9;
const COMPANY_RESOURCES = ['wood','stone','food','coal','iron','gold','cotton','leather','sand','gemstones','water','salt','copper','silver','zinc','lead','magic_stones','herbs','honey'];
const ENGINE_PRODUCTION = [0, 10, 15, 22, 32, 45, 60, 80, 105, 135, 170];
const ENGINE_UPGRADE_COST = [0, 5, 10, 20, 35, 55, 80, 110, 150, 200, 280];

/* ===== UTILITY FUNCTIONS ===== */
function fmtG(n){
  if(typeof n !== 'number' || isNaN(n)) n = 0;
  if(n===0) return '0';
  if(n>=1000000) return (n/1000000).toFixed(1)+'M';
  if(n>=1000) return (n/1000).toFixed(1)+'K';
  return n.toLocaleString();
}
function timeLabel(ts){
  const d=new Date(ts);
  return d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}
function hmsUntil(ts){
  const diff=Math.max(0,ts-Date.now());
  const h=Math.floor(diff/3600000);
  const m=Math.floor((diff%3600000)/60000);
  const s=Math.floor((diff%60000)/1000);
  return `${h}h ${m}m ${s}s`;
}
/* ===== COMPANY HELPERS ===== */

// ─── Zone Rendering ───
function renderZonesTab(){
  // Kingdom Map / Active Wars sub-tabs disabled for now (territory.js not
  // loaded) — re-add the toggle bar + zoneSubTab branches when that's back.
  return state.zoneView ? renderZoneView() : renderZones();
}

function renderZones(){
  return `<div class="wrap animate-fade">
    <div class="section-title"><h2>🗺️ Realm Explorer</h2><span class="rule"></span><div class="sub">Select a zone to enter</div></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));">
      ${ZONES.map(z=>{
        const locked = state.level < z.levelMin;
        const monsterCount = (ZONE_MONSTERS[z.id]||[]).length;
        return `<div onclick="${locked?'':'enterZoneView(\''+z.id+'\')'}" 
          style="background:var(--panel-light);border:1px solid var(--border);border-radius:10px;cursor:${locked?'not-allowed':'pointer'};opacity:${locked?0.5:1};transition:all 0.2s;position:relative;overflow:hidden;"
          onmouseover="if(!${locked}){this.style.borderColor='var(--brass)';this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.25)'}"
          onmouseout="if(!${locked}){this.style.borderColor='var(--border)';this.style.transform='translateY(0)';this.style.boxShadow='none'}">
          <div style="width:100%;aspect-ratio:16/10;background:linear-gradient(135deg,${z.color}55,${z.color}15);display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img class="zone-banner-img" src="${ICONS['zone_'+z.id]||''}" alt="${z.icon}" style="width:100%;height:100%;object-fit:cover;" onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px;',textContent:'${z.icon}'}))">
          </div>
          <div style="padding:14px;">
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:14px;color:var(--brass-bright);margin-bottom:8px;">${z.name}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
              <span style="background:var(--panel-inset);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:${z.color};">Lv.${z.levelMin}${z.levelMax?'-'+z.levelMax:'+'}</span>
              <span style="background:var(--panel-inset);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">🐾 ${monsterCount}</span>
            </div>
            ${locked
              ? `<div style="background:var(--panel-inset);border-radius:6px;padding:8px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--copper);">🔒 Requires Lv.${z.levelMin}</div>`
              : `<div style="background:var(--panel-inset);border-radius:6px;padding:8px;text-align:center;font-family:'Cairo',sans-serif;font-weight:700;font-size:12px;color:var(--brass-bright);">View</div>`}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderZoneView(){
  const z = ZONES.find(x=>x.id===state.zoneView);
  if(!z) return '';
  const resources = ZONE_RESOURCES[z.id]||[];
  const monsters = ZONE_MONSTERS[z.id]||[];
  const tierColors = {common:'var(--tier-common)',uncommon:'var(--tier-uncommon)',rare:'var(--tier-rare)',epic:'var(--tier-epic)',legendary:'var(--tier-legendary)',mythic:'var(--tier-mythic)'};
  
  return `<div class="wrap animate-fade">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button class="act-btn" style="width:auto;padding:6px 12px;font-size:11px;" onclick="goBackFromZone()">← Back to Zones</button>
      <div style="font-size:28px;">${z.icon}</div>
      <div>
        <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:17px;color:var(--brass-bright);">${z.name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">Lv. ${z.levelMin} · ${resources.length} resources · ${monsters.length} threats</div>
      </div>
    </div>

    <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:14px;color:var(--green);margin-bottom:8px;">⚒️ Resources</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));margin-bottom:20px;">
      ${resources.map(rid=>{
        const r = RESOURCES[rid];
        if(!r) return '';
        const tier = r.tier || 'common';
        const canGather = state.energy >= 5;
        return `<div class="card" style="padding:14px;text-align:center;">
          <div style="font-size:30px;margin-bottom:6px;">${r.icon}</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;">${r.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${tierColors[tier]};text-transform:uppercase;margin:4px 0;">${tier}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:8px;">${r.basePrice}g base</div>
          <button class="act-btn green" onclick="collect('${rid}')" ${canGather?'':'disabled'}>Gather (-5⚡)</button>
        </div>`;
      }).join('')}
    </div>

    <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:14px;color:var(--red);margin-bottom:8px;">⚔️ Monsters</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">
      ${monsters.map(m=>{
        const canFight = state.energy >= z.energyCost && state.health > 0;
        return `<div class="card" style="padding:14px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="font-size:32px;">${m.icon}</div>
            <div>
              <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;">${m.name}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">HP ${m.hp} · ATK ${m.a} · Lv.${m.level}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:10px;">
            <span class="stat-pill">${m.xp} XP</span>
            <span class="stat-pill">${m.g}g</span>
          </div>
          <button class="act-btn red" onclick="startBattle('${z.id}')" ${canFight?'':'disabled'}>
            ${canFight?'Fight (-'+z.energyCost+'⚡)':'Need ⚡/HP'}
          </button>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
// ===== THEME FUNCTIONS =====

function changeTheme(theme) {
    state.theme = theme;
    applyTheme(theme);
    scheduleSave();
    showToast('Updated', `Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, 'win');
    renderBody();
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.style.setProperty('--bg', '#f0ece4');
        root.style.setProperty('--panel', '#e8e0d5');
        root.style.setProperty('--panel-light', '#f5f0e8');
        root.style.setProperty('--text', '#1a1522');
        root.style.setProperty('--dim', '#5a5068');
        root.style.setProperty('--border', '#c8bdb0');
        // يمكنك إضافة المزيد من المتغيرات حسب الحاجة
    } else {
        // العودة إلى القيم الافتراضية (الموجودة في :root)
        root.style.setProperty('--bg', '#0a0d12');
        root.style.setProperty('--panel', '#131922');
        root.style.setProperty('--panel-light', '#1d2530');
        root.style.setProperty('--text', '#eef1f5');
        root.style.setProperty('--dim', '#7e8b9a');
        root.style.setProperty('--border', '#1c2530');
    }
    applyAccentColor(state.accentColor);
}

function changeFontSize(size) {
    state.fontSize = size;
    applyFontSize(size);
    scheduleSave();
    showToast('Updated', `Font size: ${size}`, 'win');
}

function applyFontSize(size) {
    const root = document.documentElement;
    const sizes = { small: '12px', medium: '15px', large: '18px' };
    root.style.fontSize = sizes[size] || '15px';
}

function changeAccentColor(color) {
    state.accentColor = color;
    applyAccentColor(color);
    scheduleSave();
    showToast('Updated', 'Accent color changed', 'win');
}

function applyAccentColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--brass', color);
    root.style.setProperty('--brass-bright', color);
    root.style.setProperty('--green', color);
    // يمكنك تعديل الألوان المشتقة حسب الرغبة
}


/* ===== PLAYER PROFILE MODAL ===== */

function showPlayerProfile(playerData){
  // playerData can be: { username, avatar, level, class, wins, losses, gold, allianceName, allianceRole, bio, gearCount }
  // If no data provided, show current player
  const isSelf = !playerData;
  const p = playerData || {
    username: state.username || 'Player',
    avatar: state.avatar || '🧙',
    level: state.level,
    playerClass: state.playerClass,
    wins: state.combat.wins,
    losses: state.combat.losses,
    gold: state.gold,
    allianceName: null, // Would need to fetch from alliance system
    allianceRole: null,
    bio: state.bio || '',
    gearCount: state.gearBag.length,
    totalGoldEarned: state.totalGoldEarned,
    prestigePoints: state.prestige.points,
  };

  const cls = p.playerClass ? CLASS_DATA[p.playerClass] : null;
  const clsColor = cls ? cls.color : '#d4a24c';
  const clsName = cls ? cls.nameAr : 'Adventurer';
  const clsIcon = cls ? cls.icon : '🧭';

  const allianceHtml = p.allianceName ? `
    <div class="pp-alliance">
      <div class="pp-alliance-icon">🏛️</div>
      <div>
        <div class="pp-alliance-name">${p.allianceName}</div>
        <div class="pp-alliance-role">${p.allianceRole || 'Member'}</div>
      </div>
    </div>
  ` : '';

  const bioHtml = p.bio ? `<div class="pp-bio">"${p.bio}"</div>` : '';

  const body = `
    <div class="pp-container">
      <!-- Header -->
      <div class="pp-header" style="--cls:${clsColor};">
        <div class="pp-avatar-ring">
          <div class="pp-avatar">${p.avatar}</div>
        </div>
        <div class="pp-info">
          <div class="pp-name">${p.username}</div>
          <div class="pp-level-class">
            <span class="pp-lvl">Lv.${p.level}</span>
            <span class="pp-sep">·</span>
            <span class="pp-class" style="color:${clsColor};">${clsIcon} ${clsName}</span>
          </div>
        </div>
      </div>

      ${bioHtml}
      ${allianceHtml}

      <!-- Stats Grid -->
      <div class="pp-stats-grid">
        <div class="pp-stat-box">
          <div class="pp-stat-icon">🪙</div>
          <div class="pp-stat-val">${fmtG(p.gold)}</div>
          <div class="pp-stat-label">Gold</div>
        </div>
        <div class="pp-stat-box">
          <div class="pp-stat-icon" style="color:var(--green);">⚔️</div>
          <div class="pp-stat-val" style="color:var(--green);">${p.wins}</div>
          <div class="pp-stat-label">Wins</div>
        </div>
        <div class="pp-stat-box">
          <div class="pp-stat-icon" style="color:var(--red);">💀</div>
          <div class="pp-stat-val" style="color:var(--red);">${p.losses}</div>
          <div class="pp-stat-label">Losses</div>
        </div>
        <div class="pp-stat-box">
          <div class="pp-stat-icon" style="color:var(--prestige);">✨</div>
          <div class="pp-stat-val" style="color:var(--prestige);">${p.prestigePoints || 0}</div>
          <div class="pp-stat-label">Prestige</div>
        </div>
        <div class="pp-stat-box">
          <div class="pp-stat-icon" style="color:var(--brass-bright);">💰</div>
          <div class="pp-stat-val" style="color:var(--brass-bright);">${fmtG(p.totalGoldEarned || p.gold)}</div>
          <div class="pp-stat-label">Total Earned</div>
        </div>
        <div class="pp-stat-box">
          <div class="pp-stat-icon" style="color:var(--skill);">🎒</div>
          <div class="pp-stat-val" style="color:var(--skill);">${p.gearCount || 0}</div>
          <div class="pp-stat-label">Gear Items</div>
        </div>
      </div>

      <!-- Win Rate -->
      <div class="pp-winrate">
        <div class="pp-winrate-label">Win Rate</div>
        <div class="pp-winrate-bar-track">
          <div class="pp-winrate-bar-fill" style="width:${p.wins + p.losses > 0 ? (p.wins/(p.wins+p.losses)*100) : 0}%"></div>
          <span class="pp-winrate-text">${p.wins + p.losses > 0 ? Math.round(p.wins/(p.wins+p.losses)*100) : 0}%</span>
        </div>
      </div>

      ${isSelf ? '' : `
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="act-btn" style="flex:1;" onclick="showToast('Coming Soon','Private messaging will be available soon!','win')">💬 Message</button>
        </div>
      `}
    </div>
  `;

  showModal(isSelf ? '👤 Your Profile' : `👤 ${p.username}`, body);
}
