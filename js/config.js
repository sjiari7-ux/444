"use strict";

/* ============================================================
   ICONS
   ============================================================ */
const ICONS = {
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  percent:'<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M19 5 5 19"/>',
  arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
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
  gem:'<path d="M6 3h12l4 6-10 12L2 9l4-6Z"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6"/>',
  star:'<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3Z"/>',
  castle:'<path d="M4 21V9l3-2v2l3-2v2l3-2v2l3-2v2l4-2v14"/><path d="M2 21h20M8 21v-5h3v5M15 12h2M15 16h2"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20c.7-4 2.6-6 6-6s5.3 2 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14c2 .8 3.2 2.4 3.8 5.2"/>',
  coins:'<circle cx="9" cy="9" r="5"/><path d="M9 6v6M7 8h4M14 7.5a4.5 4.5 0 0 1 0 9M16 11h2"/>',
  hammer:'<path d="m14 4 6 6-3 3-6-6"/><path d="m11 7-7 7"/><path d="M4 14l6 6"/>',
  chart:'<path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/>',
  swords:'<path d="m5 4 15 15M19 4 4 19"/><path d="M5 4h4M19 4h-4M5 19h4M19 19h-4"/>',
};
/* Colour icons (filled, two tones). Used by icon('c_...'); styled by svg.ico-c in theme.css. [color, svg inner] */
const ICONS_C = {
  c_map:['#d6a85a','<path d="M2 5l6-2 8 2 6-2v16l-6 2-8-2-6 2z"/><path class="d" d="M8 3v16l8 2V5z"/>'],
  c_kingdom:['#e0a63a','<path d="M2 8l5 4 5-8 5 8 5-4-2 12H4z"/><path class="h" d="M4 17h16l-.4 3H4.4z"/>'],
  c_profile:['#8aa7ff','<circle cx="12" cy="8" r="5"/><path d="M3 22c0-5 4-8 9-8s9 3 9 8z"/>'],
  c_level:['#f2b73c','<path d="M12 2l2.8 6 6.2.7-4.6 4.3 1.2 6.2L12 16l-5.6 3.2 1.2-6.2L3 8.7 9.2 8z"/>'],
  c_xp:['#a78bfa','<path d="M12 1l2.5 8.5L23 12l-8.5 2.5L12 23l-2.5-8.5L1 12l8.5-2.5z"/>'],
  c_rating:['#f2b73c','<path d="M2 11l10-7 10 7v4L12 8 2 15z"/><path class="d" d="M2 17l10-7 10 7v4L12 14 2 21z"/>'],
  c_attack:['#f97316','<path d="M4 2c4 5 6 11 5 20 3-3 4-10-5-20zM11 2c4 5 6 11 5 20 3-3 4-10-5-20zM18 2c3 5 4 11 3 20 2-3 3-10-3-20z"/>'],
  c_defense:['#60a5fa','<path d="M12 2l9 3v7c0 5-4 8-9 10-5-2-9-5-9-10V5z"/><path class="d" d="M12 2v20c5-2 9-5 9-10V5z"/>'],
  c_speed:['#38bdf8','<path d="M2 3l10 9-10 9zM12 3l10 9-10 9z"/>'],
  c_crit:['#fb7185','<circle cx="12" cy="12" r="9"/><circle class="d" cx="12" cy="12" r="5.5"/><circle class="h" cx="12" cy="12" r="2"/>'],
  c_evasion:['#94a3b8','<path class="l" d="M3 8h11a3 3 0 1 0-3-3M3 13h16a3 3 0 1 1-3 3M3 18h8"/>'],
};
function icon(name, extra){
  const cc = ICONS_C[name];
  if(cc){ let ex = extra||''; const col = '--c:'+cc[0]+';';
    ex = /style="/.test(ex) ? ex.replace('style="','style="'+col) : ex+' style="'+col+'"';
    return '<svg viewBox="0 0 24 24" class="ico-c" '+ex+'>'+cc[1]+'</svg>'; }
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '+(extra||'')+'>'+(ICONS[name]||'')+'</svg>';
}

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
function itemIcon(file, size, extra){ return file ? `<img src="${iconUrl(file)}" alt="" decoding="async" class="item-icon" style="width:${size||16}px;height:${size||16}px;${extra||''}">` : ''; }
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
const GEAR_RAR = {common:'#b8ab95',uncommon:'#7fbf7a',rare:'#4fd1ff',epic:'#c9a0ff',legendary:'#ffc35c'};
/* stat chips for a gear piece: stats = {atk:12,...} (exact values) or ranges {atk:[10,14]} */
function gearStatChips(st){
  return Object.entries(st||{}).map(([k,v])=>`<span class="rc-st s-${k}">+${Array.isArray(v)?v[0]+'&ndash;'+v[1]:v} ${k.toUpperCase()}</span>`).join('');
}
/* artImg(base, skinId): the gear picture. With a Shop skin worn (skinId = 'skin_<set>') the picture comes from icons/skins/; if that file is missing the normal picture is shown instead. */
function artImg(base, skinId){
  const m = skinId ? /^(weapon|armor|helmet|gloves|boots|accessory)_/.exec(base) : null, su = m ? skinUrl(skinId, m[1]) : null;
  if(su) return `<img class="rc-art" decoding="async" src="${su}" alt="" data-base="${base}" data-try="0" data-def="${iconUrl(base + '.png')}" onerror="skinFallback(this)">`;
  return `<img class="rc-art" decoding="async" src="${iconUrl(base + '.png')}" alt="" data-base="${base}" data-try="0" onerror="artFallback(this)">`;
}
function skinFallback(img){ img.onerror = function(){ artFallback(this); }; img.src = img.getAttribute('data-def'); }

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
  {id:'kosovo', name:'Kosovo', flag:'xk', resources:['coal','ore'], tax:8},
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
  {id:'puerto_rico', name:'Puerto Rico', flag:'pr', resources:['food','herbs'], tax:10},
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
  {id:'taiwan', name:'Taiwan', flag:'tw', resources:['ore','iron'], tax:12},
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
  const fb = `https://flagcdn.com/w320/${code}.png`;
  const first = k ? `icons/flags/${k.id}.webp` : fb;
  const w = size||16;
  const crop = w<=20; /* xs: square crop of the cloth (hides the torn edge, keeps colour + emblem readable) */
  /* every flag lives in a fixed-ratio box (240:350) -> same shape at every size; if the .webp is missing the flagcdn flag is drawn inside the same banner shape (.fl-fb) */
  return `<span class="fl${crop?' fl-crop':''}" style="width:${w}px;${extra||''}"><img src="${first}" alt="${code.toUpperCase()}" class="fl-img" draggable="false" onerror="if(!this.dataset.fb){this.dataset.fb=1;var p=this.parentNode;p.classList.add('fl-fb');p.style.setProperty('--fb','url(${fb})');this.remove();}"></span>`;
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
/* Gear-slot glyphs (filled, 512x512): game-icons.net, CC BY 3.0 (Lorc, Delapouite and contributors). Credited in Settings.
   weapon=broadsword, armor=breastplate, helmet=spartan-helmet, boots=metal-boot, gloves=gauntlet, accessory=gem-pendant */
const SLOT_GLYPH = {
  weapon:"<path fill=\"currentColor\" d=\"m491.844 22.533l-83.42 14.865L196.572 249.25c3.262 4.815 5.37 10.72 5.37 16.932c0 5.863-1.71 11.35-4.643 15.996a53 53 0 0 0-16.027-2.477c-15.724 0-29.904 6.89-39.69 17.796l-9.112-9.113l17.237-17.237a546 546 0 0 1-13.19-17.6l-19.443 19.44l-13.215-13.215l21.828-21.827a548 548 0 0 1-12.792-20.068L72.093 258.68l58.314 58.314a53 53 0 0 0-2.49 16.063a52.9 52.9 0 0 0 4.592 21.564l-72.14 72.14l-14.56-14.56L21.013 437l14.558 14.56l-8.607 8.608l27.246 27.246l8.606-8.61l14.56 14.56l24.798-24.8l-14.557-14.556l72.158-72.16a52.9 52.9 0 0 0 21.498 4.562a53 53 0 0 0 16.063-2.49l58.363 58.363L296.5 401.48a549 549 0 0 1-20.068-12.793l-21.83 21.83L241.39 397.3l19.442-19.44a550 550 0 0 1-17.603-13.194l-17.238 17.238l-9.16-9.16c10.905-9.785 17.795-23.965 17.795-39.69c0-5.346-.806-10.51-2.285-15.39c4.703-3.04 10.288-4.817 16.265-4.816c6.21 0 11.776 1.77 16.52 4.955L476.98 105.95zm-66.227 53.012l13.215 13.215l-191.684 191.68l-13.214-13.213zM181.273 298.39c19.257 0 34.665 15.41 34.665 34.665c0 19.256-15.408 34.666-34.665 34.666s-34.666-15.41-34.666-34.665s15.41-34.666 34.666-34.666\"/>",
  armor:"<path fill=\"currentColor\" d=\"M324.344 67.25c-44.475 19.314-91.03 25.953-136.656 1.938v39.53c45.86 22.493 90.487 21.026 136.656-.28zM133.72 74.22c-6.81.035-13.448.378-19.876 1c-3.125 24.06 6.117 52.095 24.625 73.78a161 161 0 0 0 19.53-15.72c-6.15-19.57-10.293-38.917-11.625-58.718c-2.14-.095-4.324-.27-6.438-.312c-2.082-.04-4.165-.042-6.218-.03zm245.343 0a249 249 0 0 0-6.22.03c-2.107.042-4.27.218-6.406.313c-1.33 19.8-5.475 39.148-11.625 58.718a161 161 0 0 0 19.532 15.72c18.507-21.685 27.75-49.72 24.625-73.78a218 218 0 0 0-19.908-1zM94.75 78.062c-13.698 2.862-26.024 7.367-36.406 13.593c-.193 29.268 13.016 59.952 33.156 77.22l-1.22 1.405c11.587-2.66 22.214-6.694 31.876-11.624c-19.18-23.47-29.492-52.762-27.406-80.594m323.313 0c2.086 27.83-8.227 57.123-27.407 80.593c9.663 4.93 20.29 8.964 31.875 11.625l-1.217-1.405c20.146-17.273 33.33-47.973 33.125-77.25c-10.376-6.215-22.686-10.704-36.375-13.563zm-377.657 28c-13.318 14.436-20.88 34.407-20.53 62.406c17.887 4.688 34.462 6.026 49.686 4.936c-16.07-18.11-26.396-42.29-29.156-67.344zm432 0c-2.76 25.052-13.084 49.234-29.156 67.343c15.225 1.09 31.8-.248 49.688-4.937c.35-28-7.214-47.97-20.532-62.407zm-133.72 16.406l-.873.436c-24.024 11.837-48.424 18.767-72.907 20.28v214.095c73.59-26.01 122.813-81.045 122.813-144.25c0-13.11-2.14-25.886-6.158-38.155c-17.663-9.017-32.466-20.5-44-32.063l-4.093-4.093l1.842-5.47a340 340 0 0 0 3.375-10.78zm-164.436.436a338 338 0 0 0 3.25 10.344l1.813 5.47l-4.063 4.093c-12.424 12.456-28.62 24.84-48.125 34.125c-3.644 11.637-5.563 23.723-5.563 36.093c0 63.404 50.45 118.71 124.657 144.595V143.28c-24.095-1.254-48.185-7.88-71.97-20.374zM157 326.72a202 202 0 0 0-16.5 15c22.033 17.485 50.57 35.567 79.5 43.374a153 153 0 0 1 16.78-16.313zm197.906 0l-79.78 42.06a153.4 153.4 0 0 1 17.218 16.814c29.006-7.38 57.734-25.302 80.062-42.844c-5.387-5.534-11.177-10.898-17.5-16.03m-226.97 28.905c-6.25 7.537-11.945 15.36-17.25 23.375c23.228 18.444 53.698 37.554 84.25 44.594c3.68-7.79 7.9-15.355 12.783-22.594c-30.46-9.71-58.2-28.08-79.782-45.375zm256.97 1.094c-21.83 17.33-49.757 35.53-80.312 44.874c4.804 7.193 8.967 14.706 12.594 22.437c30.588-6.498 61.223-25.386 84.78-43.874c-5.26-8.024-10.874-15.883-17.062-23.437M100.72 394.936c-5.853 9.823-11.394 19.87-16.97 30.032c28.236 27.185 59.256 42.295 95.28 45.78c2.33-10.074 5.165-19.994 8.657-29.656c-33.072-8.298-63.446-27.63-86.968-46.156zm311.186 1.22c-23.8 18.54-54.345 37.583-87.5 45.406c3.415 9.513 6.18 19.277 8.47 29.187c36.024-3.485 67.044-18.595 95.28-45.78c-5.346-9.746-10.664-19.378-16.25-28.814z\"/>",
  helmet:"<path fill=\"currentColor\" d=\"M253.714 20.358c-8.79.075-17.448.82-25.89 2.308c-46.55 8.208-89.423 26.157-121.225 52.065c-31.803 25.908-52.572 59.39-56.316 100.053l-.004.04l-.004.04c-8.45 83.885 39.397 152.37 65.604 181.553c5.21 5.804 7.064 13.574 6.533 20.862s-3.04 14.494-6.598 21.838c-7.114 14.688-18.703 30.06-31.03 44.457c-13.957 16.303-27.375 29.703-37.75 39.627c7.203-1.214 14.764-4.37 22.67-9.368c14.66-9.265 29.554-24.475 42.097-41.298c12.543-16.824 22.807-35.28 28.802-50.586c2.998-7.654 4.912-14.54 5.614-19.72c.7-5.178-.177-8.39-.354-8.687c-15.34-25.73-31.257-52.027-40.687-79.112s-12.2-55.565-.073-83.35c25.223-57.79 78.02-85.085 130.772-89.605c52.61-4.508 105.963 12.396 136.545 44.71l23.292 22.474l69.254-41.47c-20.34-26.314-55.49-55.33-96.24-76.257c-33.546-17.226-70.702-28.978-106.18-30.428q-4.436-.182-8.832-.144zM372.42 146.184l-.058-.057l.31.313c-.083-.087-.17-.17-.25-.256zM244.814 118.95a167 167 0 0 0-7.4.457c-3.562.305-7.11.73-10.64 1.255l9.628 45.077a117 117 0 0 1 17.646-3.564l-9.233-43.226zm43.85 3.658c-4.866 12.845-7.33 25.916-6.978 39.04c6.034.48 12.086 1.335 18.12 2.557c-.868-12.19 1.306-24.43 6.362-36.98a173 173 0 0 0-17.504-4.617m-106.672 11.79c-6.112 3.028-12 6.54-17.612 10.532c17.55 8.862 29.7 22.763 34.715 39.594a107.4 107.4 0 0 1 15.564-10.063c-6.122-16.257-17.577-30.086-32.666-40.063zm88.136 44.796q-1.734-.003-3.457.047q-4.014.113-7.952.502c-41.993 4.176-77.31 30.258-87.475 90.07c-2.198 12.94 4.293 42.822 12.246 67.66c7.952 24.836 16.634 45.517 16.634 45.517l.504 1.198l.143 1.295c1.96 17.7-9.11 34.967-21.212 52.26c-8.036 11.486-16.43 22.104-23.97 31.72c24-1.35 45.963-11.985 67.177-30.947c-.124-.5-.17-.71-.313-1.297c-.866-3.594-1.955-8.697-1.687-14.68c.446-9.983 5.674-21.958 18.818-31.868c-24.577-35.02-28.898-78.757-24.06-115.027l.886-6.65l6.626-1.05c58.715-9.29 97.246-28.81 139.34-54.593c-27.566-21.88-61.198-34.115-92.25-34.158zm120.197 37.84c-48.424 30.517-91.56 55.67-157.556 67.35c-3.253 33.408 2.427 71.84 25.226 100.798c12.607.61 23.264 6.977 29.904 16.184c6.747 9.353 9.946 21.162 10.83 33.628c23.288 21.426 62.97 39.024 97.764 56.655c-3.17-39.444-.296-76.34-14.538-114.11l-62.842-25.3l-.062-.027c-14.313-6.018-23.332-13.792-26.512-24.03c-3.18-10.236-.874-19.966 1.188-31.064l2.2-11.852l10.74 5.476c23.407 11.94 51.394 20.52 77.548 20.065l6.582-.116l2.103 6.238c10.593 31.436 12.912 56.612 15.752 82.203l7.787 3.113c4.126-29.38 1.912-68.686-3.862-104.425c-5.463-33.817-14.72-65.03-22.252-80.788zM223.397 441.148c-.01.444.094.455.01.04c-.002-.008-.01-.033-.01-.04\"/>",
  boots:"<path fill=\"currentColor\" d=\"m269 23.95l-87.7.1c1.1 61.4-2.4 116.05-14 159.45c-9 34-23.6 61.6-45.2 79c-.1 9.5-.8 19-2.1 28.6c-3.1 22.9-13.5 43.2-22.75 65c23.55-1.3 43.55-11.6 65.35-24.8c20.6-12.5 42.4-27.5 68.9-37.8c-.2-1.4-.4-2.9-.4-4.2c-1.9-23.7.1-52.2 4.1-83.2C243 147.6 257.9 81.05 269 23.95m-105.7.1H80.65c-1.6 36.5 10.1 76.15 21.65 119.15c8.3 30.4 16.5 62.3 19 95.7c12.6-14.3 21.8-34.4 28.6-60c10.8-40.6 14.4-94.15 13.4-154.85m41.8 14.9h.1a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 8.9-9m-2.4 52.5h.1a9 9 0 0 1 9 8.95a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 8.9-8.95m-5.9 56.25h.1a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 8.9-9m-16 60.6h.1a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 8.9-9m-32 48.1h.1a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 8.9-9m85.7 55.3c-22.6 9.6-42.3 22.9-62.6 35c-24.6 14.9-50.5 27.9-81.85 27.5c-8.2 22.7-13.8 48-10 79.9h82.35c13.2-41.4 42.9-78 95.1-106.8c-1.4-1-2.9-2.1-4.3-3.2c-9.6-7.6-15.3-18.8-18.7-32.4m40.2 46.7c-52.1 26.2-80.4 58.5-93.6 95.7h127.4c0-14.3.6-29 3.9-43.6c2.6-11.5 7-22.9 14-33.9c-16.1-3.3-33.5-8.1-51.7-18.2m70.8 21.8c-8.2 10.9-12.8 22.3-15.5 34.3c-2.8 12.5-3.5 25.8-3.5 39.6h104c-2-17.8-12.5-39.8-28.1-52.1c-17.8-13.9-36-17.9-56.9-21.8m8.3 10.5a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9m-254.05 35h.1a9 9 0 0 1 8.95 9a9 9 0 0 1-8.95 9a9 9 0 0 1-9-9a9 9 0 0 1 8.9-9m44.85.6h.1a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 8.9-9m201.5.1a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9M72.05 470v18.1H440V470z\"/>",
  gloves:"<path fill=\"currentColor\" d=\"M123.153 24.602c-11.349.764-48.792 83.005-63.545 132.174c-8.046 26.818 2.983 74.734 41.723 106.45c8.813-1.502 16.946-3.047 24.434-4.626c-22.473-24.22-39.048-50.488-47.772-82.059l-1.021-3.699l1.963-3.299c26.135-43.925 37.681-68.548 50.85-112.24l3.849-12.773l10.402 8.351c14.624 11.743 23.72 18.084 32.098 21.809c-14.428-22.99-31.841-41.36-52.46-50.06a2.2 2.2 0 0 0-.52-.028zm19.791 50.203c-11.724 36.176-24.141 62.49-46.508 100.379c9.004 29.978 25.746 54.616 49.733 78.65c18.744-4.857 32.588-9.929 43.383-14.978c16.875-7.894 26.514-15.73 36.92-23.701c-6.532-34.91-18.944-80.14-38.018-118.375c-14.754-2.769-27.196-8.373-45.51-21.975m90.094 158.008c-9.156 7.022-19.796 14.833-35.861 22.347c-17.365 8.123-40.947 15.887-76.29 22.793c35.349 28.759 64.905 62.213 112.643 82.157c2.79-15.613 10.509-29.532 20.61-39.782c9.547-9.688 21.609-16.383 34.252-16.82c2.202-5.202 5.378-10.557 10.593-14.93c6.41-5.374 15.626-8.323 26.932-8.156a35 35 0 0 1 4.807-5.424c-7.384-1.603-16.19-3.168-27.145-5.586zm120.275 50.299c-.04.009-.084.012-.125.021c-11.264 3.729-12.514 6.776-16.947 16.078c-8.484-1.005-19.247-2.081-25.69 3.16c-6.017 6.313-7.279 12.696-9.685 20.715c-14.012-3.276-25.77 1.842-33.904 9.877c-8.032 8.15-14.35 20.016-16.082 32.65c5.926 2.628 12.109 4.214 18.139 5.727c12.69-15.498 32.27-33.513 50.66-36.851c12.995-13.444 28.669-18.08 41.183-19.891a60 60 0 0 1 11.764-8.4c-6.632-11.786-12.405-18.622-19.313-23.086m-232.011 18.882c-1.967 12.934-7.997 24.573-.64 46.305c32.36 70.655 41.042 23.73 93.735 22.953c-38.944-18.938-66.126-45.737-93.095-69.258m267.765 17.102c-4.87.972-9.343 3.536-13.062 6.28c9.197 12.249 16.987 27.313 23.28 43.81c7.916-2.052 14.75-4.612 21.103-7.506c-6.473-26.762-18.951-37.976-31.32-42.584zm-29.935 13.906c-7.676 1.509-15.588 4.36-22.774 10.35c8.367 8.844 20.976 24.773 26.053 43.283c7.632-1.268 15.91-3.698 21.006-8.576c-6.608-17.858-15.058-33.73-24.285-45.057m-38.139 19.668c-14.313 5.357-25.257 14.981-34.674 25.938l19.383 26.324c13.696-1.49 26.639-6.254 39.39-13.299c-4.69-15.098-18.62-32.912-24.447-38.607zm108.848 24.365c-6.679 3.099-13.973 5.985-22.237 8.375c6.323 10.32 11.618 21.138 15.602 32.543c7.703-3.07 14.902-6.372 21.264-10.082c-3.964-11.28-8.68-22.055-14.63-30.836zM164.687 408.39l49.638 43.377c11.274-13.516 27.044-23.94 42.492-33.942l-22.02-25.32c-24.334-8.01-52.756 2.355-70.11 15.885M391.9 394.153c-6.866 5.056-14.143 7.727-21.795 9.377c5.371 9.31 10.375 19.502 14.354 29.755c7.946-2.139 15.451-4.432 22.344-7.775c-3.648-10.897-8.68-21.303-14.903-31.357m-39.88 14.105c-11.759 6.313-24.191 11.162-37.42 13.545l13.316 27.447c14.663-2.177 28.099-3.684 39.666-9.746c-4.195-10.706-9.777-21.706-15.563-31.246zm98.017 17.156c-6.627 3.604-13.647 6.703-20.846 9.534c2.83 7.167 5.28 14.119 7.21 20.757c10.397-1.435 20.263-5.912 18.179-13.869c-1.423-5.296-2.923-10.83-4.543-16.422M268.82 431.54c-16.062 10.564-31.09 20.975-40.728 32.256l1.392 1.217c16.648 14.548 36.256 20.475 44.95 9.13c8.522-11.12 10.536-24.116-5.614-42.603m144.01 10.957c-7.166 3.334-14.4 5.634-21.465 7.58c3.051 6.991 5.842 13.849 8.244 20.48c9.2-.457 17.732-4.025 19.33-10.442c-1.622-5.49-3.688-11.409-6.109-17.618m-38.437 13.69c-12.724 6.396-25.866 8.467-38.184 10.154l6 12.367c10.038 10.705 32.656 11.336 42.21 2.944c-2.654-7.907-6.1-16.516-10.026-25.465\"/>",
  accessory:"<path fill=\"currentColor\" d=\"M29.018 18.875c-2.63 10.297.047 21.72 8.044 29.72c10.035 10.034 25.46 11.696 37.29 5a605 605 0 0 0 17.357 15.12a30.6 30.6 0 0 0-.522 5.597c0 17.024 14.008 31 31.03 31c4.917 0 9.576-1.17 13.72-3.24a689 689 0 0 0 17.482 11.48a30.7 30.7 0 0 0-.732 6.635c0 17.024 14.008 31 31.03 31c7.577 0 14.55-2.772 19.964-7.345l13.873 8.125a28 28 0 0 0-.414 4.732v38.904L114.07 255.27v160.064l138.284 80.053l138.283-80.053V255.27L286.59 195.037V156.7c0-.983-.067-1.946-.172-2.897c5.393-3.07 10.655-6.08 15.697-8.994c5.226 3.992 11.736 6.377 18.762 6.377c17.023 0 31-13.976 31-31c0-1.867-.176-3.695-.498-5.476a621 621 0 0 0 17.978-12.298c3.97 1.855 8.38 2.9 13.02 2.9c17.023 0 31.03-13.976 31.03-31a30.7 30.7 0 0 0-.553-5.78a912 912 0 0 0 16.318-14.116c11.6 5.714 26.135 3.778 35.736-5.822c7.998-7.998 10.675-19.42 8.045-29.72H452.54c4.018 4.888 3.736 11.916-.85 16.5c-4.887 4.888-12.55 4.89-17.437 0c-4.585-4.585-4.867-11.614-.85-16.5h-20.414c-1.915 7.5-1 15.592 2.72 22.528a890 890 0 0 1-12.034 10.434c-5.575-5.288-13.083-8.555-21.297-8.555c-17.024 0-31.03 14.01-31.03 31.032c0 5.45 1.438 10.583 3.948 15.05a601 601 0 0 1-12.797 8.673c-5.6-5.48-13.24-8.88-21.62-8.88c-17.025 0-31.032 14.01-31.032 31.032c0 3.166.484 6.225 1.383 9.11c-4.23 2.445-8.744 5.028-13.247 7.605a28 28 0 0 0-3.246-2.716c-6.692-4.768-14.72-6.882-22.714-7.014c-7.996-.132-16.15 1.718-22.97 6.504a26 26 0 0 0-2.337 1.85c-4.367-2.573-8.764-5.164-12.947-7.622c.642-2.47.984-5.056.984-7.716c0-17.024-14.007-31.032-31.03-31.032c-7.977 0-15.29 3.075-20.812 8.094a692 692 0 0 1-13.248-8.596a30.66 30.66 0 0 0 3.56-14.34c0-17.025-13.977-31.033-31-31.033c-8.26 0-15.804 3.304-21.388 8.642a586 586 0 0 1-13.79-12.067c3.063-6.575 3.715-14.03 1.94-20.98H68.568c4.018 4.887 3.736 11.915-.85 16.5c-4.887 4.887-12.55 4.888-17.437 0c-4.584-4.586-4.865-11.615-.848-16.5H29.018zm93.2 43.094c6.924 0 12.313 5.42 12.313 12.343s-5.387 12.312-12.31 12.312c-6.926 0-12.345-5.39-12.345-12.313s5.42-12.343 12.344-12.343zm260.157 0c6.924 0 12.344 5.42 12.344 12.343s-5.42 12.312-12.345 12.312c-6.924 0-12.344-5.39-12.344-12.313s5.42-12.343 12.345-12.343zM183.72 107.843c6.922 0 12.343 5.42 12.343 12.344s-5.42 12.312-12.344 12.312c-6.926 0-12.345-5.39-12.345-12.313s5.42-12.343 12.344-12.343zm137.155 0c6.924 0 12.313 5.42 12.313 12.344s-5.39 12.312-12.313 12.312s-12.344-5.39-12.344-12.313s5.42-12.343 12.345-12.343zm-69.164 38.013c4.695.078 9.355 1.536 12.18 3.55c2.826 2.012 4.01 3.805 4.01 7.292v27.52l-15.546-9l-16.526 9.565V156.7c0-4.09 1.258-5.835 3.953-7.725c2.696-1.89 7.237-3.195 11.93-3.118zm-8.122 56.03v32.728l-74.182 43.21l-28.558-16.462zm18.687.67l102.16 59.138l-28.624 16.502l-73.533-42.83zm-9.988 48.62l72.256 42.085l-.002 84.316l-72.253 42.086l-72.256-42.086l.003-84.314l72.254-42.088zm.465 18.33l-56.883 98.15v.724l56.566 32.977L309 368.38v-66.085zm-119.994 8.764l28.586 16.48v84.027l-28.586 16.48V278.272zm239.19.668l-.003 115.648l-28.715-16.553v-82.54zM333.493 393.99l28.414 16.38l-99.63 57.677v-32.574zm-161.77.375l71.864 41.86v32.494l-100.21-58.013l28.345-16.342z\"/>"
};
function slotGlyph(slot, size){
  const b = SLOT_GLYPH[slot]; size = size||16;
  if(!b) return icon(SLOT_ICO[slot]||'shield','style="width:'+size+'px;height:'+size+'px"');
  return '<svg viewBox="0 0 512 512" class="glyph" fill="currentColor" stroke="none" aria-hidden="true" style="width:'+size+'px;height:'+size+'px">'+b+'</svg>';
}

/* Zone action glyphs (filled, 512x512): game-icons.net, CC BY 3.0. step=compass, explore=treasure-map, elite=daemon-skull, boss=crowned-skull (also the boss box) */
const ZONE_GLYPH = {
  step:"<path fill=\"currentColor\" d=\"m203.97 23l-18.032 4.844l11.656 43.468c-25.837 8.076-50.32 21.653-71.594 40.75L94.53 80.594l-13.218 13.22l31.376 31.374c-19.467 21.125-33.414 45.53-41.813 71.343l-42.313-11.343l-4.843 18.063l42.25 11.313c-6.057 27.3-6.157 55.656-.345 83L23.72 308.78l4.843 18.064l41.812-11.22a193.3 193.3 0 0 0 31.25 59.876l-29.97 52.688l-16.81 29.593l29.56-16.842l52.657-29.97a193.3 193.3 0 0 0 60.094 31.407l-11.22 41.844l18.033 4.81l11.218-41.905a195.7 195.7 0 0 0 83-.375l11.312 42.28l18.063-4.81l-11.344-42.376c25.812-8.4 50.217-22.315 71.342-41.78l31.375 31.373l13.22-13.218l-31.47-31.47a193.3 193.3 0 0 0 40.72-71.563l43.53 11.657l4.813-18.063l-43.625-11.686a195.7 195.7 0 0 0-.344-82.063l43.97-11.78l-4.813-18.063L440.908 197c-6.73-20.866-17.08-40.79-31.032-58.844l29.97-52.656l16.842-29.563l-29.593 16.844l-52.656 29.97c-17.998-13.875-37.874-24.198-58.657-30.906l11.783-44L309.5 23l-11.78 43.97c-27-5.925-55.02-6.05-82.064-.376zm201.56 85L297.25 298.313l-.75.437l-40.844-40.875l-148.72 148.72l-2.186 1.25l109.125-191.75l41.78 41.78L405.532 108zm-149.686 10.594c21.858 0 43.717 5.166 63.594 15.47l-116.625 66.342l-2.22 1.28l-1.28 2.22l-66.25 116.406c-26.942-52.04-18.616-117.603 25.03-161.25c26.99-26.988 62.38-40.468 97.75-40.468zm122.72 74.594c26.994 52.054 18.67 117.672-25.002 161.343c-43.66 43.662-109.263 52.005-161.312 25.033l116.438-66.282l2.25-1.25l1.25-2.25l66.375-116.592z\"/>",
  explore:"<path fill=\"currentColor\" d=\"M227.4 34.7c-10.1 0-20.2.2-30.2.5l6.1 65.6l-61.1-62.5c-31.3 2.5-62.5 6.6-93.8 12.5l34.2 28.4l-48-.6c35.1 100.2 6.9 182.6-.3 292.1L130 476.5c10-1.3 19.9-2.4 29.6-3.3l21.5-42.2l18.6 28.8l41.5-33.5l.8 43c82.9-.2 157.7 9.1 235.7 7.9c-28.2-73-31.2-143.6-31.9-209.2l-33.3-19.1l32.7-33.9c-.4-21.3-1.3-42-3.6-61.9l-57.4.7l50.2-41.7c-3.8-15.5-9-30.4-16.1-44.7l-29.5-23.9C335 38 281.2 34.6 227.4 34.7m58.7 37c10.6 24.75 21.1 49.5 31.7 74.3c7.5-10.5 14.9-21 22.4-31.5c16 27.2 32 54.3 48 81.5l-16.2 9.5l-33.3-56.7l-42.5 59.4l-15.2-10.9l24-33.5l-21.9-51.5l-24.6 40.1l12 22.6l-16.5 8.8l-18.3-34.5l-24.8 58.2l-17.2-7.4l32.5-76.2l7.7-18c4.8 9.2 9.6 18.3 14.5 27.4c12.5-20.6 25.1-41.11 37.7-61.6M91.2 128c6.72 1.6 13.4 3.4 19.2 5.3c-2.1 5.9-4.1 11.8-6.2 17.6c-5.79-1.6-11.72-3.4-16.9-4.7c1.39-6 2.62-12.1 3.9-18.2m37.9 13.4c6.3 3.8 12 7.2 17 12.8L132.6 167c-4-3.7-8.6-7-12.8-9.4zm28.7 32.3c2.1 7.4 2.1 15.7 1.6 22.5l-18.5-2.4c.1-5.1.3-10-1-14.5zm-21.2 35.7l17.2 7.1c-3.3 6.6-5.1 12.7-8.6 17.8l-16.3-9c2.6-5.4 5.6-10.8 7.7-15.9m-16.5 34.1l17.7 6.1c-1.5 5.4-3 11.2-3.6 16.2l-18.6-2c1.3-7.5 2.1-14 4.5-20.3m207.8 17.4c8.5 1 14.6 3 21.7 7.1l-9.8 16c-4.1-2.8-9.4-3.8-13.5-4.5zm-21.2 1.5c1.1 6.1 2.5 12.2 3.9 18.3c-5.9 1.3-11.7 3.3-16.5 5.1l-6.8-17.4c6.7-2.4 13.5-4.7 19.4-6m-37.9 15.9l11 15.1c-5.6 4-11.8 7.8-16.8 10.6l-8.9-16.4c5.1-2.9 10.6-6.3 14.7-9.3M135.3 281c1.5 4.7 4.2 9.2 6.9 12.1l-13.8 12.6c-5.5-5.7-9.5-13.5-11.2-20.1zm230.3 3.3c3.5 6.4 6.8 12.7 8.7 19.1l-17.8 5.6c-2-5.4-4.3-10.8-6.8-14.8zm-127.4 10.9l6.9 17.3c-6.4 2.7-12.9 4.8-18.6 6.5l-5-18c5.9-1.6 11.3-3.8 16.7-5.8m-83.8 6.2c5.3 1.7 10.8 3.4 15.7 4.2c-1.2 6.1-2 12.3-2.8 18.5c-7-1-14.5-3.3-20.5-5.7zm50 3.5l2.8 18.5c-7.2 1.3-13.4 1.6-19.8 1.9l-.4-18.7c5.9-.2 11.6-.8 17.4-1.7m174.5 18c1 6.4 1.6 12.9 2.2 19.3l-18.7 1.5c-.4-6-.9-11.9-2-17.8zm-67.6 30.8c18.9 3.5 44.9 16.2 68.9 33.9c7.4-9.9 14.4-20.4 21.3-31.1l30.1 12.9c-4.7 12.3-15 25.6-28.6 37.2c17 16.2 30.9 34.5 37 53c-13.8-18.1-31.1-31.8-50.3-42.8c-23.4 15.8-52.7 25.9-79.6 20.4c22.9-4.4 40.6-16.6 55.8-32.6c-16.5-7.5-33.8-13.9-51.3-20.1z\"/>",
  elite:"<path fill=\"currentColor\" d=\"M142.026 16.89C94.242 38.888 62.71 74.257 62.71 113.927c0 26.11 13.42 50.288 36.22 70.04c-11.664 25.398-18.99 53.91-20.81 84.212c17.194.562 33.53 4.205 48.192 11.7c41.566 21.25 61.083 66.944 57.787 121.093a287 287 0 0 0 23.122 4.58c.894-16.76.83-33.468-.496-50.122l18.63-1.485c1.438 18.035 1.466 36.014.458 53.938c8.022.76 16.14 1.21 24.322 1.382V353.03h18.687v56.13c7.83-.25 15.693-.755 23.565-1.514c-.995-17.845-.96-35.745.47-53.7l18.63 1.485c-1.323 16.597-1.39 33.247-.504 49.95c7.307-1.07 14.6-2.355 21.863-3.843c-3.467-54.395 16.04-100.333 57.748-121.656c14.66-7.497 30.998-11.142 48.19-11.702c-1.843-30.716-9.343-59.594-21.284-85.252c22.08-19.56 35.044-43.346 35.044-69c0-39.67-31.532-75.04-79.316-97.035C386.283 33.46 394.32 53.31 394.32 74.27c0 42.688-31.51 79.614-77.026 97.146l-6.14-14.3c11.148-4.44 21.233-10.197 29.876-16.964c10.1-7.905 18.202-17.087 23.91-27.154c-29.85-25.333-66.642-40.283-106.488-40.283c-40.34 0-77.554 15.314-107.6 41.223c5.674 9.7 13.588 18.555 23.372 26.214c9.67 7.57 21.145 13.877 33.894 18.49l-6.125 14.264c-47.677-16.863-81.06-54.696-81.06-98.636c0-20.96 8.038-40.81 21.093-57.377zm10.286 183.128c.054-.004.1.004.127.037c18.414 23.35 51.93 39.697 91.086 43.162c-5.892 19.698-26.99 34.53-52.67 34.53c-30.21 0-55.148-20.584-55.148-45.517c.002-12.465 6.205-23.997 16.11-32.173c.083.094.33-.027.494-.04zm211.668.002c.053-.003.1.006.138.04c9.907 8.175 16.112 19.707 16.112 32.173c0 24.93-24.937 45.515-55.15 45.515c-25.68 0-46.776-14.83-52.67-34.53c39.156-3.466 72.673-19.813 91.087-43.16c.112.085.322-.03.483-.038M258.4 244.174c5.625 27.42 13.928 54.84 32.91 82.26c-20.274 5.432-44.818 5.627-65.82 0c17.968-27.42 26.834-54.84 32.91-82.26m-76.31 175.54c-2.34 15.4-6.413 31.3-12.25 47.372a169 169 0 0 0 27.663 14.637c3.627-19.225 6.537-38.376 8.33-57.455a309 309 0 0 1-23.744-4.553zm152.802.48a409 409 0 0 1-22.526 3.888c1.777 18.972 4.655 38.015 8.248 57.13a169 169 0 0 0 26.452-14.126c-5.776-15.906-9.824-31.644-12.174-46.893zm-41.094 6.115c-8.335.8-16.668 1.323-24.975 1.58v65.694a158 158 0 0 0 33.973-6.01c-3.898-20.343-7.058-40.766-8.998-61.265zm-69.402.237c-1.953 20.54-5.13 41.002-9.043 61.385a158 158 0 0 0 34.783 5.773v-65.713a349 349 0 0 1-25.74-1.445\"/>",
  boss:"<path fill=\"currentColor\" d=\"m92.406 13.02l-.164 156.353c3.064.507 6.208 1.38 9.39 2.627c36.496 14.306 74.214 22.435 111.864 25.473l43.402-60.416l42.317 58.906c36.808-4.127 72.566-12.502 105.967-24.09c3.754-1.302 7.368-2.18 10.818-2.6l1.523-156.252l-75.82 95.552l-34.084-95.55l-53.724 103.74l-53.722-103.74l-35.442 95.55l-72.32-95.55h-.006zm164.492 156.07l-28.636 39.86l28.634 39.86l28.637-39.86zM86.762 187.55c-2.173-.08-3.84.274-5.012.762c-2.345.977-3.173 2.19-3.496 4.196c-.645 4.01 2.825 14.35 23.03 21.36c41.7 14.468 84.262 23.748 126.778 26.833l-17.75-24.704c-38.773-3.285-77.69-11.775-115.5-26.596c-3.197-1.253-5.877-1.77-8.05-1.85zm333.275.19c-2.156.052-5.048.512-8.728 1.79c-33.582 11.65-69.487 20.215-106.523 24.646l-19.264 26.818c40.427-2.602 80.433-11.287 119.22-26.96c15.913-6.43 21.46-17.81 21.36-22.362c-.052-2.276-.278-2.566-1.753-3.274c-.738-.353-2.157-.71-4.313-.658zm-18.117 47.438c-42.5 15.87-86.26 23.856-130.262 25.117l-14.76 20.547l-14.878-20.71c-44.985-1.745-89.98-10.23-133.905-24.306c-12.78 28.51-18.94 61.14-19.603 93.44c37.52 17.497 62.135 39.817 75.556 64.63C177 417.8 179.282 443.62 174.184 467.98c7.72 5.007 16.126 9.144 24.98 12.432l5.557-47.89l18.563 2.154l-5.935 51.156c9.57 2.21 19.443 3.53 29.377 3.982v-54.67h18.69v54.49c9.903-.638 19.705-2.128 29.155-4.484l-5.857-50.474l18.564-2.155l5.436 46.852c8.747-3.422 17.004-7.643 24.506-12.69c-5.758-24.413-3.77-49.666 9.01-72.988c13.28-24.234 37.718-46 74.803-64.29c-.62-33.526-6.687-66.122-19.113-94.23zm-266.733 47.006c34.602.23 68.407 12.236 101.358 36.867c-46.604 33.147-129.794 34.372-108.29-36.755q3.472-.135 6.933-.11zm242.825 0q3.46-.023 6.93.11c21.506 71.128-61.684 69.903-108.288 36.757c32.95-24.63 66.756-36.637 101.358-36.866zM255.164 332.14c11.77 21.725 19.193 43.452 25.367 65.178h-50.737c4.57-21.726 13.77-43.45 25.37-65.18z\"/>"
};
function zoneGlyph(id, size){
  const b = ZONE_GLYPH[id]; size = size||24;
  if(!b) return '';
  return '<svg viewBox="0 0 512 512" class="glyph" fill="currentColor" stroke="none" aria-hidden="true" style="width:'+size+'px;height:'+size+'px">'+b+'</svg>';
}

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
  {id:'frost',   name:'Frost Steel',   base:'#5b86b5', bright:'#9cc3ec'},   // DEFAULT theme (first = fallback for new players and for old/unknown ids)
  {id:'bronze',  name:'Bronze & Gold', base:'#b77932', bright:'#ffc35c'},   // the base CSS, no data-theme attribute
  {id:'emerald', name:'Emerald',       base:'#2f9a78', bright:'#6fd2a8'},
  {id:'violet',  name:'Royal Violet',  base:'#7d54c4', bright:'#c4a0ff'},
  {id:'crimson', name:'Crimson Ember', base:'#b03a34', bright:'#e8665c'}
];
function getColorScheme(id){
  return COLOR_SCHEMES.find(s=>s.id===id) || COLOR_SCHEMES[0];
}


/* ---------- SHOP (cosmetics only; the catalog and prices live on the server: functions/lib/shop.js) ---------- */
const RARITY = {common:{label:'Common', color:'#b9a98a'}, uncommon:{label:'Uncommon', color:'#7fbf7a'}, rare:{label:'Rare', color:'#4da3ff'}, epic:{label:'Epic', color:'#b66dff'}, legendary:{label:'Legendary', color:'#ffb23e'}};
/* Gear skins (Shop > Skins): each set repaints the pictures of your gear. Files: icons/skins/<set>_<slot>_<rarity>.webp (6 slots per set).
   The rarity of a set is part of its file names, so it is repeated here; functions/lib/shop.js sells it under the id 'skin_<set>' (tools/test-shop-skins.js checks both agree). */
const SKIN_SETS = {school:'common', pirate:'common', aviation:'uncommon', tactical:'uncommon', sakura:'rare', wasteland:'rare', shrine:'epic', gnawa:'epic', idol:'legendary', vampire:'legendary'};
const SKIN_SLOTS = ['weapon','helmet','armor','gloves','boots','accessory'];
function skinUrl(skinId, slot){
  const set = String(skinId||'').replace(/^skin_/, ''), tier = SKIN_SETS[set];
  return tier && SKIN_SLOTS.includes(slot) ? 'icons/skins/' + set + '_' + slot + '_' + tier + '.webp' : null;
}
/* Gem packs. The prices are PLACEHOLDERS shown to the player. Real checkout needs a payment provider + a server webhook that calls
   Shop.creditGems (functions/lib/shop.js): until then CHECKOUT_ENABLED stays false and the Buy buttons only explain that. */
const CHECKOUT_ENABLED = false;
const GEM_PACKS = [
  {id:'g100',  gems:100,  bonus:0,   price:'$0.99'},
  {id:'g550',  gems:550,  bonus:50,  price:'$4.99'},
  {id:'g1200', gems:1200, bonus:200, price:'$9.99', popular:true},
  {id:'g2600', gems:2600, bonus:600, price:'$19.99'},
];
