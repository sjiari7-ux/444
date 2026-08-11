function getCompanyManagementLevel(level){ return Math.floor(level/5); }
function getMaxAllowedCompanies(level){ return Math.min(MAX_COMPANIES, 1 + Math.floor(level/5)); }
function getConcreteCost(n){ return n <= 1 ? 0 : (n-1)*5; }

/* ===== CORE LOOP & RENDER ===== */
async function startGame(){
  if(window.__gameStarted) return; window.__gameStarted = true;
  await loadState();
  // Apply saved appearance settings now that state (and the DOM) are ready.
  if(typeof applyTheme === 'function') applyTheme(state.theme);
  if(typeof applyFontSize === 'function') applyFontSize(state.fontSize);
  if(typeof applyAccentColor === 'function') applyAccentColor(state.accentColor);
  if(!state.missions) generateMissions();
  if(!state.leaderboard) evolveLeaderboard();
  await initAllianceOnStart();
  render();
  setInterval(tick, TICK_MS);
  setInterval(()=>{ updatePrices(); renderBody(); }, PRICE_TICK_MS);
  setInterval(()=>{ if(state && state.missions && Date.now() >= state.missions.resetAt){ generateMissions(); renderBody(); } }, 60000);
  setInterval(syncToFirestore, SYNC_INTERVAL);
  loadUsername();
  renderGlobalChatFab();
  startGlobalChatListener();
}
function render(){
  renderHeader();
  renderBody();
  renderLog();
  renderBottomNav();
}
function renderBody(){ document.getElementById('app').innerHTML = renderBodyHTML(); }
function renderHeader(){
  const el = document.getElementById('header');
  if(!el) return;
  // Compact topbar v2
  const maxE = getMaxEnergy(state);
  const maxH = getMaxHealth(state);
  const ePct = maxE>0?(state.energy/maxE)*100:0;
  const hPct = maxH>0?(state.health/maxH)*100:0;
  const xpPct = state.xpToNext>0?(state.xp/state.xpToNext)*100:0;
  const cls = state.playerClass ? CLASS_DATA[state.playerClass] : null;
  el.innerHTML = `
  <div class="topbar-v2">
    <div class="topbar-main">
      <div class="avatar-wrap">
        <div class="avatar-circle">${cls?cls.icon:'🧙'}</div>
        <div class="avatar-level">${state.level}</div>
      </div>
      <div class="stats-col">
        <div class="stat-row"><span class="icon"><img class="ui-icon" src="${ICONS.energy}" alt="⚡"></span><div class="bar"><div class="bar-fill" style="width:${ePct}%;background:var(--brass);"></div></div><span class="val"><b>${Math.floor(state.energy)}</b>/${maxE}</span></div>
        <div class="stat-row"><span class="icon"><img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️"></span><div class="bar"><div class="bar-fill ${hPct<30?'health':''}" style="width:${hPct}%;background:var(--health);"></div></div><span class="val"><b>${Math.floor(state.health)}</b>/${maxH}</span></div>
        <div class="stat-row"><span class="icon">✨</span><div class="bar"><div class="bar-fill" style="width:${xpPct}%;background:var(--prestige);"></div></div><span class="val"><b>${state.xp}</b>/${state.xpToNext}</span></div>
      </div>
      <div class="topbar-right">
        <div class="gold-pill"><img class="ui-icon" src="${ICONS.gold_coin}" alt="🪙"> ${fmtG(state.gold)}</div>
        <button class="top-icon-btn" onclick="activeTab='settings';renderBody();" title="Settings">⚙️</button>
        <button class="top-icon-btn" onclick="logout()" title="Log out">🚪</button>
      </div>
    </div>
    <div class="topbar-sub">
      <div class="timer-pill"><img class="ui-icon" src="${ICONS.mana}" alt="🔮"> ${state.mana}/${state.maxMana} MP</div>
      <div class="action-pill"><span class="dot"></span>Online</div>
      <div class="timer-pill" id="usernameDisplay" style="background:rgba(184,160,212,0.12);border-color:var(--prestige);color:var(--prestige);">👤 ${window.__playerUsername || "Player"}</div>
    </div>
  </div>`;
}
function renderBottomNav(){
  const existing = document.getElementById('bottom-nav');
  if(existing) existing.remove();
  const nav = document.createElement('div');
  nav.id = 'bottom-nav';
  nav.className = 'bottom-nav';
  const tabs = [
    {id:'production',icon:'🛠️',label:'Craft'},
    {id:'market',icon:`<img class="ui-icon" src="${ICONS.market_chart}" alt="📊">`,label:'Market'},
    {id:'zones',icon:'🗺️',label:'Zones'},
    {id:'gear',icon:'🛡️',label:'Gear'},
    {id:'companies',icon:'🏭',label:'Biz'},
    {id:'alliance',icon:'🏛️',label:'Alliance'},
    {id:'settings',icon:'⚙️',label:'More'},
  ];
  nav.innerHTML = tabs.map(t=>`<button class="nav-item ${activeTab===t.id?'active':''}" onclick="${t.id==='alliance'?'openAllianceTab();':`stopAllianceChatListener();activeTab='${t.id}';renderBody();`}"><span class="nav-icon">${t.icon}</span><span>${t.label}</span></button>`).join('');
  document.body.appendChild(nav);
}
function scheduleSave(){
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 300);
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  const dot = document.querySelector('.save-dot');
  if(dot){ dot.classList.add('flash'); setTimeout(()=>dot.classList.remove('flash'), 500); }
  syncToFirestore();
}
async function loadState(){
  // Try Firestore first
  const cloudLoaded = await loadFromFirestore();
  if(cloudLoaded) return;
  // Fallback to localStorage
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ state = migrateState(JSON.parse(raw)); return; }
  }catch(e){}
  state = defaultState();
}
function showToast(title, body, cls){
  let container = document.getElementById('toast-container');
  if(!container){ container = document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = 'toast ' + (cls||'');
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body}</div>`;
  container.appendChild(toast);
  setTimeout(()=>{ toast.classList.add('hiding'); setTimeout(()=>toast.remove(), 300); }, 4000);
}

/* ===== TICK & ECONOMY ===== */
function tick(){
  const now = Date.now();
  // Energy regen
  const eDiff = now - state.lastEnergyTs;
  if(eDiff >= ENERGY_REGEN_MS){
    const ticks = Math.floor(eDiff / ENERGY_REGEN_MS);
    state.energy = Math.min(getMaxEnergy(state), state.energy + ticks);
    state.lastEnergyTs += ticks * ENERGY_REGEN_MS;
  }
  // Health regen
  const hDiff = now - state.lastHealthRegenTs;
  if(hDiff >= HEALTH_REGEN_MS){
    const ticks = Math.floor(hDiff / HEALTH_REGEN_MS);
    const maxH = getMaxHealth(state);
    state.health = Math.min(maxH, state.health + ticks);
    state.lastHealthRegenTs += ticks * HEALTH_REGEN_MS;
  }
  // Mana regen (1 per minute)
  const mDiff = now - state.lastManaRegenTs;
  if(mDiff >= 60000){
    const ticks = Math.floor(mDiff / 60000);
    state.mana = Math.min(state.maxMana, state.mana + ticks);
    state.lastManaRegenTs += ticks * 60000;
  }
  // Companies production
  state.companies.forEach(c=>{
    if(c.disabled) return;
    const rate = ENGINE_PRODUCTION[c.engineLevel];
    const maxCap = rate * 24;
    c.stored = Math.min(maxCap, c.stored + rate / 3600); // per second
  });
  // Leaderboard evolve
  if(now - state.lastLbEvolve >= LB_EVOLVE_MS){
    evolveLeaderboard();
    state.lastLbEvolve = now;
  }
  // Missions reset check
  if(state.missions && now >= state.missions.resetAt){
    generateMissions();
  }
  renderHeader();
}
function updatePrices(){
  Object.keys(ITEMS).forEach(k=>{
    state.prevPrices[k] = state.prices[k];
    const change = (Math.random()-0.5)*0.3;
    state.prices[k] = Math.max(1, Math.round(state.prices[k]*(1+change)*10)/10);
    if(!state.priceHistory[k]) state.priceHistory[k]=[];
    state.priceHistory[k].push(state.prices[k]);
    if(state.priceHistory[k].length > PRICE_HISTORY_LENGTH) state.priceHistory[k].shift();
  });
}
function generateMissions(){
  const list = [];
  const counters = { collected:0, crafted:0, sold:0, wins:0 };
  const pool = [...MISSION_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  pool.forEach(tpl=>{
    const target = tpl.gen();
    list.push({ templateId: tpl.id, target, reward: tpl.reward(target), done: false });
  });
  state.missions = { list, counters, resetAt: Date.now() + MISSION_PERIOD_MS };
}
function trackMission(s, track, amount){
  if(!s.missions) return;
  s.missions.counters[track] = (s.missions.counters[track]||0) + amount;
  s.missions.list.forEach(ms=>{
    if(ms.done) return;
    const tpl = MISSION_POOL.find(m=>m.id===ms.templateId);
    if(tpl && tpl.track===track){
      if(s.missions.counters[track] >= ms.target){
        ms.done = true;
        s.gold += ms.reward;
        s.totalGoldEarned += ms.reward;
        pushLog(s, `Mission complete: ${tpl.label(ms.target)} (+${ms.reward}g)`, 'win');
        showToast('Mission Complete', tpl.label(ms.target) + ` +${ms.reward}g`, 'win');
      }
    }
  });
}
function evolveLeaderboard(){
  state.leaderboard = LB_NAMES.map((name,i)=>{
    const level = Math.max(1, state.level + Math.floor((Math.random()-0.5)*8));
    const gold = Math.max(0, Math.floor(state.gold * (0.5 + Math.random()*1.5)));
    return { name, level, gold };
  });
}

/* ===== GATHERING & CONSUMABLES ===== */
function collect(key){
  const cost = getEnergyCost(state, 1);
  if(state.energy < cost){ pushLog(state, 'Not enough energy!', 'lose'); return; }
  const cap = getStorageCap(state);
  if(state.inv[key] >= cap){ pushLog(state, 'Storage full!', 'lose'); return; }
  const amount = Math.min(cap - state.inv[key], 5 + state.prestige.gatherBonus + Math.floor(state.level/3));
  state.inv[key] += amount;
  state.energy -= cost;
  grantXp(state, 1);
  trackMission(state, 'collected', amount);
  pushLog(state, `+${amount} ${ITEMS[key].name}`, 'gain');
  renderBody(); scheduleSave();
}
function eat(){
  if(state.inv.food < 5){ pushLog(state, 'Not enough food!', 'lose'); return; }
  state.inv.food -= 5;
  state.energy = Math.min(getMaxEnergy(state), state.energy + 10);
  pushLog(state, `Ate 5 food (+10<img class="ui-icon" src="${ICONS.energy}" alt="⚡">)`, 'gain');
  renderBody(); scheduleSave();
}
function healWithFood(){
  if(state.inv.food < 5){ pushLog(state, 'Not enough food!', 'lose'); return; }
  const maxH = getMaxHealth(state);
  if(state.health >= maxH){ pushLog(state, 'Health is full!', 'lose'); return; }
  state.inv.food -= 5;
  state.health = Math.min(maxH, state.health + 20);
  pushLog(state, `Healed with food (+20<img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️">)`, 'gain');
  renderBody(); scheduleSave();
}
function consumeBread(key){
  if((state.inv[key]||0) < 1) return;
  const b = BREAD_TIERS[key];
  state.inv[key] -= 1;
  const maxH = getMaxHealth(state);
  state.health = Math.min(maxH, state.health + b.heal);
  pushLog(state, `Ate ${b.name} (+${b.heal} HP)`, 'gain');
  renderBody(); scheduleSave();
}
function consumeEnergyPotion(key){
  if((state.inv[key]||0) < 1) return;
  const p = ENERGY_POTION_TIERS[key] || (key==='energy_potion'?{energy:20}:null);
  if(!p) return;
  state.inv[key] -= 1;
  state.energy = Math.min(getMaxEnergy(state), state.energy + p.energy);
  pushLog(state, `Drank ${p.name} (+${p.energy}<img class="ui-icon" src="${ICONS.energy}" alt="⚡">)`, 'gain');
  renderBody(); scheduleSave();
}

/* ===== MARKET ===== */
function buy(key, amount){
  const price = state.prices[key];
  const cap = getStorageCap(state);
  if(amount === 'max') amount = Math.floor(state.gold / Math.ceil(price));
  amount = Math.min(amount, cap - state.inv[key]);
  if(amount <= 0) return;
  const cost = Math.ceil(price * amount);
  if(cost > state.gold){ pushLog(state, 'Not enough gold!', 'lose'); return; }
  state.gold -= cost;
  state.inv[key] += amount;
  pushLog(state, `Bought ${amount} ${MARKET_CATALOG[key].name} for ${cost}g`, 'gain');
  renderBody(); scheduleSave();
}
function sell(key, amount){
  if(amount === 'max') amount = state.inv[key];
  amount = Math.min(amount, state.inv[key]);
  if(amount <= 0) return;
  const price = state.prices[key] * getSellMult(state);
  const gold = Math.floor(price * amount);
  state.gold += gold;
  state.totalGoldEarned += gold;
  state.inv[key] -= amount;
  trackMission(state, 'sold', amount);
  pushLog(state, `Sold ${amount} ${MARKET_CATALOG[key].name} for ${gold}g`, 'sell');
  renderBody(); scheduleSave();
}

/* ===== CRAFTING ===== */
function craft(key){
  const r = RECIPES[key];
  if(state.level < r.minLevel) return;
  const cost = getEnergyCost(state, r.energyCost);
  if(state.energy < cost){ pushLog(state, 'Not enough energy!', 'lose'); return; }
  const cap = getStorageCap(state);
  if(state.inv[key] + r.output > cap){ pushLog(state, 'Storage full!', 'lose'); return; }
  for(const inp in r.inputs){ if(state.inv[inp] < r.inputs[inp]){ pushLog(state, `Missing ${ITEMS[inp].name}!`, 'lose'); return; } }
  for(const inp in r.inputs){ state.inv[inp] -= r.inputs[inp]; }
  state.inv[key] += r.output;
  state.energy -= cost;
  const leveled = grantXp(state, r.xp);
  trackMission(state, 'crafted', 1);
  pushLog(state, `Crafted ${r.output} ${ITEMS[key].name} (+${r.xp}XP)`, 'gain');
  if(leveled){ pushLog(state, `Level up! You are now level ${state.level}`, 'levelup'); showToast('Level Up!', `Level ${state.level}`, 'levelup'); }
  renderBody(); scheduleSave();
}
function craftMax(key){
  const r = RECIPES[key];
  if(state.level < r.minLevel) return;
  const cost = getEnergyCost(state, r.energyCost);
  const cap = getStorageCap(state);
  let count = 0;
  while(state.energy >= cost){
    if(state.inv[key] + r.output > cap) break;
    let can = true;
    for(const inp in r.inputs){ if(state.inv[inp] < r.inputs[inp]){ can=false; break; } }
    if(!can) break;
    for(const inp in r.inputs){ state.inv[inp] -= r.inputs[inp]; }
    state.inv[key] += r.output;
    state.energy -= cost;
    count++;
  }
  if(count > 0){
    const xp = count * r.xp;
    const leveled = grantXp(state, xp);
    trackMission(state, 'crafted', count);
    pushLog(state, `Crafted ${count*r.output} ${ITEMS[key].name} (+${xp}XP)`, 'gain');
    if(leveled){ pushLog(state, `Level up! You are now level ${state.level}`, 'levelup'); showToast('Level Up!', `Level ${state.level}`, 'levelup'); }
    renderBody(); scheduleSave();
  }
}

/* ===== FORGE & GEAR ===== */

// ─── Class System ───
function selectClass(key){
  const cls = CLASS_DATA[key];
  state.playerClass = key;
  state.classSkills = {};
  state.classSkillPoints = 0;
  state.classResets = 0;
  state.lastClassReset = 0;
  // Give starter gear
  Object.values(cls.starterGear).forEach(g=>{
    if(state.gearBag.length < GEAR_BAG_LIMIT){
      const gear = { ...g, id: Date.now()+Math.random(), upgradeLevel: 0 };
      const t = GEAR_TIERS[gear.tier];
      gear.sellValue = t.sellMin + Math.floor(Math.random()*(t.sellMax-t.sellMin));
      state.gearBag.push(gear);
    }
  });
  pushLog(state, `Became a ${cls.nameAr}!`, 'prestige');
  showToast('Class Selected', cls.nameAr, 'prestige');
  renderBody(); scheduleSave();
}
function upgradeClassSkill(key){
  const lvl = state.classSkills[key] || 0;
  if(lvl >= CLASS_SKILL_MAX) return;
  const cost = CLASS_SKILL_COST_TABLE[lvl];
  if(state.classSkillPoints < cost){ pushLog(state, 'Not enough class skill points!', 'lose'); return; }
  state.classSkillPoints -= cost;
  state.classSkills[key] = lvl + 1;
  pushLog(state, `Upgraded class skill to level ${lvl+1}`, 'skill');
  renderBody(); scheduleSave();
}
function canResetClass(){ return Date.now() - state.lastClassReset >= 7*24*60*60*1000; }
function getClassResetCost(){ return 500 * (1 + state.classResets); }
function resetClass(newClass){
  if(!canResetClass()){ pushLog(state, 'Class reset on cooldown!', 'lose'); return; }
  const cost = getClassResetCost();
  if(state.gold < cost){ pushLog(state, 'Not enough gold!', 'lose'); return; }
  state.gold -= cost;
  state.classResets++;
  state.lastClassReset = Date.now();
  // Refund points
  let refunded = 0;
  Object.values(state.classSkills).forEach(lvl=>{ for(let i=0;i<lvl;i++) refunded += CLASS_SKILL_COST_TABLE[i]; });
  state.classSkillPoints += refunded;
  state.classSkills = {};
  state.playerClass = newClass;
  const cls = CLASS_DATA[newClass];
  pushLog(state, `Reset to ${cls.nameAr}!`, 'prestige');
  showToast('Class Reset', cls.nameAr, 'prestige');
  renderBody(); scheduleSave();
}

/* ===== SKILLS ===== */
function upgradeSkill(key){
  const sk = SKILLS[key];
  const lvl = state.skills[key];
  if(lvl >= sk.max) return;
  const cost = lvl + 1;
  if(state.skillPoints < cost){ pushLog(state, 'Not enough skill points!', 'lose'); return; }
  state.skillPoints -= cost;
  state.skills[key] = lvl + 1;
  if(key==='health'){ state.health += SKILLS.health.perLevel; }
  if(key==='stamina'){ state.maxEnergy += SKILLS.stamina.perLevel; state.energy += SKILLS.stamina.perLevel; }
  if(key==='storage'){ state.storageCap += SKILLS.storage.perLevel; }
  pushLog(state, `Upgraded ${sk.name} to level ${lvl+1}`, 'skill');
  renderBody(); scheduleSave();
}

/* ===== PRESTIGE ===== */
function canPrestige(s){ return s.level >= PRESTIGE_LEVEL_REQ; }
function doPrestige(){
  if(!canPrestige(state)) return;
  const pts = Math.floor(state.level/5) + Math.floor(state.totalGoldEarned/5000);
  const keepGear = [...state.gearBag];
  const keepEquipped = { ...state.equipped };
  const keepShards = state.shards;
  const keepGems = state.gems;
  const keepClass = state.playerClass;
  const keepClassSkills = { ...state.classSkills };
  const keepClassPoints = state.classSkillPoints;
  const keepClassResets = state.classResets;
  const keepPrestige = { ...state.prestige };
  keepPrestige.points += pts;
  keepPrestige.gatherBonus += 1;
  keepPrestige.sellBonus += 0.02;
  keepPrestige.energyBonus += 5;
  keepPrestige.storageBonus += 50;
  state = defaultState();
  state.prestige = keepPrestige;
  state.gearBag = keepGear;
  state.equipped = keepEquipped;
  state.shards = keepShards;
  state.gems = keepGems;
  state.playerClass = keepClass;
  state.classSkills = keepClassSkills;
  state.classSkillPoints = keepClassPoints;
  state.classResets = keepClassResets;
  pushLog(state, `Prestiged! Gained ${pts} prestige points.`, 'prestige');
  showToast('Prestige!', `+${pts} Points`, 'prestige');
  render(); scheduleSave();
}
function hardReset(){
  if(!confirm('ERASE ALL PROGRESS? This cannot be undone!')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  render(); scheduleSave();
}

/* ===== COMPANIES ===== */

// ─── Company Actions ───
function openBuildSelector(){ state.companyBuildResource = COMPANY_RESOURCES[0]; renderBody(); }
function buildCompany(){
  const res = state.companyBuildResource || COMPANY_RESOURCES[0];
  const currentCount = state.companies.length;
  const maxAllowed = getMaxAllowedCompanies(state.level);
  if(currentCount >= MAX_COMPANIES || currentCount >= maxAllowed){ pushLog(state, 'Cannot build more companies!', 'lose'); return; }
  if(currentCount > 0){
    const concreteCost = getConcreteCost(currentCount + 1);
    if(state.inv.concrete < concreteCost){ pushLog(state, 'Not enough concrete!', 'lose'); return; }
    state.inv.concrete -= concreteCost;
  }
  const id = state.companies.length > 0 ? Math.max(...state.companies.map(c=>c.id)) + 1 : 1;
  state.companies.push({ id, resource: res, engineLevel: 1, stored: 0, disabled: false });
  state.companyBuildResource = null;
  pushLog(state, `Built ${ITEMS[res].name} Company!`, 'win');
  renderBody(); scheduleSave();
}
function selectBuildResource(res){ state.companyBuildResource = res; renderBody(); }
function cancelBuild(){ state.companyBuildResource = null; renderBody(); }
function closeCompanyMenu(){
  state.companyMenuOpen = null;
  renderBody();
}
function toggleCompanyMenu(id){
  state.companyMenuOpen = state.companyMenuOpen === id ? null : id;
  renderBody();
}
function startChangeResource(id){ state.companyChangeResourceId = id; renderBody(); }
function selectChangeResource(id, res){
  if(state.gold < 500){ pushLog(state, 'Need 500g to change production!', 'lose'); return; }
  const c = state.companies.find(x=>x.id===id);
  if(!c || c.resource === res) return;
  state.gold -= 500;
  c.resource = res;
  c.stored = 0;
  state.companyChangeResourceId = null;
  pushLog(state, `Changed production to ${ITEMS[res].name}`, 'gain');
  renderBody(); scheduleSave();
}
function cancelChangeResource(){ state.companyChangeResourceId = null; renderBody(); }
function collectFromCompany(id){
  const c = state.companies.find(x=>x.id===id);
  if(!c || c.stored < 1 || c.disabled) return;
  const cap = getStorageCap(state);
  const space = cap - state.inv[c.resource];
  if(space <= 0){ pushLog(state, 'Storage full!', 'lose'); return; }
  const amount = Math.min(Math.floor(c.stored), space);
  state.inv[c.resource] += amount;
  c.stored -= amount;
  pushLog(state, `Collected ${amount} ${ITEMS[c.resource].name} from company`, 'gain');
  renderBody(); scheduleSave();
}
function upgradeEngine(id){
  const c = state.companies.find(x=>x.id===id);
  if(!c || c.engineLevel >= 10) return;
  const cost = ENGINE_UPGRADE_COST[c.engineLevel + 1];
  if(state.inv.steel < cost){ pushLog(state, 'Not enough steel!', 'lose'); return; }
  state.inv.steel -= cost;
  c.engineLevel++;
  pushLog(state, `Upgraded engine to level ${c.engineLevel}!`, 'win');
  renderBody(); scheduleSave();
}
function moveCompanyToTop(id){
  const idx = state.companies.findIndex(c=>c.id===id);
  if(idx > 0){
    const c = state.companies.splice(idx, 1)[0];
    state.companies.unshift(c);
    renderBody(); scheduleSave();
  }
}
function disableCompany(id){
  const c = state.companies.find(x=>x.id===id);
  if(c) c.disabled = !c.disabled;
  renderBody(); scheduleSave();
}
/* ═══════════════════════════════════════════════════════════════
   ZONE EXPLORER — Integrated into Arcadia MMO
   ═══════════════════════════════════════════════════════════════ */
function enterZoneView(id){
  state.zoneView = id;
  renderBody();
}
function goBackFromZone(){
  state.zoneView = null;
  renderBody();
}
