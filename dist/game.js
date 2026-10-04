/* ---- js/config.js ---- */

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
  {t:'flavor', w:40}, {t:'gold', w:18}, {t:'resource', w:16}, {t:'xp', w:6}, {t:'item', w:3}, {t:'monster', w:17},
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

;
/* ---- js/engine.js ---- */

/* ============================================================
   UTIL
   ============================================================ */
function rnd(min,max){ return Math.random()*(max-min)+min; }
function rndInt(min,max){ return Math.floor(rnd(min,max+1)); }
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function pick(arr){ return arr[rndInt(0, arr.length-1)]; }
function uid(){ return 'x'+Math.random().toString(36).slice(2,10)+Date.now().toString(36); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtNum(n){ return Math.round(n).toLocaleString('en-US'); }
function fmtDmg(n){ // compact: 950 / 12.3K / 3.85M / 1.2B
  n = Math.round(Number(n)||0); const a = Math.abs(n);
  if(a >= 1e9) return (n/1e9).toFixed(2).replace(/\.?0+$/,'')+'B';
  if(a >= 1e6) return (n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M';
  if(a >= 1e4) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K';
  return n.toLocaleString('en-US');
}
function plural(n, one, many){ return n+' '+(n===1?one:(many||one+'s')); }
function fmtMs(ms){
  if(ms<=0) return '0:00';
  if(ms>=3600000){ // an hour or more: days / hours / minutes instead of a huge M:SS
    const t = Math.floor(ms/60000), d = Math.floor(t/1440), h = Math.floor(t%1440/60), mi = t%60;
    return (d?d+'d ':'')+((d||h)?h+'h ':'')+mi+'m';
  }
  const s = Math.ceil(ms/1000);
  const m = Math.floor(s/60), r = s%60;
  return m+':'+String(r).padStart(2,'0');
}

/* ============================================================
   CHARACTER MODEL
   ============================================================ */
function newCharacter(id, username, classId){
  const cls = CLASSES[classId];
  const now = Date.now();
  const c = {
    id, username, class: classId, level:1, xp:0,
    colorScheme: 'brass',
    gold:150,
    hpCur: cls.base.hp, energyCur:100, resourceCur:0, manaCur:20,
    generalSkills:{health:0,damage:0,defense:0,stamina:0,storage:0},
    classSkills:{}, skillPoints:0,
    equipment:{weapon:null,armor:null,helmet:null,boots:null,gloves:null,accessory:null},
    inventory:[],
    resourceBag:{wood:0,stone:0,food:0,coal:0,iron:0,ore:0,herbs:0,leather:0,frost:0,voidessence:0},
    pvp:{rating:1000, wins:0, losses:0, protectedUntil:0},
    bossCooldowns:{},
    kingdomId:null, kingdomRole:null, kingdomJoinedAt:0, kingdomCooldownUntil:0,
    lastEnergyAt: now, lastHpAt: now, lastManaAt: now,
    createdAt: now, updatedAt: now,
  };
  cls.skills.forEach(s=> c.classSkills[s.id]=0);
  // starting equipment (crude, weak, non-tiered "starter" gear)
  const w = makeEquipment('weapon', 'common', 1); w.name = cls.startEq.weapon; w.starter=true;
  const a = makeEquipment('armor', 'common', 1); a.name = cls.startEq.armor; a.starter=true;
  c.equipment.weapon = w; c.equipment.armor = a;
  return c;
}

function makeEquipment(slot, tierId, level){
  const tier = TIERS.find(t=>t.id===tierId) || TIERS[0];
  const base = 3 + level*1.4;
  const stats = {};
  if(slot==='weapon'){ stats.atk = Math.round(base*1.3*tier.mult); }
  else if(slot==='armor'){ stats.def = Math.round(base*0.85*tier.mult); stats.hp = Math.round(base*3*tier.mult); }
  else if(slot==='helmet'){ stats.def = Math.round(base*0.55*tier.mult); stats.hp = Math.round(base*1.4*tier.mult); }
  else if(slot==='boots'){ stats.spd = Math.round(base*0.5*tier.mult); stats.eva = Math.round(base*0.3*tier.mult); }
  else if(slot==='gloves'){ stats.atk = Math.round(base*0.45*tier.mult); stats.crit = Math.round(base*0.22*tier.mult); }
  else if(slot==='accessory'){ stats.crit = Math.round(base*0.35*tier.mult); stats.eva = Math.round(base*0.35*tier.mult); }
  return {
    uid: uid(), kind:'equipment', slot, tier: tier.id,
    name: tier.name + ' ' + SLOT_NOUN[slot],
    level, stats,
  };
}

function xpNeeded(level){ return XP_FOR_LEVEL(level); }

function effectiveStats(c){
  const cls = CLASSES[c.class];
  const lvl = c.level;
  let hp = cls.base.hp + cls.growth.hp*(lvl-1) + c.generalSkills.health*8;
  let atk = cls.base.atk + cls.growth.atk*(lvl-1) + c.generalSkills.damage*2;
  let def = cls.base.def + cls.growth.def*(lvl-1) + c.generalSkills.defense*2;
  let spd = cls.base.spd + cls.growth.spd*(lvl-1);
  let crit = cls.base.crit + cls.growth.crit*(lvl-1);
  let eva = cls.base.eva + cls.growth.eva*(lvl-1);
  EQUIP_SLOTS.forEach(slot=>{
    const it = c.equipment[slot];
    if(it && it.stats){
      hp += it.stats.hp||0; atk += it.stats.atk||0; def += it.stats.def||0;
      spd += it.stats.spd||0; crit += it.stats.crit||0; eva += it.stats.eva||0;
    }
  });
  const maxEnergy = 100 + c.generalSkills.stamina*6;
  const maxMana = c.class==='mage' ? (20 + lvl*4) : (20 + Math.floor(lvl*0.5));
  const resourceMax = c.class==='mage' ? maxMana : 100;
  const storageCap = 500 + c.generalSkills.storage*40;
  return {
    maxHp: Math.round(hp), atk: Math.round(atk), def: Math.round(def),
    spd: Math.round(spd*10)/10, crit: Math.round(crit*10)/10, eva: Math.round(eva*10)/10,
    maxEnergy: Math.round(maxEnergy), maxMana: Math.round(maxMana),
    resourceMax: Math.round(resourceMax), storageCap: Math.round(storageCap),
  };
}

function bagCount(c){ return c.inventory.length; }
function resourceTotal(c){ return Object.values(c.resourceBag).reduce((a,b)=>a+b,0); }

function applyRegen(c){
  const now = Date.now();
  const eff = effectiveStats(c);
  // Energy: continuous, timestamp-based regen at ENERGY_REGEN_RATE_PER_HOUR of Max Energy
  // per hour. Computed from elapsed real time (not a fixed tick), so it accrues correctly
  // no matter how long the game was closed, and never exceeds maxEnergy.
  const elapsedMs = Math.max(0, now - c.lastEnergyAt);
  if(elapsedMs > 0){
    const gained = elapsedMs * (ENERGY_REGEN_RATE_PER_HOUR * eff.maxEnergy) / (60*60*1000);
    c.energyCur = clamp(c.energyCur + gained, 0, eff.maxEnergy);
    c.lastEnergyAt = now;
  }
  const hTicks = Math.floor((now - c.lastHpAt) / HP_REGEN_MS);
  if(hTicks>0){ c.hpCur = clamp(c.hpCur + hTicks*Math.max(1,Math.round(eff.maxHp*HP_REGEN_PCT)), 0, eff.maxHp); c.lastHpAt += hTicks*HP_REGEN_MS; }
  const mTicks = Math.floor((now - c.lastManaAt) / MANA_REGEN_MS);
  if(mTicks>0){ c.manaCur = clamp(c.manaCur + mTicks*MANA_REGEN_AMT, 0, eff.maxMana); c.lastManaAt += mTicks*MANA_REGEN_MS; }
  c.hpCur = clamp(c.hpCur, 0, eff.maxHp);
  c.energyCur = clamp(c.energyCur, 0, eff.maxEnergy);
  if(c.class!=='mage') c.manaCur = clamp(c.manaCur, 0, eff.maxMana);
}

// UI-only helper: how much Energy regenerates per hour, and how long until the next
// whole point / a full refill. The real Energy value always comes from applyRegen()
// above — this is purely for the countdown display.
function energyRegenInfo(c, eff){
  const perHour = energyRegenPerHour(eff.maxEnergy);
  if(c.energyCur >= eff.maxEnergy || perHour<=0) return { perHour, msToNext:0, msToFull:0 };
  const msPerPoint = (60*60*1000) / (ENERGY_REGEN_RATE_PER_HOUR * eff.maxEnergy);
  const remainingFraction = 1 - (c.energyCur % 1);
  return {
    perHour,
    msToNext: remainingFraction * msPerPoint,
    msToFull: (eff.maxEnergy - c.energyCur) * msPerPoint,
  };
}

/* ============================================================
   COMBAT ENGINE
   (Written as a self-contained "trusted" module: in a full
   Firebase build this logic runs server-side in a Cloud
   Function; the client would only ever send an action name
   and receive the resolved outcome. In this in-browser
   prototype it runs locally so the loop is instantly playable.)
   ============================================================ */
function buildCombatant(character, isPlayerSide, label){
  const eff = effectiveStats(character);
  const cls = CLASSES[character.class];
  return {
    label: String(label || character.username || '').replace(/[<>&"'`]/g,''),
    isPlayerSide,
    charRef: character,
    class: character.class,
    level: character.level,
    resourceName: cls.resource,
    maxHp: eff.maxHp, hp: isPlayerSide ? clamp(character.hpCur,1,eff.maxHp) : eff.maxHp,
    atk: eff.atk, def: eff.def, spd: eff.spd, crit: eff.crit, eva: eff.eva,
    resourceMax: eff.resourceMax,
    resource: isPlayerSide ? (character.class==='mage' ? clamp(character.manaCur,0,eff.resourceMax) : clamp(character.resourceCur,0,eff.resourceMax)) : Math.round(eff.resourceMax*0.6),
    buffs: [],
    skills: cls.skills,
    skillLevels: character.classSkills || {},
  };
}
function buildMonster(zone, level, name, kind){
  const isBoss = kind==='boss', isElite = kind==='elite';
  const em = isElite ? 1.7 : 1;
  const hpMult = isBoss ? BOSS_MULT.hp : em;
  const atkMult = isBoss ? BOSS_MULT.atk : em;
  const defMult = isBoss ? BOSS_MULT.def : em;
  const hp = Math.round((38 + level*11 + rnd(-4,4)) * hpMult);
  const atk = Math.round((6 + level*2.1 + rnd(-1,1)) * atkMult);
  const def = Math.round((3 + level*1.25 + rnd(-1,1)) * defMult);
  const spdMult = isBoss ? 1.15 : isElite ? 1.15 : 1;
  const spd = Math.round((5 + level*0.75)*10)/10 * spdMult;
  const critVal = isBoss ? 11 : isElite ? 9 : 5;
  const evaVal = isBoss ? 8 : isElite ? 7 : 4;
  const label = isBoss ? name : (isElite ? 'Elite ' : '') + name;
  return {
    label, isPlayerSide:false, class:null, level,
    resourceName:null, maxHp:hp, hp, atk, def, spd, crit:critVal, eva:evaVal,
    resourceMax:0, resource:0, buffs:[], skills:[], isMonster:true, isElite, isBoss,
  };
}
// ELO change for ONE side of a fight. result: 'win' | 'lose' | 'draw'. A win always gives at least +1, a loss at least -1.
function pvpRatingChange(myRating, oppRating, result){
  const expected = 1/(1+Math.pow(10, (oppRating-myRating)/400));
  const score = result==='win' ? 1 : result==='lose' ? 0 : 0.5;
  let delta = Math.round(ELO_K * (score-expected));
  if(result==='win' && delta<1) delta = 1;
  if(result==='lose' && delta>-1) delta = -1;
  const newRating = clamp(myRating+delta, RATING_FLOOR, 100000);
  return { delta: newRating-myRating, newRating };
}

function buildBotOpponent(level, rating){
  const classId = pick(Object.keys(CLASSES));
  const bot = newCharacter('bot_'+uid(), pick(BOT_NAMES), classId);
  bot.level = clamp(level, 1, 200);
  bot.pvp.rating = rating;
  const skillLevel = clamp(Math.floor(bot.level/3), 0, MAX_SKILL_LEVEL);
  CLASSES[classId].skills.forEach(s=> bot.classSkills[s.id] = skillLevel);
  Object.keys(bot.generalSkills).forEach(k=> bot.generalSkills[k] = clamp(Math.floor(bot.level/4),0,GENERAL_SKILL_MAX));
  const gearTier = bot.level>=55?'rare':bot.level>=25?'uncommon':'common';
  EQUIP_SLOTS.forEach(slot=>{ bot.equipment[slot] = makeEquipment(slot, gearTier, bot.level); });
  const eff = effectiveStats(bot);
  bot.hpCur = eff.maxHp; bot.energyCur = eff.maxEnergy; bot.resourceCur = eff.resourceMax; bot.manaCur = eff.maxMana;
  bot.isBot = true;
  return bot;
}

function tickBuffs(fighter){
  fighter.buffs = fighter.buffs.filter(b=>{ b.rounds -= 1; return b.rounds > 0; });
}
function buffTotal(fighter, stat){
  return fighter.buffs.filter(b=>b.stat===stat).reduce((a,b)=>a+b.amount,0);
}
function liveStat(fighter, stat){
  return fighter[stat] + buffTotal(fighter, stat);
}
function rollDamage(att, def, mult, ignoreDefPct, forceCrit, critBonus){
  const atkStat = liveStat(att,'atk') * (mult||1);
  const defStat = liveStat(def,'def') * (1-(ignoreDefPct||0));
  let dmg = Math.max(2, atkStat - defStat*0.5);
  dmg *= rnd(0.87, 1.13);
  const critChance = clamp((liveStat(att,'crit') + (critBonus||0)) , 0, 90);
  const isCrit = forceCrit || (Math.random()*100 < critChance);
  if(isCrit) dmg *= 1.6;
  const evaChance = clamp(liveStat(def,'eva') - liveStat(att,'crit')*0.15, 0, 55);
  const evaded = Math.random()*100 < evaChance;
  if(evaded) dmg = 0;
  return { dmg: Math.round(dmg), crit:isCrit, evaded };
}
function resourceGainOnAttack(fighter){
  if(fighter.resourceMax<=0) return;
  fighter.resource = clamp(fighter.resource + Math.round(fighter.resourceMax*0.15), 0, fighter.resourceMax);
}

// Executes one actor's action against target. Returns log lines (array of {text,cls}).
function performAction(actor, target, action, skillLevel){
  const logs = [];
  const name = actor.label;
  if(action.kind==='attack'){
    const r = rollDamage(actor, target, action.boosted ? 1.5 : 1);
    if(r.evaded){ logs.push({text:`${name}'s attack is evaded by ${target.label}.`, cls:''}); }
    else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({text: action.boosted ? `${name} unleashes a savage blow for ${r.dmg}${r.crit?' (critical!)':''}!` : `${name} attacks for ${r.dmg}${r.crit?' (critical!)':''}.`, cls:'hit'}); }
    resourceGainOnAttack(actor);
  } else if(action.kind==='defend'){
    actor.buffs.push({stat:'def', amount: Math.round(liveStat(actor,'def')*0.6), rounds:2, tag:'Defend'});
    resourceGainOnAttack(actor);
    logs.push({text:`${name} braces to defend, sharply raising Defense.`, cls:'good'});
  } else if(action.kind==='item'){
    const item = action.item;
    if(item.effect.heal){ const amt = Math.round(actor.maxHp*item.effect.heal); actor.hp = clamp(actor.hp+amt, 0, actor.maxHp); logs.push({text:`${name} drinks a ${item.name}, recovering ${amt} HP.`, cls:'good'}); }
    if(item.effect.energy){ logs.push({text:`${name} drinks a ${item.name}, recovering Energy.`, cls:'good'}); }
  } else if(action.kind==='skill'){
    const s = action.skill;
    const lvl = skillLevel||0;
    actor.resource = clamp(actor.resource - s.cost, 0, actor.resourceMax);
    switch(s.type){
      case 'damage': {
        const mult = s.mult + s.multPerLvl*lvl;
        const r = rollDamage(actor, target, mult);
        if(r.evaded) logs.push({text:`${name} uses ${s.name}, but it's evaded!`, cls:''});
        else { target.hp = clamp(target.hp-r.dmg,0,target.maxHp); logs.push({text:`${name} uses ${s.name} for ${r.dmg}${r.crit?' (critical!)':''}.`, cls:'hit'}); }
        break;
      }
      case 'damage_crit_boost': {
        const mult = s.mult + s.multPerLvl*lvl;
        const r = rollDamage(actor, target, mult, 0, false, s.critBonus);
        if(r.evaded) logs.push({text:`${name} uses ${s.name}, but it's evaded!`, cls:''});
        else { target.hp = clamp(target.hp-r.dmg,0,target.maxHp); logs.push({text:`${name} uses ${s.name} for ${r.dmg}${r.crit?' (critical!)':''}.`, cls:'hit'}); }
        break;
      }
      case 'damage_ignore_def': {
        const mult = s.mult + s.multPerLvl*lvl;
        const r = rollDamage(actor, target, mult, s.ignorePct);
        if(r.evaded) logs.push({text:`${name} uses ${s.name}, but it's evaded!`, cls:''});
        else { target.hp = clamp(target.hp-r.dmg,0,target.maxHp); logs.push({text:`${name} uses ${s.name} for ${r.dmg}, piercing defenses.`, cls:'hit'}); }
        break;
      }
      case 'damage_resource_refund': {
        const mult = s.mult + s.multPerLvl*lvl;
        const r = rollDamage(actor, target, mult);
        actor.resource = clamp(actor.resource + s.refund, 0, actor.resourceMax);
        if(r.evaded) logs.push({text:`${name} uses ${s.name}, but it's evaded!`, cls:''});
        else { target.hp = clamp(target.hp-r.dmg,0,target.maxHp); logs.push({text:`${name} uses ${s.name} for ${r.dmg}, and feels a surge of ${actor.resourceName}.`, cls:'hit'}); }
        break;
      }
      case 'damage_debuff_atk': {
        const mult = s.mult + s.multPerLvl*lvl;
        const r = rollDamage(actor, target, mult);
        target.buffs.push({stat:'atk', amount:-Math.round(liveStat(target,'atk')*s.debuff), rounds:s.duration, tag:s.name});
        if(r.evaded) logs.push({text:`${name} uses ${s.name}, but it's evaded!`, cls:''});
        else { target.hp = clamp(target.hp-r.dmg,0,target.maxHp); logs.push({text:`${name} uses ${s.name} for ${r.dmg}, weakening ${target.label}'s Attack.`, cls:'hit'}); }
        break;
      }
      case 'damage_gold_bonus': {
        const mult = s.mult + s.multPerLvl*lvl;
        const r = rollDamage(actor, target, mult);
        actor._goldBonusPct = s.goldBonusPct;
        if(r.evaded) logs.push({text:`${name} uses ${s.name}, but it's evaded!`, cls:''});
        else { target.hp = clamp(target.hp-r.dmg,0,target.maxHp); logs.push({text:`${name} uses ${s.name} for ${r.dmg}.`, cls:'hit'}); }
        break;
      }
      case 'buff_def': {
        const amt = Math.round(s.amount + s.amountPerLvl*lvl);
        actor.buffs.push({stat:'def', amount:amt, rounds:s.duration, tag:s.name});
        logs.push({text:`${name} uses ${s.name}, raising Defense.`, cls:'good'});
        break;
      }
      case 'buff_atk': {
        const amt = Math.round(s.amount + s.amountPerLvl*lvl);
        actor.buffs.push({stat:'atk', amount:amt, rounds:s.duration, tag:s.name});
        logs.push({text:`${name} uses ${s.name}, raising Attack.`, cls:'good'});
        break;
      }
      case 'buff_spd_eva': {
        const amt = Math.round(s.amount + s.amountPerLvl*lvl);
        actor.buffs.push({stat:'spd', amount:amt, rounds:s.duration, tag:s.name});
        actor.buffs.push({stat:'eva', amount:amt, rounds:s.duration, tag:s.name});
        logs.push({text:`${name} uses ${s.name}, becoming faster and harder to hit.`, cls:'good'});
        break;
      }
      case 'buff_def_resource': {
        const amt = Math.round(s.amount + s.amountPerLvl*lvl);
        actor.buffs.push({stat:'def', amount:amt, rounds:s.duration, tag:s.name});
        actor.resource = clamp(actor.resource + s.refund, 0, actor.resourceMax);
        logs.push({text:`${name} uses ${s.name}, raising Defense and recovering ${actor.resourceName}.`, cls:'good'});
        break;
      }
      case 'heal': {
        const pct = s.pct + s.pctPerLvl*lvl;
        const amt = Math.round(actor.maxHp*pct);
        actor.hp = clamp(actor.hp+amt, 0, actor.maxHp);
        logs.push({text:`${name} uses ${s.name}, recovering ${amt} HP.`, cls:'good'});
        break;
      }
      case 'heal_and_def': {
        const pct = s.pct + s.pctPerLvl*lvl;
        const amt = Math.round(actor.maxHp*pct);
        actor.hp = clamp(actor.hp+amt, 0, actor.maxHp);
        actor.buffs.push({stat:'def', amount:s.defAmount, rounds:s.duration, tag:s.name});
        logs.push({text:`${name} uses ${s.name}, recovering ${amt} HP and raising Defense.`, cls:'good'});
        break;
      }
    }
  } else if(action.kind==='flee'){
    logs.push({text:`${name} attempts to flee...`, cls:''});
  }
  return logs;
}

function chooseAiAction(actor, target){
  const hpPct = actor.hp/actor.maxHp;
  const affordable = actor.skills.filter(s=> actor.resource >= s.cost);
  if(hpPct < 0.3 && affordable.some(s=>/heal/.test(s.type))){
    const s = affordable.find(x=>/heal/.test(x.type));
    return {kind:'skill', skill:s};
  }
  if(actor.isMonster){
    if(Math.random() < (actor.isBoss ? 0.3 : 0.22)) return {kind:'attack', boosted:true};
    return {kind:'attack'};
  }
  if(affordable.length && Math.random()<0.6){
    return {kind:'skill', skill: pick(affordable)};
  }
  if(hpPct < 0.35 && Math.random()<0.3){
    return {kind:'defend'};
  }
  return {kind:'attack'};
}

;
/* ---- js/server-local.js ---- */
/* ============================================================
   server-local.js — Cloud Functions logic running IN THE BROWSER.
   Generated from functions/index.js + functions/lib/*.js so the game works
   on the free Spark plan (no Blaze). Same code, same Firestore documents.
   NOTE: because it runs on the client, players can cheat. When Blaze is on,
   remove this file's <script> tag and storage.js goes back to Cloud Functions.
   ============================================================ */
(function(){
'use strict';
const __defs = {}, __cache = {};
function __require(name){
  if(name === 'firebase-admin') return __admin;
  if(name === 'firebase-functions') return __functions;
  const key = name.replace(/^\.\/(lib\/)?/, '');
  if(__cache[key]) return __cache[key].exports;
  const m = { exports: {} }; __cache[key] = m;
  __defs[key](m, m.exports, __require);
  return m.exports;
}
const __admin = {
  initializeApp(){},
  firestore: Object.assign(function(){ return firebase.firestore(); }, { FieldValue: { increment: (n)=>firebase.firestore.FieldValue.increment(n) } }),
};
class HttpsError extends Error {
  constructor(code, message, details){ super(message); this.code = code; this.details = details || {}; }
}
const __functions = { https: { HttpsError, onCall: (fn)=>fn } };
__defs['errors'] = function(module, exports, require){
"use strict";

// Thrown by war.js / economy.js. index.js converts it to functions.https.HttpsError,
// so this logic can be unit-tested without firebase-functions installed.
class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details || {};
  }
}
function fail(code, message, details) { throw new ApiError(code, message, details); }

module.exports = { ApiError, fail };

};
__defs['countries'] = function(module, exports, require){
"use strict";

// Server copy of the country list (id / name / natural resources / base tax %).
// MUST stay in sync with KINGDOMS in js/config.js — functions/test/countries.test.js checks this.
const COUNTRIES = [
  {id:'afghanistan', name:'Afghanistan', resources:['stone','herbs'], tax:7},
  {id:'albania', name:'Albania', resources:['coal','herbs'], tax:7},
  {id:'algeria', name:'Algeria', resources:['ore','leather'], tax:12},
  {id:'andorra', name:'Andorra', resources:['iron','food'], tax:15},
  {id:'angola', name:'Angola', resources:['ore','iron'], tax:8},
  {id:'antigua_and_barbuda', name:'Antigua and Barbuda', resources:['leather','food'], tax:11},
  {id:'argentina', name:'Argentina', resources:['leather','food'], tax:11},
  {id:'armenia', name:'Armenia', resources:['ore','leather'], tax:6},
  {id:'australia', name:'Australia', resources:['iron','wood'], tax:11},
  {id:'austria', name:'Austria', resources:['coal','food'], tax:15},
  {id:'azerbaijan', name:'Azerbaijan', resources:['herbs','food'], tax:9},
  {id:'bahamas', name:'Bahamas', resources:['herbs','wood'], tax:8},
  {id:'bahrain', name:'Bahrain', resources:['stone','iron'], tax:15},
  {id:'bangladesh', name:'Bangladesh', resources:['ore','leather'], tax:6},
  {id:'barbados', name:'Barbados', resources:['food','ore'], tax:7},
  {id:'belarus', name:'Belarus', resources:['ore','stone'], tax:15},
  {id:'belgium', name:'Belgium', resources:['herbs','iron'], tax:7},
  {id:'belize', name:'Belize', resources:['stone','leather'], tax:7},
  {id:'benin', name:'Benin', resources:['ore','wood'], tax:8},
  {id:'bhutan', name:'Bhutan', resources:['food','iron'], tax:15},
  {id:'bolivia', name:'Bolivia', resources:['ore','wood'], tax:10},
  {id:'bosnia_and_herzegovina', name:'Bosnia and Herzegovina', resources:['herbs','iron'], tax:9},
  {id:'botswana', name:'Botswana', resources:['wood','stone'], tax:15},
  {id:'brazil', name:'Brazil', resources:['wood','herbs'], tax:12},
  {id:'brunei', name:'Brunei', resources:['coal','leather'], tax:15},
  {id:'bulgaria', name:'Bulgaria', resources:['coal','herbs'], tax:6},
  {id:'burkina_faso', name:'Burkina Faso', resources:['herbs','food'], tax:11},
  {id:'burundi', name:'Burundi', resources:['herbs','leather'], tax:15},
  {id:'cambodia', name:'Cambodia', resources:['stone','food'], tax:7},
  {id:'cameroon', name:'Cameroon', resources:['herbs','iron'], tax:13},
  {id:'canada', name:'Canada', resources:['wood','frost'], tax:7},
  {id:'cape_verde', name:'Cape Verde', resources:['wood','herbs'], tax:14},
  {id:'central_african_republic', name:'Central African Republic', resources:['stone','food'], tax:14},
  {id:'chad', name:'Chad', resources:['wood','coal'], tax:13},
  {id:'chile', name:'Chile', resources:['coal','stone'], tax:15},
  {id:'china', name:'China', resources:['herbs','leather'], tax:10},
  {id:'colombia', name:'Colombia', resources:['stone','herbs'], tax:10},
  {id:'comoros', name:'Comoros', resources:['stone','iron'], tax:13},
  {id:'costa_rica', name:'Costa Rica', resources:['herbs','wood'], tax:15},
  {id:'croatia', name:'Croatia', resources:['ore','food'], tax:8},
  {id:'cuba', name:'Cuba', resources:['iron','herbs'], tax:12},
  {id:'cyprus', name:'Cyprus', resources:['wood','herbs'], tax:11},
  {id:'czechia', name:'Czechia', resources:['iron','stone'], tax:15},
  {id:'dr_congo', name:'DR Congo', resources:['leather','stone'], tax:11},
  {id:'denmark', name:'Denmark', resources:['stone','iron'], tax:6},
  {id:'djibouti', name:'Djibouti', resources:['herbs','food'], tax:15},
  {id:'dominica', name:'Dominica', resources:['iron','stone'], tax:12},
  {id:'dominican_republic', name:'Dominican Republic', resources:['stone','iron'], tax:13},
  {id:'ecuador', name:'Ecuador', resources:['food','stone'], tax:12},
  {id:'egypt', name:'Egypt', resources:['stone','food'], tax:11},
  {id:'el_salvador', name:'El Salvador', resources:['iron','herbs'], tax:15},
  {id:'equatorial_guinea', name:'Equatorial Guinea', resources:['leather','herbs'], tax:8},
  {id:'eritrea', name:'Eritrea', resources:['leather','ore'], tax:6},
  {id:'estonia', name:'Estonia', resources:['leather','herbs'], tax:14},
  {id:'eswatini', name:'Eswatini', resources:['food','leather'], tax:14},
  {id:'ethiopia', name:'Ethiopia', resources:['stone','food'], tax:12},
  {id:'fiji', name:'Fiji', resources:['food','herbs'], tax:12},
  {id:'finland', name:'Finland', resources:['leather','wood'], tax:13},
  {id:'france', name:'France', resources:['food','wood'], tax:14},
  {id:'gabon', name:'Gabon', resources:['coal','herbs'], tax:15},
  {id:'gambia', name:'Gambia', resources:['herbs','iron'], tax:6},
  {id:'georgia', name:'Georgia', resources:['ore','food'], tax:13},
  {id:'germany', name:'Germany', resources:['iron','coal'], tax:15},
  {id:'ghana', name:'Ghana', resources:['herbs','leather'], tax:15},
  {id:'greece', name:'Greece', resources:['coal','food'], tax:8},
  {id:'grenada', name:'Grenada', resources:['stone','iron'], tax:12},
  {id:'guatemala', name:'Guatemala', resources:['stone','leather'], tax:14},
  {id:'guinea', name:'Guinea', resources:['iron','leather'], tax:15},
  {id:'guinea_bissau', name:'Guinea-Bissau', resources:['food','ore'], tax:15},
  {id:'guyana', name:'Guyana', resources:['stone','ore'], tax:6},
  {id:'haiti', name:'Haiti', resources:['wood','herbs'], tax:15},
  {id:'honduras', name:'Honduras', resources:['herbs','leather'], tax:6},
  {id:'hungary', name:'Hungary', resources:['leather','wood'], tax:15},
  {id:'iceland', name:'Iceland', resources:['food','wood'], tax:15},
  {id:'india', name:'India', resources:['herbs','wood'], tax:9},
  {id:'indonesia', name:'Indonesia', resources:['food','herbs'], tax:15},
  {id:'iran', name:'Iran', resources:['ore','food'], tax:6},
  {id:'iraq', name:'Iraq', resources:['coal','food'], tax:13},
  {id:'ireland', name:'Ireland', resources:['leather','food'], tax:15},
  {id:'israel', name:'Israel', resources:['coal','stone'], tax:8},
  {id:'italy', name:'Italy', resources:['food','herbs'], tax:12},
  {id:'ivory_coast', name:'Ivory Coast', resources:['leather','stone'], tax:6},
  {id:'jamaica', name:'Jamaica', resources:['food','herbs'], tax:15},
  {id:'japan', name:'Japan', resources:['iron','voidessence'], tax:15},
  {id:'jordan', name:'Jordan', resources:['iron','leather'], tax:11},
  {id:'kazakhstan', name:'Kazakhstan', resources:['food','ore'], tax:15},
  {id:'kenya', name:'Kenya', resources:['leather','herbs'], tax:6},
  {id:'kiribati', name:'Kiribati', resources:['food','iron'], tax:9},
  {id:'kuwait', name:'Kuwait', resources:['herbs','food'], tax:15},
  {id:'kyrgyzstan', name:'Kyrgyzstan', resources:['iron','ore'], tax:9},
  {id:'laos', name:'Laos', resources:['wood','ore'], tax:15},
  {id:'latvia', name:'Latvia', resources:['wood','herbs'], tax:15},
  {id:'lebanon', name:'Lebanon', resources:['stone','herbs'], tax:15},
  {id:'lesotho', name:'Lesotho', resources:['wood','herbs'], tax:12},
  {id:'liberia', name:'Liberia', resources:['coal','herbs'], tax:7},
  {id:'libya', name:'Libya', resources:['coal','herbs'], tax:13},
  {id:'liechtenstein', name:'Liechtenstein', resources:['coal','iron'], tax:12},
  {id:'lithuania', name:'Lithuania', resources:['ore','stone'], tax:11},
  {id:'luxembourg', name:'Luxembourg', resources:['food','wood'], tax:12},
  {id:'madagascar', name:'Madagascar', resources:['leather','herbs'], tax:8},
  {id:'malawi', name:'Malawi', resources:['leather','iron'], tax:12},
  {id:'malaysia', name:'Malaysia', resources:['iron','wood'], tax:15},
  {id:'maldives', name:'Maldives', resources:['iron','wood'], tax:13},
  {id:'mali', name:'Mali', resources:['ore','herbs'], tax:15},
  {id:'malta', name:'Malta', resources:['coal','herbs'], tax:15},
  {id:'marshall_islands', name:'Marshall Islands', resources:['herbs','leather'], tax:11},
  {id:'mauritania', name:'Mauritania', resources:['wood','iron'], tax:11},
  {id:'mauritius', name:'Mauritius', resources:['leather','wood'], tax:11},
  {id:'mexico', name:'Mexico', resources:['ore','herbs'], tax:10},
  {id:'micronesia', name:'Micronesia', resources:['stone','iron'], tax:8},
  {id:'moldova', name:'Moldova', resources:['coal','stone'], tax:15},
  {id:'monaco', name:'Monaco', resources:['iron','stone'], tax:14},
  {id:'mongolia', name:'Mongolia', resources:['iron','food'], tax:11},
  {id:'montenegro', name:'Montenegro', resources:['wood','stone'], tax:12},
  {id:'morocco', name:'Morocco', resources:['stone','iron'], tax:10},
  {id:'mozambique', name:'Mozambique', resources:['iron','ore'], tax:15},
  {id:'myanmar', name:'Myanmar', resources:['ore','iron'], tax:6},
  {id:'namibia', name:'Namibia', resources:['ore','iron'], tax:6},
  {id:'nauru', name:'Nauru', resources:['leather','iron'], tax:6},
  {id:'nepal', name:'Nepal', resources:['food','leather'], tax:9},
  {id:'netherlands', name:'Netherlands', resources:['herbs','leather'], tax:8},
  {id:'new_zealand', name:'New Zealand', resources:['food','wood'], tax:6},
  {id:'nicaragua', name:'Nicaragua', resources:['wood','herbs'], tax:15},
  {id:'niger', name:'Niger', resources:['coal','wood'], tax:9},
  {id:'nigeria', name:'Nigeria', resources:['wood','herbs'], tax:6},
  {id:'north_korea', name:'North Korea', resources:['food','herbs'], tax:8},
  {id:'north_macedonia', name:'North Macedonia', resources:['coal','iron'], tax:15},
  {id:'norway', name:'Norway', resources:['iron','stone'], tax:12},
  {id:'oman', name:'Oman', resources:['leather','herbs'], tax:12},
  {id:'pakistan', name:'Pakistan', resources:['ore','herbs'], tax:15},
  {id:'palau', name:'Palau', resources:['food','herbs'], tax:12},
  {id:'palestine', name:'Palestine', resources:['leather','herbs'], tax:12},
  {id:'panama', name:'Panama', resources:['herbs','iron'], tax:15},
  {id:'papua_new_guinea', name:'Papua New Guinea', resources:['food','iron'], tax:10},
  {id:'paraguay', name:'Paraguay', resources:['stone','iron'], tax:9},
  {id:'peru', name:'Peru', resources:['herbs','leather'], tax:15},
  {id:'philippines', name:'Philippines', resources:['coal','wood'], tax:11},
  {id:'poland', name:'Poland', resources:['ore','leather'], tax:14},
  {id:'portugal', name:'Portugal', resources:['wood','food'], tax:15},
  {id:'qatar', name:'Qatar', resources:['wood','coal'], tax:15},
  {id:'republic_of_the_congo', name:'Republic of the Congo', resources:['coal','herbs'], tax:6},
  {id:'romania', name:'Romania', resources:['leather','iron'], tax:7},
  {id:'russia', name:'Russia', resources:['frost','coal'], tax:14},
  {id:'rwanda', name:'Rwanda', resources:['coal','herbs'], tax:15},
  {id:'saint_kitts_and_nevis', name:'Saint Kitts and Nevis', resources:['leather','stone'], tax:13},
  {id:'saint_lucia', name:'Saint Lucia', resources:['coal','herbs'], tax:12},
  {id:'saint_vincent_and_the_grenadines', name:'Saint Vincent and the Grenadines', resources:['wood','stone'], tax:10},
  {id:'samoa', name:'Samoa', resources:['iron','ore'], tax:15},
  {id:'san_marino', name:'San Marino', resources:['herbs','food'], tax:13},
  {id:'sao_tome_and_principe', name:'Sao Tome and Principe', resources:['iron','herbs'], tax:15},
  {id:'saudi_arabia', name:'Saudi Arabia', resources:['ore','coal'], tax:6},
  {id:'senegal', name:'Senegal', resources:['herbs','iron'], tax:14},
  {id:'serbia', name:'Serbia', resources:['stone','iron'], tax:15},
  {id:'seychelles', name:'Seychelles', resources:['herbs','ore'], tax:15},
  {id:'sierra_leone', name:'Sierra Leone', resources:['iron','ore'], tax:8},
  {id:'singapore', name:'Singapore', resources:['leather','herbs'], tax:8},
  {id:'slovakia', name:'Slovakia', resources:['herbs','food'], tax:13},
  {id:'slovenia', name:'Slovenia', resources:['stone','herbs'], tax:7},
  {id:'solomon_islands', name:'Solomon Islands', resources:['leather','herbs'], tax:13},
  {id:'somalia', name:'Somalia', resources:['iron','leather'], tax:12},
  {id:'south_africa', name:'South Africa', resources:['stone','food'], tax:9},
  {id:'south_korea', name:'South Korea', resources:['ore','voidessence'], tax:15},
  {id:'south_sudan', name:'South Sudan', resources:['coal','herbs'], tax:7},
  {id:'spain', name:'Spain', resources:['food','leather'], tax:9},
  {id:'sri_lanka', name:'Sri Lanka', resources:['food','ore'], tax:13},
  {id:'sudan', name:'Sudan', resources:['iron','food'], tax:15},
  {id:'suriname', name:'Suriname', resources:['ore','iron'], tax:15},
  {id:'sweden', name:'Sweden', resources:['leather','herbs'], tax:15},
  {id:'switzerland', name:'Switzerland', resources:['food','ore'], tax:8},
  {id:'syria', name:'Syria', resources:['ore','wood'], tax:10},
  {id:'tajikistan', name:'Tajikistan', resources:['herbs','wood'], tax:9},
  {id:'tanzania', name:'Tanzania', resources:['ore','leather'], tax:7},
  {id:'thailand', name:'Thailand', resources:['wood','iron'], tax:15},
  {id:'timor_leste', name:'Timor-Leste', resources:['ore','leather'], tax:12},
  {id:'togo', name:'Togo', resources:['leather','food'], tax:15},
  {id:'tonga', name:'Tonga', resources:['leather','food'], tax:9},
  {id:'trinidad_and_tobago', name:'Trinidad and Tobago', resources:['food','stone'], tax:11},
  {id:'tunisia', name:'Tunisia', resources:['herbs','food'], tax:8},
  {id:'turkey', name:'Turkey', resources:['iron','herbs'], tax:13},
  {id:'turkmenistan', name:'Turkmenistan', resources:['stone','iron'], tax:15},
  {id:'tuvalu', name:'Tuvalu', resources:['herbs','iron'], tax:8},
  {id:'uganda', name:'Uganda', resources:['food','ore'], tax:15},
  {id:'ukraine', name:'Ukraine', resources:['leather','ore'], tax:13},
  {id:'united_arab_emirates', name:'United Arab Emirates', resources:['stone','wood'], tax:8},
  {id:'united_kingdom', name:'United Kingdom', resources:['coal','leather'], tax:13},
  {id:'united_states', name:'United States', resources:['stone','ore'], tax:15},
  {id:'uruguay', name:'Uruguay', resources:['stone','iron'], tax:9},
  {id:'uzbekistan', name:'Uzbekistan', resources:['coal','wood'], tax:12},
  {id:'vanuatu', name:'Vanuatu', resources:['herbs','food'], tax:11},
  {id:'vatican_city', name:'Vatican City', resources:['coal','stone'], tax:8},
  {id:'venezuela', name:'Venezuela', resources:['iron','stone'], tax:10},
  {id:'vietnam', name:'Vietnam', resources:['ore','food'], tax:14},
  {id:'yemen', name:'Yemen', resources:['herbs','iron'], tax:11},
  {id:'zambia', name:'Zambia', resources:['iron','leather'], tax:11},
  {id:'zimbabwe', name:'Zimbabwe', resources:['stone','wood'], tax:15},
];

const COUNTRY_BY_ID = {};
COUNTRIES.forEach((c) => { COUNTRY_BY_ID[c.id] = c; });

module.exports = { COUNTRIES, COUNTRY_BY_ID };

};
__defs['game-core'] = function(module, exports, require){
"use strict";
/* ============================================================
   SERVER-SIDE GAME CORE
   This is a Node/CommonJS port of the PURE (no-DOM) formulas from
   js/config.js and js/engine.js. It must be kept in sync with those
   files by hand — there is no build step that shares them between
   the browser bundle and Cloud Functions in this project.
   Only what PvE/Elite/Boss combat + rewards need is included.
   ============================================================ */

function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pick(arr) { return arr[rndInt(0, arr.length - 1)]; }
function uid() { return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

/* ---- config.js subset ---- */
const XP_FOR_LEVEL = (lvl) => Math.round(35 * Math.pow(lvl, 1.4));
const BAG_CAPACITY = 40;
const PVE_MAX_ROUNDS = 30;
const ELO_K = 32; // unused here (PvP not yet migrated), kept for parity
const RATING_FLOOR = 100;
const ENERGY_REGEN_RATE_PER_HOUR = 0.2;
function energyRegenPerHour(maxEnergy) { return Math.round(maxEnergy * ENERGY_REGEN_RATE_PER_HOUR); }

const CLASSES = {
  warrior: { id: 'warrior', name: 'Warrior', resource: 'Rage',
    base: { hp: 130, atk: 13, def: 12, spd: 7, crit: 4, eva: 3 },
    growth: { hp: 15, atk: 2.1, def: 2.0, spd: 0.35, crit: 0.12, eva: 0.10 },
    skills: [
      { id: 'power_strike', name: 'Power Strike', cost: 20, type: 'damage', mult: 1.55, multPerLvl: 0.05 },
      { id: 'iron_armor', name: 'Iron Armor', cost: 15, type: 'buff_def', amount: 9, amountPerLvl: 3, duration: 3 },
      { id: 'warrior_spirit', name: 'Warrior Spirit', cost: 25, type: 'heal', pct: 0.09, pctPerLvl: 0.012 },
    ] },
  archer: { id: 'archer', name: 'Archer', resource: 'Precision',
    base: { hp: 95, atk: 15, def: 6, spd: 13, crit: 14, eva: 12 },
    growth: { hp: 9, atk: 2.3, def: 1.0, spd: 0.55, crit: 0.35, eva: 0.30 },
    skills: [
      { id: 'keen_eye', name: 'Keen Eye', cost: 20, type: 'damage_crit_boost', mult: 1.45, multPerLvl: 0.05, critBonus: 25 },
      { id: 'swiftness', name: 'Swiftness', cost: 15, type: 'buff_spd_eva', amount: 6, amountPerLvl: 1.4, duration: 3 },
      { id: 'efficient_aim', name: 'Efficient Aim', cost: 20, type: 'damage_ignore_def', mult: 1.3, multPerLvl: 0.04, ignorePct: 0.5 },
    ] },
  mage: { id: 'mage', name: 'Mage', resource: 'Mana',
    base: { hp: 78, atk: 19, def: 4, spd: 9, crit: 8, eva: 5 },
    growth: { hp: 7, atk: 2.9, def: 0.7, spd: 0.30, crit: 0.20, eva: 0.15 },
    skills: [
      { id: 'arcane_power', name: 'Arcane Power', cost: 16, type: 'damage', mult: 2.0, multPerLvl: 0.07 },
      { id: 'magic_shield', name: 'Magic Shield', cost: 12, type: 'buff_def', amount: 14, amountPerLvl: 3.4, duration: 2 },
      { id: 'mana_force', name: 'Mana Force', cost: 10, type: 'damage_resource_refund', mult: 1.35, multPerLvl: 0.05, refund: 12 },
    ] },
  commander: { id: 'commander', name: 'Commander', resource: 'Command Points',
    base: { hp: 135, atk: 12, def: 14, spd: 7, crit: 5, eva: 4 },
    growth: { hp: 16, atk: 1.9, def: 2.3, spd: 0.30, crit: 0.15, eva: 0.12 },
    skills: [
      { id: 'war_banner', name: 'War Banner', cost: 20, type: 'buff_atk', amount: 7, amountPerLvl: 1.8, duration: 3 },
      { id: 'iron_will', name: 'Iron Will', cost: 20, type: 'heal_and_def', pct: 0.06, pctPerLvl: 0.008, defAmount: 8, duration: 2 },
      { id: 'command_aura', name: 'Command Aura', cost: 20, type: 'damage_debuff_atk', mult: 1.35, multPerLvl: 0.04, debuff: 0.2, duration: 2 },
    ] },
  merchant: { id: 'merchant', name: 'Merchant', resource: 'Fortune',
    base: { hp: 100, atk: 12, def: 9, spd: 9, crit: 8, eva: 7 },
    growth: { hp: 11, atk: 2.0, def: 1.4, spd: 0.35, crit: 0.22, eva: 0.18 },
    skills: [
      { id: 'profitable_deal', name: 'Profitable Deal', cost: 15, type: 'damage_gold_bonus', mult: 1.4, multPerLvl: 0.05, goldBonusPct: 0.4 },
      { id: 'deep_pockets', name: 'Deep Pockets', cost: 10, type: 'buff_def_resource', amount: 7, amountPerLvl: 1.6, duration: 3, refund: 15 },
      { id: 'lucky', name: 'Lucky', cost: 15, type: 'damage_crit_boost', mult: 1.3, multPerLvl: 0.04, critBonus: 30 },
    ] },
};

const ZONES = [
  { id: 'plains', name: 'Plains', min: 1, max: 10, monsters: ['Wild Boar', 'Field Rat', 'Bandit Scout'], resources: ['wood', 'food'], boss: 'Grukk the Boarking', dropTable: [{ t: 'common', w: 75 }, { t: 'uncommon', w: 23 }, { t: 'rare', w: 2 }] },
  { id: 'forest', name: 'Forest', min: 10, max: 25, monsters: ['Dire Wolf', 'Forest Troll', 'Rogue Archer'], resources: ['wood', 'herbs'], boss: 'Malrend, Heart of the Wood', dropTable: [{ t: 'common', w: 60 }, { t: 'uncommon', w: 32 }, { t: 'rare', w: 8 }] },
  { id: 'mountain', name: 'Mountain', min: 25, max: 40, monsters: ['Rock Golem', 'Mountain Harpy', 'Iron Bandit'], resources: ['stone', 'iron'], boss: 'Thorrgun, the Cliff Titan', dropTable: [{ t: 'common', w: 45 }, { t: 'uncommon', w: 35 }, { t: 'rare', w: 18 }, { t: 'epic', w: 2 }] },
  { id: 'cave', name: 'Cave', min: 40, max: 55, monsters: ['Cave Spider', 'Bat Swarm', 'Gloom Wraith'], resources: ['coal', 'iron'], boss: 'Skarn, Lord of the Deep', dropTable: [{ t: 'common', w: 35 }, { t: 'uncommon', w: 35 }, { t: 'rare', w: 25 }, { t: 'epic', w: 5 }] },
  { id: 'swamp', name: 'Swamp', min: 55, max: 70, monsters: ['Bog Serpent', 'Swamp Witch', 'Rot Beast'], resources: ['herbs', 'leather'], boss: 'Vessyr the Rotmother', dropTable: [{ t: 'common', w: 20 }, { t: 'uncommon', w: 35 }, { t: 'rare', w: 32 }, { t: 'epic', w: 12 }, { t: 'legendary', w: 1 }] },
  { id: 'darkzone', name: 'Dark Zone', min: 70, max: 100, monsters: ['Shadow Knight', 'Void Reaver', 'Nightmare Construct'], resources: ['iron', 'ore'], boss: 'Kaelthorn, the Hollow King', dropTable: [{ t: 'common', w: 10 }, { t: 'uncommon', w: 25 }, { t: 'rare', w: 35 }, { t: 'epic', w: 25 }, { t: 'legendary', w: 5 }] },
  { id: 'frozen', name: 'Frozen Wastes', min: 100, max: 150, monsters: ['Frost Wraith', 'Ice Golem', 'Winter Stalker'], resources: ['frost', 'iron'], boss: 'Ysmera, the Everfrost Queen', dropTable: [{ t: 'uncommon', w: 10 }, { t: 'rare', w: 35 }, { t: 'epic', w: 40 }, { t: 'legendary', w: 15 }] },
  { id: 'abyss', name: 'Abyssal Rift', min: 150, max: 300, uncapped: true, monsters: ['Abyssal Horror', 'Void Sentinel', 'Nether Devourer'], resources: ['voidessence', 'ore'], boss: 'Nyxul, Devourer of Light', dropTable: [{ t: 'rare', w: 10 }, { t: 'epic', w: 40 }, { t: 'legendary', w: 50 }] },
];

const EQUIP_SLOTS = ['weapon', 'armor', 'helmet', 'boots', 'gloves', 'accessory'];
const SLOT_NOUN = { weapon: 'Blade', armor: 'Plate', helmet: 'Helm', boots: 'Boots', gloves: 'Gauntlets', accessory: 'Charm' };
const TIERS = [
  { id: 'common', name: 'Common', mult: 1.0 },
  { id: 'uncommon', name: 'Uncommon', mult: 1.35 },
  { id: 'rare', name: 'Rare', mult: 1.8 },
  { id: 'epic', name: 'Epic', mult: 2.4 },
  { id: 'legendary', name: 'Legendary', mult: 3.3 },
];
const BOSS_ENERGY_COST = 30;
const BOSS_COOLDOWN_MS = 30 * 60 * 1000;
const BOSS_MULT = { hp: 2.3, atk: 1.35, def: 1.2 };

function pickTierForBoss(zone) {
  const pool = zone.dropTable.slice(-2);
  const total = pool.reduce((a, x) => a + x.w, 0) || 1;
  let r = rnd(0, total);
  for (const x of pool) { if (r < x.w) return TIERS.find(t => t.id === x.t); r -= x.w; }
  return TIERS.find(t => t.id === pool[pool.length - 1].t);
}
function pickTierForZone(zone, elite) {
  let table = zone.dropTable.map(x => Object.assign({}, x));
  if (elite) {
    table = table.map(x => {
      if (x.t === 'common') return { t: x.t, w: Math.max(1, Math.round(x.w * 0.35)) };
      if (x.t === 'epic' || x.t === 'legendary') return { t: x.t, w: Math.round(x.w * 1.8) };
      return x;
    });
  }
  const total = table.reduce((a, x) => a + x.w, 0);
  let r = rnd(0, total);
  for (const x of table) { if (r < x.w) return TIERS.find(t => t.id === x.t); r -= x.w; }
  return TIERS.find(t => t.id === table[0].t) || TIERS[0];
}
function makeEquipment(slot, tierId, level) {
  const tier = TIERS.find(t => t.id === tierId) || TIERS[0];
  const base = 3 + level * 1.4;
  const stats = {};
  if (slot === 'weapon') { stats.atk = Math.round(base * 1.3 * tier.mult); }
  else if (slot === 'armor') { stats.def = Math.round(base * 0.85 * tier.mult); stats.hp = Math.round(base * 3 * tier.mult); }
  else if (slot === 'helmet') { stats.def = Math.round(base * 0.55 * tier.mult); stats.hp = Math.round(base * 1.4 * tier.mult); }
  else if (slot === 'boots') { stats.spd = Math.round(base * 0.5 * tier.mult); stats.eva = Math.round(base * 0.3 * tier.mult); }
  else if (slot === 'gloves') { stats.atk = Math.round(base * 0.45 * tier.mult); stats.crit = Math.round(base * 0.22 * tier.mult); }
  else if (slot === 'accessory') { stats.crit = Math.round(base * 0.35 * tier.mult); stats.eva = Math.round(base * 0.35 * tier.mult); }
  return { uid: uid(), kind: 'equipment', slot, tier: tier.id, name: tier.name + ' ' + SLOT_NOUN[slot], level, stats };
}

/* ---- engine.js subset ---- */
function xpNeeded(level) { return XP_FOR_LEVEL(level); }

function effectiveStats(c) {
  const cls = CLASSES[c.class];
  const lvl = c.level;
  let hp = cls.base.hp + cls.growth.hp * (lvl - 1) + c.generalSkills.health * 8;
  let atk = cls.base.atk + cls.growth.atk * (lvl - 1) + c.generalSkills.damage * 2;
  let def = cls.base.def + cls.growth.def * (lvl - 1) + c.generalSkills.defense * 2;
  let spd = cls.base.spd + cls.growth.spd * (lvl - 1);
  let crit = cls.base.crit + cls.growth.crit * (lvl - 1);
  let eva = cls.base.eva + cls.growth.eva * (lvl - 1);
  EQUIP_SLOTS.forEach(slot => {
    const it = c.equipment[slot];
    if (it && it.stats) {
      hp += it.stats.hp || 0; atk += it.stats.atk || 0; def += it.stats.def || 0;
      spd += it.stats.spd || 0; crit += it.stats.crit || 0; eva += it.stats.eva || 0;
    }
  });
  const maxEnergy = 100 + c.generalSkills.stamina * 6;
  const maxMana = c.class === 'mage' ? (20 + lvl * 4) : (20 + Math.floor(lvl * 0.5));
  const resourceMax = c.class === 'mage' ? maxMana : 100;
  return {
    maxHp: Math.round(hp), atk: Math.round(atk), def: Math.round(def),
    spd: Math.round(spd * 10) / 10, crit: Math.round(crit * 10) / 10, eva: Math.round(eva * 10) / 10,
    maxEnergy: Math.round(maxEnergy), maxMana: Math.round(maxMana), resourceMax: Math.round(resourceMax),
  };
}

function applyEnergyRegen(c) {
  const now = Date.now();
  const eff = effectiveStats(c);
  const elapsedMs = Math.max(0, now - (c.lastEnergyAt || now));
  let energyCur = c.energyCur || 0;
  if (elapsedMs > 0) {
    const gained = elapsedMs * (ENERGY_REGEN_RATE_PER_HOUR * eff.maxEnergy) / (60 * 60 * 1000);
    energyCur = clamp(energyCur + gained, 0, eff.maxEnergy);
  }
  return { energyCur: clamp(energyCur, 0, eff.maxEnergy), maxEnergy: eff.maxEnergy, now };
}

function buildCombatant(character, isPlayerSide, label) {
  const eff = effectiveStats(character);
  const cls = CLASSES[character.class];
  return {
    label: String(label || character.username || '').replace(/[<>&"'`]/g,''), isPlayerSide, class: character.class, level: character.level,
    resourceName: cls.resource, maxHp: eff.maxHp,
    hp: isPlayerSide ? clamp(character.hpCur, 1, eff.maxHp) : eff.maxHp,
    atk: eff.atk, def: eff.def, spd: eff.spd, crit: eff.crit, eva: eff.eva,
    resourceMax: eff.resourceMax,
    resource: isPlayerSide ? (character.class === 'mage' ? clamp(character.manaCur, 0, eff.resourceMax) : clamp(character.resourceCur, 0, eff.resourceMax)) : Math.round(eff.resourceMax * 0.6),
    buffs: [], skills: cls.skills, skillLevels: character.classSkills || {},
  };
}
function buildMonster(zone, level, name, kind) {
  const isBoss = kind === 'boss', isElite = kind === 'elite';
  const em = isElite ? 1.7 : 1;
  const hpMult = isBoss ? BOSS_MULT.hp : em, atkMult = isBoss ? BOSS_MULT.atk : em, defMult = isBoss ? BOSS_MULT.def : em;
  const hp = Math.round((38 + level * 11 + rnd(-4, 4)) * hpMult);
  const atk = Math.round((6 + level * 2.1 + rnd(-1, 1)) * atkMult);
  const def = Math.round((3 + level * 1.25 + rnd(-1, 1)) * defMult);
  const spdMult = isBoss ? 1.15 : isElite ? 1.15 : 1;
  const spd = Math.round((5 + level * 0.75) * 10) / 10 * spdMult;
  const critVal = isBoss ? 11 : isElite ? 9 : 5, evaVal = isBoss ? 8 : isElite ? 7 : 4;
  const label = isBoss ? name : (isElite ? 'Elite ' : '') + name;
  return { label, isPlayerSide: false, class: null, level, resourceName: null, maxHp: hp, hp, atk, def, spd, crit: critVal, eva: evaVal, resourceMax: 0, resource: 0, buffs: [], skills: [], isMonster: true, isElite, isBoss };
}

function tickBuffs(f) { f.buffs = f.buffs.filter(b => { b.rounds -= 1; return b.rounds > 0; }); }
function buffTotal(f, stat) { return f.buffs.filter(b => b.stat === stat).reduce((a, b) => a + b.amount, 0); }
function liveStat(f, stat) { return f[stat] + buffTotal(f, stat); }
function rollDamage(att, def, mult, ignoreDefPct, forceCrit, critBonus) {
  const atkStat = liveStat(att, 'atk') * (mult || 1);
  const defStat = liveStat(def, 'def') * (1 - (ignoreDefPct || 0));
  let dmg = Math.max(2, atkStat - defStat * 0.5);
  dmg *= rnd(0.87, 1.13);
  const critChance = clamp((liveStat(att, 'crit') + (critBonus || 0)), 0, 90);
  const isCrit = forceCrit || (Math.random() * 100 < critChance);
  if (isCrit) dmg *= 1.6;
  const evaChance = clamp(liveStat(def, 'eva') - liveStat(att, 'crit') * 0.15, 0, 55);
  const evaded = Math.random() * 100 < evaChance;
  if (evaded) dmg = 0;
  return { dmg: Math.round(dmg), crit: isCrit, evaded };
}
function resourceGainOnAttack(f) { if (f.resourceMax > 0) f.resource = clamp(f.resource + Math.round(f.resourceMax * 0.15), 0, f.resourceMax); }

function performAction(actor, target, action, skillLevel) {
  const logs = []; const name = actor.label;
  if (action.kind === 'attack') {
    const r = rollDamage(actor, target, action.boosted ? 1.5 : 1);
    if (r.evaded) logs.push({ text: `${name}'s attack is evaded by ${target.label}.`, cls: '' });
    else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({ text: `${name} attacks for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`, cls: 'hit' }); }
    resourceGainOnAttack(actor);
  } else if (action.kind === 'defend') {
    actor.buffs.push({ stat: 'def', amount: Math.round(liveStat(actor, 'def') * 0.6), rounds: 2, tag: 'Defend' });
    resourceGainOnAttack(actor);
    logs.push({ text: `${name} braces to defend, sharply raising Defense.`, cls: 'good' });
  } else if (action.kind === 'item') {
    const item = action.item;
    if (item.effect.heal) { const amt = Math.round(actor.maxHp * item.effect.heal); actor.hp = clamp(actor.hp + amt, 0, actor.maxHp); logs.push({ text: `${name} drinks a ${item.name}, recovering ${amt} HP.`, cls: 'good' }); }
    if (item.effect.energy) { logs.push({ text: `${name} drinks a ${item.name}, recovering Energy.`, cls: 'good' }); }
  } else if (action.kind === 'skill') {
    const s = action.skill; const lvl = skillLevel || 0;
    actor.resource = clamp(actor.resource - s.cost, 0, actor.resourceMax);
    switch (s.type) {
      case 'damage': { const mult = s.mult + s.multPerLvl * lvl; const r = rollDamage(actor, target, mult); if (r.evaded) logs.push({ text: `${name} uses ${s.name}, but it's evaded!`, cls: '' }); else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({ text: `${name} uses ${s.name} for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`, cls: 'hit' }); } break; }
      case 'damage_crit_boost': { const mult = s.mult + s.multPerLvl * lvl; const r = rollDamage(actor, target, mult, 0, false, s.critBonus); if (r.evaded) logs.push({ text: `${name} uses ${s.name}, but it's evaded!`, cls: '' }); else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({ text: `${name} uses ${s.name} for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`, cls: 'hit' }); } break; }
      case 'damage_ignore_def': { const mult = s.mult + s.multPerLvl * lvl; const r = rollDamage(actor, target, mult, s.ignorePct); if (r.evaded) logs.push({ text: `${name} uses ${s.name}, but it's evaded!`, cls: '' }); else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({ text: `${name} uses ${s.name} for ${r.dmg}, piercing defenses.`, cls: 'hit' }); } break; }
      case 'damage_resource_refund': { const mult = s.mult + s.multPerLvl * lvl; const r = rollDamage(actor, target, mult); actor.resource = clamp(actor.resource + s.refund, 0, actor.resourceMax); if (r.evaded) logs.push({ text: `${name} uses ${s.name}, but it's evaded!`, cls: '' }); else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({ text: `${name} uses ${s.name} for ${r.dmg}, and feels a surge of ${actor.resourceName}.`, cls: 'hit' }); } break; }
      case 'damage_debuff_atk': { const mult = s.mult + s.multPerLvl * lvl; const r = rollDamage(actor, target, mult); target.buffs.push({ stat: 'atk', amount: -Math.round(liveStat(target, 'atk') * s.debuff), rounds: s.duration, tag: s.name }); if (r.evaded) logs.push({ text: `${name} uses ${s.name}, but it's evaded!`, cls: '' }); else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({ text: `${name} uses ${s.name} for ${r.dmg}, weakening ${target.label}'s Attack.`, cls: 'hit' }); } break; }
      case 'damage_gold_bonus': { const mult = s.mult + s.multPerLvl * lvl; const r = rollDamage(actor, target, mult); actor._goldBonusPct = s.goldBonusPct; if (r.evaded) logs.push({ text: `${name} uses ${s.name}, but it's evaded!`, cls: '' }); else { target.hp = clamp(target.hp - r.dmg, 0, target.maxHp); logs.push({ text: `${name} uses ${s.name} for ${r.dmg}.`, cls: 'hit' }); } break; }
      case 'buff_def': { const amt = Math.round(s.amount + s.amountPerLvl * lvl); actor.buffs.push({ stat: 'def', amount: amt, rounds: s.duration, tag: s.name }); logs.push({ text: `${name} uses ${s.name}, raising Defense.`, cls: 'good' }); break; }
      case 'buff_atk': { const amt = Math.round(s.amount + s.amountPerLvl * lvl); actor.buffs.push({ stat: 'atk', amount: amt, rounds: s.duration, tag: s.name }); logs.push({ text: `${name} uses ${s.name}, raising Attack.`, cls: 'good' }); break; }
      case 'buff_spd_eva': { const amt = Math.round(s.amount + s.amountPerLvl * lvl); actor.buffs.push({ stat: 'spd', amount: amt, rounds: s.duration, tag: s.name }); actor.buffs.push({ stat: 'eva', amount: amt, rounds: s.duration, tag: s.name }); logs.push({ text: `${name} uses ${s.name}, becoming faster and harder to hit.`, cls: 'good' }); break; }
      case 'buff_def_resource': { const amt = Math.round(s.amount + s.amountPerLvl * lvl); actor.buffs.push({ stat: 'def', amount: amt, rounds: s.duration, tag: s.name }); actor.resource = clamp(actor.resource + s.refund, 0, actor.resourceMax); logs.push({ text: `${name} uses ${s.name}, raising Defense and recovering ${actor.resourceName}.`, cls: 'good' }); break; }
      case 'heal': { const pct = s.pct + s.pctPerLvl * lvl; const amt = Math.round(actor.maxHp * pct); actor.hp = clamp(actor.hp + amt, 0, actor.maxHp); logs.push({ text: `${name} uses ${s.name}, recovering ${amt} HP.`, cls: 'good' }); break; }
      case 'heal_and_def': { const pct = s.pct + s.pctPerLvl * lvl; const amt = Math.round(actor.maxHp * pct); actor.hp = clamp(actor.hp + amt, 0, actor.maxHp); actor.buffs.push({ stat: 'def', amount: s.defAmount, rounds: s.duration, tag: s.name }); logs.push({ text: `${name} uses ${s.name}, recovering ${amt} HP and raising Defense.`, cls: 'good' }); break; }
    }
  } else if (action.kind === 'flee') {
    logs.push({ text: `${name} attempts to flee...`, cls: '' });
  }
  return logs;
}
function chooseAiAction(actor, target) {
  const hpPct = actor.hp / actor.maxHp;
  const affordable = actor.skills.filter(s => actor.resource >= s.cost);
  if (hpPct < 0.3 && affordable.some(s => /heal/.test(s.type))) { const s = affordable.find(x => /heal/.test(x.type)); return { kind: 'skill', skill: s }; }
  if (actor.isMonster) { if (Math.random() < (actor.isBoss ? 0.3 : 0.22)) return { kind: 'attack', boosted: true }; return { kind: 'attack' }; }
  if (affordable.length && Math.random() < 0.6) return { kind: 'skill', skill: pick(affordable) };
  if (hpPct < 0.35 && Math.random() < 0.3) return { kind: 'defend' };
  return { kind: 'attack' };
}

// Road ("Take a Step") — server-side so its resources can be taxed.
const STEP_ENERGY_COST = 2;
const STEP_EVENT_WEIGHTS = [
  { t: 'flavor', w: 40 }, { t: 'gold', w: 18 }, { t: 'resource', w: 16 }, { t: 'xp', w: 6 }, { t: 'item', w: 3 }, { t: 'monster', w: 17 },
];
function pickStepEvent() {
  const total = STEP_EVENT_WEIGHTS.reduce((a, x) => a + x.w, 0);
  let r = rnd(0, total);
  for (const x of STEP_EVENT_WEIGHTS) { if (r < x.w) return x.t; r -= x.w; }
  return 'flavor';
}
module.exports = {
  STEP_ENERGY_COST, STEP_EVENT_WEIGHTS, pickStepEvent,
  rnd, rndInt, clamp, pick, uid,
  XP_FOR_LEVEL, BAG_CAPACITY, PVE_MAX_ROUNDS, ELO_K, RATING_FLOOR,
  ENERGY_REGEN_RATE_PER_HOUR, energyRegenPerHour,
  CLASSES, ZONES, EQUIP_SLOTS, TIERS, BOSS_ENERGY_COST, BOSS_COOLDOWN_MS,
  pickTierForBoss, pickTierForZone, makeEquipment,
  xpNeeded, effectiveStats, applyEnergyRegen, buildCombatant, buildMonster,
  tickBuffs, buffTotal, liveStat, rollDamage, resourceGainOnAttack,
  performAction, chooseAiAction,
};

};
__defs['war-core'] = function(module, exports, require){
"use strict";

/* ============================================================
   COUNTRY ECONOMY & WAR — pure logic (no Firestore, no clock).
   Everything here is deterministic so it can be unit-tested. The
   Firestore-facing code lives in economy.js and war.js.
   ============================================================ */

// Defaults. Every value can be overridden WITHOUT a redeploy by creating the
// Firestore doc rc_config/war with any of these keys (see war.js loadConfig).
// A war snapshots the values it needs at declaration time, so changing the
// config never alters a war that is already running.
const WAR_CONFIG = {
  prepMs: 30 * 60 * 1000,          // declaration -> round 1 starts
  roundMs: 5 * 60 * 60 * 1000,     // fixed duration of every round
  roundsToWin: 2,
  maxRounds: 3,
  cooldownMs: 24 * 60 * 60 * 1000, // post-war protection for BOTH countries
  minMembers: 3,                   // both countries need at least this many citizens (a 1-player country can't be farmed or farm others)
  warTaxRate: 10,                  // default %; the winner's Leader may pick any whole % between Min and Max
  warTaxRateMin: 1,
  warTaxRateMax: 25,
  warTaxDays: 14,
  rewardClaimMs: 3 * 24 * 60 * 60 * 1000, // winner's Leader must choose within this
  strikeEnergyCost: 10,
  strikeCooldownMs: 10 * 1000,
  maxStrikesPerPlayerPerRound: 10,
  maxHitsPerTarget: 3,             // damage vs the same enemy player counts at most this many times per round
  duelMaxRounds: 14,
  minTaxPct: 5,
  maxTaxPct: 15,
  maxEffectiveTaxPct: 30,          // normal + war tax can never exceed this share of a gross amount
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clampInt(v, lo, hi) { v = Math.round(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); }

// Normal country tax %, always inside the configured band.
function normalTaxPct(baseTax, cfg) {
  cfg = cfg || WAR_CONFIG;
  return clampInt(baseTax, cfg.minTaxPct, cfg.maxTaxPct);
}

/* ---------- resource split ----------
   gross is the freshly generated amount. The country share and the war-tax
   share are both computed from the GROSS amount at the moment of generation —
   never from what the player already holds. Fractions are not lost: they sit in
   `carry` (integer "percent-units", 0..99 per bucket) on the player and are paid
   out once they add up to a whole unit, so a 10% tax on 5 units still yields
   1 unit every other gain instead of rounding to 0 forever. */
function splitGenerated({ gross, normalPct, warPct, carry, cfg }) {
  cfg = cfg || WAR_CONFIG;
  gross = Math.max(0, Math.floor(Number(gross) || 0));
  let n = clampInt(normalPct, 0, cfg.maxEffectiveTaxPct);
  let w = clampInt(warPct, 0, 100);
  if (n + w > cfg.maxEffectiveTaxPct) w = Math.max(0, cfg.maxEffectiveTaxPct - n);
  const next = { normal: (carry && carry.normal) || 0, war: (carry && carry.war) || 0 };
  next.normal += gross * n;
  next.war += gross * w;
  const normal = Math.floor(next.normal / 100);
  const war = Math.floor(next.war / 100);
  next.normal -= normal * 100;
  next.war -= war * 100;
  const player = gross - normal - war;
  return { gross, player, normal, war, carry: next, normalPct: n, warPct: w };
}

/* ---------- war tax helpers ---------- */
function isWarTaxActive(tax, now) {
  return !!(tax && tax.resourceId && tax.expiresAt && now < tax.expiresAt);
}

/* ---------- round resolution ---------- */
// Winner of a round from its recorded damage. Deterministic tie-break:
//   1. more valid damage
//   2. more distinct players who actually contributed
//   3. the defender (an attacker has to actually win the fight)
function resolveRoundWinner(roundDoc, attackerId, defenderId) {
  const dmg = (roundDoc && roundDoc.damage) || {};
  const a = Math.floor(dmg[attackerId] || 0), d = Math.floor(dmg[defenderId] || 0);
  if (a !== d) return { winnerId: a > d ? attackerId : defenderId, damage: { [attackerId]: a, [defenderId]: d }, tieBreak: null };
  const contrib = (roundDoc && roundDoc.contrib) || {};
  // contrib is {uid: damage}; which country a uid belongs to is stored in roundDoc.members
  const members = (roundDoc && roundDoc.members) || {};
  const count = { [attackerId]: 0, [defenderId]: 0 };
  Object.keys(contrib).forEach((u) => { if (contrib[u] > 0 && members[u] in count) count[members[u]]++; });
  if (count[attackerId] !== count[defenderId]) {
    return { winnerId: count[attackerId] > count[defenderId] ? attackerId : defenderId, damage: { [attackerId]: a, [defenderId]: d }, tieBreak: "participants" };
  }
  return { winnerId: defenderId, damage: { [attackerId]: a, [defenderId]: d }, tieBreak: "defender" };
}

/* ---------- war state machine ----------
   war: plain object (see war.js declareWar for the shape).
   roundDocs: { 1: {damage, contrib, members}, 2: ..., 3: ... }
   Returns { war (new copy), changed, finished }.
   Time only ever comes from `now` (server time). Rounds chain back to back:
   round N+1 starts exactly when round N ended, even if the server only notices
   hours later, so a war that finishes while everybody is offline still ends
   with consistent timestamps. */
function advanceWarState(war, roundDocs, now) {
  const w = JSON.parse(JSON.stringify(war));
  let changed = false;
  const cfg = w.cfg;
  for (let guard = 0; guard < 10; guard++) {
    if (w.status === "preparing") {
      if (now < w.startsAt) break;
      w.status = "active";
      w.rounds = [{ round: 1, startsAt: w.startsAt, endsAt: w.startsAt + cfg.roundMs, status: "active", winner: null, damage: null }];
      w.startedAt = w.startsAt;
      changed = true;
      continue;
    }
    if (w.status !== "active") break;
    const cur = w.rounds[w.rounds.length - 1];
    if (cur.status !== "active" || now < cur.endsAt) break;

    const res = resolveRoundWinner((roundDocs || {})[cur.round], w.attackerCountryId, w.defenderCountryId);
    cur.status = "done";
    cur.winner = res.winnerId;
    cur.damage = res.damage;
    if (res.tieBreak) cur.tieBreak = res.tieBreak;
    w.finalScore[res.winnerId] = (w.finalScore[res.winnerId] || 0) + 1;
    changed = true;

    const a = w.finalScore[w.attackerCountryId] || 0, d = w.finalScore[w.defenderCountryId] || 0;
    if (a >= cfg.roundsToWin || d >= cfg.roundsToWin || w.rounds.length >= cfg.maxRounds) {
      w.status = "finished";
      w.winnerCountryId = a > d ? w.attackerCountryId : w.defenderCountryId; // after 3 rounds one side always has 2
      w.loserCountryId = w.winnerCountryId === w.attackerCountryId ? w.defenderCountryId : w.attackerCountryId;
      w.endedAt = cur.endsAt;
      break;
    }
    w.rounds.push({ round: cur.round + 1, startsAt: cur.endsAt, endsAt: cur.endsAt + cfg.roundMs, status: "active", winner: null, damage: null });
  }
  return { war: w, changed, finished: w.status === "finished" };
}

function currentRound(war) {
  if (!war || war.status !== "active" || !war.rounds || !war.rounds.length) return null;
  const r = war.rounds[war.rounds.length - 1];
  return r.status === "active" ? r : null;
}

module.exports = {
  WAR_CONFIG, DAY_MS,
  clampInt, normalTaxPct, splitGenerated, isWarTaxActive,
  resolveRoundWinner, advanceWarState, currentRound,
};

};
__defs['economy'] = function(module, exports, require){
"use strict";

/* ============================================================
   COUNTRY ECONOMY — Firestore-facing helpers.
   Country economy state lives in rc_countries/{countryId}, which clients can
   READ but never write (see firestore.rules). The existing rc_kingdoms doc keeps
   the Leader / members / chat / donated Treasury; this doc holds the new
   server-owned economy: resources, war state pointers and war taxes.
   ============================================================ */
const admin = require("firebase-admin");
const { COUNTRY_BY_ID } = require("./countries");
const W = require("./war-core");

function db() { return admin.firestore(); }
function FV() { return admin.firestore.FieldValue; }

function countryRef(id) { return db().doc("rc_countries/" + id); }

// A country doc is created lazily (the first time anything touches it), so
// every read merges the stored data over these defaults.
function normalizeCountry(id, data) {
  const def = COUNTRY_BY_ID[id];
  const d = data || {};
  // The Leader can replace the built-in specialities (exactly 2); until then the country's defaults apply.
  const natural = (Array.isArray(d.specialities) && d.specialities.length === 2 && d.specialities.every((r) => typeof r === "string"))
    ? d.specialities.slice() : (def ? def.resources.slice() : []);
  const resources = {};
  (def ? def.resources : []).forEach((r) => { resources[r] = 0; });
  natural.forEach((r) => { resources[r] = 0; });
  Object.keys(d.resources || {}).forEach((r) => { resources[r] = d.resources[r]; });
  return {
    id,
    exists: !!data,
    natural,
    specialitiesChangedAt: d.specialitiesChangedAt || 0,
    taxRate: d.taxRate != null ? d.taxRate : (def ? def.tax : 10),
    resources,
    activeWarId: d.activeWarId || null,
    warCooldownUntil: d.warCooldownUntil || 0,
    warTaxOut: d.warTaxOut || null,        // war tax this country is paying to a winner
    warTaxIn: Array.isArray(d.warTaxIn) ? d.warTaxIn : [], // war taxes this country collects
    warTaxCollected: d.warTaxCollected || {},
    pendingReward: d.pendingReward || null, // this country LOST a war and the winner hasn't chosen yet
  };
}

async function readCountry(tx, id) {
  const snap = await tx.get(countryRef(id));
  return normalizeCountry(id, snap.exists ? snap.data() : null);
}

/* ---------- normal tax + war tax on newly generated resources ---------- */

// Read phase. Must run BEFORE any tx write in the same transaction.
// Returns null when the player has no (known) country — nothing is taxed then.
async function readEconomyForPlayer(tx, player) {
  const cid = player && player.kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) return null;
  return { countryId: cid, country: await readCountry(tx, cid) };
}

// Pure phase: splits `gains` ({resourceId: grossAmount}) and mutates player.taxCarry.
// The normal tax only applies to the country's own natural resources (the ones it
// lists in its economy); the war tax only to the single resource the winner chose.
function applyTaxToGains(econ, player, gains, now, cfg) {
  cfg = cfg || W.WAR_CONFIG;
  const out = { net: {}, lines: [], countryInc: {}, winnerInc: {}, winnerId: null, warId: null };
  if (!player.taxCarry) player.taxCarry = {};
  Object.keys(gains).forEach((res) => {
    const gross = Math.max(0, Math.floor(gains[res] || 0));
    if (!econ) { out.net[res] = gross; return; }
    const natural = econ.country.natural.includes(res);
    const normalPct = natural ? W.normalTaxPct(econ.country.taxRate, cfg) : 0;
    const wt = econ.country.warTaxOut;
    const warActive = W.isWarTaxActive(wt, now) && wt.resourceId === res;
    const warPct = warActive ? wt.rate : 0;
    if (!normalPct && !warPct) { out.net[res] = gross; return; }
    const carry = player.taxCarry[res] || { normal: 0, war: 0 };
    const s = W.splitGenerated({ gross, normalPct, warPct, carry, cfg });
    player.taxCarry[res] = s.carry;
    out.net[res] = s.player;
    if (s.normal) out.countryInc[res] = (out.countryInc[res] || 0) + s.normal;
    if (s.war && warActive) {
      out.winnerInc[res] = (out.winnerInc[res] || 0) + s.war;
      out.winnerId = wt.winnerCountryId;
      out.warId = wt.warId;
    }
    out.lines.push({ resource: res, gross: s.gross, player: s.player, normal: s.normal, war: s.war });
  });
  return out;
}

// Write phase (after every read). Pure increments: nothing is read-modified-written,
// so concurrent players of the same country never overwrite each other.
function commitEconomy(tx, econ, out) {
  if (!econ || !out) return;
  const inc = {};
  Object.keys(out.countryInc).forEach((r) => { inc[r] = FV().increment(out.countryInc[r]); });
  if (Object.keys(inc).length) tx.set(countryRef(econ.countryId), { resources: inc }, { merge: true });
  if (out.winnerId && Object.keys(out.winnerInc).length) {
    const winInc = {}, collected = {};
    Object.keys(out.winnerInc).forEach((r) => { winInc[r] = FV().increment(out.winnerInc[r]); });
    collected[out.warId] = FV().increment(Object.values(out.winnerInc).reduce((a, b) => a + b, 0));
    tx.set(countryRef(out.winnerId), { resources: winInc, warTaxCollected: collected }, { merge: true });
  }
}

module.exports = { countryRef, normalizeCountry, readCountry, readEconomyForPlayer, applyTaxToGains, commitEconomy };

};
__defs['community'] = function(module, exports, require){
"use strict";

/* ============================================================
   COMMUNITY — small features around countries and players.
   - postSystemChat      automatic messages in a country's chat (war news, leadership changes)
   - transferLeadership  the Leader hands the crown to another citizen
   - maybeSucceedLeader  a Leader who has been away for LEADER_INACTIVE_MS is replaced automatically
   - claimDailyReward    one reward per UTC day, bigger with a streak
   All of it runs on the server; the client only asks for an action.
   ============================================================ */
const admin = require("firebase-admin");
const G = require("./game-core");
const { fail } = require("./errors");

let now = () => Date.now();
function _setClock(fn) { now = fn || (() => Date.now()); }
function db() { return admin.firestore(); }
const playerRef = (uid) => db().doc("rc_players/" + uid);
const kingdomRef = (cid) => db().doc("rc_kingdoms/" + cid);

const DAY_MS = 24 * 60 * 60 * 1000;
const CHAT_MAX = 60;                      // keep equal to KINGDOM_CHAT_MAX in js/config.js
const LEADER_INACTIVE_MS = 7 * DAY_MS;    // Leader away this long -> the next citizen in line takes over
const ROLE_RANK = { Recruit: 0, Member: 1, Officer: 2, "Co-Leader": 3, Leader: 4 }; // same order as KINGDOM_ROLES
const DAILY = { baseGold: 20, maxStreak: 7, energy: 20 }; // reward = baseGold x streak (streak 1..maxStreak) + energy

/* ---------- system messages in a country's chat (best effort: never breaks the action that caused it) ---------- */
async function postSystemChat(cid, text) {
  try {
    await db().runTransaction(async (tx) => {
      const s = await tx.get(kingdomRef(cid));
      if (!s.exists) return;
      const chat = Array.isArray(s.data().chat) ? s.data().chat.slice() : [];
      chat.push({ senderId: "system", senderName: "System", senderLevel: 0, text: String(text).slice(0, 200), ts: now(), system: true });
      while (chat.length > CHAT_MAX) chat.shift();
      tx.update(kingdomRef(cid), { chat });
    });
  } catch (e) { /* the chat is a courtesy, not part of the rules */ }
}

/* ---------- leadership ---------- */
async function transferLeadership(uid, data) {
  const targetId = data && data.targetId;
  if (!targetId || typeof targetId !== "string" || targetId === uid) fail("invalid-argument", "INVALID_TARGET");
  const done = await db().runTransaction(async (tx) => {
    const [me, tg] = await Promise.all([tx.get(playerRef(uid)), tx.get(playerRef(targetId))]);
    if (!me.exists) fail("not-found", "NO_CHARACTER");
    const cid = me.data().kingdomId;
    if (!cid) fail("failed-precondition", "NO_COUNTRY");
    const kSnap = await tx.get(kingdomRef(cid));
    if (!kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    if (!tg.exists || tg.data().kingdomId !== cid) fail("failed-precondition", "TARGET_NOT_CITIZEN");
    tx.update(kingdomRef(cid), { leaderId: targetId });
    tx.update(playerRef(targetId), { kingdomRole: "Leader" });
    tx.update(playerRef(uid), { kingdomRole: "Co-Leader" });
    return { cid, from: me.data().username || "The Leader", to: tg.data().username || "a citizen" };
  });
  await postSystemChat(done.cid, `${done.from} handed leadership to ${done.to}.`);
  return { countryId: done.cid, leaderId: targetId };
}

// Called lazily whenever a citizen opens the country (no scheduler needed).
// Returns the new leader's id when a change was made, otherwise null.
async function maybeSucceedLeader(cid) {
  try {
    const kSnap = await kingdomRef(cid).get();
    if (!kSnap.exists) return null;
    const leaderId = kSnap.data().leaderId;
    if (!leaderId) return null;                       // vacant: citizens use the existing "Claim leadership" button
    const t = now();
    const lSnap = await playerRef(leaderId).get();
    let gone = !lSnap.exists || lSnap.data().kingdomId !== cid;   // deleted, or left the country
    if (!gone) {
      const seen = Number(lSnap.data().updatedAt) || 0;           // no timestamp = unknown, never counted as away
      gone = seen > 0 && t - seen >= LEADER_INACTIVE_MS;
    }
    if (!gone) return null;

    const mSnap = await db().collection("rc_players").where("kingdomId", "==", cid).limit(80).get();
    const next = mSnap.docs
      .filter((d) => d.id !== leaderId && d.data().username && (Number(d.data().updatedAt) || 0) > 0 && t - Number(d.data().updatedAt) < LEADER_INACTIVE_MS)
      .sort((a, b) => {
        const x = a.data(), y = b.data();
        return (ROLE_RANK[y.kingdomRole] || 0) - (ROLE_RANK[x.kingdomRole] || 0)
          || (y.level || 1) - (x.level || 1)
          || (x.kingdomJoinedAt || 0) - (y.kingdomJoinedAt || 0);
      })[0];
    if (!next) return null;                           // nobody active to hand it to

    const ok = await db().runTransaction(async (tx) => {
      const k2 = await tx.get(kingdomRef(cid));
      if (!k2.exists || k2.data().leaderId !== leaderId) return false;   // someone else already changed it
      tx.update(kingdomRef(cid), { leaderId: next.id });
      tx.update(playerRef(next.id), { kingdomRole: "Leader" });
      if (lSnap.exists && lSnap.data().kingdomId === cid) tx.update(playerRef(leaderId), { kingdomRole: "Officer" });
      return true;
    });
    if (!ok) return null;
    await postSystemChat(cid, `${next.data().username} is the new Leader (the previous Leader was away for 7 days).`);
    return next.id;
  } catch (e) { return null; }
}

/* ---------- daily reward ---------- */
async function claimDailyReward(uid) {
  return db().runTransaction(async (tx) => {
    const t = now();
    const today = Math.floor(t / DAY_MS);              // UTC day number
    const snap = await tx.get(playerRef(uid));
    if (!snap.exists) fail("not-found", "NO_CHARACTER");
    const c = snap.data();
    const prev = c.daily || {};
    const nextAt = (today + 1) * DAY_MS;
    if (prev.day === today) fail("failed-precondition", "ALREADY_CLAIMED", { nextAt, msRemaining: nextAt - t });
    const streak = prev.day === today - 1 ? Math.min((prev.streak || 0) + 1, DAILY.maxStreak) : 1;
    const gold = DAILY.baseGold * streak;
    const { energyCur, maxEnergy, now: energyNow } = G.applyEnergyRegen(c);
    const newEnergy = G.clamp(energyCur + DAILY.energy, 0, maxEnergy);
    tx.update(playerRef(uid), { gold: (c.gold || 0) + gold, energyCur: newEnergy, lastEnergyAt: energyNow, daily: { day: today, streak } });
    return { gold, energy: Math.round(newEnergy - energyCur), streak, maxStreak: DAILY.maxStreak, nextAt, serverNow: t };
  });
}

module.exports = { postSystemChat, transferLeadership, maybeSucceedLeader, claimDailyReward, LEADER_INACTIVE_MS, DAILY, _setClock };
};
__defs['war'] = function(module, exports, require){
"use strict";

/* ============================================================
   COUNTRY WARS — server-authoritative.
   Every function here runs on the server (called from index.js). The client
   can only ask for an action; it never supplies damage, winners, rewards,
   rates or durations.

   Collections (all read-only for clients, see firestore.rules):
     rc_countries/{countryId}            economy + war pointers (economy.js)
     rc_wars/{warId}                     the war: rounds, score, reward
     rc_wars/{warId}/rounds/{n}          per-round damage (+ per-player contribution)
     rc_warPlayers/{warId}_{uid}         per-player strike limits for one war
     rc_config/war                       optional balance overrides
   ============================================================ */
const admin = require("firebase-admin");
const G = require("./game-core");
const { fail } = require("./errors");
const { COUNTRY_BY_ID } = require("./countries");
const W = require("./war-core");
const E = require("./economy");
const Community = require("./community");

let now = () => Date.now();
function _setClock(fn) { now = fn || (() => Date.now()); }

function db() { return admin.firestore(); }
function FV() { return admin.firestore.FieldValue; }
const warRef = (id) => db().doc("rc_wars/" + id);
const roundRef = (warId, n) => db().doc(`rc_wars/${warId}/rounds/${n}`);
const warPlayerRef = (warId, uid) => db().doc(`rc_warPlayers/${warId}_${uid}`);
const playerRef = (uid) => db().doc("rc_players/" + uid);
const kingdomRef = (cid) => db().doc("rc_kingdoms/" + cid);

/* ---------- config (defaults + optional rc_config/war overrides) ---------- */
const SPECIALITY_COOLDOWN_MS = 7 * W.DAY_MS; // how often a Leader may re-pick the country's 2 specialities
const CFG_LIMITS = {
  prepMs: [0, 7 * W.DAY_MS], roundMs: [1000, 7 * W.DAY_MS], cooldownMs: [0, 30 * W.DAY_MS],
  minMembers: [1, 500], warTaxRate: [1, 25], warTaxRateMin: [1, 50], warTaxRateMax: [1, 50], warTaxDays: [1, 60], rewardClaimMs: [60 * 1000, 30 * W.DAY_MS],
  strikeEnergyCost: [0, 100], strikeCooldownMs: [0, 600000], maxStrikesPerPlayerPerRound: [1, 1000],
  maxHitsPerTarget: [1, 50],
};
async function loadConfig() {
  const cfg = Object.assign({}, W.WAR_CONFIG);
  try {
    const snap = await db().doc("rc_config/war").get();
    if (snap.exists) {
      const o = snap.data();
      Object.keys(CFG_LIMITS).forEach((k) => {
        if (typeof o[k] === "number" && isFinite(o[k])) cfg[k] = Math.max(CFG_LIMITS[k][0], Math.min(CFG_LIMITS[k][1], o[k]));
      });
    }
  } catch (e) { /* defaults */ }
  return cfg;
}

// What a war remembers about the rules it was declared under.
function cfgSnapshot(cfg) {
  return {
    roundMs: cfg.roundMs, roundsToWin: cfg.roundsToWin, maxRounds: cfg.maxRounds,
    warTaxRate: cfg.warTaxRate, warTaxRateMin: cfg.warTaxRateMin, warTaxRateMax: cfg.warTaxRateMax, warTaxDays: cfg.warTaxDays, cooldownMs: cfg.cooldownMs,
    rewardClaimMs: cfg.rewardClaimMs, strikeEnergyCost: cfg.strikeEnergyCost,
    strikeCooldownMs: cfg.strikeCooldownMs, maxStrikesPerPlayerPerRound: cfg.maxStrikesPerPlayerPerRound,
    maxHitsPerTarget: cfg.maxHitsPerTarget, duelMaxRounds: cfg.duelMaxRounds,
  };
}

function newWarId() { return "war_" + now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }

/* ============================================================
   declareWar — only the Leader of the declaring country.
   ============================================================ */
async function declareWar(uid, data) {
  const targetId = data && data.targetCountryId;
  if (!COUNTRY_BY_ID[targetId]) fail("invalid-argument", "INVALID_TARGET");
  const cfg = await loadConfig();

  const declared = await db().runTransaction(async (tx) => {
    const t = now();
    const pSnap = await tx.get(playerRef(uid));
    if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
    const aid = pSnap.data().kingdomId;
    if (!aid || !COUNTRY_BY_ID[aid]) fail("failed-precondition", "NO_COUNTRY");
    if (aid === targetId) fail("invalid-argument", "INVALID_TARGET");

    const [kSnap, A, D] = await Promise.all([tx.get(kingdomRef(aid)), E.readCountry(tx, aid), E.readCountry(tx, targetId)]);
    if (!kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");

    // A stored activeWarId only counts if that war is really still running.
    const ptrs = [A.activeWarId, D.activeWarId];
    const ptrSnaps = await Promise.all(ptrs.map((id) => (id ? tx.get(warRef(id)) : null)));
    const running = (s) => !!(s && s.exists && s.data().status !== "finished");
    if (running(ptrSnaps[0])) fail("failed-precondition", "ALREADY_AT_WAR");
    if (running(ptrSnaps[1])) fail("failed-precondition", "TARGET_AT_WAR");

    if (A.warCooldownUntil > t) fail("failed-precondition", "COOLDOWN_ACTIVE", { countryId: aid, msRemaining: A.warCooldownUntil - t });
    if (D.warCooldownUntil > t) fail("failed-precondition", "TARGET_COOLDOWN", { countryId: targetId, msRemaining: D.warCooldownUntil - t });
    // One war tax at a time per country: a country paying reparations (or whose
    // conqueror hasn't chosen yet) can't be hit again, so taxes never pile up.
    if (W.isWarTaxActive(D.warTaxOut, t) || (D.pendingReward && D.pendingReward.expiresAt > t)) {
      fail("failed-precondition", "TARGET_PROTECTED", { countryId: targetId });
    }

    const [aMembers, dMembers] = await Promise.all([
      db().collection("rc_players").where("kingdomId", "==", aid).limit(cfg.minMembers).get(),
      db().collection("rc_players").where("kingdomId", "==", targetId).limit(cfg.minMembers).get(),
    ]);
    if (aMembers.size < cfg.minMembers || dMembers.size < cfg.minMembers) fail("failed-precondition", "NOT_ENOUGH_MEMBERS", { required: cfg.minMembers });

    const id = newWarId();
    const war = {
      id, status: "preparing",
      attackerCountryId: aid, defenderCountryId: targetId,
      declaredBy: uid, declaredAt: t, startsAt: t + cfg.prepMs,
      cfg: cfgSnapshot(cfg),
      finalScore: { [aid]: 0, [targetId]: 0 },
      rounds: [],
      winnerCountryId: null, loserCountryId: null,
      selectedResource: null, warTaxRate: cfg.warTaxRate, warTaxDurationDays: cfg.warTaxDays,
      reward: null, startedAt: null, endedAt: null,
    };
    tx.set(warRef(id), war);
    tx.set(E.countryRef(aid), { activeWarId: id }, { merge: true });
    tx.set(E.countryRef(targetId), { activeWarId: id }, { merge: true });
    return { warId: id, startsAt: war.startsAt, serverNow: t, attackerCountryId: aid };
  });
  const an = COUNTRY_BY_ID[declared.attackerCountryId].name, dn = COUNTRY_BY_ID[targetId].name;
  const msg = `⚔ ${an} declared war on ${dn}! Round 1 starts in ${Math.max(1, Math.round(cfg.prepMs / 60000))} min.`;
  await Promise.all([Community.postSystemChat(declared.attackerCountryId, msg), Community.postSystemChat(targetId, msg)]);
  return declared;
}

/* ============================================================
   advanceWar — moves a war forward to the current server time.
   Safe to call any number of times, from anywhere (every war call, a
   scheduled tick): a war ends correctly even if nobody is online.
   ============================================================ */
async function advanceWar(warId) {
  let announce = null;
  const result = await db().runTransaction(async (tx) => {
    announce = null;
    const t = now();
    const wSnap = await tx.get(warRef(warId));
    if (!wSnap.exists) fail("not-found", "WAR_NOT_FOUND");
    const war = wSnap.data();
    if (war.status === "finished") return { war, changed: false };
    const cur = W.currentRound(war);
    const due = (war.status === "preparing" && t >= war.startsAt) || (cur && t >= cur.endsAt);
    if (!due) return { war, changed: false };

    const rSnaps = await Promise.all([1, 2, 3].map((n) => tx.get(roundRef(warId, n))));
    const roundDocs = {};
    rSnaps.forEach((s, i) => { roundDocs[i + 1] = s.exists ? s.data() : null; });
    const res = W.advanceWarState(war, roundDocs, t);
    if (!res.changed) return { war, changed: false };

    let A = null, D = null;
    if (res.finished) { // all reads first
      [A, D] = await Promise.all([E.readCountry(tx, war.attackerCountryId), E.readCountry(tx, war.defenderCountryId)]);
    }
    const w = res.war;
    if (res.finished) {
      const loserC = w.loserCountryId === A.id ? A : D;
      w.reward = {
        status: "awaiting_choice",
        winnerCountryId: w.winnerCountryId, loserCountryId: w.loserCountryId,
        options: allTaxableResources(), loserResources: loserC.natural.slice(),
        claimExpiresAt: w.endedAt + w.cfg.rewardClaimMs,
        resourceId: null, rate: w.cfg.warTaxRate, startedAt: null, expiresAt: null,
      };
      const cooldownUntil = w.endedAt + w.cfg.cooldownMs;
      [w.attackerCountryId, w.defenderCountryId].forEach((cid) => {
        const patch = { activeWarId: null, warCooldownUntil: cooldownUntil };
        if (cid === w.loserCountryId) patch.pendingReward = { warId: w.id, winnerCountryId: w.winnerCountryId, expiresAt: w.reward.claimExpiresAt };
        tx.set(E.countryRef(cid), patch, { merge: true });
      });
    }
    tx.set(warRef(warId), w);
    announce = { before: { status: war.status, rounds: (war.rounds || []).map((r) => ({ round: r.round, status: r.status })) }, after: w };
    return { war: w, changed: true };
  });
  if (announce) await announceWarProgress(announce.before, announce.after);
  return result;
}

// Posts the news of whatever just happened (war started, round decided, war over) to BOTH countries' chats.
function shortNum(n) { n = Math.floor(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); }
async function announceWarProgress(before, after) {
  const A = after.attackerCountryId, D = after.defenderCountryId;
  const nm = (id) => (COUNTRY_BY_ID[id] ? COUNTRY_BY_ID[id].name : id);
  const lines = [];
  if (before.status === "preparing" && after.status !== "preparing") lines.push(`⚔ The war ${nm(A)} vs ${nm(D)} has started! Round 1 is on.`);
  const was = {};
  (before.rounds || []).forEach((r) => { was[r.round] = r.status; });
  (after.rounds || []).forEach((r) => {
    if (r.status === "done" && was[r.round] !== "done") {
      const dm = r.damage || {};
      lines.push(`Round ${r.round}: ${nm(r.winner)} won (${nm(A)} ${shortNum(dm[A])} vs ${nm(D)} ${shortNum(dm[D])}).`);
    } else if (r.status === "active" && was[r.round] === undefined && r.round > 1) {
      lines.push(`Round ${r.round} has started.`);
    }
  });
  if (before.status !== "finished" && after.status === "finished") {
    lines.push(`🏆 ${nm(after.winnerCountryId)} won the war against ${nm(after.loserCountryId)} (${after.finalScore[after.winnerCountryId] || 0}-${after.finalScore[after.loserCountryId] || 0}). Its Leader now chooses a war tax.`);
  }
  for (const text of lines) await Promise.all([Community.postSystemChat(A, text), Community.postSystemChat(D, text)]);
}

/* ============================================================
   warStrike — the ONLY way war damage is produced.
   The server picks a real enemy-country player as the opponent, runs a full
   duel with both sides' real stats, and counts the enemy HP the attacker took
   off. The client sends nothing but "strike". Damage is bounded by the
   target's HP, Energy, a per-strike cooldown, a per-round strike cap and a
   per-target cap, so a huge population can't pile up meaningless damage.
   ============================================================ */
function simulateDuel(attackerDoc, defenderDoc, maxRounds) {
  const aEff = G.effectiveStats(attackerDoc);
  const me = G.buildCombatant(Object.assign({}, attackerDoc, { hpCur: aEff.maxHp }), true, attackerDoc.username);
  const foe = G.buildCombatant(defenderDoc, false, defenderDoc.username);
  me.resource = Math.round(me.resourceMax * 0.6);
  let dealt = 0, rounds = 0;
  for (; rounds < maxRounds && me.hp > 0 && foe.hp > 0; rounds++) {
    const meFirst = G.liveStat(me, "spd") >= G.liveStat(foe, "spd");
    const order = meFirst ? [[me, foe, true], [foe, me, false]] : [[foe, me, false], [me, foe, true]];
    for (const [actor, other, isMe] of order) {
      if (me.hp <= 0 || foe.hp <= 0) break;
      const act = G.chooseAiAction(actor, other);
      const lvl = (act.skill && actor.skillLevels) ? (actor.skillLevels[act.skill.id] || 0) : 0;
      const before = other.hp;
      G.performAction(actor, other, act, lvl);
      if (isMe) dealt += Math.max(0, before - other.hp);
    }
    G.tickBuffs(me); G.tickBuffs(foe);
  }
  return { damage: Math.min(Math.floor(dealt), foe.maxHp), won: foe.hp <= 0, rounds, foeMaxHp: foe.maxHp, foeHpLeft: Math.max(0, Math.round(foe.hp)) };
}

async function warStrike(uid) {
  const pSnap0 = await playerRef(uid).get();
  if (!pSnap0.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap0.data().kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
  const cSnap = await E.countryRef(cid).get();
  const country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
  if (!country.activeWarId) fail("failed-precondition", "NO_ACTIVE_WAR");
  const warId = country.activeWarId;

  const { war: war0 } = await advanceWar(warId);        // bring the war up to "now" first
  if (war0.status !== "active") fail("failed-precondition", war0.status === "preparing" ? "WAR_NOT_STARTED" : "WAR_ENDED", { startsAt: war0.startsAt });
  if (cid !== war0.attackerCountryId && cid !== war0.defenderCountryId) fail("permission-denied", "NOT_IN_WAR");
  const cur0 = W.currentRound(war0);
  if (!cur0) fail("failed-precondition", "ROUND_ENDED");
  const enemyId = cid === war0.attackerCountryId ? war0.defenderCountryId : war0.attackerCountryId;
  const cfg = war0.cfg;
  const n = cur0.round;

  // Choose the opponent server-side, skipping enemies this player already hit the maximum times this round.
  const wpSnap0 = await warPlayerRef(warId, uid).get();
  const hits0 = (wpSnap0.exists && wpSnap0.data().hits) || {};
  const candSnap = await db().collection("rc_players").where("kingdomId", "==", enemyId).limit(40).get();
  const cands = candSnap.docs.filter((d) => { const x = d.data(); return x.username && x.class && G.CLASSES[x.class]; });
  if (!cands.length) fail("failed-precondition", "NO_TARGET_AVAILABLE");
  const eligible = cands.filter((d) => (hits0[n + "_" + d.id] || 0) < cfg.maxHitsPerTarget);
  if (!eligible.length) fail("failed-precondition", "TARGETS_EXHAUSTED");
  const target = G.pick(eligible);
  const targetData = target.data();

  return db().runTransaction(async (tx) => {
    const t = now();
    const [pSnap, wSnap, wpSnap] = await Promise.all([tx.get(playerRef(uid)), tx.get(warRef(warId)), tx.get(warPlayerRef(warId, uid))]);
    if (!pSnap.exists || !wSnap.exists) fail("not-found", "WAR_NOT_FOUND");
    const c = pSnap.data();
    const war = wSnap.data();
    const cur = W.currentRound(war);
    if (war.status !== "active" || !cur) fail("failed-precondition", "WAR_ENDED");
    if (t >= cur.endsAt) fail("failed-precondition", "ROUND_ENDED");
    if (cur.round !== n) fail("aborted", "ROUND_CHANGED");
    if (c.kingdomId !== cid) fail("permission-denied", "NOT_IN_WAR");

    const wp = wpSnap.exists ? wpSnap.data() : {};
    if (((wp.strikes || {})[n] || 0) >= cfg.maxStrikesPerPlayerPerRound) fail("failed-precondition", "STRIKE_LIMIT", { max: cfg.maxStrikesPerPlayerPerRound });
    const since = t - (wp.lastStrikeAt || 0);
    if (since < cfg.strikeCooldownMs) fail("failed-precondition", "COOLDOWN_ACTIVE", { msRemaining: cfg.strikeCooldownMs - since });
    if (((wp.hits || {})[n + "_" + target.id] || 0) >= cfg.maxHitsPerTarget) fail("failed-precondition", "TARGET_LIMIT");

    const { energyCur, maxEnergy, now: energyNow } = G.applyEnergyRegen(c);
    if (energyCur < cfg.strikeEnergyCost) {
      fail("failed-precondition", "NOT_ENOUGH_ENERGY", { required: cfg.strikeEnergyCost, available: Math.floor(energyCur), perHour: G.energyRegenPerHour(maxEnergy) });
    }
    const newEnergy = G.clamp(energyCur - cfg.strikeEnergyCost, 0, maxEnergy);

    const duel = simulateDuel(c, targetData, cfg.duelMaxRounds);
    const d = duel.damage;

    // Weekly damage counter (week = 7-day block starting Monday 00:00 UTC) for the global rankings.
    const wkKey = Math.floor((t - 345600000) / 604800000);
    const prevWk = (c.weeklyDmg && c.weeklyDmg.week === wkKey) ? (c.weeklyDmg.dmg || 0) : 0;
    tx.update(playerRef(uid), { energyCur: newEnergy, lastEnergyAt: energyNow, weeklyDmg: { week: wkKey, dmg: prevWk + d }, totalDmg: FV().increment(d) });
    tx.set(warPlayerRef(warId, uid), {
      warId, uid, countryId: cid, lastStrikeAt: t,
      strikes: { [n]: FV().increment(1) },
      hits: { [n + "_" + target.id]: FV().increment(1) },
      damage: { [n]: FV().increment(d) },
    }, { merge: true });
    // Pure increments on the round doc: concurrent strikes never overwrite each other.
    tx.set(roundRef(warId, n), {
      damage: { [cid]: FV().increment(d) },
      contrib: { [uid]: FV().increment(d) },
      members: { [uid]: cid },
    }, { merge: true });

    return {
      warId, round: n, damage: d, won: duel.won,
      target: { name: targetData.username, level: targetData.level, maxHp: duel.foeMaxHp, hpLeft: duel.foeHpLeft },
      energyCur: newEnergy, lastEnergyAt: energyNow, serverNow: t,
    };
  });
}

/* ============================================================
   chooseWarReward — the winning country's CURRENT Leader picks ONE of the
   defeated country's natural resources. Rate and duration are fixed by the
   war's own rules, never by the caller.
   ============================================================ */
// Every resource a citizen can gather (zones) or a country specialises in. The winner's Leader may tax ANY of them,
// not only the loser's own specialities (citizens gather zone resources whatever their country is).
function allTaxableResources() {
  const set = new Set();
  G.ZONES.forEach((z) => (z.resources || []).forEach((r) => set.add(r)));
  Object.values(COUNTRY_BY_ID).forEach((c) => (c.resources || []).forEach((r) => set.add(r)));
  return Array.from(set).sort();
}
async function chooseWarReward(uid, data) {
  const warId = data && data.warId, resourceId = data && data.resourceId;
  if (!warId || !resourceId) fail("invalid-argument", "INVALID_ACTION");
  const chosen = await db().runTransaction(async (tx) => {
    const t = now();
    const wSnap = await tx.get(warRef(warId));
    if (!wSnap.exists) fail("not-found", "WAR_NOT_FOUND");
    const war = wSnap.data();
    if (war.status !== "finished" || !war.reward || war.reward.status !== "awaiting_choice") fail("failed-precondition", "REWARD_NOT_AVAILABLE");
    if (t > war.reward.claimExpiresAt) fail("failed-precondition", "REWARD_EXPIRED");

    const wid = war.winnerCountryId, lid = war.loserCountryId;
    const [pSnap, kSnap, winner, loser] = await Promise.all([tx.get(playerRef(uid)), tx.get(kingdomRef(wid)), E.readCountry(tx, wid), E.readCountry(tx, lid)]);
    if (!pSnap.exists || pSnap.data().kingdomId !== wid || !kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    if (!allTaxableResources().includes(resourceId) && !war.reward.options.includes(resourceId)) fail("invalid-argument", "INVALID_RESOURCE", { options: allTaxableResources() });
    if (W.isWarTaxActive(loser.warTaxOut, t)) fail("failed-precondition", "TARGET_PROTECTED");

    // The Leader picks the tax rate, but only inside the limits the war was declared under.
    const lo = war.cfg.warTaxRateMin != null ? war.cfg.warTaxRateMin : 1, hi = war.cfg.warTaxRateMax != null ? war.cfg.warTaxRateMax : 25;
    const rate = data.rate == null ? war.cfg.warTaxRate : Number(data.rate), days = war.cfg.warTaxDays;
    if (!Number.isInteger(rate) || rate < lo || rate > hi) fail("invalid-argument", "INVALID_RATE", { min: lo, max: hi });
    const expiresAt = t + days * W.DAY_MS;
    const tax = { warId, winnerCountryId: wid, loserCountryId: lid, resourceId, rate, startedAt: t, expiresAt };
    const inList = winner.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).concat([tax]);

    tx.set(warRef(warId), Object.assign({}, war, {
      selectedResource: resourceId,
      reward: Object.assign({}, war.reward, { status: "active", resourceId, rate, startedAt: t, expiresAt, chosenBy: uid }),
    }));
    tx.set(E.countryRef(lid), { warTaxOut: tax, pendingReward: null }, { merge: true });
    tx.set(E.countryRef(wid), { warTaxIn: inList }, { merge: true });
    return { warId, resourceId, rate, startedAt: t, expiresAt, serverNow: t, winnerCountryId: wid, loserCountryId: lid, days };
  });
  const text = `🏆 ${COUNTRY_BY_ID[chosen.winnerCountryId].name} chose ${chosen.resourceId} as war tax on ${COUNTRY_BY_ID[chosen.loserCountryId].name}: ${chosen.rate}% for ${chosen.days} days.`;
  await Promise.all([Community.postSystemChat(chosen.winnerCountryId, text), Community.postSystemChat(chosen.loserCountryId, text)]);
  return chosen;
}

/* ============================================================
   getCountryState — everything the Economy / War tabs display, computed
   server-side (including "now"), so the client never does war maths.
   ============================================================ */
function publicTax(x, t) {
  return x ? Object.assign({}, x, { active: W.isWarTaxActive(x, t), msRemaining: Math.max(0, (x.expiresAt || 0) - t) }) : null;
}
function summarizeWar(war, cid, t) {
  const r = war.reward || null;
  let rewardState = null;
  if (r) {
    if (r.status === "active") rewardState = t < r.expiresAt ? "active" : "expired";
    else rewardState = r.status; // awaiting_choice | forfeited
  }
  return {
    id: war.id, status: war.status,
    attackerCountryId: war.attackerCountryId, defenderCountryId: war.defenderCountryId,
    finalScore: war.finalScore, winnerCountryId: war.winnerCountryId, loserCountryId: war.loserCountryId,
    rounds: (war.rounds || []).map((x) => ({ round: x.round, winner: x.winner, damage: x.damage, startsAt: x.startsAt, endsAt: x.endsAt, status: x.status })),
    selectedResource: war.selectedResource, warTaxRate: war.warTaxRate, warTaxDurationDays: war.warTaxDurationDays,
    rateMin: war.cfg && war.cfg.warTaxRateMin != null ? war.cfg.warTaxRateMin : 1, rateMax: war.cfg && war.cfg.warTaxRateMax != null ? war.cfg.warTaxRateMax : 25,
    startedAt: war.startedAt, endedAt: war.endedAt, startsAt: war.startsAt,
    result: war.status === "finished" ? (war.winnerCountryId === cid ? "victory" : "defeat") : null,
    rewardState,
    taxMsRemaining: r && r.status === "active" ? Math.max(0, r.expiresAt - t) : 0,
    claimExpiresAt: r ? r.claimExpiresAt : null,
  };
}

/* ============================================================
   setCountrySpecialities — the country's CURRENT Leader picks exactly 2
   resources as its specialities (the only resources the normal country tax
   applies to). Limited by a cooldown so it can't be flipped back and forth.
   ============================================================ */
async function setCountrySpecialities(uid, data) {
  const list = data && Array.isArray(data.resources) ? Array.from(new Set(data.resources.map(String))) : [];
  const allowed = new Set(allTaxableResources());
  if (list.length !== 2 || !list.every((r) => allowed.has(r))) fail("invalid-argument", "INVALID_SPECIALITIES");
  return db().runTransaction(async (tx) => {
    const t = now();
    const pSnap = await tx.get(playerRef(uid));
    if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
    const cid = pSnap.data().kingdomId;
    if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
    const [kSnap, C] = await Promise.all([tx.get(kingdomRef(cid)), E.readCountry(tx, cid)]);
    if (!kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    const until = C.specialitiesChangedAt ? C.specialitiesChangedAt + SPECIALITY_COOLDOWN_MS : 0;
    if (until > t) fail("failed-precondition", "SPECIALITY_COOLDOWN", { msRemaining: until - t });
    if (list.slice().sort().join() === C.natural.slice().sort().join()) fail("invalid-argument", "SPECIALITIES_UNCHANGED");
    tx.set(E.countryRef(cid), { specialities: list, specialitiesChangedAt: t }, { merge: true });
    return { countryId: cid, specialities: list, cooldownUntil: t + SPECIALITY_COOLDOWN_MS };
  });
}

/* ============================================================
   getCountryPublic — what ANY signed-in player may see about ANY country
   (no character or country needed): war taxes it pays / collects, a pending
   victory choice, and its specialities. Read-only, never changes anything.
   ============================================================ */
async function getCountryPublic(uid, data) {
  const cid = data && data.countryId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("invalid-argument", "INVALID_TARGET");
  const t = now();
  const snap = await E.countryRef(cid).get();
  const c = E.normalizeCountry(cid, snap.exists ? snap.data() : null);
  const pr = c.pendingReward && c.pendingReward.expiresAt > t ? c.pendingReward : null;
  return {
    serverNow: t, countryId: cid,
    specialities: c.natural,
    warTaxOut: publicTax(c.warTaxOut, t),
    warTaxIn: c.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).map((x) => Object.assign(publicTax(x, t), { collected: c.warTaxCollected[x.warId] || 0 })),
    pendingChoice: pr ? { winnerCountryId: pr.winnerCountryId, expiresAt: pr.expiresAt } : null,
  };
}

async function getCountryState(uid) {
  const pSnap = await playerRef(uid).get();
  if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap.data().kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
  await Community.maybeSucceedLeader(cid);   // a Leader who has been away for 7 days is replaced here, lazily

  let cSnap = await E.countryRef(cid).get();
  let country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
  if (country.activeWarId) {
    try { await advanceWar(country.activeWarId); } catch (e) { /* war doc missing: fall through */ }
    cSnap = await E.countryRef(cid).get();
    country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
  }
  const t = now();
  const kSnap = await kingdomRef(cid).get();
  const kd = kSnap.exists ? kSnap.data() : {};

  let activeWar = null;
  if (country.activeWarId) {
    const wSnap = await warRef(country.activeWarId).get();
    if (wSnap.exists && wSnap.data().status !== "finished") {
      const war = wSnap.data();
      const cur = W.currentRound(war);
      let live = null, mine = null;
      if (cur) {
        const [rs, wp] = await Promise.all([roundRef(war.id, cur.round).get(), warPlayerRef(war.id, uid).get()]);
        const rd = rs.exists ? rs.data() : {};
        live = { round: cur.round, damage: rd.damage || {}, participants: Object.keys(rd.contrib || {}).length };
        const wpd = wp.exists ? wp.data() : {};
        mine = {
          damage: (rd.contrib || {})[uid] || 0,
          strikes: (wpd.strikes || {})[cur.round] || 0,
          lastStrikeAt: wpd.lastStrikeAt || 0,
          maxStrikes: war.cfg.maxStrikesPerPlayerPerRound, cooldownMs: war.cfg.strikeCooldownMs, energyCost: war.cfg.strikeEnergyCost,
        };
        // top contributors of the country this round
        const contrib = rd.contrib || {}, members = rd.members || {};
        const sideTop = (cc) => Object.keys(contrib).filter((u) => members[u] === cc).sort((a, b) => contrib[b] - contrib[a]).slice(0, 5);
        const topIds = sideTop(war.attackerCountryId).concat(sideTop(war.defenderCountryId));
        const pSnaps = await Promise.all(topIds.map((u) => db().collection("rc_players").doc(u).get().catch(() => null)));
        live.top = topIds.map((u, i) => { const pd = pSnaps[i] && pSnaps[i].exists ? pSnaps[i].data() : {}; return { uid: u, damage: contrib[u], country: members[u], username: pd.username || "Player", level: pd.level || 1 }; });
      }
      activeWar = Object.assign(summarizeWar(war, cid, t), { live, mine });
    }
  }

  const [asAtt, asDef] = await Promise.all([
    db().collection("rc_wars").where("attackerCountryId", "==", cid).limit(25).get(),
    db().collection("rc_wars").where("defenderCountryId", "==", cid).limit(25).get(),
  ]);
  const history = asAtt.docs.concat(asDef.docs).map((d) => d.data()).filter((w) => w.status === "finished")
    .sort((a, b) => b.endedAt - a.endedAt).slice(0, 10).map((w) => summarizeWar(w, cid, t));

  const leaderId = kd.leaderId || null;
  const pending = history.find((h) => h.rewardState === "awaiting_choice" && h.winnerCountryId === cid && h.claimExpiresAt > t) || null;
  let pendingLoserNatural = [];
  if (pending) {
    const ls = await E.countryRef(pending.loserCountryId).get();
    pendingLoserNatural = E.normalizeCountry(pending.loserCountryId, ls.exists ? ls.data() : null).natural;
  }
  return {
    serverNow: t, countryId: cid,
    isLeader: leaderId === uid, leaderId,
    taxRate: W.normalTaxPct(country.taxRate),
    resources: country.resources,
    naturalResources: country.natural,
    specialityOptions: allTaxableResources(),
    specialityCooldownUntil: country.specialitiesChangedAt ? country.specialitiesChangedAt + SPECIALITY_COOLDOWN_MS : 0,
    cooldownUntil: country.warCooldownUntil,
    warTaxOut: publicTax(country.warTaxOut, t),
    warTaxIn: country.warTaxIn.filter((x) => W.isWarTaxActive(x, t)).map((x) => Object.assign(publicTax(x, t), { collected: country.warTaxCollected[x.warId] || 0 })),
    pendingReward: pending ? { warId: pending.id, loserCountryId: pending.loserCountryId, options: allTaxableResources(), loserResources: pendingLoserNatural, rateMin: pending.rateMin != null ? pending.rateMin : 1, rateMax: pending.rateMax != null ? pending.rateMax : 25, defaultRate: pending.warTaxRate || 10, claimExpiresAt: pending.claimExpiresAt } : null,
    activeWar, history,
  };
}

/* ============================================================
   tickWars — run on a schedule (index.js). Finishes wars whose rounds ended,
   expires war taxes and forfeits unclaimed rewards. All of it is ALSO done
   lazily by the calls above, so nothing depends on the schedule being alive.
   ============================================================ */
async function getWorldWars(uid) {
  const t=now();
  const snap=await db().collection("rc_wars").limit(100).get();
  const all=snap.docs.map(d=>d.data());
  const active=all.filter(w=>w.status==="active" || w.status==="preparing").map(w=>summarizeWar(w, null, t)).sort((a,b)=>(a.startsAt||a.startedAt||0)-(b.startsAt||b.startedAt||0));
  const recent=all.filter(w=>w.status==="finished").sort((a,b)=>(b.endedAt||0)-(a.endedAt||0)).slice(0,20).map(w=>summarizeWar(w, null, t));
  return {serverNow:t, active, recent};
}

async function tickWars() {
  const t = now();
  const out = { advanced: 0, expiredTaxes: 0, forfeited: 0 };
  const live = await db().collection("rc_wars").where("status", "in", ["preparing", "active"]).limit(100).get();
  for (const d of live.docs) {
    try { const r = await advanceWar(d.id); if (r.changed) out.advanced++; } catch (e) { console.error("tick advance", d.id, e); }
  }
  const expired = await db().collection("rc_countries").where("warTaxOut.expiresAt", "<=", t).limit(100).get();
  for (const d of expired.docs) {
    try {
      await db().runTransaction(async (tx) => {
        const cs = await tx.get(E.countryRef(d.id));
        const tax = cs.exists && cs.data().warTaxOut;
        if (!tax || t < tax.expiresAt) return;
        const ws = await tx.get(warRef(tax.warId));
        tx.set(E.countryRef(d.id), { warTaxOut: null }, { merge: true });
        if (ws.exists && ws.data().reward && ws.data().reward.status === "active") {
          tx.set(warRef(tax.warId), Object.assign({}, ws.data(), { reward: Object.assign({}, ws.data().reward, { status: "expired" }) }));
        }
      });
      out.expiredTaxes++;
    } catch (e) { console.error("tick expire", d.id, e); }
  }
  const open = await db().collection("rc_wars").where("reward.status", "==", "awaiting_choice").limit(100).get();
  for (const d of open.docs) {
    const w = d.data();
    if (t <= w.reward.claimExpiresAt) continue;
    try {
      await db().runTransaction(async (tx) => {
        const ws = await tx.get(warRef(w.id));
        const cur = ws.data();
        if (!cur.reward || cur.reward.status !== "awaiting_choice") return;
        tx.set(warRef(w.id), Object.assign({}, cur, { reward: Object.assign({}, cur.reward, { status: "forfeited" }) }));
        tx.set(E.countryRef(cur.loserCountryId), { pendingReward: null }, { merge: true });
      });
      out.forfeited++;
    } catch (e) { console.error("tick forfeit", d.id, e); }
  }
  return out;
}

module.exports = { announceWarProgress, declareWar, advanceWar, warStrike, chooseWarReward, setCountrySpecialities, getCountryPublic, getCountryState, getWorldWars, tickWars, simulateDuel, loadConfig, _setClock };

};
__defs['index'] = function(module, exports, require){
"use strict";
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const G = require("./lib/game-core");
const E = require("./lib/economy");
const War = require("./lib/war");
const Community = require("./lib/community");
const { ApiError } = require("./lib/errors");

admin.initializeApp();
const db = admin.firestore();

function fail(code, message, details) {
  throw new functions.https.HttpsError(code, message, details || {});
}

function requireAuth(context) {
  if (!context.auth) fail("unauthenticated", "UNAUTHORIZED");
  return context.auth.uid;
}

// Builds a PvE fight (monster + combatants + session doc). Shared by
// startAdventure and by the Road's "monster" step event.
function spawnPveSession(c, zone, kind, now, ownerUid) {
  const isBoss = kind === "boss", isElite = kind === "elite";
  const topLevel = zone.uncapped ? zone.min + 80 : zone.max;
  const monsterLevel = isBoss
    ? G.clamp(c.level, zone.min, topLevel)
    : G.clamp(c.level + G.rndInt(-2, 2) + (isElite ? 3 : 0), zone.min, topLevel);
  const monster = isBoss
    ? G.buildMonster(zone, monsterLevel, zone.boss, "boss")
    : G.buildMonster(zone, monsterLevel, G.pick(zone.monsters), isElite ? "elite" : null);
  const me = G.buildCombatant(Object.assign({}, c, { hpCur: c.hpCur }), true, c.username);
  const sessionId = G.uid();
  const session = {
    sessionId, uid: ownerUid || null, mode: "pve", zoneId: zone.id, boss: isBoss, elite: isElite,
    me, foe: monster, round: 1, maxRounds: G.PVE_MAX_ROUNDS, ended: false, createdAt: now,
  };
  const payload = {
    sessionId, me, foe: monster, round: 1, maxRounds: G.PVE_MAX_ROUNDS,
    log: [{ text: isBoss ? `${monster.label} rises to meet you!` : `A ${monster.label} (Lv.${monster.level}) blocks your path!`, cls: "" }],
  };
  return { session, payload };
}

/* ============================================================
   startAdventure — validates + spends Energy, spawns the monster.
   Covers Normal / Elite / Boss (kind: null | 'elite' | 'boss').
   Only ONE active session per player: starting a new one overwrites
   the old one, matching the existing single-fight-at-a-time UX.
   ============================================================ */
exports.startAdventure = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const zoneId = data && data.zoneId;
  const kind = data && data.kind; // null | 'elite' | 'boss'
  const zone = G.ZONES.find((z) => z.id === zoneId);
  if (!zone) fail("invalid-argument", "INVALID_ACTION", { reason: "unknown zone" });
  const isBoss = kind === "boss", isElite = kind === "elite";

  const playerRef = db.doc("rc_players/" + uid);
  const sessionRef = db.doc(`rc_players/${uid}/combat/session`);

  return db.runTransaction(async (tx) => {
    const pSnap = await tx.get(playerRef);
    if (!pSnap.exists) fail("not-found", "ITEM_NOT_FOUND", { reason: "no character" });
    const c = pSnap.data();

    const { energyCur, maxEnergy, now } = G.applyEnergyRegen(c);
    const energyCost = isBoss ? G.BOSS_ENERGY_COST : isElite ? 20 : 10;
    if (energyCur < energyCost) {
      fail("failed-precondition", "NOT_ENOUGH_ENERGY", {
        required: energyCost, available: Math.floor(energyCur), perHour: G.energyRegenPerHour(maxEnergy),
      });
    }
    const bossCooldowns = c.bossCooldowns || {};
    if (isBoss) {
      const cd = (bossCooldowns[zoneId] || 0) - now;
      if (cd > 0) fail("failed-precondition", "COOLDOWN_ACTIVE", { msRemaining: cd });
    }

    const newEnergy = G.clamp(energyCur - energyCost, 0, maxEnergy);
    const update = { energyCur: newEnergy, lastEnergyAt: now };
    if (isBoss) update.bossCooldowns = Object.assign({}, bossCooldowns, { [zoneId]: now + G.BOSS_COOLDOWN_MS });

    const { session, payload } = spawnPveSession(c, zone, kind, now, uid);

    tx.update(playerRef, update);
    tx.set(sessionRef, session);

    return Object.assign({}, payload, { energyCur: newEnergy, maxEnergy, lastEnergyAt: now });
  });
});

/* ============================================================
   resolveCombatRound — the ONLY place PvE/Elite/Boss rewards are
   granted. Player-chosen action is validated (skill known + owned +
   affordable, item owned + correct effect) then resolved with the
   same formulas as the client used to run locally. Ending the
   session (ended:true + rewards applied) happens inside the same
   transaction that reads it, so a retried/duplicated call on an
   already-ended session is rejected before anything is re-granted.
   ============================================================ */
exports.resolveCombatRound = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const { sessionId, action } = data || {};
  if (!action || !action.kind) fail("invalid-argument", "INVALID_ACTION");

  const playerRef = db.doc("rc_players/" + uid);
  const sessionRef = db.doc(`rc_players/${uid}/combat/session`);

  return db.runTransaction(async (tx) => {
    const [pSnap, sSnap] = await Promise.all([tx.get(playerRef), tx.get(sessionRef)]);
    if (!pSnap.exists) fail("not-found", "ITEM_NOT_FOUND");
    if (!sSnap.exists || sSnap.data().sessionId !== sessionId || sSnap.data().ended) {
      fail("failed-precondition", "DUPLICATE_REQUEST", { reason: "no matching active session" });
    }
    const c = pSnap.data();
    const sess = sSnap.data();
    const me = sess.me, foe = sess.foe;
    const cls = G.CLASSES[c.class];

    // ---- validate + resolve the player's chosen action server-side ----
    let playerAction;
    if (action.kind === "attack" || action.kind === "defend" || action.kind === "flee") {
      playerAction = { kind: action.kind };
    } else if (action.kind === "skill") {
      const skill = cls.skills.find((s) => s.id === action.skillId);
      if (!skill) fail("invalid-argument", "INVALID_ACTION", { reason: "unknown skill" });
      const skillLevel = (c.classSkills && c.classSkills[skill.id]) || 0;
      if (me.resource < skill.cost) fail("failed-precondition", "NOT_ENOUGH_RESOURCE");
      playerAction = { kind: "skill", skill, skillLevel };
    } else if (action.kind === "item") {
      const idx = (c.inventory || []).findIndex((i) => i.uid === action.itemUid);
      if (idx < 0) fail("failed-precondition", "ITEM_NOT_FOUND");
      const item = c.inventory[idx];
      if (item.kind !== "consumable") fail("invalid-argument", "INVALID_ACTION");
      playerAction = { kind: "item", item };
      // consume it now — committed even if the fight continues, so abandoning the
      // session afterwards can't un-spend a potion that was already used.
      item.qty = (item.qty || 1) - 1;
      const inventory = item.qty > 0 ? c.inventory : c.inventory.filter((i) => i.uid !== action.itemUid);
      c.inventory = inventory;
      if (item.effect && item.effect.energy) {
        const regen = G.applyEnergyRegen(c);
        c.energyCur = G.clamp(regen.energyCur + item.effect.energy, 0, regen.maxEnergy);
        c.lastEnergyAt = regen.now;
      }
    } else {
      fail("invalid-argument", "INVALID_ACTION");
    }

    if (sess.ended) fail("failed-precondition", "DUPLICATE_REQUEST");

    const logs = [];
    let fleeSucceeded = false;
    if (playerAction.kind === "flee") {
      const chance = G.clamp(50 + (G.liveStat(me, "spd") - G.liveStat(foe, "spd")) * 2, 15, 90);
      fleeSucceeded = Math.random() * 100 < chance;
      logs.push({ text: fleeSucceeded ? "You escape the fight." : "You failed to escape!", cls: fleeSucceeded ? "good" : "hit" });
      if (!fleeSucceeded) {
        const foeAct = G.chooseAiAction(foe, me);
        const foeLvl = (foeAct.skill && foe.skillLevels) ? (foe.skillLevels[foeAct.skill.id] || 0) : 0;
        logs.push(...G.performAction(foe, me, foeAct, foeLvl));
        sess.round += 1;
      }
    } else {
      const meFirst = G.liveStat(me, "spd") >= G.liveStat(foe, "spd");
      const order = meFirst
        ? [{ who: me, other: foe, act: playerAction, sk: (playerAction.skillLevel || 0) },
          { who: foe, other: me, act: null, sk: 0 }]
        : [{ who: foe, other: me, act: null, sk: 0 },
          { who: me, other: foe, act: playerAction, sk: (playerAction.skillLevel || 0) }];
      for (const turn of order) {
        if (me.hp <= 0 || foe.hp <= 0) break;
        const act = turn.act || G.chooseAiAction(turn.who, turn.other);
        const skLvl = turn.act ? turn.sk : ((act.skill && turn.who.skillLevels) ? (turn.who.skillLevels[act.skill.id] || 0) : 0);
        logs.push(...G.performAction(turn.who, turn.other, act, skLvl));
      }
      G.tickBuffs(me); G.tickBuffs(foe);
      sess.round += 1;
    }

    let result = null;
    if (playerAction.kind === "flee" && fleeSucceeded) result = "flee";
    else if (foe.hp <= 0) result = "win";
    else if (me.hp <= 0) result = "lose";
    else if (sess.round > sess.maxRounds) result = "flee";

    if (!result) {
      tx.update(sessionRef, { me, foe, round: sess.round });
      tx.update(playerRef, { inventory: c.inventory, energyCur: c.energyCur, lastEnergyAt: c.lastEnergyAt });
      return { ended: false, logs, me, foe, round: sess.round };
    }
    // Reads must precede writes in a transaction: load the country economy (tax rate + any
    // active war tax) now; finishSession then splits the freshly generated resources.
    const econ = result === "win" ? await E.readEconomyForPlayer(tx, c) : null;
    return finishSession({ tx, playerRef, sessionRef, c, me, foe, sess, result, logs, econ });
  });
});

function finishSession({ tx, playerRef, sessionRef, c, me, foe, sess, result, logs, econ }) {
  const rewardLines = [];
  const eff = G.effectiveStats(c);
  c.hpCur = result === "lose" ? Math.max(1, Math.round(eff.maxHp * 0.15)) : G.clamp(me.hp, 1, eff.maxHp);
  if (c.class === "mage") c.manaCur = G.clamp(me.resource, 0, eff.maxMana);
  else c.resourceCur = 0;

  const zone = G.ZONES.find((z) => z.id === sess.zoneId);
  if (result === "win") {
    const rewardMult = sess.boss ? 3.2 : sess.elite ? 1.9 : 1;
    const dropChance = sess.boss ? 1 : sess.elite ? 0.55 : 0.35;
    const xpGain = Math.round(G.rnd(8, 14) * foe.level * rewardMult);
    const goldGain = Math.round(G.rnd(6, 12) * foe.level * rewardMult);
    c.xp = (c.xp || 0) + xpGain; c.gold = (c.gold || 0) + goldGain;
    const resGain = {};
    zone.resources.forEach((r) => { resGain[r] = Math.round(G.rndInt(2, 6) * rewardMult); });
    // Country tax / war tax are taken from the NEW gain only, never from what the player already holds.
    const taxed = E.applyTaxToGains(econ, c, resGain, Date.now());
    zone.resources.forEach((r) => { c.resourceBag[r] = (c.resourceBag[r] || 0) + taxed.net[r]; });
    E.commitEconomy(tx, econ, taxed);
    rewardLines.push({ label: "XP gained", value: "+" + xpGain }, { label: "Gold gained", value: "+" + goldGain });
    rewardLines.push({ label: "Resources", value: zone.resources.map((r) => `+${taxed.net[r]} ${r}`).join(", ") + taxLabel(taxed) });
    let dropLine = "None";
    if (Math.random() < dropChance && c.inventory.length < G.BAG_CAPACITY) {
      const slot = G.pick(G.EQUIP_SLOTS);
      const tier = sess.boss ? G.pickTierForBoss(zone) : G.pickTierForZone(zone, sess.elite);
      const item = G.makeEquipment(slot, tier.id, foe.level);
      c.inventory.push(item);
      dropLine = `${item.name} (${tier.name})`;
    } else if (sess.boss && c.inventory.length >= G.BAG_CAPACITY) {
      dropLine = "Bag full — drop lost!";
    }
    rewardLines.push({ label: "Item drop", value: dropLine });
    checkLevelUps(c, rewardLines);
  } else if (result === "lose") {
    rewardLines.push({ label: "Result", value: "Defeated — no rewards." });
  } else {
    rewardLines.push({ label: "Result", value: "You retreated safely." });
  }

  tx.update(playerRef, {
    hpCur: c.hpCur, manaCur: c.manaCur, resourceCur: c.resourceCur,
    xp: c.xp, level: c.level, skillPoints: c.skillPoints, gold: c.gold,
    resourceBag: c.resourceBag, inventory: c.inventory, taxCarry: c.taxCarry || {},
    energyCur: c.energyCur, lastEnergyAt: c.lastEnergyAt,
  });
  tx.delete(sessionRef);
  return { ended: true, result, logs, rewardLines, me, foe };
}

function taxLabel(taxed) {
  const parts = taxed.lines.filter((l) => l.normal || l.war).map((l) => `${l.resource}: -${l.normal + l.war}`);
  return parts.length ? ` (country tax ${parts.join(", ")})` : "";
}

function checkLevelUps(c, rewardLines) {
  let leveled = 0;
  while (c.xp >= G.xpNeeded(c.level)) { c.xp -= G.xpNeeded(c.level); c.level += 1; c.skillPoints = (c.skillPoints || 0) + 1; leveled++; }
  if (leveled > 0) {
    const eff = G.effectiveStats(c);
    c.hpCur = eff.maxHp; c.manaCur = eff.maxMana;
    // Energy is deliberately NOT refilled on level-up (spec §7).
    rewardLines.push({ label: "Level up!", value: `Reached level ${c.level} (+${leveled} skill point${leveled > 1 ? "s" : ""})` });
  }
}

/* ============================================================
   takeRoadStep — the Road ("Take a Step") moved server-side so the resources
   it generates can be taxed by the same code as PvE. Same odds and amounts as
   the old client version. A "monster" step returns a ready PvE session (no
   extra Energy) that the client plays through resolveCombatRound.
   ============================================================ */
exports.takeRoadStep = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const zone = G.ZONES.find((z) => z.id === (data && data.zoneId));
  if (!zone) fail("invalid-argument", "INVALID_ACTION", { reason: "unknown zone" });
  const playerRef = db.doc("rc_players/" + uid);
  const sessionRef = db.doc(`rc_players/${uid}/combat/session`);

  return wrap(() => db.runTransaction(async (tx) => {
    const pSnap = await tx.get(playerRef);
    if (!pSnap.exists) fail("not-found", "ITEM_NOT_FOUND", { reason: "no character" });
    const c = pSnap.data();
    if (c.level < zone.min - 5) fail("failed-precondition", "INVALID_ACTION", { reason: "zone locked" });

    const { energyCur, maxEnergy, now } = G.applyEnergyRegen(c);
    if (energyCur < G.STEP_ENERGY_COST) {
      fail("failed-precondition", "NOT_ENOUGH_ENERGY", { required: G.STEP_ENERGY_COST, available: Math.floor(energyCur), perHour: G.energyRegenPerHour(maxEnergy) });
    }
    const ev = G.pickStepEvent();
    const econ = ev === "resource" ? await E.readEconomyForPlayer(tx, c) : null; // all reads first
    c.energyCur = G.clamp(energyCur - G.STEP_ENERGY_COST, 0, maxEnergy);
    c.lastEnergyAt = now;
    const res = { event: ev };
    const update = { energyCur: c.energyCur, lastEnergyAt: now };

    if (ev === "gold") {
      res.gold = G.rndInt(2, 7); update.gold = (c.gold || 0) + res.gold;
    } else if (ev === "resource") {
      const r = G.pick(zone.resources);
      const taxed = E.applyTaxToGains(econ, c, { [r]: G.rndInt(1, 3) }, now);
      c.resourceBag[r] = (c.resourceBag[r] || 0) + taxed.net[r];
      E.commitEconomy(tx, econ, taxed);
      res.resource = r; res.amount = taxed.net[r]; res.gross = taxed.lines[0] ? taxed.lines[0].gross : taxed.net[r];
      update.resourceBag = c.resourceBag; update.taxCarry = c.taxCarry || {};
    } else if (ev === "xp") {
      res.xp = G.rndInt(2, 5); c.xp = (c.xp || 0) + res.xp;
      const lines = []; checkLevelUps(c, lines); res.levelLines = lines.map((l) => l.value);
      Object.assign(update, { xp: c.xp, level: c.level, skillPoints: c.skillPoints, hpCur: c.hpCur, manaCur: c.manaCur });
    } else if (ev === "item") {
      if ((c.inventory || []).length < G.BAG_CAPACITY) {
        const item = G.makeEquipment(G.pick(G.EQUIP_SLOTS), G.TIERS[0].id, c.level);
        c.inventory.push(item); update.inventory = c.inventory; res.item = { name: item.name };
      } else res.bagFull = true;
    } else if (ev === "monster") {
      const { session, payload } = spawnPveSession(c, zone, null, now, uid);
      tx.set(sessionRef, session);
      res.monster = payload;
    }
    tx.update(playerRef, update);
    res.energyCur = c.energyCur; res.lastEnergyAt = now;
    return res;
  }));
});

/* ============================================================
   Country economy & war callables (logic in lib/war.js).
   ============================================================ */
function wrap(fn) {
  return Promise.resolve().then(fn).catch((e) => {
    if (e instanceof ApiError) throw new functions.https.HttpsError(e.code, e.message, e.details || {});
    throw e;
  });
}
exports.getCountryState = functions.https.onCall((data, context) => wrap(() => War.getCountryState(requireAuth(context))));
exports.getWorldWars = functions.https.onCall((data, context) => wrap(() => War.getWorldWars(requireAuth(context))));
exports.declareWar = functions.https.onCall((data, context) => wrap(() => War.declareWar(requireAuth(context), data)));
exports.warStrike = functions.https.onCall((data, context) => wrap(() => War.warStrike(requireAuth(context))));
exports.chooseWarReward = functions.https.onCall((data, context) => wrap(() => War.chooseWarReward(requireAuth(context), data)));
exports.setCountrySpecialities = functions.https.onCall((data, context) => wrap(() => War.setCountrySpecialities(requireAuth(context), data)));
exports.getCountryPublic = functions.https.onCall((data, context) => wrap(() => War.getCountryPublic(requireAuth(context), data)));
exports.transferLeadership = functions.https.onCall((data, context) => wrap(() => Community.transferLeadership(requireAuth(context), data)));
exports.claimDailyReward = functions.https.onCall((data, context) => wrap(() => Community.claimDailyReward(requireAuth(context))));

// Finishes rounds / expires war taxes even when nobody is online. Needs Cloud Scheduler
// (Blaze plan). Everything it does is also done lazily by the callables above.
if (functions.pubsub && functions.pubsub.schedule) {
  exports.warTick = functions.pubsub.schedule("every 1 minutes").onRun(() => War.tickWars());
}

};
window.LocalFn = async function(name, payload, uid){
  const api = __require('index');
  if(typeof api[name] !== 'function') throw new HttpsError('not-found', 'UNKNOWN_FUNCTION', {});
  return api[name](payload || {}, { auth: { uid } });
};
})();

;
/* ---- js/storage.js ---- */

/* ============================================================
   STORAGE LAYER (Firebase Firestore + Auth -> falls back to localStorage)
   ============================================================ */
const LS_KEY_PREFIX = 'arcadia_v1_';

// Shares the same Firebase project as the Arcadia MMO game ("444-main") on
// purpose — one project, two games. To avoid stepping on Arcadia's data,
// every RealmClash collection is namespaced with an 'rc_' prefix (rc_players,
// rc_kingdoms, rc_marketListings, meta/rc_generalChat) instead of the bare
// names Arcadia uses (players, kingdoms/alliances, marketListings, etc). Keep
// that prefix on any NEW collection you add here too, or the two games will
// silently overwrite each other's documents.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDaZVxynpwb2lkHuCCJuQ4ICZfVAvjHmuU',
  authDomain: 'arcadaimmo.firebaseapp.com',
  projectId: 'arcadaimmo',
  storageBucket: 'arcadaimmo.firebasestorage.app',
  messagingSenderId: '302453347843',
  appId: '1:302453347843:web:0c96be2b644f89b4aee036',
  measurementId: 'G-SB1HFYTBHY',
};

let DB = null, USER = null, MY_ID = null, HAS_DB = false;
// Analytics is optional — guarded separately below since the -compat script
// can fail to load (ad-blockers, offline) without taking the rest of
// Firebase (Auth/Firestore/Functions) down with it.
let ANALYTICS = null;
// Callable Cloud Functions — the server-authoritative endpoints for actions that
// spend Energy and grant rewards. Only PvE/Elite/Boss are migrated so far (see
// startAdventure/resolveCombatRound in functions/index.js); Crafting, Market, PvP,
// Kingdom and Equipment upgrades still resolve locally until they're migrated too.
let FUNCTIONS = null;
// Spark mode: no Cloud Functions. The same logic runs in the browser (js/server-local.js).
// Set to false (and remove the server-local.js <script> in index.html) once Blaze is on.
const USE_LOCAL_FN = true;
let FB_AUTH = null, FB_USER_EMAIL = null;

function withTimeout(promise, ms){
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')), ms)),
  ]);
}

// Firestore's native API already speaks the doc/collection shape the game
// logic expects (doc().get/set/update/delete, collection().where().orderBy()
// .limit().get/add), so DB below is just the Firestore instance itself —
// no translation layer needed like the old Supabase version required.
// The one thing Firestore has no built-in for is the short-lived market
// lock, so that's a small helper (acquireDocLock) instead of a ref method.
async function acquireDocLock(ref, holder, ttlMs){
  const now = Date.now();
  try{
    const acquired = await DB.runTransaction(async (tx)=>{
      const snap = await tx.get(ref);
      if(!snap.exists) return false;
      const d = snap.data() || {};
      const lockUntil = d.__lockUntil || 0;
      const lockHolder = d.__lockHolder || null;
      if(lockUntil > now && lockHolder !== holder) return false;
      tx.update(ref, { __lockHolder: holder, __lockUntil: now + ttlMs });
      return true;
    });
    return { acquired: !!acquired };
  }catch(e){ return { acquired: false }; }
}

// Resolves once Firebase Auth has settled its initial state (signed-in
// already, or definitely signed-out), mirroring Supabase's getSession().
function waitForAuthUser(auth){
  return new Promise(resolve=>{
    const unsub = auth.onAuthStateChanged(u=>{ unsub(); resolve(u); });
  });
}

// Case-insensitive check that no OTHER player already has this username.
// Best-effort: a network hiccup here never blocks character creation.
// Matched against a lowercased `usernameLower` field written alongside the
// character in saveCharacter(), since Firestore has no ILIKE.
async function isUsernameTaken(username){
  if(!HAS_DB) return false;
  try{
    const q = await withTimeout(
      DB.collection('rc_players').where('usernameLower','==', (username||'').toLowerCase()).limit(5).get(),
      6000
    );
    return q.docs.some(d=> d.id !== MY_ID);
  }catch(e){ return false; }
}

async function initCapabilities(){
  try{
    const configured = FIREBASE_CONFIG.apiKey.indexOf('YOUR_FIREBASE')===-1;
    if(configured && window.firebase){
      if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      FB_AUTH = firebase.auth();
      DB = firebase.firestore();
      try{ if(firebase.functions) FUNCTIONS = firebase.functions(); }catch(e){ console.warn('Functions SDK unavailable:', e); }
      try{ if(firebase.analytics) ANALYTICS = firebase.analytics(); }catch(e){ console.warn('Analytics init failed:', e); }
      // If we're bouncing back from a Google redirect sign-in, pick that up
      // first. Most errors here (e.g. the user closed the popup) are safe to
      // ignore, but 'credential-already-in-use' means this Google identity
      // is already linked to a DIFFERENT Firebase user (e.g. from an earlier
      // test run) — the current anonymous session can't claim it, so we sign
      // in as that existing account directly using the credential attached
      // to the error, instead of silently staying anonymous forever.
      try{ await withTimeout(FB_AUTH.getRedirectResult(), 8000); }
      catch(e){
        if(e && e.code === 'auth/credential-already-in-use' && e.credential){
          try{ await withTimeout(FB_AUTH.signInWithCredential(e.credential), 8000); }catch(e2){}
        } else if(e){
          console.warn('Google redirect sign-in failed:', e.code || e.message || e);
        }
      }
      // Every visitor gets a real Firebase Auth session, starting anonymous.
      // Linking Google later keeps the SAME uid, so existing progress
      // carries over automatically instead of needing a data migration.
      let user = await withTimeout(waitForAuthUser(FB_AUTH), 6000).catch(()=>null);
      if(!user){
        const cred = await withTimeout(FB_AUTH.signInAnonymously(), 8000);
        user = cred.user;
      }
      MY_ID = user.uid;
      FB_USER_EMAIL = user.email || null;
      FB_AUTH.onAuthStateChanged(u=>{
        FB_USER_EMAIL = u ? (u.email || null) : null;
        if(u) MY_ID = u.uid;
        if(S.screen==='profile' && S.profileTab==='settings') render();
      });
    }
  }catch(e){ console.warn('Firebase init failed — falling back to local-only storage:', e); DB = null; FB_AUTH = null; }
  if(!MY_ID){
    try{
      MY_ID = localStorage.getItem(LS_KEY_PREFIX+'guest_id');
      if(!MY_ID){ MY_ID = 'guest_'+uid(); localStorage.setItem(LS_KEY_PREFIX+'guest_id', MY_ID); }
    }catch(e){ MY_ID = 'guest_'+uid(); }
  }
  HAS_DB = !!DB;
}

// Starts Google sign-in via a popup window. If the visitor is still on their
// anonymous session this LINKS Google to that same account (uid unchanged,
// progress kept); if they're already signed in it just re-auths.
// Uses a popup (not a full-page redirect) because Chrome's bounce-tracking
// mitigation can wipe the sessionStorage a redirect flow depends on when it
// bounces through the authDomain (firebaseapp.com) — a popup avoids that
// multi-hop navigation chain entirely, and resolves in-place with no reload.
async function linkGoogleAccount(){
  if(!FB_AUTH){ showToast('Google sign-in needs shared storage, unavailable in this view.'); return; }
  showToast('Opening Google sign-in…');
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    const user = FB_AUTH.currentUser;
    let result;
    try{
      result = (user && user.isAnonymous)
        ? await user.linkWithPopup(provider)
        : await FB_AUTH.signInWithPopup(provider);
    }catch(e){
      // This Google identity is already linked to a DIFFERENT Firebase user
      // (e.g. from an earlier test run) — sign in as that existing account
      // directly using the credential attached to the error, instead of
      // failing the whole flow.
      if(e && e.code === 'auth/credential-already-in-use' && e.credential){
        result = await FB_AUTH.signInWithCredential(e.credential);
      } else throw e;
    }
    MY_ID = result.user.uid;
    FB_USER_EMAIL = result.user.email || null;
    // No page reload happens with a popup, so pick the next screen ourselves
    // instead of relying on boot() to re-run.
    const existing = await loadCharacter();
    if(existing){ S.char = migrateCharacter(existing); applyRegen(S.char); }
    setScreen(S.char ? 'home' : 'create');
    if(existing) saveCharacter(S.char); // fire-and-forget: persists the migration/regen in the background
  }catch(e){ showToast('Google sign-in error: ' + (e && e.message ? e.message : String(e))); }
}

// Calls a server-authoritative Cloud Function and normalizes its errors into
// {code, message, details} so callers can show a specific reason (e.g.
// NOT_ENOUGH_ENERGY with required/available) instead of a generic failure —
// per spec: never fall back to a silent/generic "Something went wrong".
async function callFn(name, payload){
  if(USE_LOCAL_FN && window.LocalFn){
    try{
      if(!MY_ID) throw {code:'unauthenticated', message:'UNAUTHORIZED', details:{}};
      return await withTimeout(window.LocalFn(name, payload||{}, MY_ID), 20000);
    }catch(e){
      throw { code: e.code || 'unknown', message: e.message || 'UNKNOWN_ERROR', details: e.details || {} };
    }
  }
  if(!FUNCTIONS){ throw {code:'unavailable', message:'UNAVAILABLE', details:{}}; }
  try{
    const res = await withTimeout(FUNCTIONS.httpsCallable(name)(payload||{}), 15000);
    return res.data;
  }catch(e){
    throw { code: e.code || 'unknown', message: e.message || 'UNKNOWN_ERROR', details: e.details || {} };
  }
}

async function loadCharacter(){
  if(HAS_DB){
    try{
      const snap = await withTimeout(DB.doc('rc_players/'+MY_ID).get(), 5000);
      if(snap.exists) return snap.data();
    }catch(e){ /* fall through to local */ }
  }
  try{
    const raw = localStorage.getItem(LS_KEY_PREFIX+'char_'+MY_ID);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
let _lastSaveJson = null;
// Tracks whether the LAST attempted cloud write for _lastSaveJson actually
// succeeded. Without this, a save that fails (dropped connection, cold
// Firestore/Auth handshake right after character creation, etc.) would still
// set _lastSaveJson, and every later call with that same unchanged JSON would
// hit the dedupe check below and skip retrying forever — silently stranding
// the character in localStorage only. A player who then opens the game on
// another device/browser (or after clearing storage) finds no doc in
// Firestore and gets sent back to character creation. Gating the dedupe on
// _lastCloudSaveOk too means an unchanged character keeps retrying the cloud
// write on every saveCharacter() call until one actually lands.
let _lastCloudSaveOk = false;
async function saveCharacter(c){
  c.updatedAt = Date.now();
  const json = JSON.stringify(c);
  if(json === _lastSaveJson && (!HAS_DB || _lastCloudSaveOk)) return _lastCloudSaveOk;
  _lastSaveJson = json;
  try{ localStorage.setItem(LS_KEY_PREFIX+'char_'+MY_ID, json); }catch(e){}
  if(HAS_DB){
    try{
      // usernameLower rides along in the Firestore doc only, so
      // isUsernameTaken() can query it — it's not part of the saved shape.
      const withLower = Object.assign({}, JSON.parse(json), { usernameLower: (c.username||'').toLowerCase() });
      await withTimeout(DB.doc('rc_players/'+MY_ID).set(withLower), 5000);
      _lastCloudSaveOk = true;
    }catch(e){ console.warn('Cloud save failed (kept locally):', e); _lastCloudSaveOk = false; }
  } else {
    _lastCloudSaveOk = true; // no cloud to confirm against — local write above is the whole story
  }
  return _lastCloudSaveOk;
}
/* ---------------- Kingdom system ---------------- */
async function loadKingdomView(){
  if(!HAS_DB){ S.kingdomView = {unavailable:true}; render(); return; }
  S.kingdomView = {loading:true};
  render();
  const c = S.char;
  try{
    // Another member may have promoted/demoted/kicked us since our last load —
    // resync our own membership fields from our own doc (the source of truth)
    // before rendering, rather than trusting our possibly-stale in-memory copy.
    try{
      const selfSnap = await withTimeout(DB.doc('rc_players/'+MY_ID).get(), 6000);
      if(selfSnap.exists){
        const sd = selfSnap.data();
        if(sd.kingdomId !== undefined) c.kingdomId = sd.kingdomId;
        if(sd.kingdomRole !== undefined) c.kingdomRole = sd.kingdomRole;
        if(sd.kingdomCooldownUntil !== undefined) c.kingdomCooldownUntil = sd.kingdomCooldownUntil;
      }
    }catch(e){ /* keep local copy if this fails */ }
    if(c.kingdomId){
      const [kdocSnap, memSnap] = await Promise.all([
        withTimeout(DB.doc('rc_kingdoms/'+c.kingdomId).get(), 6000),
        withTimeout(DB.collection('rc_players').where('kingdomId','==',c.kingdomId).limit(80).get(), 6000),
      ]);
      const kdoc = kdocSnap.exists ? kdocSnap.data() : { treasury:{}, leaderId:null, chat:[] };
      // Leadership can change on the server (hand-over, absent Leader replaced) while this device still holds an old copy
      // of our player doc — make our own role agree with the country's Leader pointer before rendering.
      if(kdoc.leaderId === MY_ID && c.kingdomRole !== 'Leader'){ c.kingdomRole = 'Leader'; saveCharacter(c); }
      else if(kdoc.leaderId && kdoc.leaderId !== MY_ID && c.kingdomRole === 'Leader'){ c.kingdomRole = 'Co-Leader'; saveCharacter(c); }
      const members = memSnap.docs.map(d=>Object.assign({id:d.id}, d.data()))
        .filter(m=>m.username)
        .sort((a,b)=> kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole) || (b.level||1)-(a.level||1));
      S.kingdomView = { mode:'mine', kingdom: Object.assign({id:c.kingdomId}, kdoc), members };
    } else {
      const [kSnap, pSnap] = await Promise.all([
        withTimeout(DB.collection('rc_kingdoms').get(), 8000).catch(()=>null),
        withTimeout(DB.collection('rc_players').limit(500).get(), 8000).catch(()=>null),
      ]);
      const treasuries = {}, counts = {};
      if(kSnap) kSnap.docs.forEach(d=>{ treasuries[d.id] = d.data().treasury || {}; });
      if(pSnap) pSnap.docs.forEach(d=>{ const id = d.data().kingdomId; if(id) counts[id] = (counts[id]||0)+1; });
      S.kingdomView = { mode:'browse', kingdoms: KINGDOMS.map(k=>Object.assign({}, k, {
        treasury: treasuries[k.id] || {},
        memberCount: counts[k.id] || 0,
      })) };
    }
  }catch(e){
    S.kingdomView = { error:true };
  }
  render();
}

// Creates the kingdom doc if needed and returns the role this player gets (first member = Leader).
// Country economy + war state. Everything shown comes from the getCountryState Cloud
// Function (including the server's clock), so the client never does any war maths.

async function loadWorldWars(silent=false){
  if(!HAS_DB && !(USE_LOCAL_FN && window.LocalFn)){ S.worldWars = {active:[], recent:[], unavailable:true}; render(); return; }
  try{
    const data=await callFn('getWorldWars');
    S.serverOffset=(data.serverNow||Date.now())-Date.now();
    S.worldWars={active:data.active||[], recent:data.recent||[], at:Date.now()};
    S.worldWarsAt=Date.now();
    claimWarRewards();
  }catch(e){
    if(!S.worldWars) S.worldWars={active:[],recent:[],error:true};
  }
  render();
}
async function loadCountryState(silent){
  if(!HAS_DB || (!FUNCTIONS && !(USE_LOCAL_FN && window.LocalFn))){ S.countryState = {status:'unavailable', data:null}; render(); return; }
  const prev = S.countryState && S.countryState.data;
  if(!silent || !prev){ S.countryState = {status:'loading', data:prev||null}; render(); }
  try{
    const data = await callFn('getCountryState');
    S.serverOffset = data.serverNow - Date.now();
    S.countryState = {status:'ready', data, at:Date.now()};
  }catch(e){
    S.countryState = {status:'error', data:prev||null, message:e.message};
  }
  render();
}

function weekKeyNow(){ return Math.floor((Date.now() + (S.serverOffset||0) - 345600000) / 604800000); }
function weekResetsAt(){ return (weekKeyNow()+1) * 604800000 + 345600000; }
async function loadRankingsView(){
  if(!HAS_DB){ S.rankingsView = {unavailable:true}; render(); return; }
  S.rankingsView = {loading:true};
  render();
  try{
    const snap = await withTimeout(DB.collection('rc_players').limit(500).get(), 8000);
    const byCountry = {}, players = [];
    snap.docs.forEach(d=>{
      const p = d.data();
      if(!p.username) return;
      p.id = d.id; players.push(p);
      if(!KINGDOMS.some(k=>k.id===p.kingdomId)) return;
      const r = byCountry[p.kingdomId] || (byCountry[p.kingdomId] = {id:p.kingdomId, players:0, totalLevel:0, ratingSum:0});
      r.players++; r.totalLevel += (p.level||1); r.ratingSum += (p.pvp && p.pvp.rating) || 1000;
    });
    const ratingOf = p=> (p.pvp && p.pvp.rating) || 1000;
    const wk = weekKeyNow(), wdmg = p=> (p.weeklyDmg && p.weeklyDmg.week===wk) ? (p.weeklyDmg.dmg||0) : 0;
    const cw = {};
    players.forEach(p=>{ const d=wdmg(p); if(d>0 && KINGDOMS.some(k=>k.id===p.kingdomId)){ const r=cw[p.kingdomId]||(cw[p.kingdomId]={id:p.kingdomId,dmg:0,fighters:0}); r.dmg+=d; r.fighters++; } });
    const list = players.map(p=>({id:p.id, username:p.username, level:p.level||1, kingdomId:p.kingdomId, rating:Math.round(ratingOf(p)), dmg:wdmg(p), cls:p.class}));
    const countries = Object.values(byCountry).map(r=>({id:r.id, players:r.players, totalLevel:r.totalLevel, avgRating:Math.round(r.ratingSum/r.players), dmg:(cw[r.id]&&cw[r.id].dmg)||0, fighters:(cw[r.id]&&cw[r.id].fighters)||0}));
    S.rankingsView = { at: Date.now(), list, countries };
  }catch(e){
    S.rankingsView = { error:true };
  }
  render();
}

async function claimKingdomSeat(kingdomId){
  if(!HAS_DB) return 'Recruit';
  const kRef = DB.doc('rc_kingdoms/'+kingdomId);
  const snap = await withTimeout(kRef.get(), 6000);
  const isFirstMember = !snap.exists || !snap.data().leaderId;
  const role = isFirstMember ? 'Leader' : 'Recruit';
  if(!snap.exists){
    await withTimeout(kRef.set({ id:kingdomId, treasury:{}, leaderId: isFirstMember?MY_ID:null, chat:[], createdAt:Date.now() }), 6000);
  } else if(isFirstMember){
    // The security rules require you to already be a member to take an empty Leader seat.
    await withTimeout(DB.doc('rc_players/'+MY_ID).update({ kingdomId }), 6000);
    await withTimeout(kRef.update({ leaderId: MY_ID }), 6000);
  }
  return role;
}

async function joinKingdom(kingdomId){
  const c = S.char;
  if(!HAS_DB){ showToast('Kingdoms need shared storage, which is unavailable in this view.'); return; }
  const cd = (c.kingdomCooldownUntil||0) - Date.now();
  if(cd > 0){ showToast(`You must wait ${fmtMs(cd)} before joining a new kingdom.`); return; }
  if(c.kingdomId){ showToast('Leave your current kingdom first.'); return; }
  showToast('Joining kingdom…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const role = await claimKingdomSeat(kingdomId);
    c.kingdomId = kingdomId; c.kingdomRole = role; c.kingdomJoinedAt = Date.now();
    saveCharacter(c); // fire-and-forget: our own character write doesn't need to block the success message
    showToast(`You joined ${KINGDOMS.find(k=>k.id===kingdomId).name} as ${role}.`);
    loadKingdomView(); // don't block on the follow-up refresh — it renders its own loading/final state as it goes
  }catch(e){ showToast('Could not join right now — try again.'); }
}

async function leaveKingdom(){
  const c = S.char;
  if(!c.kingdomId) return;
  if(!confirm('Leave your kingdom? You will need to wait 24 hours before joining another.')) return;
  const kingdomId = c.kingdomId;
  showToast('Leaving kingdom…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    if(HAS_DB && c.kingdomRole==='Leader'){
      const kRef = DB.doc('rc_kingdoms/'+kingdomId);
      try{ await withTimeout(kRef.update({leaderId:null}), 6000); }catch(e){}
    }
  }catch(e){}
  c.kingdomId = null; c.kingdomRole = null; c.kingdomJoinedAt = 0;
  c.kingdomCooldownUntil = Date.now() + KINGDOM_JOIN_COOLDOWN_MS;
  saveCharacter(c); // fire-and-forget
  S.kingdomView = null;
  showToast('You have left the kingdom.');
  loadKingdomView(); // don't block — it renders its own loading/final state
}

async function claimLeadership(){
  const c = S.char;
  if(!HAS_DB || !c.kingdomId) return;
  const _mem = (S.kingdomView && S.kingdomView.members) || [];
  const _hasOfficer = _mem.some(m=>kingdomRank(m.kingdomRole) >= 2);
  if(kingdomRank(c.kingdomRole) < 2 && _hasOfficer){ showToast('Only Officers and above may claim leadership.'); return; }
  showToast('Claiming leadership…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const kRef = DB.doc('rc_kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    if(snap.exists && snap.data().leaderId){ showToast('This kingdom already has a Leader.'); loadKingdomView(); return; }
    await withTimeout(kRef.update({leaderId: MY_ID}), 6000);
    c.kingdomRole = 'Leader';
    saveCharacter(c); // fire-and-forget
    showToast('You are now the Leader.');
    loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){ showToast('Could not claim leadership right now.'); }
}

async function donateToKingdom(resource, amount){
  const c = S.char;
  if(!HAS_DB || !c.kingdomId) return;
  amount = Math.floor(amount);
  if(!amount || amount<=0) return;
  const have = resource==='gold' ? c.gold : (c.resourceBag[resource]||0);
  if(have < amount){ showToast('Not enough to donate.'); return; }
  showToast('Donating…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const kRef = DB.doc('rc_kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    const treasury = (snap.exists && snap.data().treasury) || {};
    const newVal = (treasury[resource]||0) + amount;
    // Dot-notation targets just this one resource inside the treasury map — a plain
    // {treasury: {...}} update would silently WIPE every other resource already
    // donated by other members, since Firestore replaces the whole map field.
    await withTimeout(kRef.update({['treasury.'+resource]: newVal}), 6000);
    if(resource==='gold') c.gold -= amount; else c.resourceBag[resource] -= amount;
    saveCharacter(c); // fire-and-forget
    showToast(`Donated ${amount} ${resource==='gold'?'Gold':RESOURCE_NAMES[resource]||resource}.`);
    loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){ showToast('Donation failed — try again.'); }
}

async function sendKingdomChat(text, quiet){
  const c = S.char;
  text = (text||'').trim().slice(0,200);
  if(!text || !HAS_DB || !c.kingdomId) return;
  try{
    const kRef = DB.doc('rc_kingdoms/'+c.kingdomId);
    const snap = await withTimeout(kRef.get(), 6000);
    const chat = (snap.exists && Array.isArray(snap.data().chat)) ? snap.data().chat.slice() : [];
    chat.push({senderId:MY_ID, senderName:c.username, senderLevel:c.level||1, text, ts:Date.now()});
    while(chat.length > KINGDOM_CHAT_MAX) chat.shift();
    await withTimeout(kRef.update({chat}), 6000);
    if(quiet && S.kingdomView && S.kingdomView.mode==='mine'){
      S.kingdomView.kingdom = Object.assign({}, S.kingdomView.kingdom, {chat});
      S.kChatLastTs = Math.max(S.kChatLastTs||0, Date.now());
      render();
    } else loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){ showToast('Message failed to send.'); }
}

/* ---------------- General Chat ---------------- */
// Server-wide chat, visible to every player regardless of kingdom. Stored as a
// single capped array (same shape/approach as Kingdom Chat above) in one shared
// doc, rather than a per-message collection like marketListings — there's no
// need to query/filter/paginate this, so one doc is simpler and cheaper.
async function loadGeneralChat(){
  if(!HAS_DB){ S.generalChat = []; S.generalChatUnavailable = true; render(); return; }
  S.generalChat = null;
  render();
  try{
    const snap = await withTimeout(DB.doc('meta/rc_generalChat').get(), 6000);
    S.generalChat = (snap.exists && Array.isArray(snap.data().messages)) ? snap.data().messages : [];
  }catch(e){
    S.generalChat = [];
    console.error('loadGeneralChat failed:', e && e.code, e && e.message, e);
    showToast('Could not load chat — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
  render();
}

async function sendGeneralChat(text){
  const c = S.char;
  text = (text||'').trim().slice(0,200);
  if(!text || !HAS_DB) return;
  try{
    const ref = DB.doc('meta/rc_generalChat');
    const snap = await withTimeout(ref.get(), 6000);
    const chat = (snap.exists && Array.isArray(snap.data().messages)) ? snap.data().messages.slice() : [];
    chat.push({senderId:MY_ID, senderName:c.username, senderKingdom:c.kingdomId||null, senderLevel:c.level||1, text, ts:Date.now()});
    while(chat.length > GENERAL_CHAT_MAX) chat.shift();
    if(snap.exists) await withTimeout(ref.update({messages:chat}), 6000);
    else await withTimeout(ref.set({messages:chat}), 6000);
    loadGeneralChat(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('sendGeneralChat failed:', e && e.code, e && e.message, e);
    showToast('Message failed to send.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function kingdomManageMember(targetId, action){
  const c = S.char, kv = S.kingdomView;
  if(!HAS_DB || !kv || kv.mode!=='mine') return;
  const target = kv.members.find(m=>m.id===targetId);
  if(!target) return;
  const myRank = kingdomRank(c.kingdomRole), targetRank = kingdomRank(target.kingdomRole);
  if(myRank < 2 || myRank <= targetRank){ showToast('You do not have permission to do that.'); return; }
  try{
    if(action==='kick'){
      await withTimeout(DB.doc('rc_players/'+targetId).update({kingdomId:null, kingdomRole:null, kingdomCooldownUntil: Date.now()+KINGDOM_JOIN_COOLDOWN_MS}), 6000);
      showToast(`${target.username} was removed from the kingdom.`);
    } else if((action==='promote'||action==='demote') && myRank >= 3){
      const newRank = clamp(targetRank + (action==='promote'?1:-1), 0, myRank-1);
      await withTimeout(DB.doc('rc_players/'+targetId).update({kingdomRole: KINGDOM_ROLES[newRank]}), 6000);
      showToast(`${target.username} is now ${KINGDOM_ROLES[newRank]}.`);
    } else {
      showToast('You do not have permission to do that.'); return;
    }
    loadKingdomView(); // don't block — it renders its own loading/final state
  }catch(e){ showToast('Action failed — try again.'); }
}

// Picks up any "your listing sold" notices left by buyListing() (below) while
// we were away — self-writes/reads/deletes only, so this needs no extra
// Firestore rule beyond "owner can touch their own subcollection". Call this
// on boot and it'll surface a toast per sale, oldest first, then clear them.
// Picks up the results of fights other players had AGAINST us (left by endCombat in their own game) and applies
// them to our own character, which only our own device is allowed to rewrite. Each notice moves the rating by at
// most one ELO step (ELO_K), so a forged notice can't swing the ladder.
async function checkPvpResults(){
  if(!HAS_DB || !MY_ID || !S.char) return;
  try{
    const snap = await withTimeout(DB.collection('rc_players').doc(MY_ID).collection('pvpResults').orderBy('ts').limit(20).get(), 6000);
    if(snap.empty) return;
    const c = S.char, backup = JSON.parse(JSON.stringify(c.pvp));
    snap.docs.forEach((d,i)=>{
      const r = d.data();
      const delta = clamp(Math.round(Number(r.delta)||0), -ELO_K, ELO_K);
      c.pvp.rating = clamp((c.pvp.rating||1000) + delta, RATING_FLOOR, 100000);
      if(r.result==='win') c.pvp.wins++; else if(r.result==='lose') c.pvp.losses++;
      const verb = r.result==='win' ? 'You won' : r.result==='lose' ? 'You lost' : 'It was a draw';
      setTimeout(()=> showToast(`${r.fromName||'A player'} challenged you in PvP. ${verb} (${delta>=0?'+':''}${delta} rating).`), i*3000);
    });
    const saved = await saveCharacter(c);
    if(!saved){ c.pvp = backup; return; } // keep the notices and try again next time — never apply them twice
    const batch = DB.batch(); snap.docs.forEach(d=>batch.delete(d.ref)); await batch.commit();
    render();
  }catch(e){ console.warn('checkPvpResults failed:', e && e.code, e); }
}

async function checkMarketSales(){
  if(!HAS_DB || !MY_ID) return;
  try{
    const snap = await withTimeout(DB.collection('rc_players').doc(MY_ID).collection('marketSales').orderBy('ts').limit(20).get(), 6000);
    if(snap.empty) return;
    const batch = DB.batch();
    snap.docs.forEach((d,i)=>{
      const s = d.data();
      // Stagger so each sale gets its own readable toast instead of all of
      // them stomping on the single S.toast slot at once.
      setTimeout(()=> showToast(`Sold ${s.itemLabel} to ${s.buyerName} for ${s.totalPrice}g.`), i*3000);
      batch.delete(d.ref);
    });
    await batch.commit();
  }catch(e){ console.warn('checkMarketSales failed:', e && e.code, e); }
}

/* ---------------- Marketplace ---------------- */
function marketItemLabel(l){
  if(l.kind==='equipment') return `${l.itemName} <span class="tag tag-${l.tier}">${l.tier}</span>`;
  const iconFile = l.kind==='resource' ? RESOURCE_ICONS[l.itemId] : MATERIAL_ICONS[l.itemId];
  return `${itemIcon(iconFile,16,'margin-right:4px;')}${l.itemName} x${l.qty}`;
}
async function loadMarketListings(){
  if(!HAS_DB){ S.marketListings = []; S.marketUnavailable = true; render(); return; }
  S.marketListings = null;
  render();
  try{
    const snap = await withTimeout(DB.collection('rc_marketListings').orderBy('createdAt','desc').limit(MARKET_BROWSE_LIMIT).get(), 6000);
    S.marketListings = snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
  }catch(e){
    S.marketListings = [];
    console.error('loadMarketListings failed:', e && e.code, e && e.message, e);
    showToast('Could not load the market — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
  render();
}

function sellableResources(c){ return Object.entries(c.resourceBag).filter(([,v])=>v>0).map(([k,v])=>({id:k, name:RESOURCE_NAMES[k]||k, have:v})); }
function sellableByKind(c, kind){
  if(kind==='resource') return sellableResources(c);
  if(kind==='material') return c.inventory.filter(i=>i.kind==='material').map(i=>({id:i.uid, name:i.name, have:i.qty||1}));
  if(kind==='consumable') return c.inventory.filter(i=>i.kind==='consumable').map(i=>({id:i.uid, name:i.name, have:i.qty||1}));
  if(kind==='equipment') return c.inventory.filter(i=>i.kind==='equipment').map(i=>({id:i.uid, name:i.name+' ('+i.tier+')', have:1}));
  return [];
}

async function createListing(kind, itemKey, qty, pricePerUnit){
  const c = S.char;
  if(!HAS_DB){ showToast('The market needs shared storage, unavailable in this view.'); return; }
  qty = Math.max(1, Math.floor(qty||1));
  pricePerUnit = Math.max(1, Math.floor(pricePerUnit||0));
  if(!pricePerUnit){ showToast('Set a price first.'); return; }
  if(bagCount(c) >= BAG_CAPACITY && kind!=='resource'){ /* listing removes an item so this is fine, no-op guard */ }

  let listing = { sellerId: MY_ID, sellerName: c.username, sellerKingdom: c.kingdomId||null, kind, createdAt: Date.now() };

  if(kind==='resource'){
    const have = c.resourceBag[itemKey]||0;
    if(have < qty){ showToast('Not enough of that resource.'); return; }
    c.resourceBag[itemKey] -= qty;
    listing.itemId = itemKey; listing.itemName = RESOURCE_NAMES[itemKey]||itemKey; listing.qty = qty; listing.pricePerUnit = pricePerUnit; listing.totalPrice = qty*pricePerUnit;
  } else {
    const idx = c.inventory.findIndex(i=>i.uid===itemKey);
    if(idx<0){ showToast('Item not found in your bag.'); return; }
    const item = c.inventory[idx];
    if(kind==='equipment'){
      c.inventory.splice(idx,1);
      listing.itemId = item.id||item.uid; listing.itemName = item.name; listing.qty = 1; listing.pricePerUnit = pricePerUnit; listing.totalPrice = pricePerUnit;
      listing.tier = item.tier; listing.equipmentSnapshot = item;
    } else {
      qty = Math.min(qty, item.qty||1);
      if(qty >= (item.qty||1)) c.inventory.splice(idx,1); else item.qty -= qty;
      listing.itemId = item.id; listing.itemName = item.name; listing.qty = qty; listing.pricePerUnit = pricePerUnit; listing.totalPrice = qty*pricePerUnit;
      if(item.effect) listing.effect = item.effect;
    }
  }

  try{
    await withTimeout(DB.collection('rc_marketListings').add(listing), 6000);
    saveCharacter(c); // fire-and-forget
    showToast('Listing created.');
    loadMarketListings(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('createListing failed:', e && e.code, e && e.message, e);
    showToast('Could not create the listing — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function buyListing(listingId){
  const c = S.char;
  if(!HAS_DB) return;
  const ref = DB.doc('rc_marketListings/'+listingId);
  showToast('Buying…'); // immediate feedback so the button doesn't feel frozen while we talk to the server
  try{
    const lease = await withTimeout(acquireDocLock(ref, MY_ID, 6000), 6000);
    if(!lease.acquired){ showToast('Someone else is buying this right now — try again in a moment.'); return; }
    const snap = await withTimeout(ref.get(), 6000);
    if(!snap.exists){ showToast('That listing is already gone.'); await loadMarketListings(); return; }
    const l = snap.data();
    if(l.sellerId === MY_ID){ showToast("You can't buy your own listing."); return; }
    if(c.gold < l.totalPrice){ showToast('Not enough gold.'); return; }
    if(l.kind!=='resource' && bagCount(c) >= BAG_CAPACITY){ showToast('Your bag is full.'); return; }

    // Credit the seller FIRST, while the listing this credit is justified by still
    // exists — the Firestore rule for this cross-account write checks that (see
    // firestore.rules). Doing it in this order (before the listing is deleted)
    // means if it's rejected, the buyer hasn't lost anything yet either.
    const sellerRef = DB.doc('rc_players/'+l.sellerId);
    const sellerSnap = await withTimeout(sellerRef.get(), 6000);
    if(!sellerSnap.exists){ showToast('Seller no longer exists — purchase cancelled.'); await ref.delete().catch(()=>{}); return; }
    const sd = sellerSnap.data();
    await withTimeout(sellerRef.update({ gold: (sd.gold||0) + l.totalPrice, lastCreditedListingId: listingId }), 6000);

    // Tell the seller what sold, next time they check the market — the gold
    // above already landed even if they're offline right now, but without
    // this they'd just see a gold change with no idea why. Same pattern as
    // Arcadia's marketSales notices: a create-only doc in the seller's own
    // subcollection (a buyer can't write anywhere else on the seller's
    // player doc), which the seller's own client reads and clears. Best
    // effort — if this fails the sale itself already went through above.
    DB.collection('rc_players').doc(l.sellerId).collection('marketSales').add({
      buyerName: S.char && S.char.username || 'A player',
      itemLabel: marketItemLabel(l).replace(/<[^>]+>/g,''),
      totalPrice: l.totalPrice,
      ts: Date.now(),
    }).catch(e=>console.warn('Could not deliver sale notice to seller:', e && e.code, e));

    // Only after the seller has been paid do we transfer the item and remove the listing.
    c.gold -= l.totalPrice;
    if(l.kind==='resource'){
      c.resourceBag[l.itemId] = (c.resourceBag[l.itemId]||0) + l.qty;
    } else if(l.kind==='equipment'){
      const item = Object.assign({}, l.equipmentSnapshot, {uid: uid()});
      c.inventory.push(item);
    } else {
      const existing = c.inventory.find(i=>i.kind===l.kind && i.id===l.itemId);
      if(existing) existing.qty = (existing.qty||1) + l.qty;
      else c.inventory.push({uid: uid(), kind: l.kind, id: l.itemId, name: l.itemName, qty: l.qty, effect: l.effect});
    }
    await ref.delete();
    saveCharacter(c); // fire-and-forget

    showToast(`Bought ${marketItemLabel(l).replace(/<[^>]+>/g,'')} for ${l.totalPrice}g.`);
    loadMarketListings(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('buyListing failed:', e && e.code, e && e.message, e);
    showToast('Purchase failed — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function cancelListing(listingId){
  const c = S.char;
  if(!HAS_DB) return;
  const ref = DB.doc('rc_marketListings/'+listingId);
  try{
    const snap = await withTimeout(ref.get(), 6000);
    if(!snap.exists){ await loadMarketListings(); return; }
    const l = snap.data();
    if(l.sellerId !== MY_ID){ showToast('This is not your listing.'); return; }
    if(l.kind!=='resource' && bagCount(c) >= BAG_CAPACITY){ showToast('Your bag is full — make room before cancelling.'); return; }
    if(l.kind==='resource'){
      c.resourceBag[l.itemId] = (c.resourceBag[l.itemId]||0) + l.qty;
    } else if(l.kind==='equipment'){
      c.inventory.push(Object.assign({}, l.equipmentSnapshot, {uid: uid()}));
    } else {
      const existing = c.inventory.find(i=>i.kind===l.kind && i.id===l.itemId);
      if(existing) existing.qty = (existing.qty||1) + l.qty;
      else c.inventory.push({uid: uid(), kind: l.kind, id: l.itemId, name: l.itemName, qty: l.qty, effect: l.effect});
    }
    await ref.delete();
    saveCharacter(c); // fire-and-forget
    showToast('Listing cancelled — item returned to your bag.');
    loadMarketListings(); // don't block — it renders its own loading/final state
  }catch(e){
    console.error('cancelListing failed:', e && e.code, e && e.message, e);
    showToast('Could not cancel — try again.'+(e&&e.code?' ('+e.code+')':''));
  }
}

async function findOpponents(myChar){
  const myLevel = myChar.level;
  const tolerance = Math.max(4, Math.round(myLevel*0.2));
  let candidates = [];
  if(HAS_DB){
    try{
      const snap = await withTimeout(DB.collection('rc_players').limit(60).get(), 5000);
      const now = Date.now();
      snap.docs.forEach(d=>{
        const data = d.data();
        if(!data || d.id===MY_ID) return;
        if(!data.username || !data.class) return;
        if(Math.abs((data.level||1)-myLevel) > tolerance) return;
        if((data.pvp && data.pvp.protectedUntil||0) > now) return;
        candidates.push(Object.assign({id:d.id}, data));
      });
    }catch(e){ /* ignore, fall back to bots */ }
  }
  // top up with bots so there is always something to fight
  while(candidates.length < 3){
    const lvl = clamp(myLevel + rndInt(-Math.min(3,tolerance), Math.min(3,tolerance)), 1, 400);
    const rating = clamp((myChar.pvp.rating||1000) + rndInt(-70,70), RATING_FLOOR, 5000);
    candidates.push(buildBotOpponent(lvl, rating));
  }
  candidates.sort((a,b)=> Math.abs((a.pvp?.rating||1000)-(myChar.pvp.rating||1000)) - Math.abs((b.pvp?.rating||1000)-(myChar.pvp.rating||1000)));
  return candidates.slice(0,3);
}


/* ---- Live chat listener: new-message popup + unread badge ---- */
let _chatSub = null, _chatInit = false, _chatPopTimer = null;
function startChatListener(){
  if(_chatSub || !HAS_DB || !S.char) return;
  try{
    _chatSub = DB.doc('meta/rc_generalChat').onSnapshot(snap=>{
      const msgs = (snap.exists && Array.isArray(snap.data().messages)) ? snap.data().messages : [];
      const prevTs = S.chatLastTs || 0;
      const fresh = msgs.filter(m=>(m.ts||0) > prevTs && m.senderId !== MY_ID);
      const first = !_chatInit; _chatInit = true;
      S.generalChat = msgs; S.generalChatUnavailable = false;
      S.chatLastTs = Math.max(prevTs, msgs.reduce((a,m)=>Math.max(a,m.ts||0),0));
      if(first || !fresh.length){ render(); return; }
      if(S.chatWidgetOpen){ S.chatUnread = 0; render(); return; }
      S.chatUnread = (S.chatUnread||0) + fresh.length;
      S.chatPop = fresh[fresh.length-1];
      clearTimeout(_chatPopTimer);
      _chatPopTimer = setTimeout(()=>{ S.chatPop = null; render(); }, 5000);
      render();
    }, e=>{ console.error('chat listener failed:', e && e.code, e && e.message); _chatSub = null; });
  }catch(e){ console.error(e); }
}


/* ---- Victory reward: every fighter of the WINNING country gets gold + XP, once per war ---- */
let _claimingWars = false;
async function claimWarRewards(){
  const c = S.char;
  if(_claimingWars || !c || !c.kingdomId || !HAS_DB || !S.worldWars) return;
  const done = c.claimedWars || [];
  const todo = (S.worldWars.recent||[]).filter(w=>w.winnerCountryId===c.kingdomId && !done.includes(w.id)).slice(0,5);
  if(!todo.length) return;
  _claimingWars = true;
  try{
    let gold = 0, xp = 0;
    for(const w of todo){
      const snap = await withTimeout(DB.doc('rc_warPlayers/'+w.id+'_'+MY_ID).get(), 6000);
      if(snap.exists){
        const dmg = Object.values(snap.data().damage||{}).reduce((a,b)=>a+(Number(b)||0),0);
        if(dmg > 0){ gold += 100 + Math.min(3000, Math.round(dmg/40)); xp += 60 + Math.min(400, Math.round(dmg/200)); }
      }
      done.push(w.id);
    }
    // S.char may have been replaced (fresh load after a fight) while we were awaiting reads above — write to the live one.
    const cur = S.char || c;
    cur.claimedWars = done.slice(-30);
    if(gold){
      cur.gold += gold; cur.xp += xp;
      await checkLevelUps(cur, []); // war XP can level the player up — that must also grant skill points
    }
    saveCharacter(cur);
    if(gold) showToast('War victory! +'+fmtNum(gold)+' gold, +'+fmtNum(xp)+' XP for your fights.');
  }catch(e){ console.error('claimWarRewards', e); }
  _claimingWars = false;
}

/* ---- Public fighter list for any war (read from the public round docs) ---- */
async function loadWarFighters(warId){
  S.warFighters = S.warFighters || {};
  const cur = S.warFighters[warId];
  if(cur && (cur.loading || Date.now()-cur.at < 20000)) return;
  S.warFighters[warId] = {loading:true, at:Date.now(), list:(cur&&cur.list)||[]};
  try{
    const snaps = await Promise.all([1,2,3].map(n=>withTimeout(DB.doc('rc_wars/'+warId+'/rounds/'+n).get(), 6000).catch(()=>null)));
    const tot = {}, side = {};
    snaps.forEach(s=>{ if(s && s.exists){ const d=s.data(); Object.entries(d.contrib||{}).forEach(([u,v])=>{ tot[u]=(tot[u]||0)+(Number(v)||0); }); Object.entries(d.members||{}).forEach(([u,c])=>{ side[u]=c; }); }});
    const top = Object.keys(tot).sort((a,b)=>tot[b]-tot[a]).slice(0,16);
    const players = await Promise.all(top.map(u=>withTimeout(DB.doc('rc_players/'+u).get(), 6000).then(s=>s.exists?s.data():null).catch(()=>null)));
    const list = top.map((u,i)=>({uid:u, dmg:tot[u], countryId:side[u], username:players[i]?players[i].username:'Unknown', level:players[i]?players[i].level:1}));
    S.warFighters[warId] = {loading:false, at:Date.now(), list};
  }catch(e){ S.warFighters[warId] = {loading:false, at:Date.now(), list:[], error:true}; }
  render();
}


function sendChatCurrent(text){ return chatChannelNow()==='country' ? sendKingdomChat(text, true) : sendGeneralChat(text); }

/* ---- Live country chat: unread badge + popup for messages from fellow citizens ---- */
let _kSub = null, _kSubId = null, _kInit = false;
function startKingdomChatListener(){
  const c = S.char;
  if(!HAS_DB || !c || !c.kingdomId){
    if(_kSub){ _kSub(); _kSub = null; _kSubId = null; _kInit = false; }
    return;
  }
  if(_kSub && _kSubId === c.kingdomId) return;
  if(_kSub){ _kSub(); _kSub = null; }
  _kInit = false; _kSubId = c.kingdomId; S.kChatLastTs = 0;
  try{
    _kSub = DB.doc('rc_kingdoms/'+c.kingdomId).onSnapshot(snap=>{
      if(!snap.exists) return;
      const d = snap.data(), chat = Array.isArray(d.chat) ? d.chat : [];
      const prev = S.kChatLastTs || 0;
      const fresh = chat.filter(m=>(m.ts||0) > prev && m.senderId !== MY_ID);
      S.kChatLastTs = chat.reduce((a,m)=>Math.max(a, m.ts||0), prev);
      const kv = S.kingdomView;
      if(kv && kv.mode==='mine' && kv.kingdom){
        kv.kingdom = Object.assign({}, kv.kingdom, {chat, treasury: d.treasury || kv.kingdom.treasury, leaderId: d.leaderId !== undefined ? d.leaderId : kv.kingdom.leaderId});
      }
      const first = !_kInit; _kInit = true;
      if(first || !fresh.length){ render(); return; }
      if(S.chatWidgetOpen && chatChannelNow()==='country'){ render(); return; }
      S.chatUnreadK = (S.chatUnreadK||0) + fresh.length;
      S.chatPop = Object.assign({senderKingdom:c.kingdomId, senderLevel:1, channel:'country'}, fresh[fresh.length-1]);
      clearTimeout(_chatPopTimer);
      _chatPopTimer = setTimeout(()=>{ S.chatPop = null; render(); }, 5000);
      render();
    }, e=>{ console.error('country chat listener failed:', e && e.code, e && e.message); _kSub = null; _kSubId = null; });
  }catch(e){ console.error(e); }
}


/* ---- Read-only profiles: any country / any player (nothing here writes) ---- */
async function loadCountryProfile(id){
  const cur = S.viewCountry;
  if(cur && cur.id===id && !cur.error && (cur.loading || Date.now()-(cur.at||0) < 30000)) return;
  S.viewCountry = {id, loading:true};
  render();
  if(!HAS_DB){ S.viewCountry = {id, unavailable:true}; render(); return; }
  try{
    const [kSnap, mSnap, econ] = await Promise.all([
      withTimeout(DB.doc('rc_kingdoms/'+id).get(), 6000),
      withTimeout(DB.collection('rc_players').where('kingdomId','==',id).limit(80).get(), 6000),
      withTimeout(callFn('getCountryPublic', {countryId:id}), 6000).catch(()=>null), // war taxes: visible to everyone, even without a country
    ]);
    const kingdom = kSnap.exists ? kSnap.data() : {treasury:{}, leaderId:null};
    const members = mSnap.docs.map(d=>Object.assign({id:d.id}, d.data())).filter(m=>m.username)
      .sort((a,b)=>kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole)||(b.level||1)-(a.level||1));
    S.viewCountry = {id, at:Date.now(), kingdom, members, econ};
  }catch(e){ console.error('loadCountryProfile', e); S.viewCountry = {id, error:true}; }
  render();
}
async function loadPlayerProfile(id){
  const cur = S.viewPlayer;
  if(cur && cur.id===id && !cur.error && (cur.loading || Date.now()-(cur.at||0) < 30000)) return;
  S.viewPlayer = {id, loading:true};
  render();
  if(!HAS_DB){ S.viewPlayer = {id, unavailable:true}; render(); return; }
  try{
    const snap = await withTimeout(DB.doc('rc_players/'+id).get(), 6000);
    S.viewPlayer = snap.exists ? {id, at:Date.now(), data:snap.data()} : {id, missing:true};
  }catch(e){ console.error('loadPlayerProfile', e); S.viewPlayer = {id, error:true}; }
  render();
}

;
/* ---- js/ui.js ---- */

/* ============================================================
   APP STATE + RENDER
   ============================================================ */
const S = {
  screen: 'loading',
  char: null,
  combat: null, // transient combat session
  pvpCandidates: null,
  road: null, // {zoneId, log:[], gained:{xp,gold,resources:{}}}
  kingdomView: null,
  rankingsView: null,
  generalChat: null,
  chatWidgetOpen: false, // docked chat, floats over every screen — the only chat entry point now
  marketListings: null,
  marketTab: 'browse',
  marketFilter: 'all',
  marketSellKind: 'resource',
  craftQty: {},
  zoneDetailId: null,
  toast: null,
  toastTimer: null,
  craftFilter: null,
  kingdomTab: 'overview',
  countryState: null, // {status:'loading'|'ready'|'error'|'unavailable', data} from the getCountryState Cloud Function
  serverOffset: 0,    // serverNow - Date.now(), so countdowns follow SERVER time
  _warTarget: '',
  _rewardPick: null,
  profileTab: 'stats', // 'stats' | 'settings' — Profile and Settings share one nav slot
  worldWars: null,
  worldWarsAt: 0,
};

function showToast(msg){
  S.toast = msg;
  render();
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(()=>{ S.toast=null; render(); }, 2600);
}

function setScreen(scr){
  S.screen = scr;
  render();
  window.scrollTo(0,0);
}

async function persist(){ render(); if(S.char) saveCharacter(S.char); } // update the screen first; save runs in the background

// Pushes the chosen accent onto the two CSS vars (--brass / --brass-bright)
// that the whole UI is built on, so switching schemes in Settings re-skins
// buttons, active nav, panel titles, etc. without touching any other CSS.
function applyColorScheme(id){
  const scheme = getColorScheme(id);
  const root = document.documentElement.style;
  if(!id || id==='brass'){ root.removeProperty('--brass'); root.removeProperty('--brass-bright'); return; } // default = blue from theme.css
  root.setProperty('--brass', scheme.base);
  root.setProperty('--brass-bright', scheme.bright);
}

// Hover text for the Energy bar's regen label — the countdown is display-only,
// the authoritative value always comes from applyRegen()'s timestamp math.
function energyRegenTooltip(c, eff){
  if(c.energyCur >= eff.maxEnergy) return 'Energy is full.';
  const info = energyRegenInfo(c, eff);
  return `+${info.perHour} Energy per hour (20% of Max Energy) · next point in ${fmtMs(info.msToNext)} · full in ${fmtMs(info.msToFull)}`;
}

/* ---------------- Login gate ---------------- */
function renderLogin(){
  return `
  <div class="loader-wrap" style="min-height:100vh; padding:20px;">
    <div class="rc-login">
      <div class="rc-login-mark">${icon('sword','style="width:100%;height:100%"')}</div>
      <h1>REALMCLASH</h1>
      <p>Fight for your country in a world at war. Become a leader, a soldier or a trader.</p>
      <button class="btn btn-primary btn-block" data-action="google-signin" style="padding:14px;">Sign in with Google</button>
      <small>Your progress is saved to your account.</small>
    </div>
  </div>`;
}

/* ---------------- Character creation ---------------- */
function renderCountryCards(state){
  const q = (state.countrySearch||'').trim().toLowerCase();
  const list = q ? KINGDOMS.filter(k=>k.name.toLowerCase().includes(q)) : KINGDOMS;
  return list.map(k=>{
    const sel = state.countryId===k.id;
    return `<div class="class-card ${sel?'selected':''}" data-action="pick-country" data-country="${k.id}">
      <h3>${flagIcon(k.flag,22,'margin-right:6px;')}${k.name}</h3>
      <div class="faint">${k.resources.map(r=>RESOURCE_NAMES[r]||r).join(', ')}</div>
    </div>`;
  }).join('') || '<p class="faint">No country matches your search.</p>';
}

function renderCreate(){
  const state = S._create || (S._create = {username:'', classId:null, countryId:null, countrySearch:''});
  const cards = Object.values(CLASSES).map(cls=>{
    const sel = state.classId===cls.id;
    return `<div class="class-card ${sel?'selected':''}" data-action="pick-class" data-class="${cls.id}">
      <h3>${itemIcon(cls.icon,20,'margin-right:6px;')}${cls.name}</h3>
      <div class="res">Resource: ${cls.resource}</div>
      <div class="faint">${cls.tagline}</div>
      <ul>${cls.skills.map(s=>`<li>${s.name}</li>`).join('')}</ul>
    </div>`;
  }).join('');
  return `
  <div class="loader-wrap" style="min-height:100vh; padding:20px;">
    <div style="max-width:760px; width:100%;">
      <div style="text-align:center; margin-bottom:26px;">
        <div class="rc-login-mark">${icon('sword','style="width:100%;height:100%"')}</div>
        <h1 style="font-size:30px;">REALMCLASH</h1>
        <p class="muted" style="margin-top:6px;">Create your character and enter the fight.</p>
      </div>
      <div class="panel" style="margin-bottom:16px;">
        <label class="field">Username</label>
        <input type="text" id="username-input" maxlength="18" placeholder="Choose a name (min. 3 characters)" value="${esc(state.username)}">
        <p class="faint" style="margin-top:6px;">At least 3 characters, and must be unique — no two players can share a name.</p>
      </div>
      <div class="panel-title" style="margin-bottom:10px;">Choose your class</div>
      <div class="grid grid-3" style="margin-bottom:20px;">${cards}</div>
      <div class="panel-title" style="margin-bottom:10px;">Choose your country</div>
      <input type="text" id="country-search" placeholder="Search countries..." value="${esc(state.countrySearch||'')}" style="margin-bottom:10px;">
      ${state.countryId ? `<p class="faint" style="margin-bottom:10px;">Selected: ${kingdomFlag(state.countryId)}${KINGDOMS.find(k=>k.id===state.countryId).name}</p>` : ''}
      <div id="country-grid" class="grid grid-3" style="margin-bottom:20px; max-height:360px; overflow-y:auto;">${renderCountryCards(state)}</div>
      <button class="btn btn-primary btn-block" data-action="create-character" ${(!state.classId || !state.countryId)?'disabled':''} style="padding:14px;">Begin your journey</button>
    </div>
  </div>`;
}

/* ---------------- Shell / nav ---------------- */
const NAV = [
  {id:'home', label:'Overview', icon:'home', group:'WORLD'},
  {id:'world', label:'World', icon:'globe', group:'WORLD'},
  {id:'rankings', label:'Rankings', icon:'chart', group:'WORLD'},
  {id:'adventure', label:'PvE', icon:'sword', group:'PLAY'},
  {id:'pvp', label:'PvP', icon:'target', group:'PLAY'},
  {id:'kingdom', label:'Kingdom', icon:'crown', group:'FACTION'},
  {id:'market', label:'Market', icon:'scroll', group:'ECONOMY'},
  {id:'craft', label:'Craft', icon:'flask', group:'ECONOMY'},
  {id:'inventory', label:'Inventory', icon:'bag', group:'PLAYER'},
  {id:'profile', label:'Profile', icon:'user', group:'PLAYER'},
];

function renderStatusBar(){
  const c = S.char, eff = effectiveStats(c);
  const initials = c.username.slice(0,2).toUpperCase();
  const hpRegen = Math.max(1, Math.round(eff.maxHp*HP_REGEN_PCT));
  return `
  <div class="statusbar">
    <div class="sb-id">
      <div class="sb-avatar">${initials}<span class="sb-lvl-badge">${c.level}</span></div>
    </div>
    <div class="sb-bars">
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('heart','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.round(c.hpCur)}/${eff.maxHp}</span><span class="sb-regen">&#9650;${hpRegen}</span></div>
        <div class="bar-track"><div class="bar-fill bar-hp" style="width:${clamp(c.hpCur/eff.maxHp*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('bolt','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.floor(c.energyCur)}/${eff.maxEnergy}</span><span class="sb-regen" title="${energyRegenTooltip(c, eff)}">${c.energyCur>=eff.maxEnergy?'Full':'+'+energyRegenPerHour(eff.maxEnergy)+'/hr'}</span></div>
        <div class="bar-track"><div class="bar-fill bar-energy" style="width:${clamp(c.energyCur/eff.maxEnergy*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('drop','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.round(c.manaCur)}/${eff.maxMana}</span><span class="sb-regen">&#9650;${MANA_REGEN_AMT}</span></div>
        <div class="bar-track"><div class="bar-fill bar-mana" style="width:${clamp(c.manaCur/eff.maxMana*100,0,100)}%"></div></div>
      </div>
    </div>
    <div class="sb-stat">${icon('crown','style="width:12px;height:12px;vertical-align:-1px; stroke:var(--brass-bright)"')} <b>${fmtNum(c.gold)}</b></div>
    <div class="sb-rating">${icon('shield','style="width:13px;height:13px"')} ${Math.round(c.pvp.rating)}</div>
    <button class="world-alert ${S.worldWars?.active?.length?'live':''}" data-action="nav" data-screen="world">${icon('sword','style="width:13px;height:13px"')} ${S.worldWars?.active?.length||0} WARS</button>
  </div>`;
}

function renderNav(activeId){
  let last='';
  return NAV.map(n=>{
    const head = n.group!==last ? `<div class="nav-group-label">${n.group}</div>` : '';
    last=n.group;
    const warCount = n.id==='world' && S.worldWars && S.worldWars.active ? S.worldWars.active.length : 0;
    return head+`<button class="navbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span>${warCount?`<b class="nav-count">${warCount}</b>`:''}</button>`;
  }).join('');
}
function renderTabbar(activeId){
  const ids=['home','world','adventure','pvp','profile'];
  return NAV.filter(n=>ids.includes(n.id)).map(n=>`<button class="tabbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');
}

/* ---------------- Home ---------------- */
function renderHome(){
  const c = S.char, eff = effectiveStats(c);
  const need = xpNeeded(c.level);
  if(S.worldWars===null) loadWorldWars();
  const wars = S.worldWars?.active || [];
  const recent = S.worldWars?.recent || [];
  const warCards = wars.slice(0,3).map(w=>renderWorldWarCard(w)).join('') || `<div class="world-empty"><div class="world-empty-icon">${icon('shield')}</div><div><b>No active world wars</b><span>The realm is quiet for now.</span></div></div>`;
  const news = [...wars.map(w=>({type:'war', text:`${countryName(w.attackerCountryId)} entered a war against ${countryName(w.defenderCountryId)}`, at:w.startedAt||Date.now()})), ...recent.slice(0,4).map(w=>({type:'result', text:`${countryName(w.winnerCountryId)} defeated ${countryName(w.loserCountryId)}`, at:w.endedAt||Date.now()}))].sort((a,b)=>b.at-a.at).slice(0,5);
  return `
  ${pageHero('Welcome back, '+esc(c.username),CLASSES[c.class].name+' · Level '+c.level+' · '+countryName(c.kingdomId),'home')}
  <div style="margin:10px 0"><button class="btn btn-primary" data-action="nav" data-screen="world">${icon('globe')} Enter the World</button></div>
  <div class="world-metrics">
    <div class="metric"><span>ACTIVE WARS</span><b>${wars.length}</b></div>
    <div class="metric"><span>YOUR RATING</span><b>${Math.round(c.pvp.rating)}</b></div>
    <div class="metric"><span>LEVEL</span><b>${c.level}</b></div>
    <div class="metric"><span>GOLD</span><b>${fmtNum(c.gold)}</b></div>
  </div>
  ${dailyPanel(c)}
  <div class="world-home-grid">
    <section class="panel world-panel world-panel-large">
      <div class="section-head"><div><span class="eyebrow">LIVE EVENTS</span><h3>Wars shaping the world</h3></div><button class="btn btn-sm" data-action="nav" data-screen="world">View all</button></div>
      <div class="war-feed">${warCards}</div>
    </section>
    <section class="panel world-panel">
      <div class="section-head"><div><span class="eyebrow">YOUR FACTION</span><h3>${kingdomFlag(c.kingdomId)} ${countryName(c.kingdomId)}</h3></div><button class="icon-btn" data-action="nav" data-screen="kingdom">${icon('arrow')}</button></div>
      <div class="faction-stat"><span>Battle power</span><b>${eff.atk + eff.def * 2}</b></div>
      <div class="faction-stat"><span>Resources</span><b>${fmtNum(resourceTotal(c))}</b></div>
      <div class="faction-stat"><span>PvP record</span><b>${c.pvp.wins}W · ${c.pvp.losses}L</b></div>
      <button class="btn btn-accent btn-block" data-action="nav" data-screen="kingdom">Open Kingdom</button>
    </section>
  </div>
  <div class="world-home-grid lower">
    <section class="panel world-panel">
      <div class="section-head"><div><span class="eyebrow">PLAYER</span><h3>Prepare your next move</h3></div></div>
      <div class="action-list">
        <button data-action="nav" data-screen="adventure">${icon('sword')}<span><b>Explore PvE</b><small>Fight, earn XP and gather resources.</small></span><i>→</i></button>
        <button data-action="nav" data-screen="pvp">${icon('target')}<span><b>Enter PvP</b><small>Find an opponent near your rating.</small></span><i>→</i></button>
        <button data-action="nav" data-screen="market">${icon('scroll')}<span><b>Visit Market</b><small>Trade with the world.</small></span><i>→</i></button>
      </div>
    </section>
    <section class="panel world-panel">
      <div class="section-head"><div><span class="eyebrow">WORLD NEWS</span><h3>Latest events</h3></div></div>
      <div class="news-list">${news.map(n=>`<div class="news-row"><span class="news-dot ${n.type}"></span><span>${esc(n.text)}</span><time>${fmtRelative(n.at)}</time></div>`).join('') || '<div class="empty-mini">No public events yet.</div>'}</div>
    </section>
  </div>
  <div class="panel character-strip">
    <div><span class="eyebrow">CHARACTER</span><b>${esc(c.username)}</b><span>Level ${c.level} · ${CLASSES[c.class].name}</span></div>
    <div class="xp-track"><div style="width:${clamp(c.xp/need*100,0,100)}%"></div></div><span class="xp-label">${fmtNum(c.xp)} / ${fmtNum(need)} XP</span>
  </div>`;
}

function fmtRelative(ts){
  const d=Math.max(0,Date.now()-Number(ts||Date.now())), m=Math.floor(d/60000);
  if(m<1) return 'now'; if(m<60) return `${m}m`; const h=Math.floor(m/60); if(h<24) return `${h}h`; return `${Math.floor(h/24)}d`;
}
function renderWorldWarCard(w){
  const a=w.attackerCountryId, d=w.defenderCountryId, score=w.finalScore||warScore(w), sa=score.a??score[a]??0, sd=score.d??score[d]??0;
  const round=currentWarRound(w), rs=w.rounds||[], last=rs[rs.length-1];
  const dm=((round&&round.damage)||(last&&last.damage)||{}), da=Number(dm[a]||0), dd=Number(dm[d]||0), tot=da+dd;
  const my=S.char&&S.char.kingdomId, rel=(a===my||d===my)?'you':'';
  const pa=tot?Math.round(da/tot*100):50;
  return `<button class="rc-battle ${rel}" data-action="world-war" data-id="${esc(w.id)}">
    <div class="rc-b-top"><span>${w.status==='preparing'?'PREPARING':'ACTIVE'}</span><span>${round?`ROUND ${round.round}/${w.maxRounds||3}`:'WAR'}</span></div>
    <div class="rc-b-mid"><div class="rc-b-side">${kingdomFlag(a,34,'margin:0')}<small>${esc(countryName(a))}</small></div><b>${sa}</b><em>${icon('sword','style="width:16px;height:16px"')}</em><b>${sd}</b><div class="rc-b-side">${kingdomFlag(d,34,'margin:0')}<small>${esc(countryName(d))}</small></div></div>
    <div class="rc-b-time">${round?.endsAt?countdown(round.endsAt):'Awaiting round'}</div>
    <div class="rc-dmgbar"><span class="l">${fmtDmg(da)}</span><div><i style="width:${pa}%"></i></div><span class="r">${fmtDmg(dd)}</span></div>
  </button>`;
}
function warScore(w){
  const out={a:0,d:0}; (w.rounds||[]).forEach(r=>{if(r.winner===w.attackerCountryId)out.a++; else if(r.winner===w.defenderCountryId)out.d++;}); return out;
}
function currentWarRound(w){
  const now=Date.now()+(S.serverOffset||0); return (w.rounds||[]).find(r=>r.status==='active'||(r.startsAt<=now&&r.endsAt>now)) || (w.rounds||[]).find(r=>r.status==='preparing');
}

function viewBack(label){ return `<button class="btn btn-sm" data-action="view-back" style="margin:0 0 12px">&larr; ${label||'Back'}</button>`; }
function viewOnlyChip(){ return `<span class="rc-chip" title="You can look, but not change anything here">View only</span>`; }
function renderCountryView(){
  const id=S.viewCountryId, v=S.viewCountry, kdef=KINGDOMS.find(k=>k.id===id);
  const back=viewBack('Back');
  if(!kdef) return back+`<div class="rc-empty"><h3>Country not found</h3></div>`;
  if(!v||v.id!==id||v.loading) return back+`<div class="empty"><h3>Loading ${esc(kdef.name)}…</h3></div>`;
  if(v.unavailable||v.error) return back+`<div class="rc-empty"><h3>Couldn't load this country</h3><button class="btn btn-primary" data-action="view-country" data-id="${esc(id)}">Retry</button></div>`;
  const members=v.members, treasury=v.kingdom.treasury||{}, tab=['home','government','citizens'].includes(S.viewCountryTab)?S.viewCountryTab:'home';
  const wk=weekKeyNow(), wdmg=members.reduce((n,m)=>n+((m.weeklyDmg&&m.weeklyDmg.week===wk)?(m.weeklyDmg.dmg||0):0),0);
  const t=Date.now(), online=members.filter(m=>(t-Number(m.updatedAt||0))<5*60*1000).length;
  const wars=(S.worldWars&&S.worldWars.active||[]).filter(w=>w.attackerCountryId===id||w.defenderCountryId===id);
  const byRole=r=>members.filter(m=>m.kingdomRole===r);
  const av=(m,cls)=>`<div class="rc-gav ${cls||''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i></div>`;
  const person=(m,cls)=>`<div class="rc-role-p" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,cls)}<b>${esc(m.username)}</b></div>`;
  const roleCard=(label,cls,list)=>`<div class="rc-role ${cls}"><h4>${label}</h4>${list.length?list.map(m=>person(m)).join(''):'<p>No one nominated yet.</p>'}</div>`;
  const ec=v.econ||null, wtOut=ec&&ec.warTaxOut&&ec.warTaxOut.active?ec.warTaxOut:null;
  const wtCard=(cls,title,cid,t,extra)=>`<div class="rc-tax ${cls}"><div class="rc-tax-h"><span class="tt">${title}</span><span class="tm">${countdown(t.expiresAt)}</span></div><div class="rc-tax-b" data-action="view-country" data-id="${esc(cid)}">${kingdomFlag(cid,26,'margin:0')}<div><b>${esc(countryName(cid))}</b><small>${t.rate}% of newly gathered ${resourceIcon(t.resourceId,13)} ${esc(resName(t.resourceId))}</small></div></div>${extra||''}</div>`;
  const wtHtml=(wtOut?wtCard('lost',`WAR TAX — ${esc(kdef.name)} pays`,wtOut.winnerCountryId,wtOut,`<div class="rc-tax-f"><span>Paid to</span><b>${esc(countryName(wtOut.winnerCountryId))}</b></div>`)
      :(ec&&ec.pendingChoice?`<div class="rc-tax pending"><div class="rc-tax-b" data-action="view-country" data-id="${esc(ec.pendingChoice.winnerCountryId)}">${kingdomFlag(ec.pendingChoice.winnerCountryId,26,'margin:0')}<div><b>${esc(countryName(ec.pendingChoice.winnerCountryId))}</b><small>Won the war against ${esc(kdef.name)}. Waiting for them to choose a resource to tax.</small></div></div></div>`:''))
    +((ec&&ec.warTaxIn)||[]).filter(x=>x.active!==false).map(x=>wtCard('won',`WAR SPOILS — ${esc(kdef.name)} collects`,x.loserCountryId,x,`<div class="rc-tax-f"><span>Collected so far</span><b>${fmtNum(x.collected||0)} ${esc(resName(x.resourceId))}</b></div>`)).join('');
  const specHtml=(ec&&ec.specialities&&ec.specialities.length)?`<div class="rc-sec">SPECIALITIES</div><div class="kingdom-resource-row">${ec.specialities.map(r=>`<span>${resourceIcon(r,16)} ${resName(r)}</span>`).join('')}</div>`:'';
  const tabs=[['home','Home','castle'],['government','Government','crown'],['citizens','Citizens','users']];
  const tabRow=`<div class="country-module-nav rc-ptabs">${tabs.map(x=>`<button class="country-module ${tab===x[0]?'active':''}" data-action="view-ctab" data-tab="${x[0]}">${icon(x[2])}<span>${x[1]}</span></button>`).join('')}</div>`;
  const hero=`<div class="rc-chero"><div class="rc-banner country"></div><div class="rc-chead"><div class="rc-flag">${kingdomFlag(id,64,'margin:0')}</div><div><small>⚑ Country ${viewOnlyChip()}</small><h2>${esc(kdef.name)}</h2><div class="rc-cstats"><span><small>Citizens</small><b>${members.length}</b></span><span><small>Online</small><b>${online}</b></span><span><small>Treasury</small><b>${fmtNum(treasury.gold||0)}</b></span><span><small>Tax</small><b>${kdef.tax}%</b></span></div></div></div></div>`;
  let body='';
  if(tab==='home'){
    body=`<div class="rc-sec">RANKINGS</div><div class="rc-tiles">${statTile('Citizens',members.length,'green')}${statTile('Weekly damages',fmtDmg(wdmg))}${statTile('Treasury',fmtNum(treasury.gold||0),'gold')}${statTile('National tax',kdef.tax+'%')}</div>
      <div class="rc-sec">WARS</div>${wars.length?`<div class="rc-battles">${wars.map(renderWorldWarCard).join('')}</div>`:'<p class="faint">At peace. No ongoing wars.</p>'}
      ${wtHtml?`<div class="rc-sec">WAR TAX</div>${wtHtml}`:''}${specHtml}
      <div class="rc-sec">GOVERNMENT</div><div class="rc-gov-strip">${['Leader','Co-Leader','Officer'].map(r=>byRole(r).slice(0,4).map(m=>`<div data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,r==='Leader'?'gold':r==='Co-Leader'?'blue':'red')}</div>`).join('')).join('')||'<p class="faint">No government yet.</p>'}</div>`;
  } else if(tab==='government'){
    body=`<div class="rc-gov-grid"><div class="rc-role gold wide"><h4>★ Leader</h4>${byRole('Leader').map(m=>`<div class="rc-role-p c" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,'gold')}<b>${esc(m.username)}</b></div>`).join('')||'<p>No one nominated yet.</p>'}</div>${roleCard('Co-Leader','blue',byRole('Co-Leader'))}${roleCard('Officers','red',byRole('Officer'))}</div>`;
  } else {
    body=`<div class="rc-sec">CITIZENS — ${members.length}</div>`+members.map(m=>{ const on=(t-Number(m.updatedAt||0))<5*60*1000; return `<div class="rc-mrow rc-card" data-action="view-player" data-id="${esc(m.id)}"><div class="rc-gav ${on?'on':''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i><u class="dot ${on?'on':''}"></u></div><div class="nm"><b>${esc(m.username)}</b><small>${esc(m.kingdomRole||'Recruit')} · ${CLASSES[m.class]?CLASSES[m.class].name:'—'}</small></div>${CHAT_ROLE_ICON[m.kingdomRole]?`<span class="rl">${icon(CHAT_ROLE_ICON[m.kingdomRole])}</span>`:''}</div>`; }).join('');
  }
  return back+hero+tabRow+body;
}
function renderPlayerView(){
  const id=S.viewPlayerId, v=S.viewPlayer, back=viewBack('Back');
  if(!v||v.id!==id||v.loading) return back+`<div class="empty"><h3>Loading profile…</h3></div>`;
  if(v.missing) return back+`<div class="rc-empty"><h3>Player not found</h3></div>`;
  if(v.unavailable||v.error) return back+`<div class="rc-empty"><h3>Couldn't load this profile</h3><button class="btn btn-primary" data-action="view-player" data-id="${esc(id)}">Retry</button></div>`;
  const p=v.data, wk=weekKeyNow(), wd=(p.weeklyDmg&&p.weeklyDmg.week===wk)?(p.weeklyDmg.dmg||0):0, pv=p.pvp||{rating:1000,wins:0,losses:0};
  const fmtDate=ts=>new Date(Number(ts)||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const ago=p.updatedAt?(Date.now()-p.updatedAt<5*60*1000?'now':fmtRelative(p.updatedAt)+' ago'):'—';
  const kdef=KINGDOMS.find(k=>k.id===p.kingdomId);
  const hero=`<div class="rc-chero rc-phero"><div class="rc-banner"></div><div class="rc-chead"><div class="rc-pav"><div class="rc-avatar">${esc((p.username||'?').slice(0,2).toUpperCase())}</div><span class="lv">${p.level||1}</span></div><div><h2>${kdef?kingdomFlag(p.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px'):''}${esc(p.username)} ${viewOnlyChip()}</h2><div class="rc-cstats pl"><span><small>Citizen since</small><b>${fmtDate(p.createdAt)}</b></span><span><small>Last connection</small><b>${ago}</b></span></div></div></div></div>`;
  const country=kdef?`<div class="rc-sec">COUNTRY</div><div class="rc-opp" data-action="view-country" data-id="${esc(p.kingdomId)}" style="cursor:pointer"><div class="rc-cflag">${kingdomFlag(p.kingdomId,30,'margin:0')}</div><div class="nm"><b>${esc(kdef.name)}</b><small>${esc(p.kingdomRole||'Recruit')}</small></div><span class="faint">View &rsaquo;</span></div>`:'';
  return back+hero+`
    <div class="rc-sec">RANKINGS</div>
    <div class="rc-tiles">${statTile('Level',p.level||1)}${statTile('Class',CLASSES[p.class]?CLASSES[p.class].name:'—')}${statTile('PvP rating',Math.round(pv.rating||1000),'gold')}${statTile('League',leagueBadge(pv.rating||1000,16)+' '+leagueOf(pv.rating||1000).name)}${statTile('Wins / Losses',(pv.wins||0)+' / '+(pv.losses||0),'green')}${statTile('Weekly damages',fmtDmg(wd))}${statTile('Total damages',fmtDmg(p.totalDmg||0))}</div>
    ${country}`;
}
function renderWarDetail(){
  const all=[...(S.worldWars?.active||[]),...(S.worldWars?.recent||[])];
  const w=all.find(x=>x.id===S.worldWarsSelected);
  const back=`<button class="btn btn-sm" data-action="nav" data-screen="world" style="margin:0 0 12px">&larr; Battles</button>`;
  if(S.worldWars===null){ loadWorldWars(); return back+`<div class="empty"><h3>Loading war…</h3></div>`; }
  if(!w) return back+`<div class="rc-empty"><h3>War not found</h3><p>It may have just ended. Check the History tab.</p></div>`;
  const a=w.attackerCountryId, d=w.defenderCountryId, sc=w.finalScore||warScore(w), sa=sc.a??sc[a]??0, sd=sc.d??sc[d]??0;
  const rs=w.rounds||[], round=currentWarRound(w), my=S.char&&S.char.kingdomId, mine=(a===my||d===my);
  const finished=w.status==='finished'||w.endedAt;
  if(S.warFighters===undefined || !S.warFighters[w.id]) loadWarFighters(w.id);
  const wf=(S.warFighters&&S.warFighters[w.id])||{list:[],loading:true};
  const col=cid=>wf.list.filter(f=>f.countryId===cid).slice(0,8).map((f,i)=>`<div class="rc-rank" data-action="view-player" data-id="${esc(f.uid)}" style="cursor:pointer"><i>${i+1}</i><div class="rc-gav"><span>${esc((f.username||'?').slice(0,2).toUpperCase())}</span><i>${f.level||1}</i></div><b>${esc(f.username)}</b><span class="dm">${fmtDmg(f.dmg)}</span></div>`).join('')||'<p class="faint" style="padding:6px 2px">'+(wf.loading?'Loading…':'No fighters yet')+'</p>';
  const fighters=`<div class="rc-sec">TOP FIGHTERS</div><div class="rc-fcols"><div><div class="rc-fh">${kingdomFlag(a,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(countryName(a))}</div><div class="rc-ranks">${col(a)}</div></div><div><div class="rc-fh">${kingdomFlag(d,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(countryName(d))}</div><div class="rc-ranks">${col(d)}</div></div></div>`;
  const rrows=rs.map(r=>{
    const dm=r.damage||{}, da=Number(dm[a]||0), dd=Number(dm[d]||0), t=da+dd, pa=t?Math.round(da/t*100):50;
    const st=r.winner?`Won by ${esc(countryName(r.winner))}`:(round&&round.round===r.round?'In progress':'Pending');
    return `<div class="rc-tile" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><b style="font-size:14px">Round ${r.round}</b><small style="color:var(--text-dim)">${st}</small></div>
      <div class="rc-dmgbar" style="margin-top:8px"><span class="l">${fmtDmg(da)}</span><div><i style="width:${pa}%"></i></div><span class="r">${fmtDmg(dd)}</span></div></div>`;
  }).join('')||'<p class="faint">No rounds started yet.</p>';
  return back+`
  <div class="rc-wd">
    <div class="rc-wd-side" data-action="view-country" data-id="${esc(a)}" style="cursor:pointer">${kingdomFlag(a,56,'margin:0')}<b>${esc(countryName(a))}</b><small>Attacker</small></div>
    <div class="rc-wd-score"><strong>${sa}</strong><em>—</em><strong>${sd}</strong><div class="rc-chip">${finished?'FINISHED':(w.status==='preparing'?'PREPARING':'ACTIVE')}</div></div>
    <div class="rc-wd-side" data-action="view-country" data-id="${esc(d)}" style="cursor:pointer">${kingdomFlag(d,56,'margin:0')}<b>${esc(countryName(d))}</b><small>Defender</small></div>
  </div>
  ${round?.endsAt&&!finished?`<div class="rc-tile" style="text-align:center;margin-top:10px"><small>Round ${round.round} ends in</small><b>${countdown(round.endsAt)}</b></div>`:''}
  ${fighters}
  <div class="rc-sec">ROUNDS</div>${rrows}
  ${mine&&!finished?`<button class="btn btn-primary btn-block" style="margin-top:12px;padding:12px" data-action="open-war-room">Open War Room</button>`:`<p class="faint" style="margin-top:12px">${mine?'This war is over.':'Only citizens of the two countries can fight in this war.'}</p>`}`;
}
function renderWorld(){
  if(S.worldWars===null){
    loadWorldWars();
    return `${pageHero('Loading the realm…','Connecting to the living world')}<div class="world-loading"><div class="loader-ring"></div></div>`;
  }
  const active=S.worldWars.active||[], recent=S.worldWars.recent||[];
  const my=S.char&&S.char.kingdomId, bt=S.battleTab==='history'?'history':'active', bf=S.battleFilter||'all';
  const involves=w=>w.attackerCountryId===my||w.defenderCountryId===my;
  const list=active.filter(w=>bf==='mine'?involves(w):bf==='enemies'?(involves(w)&&true):true);
  const mine=list.filter(involves), others=list.filter(w=>!involves(w));
  const section=(t,ws)=>ws.length?`<div class="rc-sec">${t}</div><div class="rc-battles">${ws.map(renderWorldWarCard).join('')}</div>`:'';
  const chips=[['all','All'],['mine','Your country']].map(f=>`<button class="rc-fchip ${bf===f[0]?'on':''}" data-action="battle-filter" data-f="${f[0]}">${f[1]}</button>`).join('');
  const tabRow=`<div class="country-module-nav rc-ptabs"><button class="country-module ${bt==='active'?'active':''}" data-action="battle-tab" data-tab="active">${icon('sword')}<span>Active</span>${active.length?`<i class="rc-dot">${active.length}</i>`:''}</button><button class="country-module ${bt==='history'?'active':''}" data-action="battle-tab" data-tab="history">${icon('chart')}<span>History</span></button></div>`;
  const hist=`<div class="panel world-history">${recent.slice(0,15).map(w=>`<div class="history-war"><span class="history-result ${w.winnerCountryId===w.attackerCountryId?'a':'d'}">${w.winnerCountryId===w.attackerCountryId?'VICTORY':'RESULT'}</span><b>${kingdomFlag(w.attackerCountryId)}${esc(countryName(w.attackerCountryId))}</b><span>vs</span><b>${kingdomFlag(w.defenderCountryId)}${esc(countryName(w.defenderCountryId))}</b><strong>${w.finalScore?.a ?? warScore(w).a} — ${w.finalScore?.d ?? warScore(w).d}</strong><time>${fmtRelative(w.endedAt)}</time></div>`).join('')||'<div class="empty-mini">No finished wars yet.</div>'}</div>`;
  const activeView=`<div class="rc-sec">ONGOING BATTLES</div>${active.length?'':'<p class="faint">Nothing in play. Wars declared by countries will show up here.</p>'}<div class="rc-filters">${chips}</div>${section('YOUR COUNTRY',mine)}${section('OTHER WARS',others)}`;
  const myK=S.char&&S.char.kingdomId, warring=k=>active.some(w=>w.attackerCountryId===k.id||w.defenderCountryId===k.id);
  const ordered=KINGDOMS.slice().sort((x,y)=>((y.id===myK)-(x.id===myK))||(warring(y)-warring(x))||x.name.localeCompare(y.name));
  const countries=`<div class="rc-sec">COUNTRIES — ${KINGDOMS.length}</div><input type="text" id="country-search" class="rc-search" placeholder="Search a country…" autocomplete="off"><div class="rc-countries" id="rc-countries">${ordered.map(k=>{const atWar=warring(k);return `<button class="rc-country ${atWar?'at-war':''} ${k.id===myK?'mine':''}" data-name="${esc(k.name.toLowerCase())}" data-action="view-country" data-id="${k.id}"><span class="fl">${kingdomFlag(k.id)}</span><span><b>${esc(k.name)}${k.id===myK?' <em>(you)</em>':''}</b><small>${atWar?'AT WAR':'Peace'} · tax ${k.tax}%</small></span></button>`}).join('')}</div><p class="faint" id="country-none" style="display:none">No country found.</p>`;
  const shortcuts=`<div class="rc-shortcuts"><button class="btn btn-sm" data-action="nav" data-screen="rankings">${icon('chart')} Rankings</button>${myK?`<button class="btn btn-sm" data-action="view-country" data-id="${myK}">${icon('castle')} My country</button>`:''}</div>`;
  return `<div class="rc-chero"><div class="rc-banner war"></div><div class="rc-chead"><div><h2>Battles</h2></div></div></div>${shortcuts}${tabRow}${bt==='history'?hist:activeView}${countries}`;
}

/* ---------------- Adventure ---------------- */
const ZONE_BANNERS = {
  plains: 'linear-gradient(160deg, #4a7c3f, #2e5230)',
  forest: 'linear-gradient(160deg, #1f4d2e, #16321f)',
  mountain: 'linear-gradient(160deg, #5b6b78, #33404a)',
  cave: 'linear-gradient(160deg, #4a2e6b, #241536)',
  swamp: 'linear-gradient(160deg, #3d4a2e, #232b1a)',
  darkzone: 'linear-gradient(160deg, #5a1f24, #250d0f)',
  frozen: 'linear-gradient(160deg, #3e6b8a, #1d3446)',
  abyss: 'linear-gradient(160deg, #2a1240, #0d0616)',
};
function pageHero(title, sub, cls){
  return `<div class="rc-chero"><div class="rc-banner ${cls||''}"></div><div class="rc-chead"><div><h2>${title}</h2>${sub?`<small>${sub}</small>`:''}</div></div></div>`;
}
function leagueBadge(rating,size){ const L=leagueOf(rating); size=size||18; return `<span class="lg-badge" style="--lg:${L.color};width:${size}px;height:${size}px;font-size:${Math.round(size*0.55)}px" title="${L.name}">${L.name[0]}</span>`; }
function leaguePanel(rating){
  const p=leagueProgress(rating);
  return `<div class="lg-panel">${leagueBadge(rating,38)}<div class="lg-main"><b style="color:${p.league.color}">${p.league.name} League</b>
    <small>${p.next?`${p.toNext} rating to ${p.next.name}`:'Top league — you are at the summit'}</small>
    <div class="bar-track" style="margin-top:5px;"><div class="bar-fill" style="width:${p.pct}%;background:${p.league.color}"></div></div></div></div>`;
}
function statTile(l,v,cls){ return `<div class="rc-tile ${cls||''}"><small>${l}</small><b>${v}</b></div>`; }
function renderAdventure(){
  const c = S.char;
  const tiles = ZONES.map(z=>{
    const locked = c.level < z.min - 5;
    const banner = z.icon ? `url('${iconUrl(z.icon)}') center/cover` : (ZONE_BANNERS[z.id]||'var(--panel-2)');
    return `<div class="zone-tile ${locked?'locked':''}">
      <div class="zone-banner" style="background:${banner};"></div>
      <div class="zone-tile-body">
        <h4>${z.name}</h4>
        <div class="zone-tile-meta">
          <span class="tag">Lv.${z.min}&ndash;${z.uncapped?z.min+'+':z.max}</span>
          <span class="tag">${icon('sword','style="width:10px;height:10px;vertical-align:-1px"')} ${z.monsters.length}</span>
        </div>
        ${locked
          ? `<button class="btn btn-sm btn-block" disabled>${icon('lock','style="width:12px;height:12px"')} Requires Lv.${z.min-5}</button>`
          : `<button class="btn btn-primary btn-sm btn-block" data-action="view-zone" data-zone="${z.id}">View</button>`}
      </div>
    </div>`;
  }).join('');
  return `
  ${pageHero('Realm Explorer','Select a zone to hunt monsters and gather resources','pve')}
  <div class="rc-tiles" style="margin-top:12px">${statTile('Level',c.level)}${statTile('Energy',Math.floor(c.energyCur)+'/'+effectiveStats(c).maxEnergy,'green')}${statTile('Zones open',ZONES.filter(z=>c.level>=z.min-5).length+'/'+ZONES.length,'gold')}</div>
  <div class="rc-sec">ZONES</div>
  <div class="zone-grid">${tiles}</div>`;
}

function renderZoneDetail(){
  const c = S.char;
  const now = Date.now();
  const z = ZONES.find(x=>x.id===S.zoneDetailId);
  if(!z) return renderAdventure();
  const locked = c.level < z.min - 5;
  const eliteLocked = locked || c.level < z.min;
  const bossCd = (c.bossCooldowns[z.id]||0) - now;
  const bossLocked = eliteLocked || bossCd > 0;
  const banner = z.icon ? `url('${iconUrl(z.icon)}') center/cover` : (ZONE_BANNERS[z.id]||'var(--panel-2)');
  const act=(cls,ic,title,desc,cost,action,dis)=>`<button class="rc-act ${cls}" data-action="${action}" data-zone="${z.id}" ${dis?'disabled':''}><span class="ai">${icon(ic)}</span><b>${title}</b><small>${desc}</small><em>${cost}</em></button>`;
  return `
  <button class="btn btn-sm" data-action="nav" data-screen="adventure" style="margin-bottom:12px;">&larr; Realm Explorer</button>
  <div class="rc-zhero" style="background:linear-gradient(180deg,rgba(22,26,29,.1),rgba(22,26,29,.92)),${banner}"><div class="rc-zov"><h2>${z.name}</h2><div class="rc-chips"><span class="rc-chip">Lv ${z.min}&ndash;${z.uncapped?z.min+'+':z.max}</span><span class="rc-chip">${icon('sword','style="width:11px;height:11px;vertical-align:-1px"')} ${z.monsters.length} monsters</span></div></div></div>
  <div class="rc-sec">RESOURCES</div><div class="rc-res">${z.resources.map(r=>`<div class="country-resource"><div class="country-resource-icon">${resourceIcon(r,22)}</div><span>${RESOURCE_NAMES[r]}</span></div>`).join('')}</div>
  <div class="rc-sec">ZONE BOSS</div>
  <div class="rc-tile ${bossCd>0?'':'gold'}" style="display:flex;justify-content:space-between;align-items:center"><div><small>Boss</small><b>${z.boss}</b></div><span class="rc-chip">${bossCd>0?'Ready in '+fmtMs(bossCd):'Ready'}</span></div>
  <div class="rc-sec">ACTIONS</div>
  <div class="rc-acts">
    ${act('green','arrow','Take a Step','Wander the road: cheap, mostly small finds','Low energy','zone-road',locked)}
    ${act('blue','target','Explore','Find monsters and resources','Energy','enter-zone',locked)}
    ${act('red','sword','Elite Hunt','Tougher monster, better drops','20 Energy','enter-zone-elite',eliteLocked)}
    ${act('gold','crown','Zone Boss','Unique boss, guaranteed high-tier drop','30 Energy · 30m cd','enter-zone-boss',bossLocked)}
  </div>`;
}

function renderRoad(){
  const c = S.char;
  const road = S.road;
  const zone = ZONES.find(z=>z.id===road.zoneId);
  const g = road.gained;
  const resSummary = Object.entries(g.resources).map(([k,v])=>`+${v} ${resourceIcon(k,14)} ${RESOURCE_NAMES[k]}`).join(', ');
  return `
  ${pageHero('The Road &mdash; '+zone.name,'Each step costs '+STEP_ENERGY_COST+' Energy. Most steps are quiet, some pay off, and sometimes something finds you.','pve')}
  <div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">This walk so far</div>
    <div class="stat-list">
      <div><span>XP</span><b>+${g.xp}</b></div>
      <div><span>Gold</span><b>+${g.gold}</b></div>
      <div style="grid-column:1/-1;"><span>Resources</span><b>${resSummary||'&mdash;'}</b></div>
    </div>
  </div>
  <div class="log" style="height:220px;">${road.log.slice().reverse().map(l=>`<div class="log-line ${l.cls||''}">${l.text}</div>`).join('')}</div>
  <div style="display:flex; gap:10px; margin-top:14px;">
    <button class="btn btn-primary btn-block" data-action="take-step" ${c.energyCur<STEP_ENERGY_COST?'disabled':''} style="padding:14px;">${c.energyCur<STEP_ENERGY_COST?'Out of Energy':'Take a Step'}</button>
    <button class="btn" data-action="road-leave">Leave the Road</button>
  </div>`;
}

/* ---------------- Craft ---------------- */
function renderCraft(){
  const c = S.char;
  const eff = effectiveStats(c);
  const cards = RECIPES.map(r=>{
    const max = maxCraftable(c, r);
    const qty = clamp((S.craftQty&&S.craftQty[r.id])||1, 1, Math.max(1,max));
    const reqChips = Object.entries(r.inputs).map(([k,v])=>{
      const have = c.resourceBag[k]||0;
      const need = v*qty;
      const short = have < need;
      return `<span class="req-chip ${short?'short':''}">${resourceIcon(k,12)} ${have}/${need}</span>`;
    }).join('');
    const energyShort = r.energy && c.energyCur < r.energy*qty;
    const energyChip = r.energy ? `<span class="req-chip ${energyShort?'short':''}">&#9889; ${Math.round(c.energyCur)}/${r.energy*qty}</span>` : '';
    const iconColor = r.out.kind==='consumable' ? 'var(--emerald)' : 'var(--brass)';
    return `<div class="craft-card">
      <div class="row" style="align-items:flex-start;">
        <div class="craft-icon" style="background:${iconColor}22; color:${iconColor}; border-color:${iconColor}55;">${r.out.icon ? itemIcon(r.out.icon,36) : esc(r.name[0])}</div>
        ${r.xp?`<span class="tag" style="border-color:var(--emerald); color:var(--emerald-bright);">+${r.xp*qty}XP</span>`:''}
      </div>
      <div style="margin-top:8px; font-weight:700; color:var(--parchment); font-size:14px;">${esc(r.name)}</div>
      <div class="faint" style="margin-bottom:10px;">Produces ${qty}</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">${energyChip}${reqChips}</div>
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="qty-stepper">
          <button class="btn btn-sm" data-action="craft-qty-dec" data-recipe="${r.id}" ${qty<=1?'disabled':''}>&minus;</button>
          <span>${qty}</span>
          <button class="btn btn-sm" data-action="craft-qty-inc" data-recipe="${r.id}" ${qty>=max?'disabled':''}>+</button>
        </div>
        <button class="btn btn-sm btn-accent btn-block" data-action="craft" data-recipe="${r.id}" ${max<=0?'disabled':''}>Craft x${qty}</button>
      </div>
    </div>`;
  }).join('');
  const resChips = Object.entries(c.resourceBag).filter(([,v])=>v>0).map(([k,v])=>`<span class="tag" style="margin:0 6px 6px 0;">${RESOURCE_NAMES[k]}: <b style="color:var(--parchment)">${v}</b></span>`).join('') || '<span class="faint">No resources yet &mdash; fight in Adventure zones to gather some.</span>';
  return `
  ${pageHero('Crafting','Turn raw resources and Energy into materials and potions','craft')}
  <div class="rc-tiles" style="margin-top:12px">${statTile('Backpack',bagCount(c)+'/'+BAG_CAPACITY)}${statTile('Energy',Math.floor(c.energyCur)+'/'+eff.maxEnergy,'green')}</div>
  <div class="rc-sec">RESOURCES</div>
  <div style="margin-bottom:16px;">${resChips}</div>
  <div class="craft-grid">${cards}</div>`;
}

/* ---------------- Inventory ---------------- */
function renderInventory(){
  const c = S.char;
  const RAR={common:'#94a3b8',uncommon:'#4ade80',rare:'#60a5fa',epic:'#c084fc',legendary:'#facc15'};
  const TIERN={common:0,uncommon:1,rare:2,epic:3,legendary:4};
  const SLOT_ICO={weapon:'sword',armor:'shield',helmet:'crown',boots:'arrow',gloves:'hammer',accessory:'star'};
  const statChips=st=>Object.entries(st||{}).map(([k,v])=>`<span class="rc-st s-${k}">+${v} ${k.toUpperCase()}</span>`).join('');
  const tile=(it,actions,ico)=>{ const art=weaponArtKey(it); return `<div class="rc-item" style="--rar:${RAR[it.tier]||'#475569'}">
      <div class="rc-ibox ${art?'has-art':''}">${art?artImg(art)+`<span class="fb" style="display:none">${icon(ico)}</span>`:icon(ico)}${it.qty>1?`<b class="q">x${it.qty}</b>`:''}${it.level?`<i class="lv">${it.level}</i>`:''}</div>
      <div class="rc-iname">${esc(it.name)}</div>
      ${it.tier?`<span class="rc-tier">${it.tier}</span>`:''}
      ${it.stats?`<div class="rc-chips2">${statChips(it.stats)}</div>`:''}
      <div class="rc-iact">${actions}</div></div>`; };
  const slots = EQUIP_SLOTS.map(slot=>{
    const it = c.equipment[slot];
    return it
      ? tile(it, `<button class="btn btn-sm" data-action="unequip" data-slot="${slot}">Unequip</button>${upgradeButtonHtml(it, c)}`, SLOT_ICO[slot]||'shield').replace('<div class="rc-item"','<div class="rc-item eq"')
        .replace('<div class="rc-ibox">',`<div class="rc-slotname">${slot}</div><div class="rc-ibox">`)
      : `<div class="rc-item empty"><div class="rc-slotname">${slot}</div><div class="rc-ibox">${icon(SLOT_ICO[slot]||'shield')}</div><div class="rc-iname faint">Empty</div></div>`;
  }).join('');
  const sortFn=(x,y)=>(TIERN[y.tier]||0)-(TIERN[x.tier]||0)||(y.level||1)-(x.level||1);
  const gear = c.inventory.filter(i=>i.kind==='equipment').sort(sortFn);
  const consumables = c.inventory.filter(i=>i.kind==='consumable');
  const materials = c.inventory.filter(i=>i.kind==='material');
  const sell=it=>`<button class="btn btn-sm" data-action="sell" data-uid="${it.uid}">Sell &middot; ${sellPrice(it)}g</button>`;
  const gearCards = gear.map(it=>tile(it, `<button class="btn btn-sm btn-primary" data-action="equip" data-uid="${it.uid}">Equip</button>${sell(it)}${upgradeButtonHtml(it, c)}`, SLOT_ICO[it.slot]||'shield')).join('') || '<p class="faint">No gear in your bag.</p>';
  const consCards = consumables.map(it=>tile(it, `<button class="btn btn-sm btn-primary" data-action="use-item" data-uid="${it.uid}">Use</button>`, 'bolt')).join('') || '<p class="faint">No consumables.</p>';
  const matCards = materials.map(it=>tile(it, sell(it), 'hammer')).join('') || '<p class="faint">No materials.</p>';
  const pct=Math.min(100,Math.round(bagCount(c)/BAG_CAPACITY*100));
  return `
  ${pageHero('Inventory','Equip your gear, use items and sell what you do not need','inventory')}
  <div class="rc-tiles" style="margin-top:12px">
    <div class="rc-tile"><small>Bag</small><b>${bagCount(c)}/${BAG_CAPACITY}</b><div class="rc-bagbar"><i style="width:${pct}%"></i></div></div>
    ${statTile('Gold',fmtNum(c.gold),'gold')}
    ${statTile('Gear',gear.length)}
  </div>
  <div class="rc-sec">EQUIPMENT</div><div class="rc-items">${slots}</div>
  <div class="rc-sec">GEAR — ${gear.length}</div><div class="rc-items">${gearCards}</div>
  <div class="rc-sec">CONSUMABLES — ${consumables.length}</div><div class="rc-items">${consCards}</div>
  <div class="rc-sec">MATERIALS — ${materials.length}</div><div class="rc-items">${matCards}</div>`;
}
function upgradeButtonHtml(it, c){
  const cost = UPGRADE_COSTS[it.tier];
  if(!cost) return ''; // already legendary, or unknown tier
  const nextTier = TIERS[TIER_ORDER.indexOf(it.tier)+1];
  const parts = [];
  let affordable = c.gold >= cost.gold;
  parts.push(cost.gold+'g');
  if(cost.resources){
    Object.entries(cost.resources).forEach(([k,v])=>{
      if((c.resourceBag[k]||0) < v) affordable = false;
      parts.push(`${v} ${RESOURCE_NAMES[k]}`);
    });
  }
  if(cost.materials){
    Object.entries(cost.materials).forEach(([k,v])=>{
      const have = c.inventory.filter(i=>i.kind==='material' && i.id===k).reduce((a,i)=>a+(i.qty||1),0);
      if(have < v) affordable = false;
      parts.push(`${v}x ${k.replace(/_/g,' ')}`);
    });
  }
  return `<button class="btn btn-sm ${affordable?'btn-primary':''}" data-action="upgrade-item" data-uid="${it.uid}" ${affordable?'':'disabled'} title="${parts.join(', ')}">Upgrade &rarr; ${nextTier.name}</button>`;
}
function sellPrice(it){
  if(it.kind==='equipment'){ const tm={common:1,uncommon:1.8,rare:3,epic:5,legendary:8}[it.tier]||1; return Math.round(8*(it.level||1)*tm); }
  if(it.kind==='consumable') return 6;
  return 3;
}

/* ---------------- Profile (Stats + Settings tabs) ---------------- */
function renderProfile(){
  const tab = ['skills','settings'].includes(S.profileTab) ? S.profileTab : 'stats';
  const _c=S.char;
  const fmtDate=ts=>new Date(Number(ts)||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const tabs=[['stats','Home','user'],['skills','Skills','chart'],['settings','Settings','gear']];
  const tabRow=`<div class="country-module-nav rc-ptabs">${tabs.map(t=>`<button class="country-module ${tab===t[0]?'active':''}" data-action="profile-tab" data-tab="${t[0]}">${icon(t[2])}<span>${t[1]}</span>${t[0]==='skills'&&_c.skillPoints>0?`<i class="rc-dot">${_c.skillPoints}</i>`:''}</button>`).join('')}</div>`;
  const hero=`<div class="rc-chero rc-phero"><div class="rc-banner"></div><div class="rc-chead"><div class="rc-pav"><div class="rc-avatar">${esc(_c.username.slice(0,2).toUpperCase())}</div><span class="lv">${_c.level}</span><span class="fg">${kingdomFlag(_c.kingdomId,16,'margin:0;vertical-align:0')}</span></div><div><h2>${kingdomFlag(_c.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(_c.username)}</h2><div class="rc-cstats pl"><span><small>Citizen since</small><b>${fmtDate(_c.createdAt)}</b></span><span><small>Last connection</small><b>${fmtRelative(_c.updatedAt)==='now'?'now':fmtRelative(_c.updatedAt)+' ago'}</b></span></div></div></div></div>`;
  return hero + tabRow + (tab==='settings' ? renderSettings() : renderProfileStats(tab));
}
function renderProfileStats(tab){
  const c = S.char, eff = effectiveStats(c);
  const cls = CLASSES[c.class];
  const genRows = GENERAL_SKILLS.map(gs=>{
    const lvl = c.generalSkills[gs.id];
    const cost = generalSkillCost(lvl);
    const maxed = lvl>=GENERAL_SKILL_MAX;
    return `<div class="skill-row">
      <div>
        <div style="font-weight:700; color:var(--parchment); font-size:13.5px;">${gs.name} <span class="faint">Lv.${lvl}</span></div>
        <div class="faint">${gs.desc}</div>
      </div>
      <button class="btn btn-sm ${maxed?'':'btn-primary'}" data-action="buy-general" data-skill="${gs.id}" ${maxed || c.skillPoints<cost ? 'disabled':''}>${maxed?'Max':cost+' pt'}</button>
    </div>`;
  }).join('');
  const classRows = cls.skills.map(s=>{
    const lvl = c.classSkills[s.id];
    const maxed = lvl>=MAX_SKILL_LEVEL;
    const cost = maxed?0:SKILL_UPGRADE_COST[lvl];
    const pips = Array.from({length:MAX_SKILL_LEVEL},(_,i)=>`<div class="pip ${i<lvl?'on':''}"></div>`).join('');
    return `<div class="skill-row">
      <div style="flex:1;">
        <div style="font-weight:700; color:var(--parchment); font-size:13.5px;">${s.name} <span class="faint">Lv.${lvl}/${MAX_SKILL_LEVEL}</span></div>
        <div class="faint">${s.desc}</div>
        <div class="pip-row">${pips}</div>
      </div>
      <button class="btn btn-sm ${maxed?'':'btn-primary'}" data-action="buy-class-skill" data-skill="${s.id}" ${maxed || c.skillPoints<cost ? 'disabled':''}>${maxed?'Max':cost+' pt'}</button>
    </div>`;
  }).join('');
  const need = xpNeeded(c.level);
  const tile=(l,v,cls)=>`<div class="rc-tile ${cls||''}"><small>${l}</small><b>${v}</b></div>`;
  if(tab==='skills'){
    return `
    <div class="rc-skillhead"><div class="rc-lvl">${c.level}</div><div><b>${c.skillPoints} skill points</b><br><span class="faint">Upgrade your skills!</span></div><button class="btn btn-danger btn-sm" data-action="reset-skills" style="margin-left:auto">Reset</button></div>
    <div class="rc-sec">${esc(cls.resource).toUpperCase()} SKILLS</div>
    <div class="rc-skills">${classRows}</div>
    <div class="rc-sec">GENERAL SKILLS</div>
    <div class="rc-skills">${genRows}</div>`;
  }
  const eqRow=EQUIP_SLOTS.map(sl=>{ const it=(c.equipment||{})[sl]; return `<button class="rc-eq ${it?'tier-'+it.tier:''}" data-action="nav" data-screen="inventory" title="${esc(it?it.name:sl)}">${it?esc(it.name.slice(0,2).toUpperCase()):'+'}<small>${sl}</small></button>`; }).join('');
  return `
  <div class="rc-sec">EQUIPMENT</div>
  <div class="rc-eqrow">${eqRow}</div>
  <div class="rc-sec">RANKINGS</div>
  <div class="rc-tiles">
    ${tile('Level',c.level)}
    ${tile('XP',fmtNum(c.xp||0)+(need?' / '+fmtNum(need):''),'gold')}
    ${tile('PvP rating',Math.round(c.pvp.rating))}
    ${tile('League',leagueBadge(c.pvp.rating,16)+' '+leagueOf(c.pvp.rating).name)}
    ${tile('Wins / Losses',c.pvp.wins+' / '+c.pvp.losses,'green')}
  </div>
  <div class="rc-sec">WEALTH</div>
  <div class="rc-tiles">
    ${tile('Gold',fmtNum(c.gold),'gold')}
    ${tile('Items',(c.inventory||[]).length)}
    ${tile('Skill points',c.skillPoints)}
  </div>
  <div class="rc-sec">COMBAT STATS</div>
  <div class="rc-tiles">
    ${tile('Max HP',eff.maxHp)}${tile('Attack',eff.atk)}${tile('Defense',eff.def)}${tile('Speed',eff.spd)}
    ${tile('Crit %',eff.crit+'%')}${tile('Evasion %',eff.eva+'%')}${tile('Max Energy',eff.maxEnergy)}${tile('Max Mana',eff.maxMana)}
  </div>`;
}

/* ---------------- Settings ---------------- */
function renderSettings(){
  const c = S.char;
  if(S._settingsUsername === undefined || S._settingsUsername === null) S._settingsUsername = c.username;
  const activeScheme = c.colorScheme || 'brass';
  const swatches = COLOR_SCHEMES.map(s=>`
    <button class="color-swatch ${s.id===activeScheme?'selected':''}" data-action="set-color-scheme" data-color="${s.id}" title="${esc(s.name)}" style="--swatch-color:${s.base};">
      <span class="color-swatch-dot" style="background:${s.base};"></span>
      <span class="color-swatch-label">${esc(s.name)}</span>
    </button>`).join('');
  return `
  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Your email</div>
    <div style="font-weight:700; color:var(--parchment); font-size:14px;">${HAS_DB && FB_USER_EMAIL ? esc(FB_USER_EMAIL) : 'Not linked'}</div>
    ${HAS_DB && !FB_USER_EMAIL ? `<button class="btn btn-sm" data-action="google-signin" style="margin-top:10px;">Sign in with Google</button>
    <p class="faint" style="margin-top:8px; line-height:1.6;">Link a Google account so your progress follows you to other devices and browsers instead of staying tied to this one.</p>` : ''}
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Update infos</div>
    <label class="field">Username</label>
    <input type="text" id="settings-username-input" maxlength="18" value="${esc(S._settingsUsername)}">
    <div style="display:flex; justify-content:flex-end; margin-top:10px;">
      <button class="btn btn-primary" data-action="update-username">Update</button>
    </div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Appearance</div>
    <div class="faint" style="margin-bottom:10px; text-transform:uppercase; letter-spacing:.05em;">Color scheme</div>
    <div class="color-swatch-grid">${swatches}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Account</div>
    <div class="stat-list">
      <div><span>Player ID</span><b style="font-size:11px;">${esc(MY_ID.slice(0,14))}&hellip;</b></div>
      <div><span>Storage</span><b>${HAS_DB?'Shared (cross-viewer)':'Local to this browser'}</b></div>
    </div>
    <p class="faint" style="margin-top:10px; line-height:1.6;">
      This is an in-browser prototype of REALMCLASH MMO's core loop. ${HAS_DB
        ? 'Your character is saved to shared storage, so other people who open this page can be matched against you in the PvP Arena.'
        : 'Real-player matchmaking is unavailable in this view, so PvP opponents are simulated.'}
      Combat is resolved locally rather than by a trusted server, so treat this as a feel-the-loop demo, not a cheat-proof build.
    </p>
  </div>
  <div class="panel">
    <div class="panel-title">Danger zone</div>
    <p class="faint" style="margin-bottom:10px;">Delete this character and start over.</p>
    <button class="btn btn-danger" data-action="reset-character">Delete character</button>
  </div>`;
}
function bindSettingsEvents(){
  const input = document.getElementById('settings-username-input');
  if(input){
    input.addEventListener('input', e=>{ S._settingsUsername = e.target.value; });
  }
}

/* ---------------- PvP ---------------- */
let _kingdomFetchInFlight = false;
function renderKingdom(){
  const c = S.char;
  const kv = S.kingdomView;
  if(!kv){
    if(!_kingdomFetchInFlight){ _kingdomFetchInFlight = true; loadKingdomView().finally(()=>{ _kingdomFetchInFlight = false; }); }
    return `<div class="empty"><h3>Loading kingdoms...</h3></div>`;
  }
  if(kv.unavailable){
    return `<div class="country-empty"><div class="country-empty-icon">${icon('castle')}</div><h2>Kingdoms are offline</h2><p>Shared country data is unavailable in this session.</p></div>`;
  }
  if(kv.loading){ return `<div class="empty"><h3>Loading kingdoms...</h3></div>`; }
  if(kv.error){ return `<div class="panel empty"><h3>Couldn't load kingdom data</h3><p class="faint">Please try again.</p><button class="btn btn-primary" style="margin-top:10px;" data-action="nav" data-screen="kingdom">Retry</button></div>`; }

  if(kv.mode==='browse'){
    const cd = (c.kingdomCooldownUntil||0) - Date.now();
    if(cd > 0){
      return `<div class="country-empty"><div class="country-empty-icon">${icon('lock')}</div><h2>Kingdom transfer locked</h2><p>You may join a new kingdom in <b>${fmtMs(cd)}</b>.</p></div>`;
    }
    const cards = kv.kingdoms.map(k=>`
      <article class="kingdom-discover-card">
        <div class="kingdom-discover-top">
          <div class="kingdom-crest">${flagIcon(k.flag,42)}</div>
          <div class="kingdom-discover-title"><span class="eyebrow">KINGDOM</span><h3>${k.name}</h3><p>${plural(k.memberCount,'citizen')} · ${k.tax}% tax</p></div>
        </div>
        <div class="kingdom-resource-row">${k.resources.map(r=>`<span>${resourceIcon(r,16)} ${RESOURCE_NAMES[r]||titleCase(r)}</span>`).join('')}</div>
        <div class="kingdom-discover-foot"><span>${icon('coins')} Treasury <b>${fmtNum(k.treasury.gold||0)}</b></span><button class="btn btn-primary btn-sm" data-action="join-kingdom" data-kingdom="${k.id}">Join Kingdom</button></div>
      </article>`).join('');
    function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
    return `
      <div class="country-hero discover-hero"><div><span class="eyebrow">THE GREAT REALMS</span><h2>Choose your kingdom</h2><p>Find a faction, build your influence and shape the world.</p></div><div class="hero-emblem">${icon('globe')}</div></div>
      <div class="kingdom-discover-grid">${cards}</div>`;
  }

  const k = kv.kingdom;
  const kdef = KINGDOMS.find(x=>x.id===k.id) || {name:k.id, flag:'', resources:[], tax:0};
  const treasury = k.treasury || {};
  const myRank = kingdomRank(c.kingdomRole);
  const canManageRoles = myRank >= 3;
  const canKick = myRank >= 2;
  const leaderMissing = !k.leaderId;
  const members = kv.members || [];
  const govMembers = members.filter(m=>kingdomRank(m.kingdomRole)>=2).sort((a,b)=>kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole));
  const memberRows = members.map(m=>{
    const rank=kingdomRank(m.kingdomRole), isMe=m.id===MY_ID;
    let actions='';
    if(!isMe && myRank>rank){
      if(canManageRoles){
        actions += `<button class="btn btn-sm" data-action="kingdom-member" data-id="${m.id}" data-op="promote" ${rank>=myRank-1?'disabled':''}>Promote</button>`;
        actions += `<button class="btn btn-sm" data-action="kingdom-member" data-id="${m.id}" data-op="demote" ${rank<=0?'disabled':''}>Demote</button>`;
      }
      if(canKick) actions += `<button class="btn btn-sm btn-danger" data-action="kingdom-member" data-id="${m.id}" data-op="kick">Kick</button>`;
    }
    if(!isMe && c.kingdomRole==='Leader') actions += `<button class="btn btn-sm" data-action="make-leader" data-id="${m.id}" data-name="${esc(m.username||'')}">Make Leader</button>`;
    return `<div class="member-line"><div class="member-avatar" data-action="view-player" data-id="${m.id}">${(m.username||'?').slice(0,2).toUpperCase()}</div><div class="member-main" data-action="view-player" data-id="${m.id}" style="cursor:pointer"><b>${esc(m.username)} ${isMe?'<span class="faint">· You</span>':''}</b><small>Lv.${m.level||1} · ${m.kingdomRole||'Recruit'}</small></div><div class="member-actions">${actions}</div></div>`;
  }).join('');
  const treasuryRows = KINGDOM_TREASURY_RESOURCES.map(r=>`<div><span>${resourceIcon(r,14)} ${r==='gold'?'Gold':RESOURCE_NAMES[r]||r}</span><b>${fmtNum(treasury[r]||0)}</b></div>`).join('');
  const st = S.countryState && S.countryState.data;
  const activeWar = st && st.activeWar;
  const tabs = ['overview','government','treasury','war','citizens','economy'];
  const tabLabel = {overview:'Home',government:'Government',treasury:'Account',war:'Wars',citizens:'Citizens',economy:'Economy'};
  const tabIcon = {overview:'castle',citizens:'users',government:'crown',treasury:'coins',economy:'hammer',war:'swords'};
  const activeTab = tabs.includes(S.kingdomTab) ? S.kingdomTab : 'overview';
  const tabRow = `<div class="country-module-nav">${tabs.map(t=>`<button class="country-module ${activeTab===t?'active':''}" data-action="kingdom-tab" data-tab="${t}">${icon(tabIcon[t])}<span>${tabLabel[t]}</span>${t==='war'&&activeWar?'<i>LIVE</i>':''}</button>`).join('')}</div>`;

  const resourceTiles = ((st&&st.naturalResources)||kdef.resources).map(r=>`<div class="country-resource"><div class="country-resource-icon">${resourceIcon(r,25)}</div><span>${RESOURCE_NAMES[r]||r}</span><b>${fmtNum(st?.resources?.[r]||0)}</b></div>`).join('');
  const readiness = activeWar ? 'WAR ACTIVE' : 'PEACE';
  const readinessClass = activeWar ? 'danger' : 'safe';
  const avatarHtml=(m,cls)=>m?`<div class="rc-gav ${cls||''}" data-action="view-player" data-id="${esc(m.id)}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i></div>`:'';
  const byRole=r=>members.filter(m=>m.kingdomRole===r);
  const roleCard=(label,cls,list)=>`<div class="rc-role ${cls}"><h4>${label}</h4>${list.length?list.map(m=>`<div class="rc-role-p">${avatarHtml(m)}<b>${esc(m.username)}</b></div>`).join(''):'<p>No one nominated yet.</p>'}</div>`;
  const warTaxHtml = (()=>{
    if(!st) return `<p class="faint">${S.countryState&&S.countryState.status==='unavailable'?'War taxes unavailable.':'Loading war taxes…'}</p>`;
    const inn=(st.warTaxIn||[]).filter(t=>t.active!==false), out=(st.warTaxOut&&st.warTaxOut.active)?st.warTaxOut:null;
    const card=(cls,title,cid,t,extra)=>`<div class="rc-tax ${cls}"><div class="rc-tax-h"><span class="tt">${title}</span><span class="tm">${countdown(t.expiresAt)}</span></div><div class="rc-tax-b" data-action="view-country" data-id="${esc(cid)}">${kingdomFlag(cid,26,'margin:0')}<div><b>${esc(countryName(cid))}</b><small>${t.rate}% of newly gathered ${resourceIcon(t.resourceId,13)} ${esc(resName(t.resourceId))}</small></div></div>${extra||''}</div>`;
    const won=inn.map(t=>card('won','WAR SPOILS — you collect',t.loserCountryId,t,`<div class="rc-tax-f"><span>Collected so far</span><b>${fmtNum(t.collected||0)} ${esc(resName(t.resourceId))}</b></div>`));
    const lost=out?[card('lost','WAR TAX — you pay',out.winnerCountryId,out,`<div class="rc-tax-f"><span>Paid to</span><b>${esc(countryName(out.winnerCountryId))}</b></div>`)]:[];
    const pend=st.pendingReward?`<div class="rc-tax pending"><div class="rc-tax-b">${kingdomFlag(st.pendingReward.winnerCountryId,26,'margin:0')}<div><b>${esc(countryName(st.pendingReward.winnerCountryId))}</b><small>Won the war. Waiting for them to choose a resource to tax.</small></div></div></div>`:'';
    const all=won.concat(lost);
    return (all.join('')+pend) || '<p class="faint">No war taxes right now.</p>';
  })();
  const homeBody=`
    <div class="rc-sec">RANKINGS</div>
    <div class="rc-tiles">
      <div class="rc-tile green"><small>Active population</small><b>${members.length}</b></div>
      <div class="rc-tile gold"><small>Treasury</small><b>${fmtNum(treasury.gold||0)}</b></div>
      <div class="rc-tile"><small>National tax</small><b>${kdef.tax}%</b></div>
      <div class="rc-tile"><small>Total power</small><b>${fmtNum(members.reduce((n,m)=>n+(m.level||1),0))}</b></div>
    </div>
    <div class="rc-sec">GOVERNMENT</div>
    <div class="rc-gov-strip">${['Leader','Co-Leader','Officer'].map(r=>byRole(r).slice(0,4).map(m=>avatarHtml(m,r==='Leader'?'gold':r==='Co-Leader'?'blue':'red')).join('')).join('')||'<p class="faint">No government yet.</p>'}</div>
    <div class="rc-sec">NATIONAL RESOURCES</div>
    <div class="rc-res">${resourceTiles||'<span class="faint">None</span>'}</div>
    <div class="rc-sec">WAR TAXES</div>
    ${warTaxHtml}
    <div class="rc-sec">${icon('castle','style="width:12px;height:12px"')} YOUR POSITION</div>
    <div class="rc-tile"><small>Role</small><b>${c.kingdomRole||'Recruit'}</b></div>
    <div class="country-footer-action"><button class="btn btn-danger" data-action="leave-kingdom">Leave Kingdom</button></div>`;
  const govBody=`<div class="rc-gov-grid">
    <div class="rc-role gold wide">${'<h4>★ Leader</h4>'}${byRole('Leader').map(m=>`<div class="rc-role-p c">${avatarHtml(m,'gold')}<b>${esc(m.username)}</b></div>`).join('')||'<p>No one nominated yet.</p>'}</div>
    ${roleCard('Co-Leader','blue',byRole('Co-Leader'))}
    ${roleCard('Officers','red',byRole('Officer'))}
  </div>`;
  const citBody=`<div class="country-card"><div class="country-card-head"><span>CITIZENS</span><b>${members.length}</b></div><div class="member-list">${memberRows}</div></div>`;

  let tabBody='';
  if(activeTab==='overview') tabBody=homeBody;
  else if(activeTab==='citizens') tabBody=citBody;
  else if(activeTab==='government') tabBody=govBody;
  else if(activeTab==='treasury') tabBody=`<div class="country-card wide"><div class="country-card-head"><span>ROYAL TREASURY</span><b>${fmtNum(treasury.gold||0)} GOLD</b></div><div class="treasury-big"><div class="treasury-emblem">${icon('coins')}</div><div><small>AVAILABLE GOLD</small><strong>${fmtNum(treasury.gold||0)}</strong><p>Funds contributed by the citizens of ${kdef.name}.</p></div></div><div class="stat-list treasury-list">${treasuryRows}</div><div class="country-actions"><button class="btn btn-primary" data-action="donate-kingdom" data-resource="gold" data-amount="50">Donate 50 Gold</button><button class="btn" data-action="donate-kingdom" data-resource="gold" data-amount="200">Donate 200 Gold</button></div></div>`;
  else if(activeTab==='economy') tabBody=renderEconomy(c,kv);
  else if(activeTab==='war') tabBody=renderWar(c,kv);

  return `
    <div class="rc-chero">
      <div class="rc-banner country"></div>
      <div class="rc-chead"><div class="rc-flag">${flagIcon(kdef.flag,64)}</div><div><small>⚑ Country</small><h2>${esc(kdef.name)}</h2><div class="rc-cstats"><span><small>Citizens</small><b>${members.length}</b></span><span><small>Treasury</small><b>${fmtNum(treasury.gold||0)}</b></span><span><small>Tax</small><b>${kdef.tax}%</b></span><span><small>Status</small><b class="${readinessClass}">${readiness}</b></span></div></div></div>
    </div>
    ${leaderMissing ? `<div class="country-alert"><span>${icon('crown')}</span><div><b>Leadership is vacant</b><p>${govMembers.length?'An Officer or above can claim leadership.':'No Officer exists yet, so any citizen can claim leadership.'}</p></div>${(myRank>=2||!govMembers.length)?'<button class="btn btn-primary btn-sm" data-action="claim-leadership">Claim Leadership</button>':''}</div>`:''}
    ${tabRow}
    ${tabBody}`;
}

/* ---------------- Country economy & war (all numbers come from the server) ---------------- */
function countryName(id){ const k = KINGDOMS.find(x=>x.id===id); return k ? k.name : id; }
function srvNow(){ return Date.now() + (S.serverOffset||0); }
function dailyPanel(c){
  const DAY=86400000, today=Math.floor(srvNow()/DAY), d=c.daily||{};
  const claimed = d.day===today;
  const streak = claimed ? d.streak : (d.day===today-1 ? Math.min((d.streak||0)+1,7) : 1);
  const days = Array.from({length:7},(_,i)=>`<span class="daily-dot ${i<streak-(claimed?0:1)?'done':(i===streak-1&&!claimed?'next':'')}">${i+1}</span>`).join('');
  return `<section class="panel daily-panel"><div class="section-head"><div><span class="eyebrow">DAILY REWARD</span><h3>${claimed?'Claimed today':'Your reward is ready'}</h3></div>
    ${claimed?`<span class="faint">Next in ${countdown((today+1)*DAY)}</span>`:`<button class="btn btn-primary" data-action="claim-daily">Claim +${20*streak} gold &amp; +20 energy</button>`}</div>
    <div class="daily-streak">${days}</div><p class="faint" style="margin:6px 0 0;">Come back every day: the streak raises the reward up to day 7.</p></section>`;
}
function fmtClock(ms){
  if(ms<=0) return '00:00';
  const s = Math.ceil(ms/1000), d = Math.floor(s/86400), h = Math.floor(s%86400/3600), m = Math.floor(s%3600/60), r = s%60;
  const hh = String(h).padStart(2,'0'), mm = String(m).padStart(2,'0'), ss = String(r).padStart(2,'0');
  return d>0 ? `${d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
}
function countdown(endsAt){ return `<span data-countdown="${endsAt}">${fmtClock(endsAt - srvNow())}</span>`; }
function resName(r){ return RESOURCE_NAMES[r] || (r.charAt(0).toUpperCase()+r.slice(1)); }

function countryStatePanel(){ // shared loading / error / unavailable handling for both tabs
  const cs = S.countryState;
  if(!cs || (cs.status==='loading' && !cs.data)) return `<div class="empty"><h3>Loading...</h3></div>`;
  if(cs.status==='unavailable') return `<div class="panel empty"><h3>Unavailable</h3><p class="faint">Country economy and wars need the game servers, which this view can't reach.</p></div>`;
  if(!cs.data) return `<div class="panel empty"><h3>Couldn't load</h3><button class="btn btn-primary" style="margin-top:10px;" data-action="country-refresh">Retry</button></div>`;
  return null;
}

function renderEconomy(c, kv){
  const blocked = countryStatePanel(); if(blocked) return blocked;
  const st = S.countryState.data, k = kv.kingdom;
  const leader = kv.members.find(m=>m.id===st.leaderId);
  const resRows = Object.keys(st.resources).map(r=>`<div><span>${resourceIcon(r,14)} ${resName(r)}${st.naturalResources.includes(r)?'':' <span class="faint">(war spoils)</span>'}</span><b>${fmtNum(st.resources[r])}</b></div>`).join('');
  const out = st.warTaxOut && st.warTaxOut.active ? `
    <div class="panel" style="margin-bottom:16px; border-color:var(--danger);">
      <div class="panel-title">&#9888; War Tax</div>
      <p>Your country lost a war against ${kingdomFlag(st.warTaxOut.winnerCountryId)}<b>${countryName(st.warTaxOut.winnerCountryId)}</b>.</p>
      <div class="stat-list">
        <div><span>Resource affected</span><b>${resourceIcon(st.warTaxOut.resourceId,14)} ${resName(st.warTaxOut.resourceId)}</b></div>
        <div><span>War Tax</span><b>${st.warTaxOut.rate}% of newly gathered</b></div>
        <div><span>Remaining</span><b>${countdown(st.warTaxOut.expiresAt)}</b></div>
      </div>
      <p class="faint" style="margin-top:6px;">Resources you already own are never touched.</p>
    </div>` : '';
  const inn = st.warTaxIn.map(t=>`
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">&#127942; War Spoils</div>
      <p>${kingdomFlag(st.countryId)}<b>${countryName(st.countryId)}</b> is receiving ${t.rate}% of ${resourceIcon(t.resourceId,14)} <b>${resName(t.resourceId)}</b> newly gathered by ${kingdomFlag(t.loserCountryId)}<b>${countryName(t.loserCountryId)}</b>.</p>
      <div class="stat-list"><div><span>Collected so far</span><b>${fmtNum(t.collected||0)}</b></div><div><span>Remaining</span><b>${countdown(t.expiresAt)}</b></div></div>
    </div>`).join('');
  let specPanel = '';
  if(st.isLeader){
    const pick = S._specPick || st.naturalResources.slice();
    const locked = st.specialityCooldownUntil > st.serverNow;
    const changed = pick.slice().sort().join() !== st.naturalResources.slice().sort().join();
    specPanel = `<div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Specialities</div>
      <p class="faint">Pick exactly 2 resources. The country tax only applies to these two when citizens gather them.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin:8px 0;">${st.specialityOptions.map(r=>`<button class="btn ${pick.includes(r)?'btn-primary':''}" data-action="spec-pick" data-resource="${r}" ${locked?'disabled':''}>${resourceIcon(r,14)} ${resName(r)}</button>`).join('')}</div>
      <button class="btn btn-primary" data-action="spec-confirm" ${(!locked && changed && pick.length===2)?'':'disabled'}>Save specialities</button>
      <p class="faint" style="margin-top:6px;">${locked ? `You can change them again in ${countdown(st.specialityCooldownUntil)}.` : 'After saving, they can be changed again in 7 days.'}</p>
    </div>`;
  }
  return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">${kingdomFlag(st.countryId,20)}${countryName(st.countryId)}</div>
      <div class="stat-list">
        <div><span>Leader</span><b>${leader ? esc(leader.username) : (st.leaderId ? 'Unknown' : 'None')}</b></div>
        <div><span>Citizens</span><b>${kv.members.length}</b></div>
        <div><span>Country tax</span><b>${st.taxRate}%</b></div>
        <div><span>Treasury</span><b>${fmtNum((k.treasury||{}).gold||0)} Gold</b></div>
      </div>
      <p class="faint" style="margin-top:8px;">When a citizen gathers ${st.naturalResources.map(resName).join(' or ')} (PvE, Road), ${st.taxRate}% of that NEW amount goes to the country. Resources already in inventories are never taxed.</p>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Country Resources</div>
      <div class="stat-list">${resRows}</div>
    </div>
    ${specPanel}${out}${inn}`;
}

function renderWarHistoryRow(h, myId){
  const a = h.attackerCountryId, d = h.defenderCountryId;
  const tax = h.selectedResource ? (h.rewardState==='active'
      ? `${resName(h.selectedResource)} Tax &mdash; Active, ${fmtClock(h.taxMsRemaining)} remaining`
      : `${resName(h.selectedResource)} Tax &mdash; Expired`)
    : (h.rewardState==='awaiting_choice' ? 'Reward not chosen yet' : h.rewardState==='forfeited' ? 'Reward forfeited' : '');
  return `<div class="skill-row"><div>
    <div style="font-weight:700;">${kingdomFlag(a)}${countryName(a)} ${h.finalScore[a]||0}&ndash;${h.finalScore[d]||0} ${kingdomFlag(d)}${countryName(d)}</div>
    <div class="faint">${h.result==='victory'?'Victory':'Defeat'}${tax?' &middot; '+tax:''}</div>
  </div></div>`;
}

function renderWar(c, kv){
  const blocked = countryStatePanel(); if(blocked) return blocked;
  const st = S.countryState.data, me = st.countryId, now = srvNow();
  let html = '';

  // ---- victory: the winning Leader picks ONE resource ----
  if(st.pendingReward){
    const pr = st.pendingReward;
    if(st.isLeader){
      const lo=pr.rateMin||1, hi=pr.rateMax||25, rate=Math.min(hi,Math.max(lo,S._rewardRate||pr.defaultRate||10));
      const spec=new Set(pr.loserResources||[]);
      html += `<div class="panel" style="margin-bottom:16px;">
        <div class="panel-title">&#127942; WAR VICTORY</div>
        <p>You defeated ${kingdomFlag(pr.loserCountryId)}<b>${countryName(pr.loserCountryId)}</b>.<br>Choose <b>any</b> resource to tax for 14 days and the tax rate (${lo}%–${hi}%) of what their citizens gather from now on.</p>
        <div class="rc-sec">1. RESOURCE</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin:6px 0 4px;">${pr.options.map(r=>`<button class="btn ${S._rewardPick===r?'btn-primary':''}" data-action="reward-pick" data-resource="${r}">${resourceIcon(r,14)} ${resName(r)}${spec.has(r)?' <span title="One of their specialities">&#9733;</span>':''}</button>`).join('')}</div>
        <p class="faint">&#9733; = a speciality of ${countryName(pr.loserCountryId)}. You can still tax any other resource their citizens gather.</p>
        <div class="rc-sec">2. TAX RATE — <b id="reward-rate-val">${rate}%</b></div>
        <input type="range" class="rc-range" id="reward-rate" min="${lo}" max="${hi}" step="1" value="${rate}" oninput="S._rewardRate=Number(this.value);document.getElementById('reward-rate-val').textContent=this.value+'%'">
        <div class="rc-range-lim"><span>${lo}%</span><span>${hi}%</span></div>
        <button class="btn btn-primary" style="margin-top:10px" data-action="reward-confirm" data-war="${pr.warId}" ${S._rewardPick?'':'disabled'}>Confirm</button>
        <p class="faint" style="margin-top:6px;">Choose before ${countdown(pr.claimExpiresAt)} runs out.</p>
      </div>`;
    } else {
      html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">&#127942; WAR VICTORY</div><p>Your country defeated ${kingdomFlag(pr.loserCountryId)}<b>${countryName(pr.loserCountryId)}</b>. The Leader has not chosen the resource to tax yet.</p></div>`;
    }
  }

  // ---- current war ----
  const w = st.activeWar;
  if(w){
    const a = w.attackerCountryId, d = w.defenderCountryId;
    const head = `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <div style="font-size:16px; font-weight:700;">${kingdomFlag(a,22)}${countryName(a)}</div><div class="faint">VS</div>
      <div style="font-size:16px; font-weight:700;">${kingdomFlag(d,22)}${countryName(d)}</div></div>`;
    if(w.status==='preparing'){
      html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">WAR DECLARED</div>${head}
        <p style="margin-top:10px;">Round 1 starts in ${countdown(w.startsAt)}.</p></div>`;
    } else {
      const lv = w.live || {round:1, damage:{}}, cur = w.rounds[w.rounds.length-1];
      const myDmg = lv.damage[me]||0, enemy = me===a ? d : a, enDmg = lv.damage[enemy]||0;
      const m = w.mine;
      const coolLeft = m ? Math.max(0, m.lastStrikeAt + m.cooldownMs - now) : 0;
      const canStrike = m && coolLeft===0 && m.strikes < m.maxStrikes;
      const tRow=(t,i)=>{ const mem = kv.members.find(x=>x.id===t.uid); const nm=t.username||(mem?mem.username:'Player'), lvl=t.level||(mem?mem.level:1)||1; return `<div class="rc-rank" data-action="view-player" data-id="${esc(t.uid)}"><i>${i+1}</i><div class="rc-gav"><span>${esc(nm.slice(0,2).toUpperCase())}</span><i>${lvl}</i></div><b>${esc(nm)}</b><span class="dm">${fmtDmg(t.damage)}</span></div>`; };
      const sideList=cc=>(lv.top||[]).filter(t=>t.country===cc||(!t.country&&cc===me)).map(tRow).join('')||'<p class="faint">No damage yet.</p>';
      const top = (lv.top&&lv.top.length) ? `<div class="rc-two"><div><div class="rc-sec">DEFENDERS · ${kingdomFlag(d)}${esc(countryName(d))}</div><div class="rc-ranks">${sideList(d)}</div></div><div><div class="rc-sec">ATTACKERS · ${kingdomFlag(a)}${esc(countryName(a))}</div><div class="rc-ranks">${sideList(a)}</div></div></div>` : '';
      html += `<div class="panel" style="margin-bottom:16px;">
        <div class="panel-title">${lv.round===3?'ROUND 3 &mdash; FINAL ROUND':'CURRENT WAR'}</div>${head}
        <div class="rc-dmgbar big" style="margin-top:12px"><span class="l">${kingdomFlag(a)}${fmtDmg(lv.damage[a]||0)}</span><div><i style="width:${((lv.damage[a]||0)+(lv.damage[d]||0))?Math.round((lv.damage[a]||0)/((lv.damage[a]||0)+(lv.damage[d]||0))*100):50}%"></i></div><span class="r">${fmtDmg(lv.damage[d]||0)}${kingdomFlag(d)}</span></div>
        <div class="stat-list" style="margin-top:10px;">
          <div><span>Round</span><b>${lv.round} / 3</b></div>
          <div><span>Round wins</span><b>${countryName(a)} ${w.finalScore[a]||0} &mdash; ${w.finalScore[d]||0} ${countryName(d)}</b></div>
          <div><span>Time left in round</span><b>${countdown(cur.endsAt)}</b></div>
          <div><span>${kingdomFlag(me)}${countryName(me)} damage</span><b>${fmtNum(myDmg)}</b></div>
          <div><span>${kingdomFlag(enemy)}${countryName(enemy)} damage</span><b>${fmtNum(enDmg)}</b></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-primary" data-action="war-strike" ${canStrike?'':'disabled'}>Strike (${m?m.energyCost:10} Energy)</button>
          <span class="faint">${m ? `Your damage: ${fmtNum(m.damage)} &middot; Strikes: ${m.strikes}/${m.maxStrikes}${coolLeft?` &middot; ready in ${Math.ceil(coolLeft/1000)}s`:''}` : ''}</span>
        </div>
        <p class="faint" style="margin-top:6px;">Each strike is a real duel against a citizen of ${countryName(enemy)}; the server counts the HP you take off them.</p>
      </div>
      ${top ? `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">Top fighters this round</div>${top}</div>` : ''}`;
    }
  } else {
    // ---- declare a war (Leader only) ----
    const cool = st.cooldownUntil - now;
    let body;
    if(!st.isLeader) body = `<p class="faint">Only your country's Leader can declare war.</p>`;
    else if(cool>0) body = `<p class="faint">Your country is recovering from its last war. A new war can be declared in ${countdown(st.cooldownUntil)}.</p>`;
    else body = `<p class="faint" style="margin-bottom:8px;">Pick a country. The war starts after a short preparation and is fought over at most 3 rounds &mdash; first to win 2 takes the victory.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <select id="war-target" style="flex:1; min-width:180px;">${'<option value="">Choose a country...</option>'+KINGDOMS.filter(k=>k.id!==me).map(k=>`<option value="${k.id}" ${S._warTarget===k.id?'selected':''}>${k.name}</option>`).join('')}</select>
        <button class="btn btn-danger" data-action="declare-war">Declare War</button>
      </div>`;
    html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">No war in progress</div>${body}</div>`;
  }

  // ---- history ----
  html += `<div class="panel"><div class="panel-title">War History</div>${st.history.length ? st.history.map(h=>renderWarHistoryRow(h, me)).join('') : '<p class="faint">No wars yet.</p>'}</div>`;
  return html;
}

/* ---------------- Country rankings ---------------- */
function renderGlobalRankings(){
  const rv=S.rankingsView, tab=S.rankTab==='countries'?'countries':'players', my=S.char;
  const head=`${pageHero('Rankings','Top players and countries','rankings')}
    <div class="country-module-nav rc-ptabs"><button class="country-module ${tab==='players'?'active':''}" data-action="rank-tab" data-tab="players">${icon('user')}<span>Players</span></button><button class="country-module ${tab==='countries'?'active':''}" data-action="rank-tab" data-tab="countries">${icon('globe')}<span>Countries</span></button></div>`;
  if(!rv || rv.loading) return head+`<div class="empty"><h3>Loading rankings…</h3></div>`;
  if(rv.unavailable) return head+`<div class="panel empty"><h3>Rankings unavailable</h3></div>`;
  if(rv.error) return head+`<div class="panel empty"><h3>Couldn't load rankings</h3><button class="btn btn-primary" data-action="nav" data-screen="rankings">Retry</button></div>`;
  const modes = tab==='players' ? [['level','Level'],['rating','PvP rating'],['dmg','Weekly damage']] : [['level','Total level'],['rating','Avg rating'],['dmg','Weekly damage']];
  const sort = modes.some(m=>m[0]===S.rankSort) ? S.rankSort : 'level';
  const chips=`<div class="rc-filters">${modes.map(m=>`<button class="rc-fchip ${sort===m[0]?'on':''}" data-action="rank-sort" data-sort="${m[0]}">${m[1]}</button>`).join('')}</div>`;
  const medal=['gold','silver','bronze'];
  let rows='', myRank='—', myCoRank='—';
  const pKey = {level:p=>p.level, rating:p=>p.rating, dmg:p=>p.dmg}[sort];
  const cKey = {level:x=>x.totalLevel, rating:x=>x.avgRating, dmg:x=>x.dmg}[sort];
  const pl=(rv.list||[]).filter(p=>sort!=='dmg'||p.dmg>0).slice().sort((a,b)=>pKey(b)-pKey(a)||b.level-a.level||b.rating-a.rating);
  const co=(rv.countries||[]).filter(x=>sort!=='dmg'||x.dmg>0).slice().sort((a,b)=>cKey(b)-cKey(a)||b.totalLevel-a.totalLevel);
  const pIdx=pl.findIndex(p=>p.id===MY_ID); if(pIdx>=0) myRank='#'+(pIdx+1);
  const cIdx=co.findIndex(x=>x.id===my.kingdomId); if(cIdx>=0) myCoRank='#'+(cIdx+1);
  const metricP=p=> sort==='dmg' ? `${icon('sword','style="width:13px;height:13px"')} ${fmtDmg(p.dmg)}` : sort==='rating' ? `${leagueBadge(p.rating,16)} ${p.rating}` : `Lv ${p.level}`;
  const subP=p=> sort==='level' ? `Rating ${p.rating}` : sort==='rating' ? `Lv ${p.level}` : `Lv ${p.level} · Rating ${p.rating}`;
  const metricC=x=> sort==='dmg' ? `${icon('sword','style="width:13px;height:13px"')} ${fmtDmg(x.dmg)}` : sort==='rating' ? `${x.avgRating}` : `Lv ${fmtNum(x.totalLevel)}`;
  if(tab==='players'){
    rows=pl.slice(0,25).map((p,i)=>`<div class="rc-rrow ${medal[i]||''} ${p.id===MY_ID?'me':''}" data-action="view-player" data-id="${esc(p.id)}"><span class="rk">${i+1}</span><div class="rc-gav"><span>${esc(p.username.slice(0,2).toUpperCase())}</span><i>${p.level}</i></div><div class="nm"><b>${esc(p.username)}</b><small>${kingdomFlag(p.kingdomId,14,'margin:0 4px 0 0;vertical-align:-2px')}${esc(countryName(p.kingdomId)||'No country')} · ${subP(p)}</small></div><span class="dm">${metricP(p)}</span></div>`).join('');
  } else {
    rows=co.map((x,i)=>`<div class="rc-rrow ${medal[i]||''} ${x.id===my.kingdomId?'me':''}" data-action="view-country" data-id="${esc(x.id)}"><span class="rk">${i+1}</span><div class="rc-cflag">${kingdomFlag(x.id,30,'margin:0')}</div><div class="nm"><b>${esc(countryName(x.id))}</b><small>${plural(x.players,'player')} · Avg rating ${x.avgRating}</small></div><span class="dm">${metricC(x)}</span></div>`).join('');
  }
  const tiles=`<div class="rc-tiles">${sort==='dmg'?`<div class="rc-tile gold"><small>Weekly damages reset in</small><b>${countdown(weekResetsAt())}</b></div>`:''}<div class="rc-tile"><small>Your player rank</small><b>${myRank}</b></div><div class="rc-tile"><small>Your country rank</small><b>${myCoRank}</b></div></div>`;
  const empty = sort==='dmg' ? 'No damage dealt this week yet. Strike in a war to appear here.' : 'No players yet.';
  return head+chips+tiles+`<div class="rc-sec">${tab==='players'?'TOP PLAYERS':'TOP COUNTRIES'}</div>${rows||`<p class="faint">${empty}</p>`}`;
}

/* ---------------- Docked World Chat widget ---------------- */
// Persistent floating chat, present on every screen — this is now the
// single access point for general chat (no separate 'chat' nav tab).
let _chatFetchInFlight = false;
function chatNameColor(n){ let h=0; for(const ch of String(n||'')) h=(h*31+ch.charCodeAt(0))%360; return `hsl(${h},70%,72%)`; }
function chatMsgHtml(m){ // used by the new-message popup
  const ini = esc((m.senderName||'?').slice(0,2).toUpperCase());
  return `<div class="rc-msg"><div class="rc-av"><div class="av">${ini}</div><span class="lv">${m.senderLevel||1}</span><span class="fg">${kingdomFlag(m.senderKingdom,16,'margin:0;vertical-align:0')}</span></div><div class="bd"><b style="color:${chatNameColor(m.senderName)}">${esc(m.senderName)}</b><p>${esc(m.text)}</p></div></div>`;
}
const CHAT_ROLE_ICON = {Leader:'crown','Co-Leader':'shield',Officer:'star'};
function chatChannelNow(){ return (S.chatChannel==='country' && S.char && S.char.kingdomId) ? 'country' : 'global'; }
function chatClock(ts){ return new Date(Number(ts)||Date.now()).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
function chatMembers(){
  const kv=S.kingdomView; if(!kv||kv.mode!=='mine') return null;
  const t=Date.now();
  return kv.members.map(m=>Object.assign({}, m, {online: m.id===MY_ID || (t-Number(m.updatedAt||0)) < 5*60*1000}))
    .sort((a,b)=>(b.online-a.online)||(kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole))||((b.level||1)-(a.level||1)));
}
function chatBubbleHtml(m, first, roleOf){
  if(m.system) return `<div class="rc-sys">${esc(m.text)}</div>`;
  const mine = m.senderId ? m.senderId===MY_ID : m.senderName===S.char.username;
  const role = roleOf ? roleOf(m) : null;
  const txt = `<p>${esc(m.text)}</p>`;
  if(!first) return `<div class="rc-msg cont ${mine?'mine':''}"><div class="rc-sp"></div><div class="bd">${txt}</div></div>`;
  const ini = esc((m.senderName||'?').slice(0,2).toUpperCase());
  return `<div class="rc-msg ${mine?'mine':''}"><div class="rc-av" ${m.senderId?`data-action="view-player" data-id="${esc(m.senderId)}"`:''}><div class="av">${ini}</div><span class="lv">${m.senderLevel||1}</span><span class="fg">${kingdomFlag(m.senderKingdom,16,'margin:0;vertical-align:0')}</span></div>
    <div class="bd"><div class="who"><b style="color:${chatNameColor(m.senderName)}">${esc(m.senderName)}</b>${role&&CHAT_ROLE_ICON[role]?`<span class="rl">${icon(CHAT_ROLE_ICON[role])}</span>`:''}<time>${chatClock(m.ts)}</time></div>${txt}</div></div>`;
}
function chatListHtml(msgs, roleOf){
  let prev=null;
  const items = msgs.map(m=>{
    const key = m.senderId || m.senderName;
    const first = !prev || (prev.senderId||prev.senderName)!==key || (m.ts-prev.ts) > 5*60*1000;
    prev = m;
    return chatBubbleHtml(m, first, roleOf);
  });
  return items.reverse().join('');
}
function chatMembersPanel(){
  const list=chatMembers();
  if(!list) return `<div class="faint" style="padding:14px;">Loading citizens…</div>`;
  const row=m=>`<div class="rc-mrow" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer"><div class="rc-gav ${m.online?'on':''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i><u class="dot ${m.online?'on':''}"></u></div><div class="nm"><b>${esc(m.username)}</b><small>${esc(m.kingdomRole||'Recruit')}</small></div>${CHAT_ROLE_ICON[m.kingdomRole]?`<span class="rl">${icon(CHAT_ROLE_ICON[m.kingdomRole])}</span>`:''}</div>`;
  const on=list.filter(m=>m.online), off=list.filter(m=>!m.online);
  return `<div class="rc-mpanel"><div class="rc-sec" style="margin-top:4px">ONLINE — ${on.length}</div>${on.map(row).join('')||'<p class="faint">Nobody online.</p>'}${off.length?`<div class="rc-sec">OFFLINE — ${off.length}</div>${off.map(row).join('')}`:''}</div>`;
}
function renderChatWidget(){
  const c=S.char, hasCountry=!!(c&&c.kingdomId);
  const unreadG=S.chatUnread||0, unreadK=S.chatUnreadK||0, total=unreadG+unreadK;
  if(!S.chatWidgetOpen){
    return `<button class="chat-widget-toggle" data-action="chat-widget-toggle" title="Chat">${icon('chat')}${total?`<span class="chat-badge">${total>9?'9+':total}</span>`:''}</button>`;
  }
  const ch=chatChannelNow();
  let body='', sub='';
  if(ch==='global'){
    if(S.generalChat===null && !_chatFetchInFlight){ _chatFetchInFlight=true; loadGeneralChat().finally(()=>{ _chatFetchInFlight=false; }); }
    sub='Everyone, every country';
    body = S.generalChatUnavailable ? `<div class="faint" style="padding:12px;">Chat unavailable.</div>`
      : S.generalChat===null ? `<div class="faint" style="padding:12px;">Loading chat...</div>`
      : (chatListHtml(S.generalChat) || '<div class="faint" style="padding:12px;">No messages yet. Say hello.</div>');
  } else {
    const kv=S.kingdomView;
    if(!kv && !_kvChatFetch){ _kvChatFetch=true; loadKingdomView().finally(()=>{ _kvChatFetch=false; }); }
    const mem=chatMembers();
    const roleMap={}, lvlMap={}; (kv&&kv.members||[]).forEach(m=>{ roleMap[m.id]=m.kingdomRole; lvlMap[m.id]=m.level; });
    if(mem) sub=`${plural(mem.length,'citizen')} · ${mem.filter(m=>m.online).length} online`; else sub='Loading…';
    if(S.chatMembersOpen) body=chatMembersPanel();
    else if(!kv || kv.loading) body=`<div class="faint" style="padding:12px;">Loading country chat...</div>`;
    else if(kv.mode!=='mine') body=`<div class="faint" style="padding:12px;">Country chat unavailable.</div>`;
    else {
      const msgs=(kv.kingdom.chat||[]).map(m=>Object.assign({senderKingdom:c.kingdomId, senderLevel:lvlMap[m.senderId]||m.senderLevel||1}, m));
      body = chatListHtml(msgs, m=>roleMap[m.senderId]) || '<div class="faint" style="padding:12px;">No messages yet. Rally your country!</div>';
    }
  }
  const strip = ch==='country' && chatMembers() ? `<div class="rc-mstrip">${chatMembers().slice(0,8).map(m=>`<div class="rc-gav sm ${m.online?'on':''}" title="${esc(m.username)}" data-action="view-player" data-id="${esc(m.id)}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><u class="dot ${m.online?'on':''}"></u></div>`).join('')}<button class="rc-mmore ${S.chatMembersOpen?'on':''}" data-action="chat-members-toggle">${icon('users')} ${S.chatMembersOpen?'Back to chat':'All citizens'}</button></div>` : '';
  const title = ch==='country' ? `${kingdomFlag(c.kingdomId,18,'margin:0 8px 0 0;vertical-align:-3px')}${esc(countryName(c.kingdomId))}` : 'World Chat';
  return `
  <div class="chat-widget-panel rc-chatpanel">
    <div class="rc-ch-head"><div><b>${title}</b><small>${sub}</small></div><button class="chat-widget-close" data-action="chat-widget-toggle">&times;</button></div>
    <div class="rc-chat-tabs">
      <button class="${ch==='global'?'on':''}" data-action="chat-channel" data-ch="global">World${unreadG?`<i class="rc-dot">${unreadG>9?'9+':unreadG}</i>`:''}</button>
      <button class="${ch==='country'?'on':''}" data-action="chat-channel" data-ch="country" ${hasCountry?'':'disabled title="Join a country first"'}>${hasCountry?kingdomFlag(c.kingdomId,14,'margin:0 6px 0 0;vertical-align:-2px'):''}Country${unreadK?`<i class="rc-dot">${unreadK>9?'9+':unreadK}</i>`:''}</button>
    </div>
    ${strip}
    <div class="log ${S.chatMembersOpen&&ch==='country'?'plain':''}" id="world-chat-log">${body}</div>
    <div class="chat-widget-input-row" ${S.chatMembersOpen&&ch==='country'?'style="display:none"':''}>
      <input type="text" id="world-chat-input" maxlength="200" placeholder="${ch==='country'?'Message your country…':'Say something to the world…'}">
      <button class="btn btn-primary" data-action="chat-widget-send">Send</button>
    </div>
  </div>`;
}
let _kvChatFetch = false;

let _marketFetchInFlight = false;
function renderMarket(){
  const c = S.char;
  if(S.marketListings===null){
    if(!_marketFetchInFlight){ _marketFetchInFlight = true; loadMarketListings().finally(()=>{ _marketFetchInFlight = false; }); }
    return `${pageHero('Market','','market')}<div class="empty"><h3>Loading market...</h3></div>`;
  }
  if(S.marketUnavailable){
    return `
    ${pageHero('Market','','market')}
    <div class="panel empty">
      <h3>Shared storage unavailable</h3>
      <p class="faint">The player market needs real cross-player storage, which this view doesn't have access to. No fake listings are shown here.</p>
    </div>`;
  }

  const tabs = `<div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
    <button class="btn btn-sm ${S.marketTab==='browse'?'btn-primary':''}" data-action="market-tab" data-tab="browse">Browse</button>
    <button class="btn btn-sm ${S.marketTab==='sell'?'btn-primary':''}" data-action="market-tab" data-tab="sell">Sell</button>
    <button class="btn btn-sm ${S.marketTab==='mine'?'btn-primary':''}" data-action="market-tab" data-tab="mine">My Listings</button>
  </div>`;

  let body = '';
  if(S.marketTab==='browse'){
    const filters = ['all','resource','material','consumable','equipment'];
    const filterRow = `<div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">${filters.map(f=>`<button class="btn btn-sm ${S.marketFilter===f?'btn-accent':''}" data-action="market-filter" data-filter="${f}">${f==='all'?'All':MARKET_KIND_LABELS[f]}</button>`).join('')}</div>`;
    const listings = S.marketListings.filter(l=> S.marketFilter==='all' || l.kind===S.marketFilter);
    const cards = listings.map(l=>{
      const isMine = l.sellerId===MY_ID;
      return `<div class="zone-card">
        <div>
          <h4 style="font-size:14px;">${marketItemLabel(l)}</h4>
          <div class="lvl">Seller: ${kingdomFlag(l.sellerKingdom)}${esc(l.sellerName)} &middot; ${l.pricePerUnit}g${l.qty>1?' each':''} &middot; Total: ${fmtNum(l.totalPrice)}g</div>
        </div>
        <button class="btn btn-sm ${isMine?'':'btn-primary'}" data-action="buy-listing" data-id="${l.id}" ${isMine?'disabled title="This is your own listing"':''}>${isMine?'Yours':'Buy'}</button>
      </div>`;
    }).join('') || '<div class="panel empty"><h3>No listings</h3><p class="faint">Nothing here yet — check back later or list something yourself.</p></div>';
    body = filterRow + cards;
  } else if(S.marketTab==='sell'){
    const kinds = ['resource','material','consumable','equipment'];
    const kindRow = `<div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">${kinds.map(k=>`<button class="btn btn-sm ${S.marketSellKind===k?'btn-accent':''}" data-action="market-sell-kind" data-kind="${k}">${MARKET_KIND_LABELS[k]}</button>`).join('')}</div>`;
    const items = sellableByKind(c, S.marketSellKind);
    const options = items.map(i=>`<option value="${i.id}">${esc(i.name)} (have ${i.have})</option>`).join('') || '<option value="">Nothing available</option>';
    const showQty = S.marketSellKind!=='equipment';
    body = `${kindRow}
    <div class="panel">
      <div class="panel-title">List an item</div>
      ${items.length===0 ? '<p class="faint">You have nothing of this type to sell.</p>' : `
      <label class="field">Item</label>
      <select id="market-sell-item" style="width:100%; background:#171008; border:1px solid var(--border); color:var(--text); padding:11px 13px; border-radius:6px; font-size:14px; margin-bottom:12px;">${options}</select>
      ${showQty ? `<label class="field">Quantity</label><input type="text" id="market-sell-qty" value="1" style="margin-bottom:12px;">` : ''}
      <label class="field">${showQty?'Price per unit (gold)':'Price (gold)'}</label>
      <input type="text" id="market-sell-price" value="10" style="margin-bottom:14px;">
      <button class="btn btn-primary btn-block" data-action="market-create-listing">Create Listing</button>
      `}
    </div>`;
  } else {
    const mine = S.marketListings.filter(l=>l.sellerId===MY_ID);
    body = mine.map(l=>`<div class="zone-card">
      <div>
        <h4 style="font-size:14px;">${marketItemLabel(l)}</h4>
        <div class="lvl">${l.pricePerUnit}g${l.qty>1?' each':''} &middot; Total: ${fmtNum(l.totalPrice)}g</div>
      </div>
      <button class="btn btn-sm btn-danger" data-action="cancel-listing" data-id="${l.id}">Cancel</button>
    </div>`).join('') || '<div class="panel empty"><h3>No active listings</h3><p class="faint">Anything you list will show up here.</p></div>';
  }

  return `
  ${pageHero('Market','Buy and sell resources, materials, potions and gear with other players','market')}
  ${tabs}
  ${body}`;
}

function renderPvp(){
  const c = S.char;
  const now = Date.now();
  const protectedMs = (c.pvp.protectedUntil||0) - now;
  const tot = c.pvp.wins + c.pvp.losses;
  const head = `${pageHero('PvP Arena','Fight other players to climb the ladder','pvp')}
    <div class="rc-tiles" style="margin-top:12px">${statTile('Rating',Math.round(c.pvp.rating),'gold')}${statTile('Wins',c.pvp.wins,'green')}${statTile('Losses',c.pvp.losses)}${statTile('Win rate',tot?Math.round(c.pvp.wins/tot*100)+'%':'—')}</div>${leaguePanel(c.pvp.rating)}`;
  const msg=(ic,t,p,extra)=>`${head}<div class="rc-empty"><div class="ei">${icon(ic)}</div><h3>${t}</h3><p>${p}</p>${extra||''}</div>`;
  if(protectedMs > 0) return msg('shield','Under protection',"You're shielded from attack after your last loss.",`<div class="rc-big">${fmtMs(protectedMs)}</div>`);
  if(c.energyCur < PVP_ENERGY_COST) return msg('bolt','Not enough energy',`PvP battles cost ${PVP_ENERGY_COST} Energy. Wait for it to regenerate.`);
  if(!S.pvpCandidates) return msg('target','Ready to fight?',`Search for an opponent near your level and rating. Costs ${PVP_ENERGY_COST} Energy.`,'<button class="btn btn-primary" data-action="find-opponents">Find Opponent</button>');
  const cards = S.pvpCandidates.map((o,i)=>{
    const oc = o.class ? CLASSES[o.class] : null, rt=Math.round(o.pvp?.rating||1000), diff=rt-Math.round(c.pvp.rating);
    return `<div class="rc-opp"><div class="rc-gav" ${o.id&&!o.isBot?`data-action="view-player" data-id="${esc(o.id)}"`:''}><span>${esc((o.username||'?').slice(0,2).toUpperCase())}</span><i>${o.level}</i></div>
      <div class="nm"><b>${kingdomFlag(o.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(o.username)}</b><small>${oc?oc.name+' · ':''}${o.isBot?'Practice bot · no rating':leagueBadge(rt,14)+' Rating '+rt}</small></div>
      <span class="rc-diff ${diff>=0?'up':'down'}">${diff>=0?'+':''}${diff}</span>
      <button class="btn btn-primary btn-sm" data-action="fight-opponent" data-idx="${i}">Fight</button></div>`;
  }).join('');
  return `${head}<div class="rc-sec">MATCHED OPPONENTS</div>${cards}<button class="btn" style="margin-top:6px" data-action="find-opponents">Search Again</button>`;
}

/* ---------------- Combat screen ---------------- */
function renderCombat(){
  const cb = S.combat;
  if(!cb) return '';
  const me = cb.me, foe = cb.foe;
  const fighterBlock = (f, side)=>{
    const buffs = f.buffs.map(b=>`<span class="buff-chip">${b.tag} ${b.amount>0?'+':''}${b.amount} ${b.stat}</span>`).join('');
    return `<div class="fighter ${side}">
      <h4>${esc(f.label)}</h4>
      <div class="cls">${f.class?itemIcon(CLASSES[f.class].icon,14,'margin-right:3px;')+CLASSES[f.class].name+' &middot; Lv.'+f.level:'Lv.'+f.level+' Monster'}</div>
      <div class="sb-bar-label"><span>HP</span><span>${Math.max(0,Math.round(f.hp))}/${f.maxHp}</span></div>
      <div class="bar-track" style="margin-bottom:8px;"><div class="bar-fill bar-hp" style="width:${clamp(f.hp/f.maxHp*100,0,100)}%"></div></div>
      ${f.resourceMax>0?`<div class="sb-bar-label"><span>${f.resourceName}</span><span>${Math.round(f.resource)}/${f.resourceMax}</span></div>
      <div class="bar-track"><div class="bar-fill bar-mana" style="width:${clamp(f.resource/f.resourceMax*100,0,100)}%"></div></div>`:''}
      <div class="buff-row">${buffs}</div>
    </div>`;
  };
  let actionsHtml = '';
  if(cb.ended){
    const resultLabel = cb.result==='win' ? '<span class="badge-win">Victory</span>' : cb.result==='lose' ? '<span class="badge-loss">Defeat</span>' : cb.result==='flee' ? '<span class="badge-draw">Fled</span>' : '<span class="badge-draw">Draw</span>';
    actionsHtml = `
    <div class="panel" style="margin-top:14px;">
      <div class="panel-title">${resultLabel}</div>
      <div class="stat-list">
        ${cb.rewardLines.map(l=>`<div style="grid-column:1/-1;"><span>${l.label}</span><b>${l.value}</b></div>`).join('')}
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:14px;" data-action="close-combat">Continue</button>
    </div>`;
  } else {
    const consumables = S.char.inventory.filter(i=>i.kind==='consumable');
    const skillBtns = me.skills.map(s=>{
      const lvl = S.char.classSkills[s.id]||0;
      const afford = me.resource >= s.cost;
      return `<button class="btn act-btn" data-action="combat-skill" data-skill="${s.id}" ${afford?'':'disabled'}>
        <span class="n">${s.name}</span><span class="d">${s.cost} ${me.resourceName} &middot; Lv.${lvl}</span>
      </button>`;
    }).join('');
    const itemBtn = consumables.length ? `<button class="btn act-btn" data-action="combat-item-menu"><span class="n">Use Item</span><span class="d">${consumables.length} available</span></button>` : `<button class="btn act-btn" disabled><span class="n">Use Item</span><span class="d">None in bag</span></button>`;
    actionsHtml = `
    <div class="actions">
      <button class="btn act-btn btn-primary" data-action="combat-attack"><span class="n">Attack</span><span class="d">Basic strike</span></button>
      ${skillBtns}
      <button class="btn act-btn" data-action="combat-defend"><span class="n">Defend</span><span class="d">Reduce incoming damage</span></button>
      ${itemBtn}
      ${cb.mode==='pve' ? `<button class="btn act-btn btn-danger" data-action="combat-flee"><span class="n">Flee</span><span class="d">End the fight</span></button>` : ''}
    </div>
    ${S.showItemMenu ? `<div class="panel" style="margin-top:10px;">
      <div class="panel-title">Choose an item</div>
      ${consumables.map(it=>`<button class="btn btn-sm" style="margin:0 6px 6px 0;" data-action="combat-item" data-uid="${it.uid}">${it.name} (${it.qty})</button>`).join('')}
    </div>`:''}
    `;
  }
  return `
  ${pageHero(cb.mode==='pve'?(cb.boss?'Zone Boss':cb.elite?'Elite Hunt':'Battle'):'PvP Duel','Round '+cb.round+' of '+cb.maxRounds,'pvp')}
  <div class="arena">
    ${fighterBlock(me,'me')}
    <div class="vs">VS</div>
    ${fighterBlock(foe,'foe')}
  </div>
  <div class="log" id="combat-log">${cb.log.slice().reverse().map(l=>`<div class="log-line ${l.cls}">${esc(l.text)}</div>`).join('')}</div>
  ${actionsHtml}
  `;
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
function render(){
  applyColorScheme(S.char ? S.char.colorScheme : 'brass');
  const app = document.getElementById('app');
  if(S.screen==='loading'){
    app.innerHTML = `<div class="loader-wrap">
      <div class="loader-mark">${icon('crown','style="width:100%;height:100%;stroke:var(--brass)"')}</div>
      <p>ENTERING REALMCLASH MMO</p>
    </div>`;
    return;
  }
  if(S.screen==='login'){
    app.innerHTML = renderLogin();
    return;
  }
  if(S.screen==='create'){
    app.innerHTML = renderCreate();
    bindCreateEvents();
    return;
  }
  let body = '';
  if(S.screen==='home') body = renderHome();
  else if(S.screen==='world') body = renderWorld();
  else if(S.screen==='war-detail') body = renderWarDetail();
  else if(S.screen==='country-view') body = renderCountryView();
  else if(S.screen==='player-view') body = renderPlayerView();
  else if(S.screen==='rankings') body = renderGlobalRankings();
  else if(S.screen==='adventure') body = renderAdventure();
  else if(S.screen==='zone-detail') body = renderZoneDetail();
  else if(S.screen==='road') body = renderRoad();
  else if(S.screen==='combat') body = renderCombat();
  else if(S.screen==='pvp') body = renderPvp();
  else if(S.screen==='kingdom') body = renderKingdom();
  else if(S.screen==='market') body = renderMarket();
  else if(S.screen==='craft') body = renderCraft();
  else if(S.screen==='inventory') body = renderInventory();
  else if(S.screen==='profile') body = renderProfile();

  const navActive = (S.screen==='war-detail'||S.screen==='country-view'||S.screen==='player-view') ? 'world' : S.screen==='combat' ? (S.combat && S.combat.mode==='pvp' ? 'pvp':'adventure') : ((S.screen==='road'||S.screen==='zone-detail') ? 'adventure' : S.screen);
  // 'settings' no longer has its own nav slot — it lives under Profile's Settings tab.

  app.innerHTML = `
  <div class="app-shell">
    <div class="sidebar">
      <div class="brand">
        <div class="brand-mark">${icon('sword','style="width:100%;height:100%;stroke:#60a5fa"')}</div>
        <div class="brand-name">REALMCLASH</div>
      </div>
      <div class="navlist">${renderNav(navActive)}</div>
      <div class="nav-foot">LIVE WORLD · MMO STRATEGY</div>
    </div>
    <div class="main">
      ${renderStatusBar()}
      <div class="view">${body}</div>
    </div>
  </div>
  <div class="tabbar">${renderTabbar(navActive)}</div>
  ${S.char ? renderChatWidget() : ''}
  ${(S.chatPop && !S.chatWidgetOpen) ? `<button class="chat-pop" data-action="chat-widget-toggle">${chatMsgHtml(S.chatPop)}</button>` : ''}
  ${S.toast ? `<div class="toast">${esc(S.toast)}</div>` : ''}
  `;
  if(S.char){ startChatListener(); startKingdomChatListener(); }
  if(S.screen==='world'){
    const cs=document.getElementById('country-search');
    if(cs){
      cs.value = S.countrySearch || '';
      const apply=()=>{ const q=cs.value.trim().toLowerCase(); S.countrySearch=cs.value; let n=0;
        document.querySelectorAll('#rc-countries .rc-country').forEach(b=>{ const ok=!q||b.dataset.name.includes(q); b.style.display=ok?'':'none'; if(ok) n++; });
        const none=document.getElementById('country-none'); if(none) none.style.display=n?'none':''; };
      cs.addEventListener('input', apply); apply();
    }
  }
  if(S.chatWidgetOpen){
    const input = document.getElementById('world-chat-input');
    if(input){
      input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendChatCurrent(input.value); } });
    }
  }
  if(S.screen==='profile' && S.profileTab==='settings'){
    bindSettingsEvents();
  }
}

;
/* ---- js/main.js ---- */

/* ============================================================
   EVENT HANDLING
   ============================================================ */
function bindCreateEvents(){
  const input = document.getElementById('username-input');
  if(input){
    input.addEventListener('input', e=>{ S._create.username = e.target.value; });
  }
  const search = document.getElementById('country-search');
  if(search){
    search.addEventListener('input', e=>{
      S._create.countrySearch = e.target.value;
      document.getElementById('country-grid').innerHTML = renderCountryCards(S._create); // grid only, so the search box keeps focus
    });
  }
}

document.addEventListener('click', async (e)=>{
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const action = el.dataset.action;

  if(action==='pick-class'){ S._create.classId = el.dataset.class; render(); return; }
  if(action==='pick-country'){ S._create.countryId = el.dataset.country; render(); return; }
  if(action==='create-character'){
    const st = S._create;
    const uname = (st.username||'').replace(/[<>&"'`\\]/g,'').trim().slice(0,18);
    if(!st.classId || !st.countryId) return;
    if(uname.length < 3){ showToast('Username must be at least 3 characters.'); return; }
    if(await isUsernameTaken(uname)){ showToast('That username is already taken — pick another.'); return; }
    const ch = newCharacter(MY_ID, uname, st.classId);
    try{
      ch.kingdomRole = await claimKingdomSeat(st.countryId);
    }catch(e){ showToast('Could not join your country right now — try again.'); return; }
    ch.kingdomId = st.countryId; ch.kingdomJoinedAt = Date.now();
    S.char = ch; // no onboarding step — player lands straight on Home
    setScreen('home');
    // Awaited (unlike other saveCharacter calls) because this is the doc that
    // makes the character exist at all — if the cloud write fails here and
    // nobody notices, the player only has this character on THIS device/
    // browser until something else happens to trigger a retry, and re-opening
    // the game anywhere else drops them back into character creation.
    saveCharacter(S.char).then(cloudOk=>{
      if(HAS_DB && !cloudOk) showToast('Saved on this device, but the cloud save failed — reopening on another device may ask you to create a character again. Will keep retrying.');
    });
    return;
  }
  if(action==='google-signin'){ await linkGoogleAccount(); return; }
  if(action==='nav'){
    setScreen(el.dataset.screen);
    S.pvpCandidates = null;
    if(el.dataset.screen==='kingdom'){ loadKingdomView(); loadCountryState(true); }
    if(el.dataset.screen==='market'){ loadMarketListings(); checkMarketSales(); }
    if(el.dataset.screen==='pvp'){ checkPvpResults(); }
    if(el.dataset.screen==='world'){ loadWorldWars(true); }
    if(el.dataset.screen==='rankings'){ loadRankingsView(); }
    return;
  }

  if(action==='world-war'){ S.worldWarsSelected=el.dataset.id; setScreen('war-detail'); return; }
  if(action==='open-war-room'){ S.kingdomTab='war'; setScreen('kingdom'); loadKingdomView(); loadCountryState(); return; }
  if(action==='view-country'){
    const id=el.dataset.id;
    if(S.char && id===S.char.kingdomId){ S.kingdomTab='overview'; setScreen('kingdom'); return; }
    if(!['country-view','player-view'].includes(S.screen)) S.backScreen=S.screen;
    S.backCountry=false; S.viewCountryId=id; S.viewCountryTab='home'; S.chatWidgetOpen=false;
    setScreen('country-view'); loadCountryProfile(id); loadWorldWars(); return;
  }
  if(action==='view-player'){
    const id=el.dataset.id;
    if(!id) return;
    if(id===MY_ID){ setScreen('profile'); return; }
    if(!['country-view','player-view'].includes(S.screen)) S.backScreen=S.screen;
    S.backCountry = (S.screen==='country-view'); S.viewPlayerId=id; S.chatWidgetOpen=false;
    setScreen('player-view'); loadPlayerProfile(id); return;
  }
  if(action==='view-ctab'){ S.viewCountryTab=el.dataset.tab; render(); return; }
  if(action==='view-back'){
    if(S.screen==='player-view' && S.viewCountry && S.viewCountryId && S.backCountry){ S.backCountry=false; setScreen('country-view'); return; }
    setScreen(S.backScreen||'world'); return;
  }
  if(action==='rank-tab'){ S.rankTab=el.dataset.tab; S.rankSort=null; render(); return; }
  if(action==='rank-sort'){ S.rankSort=el.dataset.sort; render(); return; }
  if(action==='battle-tab'){ S.battleTab=el.dataset.tab; render(); return; }
  if(action==='battle-filter'){ S.battleFilter=el.dataset.f; render(); return; }
  if(action==='view-zone'){ S.zoneDetailId = el.dataset.zone; setScreen('zone-detail'); return; }
  if(action==='enter-zone'){ await startAdventureServer(el.dataset.zone, null, {returnScreen:'zone-detail'}); return; }
  if(action==='enter-zone-elite'){ await startAdventureServer(el.dataset.zone, 'elite', {returnScreen:'zone-detail'}); return; }
  if(action==='enter-zone-boss'){ await startAdventureServer(el.dataset.zone, 'boss', {returnScreen:'zone-detail'}); return; }
  if(action==='zone-road'){
    S.road = { zoneId: el.dataset.zone, log:[{text:'You set off down the road.', cls:''}], gained:{xp:0, gold:0, resources:{}} };
    setScreen('road');
    return;
  }
  if(action==='take-step'){ await takeStep(); return; }
  if(action==='road-leave'){ S.road = null; setScreen(S.zoneDetailId ? 'zone-detail' : 'adventure'); return; }
  if(action==='find-opponents'){
    showToast('Searching for an opponent...');
    S.pvpCandidates = await findOpponents(S.char);
    render();
    return;
  }
  if(action==='fight-opponent'){ await startPvp(S.pvpCandidates[Number(el.dataset.idx)]); return; }

  if(action==='join-kingdom'){ await joinKingdom(el.dataset.kingdom); return; }
  if(action==='leave-kingdom'){ await leaveKingdom(); return; }
  if(action==='claim-leadership'){ await claimLeadership(); return; }
  if(action==='donate-kingdom'){ await donateToKingdom(el.dataset.resource, Number(el.dataset.amount)); return; }
  if(action==='kingdom-member'){ await kingdomManageMember(el.dataset.id, el.dataset.op); return; }
  if(action==='make-leader'){
    if(!confirm(`Hand leadership of your country to ${el.dataset.name||'this citizen'}? You will become Co-Leader.`)) return;
    try{
      await callFn('transferLeadership', {targetId: el.dataset.id});
      const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; }
      showToast('Leadership transferred.');
    }catch(e){ showToast(warErrorMsg(e)); }
    loadKingdomView(); return;
  }
  if(action==='claim-daily'){
    try{
      const r = await callFn('claimDailyReward', {});
      const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; }
      showToast(`Daily reward: +${r.gold} gold, +${r.energy} energy (day ${r.streak}/${r.maxStreak}).`);
    }catch(e){ showToast(warErrorMsg(e)); }
    render(); return;
  }
  if(action==='chat-widget-toggle'){
    S.chatWidgetOpen = !S.chatWidgetOpen;
    if(S.chatWidgetOpen){
      if(S.chatPop && S.chatPop.channel==='country') S.chatChannel = 'country';
      else if(!S.chatUnread && S.chatUnreadK) S.chatChannel = 'country';
      S.chatPop = null; S.chatMembersOpen = false;
      if(chatChannelNow()==='country') S.chatUnreadK = 0; else S.chatUnread = 0;
    }
    if(S.chatWidgetOpen && S.generalChat===null) loadGeneralChat();
    render();
    return;
  }
  if(action==='chat-widget-send'){
    const input = document.getElementById('world-chat-input');
    await sendChatCurrent(input ? input.value : '');
    return;
  }
  if(action==='chat-channel'){
    S.chatChannel = el.dataset.ch==='country' ? 'country' : 'global'; S.chatMembersOpen = false;
    if(S.chatChannel==='country') S.chatUnreadK = 0; else S.chatUnread = 0;
    render(); return;
  }
  if(action==='chat-members-toggle'){ S.chatMembersOpen = !S.chatMembersOpen; render(); return; }

  if(action==='kingdom-tab'){
    S.kingdomTab = el.dataset.tab;
    if(S.kingdomTab==='economy' || S.kingdomTab==='war'){ loadCountryState(); return; }
    if(S.kingdomTab==='overview'){ loadCountryState(true); }
    render(); return;
  }
  if(action==='country-refresh'){ await loadCountryState(); return; }
  if(action==='spec-pick'){
    const r = el.dataset.resource, st = S.countryState && S.countryState.data;
    const cur = (S._specPick || (st && st.naturalResources) || []).slice();
    const i = cur.indexOf(r);
    if(i >= 0) cur.splice(i,1); else { cur.push(r); if(cur.length > 2) cur.shift(); }
    S._specPick = cur; render(); return;
  }
  if(action==='spec-confirm'){
    if(!S._specPick || S._specPick.length !== 2) return;
    try{
      await callFn('setCountrySpecialities', {resources: S._specPick});
      showToast('Country specialities updated.');
    }catch(e){ showToast(warErrorMsg(e)); }
    S._specPick = null;
    await loadCountryState(true); return;
  }
  if(action==='reward-pick'){ S._rewardPick = el.dataset.resource; render(); return; }
  if(action==='reward-confirm'){
    if(!S._rewardPick) return;
    try{
      const rEl=document.getElementById('reward-rate'), rate=rEl?Number(rEl.value):(S._rewardRate||undefined);
      await callFn('chooseWarReward', {warId: el.dataset.war, resourceId: S._rewardPick, rate});
      showToast('War Tax set at '+(rate||'default ')+'%. It lasts 14 days.');
    }catch(e){ showToast(warErrorMsg(e)); }
    S._rewardPick = null; S._rewardRate = null;
    await loadCountryState(true); return;
  }
  if(action==='declare-war'){
    const target = S._warTarget;
    if(!target){ showToast('Choose a country first.'); return; }
    try{
      await callFn('declareWar', {targetCountryId: target});
      showToast('War declared.');
    }catch(e){ showToast(warErrorMsg(e)); }
    await loadCountryState(true); return;
  }
  if(action==='war-strike'){
    try{
      const r = await callFn('warStrike');
      S.char.energyCur = r.energyCur; S.char.lastEnergyAt = r.lastEnergyAt;
      showToast(`You hit ${r.target.name} (Lv.${r.target.level}) for ${fmtNum(r.damage)} war damage.`);
    }catch(e){ showToast(warErrorMsg(e)); }
    await loadCountryState(true); return;
  }
  if(action==='market-tab'){ S.marketTab = el.dataset.tab; render(); return; }
  if(action==='profile-tab'){ S.profileTab = el.dataset.tab; render(); return; }
  if(action==='market-filter'){ S.marketFilter = el.dataset.filter; render(); return; }
  if(action==='market-sell-kind'){ S.marketSellKind = el.dataset.kind; render(); return; }
  if(action==='market-create-listing'){
    const itemSel = document.getElementById('market-sell-item');
    const qtyInput = document.getElementById('market-sell-qty');
    const priceInput = document.getElementById('market-sell-price');
    if(!itemSel || !itemSel.value){ showToast('Nothing to list.'); return; }
    const qty = qtyInput ? parseInt(qtyInput.value,10) : 1;
    const price = priceInput ? parseInt(priceInput.value,10) : 0;
    await createListing(S.marketSellKind, itemSel.value, qty, price);
    return;
  }
  if(action==='buy-listing'){ await buyListing(el.dataset.id); return; }
  if(action==='cancel-listing'){ await cancelListing(el.dataset.id); return; }

  if(action==='combat-attack'){ await (isServerCombat()?resolveCombatRoundServer({kind:'attack'}):resolveRound({kind:'attack'})); return; }
  if(action==='combat-defend'){ await (isServerCombat()?resolveCombatRoundServer({kind:'defend'}):resolveRound({kind:'defend'})); return; }
  if(action==='combat-flee'){ await (isServerCombat()?resolveCombatRoundServer({kind:'flee'}):resolveFlee()); return; }
  if(action==='combat-skill'){
    if(!S.combat) return;
    const s = S.combat.me.skills.find(x=>x.id===el.dataset.skill);
    if(isServerCombat()) await resolveCombatRoundServer({kind:'skill', skillId:s.id});
    else await resolveRound({kind:'skill', skill:s, skillLevel:S.char.classSkills[s.id]||0});
    return;
  }
  if(action==='combat-item-menu'){ S.showItemMenu = !S.showItemMenu; render(); return; }
  if(action==='combat-item'){
    if(isServerCombat()){
      // The server owns the item — it validates ownership, consumes it, and applies
      // its effect (heal or Energy) atomically as part of resolving this round. The
      // client no longer mutates S.char.inventory/energyCur for this directly.
      S.showItemMenu = false;
      await resolveCombatRoundServer({kind:'item', itemUid: el.dataset.uid});
      return;
    }
    const it = S.char.inventory.find(x=>x.uid===el.dataset.uid);
    if(it){
      // Energy isn't part of the in-combat "fighter" model (only HP/class-resource are),
      // so an Energy Potion's effect is applied straight to the character here, capped at
      // Max Energy and without touching lastEnergyAt (so offline regen math stays correct).
      if(it.effect && it.effect.energy){
        const eff = effectiveStats(S.char);
        S.char.energyCur = clamp(S.char.energyCur + it.effect.energy, 0, eff.maxEnergy);
      }
      // Consume exactly one use of the item so potions can't be reused for free.
      it.qty = (it.qty||1) - 1;
      if(it.qty <= 0) S.char.inventory = S.char.inventory.filter(x=>x.uid!==it.uid);
      await resolveRound({kind:'item', item:it});
      S.showItemMenu=false;
    }
    return;
  }
  if(action==='close-combat'){ await finishCombat(); return; }

  if(action==='equip'){ equipItem(el.dataset.uid); await persist(); return; }
  if(action==='unequip'){ unequipSlot(el.dataset.slot); await persist(); return; }
  if(action==='upgrade-item'){ upgradeItem(el.dataset.uid); await persist(); return; }
  if(action==='sell'){ sellItem(el.dataset.uid); await persist(); return; }
  if(action==='use-item'){ useItemOutOfCombat(el.dataset.uid); await persist(); return; }
  if(action==='craft'){ await craftRecipe(el.dataset.recipe, (S.craftQty&&S.craftQty[el.dataset.recipe])||1); await persist(); return; }
  if(action==='craft-qty-inc'){
    S.craftQty = S.craftQty || {};
    const r = RECIPES.find(x=>x.id===el.dataset.recipe);
    const max = Math.max(1, maxCraftable(S.char, r));
    S.craftQty[el.dataset.recipe] = clamp((S.craftQty[el.dataset.recipe]||1)+1, 1, max);
    render(); return;
  }
  if(action==='craft-qty-dec'){
    S.craftQty = S.craftQty || {};
    S.craftQty[el.dataset.recipe] = clamp((S.craftQty[el.dataset.recipe]||1)-1, 1, 999);
    render(); return;
  }

  if(action==='buy-general'){ buyGeneralSkill(el.dataset.skill); await persist(); return; }
  if(action==='buy-class-skill'){ buyClassSkill(el.dataset.skill); await persist(); return; }
  if(action==='reset-skills'){ resetClassSkills(); await persist(); return; }
  if(action==='set-color-scheme'){
    S.char.colorScheme = el.dataset.color;
    await persist();
    return;
  }
  if(action==='update-username'){
    const uname = (S._settingsUsername||'').replace(/[<>&"'`\\]/g,'').trim().slice(0,18);
    if(uname.length < 3){ showToast('Username must be at least 3 characters.'); return; }
    if(uname === S.char.username){ showToast('That\'s already your username.'); return; }
    if(await isUsernameTaken(uname)){ showToast('That username is already taken — pick another.'); return; }
    S.char.username = uname;
    S._settingsUsername = uname;
    showToast('Username updated.');
    await persist();
    return;
  }
  if(action==='reset-character'){
    if(confirm('Delete this character permanently?')){
      try{ localStorage.removeItem(LS_KEY_PREFIX+'char_'+MY_ID); }catch(err){}
      if(HAS_DB){ try{ await withTimeout(DB.doc('players/'+MY_ID).delete(), 5000); }catch(err){} }
      S.char = null; S._create=null; S._settingsUsername=null;
      setScreen('create');
    }
    return;
  }
});

function notEnoughEnergyMsg(c, eff, required){
  return `Not enough Energy. ${required} required, ${Math.floor(c.energyCur)} available (+${energyRegenPerHour(eff.maxEnergy)}/hour).`;
}

/* ---------------- Adventure / PvE flow ---------------- */
async function startPve(zoneId, kind, opts){
  opts = opts || {};
  const c = S.char;
  const eff = effectiveStats(c);
  applyRegen(c);
  const zone = ZONES.find(z=>z.id===zoneId);
  const isBoss = kind==='boss', isElite = kind==='elite';
  const energyCost = opts.skipEnergyCost ? 0 : (isBoss ? BOSS_ENERGY_COST : isElite ? 20 : 10);
  if(c.energyCur < energyCost){ showToast(notEnoughEnergyMsg(c, eff, energyCost)); render(); return; }
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

function isServerCombat(){ return !!(S.combat && S.combat.serverMode); }

// Server-authoritative entry point for the Adventure screen's Explore / Elite Hunt /
// Zone Boss buttons. Energy validation, monster spawning and (once the fight ends)
// all rewards are computed by the startAdventure/resolveCombatRound Cloud Functions —
// this function only displays what the server returns. Road's own monster encounters
// still use the local startPve() above; that path isn't migrated yet.
async function startAdventureServer(zoneId, kind, opts){
  opts = opts || {};
  let res;
  try{
    res = await callFn('startAdventure', {zoneId, kind});
  }catch(e){
    if(e.message==='NOT_ENOUGH_ENERGY'){
      showToast(`Not enough Energy.\nRequired: ${e.details.required}\nAvailable: ${e.details.available}\nRegeneration: +${e.details.perHour} Max Energy/hour`);
    } else if(e.message==='COOLDOWN_ACTIVE'){
      showToast(`Still recovering. Try again in ${fmtMs(e.details.msRemaining)}.`);
    } else {
      showToast('Could not start the fight — please try again.');
    }
    render();
    return;
  }
  S.char.energyCur = res.energyCur;
  S.char.lastEnergyAt = res.lastEnergyAt;
  const zone = ZONES.find(z=>z.id===zoneId);
  S.combat = {
    serverMode: true, sessionId: res.sessionId,
    mode:'pve', zone, elite: kind==='elite', boss: kind==='boss',
    me: res.me, foe: res.foe, round: res.round, maxRounds: res.maxRounds,
    log: res.log, ended:false, result:null, rewardLines:[],
    returnScreen: opts.returnScreen || 'adventure',
  };
  setScreen('combat');
}

// Sends the player's chosen action for the current server-authoritative round and
// renders whatever the server returns. When the fight ends, the local character is
// re-fetched from Firestore rather than trusting any locally-predicted state (spec
// requirement: the client must display authoritative results, not local guesses).
async function resolveCombatRoundServer(action){
  const cb = S.combat;
  if(!cb || cb.ended) return;
  let res;
  try{
    res = await callFn('resolveCombatRound', {sessionId: cb.sessionId, action});
  }catch(e){
    showToast(e.message==='NOT_ENOUGH_RESOURCE' ? 'Not enough resource for that skill.' : 'That action failed — please try again.');
    return;
  }
  cb.log.push(...res.logs);
  cb.me = res.me; cb.foe = res.foe;
  if(res.round) cb.round = res.round;
  if(res.ended){
    cb.ended = true; cb.result = res.result; cb.rewardLines = res.rewardLines;
    const fresh = await loadCharacter();
    if(fresh){ migrateCharacter(fresh); S.char = fresh; }
  }
  render();
  const logEl = document.getElementById('combat-log');
  if(logEl) logEl.scrollTop = 0;
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
  // The step (energy, event roll, rewards, country tax on resources) is resolved by the
  // takeRoadStep Cloud Function; this function only displays what the server returns.
  let res;
  try{
    res = await callFn('takeRoadStep', {zoneId: road.zoneId});
  }catch(e){
    if(e.message==='NOT_ENOUGH_ENERGY') showToast(`Not enough Energy. ${e.details.required} required, ${e.details.available} available (+${e.details.perHour}/hour).`);
    else showToast('Could not take that step — please try again.');
    render(); return;
  }
  c.energyCur = res.energyCur; c.lastEnergyAt = res.lastEnergyAt;
  const ev = res.event;
  if(ev==='flavor'){
    road.log.push({text: pick(FLAVOR_TEXTS), cls:''});
  } else if(ev==='gold'){
    c.gold += res.gold; road.gained.gold += res.gold;
    road.log.push({text:`You spot a few coins in the dirt. +${res.gold} Gold.`, cls:'good'});
  } else if(ev==='resource'){
    const r = res.resource;
    c.resourceBag[r] = (c.resourceBag[r]||0) + res.amount;
    road.gained.resources[r] = (road.gained.resources[r]||0) + res.amount;
    const taxed = res.gross - res.amount;
    road.log.push({text:`You gather ${res.amount} ${RESOURCE_NAMES[r]} along the way.${taxed>0 ? ` (${taxed} went to your country as tax)` : ''}`, cls:'good'});
  } else if(ev==='xp'){
    road.gained.xp += res.xp;
    road.log.push({text:`Something about the walk teaches you a little. +${res.xp} XP.`, cls:'good'});
    (res.levelLines||[]).forEach(l=> road.log.push({text:l, cls:'good'}));
    const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; }
  } else if(ev==='item'){
    road.log.push({text: res.item ? `You find a discarded ${res.item.name} by the roadside.` : 'You spot something shiny, but your bag is full.', cls: res.item ? 'good' : ''});
    if(res.item){ const fresh = await loadCharacter(); if(fresh){ migrateCharacter(fresh); S.char = fresh; } }
  } else if(ev==='monster'){
    road.log.push({text:'Something rustles in the brush ahead...', cls:'hit'});
    const zone = ZONES.find(z=>z.id===road.zoneId), mo = res.monster;
    S.combat = {
      serverMode: true, sessionId: mo.sessionId, mode:'pve', zone, elite:false, boss:false,
      me: mo.me, foe: mo.foe, round: mo.round, maxRounds: mo.maxRounds,
      log: mo.log, ended:false, result:null, rewardLines:[], returnScreen:'road',
    };
    setScreen('combat');
    return;
  }
  render(); // no local save: the server already persisted this step
}

async function startPvp(opponentData){
  const c = S.char;
  const eff = effectiveStats(c);
  applyRegen(c);
  if(c.energyCur < PVP_ENERGY_COST){ showToast(notEnoughEnergyMsg(c, eff, PVP_ENERGY_COST)); render(); return; }
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
    const opp = cb.opponentData, isBot = !!opp.isBot;
    const myRating = c.pvp.rating;
    const oppRating = opp.pvp ? opp.pvp.rating : 1000;
    // Practice bots never move the ladder: no rating, no win/loss record, no protection shield.
    const chg = isBot ? { delta:0, newRating:myRating } : pvpRatingChange(myRating, oppRating, result);
    const leagueBefore = leagueOf(myRating), leagueAfter = leagueOf(chg.newRating);
    c.pvp.rating = chg.newRating;
    if(!isBot){
      if(result==='win') c.pvp.wins++;
      if(result==='lose'){ c.pvp.losses++; c.pvp.protectedUntil = Date.now() + PVP_PROTECTION_MS; }
    }
    let xpGain = 0, goldChange = 0;
    if(result==='win'){
      const mult = isBot ? PVP_BOT_REWARD_MULT : 1;
      xpGain = Math.round(rnd(10,18)*opp.level*mult); goldChange = Math.round(rnd(8,16)*opp.level*mult);
      c.xp += xpGain; c.gold += goldChange;
    }
    cb.rewardLines = [
      {label:'Result', value: result==='win'?'Victory':result==='lose'?'Defeat':'Draw'},
      {label:'Rating change', value: isBot ? 'Practice bot — no rating' : (chg.delta>=0?'+':'')+chg.delta+' &rarr; '+Math.round(chg.newRating)},
      {label:'XP gained', value:'+'+xpGain},
      {label:'Gold change', value: (goldChange>=0?'+':'')+goldChange},
      {label:'Rounds', value: String(cb.round-1)},
    ];
    if(leagueAfter.id !== leagueBefore.id) cb.rewardLines.push({label:'League', value: (leagueAfter.min > leagueBefore.min ? 'Promoted to ' : 'Dropped to ') + leagueAfter.name});
    if(result==='lose' && !isBot) cb.rewardLines.push({label:'Protection', value:'5:00 shield granted'});
    if(result==='win') await checkLevelUps(c, cb.rewardLines);

    // Tell a real opponent what happened. We never edit THEIR character (their own device would overwrite it
    // with its older copy); we leave a small notice in their own mailbox and their game applies it when it
    // next opens (checkPvpResults) — same idea as the market's "your listing sold" notices.
    if(HAS_DB && opp.id && !isBot){
      const theirResult = result==='win' ? 'lose' : result==='lose' ? 'win' : 'draw';
      const theirDelta = pvpRatingChange(oppRating, myRating, theirResult).delta;
      DB.collection('rc_players').doc(opp.id).collection('pvpResults')
        .add({ ts: Date.now(), fromName: c.username, result: theirResult, delta: theirDelta })
        .catch(()=>{ /* best effort: it doesn't change what this player sees */ });
    }
  }
  render(); // show the result immediately — don't wait on any network write
  saveCharacter(c); // fire-and-forget
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
    // HP/Mana refill on level-up is intentional (a full-health "fresh start" at the new
    // level). Energy is intentionally NOT refilled here — Energy is the game's core
    // resource economy and must only ever change via combat/regen/potions, never as a
    // level-up side effect (see spec: "Level Up must NOT refill Energy").
    c.hpCur = eff.maxHp; c.manaCur = eff.maxMana;
    c.energyCur = clamp(c.energyCur, 0, eff.maxEnergy);
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
  applyRegen(c); // fresh Energy value before an Energy Potion caps against maxEnergy
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
  let max = Infinity;
  Object.entries(r.inputs).forEach(([k,v])=>{ max = Math.min(max, Math.floor((c.resourceBag[k]||0)/v)); });
  if(r.energy) max = Math.min(max, Math.floor(c.energyCur/r.energy));
  return Math.max(0, Number.isFinite(max) ? max : 0);
}
async function craftRecipe(recipeId, qty){
  const c = S.char;
  // Recompute Energy from elapsed time first, so the check below (and the deduction
  // that follows) both use the authoritative, up-to-date value — not a stale one from
  // whenever the crafting screen last rendered.
  applyRegen(c);
  const r = RECIPES.find(x=>x.id===recipeId);
  if(!r) return;
  const eff = effectiveStats(c);
  const max = maxCraftable(c, r);
  qty = clamp(Math.floor(qty||1), 1, Math.max(1,max));
  if(max <= 0){
    if(r.energy && c.energyCur < r.energy){ showToast(notEnoughEnergyMsg(c, eff, r.energy)); return; }
    showToast('Not enough resources.'); return;
  }
  // Bag capacity only actually matters when the output needs a brand-new slot: equipment
  // never stacks, but a material/consumable that already has a stack in the bag (or is
  // being crafted for the first time with room to spare) doesn't need one. Reject the
  // craft only when a new slot is genuinely required and none is free.
  const existing = r.out.kind!=='equipment' ? c.inventory.find(i=>i.kind===r.out.kind && i.id===r.out.id) : null;
  const needsNewSlot = !existing;
  if(needsNewSlot && bagCount(c) >= BAG_CAPACITY){ showToast('Bag is full.'); return; }
  // Atomic from the player's perspective: resources and Energy were both already
  // verified affordable via maxCraftable() above before anything here is deducted,
  // and the total Energy cost (r.energy * qty) is taken exactly once.
  Object.entries(r.inputs).forEach(([k,v])=>{ c.resourceBag[k] -= v*qty; });
  if(r.energy){ c.energyCur = clamp(c.energyCur - r.energy*qty, 0, eff.maxEnergy); }
  if(existing){ existing.qty = (existing.qty||1)+qty; }
  else { c.inventory.push(Object.assign({uid:uid(), qty}, r.out)); }
  if(r.xp){
    c.xp += r.xp*qty;
    const lvlLines = [];
    await checkLevelUps(c, lvlLines);
    lvlLines.forEach(l=> showToast(l.value));
  }
  showToast(`Crafted ${qty}x ${r.out.name}${r.xp?` (+${r.xp*qty} XP)`:''}.`);
}

/* ---------------- Skills ---------------- */
function buyGeneralSkill(skillId){
  const c = S.char;
  const lvl = c.generalSkills[skillId];
  if(lvl>=GENERAL_SKILL_MAX) return;
  const cost = generalSkillCost(lvl);
  if(c.skillPoints < cost) return;
  c.skillPoints -= cost;
  c.generalSkills[skillId] += 1;
  const eff = effectiveStats(c);
  c.hpCur = clamp(c.hpCur, 0, eff.maxHp);
  showToast('Skill improved.');
}
function buyClassSkill(skillId){
  const c = S.char;
  const lvl = c.classSkills[skillId];
  if(lvl>=MAX_SKILL_LEVEL) return;
  const cost = SKILL_UPGRADE_COST[lvl];
  if(c.skillPoints < cost) return;
  c.skillPoints -= cost;
  c.classSkills[skillId] += 1;
  showToast('Skill upgraded.');
}
function resetClassSkills(){
  const c = S.char;
  let refund = 0;
  Object.keys(c.classSkills).forEach(id=>{
    const lvl = c.classSkills[id];
    for(let i=0;i<lvl;i++) refund += SKILL_UPGRADE_COST[i];
    c.classSkills[id] = 0;
  });
  c.skillPoints += refund;
  showToast('Class skills reset.');
}

/* ============================================================
   BOOT
   ============================================================ */
function migrateCharacter(c){
  if(!c.colorScheme) c.colorScheme = 'brass';
  if(!c.bossCooldowns) c.bossCooldowns = {};
  if(c.kingdomId===undefined) c.kingdomId = null;
  if(c.kingdomRole===undefined) c.kingdomRole = null;
  if(c.kingdomJoinedAt===undefined) c.kingdomJoinedAt = 0;
  if(c.kingdomCooldownUntil===undefined) c.kingdomCooldownUntil = 0;
  if(c.kingdomId && !KINGDOMS.some(k=>k.id===c.kingdomId)){ c.kingdomId = null; c.kingdomRole = null; c.kingdomJoinedAt = 0; } // old continent kingdoms no longer exist
  if(typeof c.skillPoints !== 'number' || isNaN(c.skillPoints)) c.skillPoints = 0;
  // Skill points are only ever earned 1 per level (level-1 total), so anything missing from
  // (unspent + spent) is points a level-up failed to credit — hand them back.
  const spentPts = Object.values(c.classSkills||{}).reduce((a,l)=>{ for(let i=0;i<l;i++) a += SKILL_UPGRADE_COST[i]||0; return a; },0)
                 + Object.values(c.generalSkills||{}).reduce((a,l)=>{ for(let i=0;i<l;i++) a += GENERAL_SKILL_UPGRADE_COST[i]||0; return a; },0);
  const owedPts = (c.level-1) - spentPts - c.skillPoints;
  if(owedPts > 0) c.skillPoints += owedPts;
  if(!c.resourceBag) c.resourceBag = {};
  Object.keys({wood:0,stone:0,food:0,coal:0,iron:0,ore:0,herbs:0,leather:0,frost:0,voidessence:0}).forEach(k=>{
    if(typeof c.resourceBag[k] !== 'number') c.resourceBag[k] = 0;
  });
  return c;
}
async function boot(){
  try{
    await initCapabilities();
    if(HAS_DB && !FB_USER_EMAIL){
      setScreen('login');
      return;
    }
    const existing = await loadCharacter();
    if(existing){
      S.char = migrateCharacter(existing);
      applyRegen(S.char);
      await saveCharacter(S.char);
    }
  }catch(e){
    // Whatever went wrong (capability hiccup, corrupted save, etc.), never leave
    // the player stuck on the loading screen — fall back to a fresh local guest run.
    S.char = null;
  }
  setScreen(S.char ? 'home' : 'create');
  if(S.char){ checkMarketSales(); checkPvpResults(); } // don't block boot on these — they just surface toasts once they resolve
  setInterval(()=>{
    if(S.char && S.screen!=='combat' && S.screen!=='kingdom' && S.screen!=='market'){ applyRegen(S.char); render(); }
  }, 20000);
}
render();
boot();
// Absolute last resort: if something outside boot()'s own try/catch still hangs
// (e.g. a capability promise that neither resolves, rejects, nor respects our
// timeout), never leave the player staring at the loading screen forever.
setTimeout(()=>{ if(S.screen==='loading') setScreen(S.char ? 'home' : 'create'); }, 9000);


/* ---------------- Country war: helpers ---------------- */
function warErrorMsg(e){
  const d = e.details || {};
  switch(e.message){
    case 'NOT_LEADER': return 'Only the Leader of the right country can do that.';
    case 'TARGET_NOT_CITIZEN': return 'That player is not a citizen of your country.';
    case 'ALREADY_CLAIMED': return d.msRemaining ? `Already claimed today. Come back in ${Math.ceil(d.msRemaining/3600000)}h.` : 'Already claimed today.';
    case 'NOT_ENOUGH_ENERGY': return `Not enough Energy. ${d.required} required, ${d.available} available.`;
    case 'COOLDOWN_ACTIVE': return d.msRemaining ? `Not ready yet — wait ${Math.ceil(d.msRemaining/1000)}s.` : 'Your country is still in its post-war cooldown.';
    case 'TARGET_COOLDOWN': return 'That country is still recovering from its last war.';
    case 'TARGET_PROTECTED': return 'That country is under war-tax protection and cannot be attacked yet.';
    case 'TARGET_AT_WAR': return 'That country is already at war.';
    case 'ALREADY_AT_WAR': return 'Your country is already at war.';
    case 'NOT_ENOUGH_MEMBERS': return `Both countries need at least ${d.required} citizens.`;
    case 'STRIKE_LIMIT': return `You reached the strike limit for this round (${d.max}).`;
    case 'TARGETS_EXHAUSTED': return 'You already hit every available enemy the maximum number of times this round.';
    case 'NO_TARGET_AVAILABLE': return 'The enemy has no one to fight right now.';
    case 'ROUND_ENDED': case 'ROUND_CHANGED': case 'WAR_ENDED': return 'That round just ended — refreshing.';
    case 'WAR_NOT_STARTED': return 'The war has not started yet.';
    case 'REWARD_EXPIRED': return 'The time to choose a resource has run out.';
    case 'REWARD_NOT_AVAILABLE': return 'There is no reward to choose right now.';
    case 'INVALID_RESOURCE': return 'That resource cannot be taxed.';
    case 'INVALID_SPECIALITIES': return 'Pick exactly 2 different resources.';
    case 'SPECIALITIES_UNCHANGED': return 'Those are already your specialities.';
    case 'SPECIALITY_COOLDOWN': return d.msRemaining ? `You can change specialities again in ${Math.ceil(d.msRemaining/3600000)}h.` : 'You changed specialities recently.';
    case 'INVALID_RATE': return `The tax rate must be a whole number between ${d.min}% and ${d.max}%.`;
    default: return 'That action failed — please try again.';
  }
}
document.addEventListener('change', e=>{
  if(e.target && e.target.id==='war-target') S._warTarget = e.target.value;
});
// Countdowns follow SERVER time (S.serverOffset). When one reaches zero, or every 30s while a war is open, re-ask the server.
let _countryPoll = {last:0};
setInterval(()=>{
  const off = S.serverOffset||0, nowSrv = Date.now()+off;
  let expired = false;
  document.querySelectorAll('[data-countdown]').forEach(n=>{
    const left = Number(n.dataset.countdown) - nowSrv;
    n.textContent = fmtClock(left);
    if(left<=0) expired = true;
  });
  const cs = S.countryState;
  const onTab = S.screen==='kingdom' && (S.kingdomTab==='war' || S.kingdomTab==='economy' || S.kingdomTab==='overview' || !S.kingdomTab);
  if(!onTab || !cs || cs.status==='loading') return;
  const waiting = cs.data && cs.data.activeWar;
  const t = Date.now();
  if((expired && t-_countryPoll.last > 3000) || (waiting && t-_countryPoll.last > 30000)){
    _countryPoll.last = t;
    loadCountryState(true);
  }
}, 1000);
