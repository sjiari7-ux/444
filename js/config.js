"use strict";

/* ============================================================
   ICONS
   ============================================================ */
const ICONS = {
  arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9s-1.1 6.5-3.5 9c-2.4-2.5-3.5-5.5-3.5-9S9.6 5.5 12 3Z"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  sword:'<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8"/>',
  flask:'<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9V3"/>',
  bag:'<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  crown:'<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z"/>',
  scroll:'<path d="M6 4h13v13a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M6 4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2"/><path d="M9 9h7M9 13h7"/>',
  shield:'<path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3Z"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  heart:'<path d="M12 21C12 21 4 15.5 4 9.5C4 6.5 6.5 4 9.5 4C11 4 12 5 12 5C12 5 13 4 14.5 4C17.5 4 20 6.5 20 9.5C20 15.5 12 21 12 21Z"/>',
  bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  drop:'<path d="M12 3s6 7 6 11.5A6 6 0 0 1 6 14.5C6 10 12 3 12 3Z"/>',
  chat:'<path d="M4 4h16v12H8l-4 4V4Z"/>',
  star:'<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3Z"/>',
  castle:'<path d="M4 21V9l3-2v2l3-2v2l3-2v2l3-2v2l4-2v14"/><path d="M2 21h20M8 21v-5h3v5M15 12h2M15 16h2"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20c.7-4 2.6-6 6-6s5.3 2 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14c2 .8 3.2 2.4 3.8 5.2"/>',
  coins:'<circle cx="9" cy="9" r="5"/><path d="M9 6v6M7 8h4M14 7.5a4.5 4.5 0 0 1 0 9M16 11h2"/>',
  hammer:'<path d="m14 4 6 6-3 3-6-6"/><path d="m11 7-7 7"/><path d="M4 14l6 6"/>',
  chart:'<path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/>',
  swords:'<path d="m5 4 15 15M19 4 4 19"/><path d="M5 4h4M19 4h-4M5 19h4M19 19h-4"/>',
};
function icon(name, extra){ return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '+(extra||'')+'>'+(ICONS[name]||'')+'</svg>'; }

/* ============================================================
   ART ICONS (PNG/JPG art in the icons/ folder, alongside index.html —
   distinct from the inline-SVG nav ICONS above). Used for resources,
   materials, classes, kingdoms and zone banners.
   ============================================================ */
/* Icon folders: icons/<folder>/<file>.webp (code may still say .png/.jpg: iconUrl() maps it to .webp). iconUrl() picks the folder from the file name, so the rest of the code keeps using plain file names. */
function iconUrl(file){
  const f = String(file||'');
  let d = 'ui';
  if(/^(weapon|armor|helmet|gloves|boots|accessory)_/i.test(f)) d = 'gear';
  else if(/^resource_/i.test(f)) d = 'resources';
  else if(/^monster_/i.test(f)) d = 'monsters';
  else if(/^zone/i.test(f)) d = 'zones';
  else if(/^banner-/i.test(f)) d = 'banners';
  else if(/^class_/i.test(f)) d = 'classes';
  return 'icons/' + d + '/' + f.replace(/\.(png|jpe?g)$/i, '.webp');
}
function itemIcon(file, size, extra){ return file ? `<img src="${iconUrl(file)}" alt="" class="item-icon" style="width:${size||16}px;height:${size||16}px;${extra||''}">` : ''; }
const RESOURCE_ICONS = {
  wood:'resource_wood.png', stone:'resource_stone.png', food:'resource_food.png', coal:'resource_coal.png',
  iron:'resource_iron.png', ore:'resource_gold.png', herbs:'resource_herbs.png', leather:'resource_leather.png',
  frost:'shard.png', voidessence:'resource_magic_stones.png', cotton:'resource_cotton.png', silver:'resource_silver.png',
  gold:'gold_coin.png',
};
function resourceIcon(key, size){ return itemIcon(RESOURCE_ICONS[key], size); }
const STAT_ICONS = { hp:'ui_health.png', energy:'ui_energy.png', mana:'ui_mana.png', xp:'ui_xp.png' };
function statIcon(key, size){ return itemIcon(STAT_ICONS[key], size); }

/* ---- Weapon art: icons/weapon_<name>.png  (WebP) ----
   Class starter weapons have their own picture; every other weapon uses its rarity picture. */
const WEAPON_ART = {'Iron Sword':'weapon_iron_sword', 'Longbow':'weapon_longbow', 'Magic Staff':'weapon_magic_staff', 'Officer Blade':'weapon_officer_blade', 'Golden Dagger':'weapon_golden_dagger'};
const WEAPON_TIER_ART = ['common','uncommon','rare','epic','legendary'];
function weaponArtKey(it){
  if(!it) return null;
  if(it.slot==='weapon'){
    if(WEAPON_ART[it.name]) return WEAPON_ART[it.name];
    return 'weapon_' + (WEAPON_TIER_ART.includes(it.tier) ? it.tier : 'common');
  }
  // armor / helmet / gloves / boots / accessory: icons/gear/<slot>_<rarity>.png
  if(['armor','helmet','gloves','boots','accessory'].includes(it.slot)){
    return it.slot + '_' + (WEAPON_TIER_ART.includes(it.tier) ? it.tier : 'common');
  }
  return null;
}
const SLOT_ICO = {weapon:'sword',armor:'shield',helmet:'crown',boots:'arrow',gloves:'hammer',accessory:'star'};
/* Picture for a market entry: gear art (with drawn-icon fallback), resource/material PNG, or a generic drawn icon. */
function marketIcon(kind, itemId, gear, size){
  size = size||26;
  if(kind==='equipment'){
    const art = weaponArtKey(gear), ico = icon(SLOT_ICO[gear&&gear.slot]||'shield');
    return `<span class="mk-ico" style="width:${size+10}px;height:${size+10}px">${art?artImg(art)+`<span class="fb" style="display:none">${ico}</span>`:ico}</span>`;
  }
  const file = kind==='resource' ? RESOURCE_ICONS[itemId] : MATERIAL_ICONS[itemId];
  return `<span class="mk-ico" style="width:${size+10}px;height:${size+10}px">${file?itemIcon(file,size):icon(kind==='consumable'?'bolt':'hammer')}</span>`;
}
function artFallback(img){
  img.onerror = null; img.style.display = 'none';
  const fb = img.parentNode && img.parentNode.querySelector('.fb'); if(fb) fb.style.display = ''; // no picture found: show the drawn icon instead
}
function artImg(base){ return `<img class="rc-art" src="${iconUrl(base + '.png')}" alt="" data-base="${base}" data-try="0" onerror="artFallback(this)">`; }

/* ============================================================
   GAME CONFIG
   ============================================================ */
const XP_FOR_LEVEL = (lvl)=> Math.round(35 * Math.pow(lvl, 1.4));
const SKILL_UPGRADE_COST = [1,1,2,2,3,3,4,4,5,5]; // cost to go from lvl i -> i+1, i=0..9
const MAX_SKILL_LEVEL = 10;
const BAG_CAPACITY = 40;
const PVP_ENERGY_COST = 15;
const PVP_MAX_ROUNDS = 25;
const PVE_MAX_ROUNDS = 30;
const PVP_PROTECTION_MS = 5 * 60 * 1000;
const ELO_K = 32;
const RATING_FLOOR = 100;
const PVP_BOT_REWARD_MULT = 0.25; // practice bots: no rating, no win/loss record, only a quarter of the XP/gold
// PvP leagues, by rating. `min` is the first rating of the league.
const LEAGUES = [
  {id:'bronze',   name:'Bronze',   min:0,    color:'#c08457'},
  {id:'silver',   name:'Silver',   min:1100, color:'#cbd5e1'},
  {id:'gold',     name:'Gold',     min:1300, color:'#facc15'},
  {id:'platinum', name:'Platinum', min:1500, color:'#5eead4'},
  {id:'diamond',  name:'Diamond',  min:1700, color:'#60a5fa'},
  {id:'champion', name:'Champion', min:2000, color:'#f472b6'},
];
function leagueOf(rating){
  const r = Number(rating) || 0;
  let cur = LEAGUES[0];
  for(const l of LEAGUES) if(r >= l.min) cur = l;
  return cur;
}
// Where the player stands inside their league: { league, next (or null), pct (0-100), toNext }
function leagueProgress(rating){
  const r = Math.round(Number(rating) || 0), league = leagueOf(r), i = LEAGUES.indexOf(league), next = LEAGUES[i+1] || null;
  if(!next) return { league, next:null, pct:100, toNext:0 };
  const start = league.min === 0 ? 900 : league.min; // Bronze starts at 0, but its bar starts at 900 so a new player (1000) isn't shown as "almost done"
  return { league, next, pct: clamp(Math.round((r - start) / (next.min - start) * 100), 0, 100), toNext: next.min - r };
}
// Energy regenerates continuously at 20% of Max Energy per hour, computed from the
// lastEnergyAt timestamp (see applyRegen in engine.js) so it keeps accruing while the
// player is offline instead of relying on a client-side interval.
const ENERGY_REGEN_RATE_PER_HOUR = 0.2;
function energyRegenPerHour(maxEnergy){ return Math.round(maxEnergy * ENERGY_REGEN_RATE_PER_HOUR); }
const HP_REGEN_MS = 30 * 1000, HP_REGEN_PCT = 0.02;
const MANA_REGEN_MS = 10 * 1000, MANA_REGEN_AMT = 1;

const CLASSES = {
  warrior:{
    id:'warrior', name:'Warrior', icon:'class_warrior.png', tagline:'Balanced frontline fighter.',
    resource:'Rage',
    base:{hp:130, atk:13, def:12, spd:7, crit:4, eva:3},
    growth:{hp:15, atk:2.1, def:2.0, spd:0.35, crit:0.12, eva:0.10},
    startEq:{weapon:'Iron Sword', armor:'Iron Armor'},
    skills:[
      {id:'power_strike', name:'Power Strike', desc:'A heavy blow that hits harder than a normal swing.', cost:20, type:'damage', mult:1.55, multPerLvl:0.05},
      {id:'iron_armor', name:'Iron Armor', desc:'Brace yourself, sharply raising Defense for 3 rounds.', cost:15, type:'buff_def', amount:9, amountPerLvl:3, duration:3},
      {id:'warrior_spirit', name:'Warrior Spirit', desc:'Draw on your resolve to recover lost health.', cost:25, type:'heal', pct:0.09, pctPerLvl:0.012},
    ],
  },
  archer:{
    id:'archer', name:'Archer', icon:'class_archer.png', tagline:'Fast offensive fighter.',
    resource:'Precision',
    base:{hp:95, atk:15, def:6, spd:13, crit:14, eva:12},
    growth:{hp:9, atk:2.3, def:1.0, spd:0.55, crit:0.35, eva:0.30},
    startEq:{weapon:'Longbow', armor:'Leather Vest'},
    skills:[
      {id:'keen_eye', name:'Keen Eye', desc:'A precise shot with a sharply increased critical chance.', cost:20, type:'damage_crit_boost', mult:1.45, multPerLvl:0.05, critBonus:25},
      {id:'swiftness', name:'Swiftness', desc:'Move like the wind, boosting Speed and Evasion for 3 rounds.', cost:15, type:'buff_spd_eva', amount:6, amountPerLvl:1.4, duration:3},
      {id:'efficient_aim', name:'Efficient Aim', desc:'A calculated shot that ignores part of the target\'s Defense.', cost:20, type:'damage_ignore_def', mult:1.3, multPerLvl:0.04, ignorePct:0.5},
    ],
  },
  mage:{
    id:'mage', name:'Mage', icon:'class_mage.png', tagline:'High-damage magical fighter.',
    resource:'Mana',
    base:{hp:78, atk:19, def:4, spd:9, crit:8, eva:5},
    growth:{hp:7, atk:2.9, def:0.7, spd:0.30, crit:0.20, eva:0.15},
    startEq:{weapon:'Magic Staff', armor:'Cloth Robe'},
    skills:[
      {id:'arcane_power', name:'Arcane Power', desc:'Unleash a devastating burst of arcane energy.', cost:16, type:'damage', mult:2.0, multPerLvl:0.07},
      {id:'magic_shield', name:'Magic Shield', desc:'Weave a barrier that greatly raises Defense for 2 rounds.', cost:12, type:'buff_def', amount:14, amountPerLvl:3.4, duration:2},
      {id:'mana_force', name:'Mana Force', desc:'Channel mana into an attack while restoring some to yourself.', cost:10, type:'damage_resource_refund', mult:1.35, multPerLvl:0.05, refund:12},
    ],
  },
  commander:{
    id:'commander', name:'Commander', icon:'class_support.png', tagline:'Combat and defensive specialist.',
    resource:'Command Points',
    base:{hp:135, atk:12, def:14, spd:7, crit:5, eva:4},
    growth:{hp:16, atk:1.9, def:2.3, spd:0.30, crit:0.15, eva:0.12},
    startEq:{weapon:'Officer Blade', armor:'Banner Plate'},
    skills:[
      {id:'war_banner', name:'War Banner', desc:'Rally yourself, raising Attack for 3 rounds.', cost:20, type:'buff_atk', amount:7, amountPerLvl:1.8, duration:3},
      {id:'iron_will', name:'Iron Will', desc:'Steel your resolve, healing and raising Defense briefly.', cost:20, type:'heal_and_def', pct:0.06, pctPerLvl:0.008, defAmount:8, duration:2},
      {id:'command_aura', name:'Command Aura', desc:'Strike while your presence weakens the enemy\'s Attack for 2 rounds.', cost:20, type:'damage_debuff_atk', mult:1.35, multPerLvl:0.04, debuff:0.2, duration:2},
    ],
  },
  merchant:{
    id:'merchant', name:'Merchant', icon:'class_merchant.png', tagline:'Economic-oriented combat class.',
    resource:'Fortune',
    base:{hp:100, atk:12, def:9, spd:9, crit:8, eva:7},
    growth:{hp:11, atk:2.0, def:1.4, spd:0.35, crit:0.22, eva:0.18},
    startEq:{weapon:'Golden Dagger', armor:'Merchant Vest'},
    skills:[
      {id:'profitable_deal', name:'Profitable Deal', desc:'A shrewd strike; defeating a foe yields extra gold.', cost:15, type:'damage_gold_bonus', mult:1.4, multPerLvl:0.05, goldBonusPct:0.4},
      {id:'deep_pockets', name:'Deep Pockets', desc:'Fortune favors the prepared: raise Defense and recover Fortune.', cost:10, type:'buff_def_resource', amount:7, amountPerLvl:1.6, duration:3, refund:15},
      {id:'lucky', name:'Lucky', desc:'Fortune smiles upon this strike, sharply raising its critical chance.', cost:15, type:'damage_crit_boost', mult:1.3, multPerLvl:0.04, critBonus:30},
    ],
  },
};

const GENERAL_SKILLS = [
  {id:'health', name:'Health', desc:'+8 Max HP per level', stat:'hp', amount:8},
  {id:'damage', name:'Damage', desc:'+2 Attack per level', stat:'atk', amount:2},
  {id:'defense', name:'Defense', desc:'+2 Defense per level', stat:'def', amount:2},
  {id:'stamina', name:'Stamina', desc:'+6 Max Energy per level', stat:'energy', amount:6},
  {id:'storage', name:'Storage', desc:'+40 Storage capacity per level', stat:'storage', amount:40},
];
const GENERAL_SKILL_MAX = 20;
const GENERAL_SKILL_UPGRADE_COST = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10]; // cost in skill points to go from lvl i -> i+1, i=0..19
function generalSkillCost(currentLevel){ return GENERAL_SKILL_UPGRADE_COST[currentLevel]; }

const ZONES = [
  {id:'plains', name:'Plains', icon:'zone_plains.jpg', min:1, max:10, monsters:['Wild Boar','Field Rat','Bandit Scout'], resources:['wood','food'],
    boss:'Grukk the Boarking',
    dropTable:[{t:'common',w:75},{t:'uncommon',w:23},{t:'rare',w:2}]},
  {id:'forest', name:'Forest', icon:'zone_forest.jpg', min:10, max:25, monsters:['Dire Wolf','Forest Troll','Rogue Archer'], resources:['wood','herbs'],
    boss:'Malrend, Heart of the Wood',
    dropTable:[{t:'common',w:60},{t:'uncommon',w:32},{t:'rare',w:8}]},
  {id:'mountain', name:'Mountain', icon:'zone_mountain.jpg', min:25, max:40, monsters:['Rock Golem','Mountain Harpy','Iron Bandit'], resources:['stone','iron'],
    boss:'Thorrgun, the Cliff Titan',
    dropTable:[{t:'common',w:45},{t:'uncommon',w:35},{t:'rare',w:18},{t:'epic',w:2}]},
  {id:'cave', name:'Cave', icon:'zone_cave.jpg', min:40, max:55, monsters:['Cave Spider','Bat Swarm','Gloom Wraith'], resources:['coal','iron'],
    boss:'Skarn, Lord of the Deep',
    dropTable:[{t:'common',w:35},{t:'uncommon',w:35},{t:'rare',w:25},{t:'epic',w:5}]},
  {id:'swamp', name:'Swamp', icon:'zone_swamp.jpg', min:55, max:70, monsters:['Bog Serpent','Swamp Witch','Rot Beast'], resources:['herbs','leather'],
    boss:'Vessyr the Rotmother',
    dropTable:[{t:'common',w:20},{t:'uncommon',w:35},{t:'rare',w:32},{t:'epic',w:12},{t:'legendary',w:1}]},
  {id:'darkzone', name:'Dark Zone', icon:'zone_dark.jpg', min:70, max:100, monsters:['Shadow Knight','Void Reaver','Nightmare Construct'], resources:['iron','ore'],
    boss:'Kaelthorn, the Hollow King',
    dropTable:[{t:'common',w:10},{t:'uncommon',w:25},{t:'rare',w:35},{t:'epic',w:25},{t:'legendary',w:5}]},
  {id:'frozen', name:'Frozen Wastes', icon:'zone_frozen.jpg', min:100, max:150, monsters:['Frost Wraith','Ice Golem','Winter Stalker'], resources:['frost','iron'],
    boss:'Ysmera, the Everfrost Queen',
    dropTable:[{t:'uncommon',w:10},{t:'rare',w:35},{t:'epic',w:40},{t:'legendary',w:15}]},
  {id:'abyss', name:'Abyssal Rift', icon:'zone_abyss.jpg', min:150, max:300, uncapped:true, monsters:['Abyssal Horror','Void Sentinel','Nether Devourer'], resources:['voidessence','ore'],
    boss:'Nyxul, Devourer of Light',
    dropTable:[{t:'rare',w:10},{t:'epic',w:40},{t:'legendary',w:50}]},
];
const RESOURCE_NAMES = {wood:'Wood', stone:'Stone', food:'Food', coal:'Coal', iron:'Iron', ore:'Gold Ore', herbs:'Herbs', leather:'Leather', frost:'Frost Shard', voidessence:'Void Essence'};

const KINGDOMS = [
  {id:'afghanistan', name:'Afghanistan', flag:'af', resources:['stone','herbs'], tax:7},
  {id:'albania', name:'Albania', flag:'al', resources:['coal','herbs'], tax:7},
  {id:'algeria', name:'Algeria', flag:'dz', resources:['ore','leather'], tax:12},
  {id:'andorra', name:'Andorra', flag:'ad', resources:['iron','food'], tax:15},
  {id:'angola', name:'Angola', flag:'ao', resources:['ore','iron'], tax:8},
  {id:'antigua_and_barbuda', name:'Antigua and Barbuda', flag:'ag', resources:['leather','food'], tax:11},
  {id:'argentina', name:'Argentina', flag:'ar', resources:['leather','food'], tax:11},
  {id:'armenia', name:'Armenia', flag:'am', resources:['ore','leather'], tax:6},
  {id:'australia', name:'Australia', flag:'au', resources:['iron','wood'], tax:11},
  {id:'austria', name:'Austria', flag:'at', resources:['coal','food'], tax:15},
  {id:'azerbaijan', name:'Azerbaijan', flag:'az', resources:['herbs','food'], tax:9},
  {id:'bahamas', name:'Bahamas', flag:'bs', resources:['herbs','wood'], tax:8},
  {id:'bahrain', name:'Bahrain', flag:'bh', resources:['stone','iron'], tax:15},
  {id:'bangladesh', name:'Bangladesh', flag:'bd', resources:['ore','leather'], tax:6},
  {id:'barbados', name:'Barbados', flag:'bb', resources:['food','ore'], tax:7},
  {id:'belarus', name:'Belarus', flag:'by', resources:['ore','stone'], tax:15},
  {id:'belgium', name:'Belgium', flag:'be', resources:['herbs','iron'], tax:7},
  {id:'belize', name:'Belize', flag:'bz', resources:['stone','leather'], tax:7},
  {id:'benin', name:'Benin', flag:'bj', resources:['ore','wood'], tax:8},
  {id:'bhutan', name:'Bhutan', flag:'bt', resources:['food','iron'], tax:15},
  {id:'bolivia', name:'Bolivia', flag:'bo', resources:['ore','wood'], tax:10},
  {id:'bosnia_and_herzegovina', name:'Bosnia and Herzegovina', flag:'ba', resources:['herbs','iron'], tax:9},
  {id:'botswana', name:'Botswana', flag:'bw', resources:['wood','stone'], tax:15},
  {id:'brazil', name:'Brazil', flag:'br', resources:['wood','herbs'], tax:12},
  {id:'brunei', name:'Brunei', flag:'bn', resources:['coal','leather'], tax:15},
  {id:'bulgaria', name:'Bulgaria', flag:'bg', resources:['coal','herbs'], tax:6},
  {id:'burkina_faso', name:'Burkina Faso', flag:'bf', resources:['herbs','food'], tax:11},
  {id:'burundi', name:'Burundi', flag:'bi', resources:['herbs','leather'], tax:15},
  {id:'cambodia', name:'Cambodia', flag:'kh', resources:['stone','food'], tax:7},
  {id:'cameroon', name:'Cameroon', flag:'cm', resources:['herbs','iron'], tax:13},
  {id:'canada', name:'Canada', flag:'ca', resources:['wood','frost'], tax:7},
  {id:'cape_verde', name:'Cape Verde', flag:'cv', resources:['wood','herbs'], tax:14},
  {id:'central_african_republic', name:'Central African Republic', flag:'cf', resources:['stone','food'], tax:14},
  {id:'chad', name:'Chad', flag:'td', resources:['wood','coal'], tax:13},
  {id:'chile', name:'Chile', flag:'cl', resources:['coal','stone'], tax:15},
  {id:'china', name:'China', flag:'cn', resources:['herbs','leather'], tax:10},
  {id:'colombia', name:'Colombia', flag:'co', resources:['stone','herbs'], tax:10},
  {id:'comoros', name:'Comoros', flag:'km', resources:['stone','iron'], tax:13},
  {id:'costa_rica', name:'Costa Rica', flag:'cr', resources:['herbs','wood'], tax:15},
  {id:'croatia', name:'Croatia', flag:'hr', resources:['ore','food'], tax:8},
  {id:'cuba', name:'Cuba', flag:'cu', resources:['iron','herbs'], tax:12},
  {id:'cyprus', name:'Cyprus', flag:'cy', resources:['wood','herbs'], tax:11},
  {id:'czechia', name:'Czechia', flag:'cz', resources:['iron','stone'], tax:15},
  {id:'dr_congo', name:'DR Congo', flag:'cd', resources:['leather','stone'], tax:11},
  {id:'denmark', name:'Denmark', flag:'dk', resources:['stone','iron'], tax:6},
  {id:'djibouti', name:'Djibouti', flag:'dj', resources:['herbs','food'], tax:15},
  {id:'dominica', name:'Dominica', flag:'dm', resources:['iron','stone'], tax:12},
  {id:'dominican_republic', name:'Dominican Republic', flag:'do', resources:['stone','iron'], tax:13},
  {id:'ecuador', name:'Ecuador', flag:'ec', resources:['food','stone'], tax:12},
  {id:'egypt', name:'Egypt', flag:'eg', resources:['stone','food'], tax:11},
  {id:'el_salvador', name:'El Salvador', flag:'sv', resources:['iron','herbs'], tax:15},
  {id:'equatorial_guinea', name:'Equatorial Guinea', flag:'gq', resources:['leather','herbs'], tax:8},
  {id:'eritrea', name:'Eritrea', flag:'er', resources:['leather','ore'], tax:6},
  {id:'estonia', name:'Estonia', flag:'ee', resources:['leather','herbs'], tax:14},
  {id:'eswatini', name:'Eswatini', flag:'sz', resources:['food','leather'], tax:14},
  {id:'ethiopia', name:'Ethiopia', flag:'et', resources:['stone','food'], tax:12},
  {id:'fiji', name:'Fiji', flag:'fj', resources:['food','herbs'], tax:12},
  {id:'finland', name:'Finland', flag:'fi', resources:['leather','wood'], tax:13},
  {id:'france', name:'France', flag:'fr', resources:['food','wood'], tax:14},
  {id:'gabon', name:'Gabon', flag:'ga', resources:['coal','herbs'], tax:15},
  {id:'gambia', name:'Gambia', flag:'gm', resources:['herbs','iron'], tax:6},
  {id:'georgia', name:'Georgia', flag:'ge', resources:['ore','food'], tax:13},
  {id:'germany', name:'Germany', flag:'de', resources:['iron','coal'], tax:15},
  {id:'ghana', name:'Ghana', flag:'gh', resources:['herbs','leather'], tax:15},
  {id:'greece', name:'Greece', flag:'gr', resources:['coal','food'], tax:8},
  {id:'grenada', name:'Grenada', flag:'gd', resources:['stone','iron'], tax:12},
  {id:'guatemala', name:'Guatemala', flag:'gt', resources:['stone','leather'], tax:14},
  {id:'guinea', name:'Guinea', flag:'gn', resources:['iron','leather'], tax:15},
  {id:'guinea_bissau', name:'Guinea-Bissau', flag:'gw', resources:['food','ore'], tax:15},
  {id:'guyana', name:'Guyana', flag:'gy', resources:['stone','ore'], tax:6},
  {id:'haiti', name:'Haiti', flag:'ht', resources:['wood','herbs'], tax:15},
  {id:'honduras', name:'Honduras', flag:'hn', resources:['herbs','leather'], tax:6},
  {id:'hungary', name:'Hungary', flag:'hu', resources:['leather','wood'], tax:15},
  {id:'iceland', name:'Iceland', flag:'is', resources:['food','wood'], tax:15},
  {id:'india', name:'India', flag:'in', resources:['herbs','wood'], tax:9},
  {id:'indonesia', name:'Indonesia', flag:'id', resources:['food','herbs'], tax:15},
  {id:'iran', name:'Iran', flag:'ir', resources:['ore','food'], tax:6},
  {id:'iraq', name:'Iraq', flag:'iq', resources:['coal','food'], tax:13},
  {id:'ireland', name:'Ireland', flag:'ie', resources:['leather','food'], tax:15},
  {id:'israel', name:'Israel', flag:'il', resources:['coal','stone'], tax:8},
  {id:'italy', name:'Italy', flag:'it', resources:['food','herbs'], tax:12},
  {id:'ivory_coast', name:'Ivory Coast', flag:'ci', resources:['leather','stone'], tax:6},
  {id:'jamaica', name:'Jamaica', flag:'jm', resources:['food','herbs'], tax:15},
  {id:'japan', name:'Japan', flag:'jp', resources:['iron','voidessence'], tax:15},
  {id:'jordan', name:'Jordan', flag:'jo', resources:['iron','leather'], tax:11},
  {id:'kazakhstan', name:'Kazakhstan', flag:'kz', resources:['food','ore'], tax:15},
  {id:'kenya', name:'Kenya', flag:'ke', resources:['leather','herbs'], tax:6},
  {id:'kiribati', name:'Kiribati', flag:'ki', resources:['food','iron'], tax:9},
  {id:'kuwait', name:'Kuwait', flag:'kw', resources:['herbs','food'], tax:15},
  {id:'kyrgyzstan', name:'Kyrgyzstan', flag:'kg', resources:['iron','ore'], tax:9},
  {id:'laos', name:'Laos', flag:'la', resources:['wood','ore'], tax:15},
  {id:'latvia', name:'Latvia', flag:'lv', resources:['wood','herbs'], tax:15},
  {id:'lebanon', name:'Lebanon', flag:'lb', resources:['stone','herbs'], tax:15},
  {id:'lesotho', name:'Lesotho', flag:'ls', resources:['wood','herbs'], tax:12},
  {id:'liberia', name:'Liberia', flag:'lr', resources:['coal','herbs'], tax:7},
  {id:'libya', name:'Libya', flag:'ly', resources:['coal','herbs'], tax:13},
  {id:'liechtenstein', name:'Liechtenstein', flag:'li', resources:['coal','iron'], tax:12},
  {id:'lithuania', name:'Lithuania', flag:'lt', resources:['ore','stone'], tax:11},
  {id:'luxembourg', name:'Luxembourg', flag:'lu', resources:['food','wood'], tax:12},
  {id:'madagascar', name:'Madagascar', flag:'mg', resources:['leather','herbs'], tax:8},
  {id:'malawi', name:'Malawi', flag:'mw', resources:['leather','iron'], tax:12},
  {id:'malaysia', name:'Malaysia', flag:'my', resources:['iron','wood'], tax:15},
  {id:'maldives', name:'Maldives', flag:'mv', resources:['iron','wood'], tax:13},
  {id:'mali', name:'Mali', flag:'ml', resources:['ore','herbs'], tax:15},
  {id:'malta', name:'Malta', flag:'mt', resources:['coal','herbs'], tax:15},
  {id:'marshall_islands', name:'Marshall Islands', flag:'mh', resources:['herbs','leather'], tax:11},
  {id:'mauritania', name:'Mauritania', flag:'mr', resources:['wood','iron'], tax:11},
  {id:'mauritius', name:'Mauritius', flag:'mu', resources:['leather','wood'], tax:11},
  {id:'mexico', name:'Mexico', flag:'mx', resources:['ore','herbs'], tax:10},
  {id:'micronesia', name:'Micronesia', flag:'fm', resources:['stone','iron'], tax:8},
  {id:'moldova', name:'Moldova', flag:'md', resources:['coal','stone'], tax:15},
  {id:'monaco', name:'Monaco', flag:'mc', resources:['iron','stone'], tax:14},
  {id:'mongolia', name:'Mongolia', flag:'mn', resources:['iron','food'], tax:11},
  {id:'montenegro', name:'Montenegro', flag:'me', resources:['wood','stone'], tax:12},
  {id:'morocco', name:'Morocco', flag:'ma', resources:['stone','iron'], tax:10},
  {id:'mozambique', name:'Mozambique', flag:'mz', resources:['iron','ore'], tax:15},
  {id:'myanmar', name:'Myanmar', flag:'mm', resources:['ore','iron'], tax:6},
  {id:'namibia', name:'Namibia', flag:'na', resources:['ore','iron'], tax:6},
  {id:'nauru', name:'Nauru', flag:'nr', resources:['leather','iron'], tax:6},
  {id:'nepal', name:'Nepal', flag:'np', resources:['food','leather'], tax:9},
  {id:'netherlands', name:'Netherlands', flag:'nl', resources:['herbs','leather'], tax:8},
  {id:'new_zealand', name:'New Zealand', flag:'nz', resources:['food','wood'], tax:6},
  {id:'nicaragua', name:'Nicaragua', flag:'ni', resources:['wood','herbs'], tax:15},
  {id:'niger', name:'Niger', flag:'ne', resources:['coal','wood'], tax:9},
  {id:'nigeria', name:'Nigeria', flag:'ng', resources:['wood','herbs'], tax:6},
  {id:'north_korea', name:'North Korea', flag:'kp', resources:['food','herbs'], tax:8},
  {id:'north_macedonia', name:'North Macedonia', flag:'mk', resources:['coal','iron'], tax:15},
  {id:'norway', name:'Norway', flag:'no', resources:['iron','stone'], tax:12},
  {id:'oman', name:'Oman', flag:'om', resources:['leather','herbs'], tax:12},
  {id:'pakistan', name:'Pakistan', flag:'pk', resources:['ore','herbs'], tax:15},
  {id:'palau', name:'Palau', flag:'pw', resources:['food','herbs'], tax:12},
  {id:'palestine', name:'Palestine', flag:'ps', resources:['leather','herbs'], tax:12},
  {id:'panama', name:'Panama', flag:'pa', resources:['herbs','iron'], tax:15},
  {id:'papua_new_guinea', name:'Papua New Guinea', flag:'pg', resources:['food','iron'], tax:10},
  {id:'paraguay', name:'Paraguay', flag:'py', resources:['stone','iron'], tax:9},
  {id:'peru', name:'Peru', flag:'pe', resources:['herbs','leather'], tax:15},
  {id:'philippines', name:'Philippines', flag:'ph', resources:['coal','wood'], tax:11},
  {id:'poland', name:'Poland', flag:'pl', resources:['ore','leather'], tax:14},
  {id:'portugal', name:'Portugal', flag:'pt', resources:['wood','food'], tax:15},
  {id:'qatar', name:'Qatar', flag:'qa', resources:['wood','coal'], tax:15},
  {id:'republic_of_the_congo', name:'Republic of the Congo', flag:'cg', resources:['coal','herbs'], tax:6},
  {id:'romania', name:'Romania', flag:'ro', resources:['leather','iron'], tax:7},
  {id:'russia', name:'Russia', flag:'ru', resources:['frost','coal'], tax:14},
  {id:'rwanda', name:'Rwanda', flag:'rw', resources:['coal','herbs'], tax:15},
  {id:'saint_kitts_and_nevis', name:'Saint Kitts and Nevis', flag:'kn', resources:['leather','stone'], tax:13},
  {id:'saint_lucia', name:'Saint Lucia', flag:'lc', resources:['coal','herbs'], tax:12},
  {id:'saint_vincent_and_the_grenadines', name:'Saint Vincent and the Grenadines', flag:'vc', resources:['wood','stone'], tax:10},
  {id:'samoa', name:'Samoa', flag:'ws', resources:['iron','ore'], tax:15},
  {id:'san_marino', name:'San Marino', flag:'sm', resources:['herbs','food'], tax:13},
  {id:'sao_tome_and_principe', name:'Sao Tome and Principe', flag:'st', resources:['iron','herbs'], tax:15},
  {id:'saudi_arabia', name:'Saudi Arabia', flag:'sa', resources:['ore','coal'], tax:6},
  {id:'senegal', name:'Senegal', flag:'sn', resources:['herbs','iron'], tax:14},
  {id:'serbia', name:'Serbia', flag:'rs', resources:['stone','iron'], tax:15},
  {id:'seychelles', name:'Seychelles', flag:'sc', resources:['herbs','ore'], tax:15},
  {id:'sierra_leone', name:'Sierra Leone', flag:'sl', resources:['iron','ore'], tax:8},
  {id:'singapore', name:'Singapore', flag:'sg', resources:['leather','herbs'], tax:8},
  {id:'slovakia', name:'Slovakia', flag:'sk', resources:['herbs','food'], tax:13},
  {id:'slovenia', name:'Slovenia', flag:'si', resources:['stone','herbs'], tax:7},
  {id:'solomon_islands', name:'Solomon Islands', flag:'sb', resources:['leather','herbs'], tax:13},
  {id:'somalia', name:'Somalia', flag:'so', resources:['iron','leather'], tax:12},
  {id:'south_africa', name:'South Africa', flag:'za', resources:['stone','food'], tax:9},
  {id:'south_korea', name:'South Korea', flag:'kr', resources:['ore','voidessence'], tax:15},
  {id:'south_sudan', name:'South Sudan', flag:'ss', resources:['coal','herbs'], tax:7},
  {id:'spain', name:'Spain', flag:'es', resources:['food','leather'], tax:9},
  {id:'sri_lanka', name:'Sri Lanka', flag:'lk', resources:['food','ore'], tax:13},
  {id:'sudan', name:'Sudan', flag:'sd', resources:['iron','food'], tax:15},
  {id:'suriname', name:'Suriname', flag:'sr', resources:['ore','iron'], tax:15},
  {id:'sweden', name:'Sweden', flag:'se', resources:['leather','herbs'], tax:15},
  {id:'switzerland', name:'Switzerland', flag:'ch', resources:['food','ore'], tax:8},
  {id:'syria', name:'Syria', flag:'sy', resources:['ore','wood'], tax:10},
  {id:'tajikistan', name:'Tajikistan', flag:'tj', resources:['herbs','wood'], tax:9},
  {id:'tanzania', name:'Tanzania', flag:'tz', resources:['ore','leather'], tax:7},
  {id:'thailand', name:'Thailand', flag:'th', resources:['wood','iron'], tax:15},
  {id:'timor_leste', name:'Timor-Leste', flag:'tl', resources:['ore','leather'], tax:12},
  {id:'togo', name:'Togo', flag:'tg', resources:['leather','food'], tax:15},
  {id:'tonga', name:'Tonga', flag:'to', resources:['leather','food'], tax:9},
  {id:'trinidad_and_tobago', name:'Trinidad and Tobago', flag:'tt', resources:['food','stone'], tax:11},
  {id:'tunisia', name:'Tunisia', flag:'tn', resources:['herbs','food'], tax:8},
  {id:'turkey', name:'Turkey', flag:'tr', resources:['iron','herbs'], tax:13},
  {id:'turkmenistan', name:'Turkmenistan', flag:'tm', resources:['stone','iron'], tax:15},
  {id:'tuvalu', name:'Tuvalu', flag:'tv', resources:['herbs','iron'], tax:8},
  {id:'uganda', name:'Uganda', flag:'ug', resources:['food','ore'], tax:15},
  {id:'ukraine', name:'Ukraine', flag:'ua', resources:['leather','ore'], tax:13},
  {id:'united_arab_emirates', name:'United Arab Emirates', flag:'ae', resources:['stone','wood'], tax:8},
  {id:'united_kingdom', name:'United Kingdom', flag:'gb', resources:['coal','leather'], tax:13},
  {id:'united_states', name:'United States', flag:'us', resources:['stone','ore'], tax:15},
  {id:'uruguay', name:'Uruguay', flag:'uy', resources:['stone','iron'], tax:9},
  {id:'uzbekistan', name:'Uzbekistan', flag:'uz', resources:['coal','wood'], tax:12},
  {id:'vanuatu', name:'Vanuatu', flag:'vu', resources:['herbs','food'], tax:11},
  {id:'vatican_city', name:'Vatican City', flag:'va', resources:['coal','stone'], tax:8},
  {id:'venezuela', name:'Venezuela', flag:'ve', resources:['iron','stone'], tax:10},
  {id:'vietnam', name:'Vietnam', flag:'vn', resources:['ore','food'], tax:14},
  {id:'yemen', name:'Yemen', flag:'ye', resources:['herbs','iron'], tax:11},
  {id:'zambia', name:'Zambia', flag:'zm', resources:['iron','leather'], tax:11},
  {id:'zimbabwe', name:'Zimbabwe', flag:'zw', resources:['stone','wood'], tax:15},
];
// Country flags are PNGs (emoji flags don't render on Windows). Falls back to the country code as alt text.
function kingdomFlag(kingdomId, size, extra){ const k = KINGDOMS.find(x=>x.id===kingdomId); return k ? flagIcon(k.flag, size||14, 'margin-right:4px;vertical-align:-2px;'+(extra||'')) : ''; }
function flagIcon(code, size, extra){
  if(!code) return '';
  const k = KINGDOMS.find(x=>x.flag===code);
  const fb = `https://flagcdn.com/w40/${code}.png`;
  const first = k ? `icons/flags/${k.id}.webp` : fb;
  return `<img src="${first}" alt="${code.toUpperCase()}" class="item-icon" style="width:${size||16}px;height:auto;${extra||''}" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='${fb}';}">`;
}
const KINGDOM_ROLES = ['Recruit','Member','Officer','Co-Leader','Leader'];
const KINGDOM_JOIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const KINGDOM_TREASURY_RESOURCES = ['gold','wood','stone','iron','food','herbs'];
const KINGDOM_CHAT_MAX = 60;
function kingdomRank(role){ return KINGDOM_ROLES.indexOf(role); }
const MARKET_BROWSE_LIMIT = 60;
const GENERAL_CHAT_MAX = 60;
const MARKET_KIND_LABELS = {resource:'Resource', material:'Material', consumable:'Consumable', equipment:'Equipment'};
const BOSS_ENERGY_COST = 30;
const BOSS_COOLDOWN_MS = 30 * 60 * 1000;
const BOSS_MULT = { hp: 2.3, atk: 1.35, def: 1.2 };
const STEP_ENERGY_COST = 2;
const STEP_EVENT_WEIGHTS = [
  {t:'flavor', w:40}, {t:'gold', w:18}, {t:'resource', w:16}, {t:'xp', w:6}, {t:'monster', w:17},
];
const FLAVOR_TEXTS = [
  "You kick a loose pebble down the road and immediately regret it.",
  "A merchant nods at you from a distance. You nod back, unsure why.",
  "The wind carries a strange smell from up ahead. Onward.",
  "You pause to retie your boot. Riveting stuff.",
  "Somewhere in the distance, something screams. You keep walking.",
  "A stray dog follows you for a few steps, then loses interest.",
  "You find nothing of note, but the walk was nice.",
  "An old sign, half-buried, reads: 'Turn back.' You don't.",
  "You hum a tune you don't remember learning.",
  "A crow watches you pass. It seems unimpressed.",
  "The path forks. You pick the one that looks slightly less cursed.",
  "You step over what might have once been a person. Best not to look closely.",
  "Someone, somewhere, is having a much worse day than you.",
  "You practice your battle cry. It needs work.",
  "The road here is oddly well-maintained. Suspicious.",
  "You count your steps for a while, then lose count, then give up.",
  "A distant bell tolls. You have no idea what it means.",
  "You spot fresh tracks in the dirt. Best to stay alert.",
  "The silence here feels earned.",
  "You wonder, not for the first time, why you chose this life.",
  "A gust of wind nearly takes your hood. You win this round.",
  "You overhear two travelers arguing about the price of bread.",
  "Your stomach growls. You ignore it, professionally.",
  "The road narrows. You press on regardless.",
];

// Energy costs follow the spec baseline: 5 for a basic single-resource recipe,
// 10 for an intermediate multi-input recipe (materials/consumables built from a base material).
const RECIPES = [
  {id:'plank', name:'Wood Planks', inputs:{wood:5}, energy:5, xp:5, out:{kind:'material', id:'plank', name:'Plank', icon:'resource_wood.png'}},
  {id:'brick', name:'Bricks', inputs:{stone:5}, energy:5, xp:5, out:{kind:'material', id:'brick', name:'Brick', icon:'resource_brick.png'}},
  {id:'bread', name:'Bread', inputs:{food:4}, energy:5, xp:5, out:{kind:'material', id:'bread', name:'Bread', icon:'resource_bread.png'}},
  {id:'steel', name:'Steel', inputs:{iron:4, coal:2}, energy:10, xp:10, out:{kind:'material', id:'steel', name:'Steel', icon:'resource_steel.png'}},
  {id:'tanned_leather', name:'Tanned Leather', inputs:{leather:4}, energy:5, xp:6, out:{kind:'material', id:'tanned_leather', name:'Tanned Leather', icon:'resource_leather.png'}},
  {id:'potion', name:'Potion Base', inputs:{herbs:5}, energy:5, xp:5, out:{kind:'material', id:'potion', name:'Potion', icon:'resource_health_potion.png'}},
  {id:'health_potion', name:'Health Potion', inputs:{herbs:3, potion:1}, energy:10, xp:8, out:{kind:'consumable', id:'health_potion', name:'Health Potion', icon:'resource_health_potion.png', effect:{heal:0.35}}},
  {id:'energy_potion', name:'Energy Potion', inputs:{food:3, potion:1}, energy:10, xp:8, out:{kind:'consumable', id:'energy_potion', name:'Energy Potion', icon:'resource_energy_potion.png', effect:{energy:30}}},
];
// id (material/consumable) -> icon file, derived from RECIPES so both stay in sync.
const MATERIAL_ICONS = Object.fromEntries(RECIPES.map(r=>[r.out.id, r.out.icon]));

const EQUIP_SLOTS = ['weapon','armor','helmet','boots','gloves','accessory'];
const SLOT_NOUN = {weapon:'Blade', armor:'Plate', helmet:'Helm', boots:'Boots', gloves:'Gauntlets', accessory:'Charm'};
const TIERS = [
  {id:'common', name:'Common', mult:1.0},
  {id:'uncommon', name:'Uncommon', mult:1.35},
  {id:'rare', name:'Rare', mult:1.8},
  {id:'epic', name:'Epic', mult:2.4},
  {id:'legendary', name:'Legendary', mult:3.3},
];
const TIER_ORDER = TIERS.map(t=>t.id);
function pickTierForBoss(zone){
  const pool = zone.dropTable.slice(-2);
  const total = pool.reduce((a,x)=>a+x.w, 0) || 1;
  let r = rnd(0, total);
  for(const x of pool){ if(r<x.w) return TIERS.find(t=>t.id===x.t); r-=x.w; }
  return TIERS.find(t=>t.id===pool[pool.length-1].t);
}
function pickTierForZone(zone, elite){
  let table = zone.dropTable.map(x=>Object.assign({},x));
  if(elite){
    table = table.map(x=>{
      if(x.t==='common') return {t:x.t, w:Math.max(1, Math.round(x.w*0.35))};
      if(x.t==='epic' || x.t==='legendary') return {t:x.t, w:Math.round(x.w*1.8)};
      return x;
    });
  }
  const total = table.reduce((a,x)=>a+x.w, 0);
  let r = rnd(0, total);
  for(const x of table){ if(r<x.w) return TIERS.find(t=>t.id===x.t); r-=x.w; }
  return TIERS.find(t=>t.id===table[0].t) || TIERS[0];
}
const UPGRADE_COSTS = {
  common:    {gold:120,  resources:{iron:5, leather:5} },
  uncommon:  {gold:300,  materials:{steel:3, tanned_leather:3} },
  rare:      {gold:700,  resources:{frost:6, ore:6} },
  epic:      {gold:1600, resources:{voidessence:6, frost:10} },
};

/* ---------- FORGE: the only way to make gear now (monsters no longer drop it). Same cost for every slot, scales with tier. No gold: only Energy, resources and materials. ---------- */
const FORGE_TIERS = {
  common:    {energy:8,  xp:5,  materials:{plank:5},                          resources:{wood:10, food:8}},
  uncommon:  {energy:12, xp:10, materials:{plank:8, bread:6},                 resources:{wood:20, herbs:12, food:15}},
  rare:      {energy:16, xp:20, materials:{steel:6, tanned_leather:4},        resources:{iron:20, stone:15, coal:10}},
  epic:      {energy:24, xp:40, materials:{steel:12, tanned_leather:10},      resources:{iron:25, ore:15, leather:15}},
  legendary: {energy:32, xp:80, materials:{steel:20, tanned_leather:16},      resources:{frost:25, ore:20, iron:30}},
};

const BOT_NAMES = ['Kestrel','Draven','Mira Ash','Thorne','Sable','Yorick','Wren','Balder','Nyx','Corvin','Isolde','Ragnar','Petra','Faelan','Osric','Vesper'];

/* ============================================================
   COLOR SCHEMES (Appearance / Settings)
   Each scheme drives the two accent variables (--brass / --brass-bright)
   that the whole UI is built on — buttons, active nav, panel titles,
   the energy bar, etc. "brass" is the game's own native look and stays
   the default; the rest are free reskins, no supporter-plan gate.
   ============================================================ */
const COLOR_SCHEMES = [
  {id:'brass',      name:'Brass',      base:'#b98a3e', bright:'#e0b364'},
  {id:'red',        name:'Red',        base:'#a8342c', bright:'#e0574c'},
  {id:'deeporange', name:'DeepOrange', base:'#a8482a', bright:'#e07a4c'},
  {id:'orange',     name:'Orange',     base:'#b06a24', bright:'#e69a44'},
  {id:'lightorange',name:'LightOrange',base:'#b3852e', bright:'#e6b559'},
  {id:'amber',      name:'Amber',      base:'#b3962a', bright:'#e6c651'},
  {id:'yellow',     name:'Yellow',     base:'#a89c2e', bright:'#dfd25c'},
  {id:'olive',      name:'Olive',      base:'#7d8038', bright:'#a9ac5f'},
  {id:'lime',       name:'Lime',       base:'#6e9235', bright:'#98c25c'},
  {id:'lightgreen', name:'LightGreen', base:'#5a9445', bright:'#82c268'},
  {id:'green',      name:'Green',      base:'#458a4a', bright:'#69b56d'},
  {id:'emerald',    name:'Emerald',    base:'#3a9270', bright:'#5cc294'},
  {id:'teal',       name:'Teal',       base:'#358a86', bright:'#57b8b3'},
  {id:'cyan',       name:'Cyan',       base:'#3592a0', bright:'#57c2d1'},
  {id:'lightblue',  name:'LightBlue',  base:'#3d7fab', bright:'#63aad9'},
  {id:'blue',       name:'Blue',       base:'#3a6ba8', bright:'#5f92d9'},
  {id:'indigo',     name:'Indigo',     base:'#5259a8', bright:'#7d84d9'},
  {id:'purple',     name:'Purple',     base:'#7548a3', bright:'#a274d1'},
  {id:'violet',     name:'Violet',     base:'#8a4bad', bright:'#b877d9'},
  {id:'pink',       name:'Pink',       base:'#ab4f8a', bright:'#d979b4'},
  {id:'deeppink',   name:'DeepPink',   base:'#ab2f52', bright:'#d95a7d'},
  {id:'brown',      name:'Brown',      base:'#7a5a3a', bright:'#a3805e'},
  {id:'sand',       name:'Sand',       base:'#a3915f', bright:'#cbb98c'},
  {id:'gray',       name:'Gray',       base:'#7c7568', bright:'#a49d8d'},
];
function getColorScheme(id){
  return COLOR_SCHEMES.find(s=>s.id===id) || COLOR_SCHEMES[0];
}
