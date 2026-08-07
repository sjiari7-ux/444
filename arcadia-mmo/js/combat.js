// ─── Battle System ───
/* ===== BATTLE SYSTEM ===== */
let battleState = null;

/* ===== INTERACTIVE BATTLE SYSTEM v2 ===== */
let battleItemMenuOpen = false;
let battleCodexOpen = false;

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
    waitingForPlayer: true, rewards: null,
  };
  state.battleActive = true;
  battleItemMenuOpen = false;
  battleCodexOpen = false;
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
  let dmg = Math.max(1, pStats.atk - m.def);
  let isCrit = Math.random() < pStats.crit;
  let isPierce = false;
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
        state.mana -= manaCost; const healAmt = Math.round(bs.playerMaxHP * 0.3);
        bs.playerHP = Math.min(bs.playerMaxHP, bs.playerHP + healAmt); state.health = bs.playerHP;
        bs.turns.push({ who:'skill', type:'heal', heal: healAmt, name: skillName });
        bs.turnCount++; afterPlayerAction(); return;
      case 'profitableDeal': manaCost = 5; if(state.mana < manaCost){ pushLog(state, 'Not enough mana!', 'lose'); return; }
        state.mana -= manaCost; const stolen = Math.round(m.goldMin * 0.3 + Math.random() * (m.goldMax - m.goldMin) * 0.3);
        bs.rewards = bs.rewards || {}; bs.rewards.stolenGold = (bs.rewards.stolenGold || 0) + stolen;
        bs.turns.push({ who:'skill', type:'steal', gold: stolen, name: skillName });
        bs.turnCount++; afterPlayerAction(); return;
    }
  }
  const chargeMult = getChargeMultiplier();
  if(chargeMult > 1){ dmg = Math.round(dmg * chargeMult); }
  if(isCrit) dmg = Math.round(dmg * 2);
  if(isPierce) dmg = Math.max(1, Math.round(pStats.atk * 1.5));
  m.hp -= dmg;
  bs.turns.push({ who:'player', dmg, crit:isCrit, pierce:isPierce, charge: chargeMult > 1 ? chargeMult : null, skill: skillName || null });
  if(chargeMult > 1) bs.chargeLevel = 0;
  if(m.hp <= 0){ m.hp = 0; bs.won = true; awardBattleRewards(); renderBody(); scheduleSave(); return; }
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
  renderBody(); scheduleSave();
}

function afterPlayerAction(){
  if(!battleState) return;
  const bs = battleState;
  if(bs.won || bs.lost || bs.fled) return;
  if(bs.monster.burnTurns > 0){
    bs.monster.hp = Math.max(0, bs.monster.hp - bs.monster.burnDmg);
    bs.turns.push({ who:'burn', dmg: bs.monster.burnDmg });
    bs.monster.burnTurns--;
    if(bs.monster.hp <= 0){ bs.monster.hp = 0; bs.won = true; awardBattleRewards(); renderBody(); scheduleSave(); return; }
  }
  monsterAttackAction();
}

function monsterAttackAction(){
  if(!battleState) return;
  const bs = battleState; const pStats = bs.playerStats; const m = bs.monster;
  if(bs.won || bs.lost || bs.fled) return;
  const dodgeRoll = Math.random();
  const dodged = dodgeRoll < pStats.dodge;
  if(dodged){ bs.turns.push({ who:'monster', dmg:0, dodge:true }); bs.isDefending = false; bs.waitingForPlayer = true; renderBody(); return; }
  let dmg = Math.max(1, Math.round(m.atk * (1 - Math.min(0.85, pStats.def))));
  if(bs.isDefending){ dmg = Math.max(1, Math.round(dmg * 0.5)); bs.isDefending = false; }
  const critRoll = Math.random(); const isCrit = critRoll < m.crit;
  if(isCrit) dmg = Math.round(dmg * 2);
  bs.playerHP -= dmg; state.health = bs.playerHP;
  bs.turns.push({ who:'monster', dmg, crit:isCrit });
  if(bs.playerHP <= 0){ bs.playerHP = 0; state.health = 0; bs.lost = true; state.combat.losses += 1; pushLog(state, `${m.name} defeated you!`, 'lose'); }
  bs.waitingForPlayer = true; renderBody(); scheduleSave();
}

function awardBattleRewards(){
  const bs = battleState; const m = bs.monster;
  let gold = Math.round(m.goldMin + Math.random() * (m.goldMax - m.goldMin));
  let xp = m.xp;
  if(bs.rewards && bs.rewards.stolenGold){ gold += bs.rewards.stolenGold; }
  const crit = getCritChance(state);
  if(Math.random() < crit){ gold = Math.round(gold * 1.5); xp = Math.round(xp * 1.3); }
  state.gold += gold; state.totalGoldEarned += gold; state.combat.wins += 1;
  const leveled = grantXp(state, xp); trackMission(state, 'wins', 1);
  const loot = {};
  m.loot.forEach(l => { const amount = l.min + Math.floor(Math.random() * (l.max - l.min + 1)); if(amount > 0){ state.inv[l.item] = (state.inv[l.item] || 0) + amount; loot[l.item] = amount; } });
  const shards = 5 + Math.floor(Math.random() * 11); state.shards += shards;
  const dropChance = 0.30 + (state.playerClass === 'merchant' ? getClassSkillLevel(state, 'lucky') * 0.03 : 0);
  let gearDrop = null;
  if(Math.random() < dropChance){ const tier = rollTier(state.level); const slots = Object.keys(GEAR_SLOTS); const slot = slots[Math.floor(Math.random()*slots.length)]; gearDrop = generateGear(slot, tier); if(state.gearBag.length < GEAR_BAG_LIMIT){ state.gearBag.push(gearDrop); } }
  let gemDrop = 0;
  if(Math.random() < 0.05 + (state.playerClass === 'merchant' ? getClassSkillLevel(state, 'lucky') * 0.03 : 0)){ gemDrop = 1 + Math.floor(Math.random() * 3); state.gems += gemDrop; }
  bs.rewards = { gold, xp, loot, shards, gearDrop, gemDrop, stolenGold: bs.rewards && bs.rewards.stolenGold ? bs.rewards.stolenGold : 0 };
  pushLog(state, `Victory! Defeated ${m.name} (+${gold}g, +${xp}xp)`, 'win');
  if(leveled){ pushLog(state, `Reached level ${state.level}! (+1 skill point)`, 'levelup'); showToast('Level Up!', `You reached level ${state.level}. +1 Skill Point`, 'levelup'); }
  if(gearDrop){ const t = GEAR_TIERS[gearDrop.tier]; pushLog(state, `Found [${t.symbol}] ${gearDrop.name}!`, 'gear'); }
  if(gemDrop > 0){ pushLog(state, `Found ${gemDrop} <img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA2VJREFUSEuNlk2IHFUUhb/zesaJC0EXbgwOBARNdCVBBZNZxKTTrQEVguJCQYiBxBAQjMGRSKIJATG4GDAqiiIYBBdRnGS6ZwYRBhJ/0IXkZxHBlXEZMCNGZ/odra7q6qrqnuhbdBfvvrr3nHvuu7fEikuAVzYPWIafT3a7KzcPPuSuiiY5Cy/In4fAyQNUwgw6/Z87VRDXZyBn6FZKVwo/ZVCkkp5PftMA2fvN+bjOHT0x1J0h3sDJkcjtscP6lFDiOXGc0UskC5xv1fVZz21mTcVszPrcsnhwxPwEjPeF8eloHQniPWDMNXZpmf2Izb3M2Uxjdipw2au4rT2h3/oMUudHgEnMJwq8Y7PQRSEWOpHXg3gLuDtz+HMM7KpFDhgmBIvL+M4gvS/TNJ5p18PDPRY0W37MgZNpXSj5e0mBRXd4XqPsc+RNzLpikUS4VIM9iGNEJh2499/XD+ZnzKHWVh3Uti+9enmU57rpCJgOUpebz3SsWwKszV9K7D0QvbSLb+kwIlhfMgnXAj+oOR+fdEdrU2EzBpmAtr6ReKBc3oYgExHB7jJOnksrFT+Ki12RG/NxJ5F3q/fk2ig3rVrie+Cu0mXMCy/xr40yC0Pu/LOtuj7Kq6g55302b/Qrp1vie6NYLbw/ATLkJrclpm2meuC6VOTdM/VwPElIidrWOR+WeaXA5LzEDpuzxcAFIXcgXsirK6kP82K7rmO985XcQXPOUzZ7cic17qDDCeC+XCcpYfe7zPYoZvNLJx1obdHhYqrzFBXpN2f9se2nk0sQzatBLGGOVjT6APMXYncW4GirHiarOuatotoRG+34OUGPyvyyJB4ZMRdKjRYamOPAGompmS3aOyyNKYNKU+s5asx5DrNZeIPRa8CmLkJxQeZl4y9An7bqeqqKvCT6kGGQ2gWNts9i/yh0zuLtrMEdkhg3jLfqyvtRiUGGstTsilHTZmu2n/GNVxf5DlMP4nJS747cE2qc+HPE93+9KVwrDp/iECw1u0GK/Z7eOO1bY2AiBJ6xGJP4MIwxe2pjuFIdZ9VWX5oHZQbFOQr1ltcosCFp16M1ZqYf0q/D9MuB9lOUpztlV4FQrJzHv/LNf/+BTm3TlaKj683nQQ0qQ3zodCturjRNMwSVAP/xiTCsFlcKkLn6B/RWcNXdxjx2AAAAAElFTkSuQmCC" alt="💎"> Gem(s)!`, 'win'); }
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
    if(t.who==='player' && t.type==='charge'){ txt=`<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡"> Charge ${t.mult.toFixed(1)}×`; color='var(--brass-bright)'; }
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
    else if(t.who==='item' && t.type==='energy'){ txt=`🧪 +${t.energy}<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡">`; color='var(--brass-bright)'; }
    return `<span style="color:${color};font-size:11px;margin-right:10px;white-space:nowrap;">${txt}</span>`;
  }).join('');

  // Result overlay
  const resultHtml = bs.won ? `
    <div style="position:absolute;inset:0;background:rgba(5,12,10,0.88);backdrop-filter:blur(4px);z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;text-align:center;animation:fadeIn 0.3s ease-out;">
      <div style="font-size:56px;animation:pulse 1.5s ease-in-out infinite;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA0RJREFUSEuFVT1oFEEU/t7cxWzEpIlobm/PICJYRAwRsfQHrUwMBsTOTiwlaiEWhghiFX9qOwVBBEEDplAwliJKxHQiYm5zG4lpjHh73t08M/s7+3Nm2WLmzcyb7733vW8IiY8AcNIUzvSlaOwPUlMgtngj71ODP441TYQLzHyJiAYgMRHv6AyFgTmG/CZI3GfGg56SPaX79bz/WbIOiy48I8JD2UIDAvMEvInQqcAiOKmwiMa5zSOiCMmMi7KJia0V+10A3HfRcMpnGXQRhOck5StJ0iUUv+XnK2Utyn3UBLEQJwk4DpaPu0u1p2FmPGRNe3CkLdpPjJK9Nzzu1qwFEA54G5hzIvCwfTJMezg641hfhCyc21L+/jG+IFh1nQqDccUwq3eUyV0pT4Lpjl40b6u6S93peeDLxsDyXW9/rXKZiGe6S7Ze25gev+xy/xZBPyHEaWNgaVbNi4IWBJGVxy5mspssh/vKy2vuyuAYZPvFX8nb+6zaWrg/VTbCetUa6iryZzDdM8zqZKNWvs5Etzpw96phVmcajnWbma41W9jfW6kuhrQkPas6zesrg7uB9k1iHJJtPiEKNAfGkJ+WYCfhk2zxqBD0mgXeA4UbPQPfA1LE3jLECwuj8vvbLg93FekIk5iFlM8BDAU1WKSCGGeWY60Wv91mLS/k9WOmyJlipvJSd6wjytRTst/G7dmh84O2yY2g02HXsd6oNcO0jwUUSkpFTqESUpHEQoqC6o/Uqe5YR70ITHtet3dqRuVcefEcRYj0k5qKra729/a2DK951gvuyI4dP9czgHShDNz6F+iKGGmhbie4K+YomGaDIp8yTPtlBnlWVgP5ioLIRuMHRHCd8jMAZxQgBj/aWrLPa0KdumsTmqaRuT8qe1jKXbpdCLHUvbP6VZN+bTl9wSbvjOtYUyzooB+Nr9vE/GFDc6Zjr3r08ZsT1SCiZooeDceKHo/oSYgGhO5SdTqLr2MEqRqAsYFeuZvvQMWjhmmroiSeyVCLPNXVJ7pIeQUkRqNmsS6/+p66Y7GhSXMiXQFlU42WDVZFEDpJEzpcyy1hug+y8uAfC1LkN6IHJ+kuTlE2iUEn5y8kOf6/MuayMzL+A6BcbS4X2D18AAAAAElFTkSuQmCC" alt="🏆"></div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:24px;color:var(--green);">Victory!</div>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:220px;">
        <div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA2RJREFUSEuNVUuIHFUUPefV2NWFjpuMyfQniYoOmIkfRHEhkRHMTrJxiGaniyQkMmDUheDC1SxFCChxIQoijWYz+CEIigpBInGhggQXxkT6M8mYLBKdrv7UO9JVNdU1VdWjD7qhX993zr3n/ggQgOJvpE50P+nkX+XtRzejz2ZQKsbdgiDzV6GLsU2GIO9vsV9FEWfebiJIo/wf7yYKt/HHOKYtIiAQy+Vfrd/LIfYK2iFxFkYXQbS82fbXxfkbexARjLE2fsI2q9t8OAdo7CHQ7M8mPHqog26ldTqCKy6WEXToaTq33U79MIXXAez+DzV+KVebD6aLLUuTEIyM/LXaHIdcFrAYOZivs2zVGWsfKtVaP+cciVWJCOI+6Hbq30BYIAs6ICFLVYHwFgAHDk/aIR71+s6KueuSH9ZYLEmSA79dPwlgKetJApeJRsAP5ZJd7PXNBQM8LfAzGd2AxYo75SzzjsudjfSi264+T/L9DVkKI0iYCUK/+n2zr+wOP5DMAcLMC/ZtAAuRmS6BWCrPtj4PI/A7tT8A3hnKJWFrApyBtSdEvkfycUBnnSnnpWBof8xE/61XaT4Z5qDbrv1piJ25yZOWRbgJ4Jgb4ExvCucB3D0CNDKPWGOPQjicJpCw5lWb28MIequ1BsTnigaAgLYD2yhV2q/2VutLEka5Cs8IPIBdJPFavg/0jldpvZiUaa9dfwPQboEvUPzKAt+RuO56bPT94GVZPAPyvjBxwnmIyzTBPgvzSuL5uNJOWRN8eOuO9vdJmfqr9XcpXLTAOYJ7ATsPg3touT+UTghzY6VlWZzybikNenawOpZFFyB+SqOzspoDzZvlSnP0JDp+Z9cewn4iYT6d5LhLfqexDch8XCoFN26u85/prvf38Pb1h/sD+FNldDHg/SAPQXhKwDSA0+VK8+CmYdfr7NojBE8QeMyKrgF+kvib23e+9N3Bs4Y8BmJexBUKVyTeBumB7FYBseIa5zi3X+4kEkVx5Kf/2trM9PTQOwLpCIi53EhIdbighhG+cKutj1KdXDBKJ2zK9U59wTHYpkAzFpgxwLoB/rLkNXeIc9zZvF4wCSbt5HRMaSe2tk8TxDt50u4tXG2FMuZkS11sGteTDfNkyf6Y9Gi8k/MhJzdplEyq8kVRjPMv4Yt7MK5KE1sAAAAASUVORK5CYII=" alt="🪙"> Gold</span><b style="color:var(--brass-bright);">${bs.rewards.gold}</b></div>
        <div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span>✨ XP</span><b style="color:var(--prestige);">${bs.rewards.xp}</b></div>
        ${bs.rewards.shards ? `<div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA6xJREFUSEt1lk1oXFUYhp/33NiIKAVdtHSmSiWWWtSY4CYImuJCKuimIGjBqISIYIVaWgSDTQuCP5Qi/fEHS8WF4EYXIu50Nt0I7cSIuJEqbUwN3RQlttq557V3bu7MvTOTuxjOvfOd837v934/R1QeAabzK2ev+ZN/7Dxly/IRPWbZtvKntdcL1B9x8GMR7klimB3lwvkSXtXProvtVdXBARjzYdM7SAewDiPvBEaMXhlLFz+vcJIpky6Ir0niZ7ava4Ur5wh6dbT1x3fzoX4I4izBT8SYTIi45cG49KIgXSOGqyEagNwMtf0S7yplwoEXgIcE3xiekdhgc1tbFKthe3aMpTO9Cq0yyGQoxMzX86pdBOqGlwQftQ3N1//6ppl14foliV9s7i1iK3P5BtjcaFw62St4R4Pij3NJfadS/pE8R2Ayx9brSvjRqb8V/B3F8WBmDHe095lGtOYy98ZYbJSAuyEqUrAZajPAAeR9juFKdFweCtoNTCXodIrfzKl7LlXyg1JfdRLXyzqCNT3uxUaR6ANEFvNDGx+PURMJetqRZQK/A7fIrT3W0FlwHamI6mkiWzKmbSJRO3IG3SrpS9Mm9UnBVRMTobcI/En0CRK2yjrlNtV8m/EnskZQBmAcwyCAXNhC5wxghWtnbw3DPxH5jYSbST1l6T2Jp6p14w+J2qbAZAabMRhnUIhKDaBJbTLJbIMbmXiStw3H/7ZeC8N/5cRNFqJcs3Acx/tyBv0AmX3OtVS9GYMQPG44kgFkmxVbGxyGlntTEHjfZrQMMCCLygCiqdqkFKdBu4k0MgGTGEbSEH/taTiZX2sAdGurrw5yBpww3l4wcGRMCc3e5lplkIuca1Ct6UqU2lkU/H1RQMAKwV9incq3dbOoj4G1Y8zdNB1YB5nIBH8q+bBgM9ZBY3WFLULquVbki4SwkSSuJyu0qOk166Ag1VR9EnlK8DziiMy+G0J+hYkEdgFLiuxy0KPgt1f7VCPNWoVQzqASot4ZBOdC7Y2A9wOvQR6arNm1HPamJCvDuv6xxZOlcF3OWseol072TsA+kTtMqD2swDHD7cJ3tbsPPpTHVQc7bpnVdn3pTHfc5qes1kHPdO3sbB+YLIRNRw17KgDSwdxTHxv10t5g0kHjswLQxew3XUg2Pxsdjxp/0PZMejlBe+9fHZklnyoXg24W9VZQqeEUub/AnXe3Qus5IZKYfPYAF86XzMoXjsppPa2iPN3WQu1tGH13mY5Bdvj/vuTOM+9PyqQAAAAASUVORK5CYII=" alt="🔷"> Shards</span><b style="color:var(--skill);">${bs.rewards.shards}</b></div>` : ''}
        ${bs.rewards.gemDrop ? `<div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA2VJREFUSEuNlk2IHFUUhb/zesaJC0EXbgwOBARNdCVBBZNZxKTTrQEVguJCQYiBxBAQjMGRSKIJATG4GDAqiiIYBBdRnGS6ZwYRBhJ/0IXkZxHBlXEZMCNGZ/odra7q6qrqnuhbdBfvvrr3nHvuu7fEikuAVzYPWIafT3a7KzcPPuSuiiY5Cy/In4fAyQNUwgw6/Z87VRDXZyBn6FZKVwo/ZVCkkp5PftMA2fvN+bjOHT0x1J0h3sDJkcjtscP6lFDiOXGc0UskC5xv1fVZz21mTcVszPrcsnhwxPwEjPeF8eloHQniPWDMNXZpmf2Izb3M2Uxjdipw2au4rT2h3/oMUudHgEnMJwq8Y7PQRSEWOpHXg3gLuDtz+HMM7KpFDhgmBIvL+M4gvS/TNJ5p18PDPRY0W37MgZNpXSj5e0mBRXd4XqPsc+RNzLpikUS4VIM9iGNEJh2499/XD+ZnzKHWVh3Uti+9enmU57rpCJgOUpebz3SsWwKszV9K7D0QvbSLb+kwIlhfMgnXAj+oOR+fdEdrU2EzBpmAtr6ReKBc3oYgExHB7jJOnksrFT+Ki12RG/NxJ5F3q/fk2ig3rVrie+Cu0mXMCy/xr40yC0Pu/LOtuj7Kq6g55302b/Qrp1vie6NYLbw/ATLkJrclpm2meuC6VOTdM/VwPElIidrWOR+WeaXA5LzEDpuzxcAFIXcgXsirK6kP82K7rmO985XcQXPOUzZ7cic17qDDCeC+XCcpYfe7zPYoZvNLJx1obdHhYqrzFBXpN2f9se2nk0sQzatBLGGOVjT6APMXYncW4GirHiarOuatotoRG+34OUGPyvyyJB4ZMRdKjRYamOPAGompmS3aOyyNKYNKU+s5asx5DrNZeIPRa8CmLkJxQeZl4y9An7bqeqqKvCT6kGGQ2gWNts9i/yh0zuLtrMEdkhg3jLfqyvtRiUGGstTsilHTZmu2n/GNVxf5DlMP4nJS747cE2qc+HPE93+9KVwrDp/iECw1u0GK/Z7eOO1bY2AiBJ6xGJP4MIwxe2pjuFIdZ9VWX5oHZQbFOQr1ltcosCFp16M1ZqYf0q/D9MuB9lOUpztlV4FQrJzHv/LNf/+BTm3TlaKj683nQQ0qQ3zodCturjRNMwSVAP/xiTCsFlcKkLn6B/RWcNXdxjx2AAAAAElFTkSuQmCC" alt="💎"> Gems</span><b style="color:var(--gem);">${bs.rewards.gemDrop}</b></div>` : ''}
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
        ${Object.keys(ENERGY_POTION_TIERS).map(key=>{ const have = state.inv[key]||0; if(have<1) return ''; const p = ENERGY_POTION_TIERS[key]; return `<button class="mini-btn" style="border-color:var(--brass-bright);color:var(--brass-bright);padding:8px 12px;" onclick="useBattleItem('${key}')">${ITEMS[key].icon} ${p.name} +${p.energy}<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡"> ×${have}</button>`; }).join('')}
        ${(state.inv.health_potion||0)>0 ? `<button class="mini-btn" style="border-color:var(--health);color:var(--health);padding:8px 12px;" onclick="useBattleItem('health_potion')">💚 Health Potion +30-50HP ×${state.inv.health_potion}</button>` : ''}
      </div>
    </div>
  ` : '';

  // Codex overlay
  const codexHtml = battleCodexOpen ? `
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(5,12,10,0.92);backdrop-filter:blur(6px);z-index:20;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease-out;" onclick="if(event.target===this)toggleBattleCodex()">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px;width:100%;max-width:360px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAArdJREFUSEuNlr1rFUEUxX9nGxtrwcJChShBRAtRsMgLBAIWNoKSQqysxV4QwX/A2krSRW2FoPBeQFGLoIiFBoxCECsbCyEWc8zs7Mfsvn0hAwn75uvcc++5945AIIMZHCIu5f/TtjTTG81kuxq/pg7Uy7ZH1fKuCr1NN6bVYM8LjpQz0qQL2RrUAMSNdhhJxSTY5wX3qssfARPghqSn5b7gecQq+A7obrXvoQp9cPAoATaGK158DljYuyhafBF4Cd4G/QQeg9dA1w0XhP9irSE+gVf29tw2LCjSMkuI95VBG5I+lgwcPEZsg7+AtoB3wDxmBbECPgz6AbwG/wZdBY4Dv4Bn1d9X4JJhTnAaOCFpMQHYY8Oo9ld0tfBn0AvDE8EO8AcI4AJr0yIePgbcAq7sgZwpY9ReMlFRAwSPrRZgSE6SFOxTgn+SvttO0nNU4cAJUwOUMRgn//cOZBZFgHQpqJAc0ndn5Axg0nFRA5Cbk+ENA3RvbMHK+UmRYpAYNDEYJGFUFArB0SFR9w2bPoPMY0MMBpM5JWKhCsBIRQvQGFRJo41zzSDJNAV5FuVkdXDLoP6ebRKZi0JoVTRDGJ0YZGAz49yqKOVBlcUzVJHckjOoFbUP6SwGKZOTTLNMiRpPQUtBrqXZsjmQivZh0PDpBjaPR0+a+c8sk/NSMWhU46JY1KKiNqYTbergARKtaiqli5I0x2X7UbE4GINeJleJVsr0GmIOfBZ0mVTEOiGp3HK/SrQHTS3qZv4O4g3EUs6WpOepTPX6n+2T4GXQMrAMPtRRUVuLdjHrFuuCdRX61vTRqhP3AHKktMPBR8FLUrHaFLtUKm6CX0lF7AnNyNtybPVVrc3auly9AXq0YsvqtcMh9m2jTNV8n6bfY5Nzn/UE6aV1Ga+pWjL4Hpn1Tmns7T1t2kv+A0C2mDG3mYcHAAAAAElFTkSuQmCC" alt="📖"> Codex — ${m.nameAr}</div>
          <button style="background:none;border:none;color:var(--dim);font-size:18px;cursor:pointer;" onclick="toggleBattleCodex()">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:var(--dim);margin-bottom:12px;">
          <div>👹 Level: <b style="color:var(--text);">${m.level}</b></div>
          <div><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAx9JREFUSEuFVT1oFEEU/t5sBMFSxLh7gqA2prjdEyOikKTUQlGw11ZtEtRELXIp1EQladRWe0HRQstcoSgR7jZFbDQgeLsYxNJCzM7Tmf2b/bm4xd3e7c58P+97bwjJRQB44L35NF3xn28CiAG1snB1MbyLLGscjBGLaCWKNj952PiawyNexUAPw/ssa+jQJstRIlrjKOq08P2HuaHC0W+rT1/YlyRoioD98YYxPjGeRYylFoL36r8u2ccsYJKJz5scGVgX4MWmDB+nJDIFvtU4C+bnBTklZ1jShAYUvLylQUTnXNl/oThqgFXs3gExtMqaeXrFCkoYQfLUKdkANhUD65CbzSY2fmmAHu09QiRXYj/qqq2oUE0KchvLYWEWoy3+9jEGsJwLgvHEZFG0gAGmTkENYXwrmxi42JLB09giYV9l0H2zsJXFjI7Lga5BT9htAZrVsa5NsA7NtaYMH+gUdS3npGB+XWFt2jIIYACGJDp1OOq/0QrW0DjwR/BnraDktWoWzZTR8TiYUNx6Yk+bQLNbWbSN6eAI979kMe0KxxdA05TM4Ll4k9gHT4Ztda8ACiliGoOqSdK9Elj1ZOCmK/W7vnAmAV40o+nKQOnJRkgtYwJ8OMsaILdrypXBUgHgA5yd2wX7ADXSjVwOKN497/Z0XmVgJkD8Wv+3ZPcowp/qZzILktki7OsEWkhZM/GcSb8lw7YCUCkyrRNMY5xYxMzTngzvpbSyGqQcfct+S4zjKfGsyBIdF3lMq0XWTffOk8EJU2UJAFi17NPM9LLS1RIdDypFpT4wYkrEZ9wofFULYEr2hXMTwO28qAxIqleQJAfgW00Z3jFrkw27PJp5ZnrCaf+bPnnWGZ1CNAnj6WhRcY4jXL2y88BUkN77wp4EsDi4oXRjTrlRHEkjptl9DJBVsrpVT9iXCfSwPHOUVgm+4snwUUFZ2jeJGYWYDmLqi8Y0wPOmv8Q005TBQnoaFgdfbnXlTM5BigeDL5wZgO8mRtxwZX++Tn3WksTFQ998kHVvyboeHD1fPAR+dYTUD5WSgkH1qD3mSomsB/gL/oxeMA2V9SIAAAAASUVORK5CYII=" alt="❤️"> HP: <b style="color:var(--text);">${m.maxHp}</b></div>
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
      <button class="mini-btn" style="border-color:var(--border);color:var(--dim);font-size:12px;padding:6px 12px;display:flex;align-items:center;gap:6px;" onclick="toggleBattleCodex()"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAArdJREFUSEuNlr1rFUEUxX9nGxtrwcJChShBRAtRsMgLBAIWNoKSQqysxV4QwX/A2krSRW2FoPBeQFGLoIiFBoxCECsbCyEWc8zs7Mfsvn0hAwn75uvcc++5945AIIMZHCIu5f/TtjTTG81kuxq/pg7Uy7ZH1fKuCr1NN6bVYM8LjpQz0qQL2RrUAMSNdhhJxSTY5wX3qssfARPghqSn5b7gecQq+A7obrXvoQp9cPAoATaGK158DljYuyhafBF4Cd4G/QQeg9dA1w0XhP9irSE+gVf29tw2LCjSMkuI95VBG5I+lgwcPEZsg7+AtoB3wDxmBbECPgz6AbwG/wZdBY4Dv4Bn1d9X4JJhTnAaOCFpMQHYY8Oo9ld0tfBn0AvDE8EO8AcI4AJr0yIePgbcAq7sgZwpY9ReMlFRAwSPrRZgSE6SFOxTgn+SvttO0nNU4cAJUwOUMRgn//cOZBZFgHQpqJAc0ndn5Axg0nFRA5Cbk+ENA3RvbMHK+UmRYpAYNDEYJGFUFArB0SFR9w2bPoPMY0MMBpM5JWKhCsBIRQvQGFRJo41zzSDJNAV5FuVkdXDLoP6ebRKZi0JoVTRDGJ0YZGAz49yqKOVBlcUzVJHckjOoFbUP6SwGKZOTTLNMiRpPQUtBrqXZsjmQivZh0PDpBjaPR0+a+c8sk/NSMWhU46JY1KKiNqYTbergARKtaiqli5I0x2X7UbE4GINeJleJVsr0GmIOfBZ0mVTEOiGp3HK/SrQHTS3qZv4O4g3EUs6WpOepTPX6n+2T4GXQMrAMPtRRUVuLdjHrFuuCdRX61vTRqhP3AHKktMPBR8FLUrHaFLtUKm6CX0lF7AnNyNtybPVVrc3auly9AXq0YsvqtcMh9m2jTNV8n6bfY5Nzn/UE6aV1Ga+pWjL4Hpn1Tmns7T1t2kv+A0C2mDG3mYcHAAAAAElFTkSuQmCC" alt="📖"> Codex</button>
    </div>

    <!-- Battle Scene -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;padding:0 20px;gap:24px;">
      <!-- Grass background hint -->
      <div style="position:absolute;bottom:30%;left:0;right:0;height:40%;background:linear-gradient(0deg,rgba(30,60,35,0.6) 0%,transparent 100%);pointer-events:none;"></div>

      <!-- Characters Row -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;width:100%;max-width:420px;position:relative;z-index:2;">
        <!-- Player -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="font-size:52px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));animation:${canAct?'none':'shake 0.5s ease-in-out'};">${cls?cls.icon:'🧙'}</div>
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
          ${chargeText ? `<div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);text-shadow:0 0 12px rgba(212,162,76,0.4);animation:pulse 1s ease-in-out infinite;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡"> ${chargeText}</div>` : `<div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:14px;color:var(--dim);opacity:0.5;">VS</div>`}
          ${bs.isDefending ? `<div style="font-size:11px;color:var(--skill);font-weight:700;">🛡️ Defending</div>` : ''}
          ${m.burnTurns > 0 ? `<div style="font-size:11px;color:var(--copper);font-weight:700;">🔥 Burn ${m.burnTurns}t</div>` : ''}
        </div>

        <!-- Monster -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="font-size:52px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">${m.icon}</div>
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
          <div style="font-size:10px;color:var(--dim);margin-bottom:2px;">20 MANA</div>
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
          ${skillBtn ? `<div style="font-size:9px;color:var(--dim);margin-top:1px;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA/xJREFUSEt9Vl1oW2UYft4vacdoNUlJRmvT5WQ6xW5F3NVQ/GmTeqFzF4r1YoKIP7iBDhQG4sALERR0KOKVN5tMwe1GEX+wSQPFsV0Mlbk5duFyssmqbU1OWtT0J98j5+Sc05OT2HORfDnf+73v8z7v+z5fBBAAhPdQqISi/RfdFsEj7cc7rO1t57EXM6n5fr3272c5K7O/lLi2e7y2/WLXQCGnXWO4L/0AZ/r/2NaINi5BkBTIoyAOa8GJfC1zctMkBBAGOfDg0gFtb6OUuGFornwB4C57m4AVoXqxqfSxfM0Ybg/Qghb87ASwsSuFgcqoEKdA7goaCuRxAs+QvJCvG6+3OdkEtU+4m1aLIgEKsfJhgbzvZmCn3VgHRqOCH7fqyK33LI1U7b3pePlBv27Cat7acSFIUbj+fg2KMfNTJfI9hX2aOKaAsxOWMT6dKB9UWsYg8ifAF0hcc+zAOwGMAtKrgG/RbLw5vnzHop9puMjFWPkIRN4BZSpXz5z2W4tAMWZ+AyVXRPTnE9XsudmkObS2jlcB2QNwDLAbAyZEnpqoZc4EW9/PwHb4Q/LKTSvNLSegMagiPVPj1eHf7fezycrQ/YuZOQ/dTNwsEfCpsqfIcSRAk/rph6wdnwTbPwjWWU8nzEcilLcJPZ2zsq+Eu6iUMPdp6iOA3AJBGsQigTIhr9l09RLb76tnam6bhprM7ZBCvPISRC/natnjHoLzZE8jeT31z3pzm1KyVXTvjUFraG4XZNXzUoxVnqdwb94ynvUmouuwFuNmmYLTIO4FdEqgUgTibZx6HjQaFD0vErEb4WdQbteKByerxuUOe68VI1AfkkxCMBjWqzCiYA1cWbsE8N2clT3uTHJ4Moux8pMQ2d1k88tmXf/SG9uS1tIcUaLSANPUGIkAcS1SpeiqovpLC6qKrK7qv8/1SP9jAPfk68ahNrHzNHUmXnmZ4Aet2FwDZJ7AgoAL4qxlgeCyAvog0kdymEBaAfZ3qgVaf5Wzsvs7AwgwEzcPkfjItiPdFnRFXRz56lA3V9bo2jvIjuYt461QDVqHZ/vmUmvRlfmu1Xcp9XkPGXnvlZbJiaVMwa9B2FkxXjkF8InuQVry7GXjZ+kLkVxdUat3P1zdudQ1A/t0aeDqXk11NnDZubE2ucI8SompXN1w5KaVgc9puxYWY+XnKPjYk4FgPXxZ9hH4Z7/OWcY+7ybunIOQ3hZi5kkBDvwfVb682wuNy7klw1ZYH3TXOQijKyTMA0K+AcjOsC451SAaAN7L1Y2jYQI7axAi3Tvw3c3XB6KyPilKbhPIGEmloX9ViPwWBS8+YGV/2riZ2zLwW7iznuHbIwB/o2EC/3pC8O2f/wEgF7MwmSw7rgAAAABJRU5ErkJggg==" alt="🔮"> ${skillBtn.mana} MP</div>` : ''}
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
      case 'zones': return state.zoneView ? renderZoneView() : renderZones();
  </style>`;
}

// ─── Combat Screen Render ───
function renderCombat(){
  const maxH = getMaxHealth(state);
  const hPct = maxH > 0 ? (state.health/maxH)*100 : 0;
  const hBarClass = hPct > 50 ? 'ok' : (hPct > 20 ? 'warn' : '');
  const pStats = getPlayerCombatStats();
  const zoneCards = ZONES.map(z => {
    const unlocked = state.level >= z.levelMin;
    const cost = getEnergyCost(state, z.energyCost);
    const canFight = unlocked && state.energy >= cost && state.health > 0;
    const monsters = ZONE_MONSTERS[z.id];
    const avgGold = monsters ? Math.round(monsters.reduce((a,m)=>a+(m.goldMin+m.goldMax)/2,0)/monsters.length) : 0;
    const avgXp = monsters ? Math.round(monsters.reduce((a,m)=>a+m.xp,0)/monsters.length) : 0;
    return `<div class="card" style="${unlocked?'':'opacity:0.45;'} ${canFight?'border-color:'+z.color+';':''}">
      <div class="card-top"><div class="card-icon" style="font-size:28px;">${z.icon}</div><div><div class="card-name" style="color:${unlocked?z.color:'var(--dim)'};">${z.nameAr}</div><div class="card-sub">${z.name} · Lv.${z.levelMin}-${z.levelMax===999?'∞':z.levelMax}</div></div></div>
      <div style="font-size:11px;color:var(--dim);margin:6px 0;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡">${cost} energy · ~${avgGold}g · ~${avgXp}XP</div>
      <button class="act-btn" style="width:100%;${canFight?'':'opacity:0.4;'}" ${canFight?`onclick="startBattle('${z.id}')"`:''}>${!unlocked?'<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAqBJREFUSEuVVjtrFUEYPWd+gZUSK21UiGXsb1ASLBTBB4q2klYLBYkQA9pooa3YGhQfCFolKDe9wSoRY6OVAXvBao47j52dmd2b4MJddpj5vnO+8z3mEns8BCCEt6RDfkXzcy87t++s3C+8NWxipQOE7gA8CeC4PyVsgvgEaJHG/Am2BKjop6MVAPInA5N0EcCrdtv5KQ20DfC0IX9M4Nedz6XwJKVzAN4F544ZV0B8jGCnAFzNgKcN+bUQIwaUCCXiBGS1D9AXgIcjwCXSvE6BhjMpOgFbBGZI/q3FqHIQYGV1GdALyK1xjOT2kIySjgL4FveukHw5pHgvB7K61+iyBOCtIS+0OewXAiFr34A436RnmaSzK6rGU+wKMQoivQd0BuAjkreH6yudfSjgFqEPNOZsTqIr08qDpDGgEcRlGscqSBeqsKxpHy19tOskZ1MEsWSrJAdH1mpMYNR4KwASu6zkpSRnBtAJVfVB6thxw2jU6ZpHUKrsAJrAlhpCZQSRzZ6dnDKUd2n67mcnz2gvB5LTHePUflXrhqVvuljBccS0OoQDs6RZb2dPEYGk53mH+ij9if6Q2KWyVkhzrQfgorbSJoTp0F+Jb/rerVyzvS2SfigW0zQCqCD7X8Q7QqbpuBYwNVoccKsA5tKAy2dnDhbSUE3WZLVmaOYn5WARwv3ceGBEZ94r1AB5lzQP2ruh6ANJcxBWJ1VRHtmg63BgnuRa2/CFRF4mq8cibvRvolbVPPm9tD8heTO/InsAMRefAcxMrM6qfONyg+SJHLJotHyEWWmKwAKE6yIOVtdkneFfAJ4BeErDnXqkD86idtpIdkrAgrutADh2+/2e8BuEi3LDOyZ3JvVIfxZV/zDypaQjvoHI78lhftfWl0Gj3T9vdCwxhL+7FwAAAABJRU5ErkJggg==" alt="🔒"> Locked':(state.health<=0?'<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAx9JREFUSEuFVT1oFEEU/t5sBMFSxLh7gqA2prjdEyOikKTUQlGw11ZtEtRELXIp1EQladRWe0HRQstcoSgR7jZFbDQgeLsYxNJCzM7Tmf2b/bm4xd3e7c58P+97bwjJRQB44L35NF3xn28CiAG1snB1MbyLLGscjBGLaCWKNj952PiawyNexUAPw/ssa+jQJstRIlrjKOq08P2HuaHC0W+rT1/YlyRoioD98YYxPjGeRYylFoL36r8u2ccsYJKJz5scGVgX4MWmDB+nJDIFvtU4C+bnBTklZ1jShAYUvLylQUTnXNl/oThqgFXs3gExtMqaeXrFCkoYQfLUKdkANhUD65CbzSY2fmmAHu09QiRXYj/qqq2oUE0KchvLYWEWoy3+9jEGsJwLgvHEZFG0gAGmTkENYXwrmxi42JLB09giYV9l0H2zsJXFjI7Lga5BT9htAZrVsa5NsA7NtaYMH+gUdS3npGB+XWFt2jIIYACGJDp1OOq/0QrW0DjwR/BnraDktWoWzZTR8TiYUNx6Yk+bQLNbWbSN6eAI979kMe0KxxdA05TM4Ll4k9gHT4Ztda8ACiliGoOqSdK9Elj1ZOCmK/W7vnAmAV40o+nKQOnJRkgtYwJ8OMsaILdrypXBUgHgA5yd2wX7ADXSjVwOKN497/Z0XmVgJkD8Wv+3ZPcowp/qZzILktki7OsEWkhZM/GcSb8lw7YCUCkyrRNMY5xYxMzTngzvpbSyGqQcfct+S4zjKfGsyBIdF3lMq0XWTffOk8EJU2UJAFi17NPM9LLS1RIdDypFpT4wYkrEZ9wofFULYEr2hXMTwO28qAxIqleQJAfgW00Z3jFrkw27PJp5ZnrCaf+bPnnWGZ1CNAnj6WhRcY4jXL2y88BUkN77wp4EsDi4oXRjTrlRHEkjptl9DJBVsrpVT9iXCfSwPHOUVgm+4snwUUFZ2jeJGYWYDmLqi8Y0wPOmv8Q005TBQnoaFgdfbnXlTM5BigeDL5wZgO8mRtxwZX++Tn3WksTFQ998kHVvyboeHD1fPAR+dYTUD5WSgkH1qD3mSomsB/gL/oxeMA2V9SIAAAAASUVORK5CYII=" alt="❤️"> Rest needed':(state.energy<cost?'<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡"> No energy':'⚔️ Adventure'))}</button>
    </div>`;
  }).join('');
  return `
    <div class="panel" style="text-align:center;padding:18px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-around;align-items:center;max-width:480px;margin:0 auto;flex-wrap:wrap;gap:10px;">
        <div style="text-align:center;"><div style="font-size:28px;">${state.playerClass?CLASS_DATA[state.playerClass].icon:'🧙'}</div><div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;">You</div><div style="font-size:11px;color:var(--dim);">ATK ${pStats.atk} · DEF ${pStats.def} · SPD ${pStats.spd}</div></div>
        <div style="font-family:'Cairo',sans-serif;font-size:24px;color:var(--brass-bright);">VS</div>
        <div style="text-align:center;"><div style="font-size:28px;">👹</div><div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;">Monster</div><div style="font-size:11px;color:var(--dim);">Zone encounter</div></div>
      </div>
      <div style="width:100%;max-width:320px;margin:14px auto;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:3px;"><span>Health</span><span>${Math.floor(state.health)} / ${maxH}</span></div>
        <div class="health-bar"><div class="health-bar-fill ${hBarClass}" style="width:${hPct}%"></div></div>
      </div>
      <div style="font-size:12px;color:var(--dim);margin-top:8px;">Crit ${(pStats.crit*100).toFixed(0)}% · Dodge ${(pStats.dodge*100).toFixed(0)}% · Pierce ${(pStats.pierce*100).toFixed(0)}% · <img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAA/xJREFUSEt9Vl1oW2UYft4vacdoNUlJRmvT5WQ6xW5F3NVQ/GmTeqFzF4r1YoKIP7iBDhQG4sALERR0KOKVN5tMwe1GEX+wSQPFsV0Mlbk5duFyssmqbU1OWtT0J98j5+Sc05OT2HORfDnf+73v8z7v+z5fBBAAhPdQqISi/RfdFsEj7cc7rO1t57EXM6n5fr3272c5K7O/lLi2e7y2/WLXQCGnXWO4L/0AZ/r/2NaINi5BkBTIoyAOa8GJfC1zctMkBBAGOfDg0gFtb6OUuGFornwB4C57m4AVoXqxqfSxfM0Ybg/Qghb87ASwsSuFgcqoEKdA7goaCuRxAs+QvJCvG6+3OdkEtU+4m1aLIgEKsfJhgbzvZmCn3VgHRqOCH7fqyK33LI1U7b3pePlBv27Cat7acSFIUbj+fg2KMfNTJfI9hX2aOKaAsxOWMT6dKB9UWsYg8ifAF0hcc+zAOwGMAtKrgG/RbLw5vnzHop9puMjFWPkIRN4BZSpXz5z2W4tAMWZ+AyVXRPTnE9XsudmkObS2jlcB2QNwDLAbAyZEnpqoZc4EW9/PwHb4Q/LKTSvNLSegMagiPVPj1eHf7fezycrQ/YuZOQ/dTNwsEfCpsqfIcSRAk/rph6wdnwTbPwjWWU8nzEcilLcJPZ2zsq+Eu6iUMPdp6iOA3AJBGsQigTIhr9l09RLb76tnam6bhprM7ZBCvPISRC/natnjHoLzZE8jeT31z3pzm1KyVXTvjUFraG4XZNXzUoxVnqdwb94ynvUmouuwFuNmmYLTIO4FdEqgUgTibZx6HjQaFD0vErEb4WdQbteKByerxuUOe68VI1AfkkxCMBjWqzCiYA1cWbsE8N2clT3uTHJ4Moux8pMQ2d1k88tmXf/SG9uS1tIcUaLSANPUGIkAcS1SpeiqovpLC6qKrK7qv8/1SP9jAPfk68ahNrHzNHUmXnmZ4Aet2FwDZJ7AgoAL4qxlgeCyAvog0kdymEBaAfZ3qgVaf5Wzsvs7AwgwEzcPkfjItiPdFnRFXRz56lA3V9bo2jvIjuYt461QDVqHZ/vmUmvRlfmu1Xcp9XkPGXnvlZbJiaVMwa9B2FkxXjkF8InuQVry7GXjZ+kLkVxdUat3P1zdudQ1A/t0aeDqXk11NnDZubE2ucI8SompXN1w5KaVgc9puxYWY+XnKPjYk4FgPXxZ9hH4Z7/OWcY+7ybunIOQ3hZi5kkBDvwfVb682wuNy7klw1ZYH3TXOQijKyTMA0K+AcjOsC451SAaAN7L1Y2jYQI7axAi3Tvw3c3XB6KyPilKbhPIGEmloX9ViPwWBS8+YGV/2riZ2zLwW7iznuHbIwB/o2EC/3pC8O2f/wEgF7MwmSw7rgAAAABJRU5ErkJggg==" alt="🔮"> ${state.mana}/${state.maxMana} MP</div>
    </div>
    <div class="grid">${zoneCards}</div>`;
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
