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
let pvpBattleResult = null;      // last resolved fight, shown in the report modal

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

function simulatePvpBattle(aStats, dStats){
  let aHp = aStats.hp, dHp = dStats.hp;
  const log = [];
  let rounds = 0;
  while(aHp > 0 && dHp > 0 && rounds < PVP_MAX_ROUNDS){
    rounds++;
    const order = aStats.spd >= dStats.spd ? ['a','d'] : ['d','a'];
    for(const side of order){
      if(aHp <= 0 || dHp <= 0) break;
      if(side === 'a'){
        if(Math.random() < dStats.dodge){ log.push({ who:'a', dodge:true }); continue; }
        let dmg = Math.max(1, Math.round(aStats.atk - dStats.def * (1 - (aStats.pierce || 0))));
        const crit = Math.random() < aStats.crit;
        if(crit) dmg = Math.round(dmg * 2);
        dHp = Math.max(0, dHp - dmg);
        log.push({ who:'a', dmg, crit });
      } else {
        if(Math.random() < aStats.dodge){ log.push({ who:'d', dodge:true }); continue; }
        let dmg = Math.max(1, Math.round(dStats.atk - aStats.def * (1 - (dStats.pierce || 0))));
        const crit = Math.random() < dStats.crit;
        if(crit) dmg = Math.round(dmg * 2);
        aHp = Math.max(0, aHp - dmg);
        log.push({ who:'d', dmg, crit });
      }
    }
  }
  let won;
  if(dHp <= 0 && aHp > 0) won = true;
  else if(aHp <= 0 && dHp > 0) won = false;
  else won = (aHp / aStats.hp) >= (dHp / dStats.hp); // round cap or double-KO: higher remaining % wins
  return { won, log, rounds, aHpLeft: aHp, dHpLeft: dHp };
}

async function attackPvpOpponent(uid){
  if(pvpBattleBusy) return;
  if(!db){ showToast('Offline', 'The Arena needs a cloud connection.', 'lose'); return; }
  if(state.level < PVP_MIN_LEVEL){ showToast('Too low level', `Reach level ${PVP_MIN_LEVEL} to enter the Arena.`, 'lose'); return; }
  const cost = getEnergyCost(state, PVP_ENERGY_COST);
  if(state.energy < cost){ showToast('Not enough energy', '', 'lose'); return; }

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
    const aStats = getPlayerCombatStats();
    const dStats = pvpStatsFor(defenderSnap);
    const result = simulatePvpBattle(aStats, dStats);

    let goldChange = 0, xpChange = 0, leveled = false;
    if(!state.pvp) state.pvp = { wins:0, losses:0, protectedUntil:0 };
    if(result.won){
      const stealPct = PVP_STEAL_MIN_PCT + Math.random() * (PVP_STEAL_MAX_PCT - PVP_STEAL_MIN_PCT);
      goldChange = Math.min(defenderSnap.gold, Math.round(defenderSnap.gold * stealPct));
      xpChange = Math.round(8 + defenderSnap.level * 1.5);
      state.gold += goldChange;
      state.combat.wins += 1;
      state.pvp.wins += 1;
      leveled = grantXp(state, xpChange);
      pushLog(state, `⚔️ Defeated ${defenderSnap.username} in the Arena! +${goldChange}g, +${xpChange}xp`, 'win');
    } else {
      xpChange = Math.round(3 + defenderSnap.level * 0.5);
      state.combat.losses += 1;
      state.pvp.losses += 1;
      leveled = grantXp(state, xpChange);
      pushLog(state, `⚔️ Lost to ${defenderSnap.username} in the Arena. +${xpChange}xp for the attempt.`, 'lose');
    }
    if(leveled){
      pushLog(state, `Reached level ${state.level}! (+1 skill point)`, 'levelup');
      showToast(`<img class="ui-icon" src="${ICONS.levelup_badge}" alt="🆙"> Level Up!`, `You reached level ${state.level}. +1 Skill Point`, 'levelup');
    }

    pvpBattleResult = { ...result, opponent: defenderSnap, goldChange, xpChange };
    pvpOpponents = (pvpOpponents || []).filter(o => o.uid !== uid);

    // Deliver the outcome to the defender (create-only — see the rule note
    // at the top of this file). If rules aren't set up yet this just logs
    // a warning; your own side of the fight still went through.
    try{
      await db.collection('players').doc(uid).collection('pvpReports').add({
        attackerUid: UID, attackerName: state.username || 'A rival',
        won: result.won, goldLost: result.won ? goldChange : 0,
        ts: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }catch(e){
      console.warn('[Arcadia PVP] Could not deliver attack report to defender (check Firestore rules):', e.code || e.message);
    }

    renderHeader(); scheduleSave();
    renderPvpBattleResultModal();
  }catch(e){
    console.error('[Arcadia PVP] Attack failed:', e);
    showToast('Attack failed', 'Connection error, try again.', 'lose');
  }
  pvpBattleBusy = false;
  renderBody();
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

function renderPvpBattleResultModal(){
  const r = pvpBattleResult;
  if(!r) return;
  const aHits = r.log.filter(e=>e.who==='a' && !e.dodge).length;
  const dHits = r.log.filter(e=>e.who==='d' && !e.dodge).length;
  const aCrits = r.log.filter(e=>e.who==='a' && e.crit).length;
  const dCrits = r.log.filter(e=>e.who==='d' && e.crit).length;
  const body = `
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:34px;">${r.won ? '🏆' : '💀'}</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:18px;color:${r.won?'var(--brass-bright)':'#d44c4c'};">${r.won ? 'Victory!' : 'Defeated'}</div>
      <div style="color:var(--dim);font-size:13px;">vs ${escapeHtml(r.opponent.username)} (Lv.${r.opponent.level})</div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div class="panel" style="padding:10px;text-align:center;">
        <div style="font-size:11px;color:var(--dim);">Your hits</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:16px;">${aHits}${aCrits?` (${aCrits} crit)`:''}</div>
      </div>
      <div class="panel" style="padding:10px;text-align:center;">
        <div style="font-size:11px;color:var(--dim);">Their hits</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:16px;">${dHits}${dCrits?` (${dCrits} crit)`:''}</div>
      </div>
    </div>
    <div class="panel" style="padding:10px;margin-bottom:14px;text-align:center;">
      ${r.won ? `+${fmtG(r.goldChange)}g · +${r.xpChange}xp` : `+${r.xpChange}xp for the attempt`}
    </div>
    <button class="btn btn-primary" style="width:100%;" onclick="this.closest('.modal-overlay').remove()">Close</button>
  `;
  showModal('⚔️ Battle Report', body);
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
            <button class="act-btn buy" style="width:100%;" ${pvpBattleBusy ? 'disabled' : ''} onclick="attackPvpOpponent('${o.uid}')">⚔️ Attack</button>
          </div>`).join('')}
      </div>
    </div>`;
  }
  return header + body;
}
