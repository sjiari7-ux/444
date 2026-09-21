/* ---------------- Inventory ---------------- */
function renderInventory(){
  const c = S.char;
  const slots = EQUIP_SLOTS.map(slot=>{
    const it = c.equipment[slot];
    return `<div class="eq-slot">
      <div class="slot-name">${slot}</div>
      ${it ? `<div style="font-weight:700; color:var(--parchment);">${esc(it.name)} <span class="tag tag-${it.tier}">${it.tier}</span></div>
        <div class="faint">${statsSummary(it.stats)}</div>
        <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-sm" data-action="unequip" data-slot="${slot}">Unequip</button>
          ${upgradeButtonHtml(it, c)}
        </div>`
        : `<div class="faint">Empty</div>`}
    </div>`;
  }).join('');
  const gear = c.inventory.filter(i=>i.kind==='equipment');
  const consumables = c.inventory.filter(i=>i.kind==='consumable');
  const materials = c.inventory.filter(i=>i.kind==='material');
  function statsSummary(st){ if(!st) return ''; return Object.entries(st).map(([k,v])=>`+${v} ${k.toUpperCase()}`).join(', '); }
  function itemCard(it, actions){
    const tierTag = it.tier ? `<span class="tag tag-${it.tier}">${it.tier}</span>` : '';
    return `<div class="item-card">
      <h5>${esc(it.name)} ${tierTag}</h5>
      ${it.stats ? `<div class="faint">${statsSummary(it.stats)}</div>` : ''}
      ${it.qty>1?`<div class="faint">x${it.qty}</div>`:''}
      <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">${actions}</div>
    </div>`;
  }
  const gearCards = gear.map(it=>itemCard(it, `<button class="btn btn-sm btn-accent" data-action="equip" data-uid="${it.uid}">Equip</button><button class="btn btn-sm" data-action="sell" data-uid="${it.uid}">Sell (${sellPrice(it)}g)</button>${upgradeButtonHtml(it, c)}`)).join('') || '<p class="faint">No gear in your bag.</p>';
  const consCards = consumables.map(it=>itemCard(it, `<button class="btn btn-sm btn-accent" data-action="use-item" data-uid="${it.uid}">Use</button>`)).join('') || '<p class="faint">No consumables.</p>';
  const matCards = materials.map(it=>itemCard(it, `<button class="btn btn-sm" data-action="sell" data-uid="${it.uid}">Sell (${sellPrice(it)}g)</button>`)).join('') || '<p class="faint">No materials.</p>';
  return `
  <div class="view-header"><h2>Inventory</h2><p>Bag: ${bagCount(c)}/${BAG_CAPACITY}</p></div>
  <div class="panel-title" style="margin-bottom:10px;">Equipped</div>
  <div class="eq-slots">${slots}</div>
  <div class="panel-title" style="margin-bottom:10px;">Gear</div>
  <div class="inv-grid" style="margin-bottom:18px;">${gearCards}</div>
  <div class="panel-title" style="margin-bottom:10px;">Consumables</div>
  <div class="inv-grid" style="margin-bottom:18px;">${consCards}</div>
  <div class="panel-title" style="margin-bottom:10px;">Materials</div>
  <div class="inv-grid">${matCards}</div>`;
}
function upgradeButtonHtml(it, c){
  const cost = UPGRADE_COSTS[it.tier];
  if(!cost) return ''; // already legendary, or unknown tier
  const nextTier = TIERS[TIER_ORDER.indexOf(it.tier)+1];
  const parts = [];
  let affordable = c.gold >= cost.gold;
  parts.push(cost.gold+'g');
  if(cost.resources){
    Object.entries(cost.resources).forEach(([k,v])=>{
      if((c.resourceBag[k]||0) < v) affordable = false;
      parts.push(`${v} ${RESOURCE_NAMES[k]}`);
    });
  }
  if(cost.materials){
    Object.entries(cost.materials).forEach(([k,v])=>{
      const have = c.inventory.filter(i=>i.kind==='material' && i.id===k).reduce((a,i)=>a+(i.qty||1),0);
      if(have < v) affordable = false;
      parts.push(`${v}x ${k.replace(/_/g,' ')}`);
    });
  }
  return `<button class="btn btn-sm ${affordable?'btn-primary':''}" data-action="upgrade-item" data-uid="${it.uid}" ${affordable?'':'disabled'} title="${parts.join(', ')}">Upgrade &rarr; ${nextTier.name}</button>`;
}
function sellPrice(it){
  if(it.kind==='equipment'){ const tm={common:1,uncommon:1.8,rare:3,epic:5,legendary:8}[it.tier]||1; return Math.round(8*(it.level||1)*tm); }
  if(it.kind==='consumable') return 6;
  return 3;
}

