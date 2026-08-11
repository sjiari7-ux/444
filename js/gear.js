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
let forgeReqOpen = false;
let forgeSearch = '';
let forgeFilterSlot = 'all';
let customWeaponName = '';
let bagSelected = null;

function selectBagItem(id){
  bagSelected = (bagSelected === id) ? null : id;
  renderBody();
}


// ─── Gear Rendering ───
function renderGear(){
  const forgeButton = `
    <div class="forge-cta">
      <div class="forge-anvil">⚒️</div>
      <div class="forge-title">The Forge</div>
      <div class="forge-desc">Craft powerful gear from gathered materials. 36 recipes across 6 tiers.</div>
      <button class="forge-open-btn" onclick="openForge()">Open Forge</button>
      <div class="forge-bag-count">Bag: <b>${state.gearBag.length}</b> / ${GEAR_BAG_LIMIT}</div>
    </div>`;

  let forgeModal = '';
  if(forgeOpen && forgeSlot === null){
    // Grid of every craftable piece of gear, across all slots and tiers — filterable by category and name.
    const searchLower = forgeSearch.trim().toLowerCase();
    const filterButtons = ['all', ...Object.keys(GEAR_SLOTS)].map(slot=>{
      const active = forgeFilterSlot === slot;
      const label = slot === 'all' ? 'All' : GEAR_SLOTS[slot].name;
      const icon = slot === 'all' ? '🗂️' : GEAR_SLOTS[slot].icon;
      return `<button class="mini-btn ${active?'buy':''}" onclick="setForgeFilterSlot('${slot}')">${icon} ${label}</button>`;
    }).join('');

    const allTiles = Object.keys(CRAFTABLE_GEAR).filter(slot=> forgeFilterSlot==='all' || forgeFilterSlot===slot).map(slot=>{
      const info = GEAR_SLOTS[slot];
      return CRAFTABLE_GEAR[slot].map((r, idx)=>{
        if(searchLower && !r.name.toLowerCase().includes(searchLower)) return '';
        const t = GEAR_TIERS[idx];
        const locked = state.level < r.levelReq;
        return `<div class="gear-inv-tile" style="--tc:${t.color};${locked?'opacity:0.45;':''}" onclick="selectForgeItem('${slot}',${idx})" title="${locked?'Requires level '+r.levelReq:r.name}">
          <div class="it-icon">${r.icon}</div>
          <div class="it-name">${r.name}</div>
          <div class="it-badge">${t.symbol} ${info.icon}${locked?' 🔒':''}</div>
        </div>`;
      }).join('');
    }).join('');
    const hasResults = allTiles.trim().length > 0;

    forgeModal = `
      <div class="modal-overlay" onclick="if(event.target===this)closeForge()">
        <div class="modal-box forge-modal">
          <div class="modal-header">
            <h3>⚒️ The Forge</h3>
            <button class="modal-close" onclick="closeForge()">✕</button>
          </div>
          <div class="modal-body">
            <input type="text" class="market-search" placeholder="Search gear by name..." value="${forgeSearch}" oninput="setForgeSearch(this.value)" style="width:100%;margin-bottom:10px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${filterButtons}</div>
            <div style="font-size:11px;color:var(--dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Tap any piece of gear to craft it</div>
            ${hasResults ? `<div class="gear-inv-grid-v2">${allTiles}</div>` : `<div style="text-align:center;color:var(--dim);padding:20px;">No gear matches your search.</div>`}
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
    const bagFull = state.gearBag.length >= GEAR_BAG_LIMIT;

    const tierButtons = CRAFTABLE_GEAR[forgeSlot].map((r, idx)=>{
      const t = GEAR_TIERS[idx];
      const active = idx === forgeTier;
      const tierLocked = state.level < r.levelReq;
      return `<button class="mini-btn ${active?'buy':''}" style="${active?'background:rgba(111,162,133,0.14);':''}color:${t.color};border-color:${t.color};${tierLocked?'opacity:0.4;':''}" onclick="selectForgeTier(${idx})" ${tierLocked?'disabled':''} title="Lv.${r.levelReq}">[${t.symbol}]</button>`;
    }).join('');

    const resourceRows = Object.keys(recipe.inputs).map(inp=>{
      const have = state.inv[inp] || 0;
      const need = recipe.inputs[inp];
      const enough = have >= need;
      const it = ITEMS[inp];
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px;">
        <span style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">${it.icon}</span> ${it.name}</span>
        <span style="font-family:'JetBrains Mono',monospace;color:${enough?'var(--green)':'var(--red)'};font-weight:600;">${fmtG(have)} / ${fmtG(need)}</span>
      </div>`;
    }).join('');

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
              <div style="font-size:11px;color:var(--dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Select Tier</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">${tierButtons}</div>
            </div>

            <div class="forge-weapon-plate ${forgeReqOpen?'open':''}" style="--tc:${tier.color};" onclick="toggleForgeReq()">
              <div class="fwp-icon">${recipe.icon}</div>
              <div class="fwp-name" style="color:${tier.color};">[${tier.symbol}] ${recipe.name}</div>
              <div class="fwp-hint">${forgeReqOpen ? 'Tap to hide requirements ▲' : 'Tap the weapon to view crafting requirements ▼'}</div>
            </div>

            <div style="margin:12px 0;">
              <div style="font-size:11px;color:var(--dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Name your item</div>
              <input type="text" class="market-search" maxlength="24" placeholder="${recipe.name}" value="${customWeaponName}" oninput="setCustomWeaponName(this.value)" style="width:100%;">
            </div>

            ${forgeReqOpen ? `
            <div class="forge-recipe-box">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="font-size:36px;">${recipe.icon}</div>
                <div>
                  <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:${tier.color};">[${tier.symbol}] ${customWeaponName.trim() || recipe.name}</div>
                  <div style="font-size:11px;color:var(--dim);margin-top:3px;">Lv.${recipe.levelReq} required · <img class="ui-icon" src="${ICONS.energy}" alt="⚡">${cost} energy · +${recipe.xp} XP</div>
                </div>
              </div>
              <div style="margin-bottom:12px;">${resourceRows}</div>
              ${locked ? `<div class="locked-tag" style="text-align:center;padding:10px;"><img class="ui-icon" src="${ICONS.lock}" alt="🔒"> Requires player level ${recipe.levelReq}</div>` :
                `<button class="act-btn ${(!hasInputs||!hasEnergy||bagFull)?'':'buy'}" style="width:100%;padding:12px;" ${(!hasInputs||!hasEnergy||bagFull)?'disabled':''} onclick="craftGear('${forgeSlot}',${forgeTier})">
                  ${bagFull ? `<img class="ui-icon" src="${ICONS.bag_full}" alt="🎒"> Bag Full` : (!hasInputs ? '❌ Missing Materials' : (!hasEnergy ? `<img class="ui-icon" src="${ICONS.energy}" alt="⚡"> Not Enough Energy` : `🔨 Forge ${customWeaponName.trim() || recipe.name}`))}
                </button>`}
            </div>
            <div style="font-size:11px;color:var(--dim);text-align:center;">Bag: <b>${state.gearBag.length}</b> / ${GEAR_BAG_LIMIT}</div>
            ` : ''}
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
          <button class="mini-btn sell" onclick="sellGear(${item.id})">Sell</button>
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
    ${forgeButton}
    <div class="section-title"><h2>Inventory (${state.gearBag.length})</h2></div>
    ${state.gearBag.length === 0 ? '<div class="panel" style="text-align:center;color:var(--dim);padding:20px;">Bag is empty. Defeat monsters to find gear!</div>' : `<div class="gear-inv-grid-v2">${bagTiles}</div>`}
    ${bagDetail}
    <div class="panel" style="overflow-x:auto;margin-top:14px;">
      <div class="panel-header">📈 Upgrade Table</div>
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
function openForge(){ forgeOpen=true; forgeSlot=null; forgeTier=null; forgeReqOpen=false; customWeaponName=''; forgeSearch=''; forgeFilterSlot='all'; renderBody(); }
function closeForge(){ forgeOpen=false; forgeSlot=null; forgeTier=null; forgeReqOpen=false; customWeaponName=''; forgeSearch=''; forgeFilterSlot='all'; renderBody(); }
function backToForgeGrid(){ forgeSlot=null; forgeTier=null; forgeReqOpen=false; customWeaponName=''; renderBody(); }
function selectForgeItem(slot, idx){ forgeSlot=slot; forgeTier=idx; forgeReqOpen=false; customWeaponName=''; renderBody(); }
function selectForgeTier(idx){ forgeTier=idx; forgeReqOpen=false; renderBody(); }
function setForgeFilterSlot(slot){ forgeFilterSlot=slot; renderBody(); }
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
function toggleForgeReq(){ forgeReqOpen = !forgeReqOpen; renderBody(); }
function setCustomWeaponName(val){ customWeaponName = val; }
function craftGear(slot, tier){
  const recipe = CRAFTABLE_GEAR[slot][tier];
  if(state.level < recipe.levelReq) return;
  const cost = getEnergyCost(state, recipe.energyCost);
  if(state.energy < cost){ pushLog(state, 'Not enough energy!', 'lose'); return; }
  if(state.gearBag.length >= GEAR_BAG_LIMIT){ pushLog(state, 'Gear bag full!', 'lose'); return; }
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
  pushLog(state, `Forged [${t.symbol}] ${finalName}!`, 'gear');
  if(leveled){ pushLog(state, `Level up! You are now level ${state.level}`, 'levelup'); showToast('Level Up!', `Level ${state.level}`, 'levelup'); }
  customWeaponName = '';
  forgeReqOpen = false;
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
  pushLog(state, `Equipped ${gear.name}`, 'gear');
  renderBody(); scheduleSave();
}
function unequipGear(slot){
  const gear = state.equipped[slot];
  if(!gear) return;
  if(state.gearBag.length >= GEAR_BAG_LIMIT){ pushLog(state, 'Bag full! Cannot unequip.', 'lose'); return; }
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
    pushLog(state, `Upgrade success! ${gear.name} +${gear.upgradeLevel}`, 'upgrade-success');
    showToast('Upgrade Success', `${gear.name} +${gear.upgradeLevel}`, 'win');
  } else {
    if(gear.upgradeLevel > 0) gear.upgradeLevel--;
    pushLog(state, `Upgrade failed! ${gear.name} ${gear.upgradeLevel>0?'+${gear.upgradeLevel}':'(+0)'}`, 'upgrade-fail');
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

/* ===== CLASS SYSTEM ===== */
