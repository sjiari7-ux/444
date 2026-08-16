// ─── Security: HTML escaping for any user-supplied text rendered via
// innerHTML (usernames, chat messages, bios, etc). Escapes all five
// HTML-significant characters — not just '<' — because text can land
// either as element content OR inside a quoted HTML attribute value
// (e.g. onclick="fn('${name}')"), and only escaping '<' leaves the
// attribute-breakout path (via ' or ") wide open. ───
function escapeHtml(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(m){
    switch(m){
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
    }
  });
}

// ─── Market: supply & demand (AMM-style virtual reserves) ───
// Every resource gets a virtual { supply, gold } pool. Price = gold/supply.
// Buying removes units from supply (price rises along the curve); selling
// adds units back (price falls). GOLD_DEPTH is the same "weight" of virtual
// gold behind every item, so higher-priced (normally scarcer/lower-volume)
// items get a smaller virtual unit-depth and are naturally more sensitive
// to each trade, while cheap bulk items (wood, stone...) need bigger volume
// to move.
const MARKET_GOLD_DEPTH = 3000;
function makeMarketReserve(basePrice){
    const supply = Math.max(20, MARKET_GOLD_DEPTH / basePrice);
    return { supply, gold: supply * basePrice };
}

// ─── State & Save System ───
function defaultState(){
    const inv = {}; Object.keys(MARKET_CATALOG).forEach(k=> inv[k]=0);
    const prices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prices[k]=MARKET_CATALOG[k].basePrice);
    const prevPrices = {}; Object.keys(MARKET_CATALOG).forEach(k=> prevPrices[k]=MARKET_CATALOG[k].basePrice);
    const priceHistory = {}; Object.keys(MARKET_CATALOG).forEach(k=> priceHistory[k]=[MARKET_CATALOG[k].basePrice]);
    const marketReserves = {}; Object.keys(MARKET_CATALOG).forEach(k=> marketReserves[k]=makeMarketReserve(MARKET_CATALOG[k].basePrice));
    return {
        version: 9,
        zoneView: null,
        level: 1, xp: 0, xpToNext: xpForLevel(1), gold: 150,
        energy: 100, maxEnergy: 100, lastEnergyTs: Date.now(),
        storageCap: 500,
        inv, prices, prevPrices, priceHistory, marketReserves, lastPriceTs: Date.now(),
        combat: { wins: 0, losses: 0 },
        missions: null,
        log: [], lastTimestamp: Date.now(),
        prestige: { points: 0, gatherBonus: 0, sellBonus: 0, energyBonus: 0, storageBonus: 0 },
        totalGoldEarned: 150,
        totalAllianceDonated: 0,
        skills: { health: 0, damage: 0, defense: 0, stamina: 0, storage: 0, profit: 0 },
        skillPoints: 0,
        health: 100,
        lastHealthRegenTs: Date.now(),
        mana: 20,
        maxMana: 20,
        lastManaRegenTs: Date.now(),
        equipped: { weapon: null, armor: null, helmet: null, boots: null, accessory: null, gloves: null },
        gearBag: [],
        shards: 0,
        gems: 0,
        companies: [],
        companyBuildResource: null,
        companyMenuOpen: null,
        companyChangeResourceId: null,
        // Class system
        playerClass: null,
        classSkills: {},
        classSkillPoints: 0,
        classResets: 0,
        lastClassReset: 0,
        // Potions
        potions: { health: 0, energy: 0 },
        // Advanced Market
        marketTab: 'all', marketSearch: '', marketLevelFilter: 0,
        watchedItems: [], marketNotifications: [],
        // Notifications (bell icon in header)
        notifications: [],
        // Battle state
        battleLog: [],
        battleActive: false,
        battleResult: null,
        // ===== SETTINGS (NEW) =====
        language: 'en',        // 'ar' or 'en'
        avatar: '🧙',          // Default avatar emoji
        bio: '',               // User bio
        username: 'Player',    // Display name
        // ===== THEME SETTINGS (NEW) =====
theme: 'dark',         // 'dark' or 'light'
fontSize: 'medium',    // 'small', 'medium', 'large'
accentColor: '#d4a24c', // Hex color code
        // ===== ALLIANCE SYSTEM (NEW) =====
        allianceId: null,
        allianceRole: null,
        allianceJoinCooldownUntil: 0,
        allianceDisbandCooldownUntil: 0,
    };
}

function migrateState(s){
    if(!s.version) s.version = 1;
    if(s.version < 9) s.version = 9;
    
    // Use the full MARKET_CATALOG (items + weapons) so weapon keys are never left
    // undefined — undefined inv/price values used to crash the Market screen.
    if(!s.marketReserves) s.marketReserves = {};
    Object.keys(MARKET_CATALOG).forEach(k=>{
        if(typeof s.inv[k] !== 'number') s.inv[k] = 0;
        if(typeof s.prices[k] !== 'number') s.prices[k] = MARKET_CATALOG[k].basePrice;
        if(!s.prevPrices) s.prevPrices = {};
        if(typeof s.prevPrices[k] !== 'number') s.prevPrices[k] = MARKET_CATALOG[k].basePrice;
        if(!s.priceHistory) s.priceHistory = {};
        if(!s.priceHistory[k]) s.priceHistory[k] = [MARKET_CATALOG[k].basePrice];
        // Seed the reserve from whatever price this save already has, so migrating
        // an existing game doesn't suddenly snap every price back to basePrice.
        if(!s.marketReserves[k]) s.marketReserves[k] = makeMarketReserve(s.prices[k]);
    });
    
    if(!s.log) s.log = [];
    if(!s.combat) s.combat = { wins: 0, losses: 0 };
    if(!s.prestige) s.prestige = { points: 0, gatherBonus: 0, sellBonus: 0, energyBonus: 0, storageBonus: 0 };
    if(typeof s.totalGoldEarned !== 'number') s.totalGoldEarned = s.gold;
    if(typeof s.totalAllianceDonated !== 'number') s.totalAllianceDonated = 0;
    if(!s.skills) s.skills = { health: 0, damage: 0, defense: 0, stamina: 0, storage: 0, profit: 0 };
    if(typeof s.skillPoints !== 'number') s.skillPoints = 0;
    if(typeof s.health !== 'number') s.health = 100;
    if(!s.lastHealthRegenTs) s.lastHealthRegenTs = Date.now();
    if(typeof s.mana !== 'number') s.mana = 20;
    if(typeof s.maxMana !== 'number') s.maxMana = 20;
    if(!s.lastManaRegenTs) s.lastManaRegenTs = Date.now();
    if(!s.equipped) s.equipped = { weapon: null, armor: null, helmet: null, boots: null, accessory: null, gloves: null };
    if(!s.gearBag) s.gearBag = [];
    if(typeof s.shards !== 'number') s.shards = 0;
    if(typeof s.gems !== 'number') s.gems = 0;
    
    // ===== THEME MIGRATION =====
if (typeof s.theme !== 'string') s.theme = 'dark';
if (typeof s.fontSize !== 'string') s.fontSize = 'medium';
if (typeof s.accentColor !== 'string') s.accentColor = '#d4a24c';

    // ===== ALLIANCE MIGRATION =====
    if (typeof s.allianceId === 'undefined') s.allianceId = null;
    if (typeof s.allianceRole === 'undefined') s.allianceRole = null;
    if (typeof s.allianceJoinCooldownUntil !== 'number') s.allianceJoinCooldownUntil = 0;
    if (typeof s.allianceDisbandCooldownUntil !== 'number') s.allianceDisbandCooldownUntil = 0;
    
    // Resources migration
    if(typeof s.inv['magic_stones'] !== 'number') s.inv['magic_stones'] = 0;
    if(typeof s.prices['magic_stones'] !== 'number') s.prices['magic_stones'] = 25;
    if(typeof s.prevPrices['magic_stones'] !== 'number') s.prevPrices['magic_stones'] = 25;
    if(typeof s.inv['concrete'] !== 'number') s.inv['concrete'] = 0;
    if(typeof s.prices['concrete'] !== 'number') s.prices['concrete'] = 15;
    if(typeof s.prevPrices['concrete'] !== 'number') s.prevPrices['concrete'] = 15;
    if(typeof s.inv['herbs'] !== 'number') s.inv['herbs'] = 0;
    if(typeof s.prices['herbs'] !== 'number') s.prices['herbs'] = 4;
    if(typeof s.prevPrices['herbs'] !== 'number') s.prevPrices['herbs'] = 4;
    if(typeof s.inv['honey'] !== 'number') s.inv['honey'] = 0;
    if(typeof s.prices['honey'] !== 'number') s.prices['honey'] = 8;
    if(typeof s.prevPrices['honey'] !== 'number') s.prevPrices['honey'] = 8;
    
    // New consumables
    ['toasted_bread','honey_bread','legendary_bread','small_energy_potion','medium_energy_potion','large_energy_potion','legendary_energy_potion'].forEach(k=>{
        if(typeof s.inv[k] !== 'number') s.inv[k] = 0;
        if(typeof s.prices[k] !== 'number') s.prices[k] = (GOODS[k] || ITEMS[k]).basePrice;
        if(typeof s.prevPrices[k] !== 'number') s.prevPrices[k] = (GOODS[k] || ITEMS[k]).basePrice;
        if(!s.priceHistory[k]) s.priceHistory[k] = [(GOODS[k] || ITEMS[k]).basePrice];
    });

    // Companies migration
    if(!s.companies) s.companies = [];
    if(typeof s.companyBuildResource !== 'string' && s.companyBuildResource !== null) s.companyBuildResource = null;
    if(typeof s.companyMenuOpen !== 'number' && s.companyMenuOpen !== null) s.companyMenuOpen = null;
    if(typeof s.companyChangeResourceId !== 'number' && s.companyChangeResourceId !== null) s.companyChangeResourceId = null;

    // Class system migration
    if(!s.playerClass) s.playerClass = null;
    if(!s.classSkills) s.classSkills = {};
    if(typeof s.classSkillPoints !== 'number') s.classSkillPoints = 0;
    if(typeof s.classResets !== 'number') s.classResets = 0;
    if(typeof s.lastClassReset !== 'number') s.lastClassReset = 0;
    if(!s.potions) s.potions = { health: 0, energy: 0 };
    if(!s.battleLog) s.battleLog = [];
    if(typeof s.battleActive !== 'boolean') s.battleActive = false;
    if(!s.battleResult) s.battleResult = null;

    // Advanced Market fields
    if(!s.marketTab) s.marketTab = 'all';
    if(typeof s.marketSearch !== 'string') s.marketSearch = '';
    if(typeof s.marketLevelFilter !== 'number') s.marketLevelFilter = 0;
    if(!s.watchedItems) s.watchedItems = [];
    if(!s.marketNotifications) s.marketNotifications = [];
    if(!s.notifications) s.notifications = [];

    // Migrate old gear (v4/v5) to v6 tier system
    function migrateGear(g){
        if(!g) return null;
        if(typeof g.tier === 'number') return g;
        const tier = g.rarity === 'legendary' ? 4 : 0;
        return { ...g, tier, upgradeLevel: 0 };
    }
    s.equipped = Object.fromEntries(Object.entries(s.equipped).map(([k,v])=>[k,migrateGear(v)]));
    s.gearBag = s.gearBag.map(migrateGear).filter(Boolean);

    // ===== SETTINGS MIGRATION (NEW) =====
    if(typeof s.language !== 'string') s.language = 'en';
    if(typeof s.avatar !== 'string') s.avatar = '🧙';
    if(typeof s.bio !== 'string') s.bio = '';
    if(typeof s.username !== 'string') s.username = 'Player';

    // ===== MISSIONS SYSTEM MIGRATION =====
    if(!s.missions) {
        s.missions = {
            daily: { progress: {}, claimed: [], lastReset: 0, completed: 0 },
            weekly: { progress: {}, claimed: [], lastReset: 0, completed: 0 },
            starting: { progress: {}, claimed: [], completed: 0 }
        };
    }
    if(!s.activeMissionTab) s.activeMissionTab = 'daily';

    ['daily','weekly','starting'].forEach(type => {
        if(!s.missions[type]) s.missions[type] = { progress: {}, claimed: [], completed: 0 };
        if(!s.missions[type].progress) s.missions[type].progress = {};
        if(!s.missions[type].claimed) s.missions[type].claimed = [];
        if(typeof s.missions[type].completed !== 'number') s.missions[type].completed = 0;
        if(type !== 'starting' && (!s.missions[type].lastReset || s.missions[type].lastReset === 0)) {
            const d = new Date();
            if(type === 'daily'){
                d.setUTCHours(24,0,0,0);
                s.missions[type].lastReset = d.getTime();
            } else {
                const day = d.getUTCDay();
                const daysUntilMon = day === 1 ? 7 : (8 - day) % 7;
                d.setUTCDate(d.getUTCDate() + daysUntilMon);
                d.setUTCHours(0,0,0,0);
                s.missions[type].lastReset = d.getTime();
            }
        }
    });

        return s;
}

function xpForLevel(level){ return Math.round(35 * Math.pow(level, 1.4)); }

function pushLog(s, text, cls){ 
    s.log.push({ t: Date.now(), text, cls: cls || '' }); 
    if(s.log.length > 100) s.log.shift(); 
}

function grantXp(s, amount){
    const oldLevel = s.level;
    s.xp += amount;
    let leveled = false;
    while(s.xp >= s.xpToNext){
        s.xp -= s.xpToNext; 
        s.level += 1; 
        s.xpToNext = xpForLevel(s.level);
        s.maxEnergy += 5; 
        s.storageCap += 100;
        s.skillPoints += 1;
        // Class skill point every 5 levels
        if(s.level % 5 === 0){
            s.classSkillPoints += 1;
        }
        leveled = true;
    }
    if(leveled && typeof updateMissionProgress === 'function'){
        updateMissionProgress('level_reached', s.level);
    }
    return leveled;
}

/* ===== DERIVED STATS ===== */
function getClassMult(s, stat){
    if(!s.playerClass || !CLASS_DATA[s.playerClass]) return 1;
    return CLASS_DATA[s.playerClass].stats[stat] || 1;
}

function getClassSkillLevel(s, skillKey){
    return s.classSkills[skillKey] || 0;
}

function getMaxHealth(s){
    const base = 100 + s.skills.health * SKILLS.health.perLevel + getGearBonus(s, 'health');
    const classMult = getClassMult(s, 'hp');
    let bonus = 0;
    if(s.playerClass === 'support'){
        bonus = getClassSkillLevel(s, 'lifeForce') * 8;
    }
    return Math.round(base * classMult + bonus);
}

function getMaxEnergy(s){
    let base = s.maxEnergy + s.prestige.energyBonus + s.skills.stamina * SKILLS.stamina.perLevel + getGearBonus(s, 'stamina');
    if(s.playerClass === 'mage'){
        base += getClassSkillLevel(s, 'manaForce') * 5;
    }
    return base;
}

function getStorageCap(s){ 
    return s.storageCap + s.prestige.storageBonus + s.skills.storage * SKILLS.storage.perLevel + getGearBonus(s, 'storage'); 
}

// Total backpack usage: every resource unit counts as 1 slot, and every
// gear item sitting in the gear bag also counts as 1 slot against the
// same shared cap (gear is stored in the same backpack as resources).
function getTotalStorageUsed(s){
    let used = 0;
    for(const k in s.inv){ used += s.inv[k] || 0; }
    used += (s.gearBag ? s.gearBag.length : 0);
    return used;
}

function getEnergyCost(s, base){
    let reduction = Math.min(0.5, s.skills.stamina * 0.03);
    if(s.playerClass === 'mage'){
        reduction += getClassSkillLevel(s, 'manaForce') * 0.02;
    }
    if(s.playerClass === 'archer'){
        reduction += getClassSkillLevel(s, 'efficientAim') * 0.02;
    }
    return Math.max(1, Math.ceil(base * (1 - Math.min(0.6, reduction))));
}

function playerPower(s){
    let base = s.level * 5 + s.combat.wins * 0.5 + s.prestige.points * 2 + s.skills.damage * SKILLS.damage.perLevel + getGearBonus(s, 'damage');
    const classMult = getClassMult(s, 'atk');
    base = base * classMult;
    if(s.playerClass === 'warrior'){
        base *= (1 + getClassSkillLevel(s, 'powerStrike') * 0.05);
    }
    if(s.playerClass === 'mage'){
        base *= (1 + getClassSkillLevel(s, 'arcanePower') * 0.06);
    }
    return Math.round(base);
}

function getSellMult(s){
    let mult = 0.92 * (1 + s.skills.profit * SKILLS.profit.perLevel + getGearBonus(s, 'profit')) * (1 + s.prestige.sellBonus);
    if(s.playerClass === 'merchant'){
        mult *= (1 + getClassSkillLevel(s, 'profitableDeal') * 0.03);
    }
    return mult;
}

function getDamageReduction(s){
    let dr = Math.min(0.75, s.skills.defense * SKILLS.defense.perLevel + getGearBonus(s, 'defense'));
    if(s.playerClass === 'warrior'){
        dr += getClassSkillLevel(s, 'ironArmor') * 0.02;
    }
    if(s.playerClass === 'support'){
        dr += getClassSkillLevel(s, 'protectiveAura') * 0.03;
    }
    if(s.playerClass === 'mage'){
        dr += getClassSkillLevel(s, 'magicShield') * 0.04;
    }
    return Math.min(0.85, dr);
}

function getDodgeChance(s){
    if(!s.playerClass) return 0;
    const base = Math.max(0, (getClassMult(s, 'dodge') - 1) * 0.10);
    let bonus = 0;
    if(s.playerClass === 'archer'){
        bonus += getClassSkillLevel(s, 'swiftness') * 0.02;
    }
    return Math.min(0.35, base + bonus);
}

function getCritChance(s){
    if(!s.playerClass) return 0.10;
    const base = (getClassMult(s, 'crit') - 1) * 0.10 + 0.10;
    let bonus = 0;
    if(s.playerClass === 'archer'){
        bonus += getClassSkillLevel(s, 'keenEye') * 0.04;
    }
    if(s.playerClass === 'warrior'){
        bonus += getClassSkillLevel(s, 'powerStrike') * 0.02;
    }
    return Math.min(0.60, base + bonus);
}

function getPierceChance(s){
    let pierce = 0;
    if(s.playerClass === 'archer'){
        pierce += getClassSkillLevel(s, 'keenEye') * 0.02;
    }
    if(s.playerClass === 'mage'){
        pierce += getClassSkillLevel(s, 'arcanePower') * 0.03;
    }
    return Math.min(0.30, pierce);
}

/* ===== PLAYER COMBAT STATS ===== */
function getPlayerCombatStats(){
    return {
        hp: getMaxHealth(state),
        atk: playerPower(state),
        def: getDamageReduction(state),
        spd: Math.round(40 + state.level * 0.4 + getGearBonus(state, 'stamina') * 0.1),
        crit: getCritChance(state),
        dodge: getDodgeChance(state),
        pierce: getPierceChance(state),
    };
}

/* ===== ADVENTURE ZONES & MONSTERS ===== */
const ZONES = [
    { id:'plains',   name:'Plains',   nameAr:'Plains',     icon:'🏞️', levelMin:1,  levelMax:10, energyCost:10, color:'#6fa285' },
    { id:'forest',   name:'Forest',   nameAr:'Forest',    icon:'🌳', levelMin:10, levelMax:25, energyCost:12, color:'#4a8c5c' },
    { id:'mountain', name:'Mountain', nameAr:'Mountain',     icon:'🏔️', levelMin:25, levelMax:40, energyCost:14, color:'#7a8a9a' },
    { id:'cave',     name:'Cave',     nameAr:'Cave',     icon:'🕯️', levelMin:40, levelMax:55, energyCost:16, color:'#8a7ab4' },
    { id:'swamp',    name:'Swamp',    nameAr:'Swamp',  icon:'🌿', levelMin:55, levelMax:70, energyCost:18, color:'#5a8a6a' },
    { id:'dark',     name:'Dark Zone',nameAr:'Dark Zone', icon:'🌑', levelMin:70, levelMax:999, energyCost:20, color:'#d44c4c' },
];

const ZONE_MONSTERS = {
    plains: [
        { name:'Wild Rabbit', nameAr:'Wild Rabbit', icon:'🐰', level:1,  hp:20,  atkMin:3,  atkMax:5,  def:1,  spd:25, crit:0.02, dodge:0.15, xp:5,   goldMin:2,  goldMax:4,  loot:[{item:'food',min:1,max:2}] },
        { name:'Wolf',        nameAr:'Wolf',       icon:'🐺', level:5,  hp:40,  atkMin:8,  atkMax:12, def:3,  spd:35, crit:0.05, dodge:0.10, xp:15,  goldMin:5,  goldMax:10, loot:[{item:'food',min:1,max:3},{item:'leather',min:0,max:1}] },
        { name:'Small Ghoul', nameAr:'Small Ghoul', icon:'👹', level:8,  hp:60,  atkMin:10, atkMax:15, def:5,  spd:20, crit:0.03, dodge:0.05, xp:25,  goldMin:8,  goldMax:15, loot:[{item:'wood',min:2,max:4},{item:'leather',min:0,max:1}] },
    ],
    forest: [
        { name:'Snake',       nameAr:'Snake',     icon:'🐍', level:12, hp:80,  atkMin:15, atkMax:20, def:8,  spd:40, crit:0.08, dodge:0.20, xp:35,  goldMin:12, goldMax:20, loot:[{item:'food',min:0,max:2},{item:'leather',min:1,max:2}] },
        { name:'Bear',        nameAr:'Bear',        icon:'🐻', level:18, hp:150, atkMin:20, atkMax:30, def:15, spd:25, crit:0.05, dodge:0.05, xp:60,  goldMin:25, goldMax:40, loot:[{item:'wood',min:3,max:6},{item:'leather',min:1,max:3}] },
        { name:'Imp',         nameAr:'Imp',     icon:'👿', level:22, hp:120, atkMin:25, atkMax:35, def:10, spd:45, crit:0.12, dodge:0.15, xp:75,  goldMin:30, goldMax:50, loot:[{item:'wood',min:2,max:4},{item:'food',min:1,max:3}] },
    ],
    mountain: [
        { name:'Eagle',       nameAr:'Eagle',       icon:'🦅', level:28, hp:160, atkMin:30, atkMax:40, def:12, spd:55, crit:0.10, dodge:0.25, xp:90,  goldMin:35, goldMax:55, loot:[{item:'stone',min:2,max:5},{item:'coal',min:0,max:2}] },
        { name:'Wild Climber',nameAr:'Wild Climber',icon:'🧗',level:32, hp:200, atkMin:35, atkMax:50, def:20, spd:30, crit:0.06, dodge:0.10, xp:120, goldMin:50, goldMax:80, loot:[{item:'iron',min:2,max:5},{item:'stone',min:3,max:6}] },
        { name:'Stone Giant', nameAr:'Stone Giant',icon:'🗿',level:38, hp:350, atkMin:40, atkMax:60, def:35, spd:15, crit:0.04, dodge:0.03, xp:180, goldMin:70, goldMax:110,loot:[{item:'stone',min:5,max:10},{item:'coal',min:2,max:5},{item:'iron',min:0,max:3}] },
    ],
    cave: [
        { name:'Giant Bat',   nameAr:'Giant Bat',icon:'🦇',level:42, hp:200, atkMin:40, atkMax:55, def:18, spd:50, crit:0.10, dodge:0.20, xp:140, goldMin:55, goldMax:90, loot:[{item:'gemstones',min:1,max:3},{item:'gold',min:0,max:2}] },
        { name:'Dark Ghoul',  nameAr:'Dark Ghoul', icon:'💀', level:48, hp:300, atkMin:50, atkMax:70, def:25, spd:35, crit:0.08, dodge:0.10, xp:200, goldMin:80, goldMax:130,loot:[{item:'gemstones',min:2,max:5},{item:'gold',min:1,max:3}] },
        { name:'Young Dragon',nameAr:'Young Dragon',icon:'🐉',level:52, hp:450, atkMin:60, atkMax:90, def:30, spd:40, crit:0.15, dodge:0.12, xp:280, goldMin:120,goldMax:180,loot:[{item:'gold',min:3,max:6},{item:'gemstones',min:2,max:4},{item:'magic_stones',min:0,max:2}] },
    ],
    swamp: [
        { name:'Swamp Dragon',nameAr:'Swamp Dragon',icon:'🐲',level:58, hp:500, atkMin:70, atkMax:100,def:35, spd:35, crit:0.12, dodge:0.10, xp:350, goldMin:150,goldMax:220,loot:[{item:'magic_stones',min:1,max:3},{item:'gemstones',min:2,max:5}] },
        { name:'Dark Sorcerer',nameAr:'Dark Sorcerer',icon:'🧙‍♂️',level:65, hp:350, atkMin:80, atkMax:110,def:25, spd:60, crit:0.18, dodge:0.20, xp:420, goldMin:180,goldMax:260,loot:[{item:'magic_stones',min:2,max:5},{item:'gold',min:3,max:6}] },
    ],
    dark: [
        { name:'Demon',       nameAr:'Demon',     icon:'😈', level:72, hp:600, atkMin:90, atkMax:120,def:40, spd:45, crit:0.15, dodge:0.15, xp:500, goldMin:220,goldMax:320,loot:[{item:'magic_stones',min:2,max:5},{item:'gemstones',min:3,max:6},{item:'gold',min:4,max:8}] },
        { name:'Ancient Dragon',nameAr:'Ancient Dragon',icon:'🐉',level:78, hp:800, atkMin:100,atkMax:140,def:50, spd:40, crit:0.20, dodge:0.12, xp:650, goldMin:300,goldMax:420,loot:[{item:'magic_stones',min:3,max:7},{item:'gemstones',min:4,max:8},{item:'gold',min:5,max:10}] },
        { name:'Lich',        nameAr:'Lich',       icon:'💀', level:85, hp:700, atkMin:110,atkMax:150,def:35, spd:55, crit:0.25, dodge:0.18, xp:750, goldMin:350,goldMax:500,loot:[{item:'magic_stones',min:4,max:8},{item:'gemstones',min:5,max:10},{item:'gold',min:6,max:12}] },
    ],
};

const ZONE_RESOURCES = {
    plains: ['cotton','food','herbs','water'],
    forest: ['wood','herbs','food','water'],
    mountain: ['stone','iron','coal','zinc'],
    cave: ['stone','iron','coal','silver'],
    swamp: ['herbs','water','leather','salt'],
    dark: ['magic_stones','gemstones','gold','lead'],
};
