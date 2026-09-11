/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Game Engine
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'souq-ledger-state-v7';
const SAVE_INTERVAL_MS = 5000;
const TICK_MS = 1000;
const ENERGY_REGEN_MS = 5*60*1000;
const HEALTH_REGEN_MS = 30*1000;
const PRICE_TICK_MS = 15000;
const MISSION_PERIOD_MS = 24*60*60*1000;
const PRESTIGE_LEVEL_REQ = 20;
const GEAR_BAG_LIMIT = 40;
const PRICE_HISTORY_LENGTH = 12;

// Resource icons are self-contained inline SVG images (base64 data URIs, flat icons8-style ore art) — no network calls.
function resIcon(b64svg, alt){
  return `<img class="res-icon" src="data:image/svg+xml;base64,${b64svg}" alt="${alt}">`;
}
// ─── Game Data: Resources, Goods, Recipes, Zones, Classes, Gear ───
const RESOURCES = {
  wood: { name:'Wood', icon:`<img class="res-icon" src="${ICONS.resource_wood}" alt="Wood">`, basePrice:4 },
  stone: { name:'Stone', icon:`<img class="res-icon" src="${ICONS.resource_stone}" alt="Stone">`, basePrice:5 },
  food: { name:'Food', icon:`<img class="res-icon" src="${ICONS.resource_food}" alt="Food">`, basePrice:3 },
  coal: { name:'Coal', icon:`<img class="res-icon" src="${ICONS.resource_coal}" alt="Coal">`, basePrice:6 },
  iron: { name:'Iron', icon:`<img class="res-icon" src="${ICONS.resource_iron}" alt="Iron">`, basePrice:8 },
  gold: { name:'Gold', icon:`<img class="res-icon" src="${ICONS.resource_gold}" alt="Gold">`, basePrice:20 },
  cotton: { name:'Cotton', icon:`<img class="res-icon" src="${ICONS.resource_cotton}" alt="Cotton">`, basePrice:3 },
  leather: { name:'Leather', icon:`<img class="res-icon" src="${ICONS.resource_leather}" alt="Leather">`, basePrice:6 },
  sand: { name:'Sand', icon:`<img class="res-icon" src="${ICONS.resource_sand}" alt="Sand">`, basePrice:2 },
  gemstones: { name:'Gemstones', icon:`<img class="res-icon" src="${ICONS.resource_gemstones}" alt="Gemstones">`, basePrice:30 },
  water: { name:'Water', icon:`<img class="res-icon" src="${ICONS.resource_water}" alt="Water">`, basePrice:1 },
  salt: { name:'Salt', icon:`<img class="res-icon" src="${ICONS.resource_salt}" alt="Salt">`, basePrice:4 },
  copper: { name:'Copper', icon:`<img class="res-icon" src="${ICONS.resource_copper}" alt="Copper">`, basePrice:7 },
  silver: { name:'Silver', icon:`<img class="res-icon" src="${ICONS.resource_silver}" alt="Silver">`, basePrice:15 },
  zinc: { name:'Zinc', icon:`<img class="res-icon" src="${ICONS.resource_zinc}" alt="Zinc">`, basePrice:9 },
  lead: { name:'Lead', icon:`<img class="res-icon" src="${ICONS.resource_lead}" alt="Lead">`, basePrice:5 },
  magic_stones: { name:'Magic Stones', icon:`<img class="res-icon" src="${ICONS.resource_magic_stones}" alt="Magic Stones">`, basePrice:25 },
  herbs: { name:'Herbs', icon:`<img class="res-icon" src="${ICONS.resource_herbs}" alt="Herbs">`, basePrice:4 },
  honey: { name:'Honey', icon:`<img class="res-icon" src="${ICONS.resource_honey}" alt="Honey">`, basePrice:8 },
};
const GOODS = {
  plank:     { name:'Wood Planks', icon:`<img class="res-icon" src="${ICONS.resource_plank}" alt="Wood Planks">`, basePrice:14 },
  brick:     { name:'Bricks',      icon:`<img class="res-icon" src="${ICONS.resource_brick}" alt="Bricks">`, basePrice:22 },
  bread:     { name:'Bread',       icon:`<img class="res-icon" src="${ICONS.resource_bread}" alt="Bread">`, basePrice:10 },
  rations:   { name:'Rations',     icon:`<img class="ui-icon" src="${ICONS.bento}" alt="🍱">`, basePrice:26 },
  steel:     { name:'Steel',       icon:`<img class="res-icon" src="${ICONS.resource_steel}" alt="Steel">`, basePrice:25 },
  tanned_leather: { name:'Tanned Leather', icon:`<img class="ui-icon" src="${ICONS.square_brown}" alt="🟫">`, basePrice:30 },
  paper:     { name:'Paper',       icon:`<img class="ui-icon" src="${ICONS.document}" alt="📄">`, basePrice:8 },
  cloth:     { name:'Cloth',       icon:`<img class="res-icon" src="${ICONS.resource_cloth}" alt="Cloth">`, basePrice:12 },
  jewelry:   { name:'Jewelry',     icon:`<img class="res-icon" src="${ICONS.resource_jewelry}" alt="Jewelry">`, basePrice:120 },
  glass:     { name:'Glass',       icon:`<img class="res-icon" src="${ICONS.resource_glass}" alt="Glass">`, basePrice:35 },
  bronze:    { name:'Bronze',      icon:`<img class="res-icon" src="${ICONS.resource_bronze}" alt="Bronze">`, basePrice:28 },
  concrete:  { name:'Concrete',    icon:`<img class="res-icon" src="${ICONS.resource_concrete}" alt="Concrete">`, basePrice:15 },
  wooden_bow: { name:'Bow Frame', icon:`<img class="ui-icon" src="${ICONS.wood}" alt="🪵">`, basePrice:48 },
  potion_base: { name:'Potion Base', icon:`<img class="ui-icon" src="${ICONS.potion}" alt="🧪">`, basePrice:20 },
  training_weights: { name:'Training Weights', icon:`<img class="ui-icon" src="${ICONS.weightlifter}" alt="🏋">`, basePrice:90 },
  magic_core: { name:'Magic Core', icon:`<img class="ui-icon" src="${ICONS.mana}" alt="🔮">`, basePrice:220 },
  health_potion: { name:'Health Potion', icon:`<img class="res-icon" src="${ICONS.resource_health_potion}" alt="Health Potion">`, basePrice:50 },
  energy_potion: { name:'Energy Potion', icon:`<img class="res-icon" src="${ICONS.resource_energy_potion}" alt="Energy Potion">`, basePrice:40 },
  toasted_bread:     { name:'Toasted Bread',      icon:`<img class="res-icon" src="${ICONS.resource_toasted_bread}" alt="Toasted Bread">`, basePrice:18 },
  honey_bread:       { name:'Honey Bread',        icon:`<img class="res-icon" src="${ICONS.resource_honey_bread}" alt="Honey Bread">`, basePrice:30 },
  legendary_bread:   { name:'Legendary Bread',    icon:`<img class="ui-icon" src="${ICONS.crown}" alt="👑">`, basePrice:80 },
  small_energy_potion:    { name:'Small Energy Potion',    icon:`<img class="res-icon" src="${ICONS.resource_small_energy_potion}" alt="Small Energy Potion">`, basePrice:25 },
  medium_energy_potion:   { name:'Medium Energy Potion',   icon:`<img class="res-icon" src="${ICONS.resource_medium_energy_potion}" alt="Medium Energy Potion">`, basePrice:50 },
  large_energy_potion:    { name:'Large Energy Potion',    icon:`<img class="res-icon" src="${ICONS.resource_large_energy_potion}" alt="Large Energy Potion">`, basePrice:120 },
  legendary_energy_potion:{ name:'Legendary Energy Potion',icon:`<img class="res-icon" src="${ICONS.resource_legendary_energy_potion}" alt="Legendary Energy Potion">`, basePrice:300 },
};
const ITEMS = { ...RESOURCES, ...GOODS };
/* ═══════════════════════════════════════════════════════════════
   ADVANCED MARKET — Weapons & Gear Catalog (merged)
   ═══════════════════════════════════════════════════════════════ */
const WEAPONS = {
  sword_wood:   { name:'Wooden Sword',   icon:`<img class="ui-icon" src="${ICONS.dagger}" alt="🗡">`, basePrice:45,  category:'weapon', sub:'sword', levelReq:1 },
  sword_stone:  { name:'Stone Sword',    icon:`<img class="ui-icon" src="${ICONS.dagger}" alt="🗡">`, basePrice:65,  category:'weapon', sub:'sword', levelReq:3 },
  sword_iron:   { name:'Iron Sword',     icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, basePrice:120, category:'weapon', sub:'sword', levelReq:8 },
  sword_steel:  { name:'Steel Sword',    icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, basePrice:250, category:'weapon', sub:'sword', levelReq:15 },
  sword_magic:  { name:'Magic Sword',    icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"><img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`, basePrice:800, category:'weapon', sub:'sword', levelReq:30 },
  axe_wood:     { name:'Wood Axe',       icon:`<img class="ui-icon" src="${ICONS.axe}" alt="🪓">`, basePrice:40,  category:'weapon', sub:'axe', levelReq:1 },
  axe_iron:     { name:'Iron Axe',       icon:`<img class="ui-icon" src="${ICONS.axe}" alt="🪓">`, basePrice:110, category:'weapon', sub:'axe', levelReq:7 },
  axe_steel:    { name:'Steel Axe',      icon:`<img class="ui-icon" src="${ICONS.axe}" alt="🪓">`, basePrice:240, category:'weapon', sub:'axe', levelReq:16 },
  spear_wood:   { name:'Wooden Spear',   icon:`<img class="ui-icon" src="${ICONS.trident}" alt="🔱">`, basePrice:35,  category:'weapon', sub:'spear', levelReq:2 },
  spear_iron:   { name:'Iron Spear',     icon:`<img class="ui-icon" src="${ICONS.trident}" alt="🔱">`, basePrice:130, category:'weapon', sub:'spear', levelReq:9 },
  bow_wood:     { name:'Wooden Bow',     icon:`<img class="ui-icon" src="${ICONS.bow}" alt="🏹">`, basePrice:55,  category:'weapon', sub:'bow', levelReq:4 },
  bow_long:     { name:'Longbow',        icon:`<img class="ui-icon" src="${ICONS.bow}" alt="🏹">`, basePrice:140, category:'weapon', sub:'bow', levelReq:10 },
  bow_elven:    { name:'Elven Bow',      icon:`<img class="ui-icon" src="${ICONS.bow}" alt="🏹"><img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`, basePrice:600, category:'weapon', sub:'bow', levelReq:28 },
  dagger_iron:  { name:'Iron Dagger',    icon:`<img class="ui-icon" src="${ICONS.knife}" alt="🔪">`, basePrice:90,  category:'weapon', sub:'dagger', levelReq:6 },
  dagger_shadow:{ name:'Shadow Dagger',  icon:`<img class="ui-icon" src="${ICONS.knife}" alt="🔪"><img class="ui-icon" src="${ICONS.dark_mode}" alt="🌑">`, basePrice:500, category:'weapon', sub:'dagger', levelReq:25 },
  mace_iron:    { name:'Iron Mace',      icon:`<img class="ui-icon" src="${ICONS.hammer}" alt="🔨">`, basePrice:100, category:'weapon', sub:'mace', levelReq:7 },
  mace_war:     { name:'War Mace',       icon:`<img class="ui-icon" src="${ICONS.hammer}" alt="🔨">`, basePrice:280, category:'weapon', sub:'mace', levelReq:18 },
  armor_cloth:  { name:'Cloth Armor',    icon:`<img class="gear-icon-img" src="${ICONS.resource_armor_cloth}" alt="Cloth Armor">`, basePrice:60,  category:'weapon', sub:'armor', levelReq:1 },
  armor_leather:{ name:'Leather Armor',  icon:`<img class="gear-icon-img" src="${ICONS.resource_armor_leather}" alt="Leather Armor">`, basePrice:85,  category:'weapon', sub:'armor', levelReq:3 },
  armor_iron:   { name:'Iron Armor',     icon:`<img class="gear-icon-img" src="${ICONS.resource_armor_iron}" alt="Iron Armor">`, basePrice:150, category:'weapon', sub:'armor', levelReq:8 },
  armor_steel:  { name:'Steel Armor',    icon:`<img class="gear-icon-img" src="${ICONS.resource_armor_steel}" alt="Steel Armor">`, basePrice:280, category:'weapon', sub:'armor', levelReq:16 },
  armor_plate:  { name:'Plate Armor',    icon:`<img class="gear-icon-img" src="${ICONS.resource_armor_plate}" alt="Plate Armor">`, basePrice:700, category:'weapon', sub:'armor', levelReq:35 },
  helmet_leather:{name:'Leather Helmet', icon:`<img class="gear-icon-img" src="${ICONS.resource_helmet_leather}" alt="Leather Helmet">`, basePrice:50,  category:'weapon', sub:'helmet', levelReq:2 },
  helmet_iron:  { name:'Iron Helmet',    icon:`<img class="gear-icon-img" src="${ICONS.resource_helmet_iron}" alt="Iron Helmet">`, basePrice:95,  category:'weapon', sub:'helmet', levelReq:6 },
  helmet_steel: { name:'Steel Helmet',   icon:`<img class="gear-icon-img" src="${ICONS.resource_helmet_steel}" alt="Steel Helmet">`, basePrice:180, category:'weapon', sub:'helmet', levelReq:14 },
  helmet_crown: { name:'Battle Crown',   icon:`<img class="gear-icon-img" src="${ICONS.resource_helmet_crown}" alt="Battle Crown">`, basePrice:550, category:'weapon', sub:'helmet', levelReq:32 },
  boots_leather:{ name:'Leather Boots',  icon:`<img class="gear-icon-img" src="${ICONS.resource_boots_leather}" alt="Leather Boots">`, basePrice:45,  category:'weapon', sub:'boots', levelReq:2 },
  boots_iron:   { name:'Iron Boots',     icon:`<img class="gear-icon-img" src="${ICONS.resource_boots_iron}" alt="Iron Boots">`, basePrice:88,  category:'weapon', sub:'boots', levelReq:5 },
  boots_steel:  { name:'Steel Boots',    icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢">`, basePrice:170, category:'weapon', sub:'boots', levelReq:13 },
  boots_wind:   { name:'Wind Boots',     icon:`<img class="gear-icon-img" src="${ICONS.resource_boots_wind}" alt="Wind Boots">`, basePrice:480, category:'weapon', sub:'boots', levelReq:30 },
  ring_copper:  { name:'Copper Ring',    icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍">`, basePrice:120, category:'weapon', sub:'accessory', levelReq:5 },
  ring_silver:  { name:'Silver Ring',    icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍">`, basePrice:220, category:'weapon', sub:'accessory', levelReq:12 },
  ring_gold:    { name:'Gold Ring',      icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍">`, basePrice:400, category:'weapon', sub:'accessory', levelReq:20 },
  amulet_magic: { name:'Magic Amulet',   icon:`<img class="ui-icon" src="${ICONS.beads}" alt="📿">`, basePrice:750, category:'weapon', sub:'accessory', levelReq:33 },
  gloves_leather:{name:'Leather Gloves', icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤">`, basePrice:40,  category:'weapon', sub:'gloves', levelReq:1 },
  gloves_iron:  { name:'Iron Gloves',    icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤">`, basePrice:75,  category:'weapon', sub:'gloves', levelReq:5 },
  gloves_steel: { name:'Steel Gloves',   icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤">`, basePrice:160, category:'weapon', sub:'gloves', levelReq:14 },
  gloves_dragon:{ name:'Dragon Gloves',  icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤"><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥">`, basePrice:520, category:'weapon', sub:'gloves', levelReq:29 },
};

const MARKET_CATALOG = { ...ITEMS, ...WEAPONS };
const RECIPES = {
  plank:     { inputs:{wood:10},                        output:5, energyCost:2, xp:5,  minLevel:1 },
  brick:     { inputs:{stone:10, water:3},              output:5, energyCost:3, xp:6,  minLevel:1 },
  bread:     { inputs:{food:15},                        output:5, energyCost:2, xp:5,  minLevel:1 },
  rations:   { inputs:{bread:5, salt:2, water:2},       output:3, energyCost:2, xp:8,  minLevel:3 },
  steel:     { inputs:{iron:12, coal:8},                output:3, energyCost:4, xp:12, minLevel:5 },
  tanned_leather: { inputs:{leather:5, salt:3, water:3},output:3, energyCost:3, xp:10, minLevel:5 },
  paper:     { inputs:{wood:10, water:10},              output:5, energyCost:2, xp:6,  minLevel:2 },
  cloth:     { inputs:{cotton:20},                      output:5, energyCost:2, xp:6,  minLevel:1 },
  jewelry:   { inputs:{gold:8, gemstones:4, silver:2},  output:2, energyCost:8, xp:35, minLevel:20 },
  glass:     { inputs:{sand:15, coal:5},                output:4, energyCost:3, xp:10, minLevel:8 },
  bronze:    { inputs:{copper:15, zinc:10},             output:4, energyCost:3, xp:10, minLevel:3 },
  concrete:  { inputs:{stone:8, sand:5, water:5},       output:4, energyCost:4, xp:12, minLevel:8 },
  wooden_bow: { inputs:{plank:4, cotton:3},             output:1, energyCost:3, xp:10, minLevel:3 },
  potion_base: { inputs:{herbs:10, water:5},            output:5, energyCost:3, xp:8,  minLevel:10 },
  training_weights: { inputs:{lead:10, iron:5},         output:2, energyCost:6, xp:25, minLevel:15 },
  magic_core: { inputs:{magic_stones:5, gemstones:3, gold:2}, output:1, energyCost:10, xp:50, minLevel:30 },
  health_potion: { inputs:{food:10, water:5}, output:2, energyCost:3, xp:8, minLevel:8 },
  energy_potion: { inputs:{food:5, water:10, coal:2}, output:2, energyCost:3, xp:8, minLevel:8 },
  toasted_bread:     { inputs:{food:8, water:3, coal:1}, output:2, energyCost:2, xp:6, minLevel:5 },
  honey_bread:       { inputs:{food:10, water:3, honey:2}, output:2, energyCost:3, xp:10, minLevel:15 },
  legendary_bread:   { inputs:{food:15, water:5, herbs:5, honey:3}, output:1, energyCost:5, xp:20, minLevel:30 },
  small_energy_potion:    { inputs:{herbs:5, water:3}, output:2, energyCost:2, xp:5, minLevel:3 },
  medium_energy_potion:   { inputs:{herbs:10, water:5, glass:1}, output:2, energyCost:3, xp:8, minLevel:12 },
  large_energy_potion:    { inputs:{herbs:15, water:8, glass:3, gold:1}, output:2, energyCost:4, xp:15, minLevel:25 },
  legendary_energy_potion:{ inputs:{herbs:20, water:10, glass:5, gold:3, gemstones:2}, output:1, energyCost:6, xp:30, minLevel:40 },
};


const SKILLS = {
  health:  { name:'Health',  icon:`<img class="ui-icon" src="${ICONS.heart_hp}" alt="❤️">`, perLevel:20,  max:20, desc:'Increases max health points' },
  damage:  { name:'Damage',  icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔️">`, perLevel:2,   max:20, desc:'Increases combat power' },
  defense: { name:'Defense', icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡️">`, perLevel:0.05,max:15, desc:'Reduces damage taken on defeat' },
  stamina: { name:'Stamina', icon:`<img class="ui-icon" src="${ICONS.energy}" alt="🔋">`, perLevel:5,   max:20, desc:'Increases max energy and reduces costs' },
  storage: { name:'Storage', icon:`<img class="ui-icon" src="${ICONS.bag_full}" alt="📦">`, perLevel:50,  max:20, desc:'Increases storage capacity' },
  profit:  { name:'Profit',  icon:`<img class="ui-icon" src="${ICONS.business}" alt="💰">`, perLevel:0.02,max:20, desc:'Increases sell price multiplier' },
  adventurer: { name:'Adventurer', icon:`<img class="ui-icon" src="${ICONS.bag_full}" alt="🎒">`, perLevel:1, max:20, desc:'Increases resources gathered per collection' },
};

/* ===== GEAR TIER SYSTEM ===== */
const GEAR_TIERS = [
  // statRange = [min,max] multiplier applied on top of perLevel*power when rolling a stat's
  // value, replacing the old unbounded (1 + random(0,1,2)) roll — keeps stat rolls inside a
  // predictable band per tier instead of letting them swing up to 3x.
  { name:'Common',    color:'#c7bcae', symbol:'●',    power:1.00, minLevel:1,  maxUpgrade:0, numStats:1, sellMin:30,  sellMax:100,  statRange:[0.90,1.30] },
  { name:'Uncommon',  color:'#4fb8a6', symbol:'◆',    power:1.25, minLevel:10, maxUpgrade:1, numStats:2, sellMin:150, sellMax:400,  statRange:[0.90,1.40] },
  { name:'Rare',      color:'#7ec8dc', symbol:`<img class="ui-icon" src="${ICONS.star_filled}" alt="★">`,    power:1.50, minLevel:25, maxUpgrade:2, numStats:3, sellMin:500, sellMax:1500, statRange:[0.90,1.50] },
  { name:'Epic',      color:'#a679c9', symbol:`◆<img class="ui-icon" src="${ICONS.star_filled}" alt="★">`,   power:2.00, minLevel:40, maxUpgrade:3, numStats:4, sellMin:2000,sellMax:5000,  statRange:[1.00,1.60] },
  { name:'Legendary', color:'#f0b860', symbol:`<img class="ui-icon" src="${ICONS.star_filled}" alt="★"><img class="ui-icon" src="${ICONS.star_filled}" alt="★"><img class="ui-icon" src="${ICONS.star_filled}" alt="★">`,  power:3.00, minLevel:55, maxUpgrade:5, numStats:5, sellMin:8000,sellMax:20000, statRange:[1.00,1.80] },
  { name:'Mythic',    color:'#c73f38', symbol:`<img class="ui-icon" src="${ICONS.star_small}" alt="✦">`,    power:4.00, minLevel:70, maxUpgrade:7, numStats:6, sellMin:25000,sellMax:50000, statRange:[1.10,2.00] },
];

const GEAR_SLOTS = {
  // allowedStats caps STAT_POOL down to what each slot classification can roll, so weapons
  // stop showing up with e.g. storage and armor pieces stay defense/health-flavored.
  // setEligible:false (accessory) opts a slot out of tier-set membership — its own
  // recipes run on an independent level curve and don't share a naming theme per tier.
  weapon:    { name:'Weapon',    icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, allowedStats:['damage','stamina'] },
  armor:     { name:'Armor',     icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, allowedStats:['health','defense'] },
  helmet:    { name:'Helmet',    icon:`<img class="ui-icon" src="${ICONS.helmet_cross}" alt="⛑">`, allowedStats:['defense','health'] },
  boots:     { name:'Boots',     icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢">`, allowedStats:['stamina','defense'] },
  accessory: { name:'Accessory', icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍">`, allowedStats:['profit','storage','health'], setEligible:false },
  gloves:    { name:'Gloves',    icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤">`, allowedStats:['damage','profit'] },
};

const GEAR_NAMES = {
  weapon:    ['Stone Knife','Iron Sword','Steel Blade','Magic Sword','Shadow Sword','Fire Sword'],
  armor:     ['Wooden Armor','Iron Armor','Steel Armor','Magic Armor','Dark Armor','Fire Armor'],
  helmet:    ['Leather Helmet','Iron Helmet','Steel Helmet','Golden Crown','Magic Helmet','Crown of Legends'],
  boots:     ['Leather Boots','Iron Boots','Steel Boots','Swift Boots','Magic Boots','Wind Boots'],
  accessory: ['Health Ring','Power Ring','Defense Necklace','Thief Ring','Life Necklace','Ring of Legends'],
  gloves:    ['Leather Gloves','Iron Gloves','Steel Gloves','Magic Gloves','Dark Gloves','Gloves of Legends'],
};
const CRAFTABLE_GEAR = {
  weapon: [
    { tier:0, name:'Stone Knife',      icon:`<img class="ui-icon" src="${ICONS.dagger}" alt="🗡">`,  levelReq:1,  energyCost:3,  xp:8,  inputs:{stone:5, wood:2} },
    { tier:1, name:'Iron Sword',       icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`,  levelReq:12, energyCost:5,  xp:15, inputs:{iron:10, coal:5} },
    { tier:2, name:'Steel Blade',      icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`,  levelReq:32, energyCost:8,  xp:25, inputs:{steel:8, gold:3} },
    { tier:3, name:'Magic Sword',      icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"><img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`,levelReq:55, energyCost:12, xp:45, inputs:{steel:5, magic_stones:3, gold:10} },
    { tier:4, name:'Shadow Sword',     icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"><img class="ui-icon" src="${ICONS.dark_mode}" alt="🌑">`,levelReq:70, energyCost:15, xp:65, inputs:{steel:10, magic_stones:5, gold:20} },
    { tier:5, name:'Fire Sword',       icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔"><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥">`,levelReq:85, energyCost:20, xp:90, inputs:{steel:15, magic_stones:10, gemstones:5, gold:30} },
  ],
  armor: [
    { tier:0, name:'Wooden Armor',     icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`,  levelReq:2,  energyCost:3,  xp:8,  inputs:{wood:10, stone:5} },
    { tier:1, name:'Iron Armor',       icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`,  levelReq:14, energyCost:5,  xp:15, inputs:{iron:12, coal:5, wood:5} },
    { tier:2, name:'Steel Armor',      icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`,  levelReq:34, energyCost:8,  xp:25, inputs:{steel:10, iron:6, gold:8} },
    { tier:3, name:'Magic Armor',      icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"><img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`,levelReq:55, energyCost:12, xp:45, inputs:{steel:10, magic_stones:5, gold:15} },
    { tier:4, name:'Dark Armor',       icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"><img class="ui-icon" src="${ICONS.dark_mode}" alt="🌑">`,levelReq:70, energyCost:15, xp:65, inputs:{steel:15, magic_stones:10, gold:25} },
    { tier:5, name:'Fire Armor',       icon:`<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡"><img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥">`,levelReq:85, energyCost:20, xp:90, inputs:{steel:12, magic_stones:8, gemstones:5, gold:20} },
  ],
  helmet: [
    { tier:0, name:'Leather Helmet',   icon:`<img class="ui-icon" src="${ICONS.helmet}" alt="🪖">`,  levelReq:3,  energyCost:3,  xp:8,  inputs:{leather:5, cloth:3} },
    { tier:1, name:'Iron Helmet',      icon:`<img class="ui-icon" src="${ICONS.helmet}" alt="🪖">`,  levelReq:15, energyCost:5,  xp:15, inputs:{iron:8, coal:5} },
    { tier:2, name:'Steel Helmet',     icon:`<img class="ui-icon" src="${ICONS.helmet}" alt="🪖">`,  levelReq:35, energyCost:8,  xp:25, inputs:{steel:8, gold:5} },
    { tier:3, name:'Golden Crown',     icon:`<img class="ui-icon" src="${ICONS.crown}" alt="👑">`,  levelReq:40, energyCost:10, xp:35, inputs:{gold:10, iron:5, steel:3} },
    { tier:4, name:'Magic Helmet',     icon:`<img class="ui-icon" src="${ICONS.helmet}" alt="🪖"><img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`,levelReq:55, energyCost:12, xp:45, inputs:{steel:8, magic_stones:5, gold:10} },
    { tier:5, name:'Crown of Legends', icon:`<img class="ui-icon" src="${ICONS.crown}" alt="👑"><img class="ui-icon" src="${ICONS.glow_star}" alt="🌟">`,levelReq:65, energyCost:15, xp:60, inputs:{steel:10, gemstones:8, gold:20} },
  ],
  boots: [
    { tier:0, name:'Leather Boots',    icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢">`,  levelReq:2,  energyCost:3,  xp:8,  inputs:{leather:5, cloth:3} },
    { tier:1, name:'Iron Boots',       icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢">`,  levelReq:14, energyCost:5,  xp:15, inputs:{iron:6, leather:4} },
    { tier:2, name:'Steel Boots',      icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢">`,  levelReq:34, energyCost:8,  xp:25, inputs:{steel:8, leather:5, gold:5} },
    { tier:3, name:'Swift Boots',      icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢"><img class="ui-icon" src="${ICONS.energy}" alt="⚡">`,levelReq:40, energyCost:10, xp:35, inputs:{steel:10, magic_stones:5, gold:8} },
    { tier:4, name:'Magic Boots',      icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢"><img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`,levelReq:55, energyCost:12, xp:45, inputs:{steel:8, gemstones:5, gold:10} },
    { tier:5, name:'Wind Boots',       icon:`<img class="ui-icon" src="${ICONS.boots}" alt="👢"><img class="ui-icon" src="${ICONS.tornado}" alt="🌪">`,levelReq:65, energyCost:15, xp:60, inputs:{steel:10, magic_stones:8, gold:15} },
  ],
  accessory: [
    { tier:0, name:'Health Ring',      icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍"><img class="ui-icon" src="${ICONS.heart_hp}" alt="❤">`,levelReq:20, energyCost:8,  xp:20, inputs:{gold:10, gemstones:5} },
    { tier:1, name:'Power Ring',       icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍"><img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`,levelReq:25, energyCost:8,  xp:22, inputs:{gold:10, magic_stones:5} },
    { tier:2, name:'Defense Necklace', icon:`<img class="ui-icon" src="${ICONS.beads}" alt="📿"><img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`,levelReq:30, energyCost:10, xp:28, inputs:{gold:15, gemstones:8} },
    { tier:3, name:'Thief Ring',       icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍"><img class="ui-icon" src="${ICONS.business}" alt="💰">`,levelReq:45, energyCost:12, xp:40, inputs:{gold:20, magic_stones:5, silver:3} },
    { tier:4, name:'Life Necklace',    icon:`<img class="ui-icon" src="${ICONS.beads}" alt="📿"><img class="ui-icon" src="${ICONS.heart_hp}" alt="❤">`,levelReq:55, energyCost:15, xp:50, inputs:{gold:25, gemstones:10, magic_stones:5} },
    { tier:5, name:'Ring of Legends',  icon:`<img class="ui-icon" src="${ICONS.ring}" alt="💍"><img class="ui-icon" src="${ICONS.glow_star}" alt="🌟">`,levelReq:75, energyCost:20, xp:75, inputs:{gold:50, magic_stones:15, gemstones:10} },
  ],
  gloves: [
    { tier:0, name:'Leather Gloves',   icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤">`,  levelReq:3,  energyCost:3,  xp:8,  inputs:{leather:5, cloth:3} },
    { tier:1, name:'Iron Gloves',      icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤">`,  levelReq:15, energyCost:5,  xp:15, inputs:{iron:8, leather:5} },
    { tier:2, name:'Steel Gloves',     icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤">`,  levelReq:35, energyCost:8,  xp:25, inputs:{steel:10, leather:5, gold:5} },
    { tier:3, name:'Magic Gloves',     icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤"><img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`,levelReq:55, energyCost:12, xp:45, inputs:{steel:8, magic_stones:5, gold:10} },
    { tier:4, name:'Dark Gloves',      icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤"><img class="ui-icon" src="${ICONS.dark_mode}" alt="🌑">`,levelReq:70, energyCost:15, xp:65, inputs:{steel:10, magic_stones:8, gemstones:5, gold:15} },
    { tier:5, name:'Gloves of Legends',icon:`<img class="ui-icon" src="${ICONS.gloves}" alt="🧤"><img class="ui-icon" src="${ICONS.glow_star}" alt="🌟">`,levelReq:85, energyCost:20, xp:90, inputs:{steel:12, magic_stones:10, gemstones:8, gold:25} },
  ],
};


const UPGRADE_TABLE = [
  { level:1, shards:5,  gold:100,  gems:0,  chance:1.00 },
  { level:2, shards:10, gold:250,  gems:0,  chance:0.90 },
  { level:3, shards:20, gold:500,  gems:0,  chance:0.80 },
  { level:4, shards:30, gold:1000, gems:0,  chance:0.70 },
  { level:5, shards:50, gold:2000, gems:5,  chance:0.60 },
  { level:6, shards:75, gold:4000, gems:10, chance:0.50 },
  { level:7, shards:100,gold:8000, gems:15, chance:0.40 },
];

const CLASS_AVATAR_EMOJI = { warrior:'⚔️', archer:'🏹', mage:'🔮', support:'💚', merchant:'💰' };
const CLASS_DATA = {
  warrior: {
    name: 'Warrior', nameAr: 'Warrior', icon: `<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, color: '#e2554a',
    desc: 'Balanced damage & defense, high health',
    stats: { hp: 1.60, atk: 1.20, def: 1.40, spd: 0.85, dodge: 0.75, crit: 0.85 },
    skills: [
      { key: 'powerStrike', name: 'Power Strike', nameAr: 'Power Strike', icon: `<img class="ui-icon" src="${ICONS.impact}" alt="💥">`, desc: 'Strong attack with extra energy cost', perLevel: { dmgBonus: 0.05, critBonus: 0.02 } },
      { key: 'ironArmor', name: 'Iron Armor', nameAr: 'Iron Armor', icon: `<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, desc: 'Increases defense temporarily', perLevel: { defBonus: 3, drBonus: 0.02 } },
      { key: 'warriorSpirit', name: 'Warrior Spirit', nameAr: 'Warrior Spirit', icon: `<img class="ui-icon" src="${ICONS.fire_streak}" alt="🔥">`, desc: 'Auto-recovers HP after battle', perLevel: { regenBonus: 0.03 } },
    ],
    starterGear: { weapon: { tier: 0, name: 'Iron Sword', slot: 'weapon', stats: { damage: 4 } }, armor: { tier: 0, name: 'Iron Armor', slot: 'armor', stats: { defense: 0.05, health: 10 } } }
  },
  archer: {
    name: 'Archer', nameAr: 'Archer', icon: `<img class="ui-icon" src="${ICONS.bow}" alt="🏹">`, color: '#4fb8a6',
    desc: 'High damage, speed & evasion, low health',
    stats: { hp: 0.85, atk: 1.45, def: 0.75, spd: 1.50, dodge: 1.35, crit: 1.45 },
    skills: [
      { key: 'keenEye', name: 'Keen Eye', nameAr: 'Keen Eye', icon: `<img class="ui-icon" src="${ICONS.eye}" alt="👁">`, desc: 'Increases crit chance & pierces defense', perLevel: { critBonus: 0.04, pierceBonus: 0.02 } },
      { key: 'swiftness', name: 'Swiftness', nameAr: 'Swiftness', icon: `<img class="ui-icon" src="${ICONS.dash}" alt="💨">`, desc: 'Increases speed & dodge chance', perLevel: { spdBonus: 3, dodgeBonus: 0.02 } },
      { key: 'efficientAim', name: 'Efficient Aim', nameAr: 'Efficient Aim', icon: `<img class="ui-icon" src="${ICONS.spellbook}" alt="🎯">`, desc: 'Reduces energy cost in battles', perLevel: { energyReduction: 0.02 } },
    ],
    starterGear: { weapon: { tier: 0, name: 'Longbow', slot: 'weapon', stats: { damage: 6 } }, armor: { tier: 0, name: 'Leather Vest', slot: 'armor', stats: { defense: 0.02, health: 5 } } }
  },
  mage: {
    name: 'Mage', nameAr: 'Mage', icon: `<img class="ui-icon" src="${ICONS.mana}" alt="🔮">`, color: '#a679c9',
    desc: 'Extreme damage, pierces defense, very low health',
    stats: { hp: 0.65, atk: 1.65, def: 0.65, spd: 1.00, dodge: 0.95, crit: 1.25 },
    skills: [
      { key: 'arcanePower', name: 'Arcane Power', nameAr: 'Arcane Power', icon: `<img class="ui-icon" src="${ICONS.sparkle}" alt="✨">`, desc: 'Increases magic damage & pierces defense', perLevel: { dmgBonus: 0.06, pierceBonus: 0.03 } },
      { key: 'magicShield', name: 'Magic Shield', nameAr: 'Magic Shield', icon: `<img class="ui-icon" src="${ICONS.mana}" alt="🔮">`, desc: 'Protects from magic attacks', perLevel: { magicResist: 0.04 } },
      { key: 'manaForce', name: 'Mana Force', nameAr: 'Mana Force', icon: `<img class="ui-icon" src="${ICONS.energy}" alt="⚡">`, desc: 'Increases max energy & reduces cost', perLevel: { energyBonus: 5, energyReduction: 0.02 } },
    ],
    starterGear: { weapon: { tier: 0, name: 'Magic Staff', slot: 'weapon', stats: { damage: 8 } }, armor: { tier: 0, name: 'Cloth Robe', slot: 'armor', stats: { defense: 0.01, health: 3 } } }
  },
  support: {
    name: 'Support', nameAr: 'Support', icon: `<img class="ui-icon" src="${ICONS.heal}" alt="💚">`, color: '#7fd9a8',
    desc: 'Heals & buffs, low damage, high survivability',
    stats: { hp: 1.30, atk: 0.75, def: 1.15, spd: 0.95, dodge: 0.85, crit: 0.75 },
    skills: [
      { key: 'fastHeal', name: 'Fast Heal', nameAr: 'Fast Heal', icon: `<img class="ui-icon" src="${ICONS.heal}" alt="💚">`, desc: 'Restores HP during battle', perLevel: { healPerTurn: 5, healBonus: 0.02 } },
      { key: 'protectiveAura', name: 'Protective Aura', nameAr: 'Protective Aura', icon: `<img class="ui-icon" src="${ICONS.defense_ui}" alt="🛡">`, desc: 'Reduces damage taken', perLevel: { drBonus: 0.03 } },
      { key: 'lifeForce', name: 'Life Force', nameAr: 'Life Force', icon: `<img class="ui-icon" src="${ICONS.heart_hp}" alt="❤">`, desc: 'Increases max HP & regen', perLevel: { hpBonus: 8, regenBonus: 0.02 } },
    ],
    starterGear: { weapon: { tier: 0, name: 'Light Mace', slot: 'weapon', stats: { damage: 2 } }, armor: { tier: 0, name: 'Light Armor', slot: 'armor', stats: { defense: 0.04, health: 8 } } }
  },
  merchant: {
    name: 'Merchant', nameAr: 'Merchant', icon: `<img class="ui-icon" src="${ICONS.business}" alt="💰">`, color: '#e0a458',
    desc: 'Economic bonuses, extra profits, balanced stats',
    stats: { hp: 1.10, atk: 1.05, def: 1.05, spd: 1.05, dodge: 1.05, crit: 1.05 },
    skills: [
      { key: 'profitableDeal', name: 'Profitable Deal', nameAr: 'Profitable Deal', icon: `<img class="ui-icon" src="${ICONS.business}" alt="💰">`, desc: 'Increases sell prices', perLevel: { sellBonus: 0.03 } },
      { key: 'deepPockets', name: 'Deep Pockets', nameAr: 'Deep Pockets', icon: `<img class="ui-icon" src="${ICONS.briefcase}" alt="💼">`, desc: 'Increases gold earned from battle victories', perLevel: { goldCapBonus: 0.05 } },
      { key: 'lucky', name: 'Lucky', nameAr: 'Lucky', icon: `<img class="ui-icon" src="${ICONS.clover}" alt="🍀">`, desc: 'Extra loot chance from battles', perLevel: { lootBonus: 0.03 } },
    ],
    starterGear: { weapon: { tier: 0, name: 'Golden Dagger', slot: 'weapon', stats: { damage: 3 } }, armor: { tier: 0, name: 'Merchant Vest', slot: 'armor', stats: { defense: 0.03, health: 6 } } }
  },
};

const CLASS_SKILL_MAX = 10;
const CLASS_SKILL_COST_TABLE = [1,1,2,2,3,3,4,4,5,5];

const STAT_POOL = ['health','damage','defense','stamina','storage','profit'];

/* ===== GEAR SET BONUSES =====
   A "set" is every set-eligible piece (see GEAR_SLOTS.setEligible) crafted/dropped at the
   same tier — weapon+armor+helmet+boots+gloves (5 slots max; accessory opts out). setId is
   assigned as 'tier'+tierIdx in generateGear/craftGear, so pieces from the same tier always
   share a set regardless of their individual display names.
   bonuses: {pieces, stat, bonus} — bonus is a fractional multiplier added to that stat's
   total gear contribution once >= pieces of the set are equipped. stat:'all' applies to
   every stat. Thresholds are 3 (majority) and 5 (full set). */
const SET_DATA = {
  tier0: { name:'Common Set',    bonuses:[{pieces:3, stat:'all', bonus:0.03},{pieces:5, stat:'all', bonus:0.06}] },
  tier1: { name:'Iron Set',      bonuses:[{pieces:3, stat:'all', bonus:0.04},{pieces:5, stat:'all', bonus:0.08}] },
  tier2: { name:'Steel Set',     bonuses:[{pieces:3, stat:'all', bonus:0.05},{pieces:5, stat:'all', bonus:0.10}] },
  tier3: { name:'Arcane Set',    bonuses:[{pieces:3, stat:'all', bonus:0.06},{pieces:5, stat:'all', bonus:0.12}] },
  tier4: { name:'Shadow Set',    bonuses:[{pieces:3, stat:'all', bonus:0.07},{pieces:5, stat:'all', bonus:0.15}] },
  tier5: { name:'Inferno Set',   bonuses:[{pieces:3, stat:'all', bonus:0.08},{pieces:5, stat:'all', bonus:0.18}] },
};


/* ═══════════════════════════════════════════════════════════════
   MISSIONS SYSTEM — Daily, Weekly & Monthly
   ═══════════════════════════════════════════════════════════════ */
// Daily, weekly & monthly mission targets/rewards scale with the player's
// level so a level 1 player gets an achievable target and a level 60
// player gets a meaningfully bigger one — same mission list, no separate
// tiers to maintain. Pivoted around level 10 (scale = 1.0 there, matching
// the numbers below). 'level_reached' targets a specific player level, so
// scaling that by the player's own level would be circular — kept as an
// escape hatch even though no current mission uses it.
function missionLevelScale(level){
  return Math.max(0.35, Math.min(3, (level || 1) / 10));
}
function missionTarget(m, level){
  if(typeof m.target === 'number') return m.target;
  if(m.track === 'level_reached') return m.baseTarget;
  return Math.max(1, Math.round(m.baseTarget * missionLevelScale(level)));
}
function missionReward(m, level){
  if(typeof m.target === 'number') return m.reward;
  const s = Math.sqrt(missionLevelScale(level));
  const r = {};
  if(m.reward.xp) r.xp = Math.max(1, Math.round(m.reward.xp * s));
  if(m.reward.gold) r.gold = Math.max(1, Math.round(m.reward.gold * s));
  return r;
}
function missionTitle(m, level){
  return m.title.replace('{n}', missionTarget(m, level).toLocaleString());
}

const DAILY_MISSIONS = [
  { id:'daily_collect', title:'Collect {n} resources',        baseTarget:150, reward:{xp:25, gold:20},  icon:`<img class="ui-icon" src="${ICONS.tree_pine}" alt="🌲">`, track:'collected' },
  { id:'daily_craft',   title:'Craft {n} products',             baseTarget:10,  reward:{xp:30, gold:25},  icon:`<img class="ui-icon" src="${ICONS.tools}" alt="🛠">`, track:'crafted' },
  { id:'daily_sell',    title:'Sell {n} units on the market',  baseTarget:200, reward:{xp:25, gold:30},  icon:`<img class="ui-icon" src="${ICONS.upgrade_scroll}" alt="📈">`, track:'sold' },
  { id:'daily_buy',     title:'Buy {n} units from the market', baseTarget:100, reward:{xp:20, gold:20},  icon:`<img class="ui-icon" src="${ICONS.cart}" alt="🛒">`, track:'bought' },
  { id:'daily_battles', title:'Enter {n} battles',                baseTarget:8,   reward:{xp:35, gold:25},  icon:`<img class="ui-icon" src="${ICONS.damage_ui}" alt="⚔">`, track:'battles_started' },
  { id:'daily_hits',    title:'Land {n} hits in battle',         baseTarget:40,  reward:{xp:30, gold:25},  icon:`<img class="ui-icon" src="${ICONS.impact}" alt="💥">`, track:'hits_landed' },
  { id:'daily_wins',    title:'Win {n} battles',                  baseTarget:5,   reward:{xp:40, gold:40},  icon:`<img class="ui-icon" src="${ICONS.trophy}" alt="🏆">`, track:'battles_won' },
  { id:'daily_eat',     title:'Eat {n} food items',              baseTarget:10,  reward:{xp:20, gold:15},  icon:`<img class="ui-icon" src="${ICONS.bread}" alt="🍞">`, track:'eat_food' },
  { id:'daily_potions', title:'Drink {n} energy potions',         baseTarget:5,   reward:{xp:20, gold:15},  icon:`<img class="ui-icon" src="${ICONS.potion}" alt="🧪">`, track:'used_potion' },
  { id:'daily_donate',  title:'Donate {n} to your kingdom',    baseTarget:500, reward:{xp:40, gold:20},  icon:`<img class="ui-icon" src="${ICONS.alliance}" alt="🏛">`, track:'alliance_donated' },
  { id:'daily_pvp_attacks', title:'Enter {n} Arena duels',      baseTarget:3,   reward:{xp:35, gold:30},  icon:`<img class="ui-icon" src="${ICONS.dagger}" alt="🗡">`, track:'pvp_attacks' },
];

const WEEKLY_MISSIONS = [
  { id:'weekly_wins',    title:'Win {n} battles',                          baseTarget:30,   reward:{xp:150, gold:100}, icon:`<img class="ui-icon" src="${ICONS.trophy}" alt="🏆">`, track:'battles_won' },
  { id:'weekly_sell',    title:'Sell {n} units on the market',           baseTarget:1000, reward:{xp:100, gold:80},  icon:`<img class="ui-icon" src="${ICONS.upgrade_scroll}" alt="📈">`, track:'sold' },
  { id:'weekly_collect', title:'Collect {n} resources',                  baseTarget:1000, reward:{xp:100, gold:60},  icon:`<img class="ui-icon" src="${ICONS.tree_pine}" alt="🌲">`, track:'collected' },
  { id:'weekly_craft',   title:'Craft {n} products',                       baseTarget:40,   reward:{xp:110, gold:70},  icon:`<img class="ui-icon" src="${ICONS.tools}" alt="🛠">`, track:'crafted' },
  { id:'weekly_equip',   title:'Equip {n} gear pieces',                     baseTarget:5,    reward:{xp:80,  gold:50},  icon:`<img class="ui-icon" src="${ICONS.dagger}" alt="🗡">`, track:'gear_equipped' },
  { id:'weekly_upgrade', title:'Successfully upgrade gear {n} times',       baseTarget:8,    reward:{xp:120, gold:100}, icon:`<img class="ui-icon" src="${ICONS.upgrade}" alt="⬆">`, track:'gear_upgraded' },
  { id:'weekly_forge',   title:'Forge {n} gear items',                      baseTarget:5,    reward:{xp:90,  gold:60},  icon:`<img class="ui-icon" src="${ICONS.craft}" alt="⚒">`, track:'gear_crafted' },
  { id:'weekly_donate',  title:'Donate {n} to your kingdom',            baseTarget:2000, reward:{xp:130, gold:80},  icon:`<img class="ui-icon" src="${ICONS.alliance}" alt="🏛">`, track:'alliance_donated' },
  { id:'weekly_potions', title:'Drink {n} energy potions',                 baseTarget:15,   reward:{xp:70,  gold:40},  icon:`<img class="ui-icon" src="${ICONS.potion}" alt="🧪">`, track:'used_potion' },
  { id:'weekly_pvp_wins', title:'Win {n} Arena duels',                     baseTarget:15,   reward:{xp:130, gold:110}, icon:`<img class="ui-icon" src="${ICONS.trophy}" alt="🏆">`, track:'pvp_wins' },
  { id:'weekly_pvp_gold', title:'Steal {n} gold in the Arena',             baseTarget:800,  reward:{xp:90,  gold:70},  icon:`<img class="ui-icon" src="${ICONS.business}" alt="💰">`, track:'pvp_gold_stolen' },
];

// Monthly missions — reset on the 1st of every month (see getNextMonthlyReset
// in main.js). Bigger, longer-horizon goals than weekly; scaled by player
// level the same way daily/weekly are (missionLevelScale).
const MONTHLY_MISSIONS = [
  { id:'monthly_collect',    title:'Collect {n} resources',                baseTarget:4000, reward:{xp:320, gold:220}, icon:`<img class="ui-icon" src="${ICONS.tree_pine}" alt="🌲">`, track:'collected' },
  { id:'monthly_craft',      title:'Craft {n} products',                     baseTarget:150,  reward:{xp:300, gold:210}, icon:`<img class="ui-icon" src="${ICONS.tools}" alt="🛠">`, track:'crafted' },
  { id:'monthly_sell',       title:'Sell {n} units on the market',         baseTarget:4000, reward:{xp:280, gold:220}, icon:`<img class="ui-icon" src="${ICONS.upgrade_scroll}" alt="📈">`, track:'sold' },
  { id:'monthly_wins',       title:'Win {n} battles',                        baseTarget:120,  reward:{xp:380, gold:260}, icon:`<img class="ui-icon" src="${ICONS.trophy}" alt="🏆">`, track:'battles_won' },
  { id:'monthly_upgrade',    title:'Successfully upgrade gear {n} times',    baseTarget:30,   reward:{xp:340, gold:250}, icon:`<img class="ui-icon" src="${ICONS.upgrade}" alt="⬆">`, track:'gear_upgraded' },
  { id:'monthly_donate',     title:'Donate {n} to your kingdom',          baseTarget:8000, reward:{xp:300, gold:200}, icon:`<img class="ui-icon" src="${ICONS.alliance}" alt="🏛">`, track:'alliance_donated' },
  { id:'monthly_pvp_attacks',title:'Enter {n} Arena duels',                  baseTarget:60,   reward:{xp:260, gold:180}, icon:`<img class="ui-icon" src="${ICONS.dagger}" alt="🗡">`, track:'pvp_attacks' },
  { id:'monthly_pvp_wins',   title:'Win {n} Arena duels',                    baseTarget:40,   reward:{xp:420, gold:320}, icon:`<img class="ui-icon" src="${ICONS.medal}" alt="🎖">`, track:'pvp_wins' },
  { id:'monthly_pvp_gold',   title:'Steal {n} gold in the Arena',            baseTarget:3000, reward:{xp:260, gold:240}, icon:`<img class="ui-icon" src="${ICONS.business}" alt="💰">`, track:'pvp_gold_stolen' },
];
