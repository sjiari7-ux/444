/* ---------------- Adventure / PvE flow ---------------- */
async function startPve(zoneId, kind, opts){
  opts = opts || {};
  const c = S.char;
  const eff = effectiveStats(c);
  applyRegen(c);
  const zone = ZONES.find(z=>z.id===zoneId);
  const isBoss = kind==='boss', isElite = kind==='elite';
  const energyCost = opts.skipEnergyCost ? 0 : (isBoss ? BOSS_ENERGY_COST : isElite ? 20 : 10);
  if(c.energyCur < energyCost){ showToast("Not enough energy to explore."); render(); return; }
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

function pickStepEvent(){
  const total = STEP_EVENT_WEIGHTS.reduce((a,x)=>a+x.w,0);
  let r = rnd(0,total);
  for(const x of STEP_EVENT_WEIGHTS){ if(r<x.w) return x.t; r-=x.w; }
  return 'flavor';
}
async function takeStep(){
  const c = S.char, road = S.road;
  if(!road) return;
  const eff = effectiveStats(c);
  applyRegen(c);
  if(c.energyCur < STEP_ENERGY_COST){ showToast('Not enough energy to take another step.'); render(); return; }
  c.energyCur = clamp(c.energyCur - STEP_ENERGY_COST, 0, eff.maxEnergy);
  const zone = ZONES.find(z=>z.id===road.zoneId);
  const ev = pickStepEvent();
  if(ev==='flavor'){
    road.log.push({text: pick(FLAVOR_TEXTS), cls:''});
  } else if(ev==='gold'){
    const amt = rndInt(2,7);
    c.gold += amt; road.gained.gold += amt;
    road.log.push({text:`You spot a few coins in the dirt. +${amt} Gold.`, cls:'good'});
  } else if(ev==='resource'){
    const r = pick(zone.resources);
    const amt = rndInt(1,3);
    c.resourceBag[r] = (c.resourceBag[r]||0) + amt;
    road.gained.resources[r] = (road.gained.resources[r]||0) + amt;
    road.log.push({text:`You gather ${amt} ${RESOURCE_NAMES[r]} along the way.`, cls:'good'});
  } else if(ev==='xp'){
    const amt = rndInt(2,5);
    c.xp += amt; road.gained.xp += amt;
    road.log.push({text:`Something about the walk teaches you a little. +${amt} XP.`, cls:'good'});
    const lvlLines = [];
    await checkLevelUps(c, lvlLines);
    lvlLines.forEach(l=> road.log.push({text: l.value, cls:'good'}));
  } else if(ev==='item'){
    if(bagCount(c) < BAG_CAPACITY){
      const slot = pick(EQUIP_SLOTS);
      const tier = TIERS[0]; // the road only ever turns up common trinkets — save the good stuff for real fights
      const item = makeEquipment(slot, tier.id, c.level);
      c.inventory.push(item);
      road.log.push({text:`You find a discarded ${item.name} by the roadside.`, cls:'good'});
    } else {
      road.log.push({text:`You spot something shiny, but your bag is full.`, cls:''});
    }
  } else if(ev==='monster'){
    road.log.push({text:'Something rustles in the brush ahead...', cls:'hit'});
    await saveCharacter(c);
    await startPve(road.zoneId, null, {returnScreen:'road', skipEnergyCost:true});
    return;
  }
  await saveCharacter(c);
  render();
}

async function startPvp(opponentData){
  const c = S.char;
  const eff = effectiveStats(c);
  applyRegen(c);
  if(c.energyCur < PVP_ENERGY_COST){ showToast('Not enough energy.'); render(); return; }
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
      const dropChance = cb.boss ? 1 : cb.elite ? 0.55 : 0.35;
      const xpGain = Math.round(rnd(8,14) * cb.foe.level * rewardMult);
      const goldGain = Math.round(rnd(6,12) * cb.foe.level * rewardMult);
      c.xp += xpGain; c.gold += goldGain;
      const resList = cb.zone.resources;
      const resGain = {}; resList.forEach(r=>{ resGain[r] = Math.round(rndInt(2,6)*rewardMult); c.resourceBag[r] = (c.resourceBag[r]||0) + resGain[r]; });
      cb.rewardLines = [ {label:'XP gained', value:'+'+xpGain}, {label:'Gold gained', value:'+'+goldGain}, {label:'Resources', value: resList.map(r=>`+${resGain[r]} ${RESOURCE_NAMES[r]}`).join(', ')} ];
      let dropLine = 'None';
      if(Math.random() < dropChance && bagCount(c) < BAG_CAPACITY){
        const slot = pick(EQUIP_SLOTS);
        const tier = cb.boss ? pickTierForBoss(cb.zone) : pickTierForZone(cb.zone, cb.elite);
        const item = makeEquipment(slot, tier.id, cb.foe.level);
        c.inventory.push(item);
        dropLine = `${item.name} (${tier.name})`;
      } else if(cb.boss && bagCount(c) >= BAG_CAPACITY){
        dropLine = 'Bag full — drop lost!';
      }
      cb.rewardLines.push({label:'Item drop', value: dropLine});
      await checkLevelUps(c, cb.rewardLines);
    } else if(result==='lose'){
      cb.rewardLines = [ {label:'Result', value:'Defeated &mdash; no rewards.'} ];
      c.hpCur = Math.max(1, Math.round(eff.maxHp*0.15));
    } else {
      cb.rewardLines = [ {label:'Result', value:'You retreated safely.'} ];
    }
  } else {
    // PvP
    const myRating = c.pvp.rating;
    const oppRating = cb.opponentData.pvp ? cb.opponentData.pvp.rating : 1000;
    const expected = 1/(1+Math.pow(10, (oppRating-myRating)/400));
    const score = result==='win' ? 1 : result==='lose' ? 0 : 0.5;
    let delta = Math.round(ELO_K * (score-expected));
    if(result==='win' && delta<1) delta = 1;
    if(result==='lose' && delta>-1) delta = -1;
    const newRating = clamp(myRating+delta, RATING_FLOOR, 100000);
    c.pvp.rating = newRating;
    if(result==='win') c.pvp.wins++;
    if(result==='lose'){ c.pvp.losses++; c.pvp.protectedUntil = Date.now() + PVP_PROTECTION_MS; }
    let xpGain = 0, goldChange = 0;
    if(result==='win'){ xpGain = Math.round(rnd(10,18)*cb.opponentData.level); goldChange = Math.round(rnd(8,16)*cb.opponentData.level); c.xp += xpGain; c.gold += goldChange; }
    cb.rewardLines = [
      {label:'Result', value: result==='win'?'Victory':result==='lose'?'Defeat':'Draw'},
      {label:'Rating change', value: (delta>=0?'+':'')+delta+' &rarr; '+Math.round(newRating)},
      {label:'XP gained', value:'+'+xpGain},
      {label:'Gold change', value: (goldChange>=0?'+':'')+goldChange},
      {label:'Rounds', value: String(cb.round-1)},
    ];
    if(result==='lose') cb.rewardLines.push({label:'Protection', value:'5:00 shield granted'});
    if(result==='win') await checkLevelUps(c, cb.rewardLines);

    // best-effort symmetric update to a real opponent's stored doc
    if(HAS_DB && cb.opponentData.id && !cb.opponentData.isBot){
      try{
        const oppExpected = 1-expected;
        const oppScore = 1-score;
        let oppDelta = Math.round(ELO_K*(oppScore-oppExpected));
        const oppRef = DB.doc('players/'+cb.opponentData.id);
        const snap = await withTimeout(oppRef.get(), 5000);
        if(snap.exists){
          const od = snap.data();
          od.pvp = od.pvp || {rating:1000,wins:0,losses:0,protectedUntil:0};
          od.pvp.rating = clamp((od.pvp.rating||1000)+oppDelta, RATING_FLOOR, 100000);
          if(score===1) od.pvp.losses = (od.pvp.losses||0)+1;
          else if(score===0) od.pvp.wins = (od.pvp.wins||0)+1;
          await withTimeout(oppRef.set(od), 5000);
        }
      }catch(err){ /* best effort only */ }
    }
  }
  await saveCharacter(c);
  render();
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
    c.hpCur = eff.maxHp; c.energyCur = eff.maxEnergy; c.manaCur = eff.maxMana;
    rewardLines.push({label:'Level up!', value:`Reached level ${c.level} (+${leveled} skill point${leveled>1?'s':''})`});
  }
}

async function finishCombat(){
  const cb = S.combat;
  const back = (cb && cb.returnScreen) || 'home';
  if(back==='road' && S.road && cb){
    if(cb.result==='win') S.road.log.push({text:`You dealt with the ${cb.foe.label} and continue on.`, cls:'good'});
    else if(cb.result==='lose') S.road.log.push({text:`The ${cb.foe.label} got the better of you. You press on, bruised.`, cls:'hit'});
    else S.road.log.push({text:`You slip away from the ${cb.foe.label} and continue on.`, cls:''});
  }
  S.combat = null; S.showItemMenu = false;
  setScreen(back);
}

