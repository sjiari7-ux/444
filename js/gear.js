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
    // Grid of every craftable piece of gear, across all slots and tiers.
    const allTiles = Object.keys(CRAFTABLE_GEAR).map(slot=>{
      const info = GEAR_SLOTS[slot];
      return CRAFTABLE_GEAR[slot].map((r, idx)=>{
        const t = GEAR_TIERS[idx];
        const locked = state.level < r.levelReq;
        return `<div class="gear-inv-tile" style="--tc:${t.color};${locked?'opacity:0.45;':''}" onclick="selectForgeItem('${slot}',${idx})" title="${locked?'Requires level '+r.levelReq:r.name}">
          <div class="it-icon">${r.icon}</div>
          <div class="it-name">${r.name}</div>
          <div class="it-badge">${t.symbol} ${info.icon}${locked?' 🔒':''}</div>
        </div>`;
      }).join('');
    }).join('');

    forgeModal = `
      <div class="modal-overlay" onclick="if(event.target===this)closeForge()">
        <div class="modal-box forge-modal">
          <div class="modal-header">
            <h3>⚒️ The Forge</h3>
            <button class="modal-close" onclick="closeForge()">✕</button>
          </div>
          <div class="modal-body">
            <div style="font-size:11px;color:var(--dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Tap any piece of gear to craft it</div>
            <div class="gear-inv-grid-v2">${allTiles}</div>
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
                  <div style="font-size:11px;color:var(--dim);margin-top:3px;">Lv.${recipe.levelReq} required · <img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡">${cost} energy · +${recipe.xp} XP</div>
                </div>
              </div>
              <div style="margin-bottom:12px;">${resourceRows}</div>
              ${locked ? `<div class="locked-tag" style="text-align:center;padding:10px;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAqBJREFUSEuVVjtrFUEYPWd+gZUSK21UiGXsb1ASLBTBB4q2klYLBYkQA9pooa3YGhQfCFolKDe9wSoRY6OVAXvBao47j52dmd2b4MJddpj5vnO+8z3mEns8BCCEt6RDfkXzcy87t++s3C+8NWxipQOE7gA8CeC4PyVsgvgEaJHG/Am2BKjop6MVAPInA5N0EcCrdtv5KQ20DfC0IX9M4Nedz6XwJKVzAN4F544ZV0B8jGCnAFzNgKcN+bUQIwaUCCXiBGS1D9AXgIcjwCXSvE6BhjMpOgFbBGZI/q3FqHIQYGV1GdALyK1xjOT2kIySjgL4FveukHw5pHgvB7K61+iyBOCtIS+0OewXAiFr34A436RnmaSzK6rGU+wKMQoivQd0BuAjkreH6yudfSjgFqEPNOZsTqIr08qDpDGgEcRlGscqSBeqsKxpHy19tOskZ1MEsWSrJAdH1mpMYNR4KwASu6zkpSRnBtAJVfVB6thxw2jU6ZpHUKrsAJrAlhpCZQSRzZ6dnDKUd2n67mcnz2gvB5LTHePUflXrhqVvuljBccS0OoQDs6RZb2dPEYGk53mH+ij9if6Q2KWyVkhzrQfgorbSJoTp0F+Jb/rerVyzvS2SfigW0zQCqCD7X8Q7QqbpuBYwNVoccKsA5tKAy2dnDhbSUE3WZLVmaOYn5WARwv3ceGBEZ94r1AB5lzQP2ruh6ANJcxBWJ1VRHtmg63BgnuRa2/CFRF4mq8cibvRvolbVPPm9tD8heTO/InsAMRefAcxMrM6qfONyg+SJHLJotHyEWWmKwAKE6yIOVtdkneFfAJ4BeErDnXqkD86idtpIdkrAgrutADh2+/2e8BuEi3LDOyZ3JvVIfxZV/zDypaQjvoHI78lhftfWl0Gj3T9vdCwxhL+7FwAAAABJRU5ErkJggg==" alt="🔒"> Requires player level ${recipe.levelReq}</div>` :
                `<button class="act-btn ${(!hasInputs||!hasEnergy||bagFull)?'':'buy'}" style="width:100%;padding:12px;" ${(!hasInputs||!hasEnergy||bagFull)?'disabled':''} onclick="craftGear('${forgeSlot}',${forgeTier})">
                  ${bagFull ? '<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA/FJREFUSEuNlltoXUUYhb+1NRIjJl6qaBRTpdZixBveDbWColjRoASrIEULebBK8daiKLRRvFJENGAfvD21tdqb4IME2yreHgSLtWIrGpGomJQabWq1zVnuf+85yTkntrhhH2bmzMw//1rrX7NFPAIZHA1cDFUHy/FDPA1LysmTg9Gq7U/p2l4G3Aj8GWtV7FD8tgo2KNOy2jM1nqYMMBGj9jjlYKXiiwRfKdPftVlW7GZBp6QvDpVxgFMHi115EvgI/DxoGjAN3FTOm3zKPDgAjADD4CVYFytTX+28ulU5HNFfB3wAvAhsAj4GfwYaS5sW6w1HCy4FrgCuBh4GLpR0x9QAieSK3YZ5CfEdBPZqBx4FOjCtZRLBepH4H+BBrGcQQ8DTwMlAr6T9VdhLiORCRRV7BvCAYUzwEKYT8S5wBtBtGE0ktxnWC34Brge2powPA56Q9FsV+TqSK/a5mAVJKouADw1PCS4HXgN+TPh0WNwt/DnW/RbXCl7B7EX0S/r+YAFOBR4B/spl+WDC8gD4faz5iHvLqtDLhtcF1wFNad4LwJHA45JGqrXVmEFMWJWTtgVY3lBenwD7EwdNqCA3xSsai0GzDd2ZsvFqeTbUAdgOPO+pWSrwcZOSLZIfNowoJGpGLPYJt4NWSDpvaiXHbvYxQLy353iflpN2bPRTxWaYCmIc2AP8nt49mBMRR6T+oGG1YLcyjYZwChW5UmlBvAfcmQMc1rARPAaKQtoG7kzSbDSlbXmtXJXXwBjQDMwNFQFvRlvS3lLZdgtwCrALM4R4Ne3UlTK6DBisd0Kmgz8FvQ0MAIdj5iFmgo8HDWU1AUIJm4EFwDdAfyKwCxVZRf9KIEuBK0kI9wGrDQOKANBrmCG8EmtOlml/NYPwnGHgbGB7TYDZFn3CawKisoDrHOlWrD4U1uIMayEqkIjKPiHk2hhgFvBO6S0TuA+Bb4HCxILMeP4BHgPWJ2gDva9B4V03pIKsCxAcLAZWpgBLi0IzX1qMC54FdgPnJOEHuaGyJTmpYQ/ng5fn+cW6ueC7QM/VktwGrA0MMRtQ4Y4nhfQMzcKLQAvTiSNGd1hC8p99pbz9K9YmxDXgVaCbJY1WIQqSg8RQyg+Jgx3AdMNGwRtRGyHrxIENPwnmY26yGBShHuIQRwGXhM2HqzZycHoEMPSrtN+OXKbfAq2Yny1mFmox2y3aRVg2Z5kiQNh6b8p8V5Cc1ZDcYtgp6MLsQKxISrjA8Fahogn91F07PaAew9ZkFfPKC8gDWLOUFYU28UlRSt9ea9giOBMzJ/87iFszec/U3jn05ONLLTYLdsbmkm476JVZ/eM/v0QaTeJ/9v8Fy5uWLrMnW18AAAAASUVORK5CYII=" alt="🎒"> Bag Full' : (!hasInputs ? '❌ Missing Materials' : (!hasEnergy ? '<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡"> Not Enough Energy' : `🔨 Forge ${customWeaponName.trim() || recipe.name}`))}
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
      <td><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA6xJREFUSEt1lk1oXFUYhp/33NiIKAVdtHSmSiWWWtSY4CYImuJCKuimIGjBqISIYIVaWgSDTQuCP5Qi/fEHS8WF4EYXIu50Nt0I7cSIuJEqbUwN3RQlttq557V3bu7MvTOTuxjOvfOd837v934/R1QeAabzK2ev+ZN/7Dxly/IRPWbZtvKntdcL1B9x8GMR7klimB3lwvkSXtXProvtVdXBARjzYdM7SAewDiPvBEaMXhlLFz+vcJIpky6Ir0niZ7ava4Ur5wh6dbT1x3fzoX4I4izBT8SYTIi45cG49KIgXSOGqyEagNwMtf0S7yplwoEXgIcE3xiekdhgc1tbFKthe3aMpTO9Cq0yyGQoxMzX86pdBOqGlwQftQ3N1//6ppl14foliV9s7i1iK3P5BtjcaFw62St4R4Pij3NJfadS/pE8R2Ayx9brSvjRqb8V/B3F8WBmDHe095lGtOYy98ZYbJSAuyEqUrAZajPAAeR9juFKdFweCtoNTCXodIrfzKl7LlXyg1JfdRLXyzqCNT3uxUaR6ANEFvNDGx+PURMJetqRZQK/A7fIrT3W0FlwHamI6mkiWzKmbSJRO3IG3SrpS9Mm9UnBVRMTobcI/En0CRK2yjrlNtV8m/EnskZQBmAcwyCAXNhC5wxghWtnbw3DPxH5jYSbST1l6T2Jp6p14w+J2qbAZAabMRhnUIhKDaBJbTLJbIMbmXiStw3H/7ZeC8N/5cRNFqJcs3Acx/tyBv0AmX3OtVS9GYMQPG44kgFkmxVbGxyGlntTEHjfZrQMMCCLygCiqdqkFKdBu4k0MgGTGEbSEH/taTiZX2sAdGurrw5yBpww3l4wcGRMCc3e5lplkIuca1Ct6UqU2lkU/H1RQMAKwV9incq3dbOoj4G1Y8zdNB1YB5nIBH8q+bBgM9ZBY3WFLULquVbki4SwkSSuJyu0qOk166Ag1VR9EnlK8DziiMy+G0J+hYkEdgFLiuxy0KPgt1f7VCPNWoVQzqASot4ZBOdC7Y2A9wOvQR6arNm1HPamJCvDuv6xxZOlcF3OWseol072TsA+kTtMqD2swDHD7cJ3tbsPPpTHVQc7bpnVdn3pTHfc5qes1kHPdO3sbB+YLIRNRw17KgDSwdxTHxv10t5g0kHjswLQxew3XUg2Pxsdjxp/0PZMejlBe+9fHZklnyoXg24W9VZQqeEUub/AnXe3Qus5IZKYfPYAF86XzMoXjsppPa2iPN3WQu1tGH13mY5Bdvj/vuTOM+9PyqQAAAAASUVORK5CYII=" alt="🔷"> ${u.shards}</td>
      <td><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA2RJREFUSEuNVUuIHFUUPefV2NWFjpuMyfQniYoOmIkfRHEhkRHMTrJxiGaniyQkMmDUheDC1SxFCChxIQoijWYz+CEIigpBInGhggQXxkT6M8mYLBKdrv7UO9JVNdU1VdWjD7qhX993zr3n/ggQgOJvpE50P+nkX+XtRzejz2ZQKsbdgiDzV6GLsU2GIO9vsV9FEWfebiJIo/wf7yYKt/HHOKYtIiAQy+Vfrd/LIfYK2iFxFkYXQbS82fbXxfkbexARjLE2fsI2q9t8OAdo7CHQ7M8mPHqog26ldTqCKy6WEXToaTq33U79MIXXAez+DzV+KVebD6aLLUuTEIyM/LXaHIdcFrAYOZivs2zVGWsfKtVaP+cciVWJCOI+6Hbq30BYIAs6ICFLVYHwFgAHDk/aIR71+s6KueuSH9ZYLEmSA79dPwlgKetJApeJRsAP5ZJd7PXNBQM8LfAzGd2AxYo75SzzjsudjfSi264+T/L9DVkKI0iYCUK/+n2zr+wOP5DMAcLMC/ZtAAuRmS6BWCrPtj4PI/A7tT8A3hnKJWFrApyBtSdEvkfycUBnnSnnpWBof8xE/61XaT4Z5qDbrv1piJ25yZOWRbgJ4Jgb4ExvCucB3D0CNDKPWGOPQjicJpCw5lWb28MIequ1BsTnigaAgLYD2yhV2q/2VutLEka5Cs8IPIBdJPFavg/0jldpvZiUaa9dfwPQboEvUPzKAt+RuO56bPT94GVZPAPyvjBxwnmIyzTBPgvzSuL5uNJOWRN8eOuO9vdJmfqr9XcpXLTAOYJ7ATsPg3touT+UTghzY6VlWZzybikNenawOpZFFyB+SqOzspoDzZvlSnP0JDp+Z9cewn4iYT6d5LhLfqexDch8XCoFN26u85/prvf38Pb1h/sD+FNldDHg/SAPQXhKwDSA0+VK8+CmYdfr7NojBE8QeMyKrgF+kvib23e+9N3Bs4Y8BmJexBUKVyTeBumB7FYBseIa5zi3X+4kEkVx5Kf/2trM9PTQOwLpCIi53EhIdbighhG+cKutj1KdXDBKJ2zK9U59wTHYpkAzFpgxwLoB/rLkNXeIc9zZvF4wCSbt5HRMaSe2tk8TxDt50u4tXG2FMuZkS11sGteTDfNkyf6Y9Gi8k/MhJzdplEyq8kVRjPMv4Yt7MK5KE1sAAAAASUVORK5CYII=" alt="🪙"> ${u.gold}</td>
      <td>${u.gems ? '<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA2VJREFUSEuNlk2IHFUUhb/zesaJC0EXbgwOBARNdCVBBZNZxKTTrQEVguJCQYiBxBAQjMGRSKIJATG4GDAqiiIYBBdRnGS6ZwYRBhJ/0IXkZxHBlXEZMCNGZ/odra7q6qrqnuhbdBfvvrr3nHvuu7fEikuAVzYPWIafT3a7KzcPPuSuiiY5Cy/In4fAyQNUwgw6/Z87VRDXZyBn6FZKVwo/ZVCkkp5PftMA2fvN+bjOHT0x1J0h3sDJkcjtscP6lFDiOXGc0UskC5xv1fVZz21mTcVszPrcsnhwxPwEjPeF8eloHQniPWDMNXZpmf2Izb3M2Uxjdipw2au4rT2h3/oMUudHgEnMJwq8Y7PQRSEWOpHXg3gLuDtz+HMM7KpFDhgmBIvL+M4gvS/TNJ5p18PDPRY0W37MgZNpXSj5e0mBRXd4XqPsc+RNzLpikUS4VIM9iGNEJh2499/XD+ZnzKHWVh3Uti+9enmU57rpCJgOUpebz3SsWwKszV9K7D0QvbSLb+kwIlhfMgnXAj+oOR+fdEdrU2EzBpmAtr6ReKBc3oYgExHB7jJOnksrFT+Ki12RG/NxJ5F3q/fk2ig3rVrie+Cu0mXMCy/xr40yC0Pu/LOtuj7Kq6g55302b/Qrp1vie6NYLbw/ATLkJrclpm2meuC6VOTdM/VwPElIidrWOR+WeaXA5LzEDpuzxcAFIXcgXsirK6kP82K7rmO985XcQXPOUzZ7cic17qDDCeC+XCcpYfe7zPYoZvNLJx1obdHhYqrzFBXpN2f9se2nk0sQzatBLGGOVjT6APMXYncW4GirHiarOuatotoRG+34OUGPyvyyJB4ZMRdKjRYamOPAGompmS3aOyyNKYNKU+s5asx5DrNZeIPRa8CmLkJxQeZl4y9An7bqeqqKvCT6kGGQ2gWNts9i/yh0zuLtrMEdkhg3jLfqyvtRiUGGstTsilHTZmu2n/GNVxf5DlMP4nJS747cE2qc+HPE93+9KVwrDp/iECw1u0GK/Z7eOO1bY2AiBJ6xGJP4MIwxe2pjuFIdZ9VWX5oHZQbFOQr1ltcosCFp16M1ZqYf0q/D9MuB9lOUpztlV4FQrJzHv/LNf/+BTm3TlaKj683nQQ0qQ3zodCturjRNMwSVAP/xiTCsFlcKkLn6B/RWcNXdxjx2AAAAAElFTkSuQmCC" alt="💎"> '+u.gems : '-'}</td>
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
function openForge(){ forgeOpen=true; forgeSlot=null; forgeTier=null; forgeReqOpen=false; customWeaponName=''; renderBody(); }
function closeForge(){ forgeOpen=false; forgeSlot=null; forgeTier=null; forgeReqOpen=false; customWeaponName=''; renderBody(); }
function backToForgeGrid(){ forgeSlot=null; forgeTier=null; forgeReqOpen=false; customWeaponName=''; renderBody(); }
function selectForgeItem(slot, idx){ forgeSlot=slot; forgeTier=idx; forgeReqOpen=false; customWeaponName=''; renderBody(); }
function selectForgeTier(idx){ forgeTier=idx; forgeReqOpen=false; renderBody(); }
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
