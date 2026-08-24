function rollTier(playerLevel){
  const weights = [];
  GEAR_TIERS.forEach((t,i)=>{
    if(playerLevel < t.minLevel) weights.push(0);
    else if(i===0) weights.push(60);
    else if(i===1) weights.push(25);
    else if(i===2) weights.push(10);
    else if(i===3) weights.push(3.5);
    else if(i===4) weights.push(1.2);
    else weights.push(0.3);
  });
  const total = weights.reduce((a,b)=>a+b,0);
  let roll = Math.random()*total;
  for(let i=0;i<weights.length;i++){
    roll -= weights[i];
    if(roll <= 0) return i;
  }
  return 0;
}

function generateGear(slot, tierIdx){
  const tier = GEAR_TIERS[tierIdx];
  const name = GEAR_NAMES[slot][tierIdx];
  const stats = {};
  const chosen = [...STAT_POOL].sort(()=>Math.random()-0.5).slice(0, tier.numStats);
  chosen.forEach(stat=>{
    const baseVal = SKILLS[stat].perLevel * (1 + Math.floor(Math.random()*3));
    stats[stat] = Math.max(1, Math.round(baseVal * tier.power));
  });
  const gear = { id: Date.now()+Math.random(), slot, tier: tierIdx, upgradeLevel: 0, name, stats };
  gear.sellValue = tier.sellMin + Math.floor(Math.random()*(tier.sellMax-tier.sellMin));
  return gear;
}

function getGearEffectiveStats(gear){
  if(!gear) return {};
  const result = {};
  Object.keys(gear.stats).forEach(st=>{
    result[st] = Math.round(gear.stats[st] * (1 + gear.upgradeLevel * 0.1));
  });
  return result;
}

function getGearBonus(s, stat){
  let total = 0;
  Object.values(s.equipped).forEach(item=>{
    if(!item) return;
    const eff = getGearEffectiveStats(item);
    if(eff[stat]) total += eff[stat];
  });
  return total;
}

function getGearValue(gear){
  if(!gear) return 0;
  if(gear.sellValue) return Math.round(gear.sellValue * (1 + gear.upgradeLevel * 0.15));
  const t = GEAR_TIERS[gear.tier];
  let val = t.sellMin + Math.floor(Math.random()*(t.sellMax-t.sellMin));
  return Math.round(val * (1 + gear.upgradeLevel * 0.15));
}

function getGearScrapValue(gear){
  const t = GEAR_TIERS[gear.tier];
  return Math.max(1, Math.floor((t.sellMin + t.sellMax) / 2 / 15));
}

let state = null;
let saveTimer = null;
let activeTab = 'production';
let forgeOpen = false;
let forgeSlot = null;
let forgeTier = null;
let forgeSearch = '';
let forgeRailTier = null;
let customWeaponName = '';
let bagSelected = null;

function selectBagItem(id){
  bagSelected = (bagSelected === id) ? null : id;
  renderBody();
}

// If a Market item exists with the same slot ("sub") and the same name as a
// Forge recipe (e.g. CRAFTABLE_GEAR.armor tier1 "Iron Armor" ↔
// MARKET_CATALOG.armor_iron "Iron Armor"), reuse its real image icon in the
// Forge instead of the recipe's plain emoji placeholder. sizePx controls the
// rendered size explicitly (the source images aren't a fixed size, so we
// don't rely on font-size/intrinsic size). Falls back to the recipe's own
// emoji when no matching Market item (or no image) exists.
function forgeRecipeIcon(slot, recipe, sizePx){
  const match = Object.values(MARKET_CATALOG).find(it => it.sub === slot && it.name === recipe.name);
  if(match && typeof match.icon === 'string' && match.icon.includes('<img')){
    const srcMatch = match.icon.match(/src="([^"]+)"/);
    if(srcMatch){
      const alt = (match.icon.match(/alt="([^"]*)"/) || [,recipe.name])[1];
      return `<img src="${srcMatch[1]}" alt="${alt}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;vertical-align:middle;image-rendering:pixelated;image-rendering:crisp-edges;">`;
    }
  }
  return recipe.icon;
}


// ─── Gear Rendering ───
function renderGear(){
  const forgeButton = `
    <div class="forge-cta">
      <div class="forge-anvil"><img class="ui-icon" src="${ICONS.craft}" alt="⚒️" style="width:48px;height:48px;"></div>
      <div class="forge-title">The Forge</div>
      <div class="forge-desc">Craft powerful gear from gathered materials. 36 recipes across 6 tiers.</div>
      <button class="forge-open-btn" onclick="openForge()">Open Forge</button>
      <div class="forge-bag-count">Backpack: <b>${getTotalStorageUsed(state)}</b> / ${getStorageCap(state)}</div>
    </div>`;

  const gearMarketButton = `
    <div class="forge-cta">
      <div class="forge-anvil"><img class="ui-icon" src="${ICONS.market_chart}" alt="⚔️" style="width:48px;height:48px;"></div>
      <div class="forge-title">Gear Market</div>
      <div class="forge-desc">Buy and sell real crafted gear with other players — the item, its exact stats and upgrade level, hand to hand.</div>
      <button class="forge-open-btn" onclick="openGearMarket()">Open Gear Market</button>
    </div>`;

  let forgeModal = '';
  if(forgeOpen && forgeSlot === null){
    // Elevator tier rail: pick a tier on the left, see every slot's recipe for
    // that tier on the right, each row showing craftability at a glance.
    if(forgeRailTier === null){
      let defaultIdx = 0;
      GEAR_TIERS.forEach((t,i)=>{ if(state.level >= t.minLevel) defaultIdx = i; });
      forgeRailTier = defaultIdx;
    }
    const searchLower = forgeSearch.trim().toLowerCase();
    const railTier = GEAR_TIERS[forgeRailTier];

    const railButtons = GEAR_TIERS.map((t, idx) => idx).reverse().map(idx=>{
      const t = GEAR_TIERS[idx];
      const active = idx === forgeRailTier;
      return `<button class="forge-tier-rail-btn ${active?'active':''}" style="--tc:${t.color};" onclick="setForgeRailTier(${idx})" title="${t.name}">${t.symbol}</button>`;
    }).join('');

    const tierRows = Object.keys(CRAFTABLE_GEAR).map(slot=>{
      const r = CRAFTABLE_GEAR[slot][forgeRailTier];
      if(!r || (searchLower && !r.name.toLowerCase().includes(searchLower))) return '';
      const info = GEAR_SLOTS[slot];
      const locked = state.level < r.levelReq;
      const hasInputs = Object.keys(r.inputs).every(inp=> state.inv[inp] >= r.inputs[inp]);
      const statusClass = locked ? 'locked' : (hasInputs ? 'ok' : 'missing');
      const statusLabel = locked ? `🔒 Lv.${r.levelReq}` : (hasInputs ? 'craft ok' : 'missing');
      return `<div class="forge-tier-row" onclick="selectForgeItem('${slot}',${forgeRailTier})">
        <div class="ftr-icon">${forgeRecipeIcon(slot, r, 26)}</div>
        <div class="ftr-info">
          <div class="ftr-name">${r.name}</div>
          <div class="ftr-slot">${info.icon} ${info.name}</div>
        </div>
        <div class="ftr-status ${statusClass}">${statusLabel}</div>
      </div>`;
    }).join('');
    const hasResults = tierRows.trim().length > 0;

    forgeModal = `
      <div class="modal-overlay" onclick="if(event.target===this)closeForge()">
        <div class="modal-box forge-modal">
          <div class="modal-header">
            <h3>⚒️ The Forge</h3>
            <button class="modal-close" onclick="closeForge()">✕</button>
          </div>
          <div class="modal-body">
            <input type="text" class="market-search" placeholder="Search gear by name..." value="${forgeSearch}" oninput="setForgeSearch(this.value)" style="width:100%;margin-bottom:12px;">
            <div class="forge-tier-rail-wrap">
              <div class="forge-tier-rail">${railButtons}</div>
              <div class="forge-tier-panel">
                <div class="forge-tier-panel-header" style="color:${railTier.color};">${railTier.symbol} ${railTier.name} tier — all slots</div>
                ${hasResults ? tierRows : `<div style="text-align:center;color:var(--dim);padding:20px;">No gear matches your search.</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }
  if(forgeOpen && forgeSlot !== null){
    const slotInfo = GEAR_SLOTS[forgeSlot];
    const recipe = CRAFTABLE_GEAR[forgeSlot][forgeTier];
    const tier = GEAR_TIERS[forgeTier];
    const locked = state.level < recipe.levelReq;
    const hasInputs = Object.keys(recipe.inputs).every(inp=> state.inv[inp] >= recipe.inputs[inp]);
    const cost = getEnergyCost(state, recipe.energyCost);
    const hasEnergy = state.energy >= cost;
    const bagFull = getTotalStorageUsed(state) >= getStorageCap(state);

    const tierButtons = CRAFTABLE_GEAR[forgeSlot].map((r, idx)=>{
      const t = GEAR_TIERS[idx];
      const active = idx === forgeTier;
      const tierLocked = state.level < r.levelReq;
      return `<button class="mini-btn ${active?'buy':''}" style="${active?'background:rgba(255,195,92,0.14);':''}color:${t.color};border-color:${t.color};${tierLocked?'opacity:0.4;':''}" onclick="selectForgeTier(${idx})" ${tierLocked?'disabled':''} title="Lv.${r.levelReq}">[${t.symbol}]</button>`;
    }).join('');

    const canCraft = !locked && hasInputs && hasEnergy && !bagFull;
    const stateClass = canCraft ? 'ready' : (!hasEnergy ? 'blocked-energy' : (bagFull ? 'blocked-space' : 'blocked-mats'));
    const energyChip = `<span class="resource-chip" style="border-color:${hasEnergy?'var(--brass-bright)':'var(--red)'};color:${hasEnergy?'var(--brass-bright)':'var(--red)'};"><img class="ui-icon" src="${ICONS.energy}" alt="⚡">${cost}</span>`;
    const inputsHtml = Object.keys(recipe.inputs).map(inp=>{
      const have = state.inv[inp] || 0;
      const need = recipe.inputs[inp];
      const enough = have >= need;
      return `<span class="resource-chip" style="border-color:${enough?'var(--green)':'var(--red)'};color:${enough?'var(--green)':'var(--red)'};">${ITEMS[inp].icon} ${fmtG(have)}/${fmtG(need)}</span>`;
    }).join(' ');

    forgeModal = `
      <div class="modal-overlay" onclick="if(event.target===this)closeForge()">
        <div class="modal-box forge-modal">
          <div class="modal-header">
            <h3>⚒️ Forge — ${slotInfo.icon} ${slotInfo.name}</h3>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="mini-btn" onclick="backToForgeGrid()">← All Gear</button>
              <button class="modal-close" onclick="closeForge()">✕</button>
            </div>
          </div>
          <div class="modal-body">
            <div style="margin-bottom:14px;">
              <div class="req-label">Select Tier</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">${tierButtons}</div>
            </div>

            <div class="card recipe-card ${stateClass}" style="--tc:${tier.color};">
              <div class="xp-badge">+${recipe.xp}XP</div>
              <div class="card-top">
                <div class="card-icon-box">${forgeRecipeIcon(forgeSlot, recipe, 30)}</div>
                <div>
                  <div class="card-name" style="color:${tier.color};">[${tier.symbol}] ${customWeaponName.trim() || recipe.name}</div>
                  <div class="card-sub">Lv.${recipe.levelReq} required</div>
                </div>
              </div>
              <div class="req-label">Requires</div>
              <div style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:5px;">${energyChip}${inputsHtml}</div>
              ${locked ? `<div class="locked-tag" style="text-align:center;padding:10px;"><img class="ui-icon" src="${ICONS.lock}" alt="🔒"> Requires player level ${recipe.levelReq}</div>` :
                `<button class="act-btn ${canCraft?'buy':''}" style="width:100%;" ${!canCraft?'disabled':''} onclick="craftGear('${forgeSlot}',${forgeTier})">
                  ${bagFull ? `<img class="ui-icon" src="${ICONS.bag_full}" alt="🎒"> Bag Full` : (!hasInputs ? '❌ Missing Materials' : (!hasEnergy ? `<img class="ui-icon" src="${ICONS.energy}" alt="⚡"> Not Enough Energy` : `🔨 Forge ${customWeaponName.trim() || recipe.name}`))}
                </button>`}
            </div>

            <div style="margin:12px 0;">
              <div class="req-label">Name your item</div>
              <input type="text" class="market-search" maxlength="24" placeholder="${recipe.name}" value="${customWeaponName}" oninput="setCustomWeaponName(this.value)" style="width:100%;">
            </div>

            <div style="font-size:11px;color:var(--dim);text-align:center;">Backpack: <b>${getTotalStorageUsed(state)}</b> / ${getStorageCap(state)}</div>
          </div>
        </div>
      </div>`;
  }

  function renderSlotBox(slot){
    const info = GEAR_SLOTS[slot];
    const item = state.equipped[slot];
    if(!item){
      return `<div class="pd-slot gear-equip-box empty">
        <div class="ge-icon">${info.icon}</div>
        <div class="ge-slot">${info.name}</div>
        <div class="ge-name" style="color:var(--dim);">Empty</div>
      </div>`;
    }
    const t = GEAR_TIERS[item.tier];
    const effStats = getGearEffectiveStats(item);
    const topStatKey = Object.keys(effStats)[0];
    const topStatVal = effStats[topStatKey];
    const topStatDisplay = topStatKey==='defense'||topStatKey==='profit' ? `+${(topStatVal*100).toFixed(0)}%` : `+${topStatVal}`;
    return `<div class="pd-slot gear-equip-box" style="--tc:${t.color};">
      <div class="ge-icon">${info.icon}</div>
      <div class="ge-slot">${info.name}</div>
      <div class="ge-name">[${t.symbol}] ${item.name} +${item.upgradeLevel}</div>
      <div class="ge-stat">${topStatDisplay} ${SKILLS[topStatKey].name}</div>
      <button class="ge-unequip" onclick="unequipGear('${slot}')">Unequip</button>
    </div>`;
  }
  const leftSlots = ['helmet','armor','gloves'];
  const rightSlots = ['weapon','boots','accessory'];
  const leftHtml = leftSlots.map(renderSlotBox).join('');
  const rightHtml = rightSlots.map(renderSlotBox).join('');

  const bagTiles = state.gearBag.map(item=>{
    const t = GEAR_TIERS[item.tier];
    const info = GEAR_SLOTS[item.slot];
    return `<div class="gear-inv-tile ${bagSelected===item.id?'selected':''}" style="--tc:${t.color};" onclick="selectBagItem(${item.id})">
      <div class="it-icon">${info.icon}</div>
      <div class="it-name">${item.name}</div>
      <div class="it-badge">${t.symbol} +${item.upgradeLevel}</div>
    </div>`;
  }).join('');

  let bagDetail = '';
  const selectedItem = bagSelected !== null ? state.gearBag.find(g=>g.id===bagSelected) : null;
  if(selectedItem){
    const item = selectedItem;
    const t = GEAR_TIERS[item.tier];
    const effStats = getGearEffectiveStats(item);
    const statsHtml = Object.keys(effStats).map(st=>{
      const val = effStats[st];
      const label = SKILLS[st].name;
      const display = st==='defense'||st==='profit' ? `+${(val*100).toFixed(0)}%` : `+${val}`;
      return `<div class="fp-row"><span>${label}</span><span style="color:var(--green);">${display}</span></div>`;
    }).join('');
    const canUpgrade = item.upgradeLevel < t.maxUpgrade;
    const nextReq = canUpgrade ? UPGRADE_TABLE[item.upgradeLevel] : null;
    const canAfford = nextReq && state.shards >= nextReq.shards && state.gold >= nextReq.gold && state.gems >= nextReq.gems;
    const scrapValue = getGearScrapValue(item);
    bagDetail = `
      <div class="forge-preview-v2" style="border-color:${t.color};">
        <div class="fp-title" style="color:${t.color};">${GEAR_SLOTS[item.slot].icon} [${t.symbol}] ${item.name} <span class="upgrade-badge">+${item.upgradeLevel}</span></div>
        <div class="tier-badge" style="background:rgba(255,255,255,0.05);color:${t.color};border:1px solid ${t.color};margin-bottom:8px;">${t.name}</div>
        ${statsHtml}
        ${nextReq ? `<div class="fp-row"><span>Upgrade to +${item.upgradeLevel+1}</span><span class="fp-arrow">${nextReq.shards}\ud83d\udd37 \u00b7 ${nextReq.gold}\ud83e\udd47${nextReq.gems?` \u00b7 ${nextReq.gems}\ud83d\udc8e`:''} \u00b7 ${(nextReq.chance*100).toFixed(0)}%</span></div>` : ''}
        <div class="fp-actions">
          <button class="mini-btn buy" onclick="equipGear(${item.id})">Equip</button>
          ${canUpgrade ? `<button class="mini-btn" style="border-color:${t.color};color:${t.color};" ${canAfford?'':'disabled'} onclick="upgradeGear(${item.id})">Upgrade</button>` : ''}
          <button class="mini-btn" style="border-color:var(--brass-bright);color:var(--brass-bright);" onclick="openGearSellModal(${item.id})">List on Market</button>
          <button class="mini-btn sell" onclick="sellGear(${item.id})">Sell (instant, ${getGearValue(item)}g)</button>
          <button class="mini-btn" onclick="destroyGear(${item.id})">Scrap +${scrapValue}\ud83d\udd37</button>
        </div>
      </div>`;
  }

  const totalGearStats = {};
  Object.keys(SKILLS).forEach(st=>{
    const bonus = getGearBonus(state, st);
    if(bonus > 0) totalGearStats[st] = bonus;
  });
  const totalStatsHtml = Object.keys(totalGearStats).length > 0
    ? Object.keys(totalGearStats).map(st=>{
        const val = totalGearStats[st];
        const label = SKILLS[st].name;
        const display = st==='defense'||st==='profit' ? `+${(val*100).toFixed(0)}%` : `+${val}`;
        return `<span class="bonus-tag">${label} ${display}</span>`;
      }).join('')
    : '<span style="color:var(--dim);font-size:12px;">No gear equipped</span>';

  const upgradeRows = UPGRADE_TABLE.map(u=>`
    <tr>
      <td>+${u.level}</td>
      <td><img class="ui-icon" src="${ICONS.shard}" alt="🔷"> ${u.shards}</td>
      <td><img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙"> ${u.gold}</td>
      <td>${u.gems ? `<img class="ui-icon" src="${ICONS.gem}" alt="💎"> `+u.gems : '-'}</td>
      <td>${(u.chance*100).toFixed(0)}%</td>
    </tr>
  `).join('');

  const cls = state.playerClass ? CLASS_DATA[state.playerClass] : null;
  const cp = getPlayerCombatStats();
  const powerScore = Math.round(cp.atk*3 + cp.hp/4 + cp.def*2000);

  return `
    ${forgeModal}
    <div class="section-title"><h2>🛡️ Equipped Gear</h2></div>
    <div class="paperdoll">
      <div class="pd-col left">${leftHtml}</div>
      <div class="pd-center">
        <div class="pd-ring-wrap"><div class="pd-char">${cls ? cls.icon : '🧙'}</div></div>
        <div class="pd-name">${window.__playerUsername || 'Player'}</div>
        <div class="pd-sub">Lv.${state.level} ${cls ? '· '+cls.nameAr : ''} · Power: <b>${fmtG(powerScore)}</b></div>
      </div>
      <div class="pd-col right">${rightHtml}</div>
    </div>
    <div class="panel" style="margin-top:12px;">
      <div style="font-size:13px;color:var(--dim);margin-bottom:8px;">Total equipped gear bonuses:</div>
      <div class="bonus-row" style="justify-content:flex-start;">${totalStatsHtml}</div>
    </div>
    <div class="section-title"><h2>⚒️ Forge</h2><div class="sub">Craft gear from materials</div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">${forgeButton}${gearMarketButton}</div>
    <div class="section-title"><h2>Inventory (${state.gearBag.length})</h2></div>
    ${state.gearBag.length === 0 ? '<div class="panel" style="text-align:center;color:var(--dim);padding:20px;">Bag is empty. Defeat monsters to find gear, forge your own, or buy some on the Gear Market!</div>' : `<div class="gear-inv-grid-v2">${bagTiles}</div>`}
    ${bagDetail}
    ${state.gearMarketOpen ? renderGearMarketModal() : ''}
    ${state.gearMarketSellItem !== null ? renderGearSellModal(state.gearMarketSellItem) : ''}
    <div class="panel" style="overflow-x:auto;margin-top:14px;">
      <div class="panel-header"><img class="ui-icon" src="${ICONS.upgrade_scroll}" alt="📈"> Upgrade Table</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:10px;margin-top:-4px;">Failure downgrades by 1 (except +0)</div>
      <table class="upgrade-table">
        <tr><th>Level</th><th>Shards</th><th>Gold</th><th>Gems</th><th>Success</th></tr>
        ${upgradeRows}
      </table>
    </div>
    <div class="panel" style="margin-top:12px;">
      <div style="font-size:12px;color:var(--dim);line-height:1.6;">
        <b>Tier Limits:</b> Common (+0), Uncommon (+1), Rare (+2), Epic (+3), Legendary (+5), Mythic (+7)<br>
        <b>Shards</b> drop from every battle win. <b>Gems</b> are rare drops. Higher tier gear has more stats and higher base power.
      </div>
    </div>
  `;
}


// ─── Gear Actions (forge, equip, upgrade, sell, destroy) ───
function openForge(){ forgeOpen=true; forgeSlot=null; forgeTier=null; customWeaponName=''; forgeSearch=''; forgeRailTier=null; renderBody(); }
function closeForge(){ forgeOpen=false; forgeSlot=null; forgeTier=null; customWeaponName=''; forgeSearch=''; forgeRailTier=null; renderBody(); }
function backToForgeGrid(){ forgeSlot=null; forgeTier=null; customWeaponName=''; renderBody(); }
function selectForgeItem(slot, idx){ forgeSlot=slot; forgeTier=idx; customWeaponName=''; renderBody(); }
function selectForgeTier(idx){ forgeTier=idx; renderBody(); }
function setForgeRailTier(idx){ forgeRailTier=idx; renderBody(); }
function setForgeSearch(val){
  forgeSearch = val;
  const activeInput = document.querySelector('.modal-box.forge-modal .market-search');
  const selStart = activeInput ? activeInput.selectionStart : null;
  const selEnd = activeInput ? activeInput.selectionEnd : null;
  renderBody();
  const newInput = document.querySelector('.modal-box.forge-modal .market-search');
  if(newInput){
    newInput.focus();
    if(selStart !== null){
      try{ newInput.setSelectionRange(selStart, selEnd); }catch(e){}
    }
  }
}
function setCustomWeaponName(val){ customWeaponName = val; }
function craftGear(slot, tier){
  const recipe = CRAFTABLE_GEAR[slot][tier];
  if(state.level < recipe.levelReq) return;
  const cost = getEnergyCost(state, recipe.energyCost);
  if(state.energy < cost){ pushLog(state, 'Not enough energy!', 'lose'); return; }
  if(getTotalStorageUsed(state) >= getStorageCap(state)){ pushLog(state, 'Backpack full!', 'lose'); return; }
  for(const inp in recipe.inputs){ if(state.inv[inp] < recipe.inputs[inp]){ pushLog(state, `Missing ${ITEMS[inp].name}!`, 'lose'); return; } }
  for(const inp in recipe.inputs){ state.inv[inp] -= recipe.inputs[inp]; }
  state.energy -= cost;
  const finalName = customWeaponName.trim() || recipe.name;
  const gear = { ...recipe, name: finalName, id: Date.now()+Math.random(), slot, tier, upgradeLevel: 0, stats: {} };
  // Generate stats based on tier
  const t = GEAR_TIERS[tier];
  const chosen = [...STAT_POOL].sort(()=>Math.random()-0.5).slice(0, t.numStats);
  chosen.forEach(st=>{
    const baseVal = SKILLS[st].perLevel * (1 + Math.floor(Math.random()*3));
    gear.stats[st] = Math.max(1, Math.round(baseVal * t.power));
  });
  gear.sellValue = t.sellMin + Math.floor(Math.random()*(t.sellMax-t.sellMin));
  state.gearBag.push(gear);
  const leveled = grantXp(state, recipe.xp);
  updateMissionProgress('gear_crafted', 1);
  pushLog(state, `Forged [${t.symbol}] ${finalName}!`, 'gear');
  if(leveled){ pushLog(state, `Level up! You are now level ${state.level}`, 'levelup'); showToast(`<img class="ui-icon" src="${ICONS.levelup_badge}" alt="🆙"> Level Up!`, `Level ${state.level}`, 'levelup'); }
  customWeaponName = '';
  renderBody(); scheduleSave();
}
function equipGear(id){
  const idx = state.gearBag.findIndex(g=>g.id===id);
  if(idx < 0) return;
  const gear = state.gearBag[idx];
  const old = state.equipped[gear.slot];
  if(old) state.gearBag.push(old);
  state.equipped[gear.slot] = gear;
  state.gearBag.splice(idx, 1);
  updateMissionProgress('gear_equipped', 1);
  pushLog(state, `Equipped ${gear.name}`, 'gear');
  renderBody(); scheduleSave();
}
function unequipGear(slot){
  const gear = state.equipped[slot];
  if(!gear) return;
  if(getTotalStorageUsed(state) >= getStorageCap(state)){ pushLog(state, 'Backpack full! Cannot unequip.', 'lose'); return; }
  state.gearBag.push(gear);
  state.equipped[slot] = null;
  pushLog(state, `Unequipped ${gear.name}`, 'gear');
  renderBody(); scheduleSave();
}
function upgradeGear(id){
  const idx = state.gearBag.findIndex(g=>g.id===id);
  if(idx < 0) return;
  const gear = state.gearBag[idx];
  const t = GEAR_TIERS[gear.tier];
  if(gear.upgradeLevel >= t.maxUpgrade){ pushLog(state, 'Max upgrade reached!', 'lose'); return; }
  const req = UPGRADE_TABLE[gear.upgradeLevel];
  if(state.shards < req.shards || state.gold < req.gold || state.gems < req.gems){ pushLog(state, 'Not enough materials!', 'lose'); return; }
  state.shards -= req.shards;
  state.gold -= req.gold;
  state.gems -= req.gems;
  if(Math.random() < req.chance){
    gear.upgradeLevel++;
    updateMissionProgress('gear_upgraded', 1);
    pushLog(state, `Upgrade success! ${gear.name} +${gear.upgradeLevel}`, 'upgrade-success');
    showToast('Upgrade Success', `${gear.name} +${gear.upgradeLevel}`, 'win');
  } else {
    if(gear.upgradeLevel > 0) gear.upgradeLevel--;
    pushLog(state, `Upgrade failed! ${gear.name} ${gear.upgradeLevel>0?`+${gear.upgradeLevel}`:'(+0)'}`, 'upgrade-fail');
    showToast('Upgrade Failed', 'Better luck next time', 'lose');
  }
  renderBody(); scheduleSave();
}
function sellGear(id){
  const idx = state.gearBag.findIndex(g=>g.id===id);
  if(idx < 0) return;
  const gear = state.gearBag[idx];
  const val = getGearValue(gear);
  state.gold += val;
  state.totalGoldEarned += val;
  state.gearBag.splice(idx, 1);
  pushLog(state, `Sold ${gear.name} for ${val}g`, 'sell');
  renderBody(); scheduleSave();
}
function destroyGear(id){
  const idx = state.gearBag.findIndex(g=>g.id===id);
  if(idx < 0) return;
  const gear = state.gearBag[idx];
  const shards = getGearScrapValue(gear);
  state.shards += shards;
  state.gearBag.splice(idx, 1);
  pushLog(state, `Scrapped ${gear.name} for ${shards} shards`, 'gain');
  renderBody(); scheduleSave();
}

/* ═══════════════════════════════════════════════════════════════
   GEAR MARKET — UI (listing/buy/cancel logic lives in js/marketplace.js)
   ═══════════════════════════════════════════════════════════════ */
function renderGearMarketModal(){
  const view = state.gearMarketView || 'browse';
  const body = view === 'mine' ? renderMyGearListingsRows() : renderGearMarketBrowseRows();
  const filterButtons = ['all', ...Object.keys(GEAR_SLOTS)].map(slot=>{
    const active = state.gearMarketSlotFilter === slot;
    const label = slot === 'all' ? 'All' : GEAR_SLOTS[slot].name;
    const icon = slot === 'all' ? '🗂️' : GEAR_SLOTS[slot].icon;
    return `<button class="mini-btn ${active?'buy':''}" onclick="setGearMarketSlotFilter('${slot}')">${icon} ${label}</button>`;
  }).join('');
  return `
    <div class="modal-overlay" onclick="if(event.target===this)closeGearMarket()">
      <div class="modal-box forge-modal">
        <div class="modal-header">
          <h3>⚔️ Gear Market</h3>
          <button class="modal-close" onclick="closeGearMarket()">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:11px;color:var(--dim);margin-bottom:10px;">Every listing here is a real piece of gear someone forged — exact stats and upgrade level included, ready to equip the moment you buy it.</div>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button class="market-tab-btn ${view==='browse'?'active':''}" onclick="setGearMarketView('browse')">🛒 Browse</button>
            <button class="market-tab-btn ${view==='mine'?'active':''}" onclick="setGearMarketView('mine')">🏷️ My Listings</button>
          </div>
          ${view==='browse' ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${filterButtons}</div>` : ''}
          ${body}
        </div>
      </div>
    </div>`;
}

function renderGearMarketBrowseRows(){
  if(state.gearMarketListingsLoading && !state.gearMarketListings.length){
    return `<div style="padding:24px 0;text-align:center;color:var(--dim);font-size:13px;">Loading listings…</div>`;
  }
  if(!state.gearMarketListings.length){
    return `<div style="padding:24px 0;text-align:center;color:var(--dim);font-size:13px;">Nobody is selling this kind of gear right now. Be the first — list a piece from your bag!</div>`;
  }
  return state.gearMarketListings.map(l=>{
    const g = l.gear;
    const t = GEAR_TIERS[g.tier];
    const info = GEAR_SLOTS[g.slot];
    const mine = l.sellerId === UID;
    const eff = getGearEffectiveStats(g);
    const statsLine = Object.keys(eff).map(st=>{
      const display = st==='defense'||st==='profit' ? `+${(eff[st]*100).toFixed(0)}%` : `+${eff[st]}`;
      return `${SKILLS[st].name} ${display}`;
    }).join(' · ');
    return `<div class="market-row">
      <div class="market-left">
        <div class="card-icon" style="font-size:26px;">${info.icon}</div>
        <div>
          <div class="card-name" style="color:${t.color};">[${t.symbol}] ${escapeHtml(g.name)} +${g.upgradeLevel}</div>
          <div class="market-owned">${escapeHtml(l.sellerName||'Player')}${mine?' (you)':''} · ${statsLine}</div>
        </div>
      </div>
      <div style="text-align:center;min-width:90px;">
        <div class="market-price" style="font-size:15px;">${fmtG(l.price)}g</div>
      </div>
      <div class="market-actions">
        ${mine ? `<span style="font-size:11px;color:var(--dim);">Manage in My Listings</span>` : `<button class="mini-btn buy" ${state.gold>=l.price?'':'disabled'} onclick="buyGearListing('${l.id}')">Buy</button>`}
      </div>
    </div>`;
  }).join('');
}

function renderMyGearListingsRows(){
  if(state.myGearListingsLoading && !state.myGearListingsCache.length){
    return `<div style="padding:24px 0;text-align:center;color:var(--dim);font-size:13px;">Loading your listings…</div>`;
  }
  if(!state.myGearListingsCache.length){
    return `<div style="padding:24px 0;text-align:center;color:var(--dim);font-size:13px;">You have nothing listed. Pick a piece from your bag and hit "List on Market".</div>`;
  }
  return state.myGearListingsCache.map(l=>{
    const g = l.gear;
    const t = GEAR_TIERS[g.tier];
    const info = GEAR_SLOTS[g.slot];
    return `<div class="market-row">
      <div class="market-left">
        <div class="card-icon" style="font-size:26px;">${info.icon}</div>
        <div>
          <div class="card-name" style="color:${t.color};">[${t.symbol}] ${escapeHtml(g.name)} +${g.upgradeLevel}</div>
          <div class="market-owned">Listed at ${fmtG(l.price)}g</div>
        </div>
      </div>
      <div class="market-actions">
        <button class="mini-btn sell" onclick="cancelGearListing('${l.id}')">✕ Cancel & return</button>
      </div>
    </div>`;
  }).join('');
}

function renderGearSellModal(gearId){
  const gear = state.gearBag.find(g=>g.id===gearId);
  if(!gear) return ''; // already listed/removed from another tab — nothing to show

  const t = GEAR_TIERS[gear.tier];
  const info = GEAR_SLOTS[gear.slot];
  const suggested = getGearValue(gear);
  return `
    <div class="modal-overlay" onclick="if(event.target===this)closeGearSellModal()">
      <div class="modal-box">
        <div class="modal-header"><h3>${info.icon} List ${escapeHtml(gear.name)}</h3><button class="modal-close" onclick="closeGearSellModal()">✕</button></div>
        <div class="modal-body">
          <div class="market-owned" style="margin-bottom:12px;color:${t.color};">[${t.symbol}] +${gear.upgradeLevel} · Instant sell to the game would give ${suggested}g</div>
          <label style="font-size:11px;color:var(--dim);display:block;margin-bottom:4px;">Price (g)</label>
          <input type="number" id="gearSellPriceInput" class="username-input" min="1" step="1" value="${suggested}">
          <button class="act-btn buy" style="width:100%;margin-top:12px;" ${gearListingSubmitInFlight?'disabled':''} onclick="submitGearSellForm(${gear.id})">${gearListingSubmitInFlight?'Listing…':'List for sale'}</button>
        </div>
      </div>
    </div>`;
}

function submitGearSellForm(gearId){
  if(gearListingSubmitInFlight) return;
  const priceEl = document.getElementById('gearSellPriceInput');
  const price = priceEl ? priceEl.value : 0;
  listGearForSale(gearId, price);
}

/* ===== CLASS SYSTEM ===== */
