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
  if(cost.resources) Object.entries(cost.resources).forEach(([k,v])=>{ c.resourceBag[k] -= v; });
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
  const eff = effectiveStats(c);
  let max = Infinity;
  Object.entries(r.inputs).forEach(([k,v])=>{ max = Math.min(max, Math.floor((c.resourceBag[k]||0)/v)); });
  if(r.energy) max = Math.min(max, Math.floor(c.energyCur/r.energy));
  return Math.max(0, Number.isFinite(max) ? max : 0);
}
async function craftRecipe(recipeId, qty){
  const c = S.char;
  const r = RECIPES.find(x=>x.id===recipeId);
  if(!r) return;
  const max = maxCraftable(c, r);
  qty = clamp(Math.floor(qty||1), 1, Math.max(1,max));
  if(max <= 0){
    const eff = effectiveStats(c);
    if(r.energy && c.energyCur < r.energy){ showToast('Not enough energy.'); return; }
    showToast('Not enough resources.'); return;
  }
  if(bagCount(c) >= BAG_CAPACITY){ showToast('Bag is full.'); return; }
  Object.entries(r.inputs).forEach(([k,v])=>{ c.resourceBag[k] -= v*qty; });
  if(r.energy){ const eff = effectiveStats(c); c.energyCur = clamp(c.energyCur - r.energy*qty, 0, eff.maxEnergy); }
  const existing = c.inventory.find(i=>i.kind===r.out.kind && i.id===r.out.id);
  if(existing && r.out.kind!=='equipment'){ existing.qty = (existing.qty||1)+qty; }
  else { c.inventory.push(Object.assign({uid:uid(), qty}, r.out)); }
  if(r.xp){
    c.xp += r.xp*qty;
    const lvlLines = [];
    await checkLevelUps(c, lvlLines);
    lvlLines.forEach(l=> showToast(l.value));
  }
  showToast(`Crafted ${qty}x ${r.out.name}${r.xp?` (+${r.xp*qty} XP)`:''}.`);
}

