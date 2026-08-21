/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Arena (Async PVP)
   ═══════════════════════════════════════════════════════════════
   How it works (SimpleMMO-style, no cloud function needed):
   1. You fetch a page of players in your level range from the
      `players` collection (same broad read access the leaderboard
      already relies on).
   2. Attacking re-fetches a fresh snapshot of that one player right
      before the fight, builds their combat stats with the exact
      same formulas as your own (playerPower/getDamageReduction/...
      from state.js), and simulates the whole fight instantly —
      they don't need to be online.
   3. You only ever WRITE to your own player doc (always allowed).
      The outcome is delivered to the defender via a create-only
      doc in players/{targetUid}/pvpReports — the defender's own
      client applies it (deducts their own gold, grants their own
      shield) the next time they're online, then deletes the report.

   ⚠️ FIRESTORE RULE NEEDED — add this so step 3 works:
     match /players/{uid} {
       allow read: if true; // (already needed for the leaderboard)
       allow write: if request.auth.uid == uid;
       match /pvpReports/{reportId} {
         allow create: if request.auth != null;
         allow read, delete: if request.auth.uid == uid;
       }
     }
   Without it, attacks still resolve for the attacker, but the
   defender will never see the gold get taken (their own doc never
   changes since it isn't a self-write) — console will log a
   permission-denied warning when that happens.
   ═══════════════════════════════════════════════════════════════ */

const PVP_MIN_LEVEL = 1;                 // must be this level to attack or appear as a target — open to everyone
const PVP_ENERGY_COST = 15;              // base energy cost per attack (before stamina skill reduction)
const PVP_LEVEL_RANGE_MIN = 4;           // minimum ± level spread even at low levels
const PVP_LEVEL_RANGE_PCT = 0.2;         // ± spread scales with your own level above that floor
const PVP_PROTECTION_MS = 5 * 60 * 1000; // shield granted to a defender right after they lose
const PVP_STEAL_MIN_PCT = 0.04;
const PVP_STEAL_MAX_PCT = 0.10;
const PVP_MAX_ROUNDS = 25;               // simulation safety cap
const PVP_OPPONENT_LIMIT = 12;           // how many cards to show per refresh
const PVP_OPPONENTS_REFRESH_MS = 30000;  // don't hammer Firestore on every tab open

let pvpOpponents = null;         // [{uid,username,avatar,level,playerClass,protectedUntil}] or null = not loaded
let pvpOpponentsLoading = false;
let pvpOpponentsError = '';
let lastPvpOpponentsFetch = 0;
let pvpBattleBusy = false;
let pvpBattleState = null;       // active interactive Arena fight — same shape as battleState in combat.js
let pvpItemMenuOpen = false;
let pvpCodexOpen = false;

function pvpLevelRange(){
  const lvl = state.level;
  const span = Math.max(PVP_LEVEL_RANGE_MIN, Math.round(lvl * PVP_LEVEL_RANGE_PCT));
  return { min: Math.max(1, lvl - span), max: lvl + span };
}

// Same formulas as getPlayerCombatStats() in state.js, just parameterized
// so they work on an opponent's Firestore snapshot too — keep in sync if
// the balance formulas ever change.
function pvpStatsFor(s){
  return {
    hp: getMaxHealth(s),
    atk: playerPower(s),
    def: getDamageReduction(s),
    spd: Math.round(40 + (s.level || 1) * 0.4 + getGearBonus(s, 'stamina') * 0.1),
    crit: getCritChance(s),
    dodge: getDodgeChance(s),
    pierce: getPierceChance(s),
  };
}

function pvpOpponentListRowFromDoc(doc){
  const d = doc.data();
  return {
    uid: doc.id,
    username: d.username || 'Player',
    avatar: d.avatar || '🧙',
    level: d.level || 1,
    playerClass: d.playerClass || null,
    protectedUntil: (d.pvp && d.pvp.protectedUntil) || 0,
  };
}

function pvpSnapshotFromDoc(doc){
  const d = doc.data();
  return {
    uid: doc.id,
    username: d.username || 'Player',
    avatar: d.avatar || '🧙',
    level: d.level || 1,
    gold: d.gold || 0,
    playerClass: d.playerClass || null,
    skills: d.skills || { health:0, damage:0, defense:0, stamina:0, storage:0, profit:0 },
    classSkills: d.classSkills || {},
    prestige: d.prestige || { points:0, gatherBonus:0, sellBonus:0, energyBonus:0, storageBonus:0 },
    equipped: d.gear || { weapon:null, armor:null, helmet:null, boots:null, accessory:null, gloves:null },
    combat: d.combat || { wins:0, losses:0 },
    pvp: d.pvp || { wins:0, losses:0, protectedUntil:0 },
  };
}

async function loadPvpOpponents(force){
  if(!db) return;
  if(pvpOpponentsLoading) return;
  if(!force && pvpOpponents && (Date.now() - lastPvpOpponentsFetch < PVP_OPPONENTS_REFRESH_MS)) return;
  pvpOpponentsLoading = true;
  pvpOpponentsError = '';
  try{
    const range = pvpLevelRange();
    const snap = await db.collection('players')
      .where('level', '>=', range.min)
      .where('level', '<=', range.max)
      .limit(50)
      .get();
    let rows = snap.docs
      .filter(d => d.id !== UID)
      .map(pvpOpponentListRowFromDoc)
      .filter(o => !(o.protectedUntil > Date.now()));
    // Firestore can't ORDER BY random(), so shuffle client-side after
    // pulling the level-range window, then just show a page of it.
    for(let i = rows.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = rows[i]; rows[i] = rows[j]; rows[j] = tmp;
    }
    pvpOpponents = rows.slice(0, PVP_OPPONENT_LIMIT);
    lastPvpOpponentsFetch = Date.now();
  }catch(e){
    console.error('[Arcadia PVP] Opponent search failed:', e.code || e.name, e.message);
    pvpOpponentsError = e.code === 'permission-denied'
      ? "Couldn't load challengers (Firestore rules must allow read access to the players collection)."
      : "Couldn't load challengers right now.";
  }
  pvpOpponentsLoading = false;
}

async function openPvpTab(){
  activeTab = 'pvp';
  renderBody();
  await loadPvpOpponents(false);
  renderBody();
}

function refreshPvpOpponents(){
  loadPvpOpponents(true).then(()=> (typeof renderBodyUnlessTyping === 'function' ? renderBodyUnlessTyping() : renderBody()));
}

/* ═══════════════════════════════════════════════════════════════
   Interactive Arena battle — same turn-based shape as the Dungeon
   battle screen in combat.js (CHARGE/ATTACK/DEFEND/SKILL/FLEE/ITEM,
   opponent auto-acts each turn). The outcome is still resolved and
   delivered to the defender exactly like before, just after a real
   fight instead of an instant simulation.
   ═══════════════════════════════════════════════════════════════ */

function pvpGetChargeMultiplier(){
  if(!pvpBattleState) return 1;
  return Math.min(3.0, 1 + pvpBattleState.chargeLevel * 0.5);
}

async function openPvpBattle(uid){
  if(pvpBattleBusy || pvpBattleState) return;
  if(!db){ showToast('Offline', 'The Arena needs a cloud connection.', 'lose'); return; }
  if(state.level < PVP_MIN_LEVEL){ showToast('Too low level', `Reach level ${PVP_MIN_LEVEL} to enter the Arena.`, 'lose'); return; }
  const cost = getEnergyCost(state, PVP_ENERGY_COST);
  if(state.energy < cost){ showToast('Not enough energy', '', 'lose'); return; }
  if(state.health <= 0){ showToast('No health', 'Heal up before entering the Arena.', 'lose'); return; }

  pvpBattleBusy = true;
  renderBody();
  try{
    // Re-fetch right before the fight so results reflect their current
    // gear/level, not whatever was cached when the list was loaded.
    const doc = await db.collection('players').doc(uid).get();
    if(!doc.exists){
      showToast('Player not found', 'They may have left the realm.', 'lose');
      pvpBattleBusy = false; renderBody(); return;
    }
    const defenderSnap = pvpSnapshotFromDoc(doc);
    if((defenderSnap.pvp.protectedUntil || 0) > Date.now()){
      showToast('Shielded', `${defenderSnap.username} is under a protection shield right now.`, 'lose');
      pvpOpponents = (pvpOpponents || []).filter(o => o.uid !== uid);
      pvpBattleBusy = false; renderBody(); return;
    }

    state.energy -= cost;
    const pStats = getPlayerCombatStats();
    const oStats = pvpStatsFor(defenderSnap);

    pvpBattleState = {
      defenderSnap,
      opponent: {
        uid: defenderSnap.uid, username: defenderSnap.username, avatar: defenderSnap.avatar,
        level: defenderSnap.level, playerClass: defenderSnap.playerClass,
        maxHp: oStats.hp, hp: oStats.hp, atk: oStats.atk, def: oStats.def,
        spd: oStats.spd, crit: oStats.crit, dodge: oStats.dodge, pierce: oStats.pierce,
        burnTurns: 0, burnDmg: 0,
      },
      playerMaxHP: pStats.hp,
      playerHP: Math.min(pStats.hp, state.health),
      playerStats: pStats,
      turns: [], won: false, lost: false, fled: false,
      turnCount: 0, chargeLevel: 0, isDefending: false,
      waitingForPlayer: true, rewards: null, lastEffectIndex: 0,
    };
    pvpItemMenuOpen = false; pvpCodexOpen = false;
  }catch(e){
    console.error('[Arcadia PVP] Failed to start battle:', e);
    showToast('Attack failed', 'Connection error, try again.', 'lose');
  }
  pvpBattleBusy = false;
  renderBody(); scheduleSave();
}

function pvpPlayerAttackAction(isSkill, skillKey){
  if(!pvpBattleState || pvpBattleState.won || pvpBattleState.lost || pvpBattleState.fled) return;
  const bs = pvpBattleState; const pStats = bs.playerStats; const o = bs.opponent;
  let dmg = Math.max(1, Math.round(pStats.atk - o.def * (1 - (pStats.pierce || 0))));
  let isCrit = Math.random() < pStats.crit;
  let isPierce = (pStats.pierce || 0) > 0;
  let skillName = '';

  if(isSkill && skillKey){
    const cls = CLASS_DATA[state.playerClass];
    const skDef = cls.skills.find(s=>s.key===skillKey);
    skillName = skDef ? skDef.nameAr : 'Skill';
    if(skillKey === 'powerStrike'){
      state.mana -= 10; dmg = Math.max(1, Math.round(pStats.atk * 2)); isPierce = true;
    } else if(skillKey === 'keenEye'){
      state.mana -= 8; dmg = Math.max(1, Math.round(pStats.atk * 2.5));
      isCrit = Math.random() < Math.min(0.9, pStats.crit + 0.25);
    } else if(skillKey === 'arcanePower'){
      state.mana -= 15; dmg = Math.max(1, Math.round(pStats.atk * 3));
      o.burnTurns = 3; o.burnDmg = Math.max(1, Math.round(pStats.atk * 0.3));
    } else if(skillKey === 'fastHeal'){
      state.mana -= 10;
      const healPct = 0.3 + getClassSkillLevel(state, 'fastHeal') * 0.02;
      const healAmt = Math.round(bs.playerMaxHP * healPct); const oldHp = bs.playerHP;
      bs.playerHP = Math.min(bs.playerMaxHP, bs.playerHP + healAmt); state.health = bs.playerHP;
      bs.turns.push({ who:'skill', type:'heal', heal: bs.playerHP - oldHp, name: skillName });
      bs.turnCount++; pvpAfterPlayerAction(); return;
    } else if(skillKey === 'profitableDeal'){
      state.mana -= 5;
      const stealPct = 0.15 * (1 + getClassSkillLevel(state, 'profitableDeal') * 0.03);
      const already = (bs.rewards && bs.rewards.stolenGold) || 0;
      const remaining = Math.max(0, bs.defenderSnap.gold - already);
      const stolen = Math.round(remaining * stealPct);
      bs.rewards = bs.rewards || {}; bs.rewards.stolenGold = already + stolen;
      bs.turns.push({ who:'skill', type:'steal', gold: stolen, name: skillName });
      bs.turnCount++; pvpAfterPlayerAction(); return;
    }
  }

  const chargeMult = pvpGetChargeMultiplier();
  if(chargeMult > 1){ dmg = Math.round(dmg * chargeMult); }
  if(isCrit) dmg = Math.round(dmg * 2);
  o.hp -= dmg;
  bs.turns.push({ who:'player', dmg, crit:isCrit, pierce:isPierce, charge: chargeMult > 1 ? chargeMult : null, skill: skillName || null });
  if(chargeMult > 1) bs.chargeLevel = 0;
  if(o.hp <= 0){ o.hp = 0; bs.won = true; pvpAwardBattleRewards(); renderBody(); pvpPlayBattleEffects(bs); return; }
  bs.turnCount++; pvpAfterPlayerAction();
}

function pvpChargeAttack(){
  if(!pvpBattleState || pvpBattleState.won || pvpBattleState.lost || pvpBattleState.fled) return;
  const bs = pvpBattleState;
  if(bs.chargeLevel >= 4){ pushLog(state, 'Charge maxed at ×3!', 'gain'); return; }
  bs.chargeLevel++; const mult = pvpGetChargeMultiplier();
  bs.turns.push({ who:'player', type:'charge', mult }); bs.turnCount++; pvpAfterPlayerAction();
}

function pvpDefendStance(){
  if(!pvpBattleState || pvpBattleState.won || pvpBattleState.lost || pvpBattleState.fled) return;
  pvpBattleState.isDefending = true;
  pvpBattleState.turns.push({ who:'player', type:'defend' });
  pvpBattleState.turnCount++; pvpAfterPlayerAction();
}

function pvpUseSkill(skillKey){
  if(!pvpBattleState || pvpBattleState.won || pvpBattleState.lost || pvpBattleState.fled) return;
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
  pvpPlayerAttackAction(true, skillKey);
}

function pvpAttemptFlee(){
  if(!pvpBattleState || pvpBattleState.won || pvpBattleState.lost || pvpBattleState.fled) return;
  const bs = pvpBattleState; const roll = Math.random();
  if(roll < 0.7){
    bs.fled = true;
    bs.turns.push({ who:'player', type:'flee', success:true });
    pushLog(state, `Retreated from ${bs.opponent.username}. No gold or XP lost.`, 'gain');
    renderBody(); pvpPlayBattleEffects(bs); scheduleSave();
  } else {
    bs.turns.push({ who:'player', type:'flee', success:false });
    pushLog(state, 'Retreat failed! Opponent attacks!', 'lose');
    bs.turnCount++; pvpOpponentAttackAction();
  }
}

function pvpAfterPlayerAction(){
  if(!pvpBattleState) return;
  const bs = pvpBattleState;
  if(bs.won || bs.lost || bs.fled) return;
  if(bs.opponent.burnTurns > 0){
    bs.opponent.hp = Math.max(0, bs.opponent.hp - bs.opponent.burnDmg);
    bs.turns.push({ who:'burn', dmg: bs.opponent.burnDmg });
    bs.opponent.burnTurns--;
    if(bs.opponent.hp <= 0){ bs.opponent.hp = 0; bs.won = true; pvpAwardBattleRewards(); renderBody(); pvpPlayBattleEffects(bs); return; }
  }
  pvpOpponentAttackAction();
}

function pvpOpponentAttackAction(){
  if(!pvpBattleState) return;
  const bs = pvpBattleState; const pStats = bs.playerStats; const o = bs.opponent;
  if(bs.won || bs.lost || bs.fled) return;
  const dodged = Math.random() < pStats.dodge;
  if(dodged){ bs.turns.push({ who:'opponent', dmg:0, dodge:true }); bs.isDefending = false; bs.waitingForPlayer = true; renderBody(); pvpPlayBattleEffects(bs); scheduleSave(); return; }
  let dmg = Math.max(1, Math.round(o.atk - pStats.def * (1 - (o.pierce || 0))));
  if(bs.isDefending){ dmg = Math.max(1, Math.round(dmg * 0.5)); bs.isDefending = false; }
  const isCrit = Math.random() < o.crit;
  if(isCrit) dmg = Math.round(dmg * 2);
  bs.playerHP -= dmg; state.health = Math.max(0, bs.playerHP);
  bs.turns.push({ who:'opponent', dmg, crit:isCrit });
  if(bs.playerHP <= 0){ bs.playerHP = 0; state.health = 0; bs.lost = true; pvpApplyLoss(); }
  bs.waitingForPlayer = true; renderBody(); pvpPlayBattleEffects(bs); scheduleSave();
}

function pvpAwardBattleRewards(){
  const bs = pvpBattleState; const d = bs.defenderSnap;
  const stealPct = PVP_STEAL_MIN_PCT + Math.random() * (PVP_STEAL_MAX_PCT - PVP_STEAL_MIN_PCT);
  let goldChange = Math.round(d.gold * stealPct) + ((bs.rewards && bs.rewards.stolenGold) || 0);
  goldChange = Math.min(d.gold, goldChange);
  const xpChange = Math.round(8 + d.level * 1.5);
  if(!state.pvp) state.pvp = { wins:0, losses:0, protectedUntil:0 };
  state.gold += goldChange;
  state.combat.wins += 1;
  state.pvp.wins += 1;
  const leveled = grantXp(state, xpChange);
  bs.rewards = { ...(bs.rewards||{}), goldChange, xpChange };
  pushLog(state, `⚔️ Defeated ${d.username} in the Arena! +${goldChange}g, +${xpChange}xp`, 'win');
  if(leveled){
    pushLog(state, `Reached level ${state.level}! (+1 skill point)`, 'levelup');
    showToast(`<img class="ui-icon" src="${ICONS.levelup_badge}" alt="🆙"> Level Up!`, `You reached level ${state.level}. +1 Skill Point`, 'levelup');
  }
  pvpOpponents = (pvpOpponents || []).filter(op => op.uid !== d.uid);
  pvpDeliverReport(d.uid, true, goldChange);
  renderHeader(); scheduleSave();
}

function pvpApplyLoss(){
  const bs = pvpBattleState; const d = bs.defenderSnap;
  const xpChange = Math.round(3 + d.level * 0.5);
  if(!state.pvp) state.pvp = { wins:0, losses:0, protectedUntil:0 };
  state.combat.losses += 1;
  state.pvp.losses += 1;
  grantXp(state, xpChange);
  bs.rewards = { ...(bs.rewards||{}), goldChange: 0, xpChange };
  pushLog(state, `⚔️ Lost to ${d.username} in the Arena. +${xpChange}xp for the attempt.`, 'lose');
  pvpOpponents = (pvpOpponents || []).filter(op => op.uid !== d.uid);
  pvpDeliverReport(d.uid, false, 0);
  renderHeader(); scheduleSave();
}

// Deliver the outcome to the defender (create-only — see the rule note
// at the top of this file). If rules aren't set up yet this just logs
// a warning; your own side of the fight still went through.
async function pvpDeliverReport(uid, won, goldLost){
  try{
    await db.collection('players').doc(uid).collection('pvpReports').add({
      attackerUid: UID, attackerName: state.username || 'A rival',
      won, goldLost: won ? goldLost : 0,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }catch(e){
    console.warn('[Arcadia PVP] Could not deliver attack report to defender (check Firestore rules):', e.code || e.message);
  }
}

function pvpCloseBattle(){
  pvpBattleState = null; pvpItemMenuOpen = false; pvpCodexOpen = false;
  renderBody();
}

function pvpToggleItems(){
  if(!pvpBattleState) return; pvpItemMenuOpen = !pvpItemMenuOpen; pvpCodexOpen = false; renderBody();
}

function pvpToggleCodex(){
  if(!pvpBattleState) return; pvpCodexOpen = !pvpCodexOpen; pvpItemMenuOpen = false; renderBody();
}

function pvpUseBattleItem(key){
  if(!pvpBattleState || pvpBattleState.won || pvpBattleState.lost || pvpBattleState.fled) return;
  const bs = pvpBattleState;
  if(BREAD_TIERS[key]){
    if((state.inv[key]||0) < 1) return; state.inv[key] -= 1;
    const b = BREAD_TIERS[key]; const oldHp = bs.playerHP;
    bs.playerHP = Math.min(bs.playerMaxHP, bs.playerHP + b.heal); state.health = bs.playerHP;
    bs.turns.push({ who:'item', type:'health', heal: bs.playerHP - oldHp, name: b.name });
  } else if(key === 'health_potion'){
    if((state.inv[key]||0) < 1) return; state.inv[key] -= 1;
    const heal = 30 + Math.floor(Math.random()*21); const oldHp = bs.playerHP;
    bs.playerHP = Math.min(bs.playerMaxHP, bs.playerHP + heal); state.health = bs.playerHP;
    bs.turns.push({ who:'item', type:'health', heal: bs.playerHP - oldHp, name: 'Health Potion' });
  } else { return; }
  pvpItemMenuOpen = false; bs.turnCount++; pvpAfterPlayerAction();
}

// Reuses spawnFloatNum() from combat.js (loaded before pvp.js) and the same
// #battle-player-sprite / #battle-monster-sprite DOM ids from renderPvpBattle,
// so opponent hits float exactly like monster hits do in the Dungeon.
function pvpPlayBattleEffects(bs){
  if(!bs) return;
  if(typeof bs.lastEffectIndex !== 'number') bs.lastEffectIndex = 0;
  const newTurns = bs.turns.slice(bs.lastEffectIndex);
  bs.lastEffectIndex = bs.turns.length;
  newTurns.forEach((t, i)=>{
    setTimeout(()=>{
      if(t.who==='player' && t.dmg>0) spawnFloatNum('monster', (t.crit?'CRIT! ':'') + '-'+t.dmg, t.crit?'crit':'enemy');
      else if(t.who==='opponent' && t.dmg>0) spawnFloatNum('player', (t.crit?'CRIT! ':'') + '-'+t.dmg, t.crit?'crit':'player');
      else if(t.who==='opponent' && t.dodge) spawnFloatNum('player', 'DODGE!', 'dodge');
      else if(t.who==='skill' && t.type==='heal') spawnFloatNum('player', '+'+t.heal, 'heal');
      else if(t.who==='item' && t.type==='health') spawnFloatNum('player', '+'+t.heal, 'heal');
      else if(t.who==='burn') spawnFloatNum('monster', '-'+t.dmg, 'burn');
    }, i*400);
  });
}

// Applies any attacks that landed on us while we were offline (or just on
// another tab): deducts gold, grants a shield, notifies. Self-writes only.
async function applyPendingPvpReports(){
  if(!db || !UID) return;
  try{
    const snap = await db.collection('players').doc(UID).collection('pvpReports').limit(20).get();
    if(snap.empty) return;
    let goldLostTotal = 0;
    const batch = db.batch();
    snap.docs.forEach(doc=>{
      const r = doc.data();
      if(r.won){
        const lost = Math.min(state.gold, r.goldLost || 0);
        state.gold -= lost;
        goldLostTotal += lost;
        if(!state.pvp) state.pvp = { wins:0, losses:0, protectedUntil:0 };
        state.pvp.losses += 1;
        state.pvp.protectedUntil = Date.now() + PVP_PROTECTION_MS;
        state.combat.losses += 1;
      }
      batch.delete(doc.ref);
    });
    await batch.commit();
    if(goldLostTotal > 0 && typeof addNotification === 'function'){
      addNotification('pvp', '⚔️ You were attacked!', `Rivals raided your gold while you were away. -${goldLostTotal}g total. You have a ${Math.round(PVP_PROTECTION_MS/60000)}-minute shield now.`);
    }
    renderHeader(); scheduleSave();
  }catch(e){
    console.error('[Arcadia PVP] Failed to apply incoming reports:', e.code || e.name, e.message);
  }
}

async function initPvpOnStart(){
  await applyPendingPvpReports();
  setInterval(()=>{ applyPendingPvpReports(); }, 3 * 60 * 1000);
}

function renderPvpBattle(){
  if(!pvpBattleState) return '';
  const bs = pvpBattleState, o = bs.opponent, d = bs.defenderSnap;
  const pMax = bs.playerMaxHP, pHp = bs.playerHP;
  const oMax = o.maxHp, oHp = o.hp;
  const pPct = Math.max(0, (pHp/pMax)*100), oPct = Math.max(0, (oHp/oMax)*100);
  const manaPct = Math.max(0, (state.mana / state.maxMana) * 100);
  const chargeMult = pvpGetChargeMultiplier();
  const chargeText = chargeMult > 1 ? `×${chargeMult.toFixed(1)}` : '';
  const cls = state.playerClass ? CLASS_DATA[state.playerClass] : null;
  const oCls = o.playerClass ? CLASS_DATA[o.playerClass] : null;
  const canAct = bs.waitingForPlayer && !bs.won && !bs.lost && !bs.fled;

  const logLines = bs.turns.slice(-4).map(t => {
    let txt = '', color = 'var(--dim)';
    if(t.who==='player' && t.type==='charge'){ txt=`<img class="ui-icon" src="${ICONS.energy}" alt="⚡"> Charge ${t.mult.toFixed(1)}×`; color='var(--brass-bright)'; }
    else if(t.who==='player' && t.type==='defend'){ txt=`🛡️ Defending`; color='var(--skill)'; }
    else if(t.who==='player' && t.type==='flee' && t.success){ txt=`🏃 Retreated!`; color='var(--green)'; }
    else if(t.who==='player' && t.type==='flee' && !t.success){ txt=`🏃 Retreat failed`; color='var(--red)'; }
    else if(t.who==='skill' && t.type==='steal'){ txt=`💰 +${t.gold}g`; color='var(--brass-bright)'; }
    else if(t.who==='skill' && t.type==='heal'){ txt=`💚 +${t.heal} HP`; color='var(--health)'; }
    else if(t.who==='player' && t.skill){ txt=`✨ ${t.skill} ${t.dmg} dmg`; color='var(--prestige)'; }
    else if(t.who==='player' && t.dmg>0){ txt=`⚔️ ${t.dmg}${t.crit?' 💥':''}${t.charge?' ('+t.charge.toFixed(1)+'×)':''}`; color='var(--green)'; }
    else if(t.who==='opponent' && t.dmg>0){ txt=`🩸 ${t.dmg}${t.crit?' 💥':''}`; color='var(--red)'; }
    else if(t.who==='opponent' && t.dodge){ txt=`💨 Dodged!`; color='var(--skill)'; }
    else if(t.who==='burn'){ txt=`🔥 Burn ${t.dmg}`; color='var(--copper)'; }
    else if(t.who==='item' && t.type==='health'){ txt=`🧪 +${t.heal} HP`; color='var(--health)'; }
    return `<span style="color:${color};font-size:11px;margin-right:10px;white-space:nowrap;">${txt}</span>`;
  }).join('');

  const resultHtml = bs.won ? `
    <div style="position:absolute;inset:0;background:rgba(5,12,10,0.88);backdrop-filter:blur(4px);z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;text-align:center;animation:fadeIn 0.3s ease-out;">
      <div style="font-size:56px;animation:pulse 1.5s ease-in-out infinite;"><img class="ui-icon" src="${ICONS.trophy}" alt="🏆"></div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:24px;color:var(--green);">Victory!</div>
      <div style="font-size:13px;color:var(--dim);">vs ${escapeHtml(o.username)} (Lv.${o.level})</div>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:220px;">
        <div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span><img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙"> Gold</span><b style="color:var(--brass-bright);">${bs.rewards.goldChange}</b></div>
        <div style="display:flex;justify-content:space-between;background:var(--panel-light);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:14px;"><span>✨ XP</span><b style="color:var(--prestige);">${bs.rewards.xpChange}</b></div>
      </div>
      <button class="act-btn buy" style="width:auto;padding:12px 36px;font-size:14px;margin-top:6px;" onclick="pvpCloseBattle()">Continue</button>
    </div>`
    : bs.lost ? `
    <div style="position:absolute;inset:0;background:rgba(5,12,10,0.88);backdrop-filter:blur(4px);z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;text-align:center;animation:fadeIn 0.3s ease-out;">
      <div style="font-size:56px;">💀</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:24px;color:var(--red);">Defeat</div>
      <div style="font-size:13px;color:var(--dim);">${escapeHtml(o.username)} defeated you. +${bs.rewards.xpChange}xp for the attempt.</div>
      <button class="act-btn red" style="width:auto;padding:12px 36px;font-size:14px;margin-top:6px;" onclick="pvpCloseBattle()">Continue</button>
    </div>`
    : bs.fled ? `
    <div style="position:absolute;inset:0;background:rgba(5,12,10,0.88);backdrop-filter:blur(4px);z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;text-align:center;animation:fadeIn 0.3s ease-out;">
      <div style="font-size:56px;">🏃</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:22px;color:var(--copper);">You retreated!</div>
      <button class="act-btn" style="width:auto;padding:12px 36px;font-size:14px;margin-top:6px;" onclick="pvpCloseBattle()">Continue</button>
    </div>`
    : '';

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

  const itemMenuHtml = pvpItemMenuOpen ? `
    <div style="position:absolute;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--border);border-radius:16px 16px 0 0;padding:16px;z-index:20;animation:slideUp 0.25s ease-out;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:13px;color:var(--dim);font-family:'Cairo',sans-serif;font-weight:700;">🧪 Use Item</div>
        <button style="background:none;border:none;color:var(--dim);font-size:18px;cursor:pointer;" onclick="pvpToggleItems()">✕</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${Object.keys(BREAD_TIERS).map(key=>{ const have = state.inv[key]||0; if(have<1) return ''; const b = BREAD_TIERS[key]; return `<button class="mini-btn" style="border-color:var(--health);color:var(--health);padding:8px 12px;" onclick="pvpUseBattleItem('${key}')">${ITEMS[key].icon} ${b.name} +${b.heal}HP ×${have}</button>`; }).join('')}
        ${(state.inv.health_potion||0)>0 ? `<button class="mini-btn" style="border-color:var(--health);color:var(--health);padding:8px 12px;" onclick="pvpUseBattleItem('health_potion')">💚 Health Potion +30-50HP ×${state.inv.health_potion}</button>` : ''}
      </div>
    </div>
  ` : '';

  const codexHtml = pvpCodexOpen ? `
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(5,12,10,0.92);backdrop-filter:blur(6px);z-index:20;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease-out;" onclick="if(event.target===this)pvpToggleCodex()">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px;width:100%;max-width:360px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);">${o.avatar} ${escapeHtml(o.username)}</div>
          <button style="background:none;border:none;color:var(--dim);font-size:18px;cursor:pointer;" onclick="pvpToggleCodex()">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:var(--dim);margin-bottom:12px;">
          <div>Lv. <b style="color:var(--text);">${o.level}</b></div>
          <div>${oCls ? oCls.icon + ' ' + oCls.name : 'No class'}</div>
          <div><img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️"> HP: <b style="color:var(--text);">${o.maxHp}</b></div>
          <div>⚔️ ATK: <b style="color:var(--text);">${o.atk}</b></div>
          <div>🛡️ DEF: <b style="color:var(--text);">${(o.def*100).toFixed(0)}%</b></div>
          <div>💨 SPD: <b style="color:var(--text);">${o.spd}</b></div>
          <div>🎯 Crit: <b style="color:var(--text);">${(o.crit*100).toFixed(0)}%</b></div>
          <div>💫 Dodge: <b style="color:var(--text);">${(o.dodge*100).toFixed(0)}%</b></div>
        </div>
      </div>
    </div>
  ` : '';

  return `<div style="position:relative;display:flex;flex-direction:column;height:100%;min-height:calc(100vh - 60px);background:linear-gradient(180deg,#080b10 0%,#131a24 40%,#1a2530 100%);overflow:hidden;">
    ${resultHtml}
    ${codexHtml}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);">
      <button class="mini-btn" onclick="pvpAttemptFlee()" ${!canAct?'disabled':''}>🏃 Retreat</button>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;color:var(--brass-bright);">⚔️ ARENA</div>
      <button class="mini-btn" onclick="pvpToggleCodex()">ℹ️</button>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px;gap:24px;position:relative;">
      <div id="battle-monster-sprite" style="display:flex;flex-direction:column;align-items:center;gap:8px;transition:transform 0.2s;">
        <div style="font-size:52px;">${oCls ? oCls.icon : o.avatar}</div>
        <div style="font-size:12px;color:var(--brass-bright);font-weight:700;">${escapeHtml(o.username)} · Lv.${o.level}</div>
        <div style="width:160px;height:10px;background:var(--panel-light);border:1px solid var(--border);border-radius:6px;overflow:hidden;">
          <div style="height:100%;width:${oPct}%;background:var(--red);transition:width 0.3s;"></div>
        </div>
        <div style="font-size:10px;color:var(--dim);">${oHp}/${oMax} HP</div>
      </div>
      <div style="font-size:20px;color:var(--dim);">VS</div>
      <div id="battle-player-sprite" style="display:flex;flex-direction:column;align-items:center;gap:8px;transition:transform 0.2s;">
        <div style="font-size:52px;">${cls ? cls.icon : '🧑'}</div>
        <div style="font-size:12px;color:var(--brass-bright);font-weight:700;">You</div>
        <div style="width:160px;height:10px;background:var(--panel-light);border:1px solid var(--border);border-radius:6px;overflow:hidden;">
          <div style="height:100%;width:${pPct}%;background:var(--health);transition:width 0.3s;"></div>
        </div>
        <div style="font-size:10px;color:var(--dim);">${pHp}/${pMax} HP</div>
        <div style="width:120px;height:6px;background:var(--panel-light);border:1px solid var(--border);border-radius:6px;overflow:hidden;">
          <div style="height:100%;width:${manaPct}%;background:var(--skill);transition:width 0.3s;"></div>
        </div>
      </div>
    </div>
    <div style="padding:6px 16px;min-height:22px;display:flex;overflow-x:auto;">${logLines}</div>
    ${itemMenuHtml}
    <div style="padding:12px 16px 16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
      <button class="act-btn" ${!canAct?'disabled':''} onclick="pvpChargeAttack()"><img class="ui-icon" src="${ICONS.energy}" alt="⚡"> Charge ${chargeText}</button>
      <button class="act-btn buy" ${!canAct?'disabled':''} onclick="pvpPlayerAttackAction(false)">⚔️ Attack</button>
      <button class="act-btn" ${!canAct?'disabled':''} onclick="pvpDefendStance()">🛡️ Defend</button>
      ${skillBtn ? `<button class="act-btn" style="color:var(--prestige);" ${skillBtn.disabled?'disabled':''} onclick="pvpUseSkill('${skillBtn.key}')">✨ ${skillBtn.label} (${skillBtn.mana}mp)</button>` : `<div></div>`}
      <button class="act-btn" ${!canAct?'disabled':''} onclick="pvpToggleItems()">🧪 Item</button>
      <div></div>
    </div>
  </div>`;
}

function renderPvpTab(){
  if(state.level < PVP_MIN_LEVEL){
    return `<div class="wrap animate-fade"><div class="panel" style="padding:20px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">⚔️</div>
      <div style="font-weight:700;margin-bottom:4px;">Arena locked</div>
      <div style="color:var(--dim);font-size:13px;">Reach level ${PVP_MIN_LEVEL} to challenge other players.</div>
    </div></div>`;
  }
  if(!db){
    return `<div class="wrap animate-fade"><div class="lb-note">🔌 The Arena needs a cloud connection. Sign in with Google to fight real players.</div></div>`;
  }
  const myShield = state.pvp && state.pvp.protectedUntil > Date.now();
  const header = `
    <div class="wrap animate-fade" style="padding-bottom:0;">
      <header class="hero" style="margin-bottom:14px;">
        <h1 style="font-size:22px;">⚔️ Arena</h1>
        <p style="color:var(--dim);font-size:12px;">Attack other players for gold and XP. Losing costs you nothing but pride.</p>
      </header>
      <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
        <div class="panel" style="padding:8px;text-align:center;"><div style="font-size:10px;color:var(--dim);">Wins</div><div style="font-family:'JetBrains Mono',monospace;font-size:15px;">${(state.pvp && state.pvp.wins) || 0}</div></div>
        <div class="panel" style="padding:8px;text-align:center;"><div style="font-size:10px;color:var(--dim);">Losses</div><div style="font-family:'JetBrains Mono',monospace;font-size:15px;">${(state.pvp && state.pvp.losses) || 0}</div></div>
        <div class="panel" style="padding:8px;text-align:center;"><div style="font-size:10px;color:var(--dim);">Shield</div><div style="font-size:12px;color:${myShield?'#6fd48c':'var(--dim)'};">${myShield ? hmsUntil(state.pvp.protectedUntil) : 'None'}</div></div>
      </div>
    </div>`;

  let body;
  if(pvpOpponentsLoading && !pvpOpponents){
    body = `<div class="wrap"><div class="lb-note">Scouting the Arena for challengers…</div></div>`;
  } else if(pvpOpponentsError && !pvpOpponents){
    body = `<div class="wrap"><div class="lb-note">⚠️ ${pvpOpponentsError}</div><button class="btn btn-secondary" style="margin-top:8px;" onclick="refreshPvpOpponents()">Retry</button></div>`;
  } else if(!pvpOpponents || pvpOpponents.length === 0){
    body = `<div class="wrap"><div class="lb-note">No challengers found in your level range right now.</div><button class="btn btn-secondary" style="margin-top:8px;" onclick="refreshPvpOpponents()">↻ Refresh</button></div>`;
  } else {
    const range = pvpLevelRange();
    body = `<div class="wrap" style="padding-top:0;">
      <div class="lb-note" style="margin-bottom:10px;">Level range ${range.min}–${range.max} · <span style="cursor:pointer;color:var(--brass-bright);" onclick="refreshPvpOpponents()">↻ Refresh</span></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">
        ${pvpOpponents.map(o => `
          <div class="card" style="padding:14px;text-align:center;">
            <div style="font-size:30px;margin-bottom:4px;">${o.avatar}</div>
            <div style="font-weight:700;font-size:13px;color:var(--brass-bright);">${escapeHtml(o.username)}</div>
            <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Lv.${o.level}${o.playerClass ? ' · ' + o.playerClass : ''}</div>
            <button class="act-btn buy" style="width:100%;" ${pvpBattleBusy ? 'disabled' : ''} onclick="openPvpBattle('${o.uid}')">⚔️ Attack</button>
          </div>`).join('')}
      </div>
    </div>`;
  }
  return header + body;
}
