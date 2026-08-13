// ─── Battle System ───
/* ===== BATTLE SYSTEM ===== */
let battleState = null;

/* ===== INTERACTIVE BATTLE SYSTEM v2 ===== */
let battleItemMenuOpen = false;
let battleCodexOpen = false;

/* ===== VISUAL BATTLE EFFECTS (floating damage numbers + hit shake) ===== */
function battleEffectTargetEl(who){
  return document.getElementById(who === 'monster' ? 'battle-monster-sprite' : 'battle-player-sprite');
}
function spawnFloatNum(who, text, cls){
  const el = battleEffectTargetEl(who);
  if(!el) return;
  const rect = el.getBoundingClientRect();
  const num = document.createElement('div');
  num.className = 'float-num' + (cls ? ' float-'+cls : '');
  num.textContent = text;
  num.style.left = (rect.left + rect.width/2) + 'px';
  num.style.top = rect.top + 'px';
  document.body.appendChild(num);
  setTimeout(()=>{ num.remove(); }, 1200);
  el.classList.remove('hit-shake','hit-flash');
  void el.offsetWidth; // restart animation
  el.classList.add('hit-shake','hit-flash');
  setTimeout(()=>{ el.classList.remove('hit-shake','hit-flash'); }, 420);
}
function playBattleEffects(bs){
  if(!bs) return;
  if(typeof bs.lastEffectIndex !== 'number') bs.lastEffectIndex = 0;
  const newTurns = bs.turns.slice(bs.lastEffectIndex);
  bs.lastEffectIndex = bs.turns.length;
  newTurns.forEach((t, i)=>{
    setTimeout(()=>{
      if(t.who==='player' && t.dmg>0){
        spawnFloatNum('monster', (t.crit?'CRIT! ':'') + '-'+t.dmg, t.crit?'crit':'enemy');
      } else if(t.who==='monster' && t.dmg>0){
        spawnFloatNum('player', (t.crit?'CRIT! ':'') + '-'+t.dmg, t.crit?'crit':'player');
      } else if(t.who==='monster' && t.dodge){
        spawnFloatNum('player', 'DODGE!', 'dodge');
      } else if(t.who==='skill' && t.type==='heal'){
        spawnFloatNum('player', '+'+t.heal, 'heal');
      } else if(t.who==='item' && t.type==='health'){
        spawnFloatNum('player', '+'+t.heal, 'heal');
      } else if(t.who==='burn'){
        spawnFloatNum('monster', '-'+t.dmg, 'burn');
      }
    }, i*400);
  });
}

function startBattle(zoneId){
  const zone = ZONES.find(z=>z.id===zoneId);
  if(!zone) return;
  const cost = getEnergyCost(state, zone.energyCost);
  if(state.energy < cost){
    pushLog(state, 'Not enough energy for this zone!', 'lose');
    return;
  }
  if(state.health <= 0){
    pushLog(state, 'Health is zero! Rest before fighting.', 'lose');
    return;
  }
  state.energy -= cost;
  const monsters = ZONE_MONSTERS[zoneId];
  const monsterTemplate = monsters[Math.floor(Math.random()*monsters.length)];
  const levelDiff = Math.max(0, state.level - monsterTemplate.level);
  const scale = 1 + levelDiff * 0.02;
  const monster = {
    ...monsterTemplate,
    maxHp: Math.round(monsterTemplate.hp * scale),
    hp: Math.round(monsterTemplate.hp * scale),
    atk: Math.round((monsterTemplate.atkMin + Math.random() * (monsterTemplate.atkMax - monsterTemplate.atkMin)) * scale),
    def: Math.round(monsterTemplate.def * scale),
    spd: monsterTemplate.spd,
    crit: monsterTemplate.crit,
    burnTurns: 0,
    burnDmg: 0,
  };
  const player = getPlayerCombatStats();
  battleState = {
    zoneId, monster,
    playerHP: Math.min(player.hp, state.health),
    playerMaxHP: player.hp,
    playerStats: player,
    turns: [], won: false, lost: false, fled: false,
    turnCount: 0, chargeLevel: 0, isDefending: false,
    waitingForPlayer: true, rewards: null, lastEffectIndex: 0,
  };
  state.battleActive = true;
  battleItemMenuOpen = false;
  battleCodexOpen = false;
  updateMissionProgress('battles_started', 1);
  pushLog(state, `Entered ${zone.name} — ${monster.name} appears!`, 'gain');
  renderBody(); scheduleSave();
}

function getChargeMultiplier(){
  if(!battleState) return 1;
  return Math.min(3.0, 1 + battleState.chargeLevel * 0.5);
}

function playerAttackAction(isSkill, skillKey){
  if(!battleState || battleState.won || battleState.lost || battleState.fled) return;
  const bs = battleState;
  const pStats = bs.playerStats;
  const m = bs.monster;
  const effDef = m.def * (1 - (pStats.pierce || 0));
  let dmg = Math.max(1, Math.round(pStats.atk - effDef));
  let isCrit = Math.random() < pStats.crit;
  let isPierce = (pStats.pierce || 0) > 0;
  let skillName = '';
  let manaCost = 0;

  if(isSkill && skillKey){
    const cls = CLASS_DATA[state.playerClass];
    const skDef = cls.skills.find(s=>s.key===skillKey);
    skillName = skDef ? skDef.nameAr : 'Skill';
    switch(skillKey){
      case 'powerStrike': manaCost = 10; if(state.mana < manaCost){ pushLog(state, 'Not enough mana!', 'lose'); return; }
        state.mana -= manaCost; dmg = Math.max(1, Math.round(pStats.atk * 2)); isPierce = true; break;
      case 'keenEye': manaCost = 8; if(state.mana < manaCost){ pushLog(state, 'Not enough mana!', 'lose'); return; }
        state.mana -= manaCost; dmg = Math.max(1, Math.round(pStats.atk * 2.5));
        isCrit = Math.random() < Math.min(0.9, pStats.crit + 0.25); break;
      case 'arcanePower': manaCost = 15; if(state.mana < manaCost){ pushLog(state, 'Not enough mana!', 'lose'); return; }
        state.mana -= manaCost; dmg = Math.max(1, Math.round(pStats.atk * 3));
        m.burnTurns = 3; m.burnDmg = Math.round(pStats.atk * 0.3); break;
      case 'fastHeal': manaCost = 10; if(state.mana < manaCost){ pushLog(state, 'Not enough mana!', 'lose'); return; }
        state.mana -= manaCost;
        const healPct = 0.3 + getClassSkillLevel(state, 'fastHeal') * 0.02;
        const healAmt = Math.round(bs.playerMaxHP * healPct);
        bs.playerHP = Math.min(bs.playerMaxHP, bs.playerHP + healAmt); state.health = bs.playerHP;
        bs.turns.push({ who:'skill', type:'heal', heal: healAmt, name: skillName });
        bs.turnCount++; afterPlayerAction(); return;
      case 'profitableDeal': manaCost = 5; if(state.mana < manaCost){ pushLog(state, 'Not enough mana!', 'lose'); return; }
        state.mana -= manaCost;
        const stealPct = 0.3 * (1 + getClassSkillLevel(state, 'profitableDeal') * 0.03);
        const stolen = Math.round((m.goldMin + Math.random() * (m.goldMax - m.goldMin)) * stealPct);
        bs.rewards = bs.rewards || {}; bs.rewards.stolenGold = (bs.rewards.stolenGold || 0) + stolen;
        bs.turns.push({ who:'skill', type:'steal', gold: stolen, name: skillName });
        bs.turnCount++; afterPlayerAction(); return;
    }
  }
  const chargeMult = getChargeMultiplier();
  if(chargeMult > 1){ dmg = Math.round(dmg * chargeMult); }
  if(isCrit) dmg = Math.round(dmg * 2);
  m.hp -= dmg;
  updateMissionProgress('hits_landed', 1);
  bs.turns.push({ who:'player', dmg, crit:isCrit, pierce:isPierce, charge: chargeMult > 1 ? chargeMult : null, skill: skillName || null });
  if(chargeMult > 1) bs.chargeLevel = 0;
  if(m.hp <= 0){ m.hp = 0; bs.won = true; awardBattleRewards(); renderBody(); playBattleEffects(bs); scheduleSave(); return; }
  bs.turnCount++; afterPlayerAction();
}


function chargeAttack(){
  if(!battleState || battleState.won || battleState.lost || battleState.fled) return;
  const bs = battleState;
  if(bs.chargeLevel >= 4){ pushLog(state, 'Charge maxed at ×3!', 'gain'); return; }
  bs.chargeLevel++; const mult = getChargeMultiplier();
  bs.turns.push({ who:'player', type:'charge', mult }); bs.turnCount++; afterPlayerAction();
}

function defendStance(){
  if(!battleState || battleState.won || battleState.lost || battleState.fled) return;
  battleState.isDefending = true;
  battleState.turns.push({ who:'player', type:'defend' });
  battleState.turnCount++; afterPlayerAction();
}

function useSkill(skillKey){
  if(!battleState || battleState.won || battleState.lost || battleState.fled) return;
  if(!state.playerClass) return;
  const cls = CLASS_DATA[state.playerClass];
  const skDef = cls.skills.find(s=>s.key===skillKey);
  if(!skDef) return;
  let manaCost = 0;
  if(skillKey === 'powerStrike') manaCost = 10;
  else if(skillKey === 'keenEye') manaCost = 8;
  else if(skillKey === 'arcanePower') manaCost = 15;
  else if(skillKey === 'fastHeal') manaCost = 10;
  else if(skillKey === 'profitableDeal') manaCost = 5;
  if(state.mana < manaCost){ pushLog(state, `Need ${manaCost} mana for ${skDef.nameAr}!`, 'lose'); return; }
  playerAttackAction(true, skillKey);
}

function attemptFlee(){
  if(!battleState || battleState.won || battleState.lost || battleState.fled) return;
  const bs = battleState; const roll = Math.random();
  if(roll < 0.7){
    bs.fled = true; state.battleActive = false;
    bs.turns.push({ who:'player', type:'flee', success:true });
    pushLog(state, 'Escaped successfully!', 'gain');
  } else {
    bs.turns.push({ who:'player', type:'flee', success:false });
    pushLog(state, 'Flee failed! Monster attacks!', 'lose');
    bs.turnCount++; monsterAttackAction();
  }
  renderBody(); playBattleEffects(bs); scheduleSave();
}

function afterPlayerAction(){
  if(!battleState) return;
  const bs = battleState;
  if(bs.won || bs.lost || bs.fled) return;
  if(bs.monster.burnTurns > 0){
    bs.monster.hp = Math.max(0, bs.monster.hp - bs.monster.burnDmg);
    bs.turns.push({ who:'burn', dmg: bs.monster.burnDmg });
    bs.monster.burnTurns--;
    if(bs.monster.hp <= 0){ bs.monster.hp = 0; bs.won = true; awardBattleRewards(); renderBody(); playBattleEffects(bs); scheduleSave(); return; }
  }
  monsterAttackAction();
}

function monsterAttackAction(){
  if(!battleState) return;
  const bs = battleState; const pStats = bs.playerStats; const m = bs.monster;
  if(bs.won || bs.lost || bs.fled) return;
  const dodgeRoll = Math.random();
  const dodged = dodgeRoll < pStats.dodge;
  if(dodged){ bs.turns.push({ who:'monster', dmg:0, dodge:true }); bs.isDefending = false; bs.waitingForPlayer = true; renderBody(); playBattleEffects(bs); return; }
  let dmg = Math.max(1, Math.round(m.atk * (1 - Math.min(0.85, pStats.def))));
  if(bs.isDefending){ dmg = Math.max(1, Math.round(dmg * 0.5)); bs.isDefending = false; }
  const critRoll = Math.random(); const isCrit = critRoll < m.crit;
  if(isCrit) dmg = Math.round(dmg * 2);
  bs.playerHP -= dmg; state.health = bs.playerHP;
  bs.turns.push({ who:'monster', dmg, crit:isCrit });
  if(bs.playerHP <= 0){ bs.playerHP = 0; state.health = 0; bs.lost = true; state.combat.losses += 1; pushLog(state, `${m.name} defeated you!`, 'lose'); }
  bs.waitingForPlayer = true; renderBody(); playBattleEffects(bs); scheduleSave();
}

function awardBattleRewards(){
  const bs = battleState; const m = bs.monster;
  let gold = Math.round(m.goldMin + Math.random() * (m.goldMax - m.goldMin));
  let xp = m.xp;
  if(bs.rewards && bs.rewards.stolenGold){ gold += bs.rewards.stolenGold; }
  const crit = getCritChance(state);
  if(Math.random() < crit){ gold = Math.round(gold * 1.5); xp = Math.round(xp * 1.3); }
  if(state.playerClass === 'merchant'){
    gold = Math.round(gold * (1 + getClassSkillLevel(state, 'deepPockets') * 0.05));
  }
  state.gold += gold; state.totalGoldEarned += gold; state.combat.wins += 1;
  const leveled = grantXp(state, xp); updateMissionProgress('battles_won', 1);
  const loot = {};
  m.loot.forEach(l => { const amount = l.min + Math.floor(Math.random() * (l.max - l.min + 1)); if(amount > 0){ state.inv[l.item] = (state.inv[l.item] || 0) + amount; loot[l.item] = amount; } });
  const shards = 5 + Math.floor(Math.random() * 11); state.shards += shards;
  const dropChance = 0.30 + (state.playerClass === 'merchant' ? getClassSkillLevel(state, 'lucky') * 0.03 : 0);
  let gearDrop = null;
  if(Math.random() < dropChance){ const tier = rollTier(state.level); const slots = Object.keys(GEAR_SLOTS); const slot = slots[Math.floor(Math.random()*slots.length)]; gearDrop = generateGear(slot, tier); if(state.gearBag.length < GEAR_BAG_LIMIT){ state.gearBag.push(gearDrop); } }
  let gemDrop = 0;
  if(Math.random() < 0.05 + (state.playerClass === 'merchant' ? getClassSkillLevel(state, 'lucky') * 0.03 : 0)){ gemDrop = 1 + Math.floor(Math.random() * 3); state.gems += gemDrop; }
  let spiritHeal = 0;
  if(state.playerClass === 'warrior'){
    const lvl = getClassSkillLevel(state, 'warriorSpirit');
    if(lvl > 0){
      const maxH = getMaxHealth(state);
      spiritHeal = Math.min(maxH - state.health, Math.round(maxH * lvl * 0.03));
      if(spiritHeal > 0) state.health += spiritHeal;
    }
  }
  bs.rewards = { gold, xp, loot, shards, gearDrop, gemDrop, stolenGold: bs.rewards && bs.rewards.stolenGold ? bs.rewards.stolenGold : 0 };
  pushLog(state, `Victory! Defeated ${m.name} (+${gold}g, +${xp}xp)`, 'win');
  if(leveled){ pushLog(state, `Reached level ${state.level}! (+1 skill point)`, 'levelup'); showToast('Level Up!', `You reached level ${state.level}. +1 Skill Point`, 'levelup'); }
  if(gearDrop){ const t = GEAR_TIERS[gearDrop.tier]; pushLog(state, `Found [${t.symbol}] ${gearDrop.name}!`, 'gear'); }
  if(gemDrop > 0){ pushLog(state, `Found ${gemDrop} <img class="ui-icon" src="${ICONS.gem}" alt="💎"> Gem(s)!`, 'win'); }
  if(spiritHeal > 0){ pushLog(state, `Warrior Spirit: +${spiritHeal} HP`, 'win'); }
  state.battleActive = false; renderHeader(); scheduleSave();
}

function fleeBattle(){
  if(!battleState) return; battleState.fled = true; state.battleActive = false;
  pushLog(state, 'You fled from battle!', 'lose'); renderBody(); scheduleSave();
}

function closeBattle(){
  battleState = null; state.battleActive = false;
  battleItemMenuOpen = false; battleCodexOpen = false; renderBody();
}

function toggleBattleItems(){
  if(!battleState) return; battleItemMenuOpen = !battleItemMenuOpen;
  battleCodexOpen = false; renderBody();
}

function toggleBattleCodex(){
  if(!battleState) return; battleCodexOpen = !battleCodexOpen;
  battleItemMenuOpen = false; renderBody();
}

function useBattleItem(key){
  if(!battleState || battleState.won || battleState.lost || battleState.fled) return;
  const bs = battleState;
  if(BREAD_TIERS[key]){
    if((state.inv[key]||0) < 1) return; state.inv[key] -= 1;
    const b = BREAD_TIERS[key]; const oldHp = bs.playerHP;
    bs.playerHP = Math.min(bs.playerMaxHP, bs.playerHP + b.heal); state.health = bs.playerHP;
    bs.turns.push({ who:'item', type:'health', heal: bs.playerHP - oldHp, name: b.name });
  } else if(ENERGY_POTION_TIERS[key] || key === 'energy_potion'){
    if((state.inv[key]||0) < 1) return; state.inv[key] -= 1;
    let energy = 0; if(ENERGY_POTION_TIERS[key]) energy = ENERGY_POTION_TIERS[key].energy; else if(key === 'energy_potion') energy = 20;
    state.energy = Math.min(getMaxEnergy(state), state.energy + energy);
    bs.turns.push({ who:'item', type:'energy', energy, name: ENERGY_POTION_TIERS[key] ? ENERGY_POTION_TIERS[key].name : 'Energy Potion' });
  } else if(key === 'health_potion'){
    if((state.inv[key]||0) < 1) return; state.inv[key] -= 1;
    const heal = 30 + Math.floor(Math.random()*21); const oldHp = bs.playerHP;
    bs.playerHP = Math.min(bs.playerMaxHP, bs.playerHP + heal); state.health = bs.playerHP;
    bs.turns.push({ who:'item', type:'health', heal: bs.playerHP - oldHp, name: 'Health Potion' });
  }
  battleItemMenuOpen = false; bs.turnCount++; afterPlayerAction();
}

function usePotion(type){
  if(!battleState || battleState.won || battleState.lost || battleState.fled) return;
  if(type === 'health'){ const key = getBestHpItem(); if(key) useBattleItem(key); }
  else if(type === 'energy'){ const key = getBestEnergyItem(); if(key) useBattleItem(key); }
}

function renderBattle(){
  if(!battleState) return '';
  const bs = battleState, m = bs.monster;
  const pMax = bs.playerMaxHP, pHp = bs.playerHP;
  const mMax = m.maxHp, mHp = m.hp;
  const pPct = Math.max(0, (pHp/pMax)*100), mPct = Math.max(0, (mHp/mMax)*100);
  const manaPct = Math.max(0, (state.mana / state.maxMana) * 100);
  const chargeMult = getChargeMultiplier();
  const chargeText = chargeMult > 1 ? `×${chargeMult.toFixed(1)}` : '';
  const cls = state.playerClass ? CLASS_DATA[state.playerClass] : null;
  const canAct = bs.waitingForPlayer && !bs.won && !bs.lost && !bs.fled;

  // Build last few battle log lines for inline display
  const logLines = bs.turns.slice(-4).map(t => {
    let txt = '', color = 'var(--dim)';
    if(t.who==='player' && t.type==='charge'){ txt=`<img class="ui-icon" src="${ICONS.energy}" alt="⚡"> Charge ${t.mult.toFixed(1)}×`; color='var(--brass-bright)'; }
    else if(t.who==='player' && t.type==='defend'){ txt=`🛡️ Defending`; color='var(--skill)'; }
    else if(t.who==='player' && t.type==='flee' && t.success){ txt=`🏃 Escaped!`; color='var(--green)'; }
    else if(t.who==='player' && t.type==='flee' && !t.success){ txt=`🏃 Flee failed`; color='var(--red)'; }
    else if(t.who==='player' && t.skill){ txt=`✨ ${t.skill} ${t.dmg} dmg`; color='var(--prestige)'; }
    else if(t.who==='player' && t.dmg>0){ txt=`⚔️ ${t.dmg}${t.crit?' 💥':''}${t.charge?' ('+t.charge.toFixed(1)+'×)':''}`; color='var(--green)'; }
    else if(t.who==='monster' && t.dmg>0){ txt=`🩸 ${t.dmg}${t.crit?' 💥':''}`; color='var(--red)'; }
    else if(t.who==='monster' && t.dodge){ txt=`💨 Dodged!`; color='var(--skill)'; }
    else if(t.who==='burn'){ txt=`🔥 Burn ${t.dmg}`; color='var(--copper)'; }
    else if(t.who==='skill' && t.type==='heal'){ txt=`💚 +${t.heal} HP`; color='var(--health)'; }
    else if(t.who==='skill' && t.type==='steal'){ txt=`💰 +${t.gold}g`; color='var(--brass-bright)'; }
    else if(t.who==='item' && t.type==='health'){ txt=`🧪 +${t.heal} HP`; color='var(--health)'; }
    else if(t.who==='item' && t.type==='energy'){ txt=`🧪 +${t.energy}<img class="ui-icon" src="${ICONS.energy}" alt="⚡">`; color='var(--brass-bright)'; }
    return `<span style="color:${color};font-size:11px;margin-right:10px;white-space:nowrap;">${txt}</span>`;
  }).join('');

  // Result overlay
  const resultHtml = bs.won ? `
    <div style="position:absolute;inset:0;background:rgba(5,12,10,0.88);backdrop-filter:blur(4px);z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;text-align:center;animation:fadeIn 0.3s ease-out;">
      <div style="font-size:56px;animation:pulse 1.5s ease-in-out infinite;"><img class="ui-icon" src="${ICONS.trophy}" alt="🏆"></div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:24px;color:var(--green);">Victory!</div>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:220px;">
        <div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span><img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙"> Gold</span><b style="color:var(--brass-bright);">${bs.rewards.gold}</b></div>
        <div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span>✨ XP</span><b style="color:var(--prestige);">${bs.rewards.xp}</b></div>
        ${bs.rewards.shards ? `<div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span><img class="ui-icon" src="${ICONS.shard}" alt="🔷"> Shards</span><b style="color:var(--skill);">${bs.rewards.shards}</b></div>` : ''}
        ${bs.rewards.gemDrop ? `<div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span><img class="ui-icon" src="${ICONS.gem}" alt="💎"> Gems</span><b style="color:var(--gem);">${bs.rewards.gemDrop}</b></div>` : ''}
      </div>
      ${Object.keys(bs.rewards.loot).length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:4px;">${Object.entries(bs.rewards.loot).map(([k,v])=>`<span class="resource-chip">${ITEMS[k].icon} ${v}</span>`).join('')}</div>` : ''}
      ${bs.rewards.gearDrop ? `<div style="background:var(--panel-light);border:1px solid ${GEAR_TIERS[bs.rewards.gearDrop.tier].color};border-radius:8px;padding:8px 14px;font-size:13px;color:${GEAR_TIERS[bs.rewards.gearDrop.tier].color};">[${GEAR_TIERS[bs.rewards.gearDrop.tier].symbol}] ${bs.rewards.gearDrop.name}</div>` : ''}
      <button class="act-btn buy" style="width:auto;padding:12px 36px;font-size:14px;margin-top:6px;" onclick="closeBattle()">Continue</button>
    </div>`
    : bs.lost ? `
    <div style="position:absolute;inset:0;background:rgba(5,12,10,0.88);backdrop-filter:blur(4px);z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;text-align:center;animation:fadeIn 0.3s ease-out;">
      <div style="font-size:56px;">💀</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:24px;color:var(--red);">Defeat</div>
      <div style="font-size:13px;color:var(--dim);">${m.nameAr} defeated you.</div>
      <button class="act-btn red" style="width:auto;padding:12px 36px;font-size:14px;margin-top:6px;" onclick="closeBattle()">Continue</button>
    </div>`
    : bs.fled ? `
    <div style="position:absolute;inset:0;background:rgba(5,12,10,0.88);backdrop-filter:blur(4px);z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;text-align:center;animation:fadeIn 0.3s ease-out;">
      <div style="font-size:56px;">🏃</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:22px;color:var(--copper);">You fled!</div>
      <button class="act-btn" style="width:auto;padding:12px 36px;font-size:14px;margin-top:6px;" onclick="closeBattle()">Continue</button>
    </div>`
    : '';

  // Skill button (first class skill)
  const skillBtn = cls ? (()=>{
    const sk = cls.skills[0];
    let manaCost = 0, skillLabel = sk.nameAr;
    if(sk.key==='powerStrike') manaCost = 10;
    else if(sk.key==='keenEye') manaCost = 8;
    else if(sk.key==='arcanePower') manaCost = 15;
    else if(sk.key==='fastHeal') manaCost = 10;
    else if(sk.key==='profitableDeal') manaCost = 5;
    const hasMana = state.mana >= manaCost;
    return { key: sk.key, label: skillLabel, mana: manaCost, disabled: !canAct || !hasMana };
  })() : null;

  // Item menu overlay
  const itemMenuHtml = battleItemMenuOpen ? `
    <div style="position:absolute;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--border);border-radius:16px 16px 0 0;padding:16px;z-index:20;animation:slideUp 0.25s ease-out;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:13px;color:var(--dim);font-family:'Cairo',sans-serif;font-weight:700;">🧪 Use Item</div>
        <button style="background:none;border:none;color:var(--dim);font-size:18px;cursor:pointer;" onclick="toggleBattleItems()">✕</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${Object.keys(BREAD_TIERS).map(key=>{ const have = state.inv[key]||0; if(have<1) return ''; const b = BREAD_TIERS[key]; return `<button class="mini-btn" style="border-color:var(--health);color:var(--health);padding:8px 12px;" onclick="useBattleItem('${key}')">${ITEMS[key].icon} ${b.name} +${b.heal}HP ×${have}</button>`; }).join('')}
        ${Object.keys(ENERGY_POTION_TIERS).map(key=>{ const have = state.inv[key]||0; if(have<1) return ''; const p = ENERGY_POTION_TIERS[key]; return `<button class="mini-btn" style="border-color:var(--brass-bright);color:var(--brass-bright);padding:8px 12px;" onclick="useBattleItem('${key}')">${ITEMS[key].icon} ${p.name} +${p.energy}<img class="ui-icon" src="${ICONS.energy}" alt="⚡"> ×${have}</button>`; }).join('')}
        ${(state.inv.health_potion||0)>0 ? `<button class="mini-btn" style="border-color:var(--health);color:var(--health);padding:8px 12px;" onclick="useBattleItem('health_potion')">💚 Health Potion +30-50HP ×${state.inv.health_potion}</button>` : ''}
      </div>
    </div>
  ` : '';

  // Codex overlay
  const codexHtml = battleCodexOpen ? `
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(5,12,10,0.92);backdrop-filter:blur(6px);z-index:20;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease-out;" onclick="if(event.target===this)toggleBattleCodex()">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px;width:100%;max-width:360px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);"><img class="ui-icon" src="${ICONS.book_codex}" alt="📖"> Codex — ${m.nameAr}</div>
          <button style="background:none;border:none;color:var(--dim);font-size:18px;cursor:pointer;" onclick="toggleBattleCodex()">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:var(--dim);margin-bottom:12px;">
          <div>👹 Level: <b style="color:var(--text);">${m.level}</b></div>
          <div><img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️"> HP: <b style="color:var(--text);">${m.maxHp}</b></div>
          <div>⚔️ ATK: <b style="color:var(--text);">${m.atkMin}-${m.atkMax}</b></div>
          <div>🛡️ DEF: <b style="color:var(--text);">${m.def}</b></div>
          <div>💨 SPD: <b style="color:var(--text);">${m.spd}</b></div>
          <div>🎯 Crit: <b style="color:var(--text);">${(m.crit*100).toFixed(0)}%</b></div>
        </div>
        <div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Expected Loot</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
          ${m.loot.map(l=>`<span class="resource-chip" style="font-size:10px;">${ITEMS[l.item].icon} ${l.min}-${l.max} ${ITEMS[l.item].name}</span>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--dim);">💰 Gold: ${m.goldMin}-${m.goldMax}g · ✨ XP: ${m.xp}</div>
      </div>
    </div>
  ` : '';

  return `<div style="position:relative;display:flex;flex-direction:column;height:100%;min-height:calc(100vh - 60px);background:linear-gradient(180deg,#0a140f 0%,#142820 40%,#1a3020 100%);overflow:hidden;">
    <!-- Top Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;z-index:5;">
      <div>
        <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:18px;color:var(--text);text-transform:uppercase;letter-spacing:0.05em;">${m.name}</div>
        <div style="font-size:12px;color:var(--dim);">Level ${m.level}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="${canAct?'animate-pulse':''}" style="font-family:'Cairo',sans-serif;font-weight:800;font-size:11px;letter-spacing:0.06em;padding:5px 10px;border-radius:20px;background:${canAct?'rgba(111,162,133,0.15)':'rgba(196,76,76,0.15)'};color:${canAct?'var(--green)':'var(--red)'};border:1px solid ${canAct?'var(--green)':'var(--red)'};text-transform:uppercase;">${canAct?'⚡ Your Turn':'👹 Enemy Turn'}</div>
        <button class="mini-btn" style="border-color:var(--border);color:var(--dim);font-size:12px;padding:6px 12px;display:flex;align-items:center;gap:6px;" onclick="toggleBattleCodex()"><img class="ui-icon" src="${ICONS.book_codex}" alt="📖"> Codex</button>
      </div>
    </div>

    <!-- Battle Scene -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;padding:0 20px;gap:24px;">
      <!-- Grass background hint -->
      <div style="position:absolute;bottom:30%;left:0;right:0;height:40%;background:linear-gradient(0deg,rgba(30,60,35,0.6) 0%,transparent 100%);pointer-events:none;"></div>

      <!-- Characters Row -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;width:100%;max-width:420px;position:relative;z-index:2;">
        <!-- Player -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div id="battle-player-sprite" style="font-size:52px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">${cls?cls.icon:'🧙'}</div>
          <!-- HP Bar -->
          <div style="width:90px;height:10px;background:#3a1a1a;border-radius:5px;overflow:hidden;border:1px solid #5a2a2a;position:relative;">
            <div style="width:${pPct}%;height:100%;background:linear-gradient(90deg,#c44c4c,#e06060);transition:width 0.4s ease-out;"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:8px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);font-weight:700;">${Math.floor(pHp)}</div>
          </div>
          <!-- MP Bar -->
          <div style="width:90px;height:6px;background:#1a2a3a;border-radius:3px;overflow:hidden;border:1px solid #2a4a5a;">
            <div style="width:${manaPct}%;height:100%;background:linear-gradient(90deg,#4a8cc4,#6ab8e0);transition:width 0.4s ease-out;"></div>
          </div>
          <div style="font-size:10px;color:var(--dim);font-family:'JetBrains Mono',monospace;">${Math.floor(state.mana)} MP</div>
        </div>

        <!-- VS or Charge indicator -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          ${chargeText ? `<div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);text-shadow:0 0 12px rgba(212,162,76,0.4);animation:pulse 1s ease-in-out infinite;"><img class="ui-icon" src="${ICONS.energy}" alt="⚡"> ${chargeText}</div>` : `<div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:14px;color:var(--dim);opacity:0.5;">VS</div>`}
          ${bs.isDefending ? `<div style="font-size:11px;color:var(--skill);font-weight:700;">🛡️ Defending</div>` : ''}
          ${m.burnTurns > 0 ? `<div style="font-size:11px;color:var(--copper);font-weight:700;">🔥 Burn ${m.burnTurns}t</div>` : ''}
        </div>

        <!-- Monster -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div id="battle-monster-sprite" style="font-size:52px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">${m.icon}</div>
          <!-- HP Bar -->
          <div style="width:90px;height:10px;background:#3a1a1a;border-radius:5px;overflow:hidden;border:1px solid #5a2a2a;position:relative;">
            <div style="width:${mPct}%;height:100%;background:linear-gradient(90deg,#c44c4c,#e06060);transition:width 0.4s ease-out;"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:8px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);font-weight:700;">${Math.floor(mHp)}</div>
          </div>
          <div style="font-size:10px;color:var(--dim);font-family:'JetBrains Mono',monospace;">${m.nameAr}</div>
        </div>
      </div>

      <!-- Mini Log -->
      <div style="width:100%;max-width:400px;height:32px;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
        ${logLines || '<span style="color:var(--dim);font-size:11px;">Battle started...</span>'}
      </div>
    </div>

    <!-- Action Buttons -->
    <div style="padding:12px 16px 24px;display:flex;flex-direction:column;gap:8px;z-index:5;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <!-- CHARGE -->
        <button class="battle-btn" style="${!canAct?'opacity:0.35;':''}" ${!canAct?'disabled':''} onclick="chargeAttack()">
          <div style="font-size:10px;color:var(--dim);margin-bottom:2px;">FREE · STACKS ×0.5</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.08em;">CHARGE</div>
        </button>
        <!-- ATTACK -->
        <button class="battle-btn" style="${!canAct?'opacity:0.35;':''}" ${!canAct?'disabled':''} onclick="playerAttackAction(false)">
          <div style="font-size:22px;margin-bottom:2px;">⚔️</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.08em;">ATTACK</div>
        </button>
        <!-- DEFEND -->
        <button class="battle-btn" style="${!canAct?'opacity:0.35;':''}" ${!canAct?'disabled':''} onclick="defendStance()">
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.08em;">DEFEND</div>
        </button>
        <!-- SKILL -->
        <button class="battle-btn" style="border-color:${skillBtn && !skillBtn.disabled ? 'var(--prestige)' : 'var(--border)'};color:${skillBtn && !skillBtn.disabled ? 'var(--prestige)' : 'var(--dim)'};${(skillBtn && skillBtn.disabled) || !canAct ? 'opacity:0.35;' : ''}" ${(skillBtn && skillBtn.disabled) || !canAct ? 'disabled' : ''} onclick="useSkill('${skillBtn ? skillBtn.key : ''}')">
          <div style="font-size:22px;margin-bottom:2px;">✨</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.08em;">SKILL</div>
          ${skillBtn ? `<div style="font-size:9px;color:var(--dim);margin-top:1px;"><img class="ui-icon" src="${ICONS.mana}" alt="🔮"> ${skillBtn.mana} MP</div>` : ''}
        </button>
        <!-- FLEE -->
        <button class="battle-btn" style="${!canAct?'opacity:0.35;':''}" ${!canAct?'disabled':''} onclick="attemptFlee()">
          <div style="font-size:22px;margin-bottom:2px;">👢</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.08em;">FLEE</div>
        </button>
        <!-- ITEM -->
        <button class="battle-btn" style="${!canAct?'opacity:0.35;':''}" ${!canAct?'disabled':''} onclick="toggleBattleItems()">
          <div style="font-size:22px;margin-bottom:2px;">🧪</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.08em;">ITEM</div>
        </button>
      </div>
      <!-- Forfeit row -->
      <div style="display:flex;justify-content:center;gap:8px;margin-top:4px;">
        <button class="mini-btn" style="font-size:10px;padding:4px 12px;opacity:0.6;" onclick="fleeBattle()">🏃 Forfeit</button>
      </div>
    </div>

    ${resultHtml}
    ${itemMenuHtml}
    ${codexHtml}
  </div>
  <style>
    .battle-btn {
      background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      color: var(--text);
      padding: 14px 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 72px;
      transition: all 0.15s;
      position: relative;
      overflow: hidden;
    }
    .battle-btn:hover:not(:disabled) {
      border-color: var(--brass);
      background: linear-gradient(180deg, rgba(212,162,76,0.08) 0%, rgba(212,162,76,0.02) 100%);
      transform: translateY(-1px);
    }
    .battle-btn:active:not(:disabled) {
      transform: scale(0.97);
    }
    .battle-btn:disabled {
      cursor: not-allowed;
    }
  </style>`;
}

// ─── Battle Helper Utilities ───
function getBestHpItem(){
  const order = ['legendary_bread','honey_bread','toasted_bread','health_potion'];
  for(const k of order){ if((state.inv[k]||0) > 0) return k; }
  return null;
}
function getBestEnergyItem(){
  const order = ['legendary_energy_potion','large_energy_potion','medium_energy_potion','small_energy_potion','energy_potion'];
  for(const k of order){ if((state.inv[k]||0) > 0) return k; }
  return null;
}
