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
  {id:'kosovo', name:'Kosovo', resources:['coal','ore'], tax:8},
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
  {id:'puerto_rico', name:'Puerto Rico', resources:['food','herbs'], tax:10},
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
  {id:'taiwan', name:'Taiwan', resources:['ore','iron'], tax:12},
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
/* Gear stats are RANDOM: each stat rolls between a min and a max. Every tier has its own roll range (tiers never overlap). */
const SLOT_STAT_COEF = {
  weapon:{atk:1.3}, armor:{def:0.85, hp:3}, helmet:{def:0.55, hp:1.4},
  boots:{spd:0.5, eva:0.3}, gloves:{atk:0.45, crit:0.22}, accessory:{crit:0.35, eva:0.35},
};
const TIER_ROLL = { common:[0.85,1.15], uncommon:[1.2,1.5], rare:[1.6,2.0], epic:[2.1,2.7], legendary:[2.9,3.7] };
function equipmentStatRange(slot, tierId, level){
  const base = 3 + level*1.4, roll = TIER_ROLL[tierId] || TIER_ROLL.common, out = {};
  Object.entries(SLOT_STAT_COEF[slot]||{}).forEach(([k,co])=>{
    out[k] = [Math.max(1, Math.round(base*co*roll[0])), Math.max(1, Math.round(base*co*roll[1]))];
  });
  return out;
}
function makeEquipment(slot, tierId, level){
  const tier = TIERS.find(t=>t.id===tierId) || TIERS[0];
  const stats = {};
  Object.entries(equipmentStatRange(slot, tier.id, level)).forEach(([k,[lo,hi]])=>{ stats[k] = Math.floor(Math.random()*(hi-lo+1))+lo; });
  return { uid: uid(), kind:'equipment', slot, tier: tier.id, name: tier.name + ' ' + SLOT_NOUN[slot], level, stats };
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
  { t: 'flavor', w: 40 }, { t: 'gold', w: 18 }, { t: 'resource', w: 16 }, { t: 'xp', w: 6 }, { t: 'monster', w: 17 },
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
  prepMs: 2 * 60 * 1000,           // declaration -> round 1 starts
  roundMs: 5 * 60 * 60 * 1000,     // fixed duration of every round
  roundsToWin: 2,
  maxRounds: 3,
  cooldownMs: 24 * 60 * 60 * 1000, // post-war protection for BOTH countries
  minMembers: 0,                   // no minimum: a country with 0 players can be attacked, and one without regions can attack (it still needs a Leader player to declare)
  requireAdjacency: true,          // a war can only target a region that borders one of the attacker's own regions (WORLD_NEIGHBORS); rc_config/war may switch it off
  strikeEnergyCost: 10,
  strikeCooldownMs: 0,   // unused: strikes have no waiting period any more
  maxStrikesPerPlayerPerRound: 10,
  maxHitsPerTarget: 3,             // damage vs the same enemy player counts at most this many times per round
  duelMaxRounds: 14,
  minTaxPct: 5,
  maxTaxPct: 15,
  maxEffectiveTaxPct: 30,          // the National PvE Tax can never exceed this share of a gross amount
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clampInt(v, lo, hi) { v = Math.round(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); }

// Normal country tax %, always inside the configured band.
function normalTaxPct(baseTax, cfg) {
  cfg = cfg || WAR_CONFIG;
  return clampInt(baseTax, cfg.minTaxPct, cfg.maxTaxPct);
}

/* ---------- 3-decimal economy ----------
   Every economic value (resources, PvE earnings, tax, treasury) has at most 3 decimals.
   round3 is the ONE rounding rule: 10.1574 -> 10.157, 10.1576 -> 10.158. */
function round3(v) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.round(n * 1000 + (n < 0 ? -1e-7 : 1e-7)) / 1000;
}

/* ---------- National PvE Tax split ----------
   gross is the freshly generated PvE amount (never what the player already holds).
   tax = round3(gross * pct / 100), player = round3(gross - tax). No hidden carry:
   the treasury receives exactly the tax value (10.350 @ 10% -> 1.035 / 9.315). */
function splitPvE({ gross, taxPct, cfg }) {
  cfg = cfg || WAR_CONFIG;
  gross = Math.max(0, round3(gross));
  const pct = clampInt(taxPct, 0, cfg.maxEffectiveTaxPct);
  const tax = round3(gross * pct / 100);
  return { gross, tax, player: round3(gross - tax), taxPct: pct };
}

/* Damage of one round grouped by the country it was dealt for: { countryId: { uid: damage } }.
   A player may now strike for BOTH sides of a war, so the round doc keeps `contribBy`; `contrib` stays the per-player total.
   Older round docs (no contribBy) are read through their single recorded side (`members`). */
function roundByCountry(rd) {
  const contrib = (rd && rd.contrib) || {}, members = (rd && rd.members) || {}, by = (rd && rd.contribBy) || {};
  const out = {}, seen = {};
  Object.keys(by).forEach((cc) => Object.keys(by[cc] || {}).forEach((u) => {
    const v = Number(by[cc][u]) || 0;
    if (v > 0) { (out[cc] = out[cc] || {})[u] = v; seen[u] = (seen[u] || 0) + v; }
  }));
  Object.keys(contrib).forEach((u) => {
    const rest = (Number(contrib[u]) || 0) - (seen[u] || 0);
    if (!seen[u] && rest > 0 && members[u]) { out[members[u]] = out[members[u]] || {}; out[members[u]][u] = (out[members[u]][u] || 0) + rest; }
  });
  return out;
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
  // distinct players who dealt damage for each country (a player who fought for both sides counts for both)
  const by = roundByCountry(roundDoc);
  const count = { [attackerId]: 0, [defenderId]: 0 };
  [attackerId, defenderId].forEach((cc) => { count[cc] = Object.values(by[cc] || {}).filter((v) => v > 0).length; });
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
  clampInt, normalTaxPct, round3, splitPvE,
  resolveRoundWinner, advanceWarState, currentRound,
};
};
__defs['resource-config'] = function(module, exports, require){
"use strict";

/* ============================================================
   MONTHLY RESOURCE DISTRIBUTION — centralized configuration.
   Nothing else in the code base hardcodes these numbers. Every NUMBER here can
   be overridden WITHOUT a redeploy by creating the Firestore doc
   rc_config/resources with the same key (see resource-distribution.js loadConfig).
   Resource ids are the game's EXISTING ones (RESOURCE_NAMES in js/config.js).
   ============================================================ */

const RESOURCE_TIERS = {
  COMMON:    ["food", "wood", "stone", "herbs", "leather"],
  UNCOMMON:  ["iron", "coal"],
  RARE:      ["ore"],                       // "Gold Ore"
  VERY_RARE: ["frost", "voidessence"],
};

// Economic value of ONE unit of each tier (config example values from the design doc).
const TIER_VALUE = { COMMON: 10, UNCOMMON: 20, RARE: 35, VERY_RARE: 50 };
// Base production per hour of a region whose resource has that tier (before quality / modifiers).
const TIER_BASE_PRODUCTION = { COMMON: 100, UNCOMMON: 60, RARE: 30, VERY_RARE: 20 };
// Max share of ALL regions that can carry a resource of that tier in one month (keeps valuable regions rare).
const TIER_MAX_SHARE = { COMMON: 1, UNCOMMON: 0.30, RARE: 0.12, VERY_RARE: 0.04 };
// Base pick weight of a tier (rarer = less likely before geography is applied).
const TIER_BASE_WEIGHT = { COMMON: 1, UNCOMMON: 0.55, RARE: 0.25, VERY_RARE: 0.08 };

const RESOURCE_VALUES = {};      // {resourceId: value per unit}
const RESOURCE_BASE_PRODUCTION = {};
const TIER_OF = {};              // {resourceId: "COMMON"...}
Object.keys(RESOURCE_TIERS).forEach((tier) => RESOURCE_TIERS[tier].forEach((r) => {
  TIER_OF[r] = tier; RESOURCE_VALUES[r] = TIER_VALUE[tier]; RESOURCE_BASE_PRODUCTION[r] = TIER_BASE_PRODUCTION[tier];
}));
const ALL_RESOURCES = Object.keys(TIER_OF);

// Region geography -> weight multiplier per resource (weighted RANDOMNESS, never deterministic).
// A resource missing from a geography gets `baseline`.
const RESOURCE_GEOGRAPHY_WEIGHTS = {
  baseline: 0.15,
  fertile:  { food: 5, herbs: 3, leather: 2 },
  forest:   { wood: 5, herbs: 2, leather: 2, food: 0.8 },
  mountain: { stone: 4, iron: 4, ore: 3, coal: 1.5, frost: 1.5 },
  mining:   { iron: 4, coal: 4, ore: 2.5, stone: 2 },
  plains:   { food: 2.5, leather: 3, wood: 1.5, stone: 1.5, herbs: 1.5, iron: 0.8 },
  arcane:   { frost: 4, voidessence: 4, herbs: 1.5, ore: 1, stone: 1 },
};
// Country "natural" resource (existing data) -> geography of the region it inspires.
const NATURAL_TO_GEO = { food: "fertile", herbs: "fertile", wood: "forest", stone: "mountain", iron: "mining", coal: "mining", ore: "mountain", leather: "plains", frost: "arcane", voidessence: "arcane" };
const GEOGRAPHIES = ["fertile", "forest", "mountain", "mining", "plains"];  // geographies picked at random for non-natural regions

const RESOURCE_DISTRIBUTION_CONFIG = {
  MONTHLY_DISTRIBUTION_ENABLED: true,
  RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE: 0.10,   // (max - min) / max country value must be <= this
  MAX_BALANCING_ITERATIONS: 5000,
  ALGORITHM_VERSION: 1,
  QUALITY_MIN: 0.85, QUALITY_MAX: 1.15,            // per-region resourceQuality roll
  VARIETY_REPEAT_PENALTY: 0.35,                    // weight multiplier when a region got the same resource last month
  MIN_SWAP_GEO_WEIGHT: 0.3,                        // balancing may only put a resource on a region whose geography gives it at least this weight
  // Production modifiers (the existing production architecture does not exist yet for regions, so they live here)
  OCCUPATION_MODIFIER: 0.70,
  HIGH_RESISTANCE_MODIFIER: 0.50, HIGH_RESISTANCE_FROM: 50,
  INFRASTRUCTURE_STEP: 0.05, DEVELOPMENT_STEP: 0.05,   // +5% per level above 1
  MIN_STABILITY_MODIFIER: 0.25,
  MAX_ACCRUAL_MS: 72 * 60 * 60 * 1000,             // production nobody collected for longer than this is not stored
  // Admin / debug tools (disabled in production unless explicitly enabled in rc_config/resources)
  ADMIN_TOOLS_ENABLED: false,
};

const CFG_NUMBER_LIMITS = {
  RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE: [0.01, 0.5], MAX_BALANCING_ITERATIONS: [0, 50000],
  QUALITY_MIN: [0.5, 1], QUALITY_MAX: [1, 2], VARIETY_REPEAT_PENALTY: [0, 1], MIN_SWAP_GEO_WEIGHT: [0, 5],
  OCCUPATION_MODIFIER: [0, 1], HIGH_RESISTANCE_MODIFIER: [0, 1], MAX_ACCRUAL_MS: [0, 30 * 24 * 3600 * 1000],
};

module.exports = {
  RESOURCE_TIERS, TIER_VALUE, TIER_BASE_PRODUCTION, TIER_MAX_SHARE, TIER_BASE_WEIGHT,
  RESOURCE_VALUES, RESOURCE_BASE_PRODUCTION, TIER_OF, ALL_RESOURCES,
  RESOURCE_GEOGRAPHY_WEIGHTS, NATURAL_TO_GEO, GEOGRAPHIES,
  RESOURCE_DISTRIBUTION_CONFIG, CFG_NUMBER_LIMITS,
};
};
__defs['world-regions'] = function(module, exports, require){
"use strict";

// GENERATED by tools/gen-war-map.js from the WarEra map — do not edit by hand (run the generator again).
// One entry per REAL war region: id = <countryId>_<n>, the same ids the map (js/map.js) draws and the server uses for wars / ownership / resources.
// the source map's own resources are NOT used: the game only knows its own resources (see resource-config.js).
const WORLD_LAYOUT = "warmap-1";
const WORLD_REGIONS = [
{"id":"afghanistan_1","countryId":"afghanistan","name":"Central Afghanistan","cap":true},
{"id":"afghanistan_2","countryId":"afghanistan","name":"Northeastern Afghanistan","cap":false},
{"id":"afghanistan_3","countryId":"afghanistan","name":"Northwestern Afghanistan","cap":false},
{"id":"afghanistan_4","countryId":"afghanistan","name":"Southeastern Afghanistan","cap":false},
{"id":"afghanistan_5","countryId":"afghanistan","name":"Southwestern Afghanistan","cap":false},
{"id":"afghanistan_6","countryId":"afghanistan","name":"Western Afghanistan","cap":false},
{"id":"albania_1","countryId":"albania","name":"Northern Albania","cap":false},
{"id":"albania_2","countryId":"albania","name":"Southern Albania","cap":true},
{"id":"algeria_1","countryId":"algeria","name":"Algerian Atlas Mountains","cap":false},
{"id":"algeria_2","countryId":"algeria","name":"Aurès Mountains","cap":false},
{"id":"algeria_3","countryId":"algeria","name":"Eastern Algerian Sahara","cap":false},
{"id":"algeria_4","countryId":"algeria","name":"Northern Algeria","cap":true},
{"id":"algeria_5","countryId":"algeria","name":"Northwestern Algeria","cap":false},
{"id":"algeria_6","countryId":"algeria","name":"Western Algerian Sahara","cap":false},
{"id":"andorra_1","countryId":"andorra","name":"Andorra","cap":true},
{"id":"angola_1","countryId":"angola","name":"Cabinda","cap":false},
{"id":"angola_2","countryId":"angola","name":"Central Angola","cap":false},
{"id":"angola_3","countryId":"angola","name":"Luanda","cap":true},
{"id":"angola_4","countryId":"angola","name":"Lunda","cap":false},
{"id":"angola_5","countryId":"angola","name":"Southeastern Angola","cap":false},
{"id":"angola_6","countryId":"angola","name":"Southwestern Angola","cap":false},
{"id":"antigua_and_barbuda_1","countryId":"antigua_and_barbuda","name":"Antigua and Barbuda","cap":true},
{"id":"argentina_1","countryId":"argentina","name":"Buenos Aires","cap":true},
{"id":"argentina_2","countryId":"argentina","name":"Mendoza","cap":false},
{"id":"argentina_3","countryId":"argentina","name":"Patagonia","cap":false},
{"id":"argentina_4","countryId":"argentina","name":"Posadas","cap":false},
{"id":"argentina_5","countryId":"argentina","name":"Resistencia","cap":false},
{"id":"argentina_6","countryId":"argentina","name":"Salta","cap":false},
{"id":"armenia_1","countryId":"armenia","name":"Armenia","cap":true},
{"id":"australia_1","countryId":"australia","name":"New South Wales","cap":true},
{"id":"australia_2","countryId":"australia","name":"Queensland","cap":false},
{"id":"australia_3","countryId":"australia","name":"South Australia","cap":false},
{"id":"australia_4","countryId":"australia","name":"Tasmania","cap":false},
{"id":"australia_5","countryId":"australia","name":"Victoria","cap":false},
{"id":"australia_6","countryId":"australia","name":"Western Australia","cap":false},
{"id":"austria_1","countryId":"austria","name":"Carinthia","cap":false},
{"id":"austria_2","countryId":"austria","name":"Northern Austria","cap":true},
{"id":"austria_3","countryId":"austria","name":"Styria","cap":false},
{"id":"austria_4","countryId":"austria","name":"Tyrol & Salzburg","cap":false},
{"id":"azerbaijan_1","countryId":"azerbaijan","name":"Baku","cap":true},
{"id":"azerbaijan_2","countryId":"azerbaijan","name":"Genca","cap":false},
{"id":"azerbaijan_3","countryId":"azerbaijan","name":"Karabakh","cap":false},
{"id":"azerbaijan_4","countryId":"azerbaijan","name":"Naxcivan","cap":false},
{"id":"azerbaijan_5","countryId":"azerbaijan","name":"Shirvan","cap":false},
{"id":"azerbaijan_6","countryId":"azerbaijan","name":"Siyazen","cap":false},
{"id":"bahamas_1","countryId":"bahamas","name":"Bahamas","cap":true},
{"id":"bahrain_1","countryId":"bahrain","name":"Bahrain","cap":true},
{"id":"bangladesh_1","countryId":"bangladesh","name":"Chittagong","cap":false},
{"id":"bangladesh_2","countryId":"bangladesh","name":"Dhaka","cap":true},
{"id":"bangladesh_3","countryId":"bangladesh","name":"Northern Bangladesh","cap":false},
{"id":"barbados_1","countryId":"barbados","name":"Barbados","cap":true},
{"id":"belarus_1","countryId":"belarus","name":"Brest","cap":false},
{"id":"belarus_2","countryId":"belarus","name":"Gomel","cap":false},
{"id":"belarus_3","countryId":"belarus","name":"Grodno","cap":false},
{"id":"belarus_4","countryId":"belarus","name":"Minsk","cap":true},
{"id":"belarus_5","countryId":"belarus","name":"Mogilev","cap":false},
{"id":"belarus_6","countryId":"belarus","name":"Vitebsk","cap":false},
{"id":"belgium_1","countryId":"belgium","name":"Brussels","cap":true},
{"id":"belgium_2","countryId":"belgium","name":"Flanders","cap":false},
{"id":"belgium_3","countryId":"belgium","name":"Wallonia","cap":false},
{"id":"belize_1","countryId":"belize","name":"Northern Belize","cap":false},
{"id":"belize_2","countryId":"belize","name":"Southern Belize","cap":true},
{"id":"benin_1","countryId":"benin","name":"Northern Benin","cap":false},
{"id":"benin_2","countryId":"benin","name":"Southern Benin","cap":true},
{"id":"bhutan_1","countryId":"bhutan","name":"Thimphu","cap":true},
{"id":"bhutan_2","countryId":"bhutan","name":"Trashigang","cap":false},
{"id":"bolivia_1","countryId":"bolivia","name":"Bolivian Valley","cap":false},
{"id":"bolivia_2","countryId":"bolivia","name":"La Paz","cap":true},
{"id":"bolivia_3","countryId":"bolivia","name":"Southwestern Bolivia","cap":false},
{"id":"bosnia_and_herzegovina_1","countryId":"bosnia_and_herzegovina","name":"Northern Bosnia","cap":false},
{"id":"bosnia_and_herzegovina_2","countryId":"bosnia_and_herzegovina","name":"Southern Bosnia","cap":true},
{"id":"botswana_1","countryId":"botswana","name":"Eastern Botswana","cap":false},
{"id":"botswana_2","countryId":"botswana","name":"Ghanzi","cap":false},
{"id":"botswana_3","countryId":"botswana","name":"Kgalagadi","cap":false},
{"id":"botswana_4","countryId":"botswana","name":"Northwestern Botswana","cap":false},
{"id":"botswana_5","countryId":"botswana","name":"Southeastern Botswana","cap":true},
{"id":"brazil_1","countryId":"brazil","name":"Brasília","cap":true},
{"id":"brazil_2","countryId":"brazil","name":"Campo Grande","cap":false},
{"id":"brazil_3","countryId":"brazil","name":"Fortaleza","cap":false},
{"id":"brazil_4","countryId":"brazil","name":"Manaus","cap":false},
{"id":"brazil_5","countryId":"brazil","name":"Salvador","cap":false},
{"id":"brazil_6","countryId":"brazil","name":"São Paulo","cap":false},
{"id":"brunei_1","countryId":"brunei","name":"Brunei","cap":true},
{"id":"bulgaria_1","countryId":"bulgaria","name":"Haskovo & Burgas","cap":false},
{"id":"bulgaria_2","countryId":"bulgaria","name":"Montana & Lovech","cap":false},
{"id":"bulgaria_3","countryId":"bulgaria","name":"Razgrad & Varna","cap":false},
{"id":"bulgaria_4","countryId":"bulgaria","name":"Sofia & Plovdiv","cap":true},
{"id":"burkina_faso_1","countryId":"burkina_faso","name":"Central Burkina Faso","cap":true},
{"id":"burkina_faso_2","countryId":"burkina_faso","name":"Eastern Burkina Faso","cap":false},
{"id":"burkina_faso_3","countryId":"burkina_faso","name":"Western Burkina Faso","cap":false},
{"id":"burundi_1","countryId":"burundi","name":"Burundi","cap":true},
{"id":"cambodia_1","countryId":"cambodia","name":"Battambang","cap":false},
{"id":"cambodia_2","countryId":"cambodia","name":"Phnom Penh","cap":true},
{"id":"cambodia_3","countryId":"cambodia","name":"Siem Reap","cap":false},
{"id":"cambodia_4","countryId":"cambodia","name":"Stung Treng","cap":false},
{"id":"cameroon_1","countryId":"cameroon","name":"Eastern Cameroon","cap":false},
{"id":"cameroon_2","countryId":"cameroon","name":"Northern Cameroon","cap":false},
{"id":"cameroon_3","countryId":"cameroon","name":"Southern Cameroon","cap":false},
{"id":"cameroon_4","countryId":"cameroon","name":"Western Cameroon","cap":false},
{"id":"cameroon_5","countryId":"cameroon","name":"Yaoundé","cap":true},
{"id":"canada_1","countryId":"canada","name":"Canadian Plains","cap":false},
{"id":"canada_2","countryId":"canada","name":"Canadian Territories","cap":false},
{"id":"canada_3","countryId":"canada","name":"Ontario","cap":true},
{"id":"cape_verde_1","countryId":"cape_verde","name":"Cape Verde","cap":true},
{"id":"central_african_republic_1","countryId":"central_african_republic","name":"Kotto","cap":false},
{"id":"central_african_republic_2","countryId":"central_african_republic","name":"Mbomou","cap":false},
{"id":"central_african_republic_3","countryId":"central_african_republic","name":"Ouham","cap":false},
{"id":"central_african_republic_4","countryId":"central_african_republic","name":"Southwestern Central Africa","cap":true},
{"id":"chad_1","countryId":"chad","name":"Borkou","cap":false},
{"id":"chad_2","countryId":"chad","name":"Chari and Salamat","cap":false},
{"id":"chad_3","countryId":"chad","name":"Eastern Chad","cap":false},
{"id":"chad_4","countryId":"chad","name":"Ennedi","cap":false},
{"id":"chad_5","countryId":"chad","name":"Tibesti","cap":false},
{"id":"chad_6","countryId":"chad","name":"Western Chad","cap":true},
{"id":"chile_1","countryId":"chile","name":"Antofagasta","cap":false},
{"id":"chile_2","countryId":"chile","name":"La Serena","cap":false},
{"id":"chile_3","countryId":"chile","name":"Puerto Montt","cap":false},
{"id":"chile_4","countryId":"chile","name":"Santiago","cap":true},
{"id":"chile_5","countryId":"chile","name":"Temuco","cap":false},
{"id":"china_1","countryId":"china","name":"Gansu","cap":false},
{"id":"china_2","countryId":"china","name":"Inner mongolia","cap":false},
{"id":"china_3","countryId":"china","name":"Northeastern China","cap":true},
{"id":"china_4","countryId":"china","name":"Tibet","cap":false},
{"id":"china_5","countryId":"china","name":"Xinjiang","cap":false},
{"id":"china_6","countryId":"china","name":"Yunnan Guizhou","cap":false},
{"id":"colombia_1","countryId":"colombia","name":"Colombian Amazon","cap":false},
{"id":"colombia_2","countryId":"colombia","name":"Colombian Andes","cap":true},
{"id":"colombia_3","countryId":"colombia","name":"Colombian Caribbean","cap":false},
{"id":"colombia_4","countryId":"colombia","name":"Colombian Orinoco","cap":false},
{"id":"colombia_5","countryId":"colombia","name":"Colombian Pacific","cap":false},
{"id":"comoros_1","countryId":"comoros","name":"Comoros","cap":true},
{"id":"costa_rica_1","countryId":"costa_rica","name":"Eastern Costa Rica","cap":true},
{"id":"costa_rica_2","countryId":"costa_rica","name":"Western Costa Rica","cap":false},
{"id":"croatia_1","countryId":"croatia","name":"Continental Croatia","cap":true},
{"id":"croatia_2","countryId":"croatia","name":"Dalmatia","cap":false},
{"id":"croatia_3","countryId":"croatia","name":"Istria & Kvarner","cap":false},
{"id":"croatia_4","countryId":"croatia","name":"Slavonia","cap":false},
{"id":"cuba_1","countryId":"cuba","name":"Central Cuba","cap":false},
{"id":"cuba_2","countryId":"cuba","name":"Eastern Cuba","cap":false},
{"id":"cuba_3","countryId":"cuba","name":"Western Cuba","cap":true},
{"id":"cyprus_1","countryId":"cyprus","name":"Cyprus","cap":true},
{"id":"czechia_1","countryId":"czechia","name":"Bohemia & Vysocina","cap":true},
{"id":"czechia_2","countryId":"czechia","name":"Moravia","cap":false},
{"id":"czechia_3","countryId":"czechia","name":"Northeastern Czechia","cap":false},
{"id":"czechia_4","countryId":"czechia","name":"Western Czechia","cap":false},
{"id":"denmark_1","countryId":"denmark","name":"Funen","cap":false},
{"id":"denmark_2","countryId":"denmark","name":"Jutland","cap":false},
{"id":"denmark_3","countryId":"denmark","name":"Zealand","cap":true},
{"id":"djibouti_1","countryId":"djibouti","name":"Djibouti","cap":true},
{"id":"dominica_1","countryId":"dominica","name":"Dominica","cap":true},
{"id":"dominican_republic_1","countryId":"dominican_republic","name":"Dominican Republic","cap":true},
{"id":"dr_congo_1","countryId":"dr_congo","name":"Kasai","cap":false},
{"id":"dr_congo_2","countryId":"dr_congo","name":"Katanga","cap":false},
{"id":"dr_congo_3","countryId":"dr_congo","name":"Kinshasa","cap":true},
{"id":"dr_congo_4","countryId":"dr_congo","name":"Kivu","cap":false},
{"id":"dr_congo_5","countryId":"dr_congo","name":"Orientale","cap":false},
{"id":"dr_congo_6","countryId":"dr_congo","name":"Équateur","cap":false},
{"id":"ecuador_1","countryId":"ecuador","name":"Ecuadorian Amazon","cap":false},
{"id":"ecuador_2","countryId":"ecuador","name":"Ecuadorian Coast","cap":false},
{"id":"ecuador_3","countryId":"ecuador","name":"Ecuadorian Islands","cap":false},
{"id":"egypt_1","countryId":"egypt","name":"Central Egypt","cap":true},
{"id":"egypt_2","countryId":"egypt","name":"Lower Egypt","cap":false},
{"id":"egypt_3","countryId":"egypt","name":"New Valley","cap":false},
{"id":"egypt_4","countryId":"egypt","name":"Red Sea Coast","cap":false},
{"id":"egypt_5","countryId":"egypt","name":"Sinai","cap":false},
{"id":"egypt_6","countryId":"egypt","name":"Upper egypt","cap":false},
{"id":"el_salvador_1","countryId":"el_salvador","name":"Eastern El Salvador","cap":false},
{"id":"el_salvador_2","countryId":"el_salvador","name":"Western El Salvador","cap":true},
{"id":"equatorial_guinea_1","countryId":"equatorial_guinea","name":"Bioko","cap":true},
{"id":"equatorial_guinea_2","countryId":"equatorial_guinea","name":"Continental Equatorial Guinea","cap":false},
{"id":"eritrea_1","countryId":"eritrea","name":"Central Eritrea","cap":true},
{"id":"eritrea_2","countryId":"eritrea","name":"Red Sea Region","cap":false},
{"id":"estonia_1","countryId":"estonia","name":"Hiiu & Saare","cap":false},
{"id":"estonia_2","countryId":"estonia","name":"Northern Estonia","cap":true},
{"id":"estonia_3","countryId":"estonia","name":"Southeastern Estonia","cap":false},
{"id":"estonia_4","countryId":"estonia","name":"Western Estonia","cap":false},
{"id":"eswatini_1","countryId":"eswatini","name":"Eswatini","cap":true},
{"id":"ethiopia_1","countryId":"ethiopia","name":"Amhara","cap":false},
{"id":"ethiopia_2","countryId":"ethiopia","name":"Oromia","cap":true},
{"id":"ethiopia_3","countryId":"ethiopia","name":"Sidama","cap":false},
{"id":"ethiopia_4","countryId":"ethiopia","name":"Somali Region","cap":false},
{"id":"ethiopia_5","countryId":"ethiopia","name":"Tigray and Afar","cap":false},
{"id":"fiji_1","countryId":"fiji","name":"Fiji","cap":true},
{"id":"finland_1","countryId":"finland","name":"Central Finland","cap":false},
{"id":"finland_2","countryId":"finland","name":"Eastern Finland","cap":false},
{"id":"finland_3","countryId":"finland","name":"Northern Finland","cap":false},
{"id":"finland_4","countryId":"finland","name":"Southern Finland","cap":true},
{"id":"finland_5","countryId":"finland","name":"Western Finland","cap":false},
{"id":"france_1","countryId":"france","name":"Brittany","cap":false},
{"id":"france_2","countryId":"france","name":"Central France","cap":false},
{"id":"france_3","countryId":"france","name":"Eastern France","cap":false},
{"id":"france_4","countryId":"france","name":"Ile-de-France","cap":true},
{"id":"france_5","countryId":"france","name":"Réunion","cap":false},
{"id":"gabon_1","countryId":"gabon","name":"Central Gabon","cap":true},
{"id":"gabon_2","countryId":"gabon","name":"Ogooué","cap":false},
{"id":"gambia_1","countryId":"gambia","name":"Gambia","cap":true},
{"id":"georgia_1","countryId":"georgia","name":"Abkhazia","cap":false},
{"id":"georgia_2","countryId":"georgia","name":"Guria and Ajaria","cap":false},
{"id":"georgia_3","countryId":"georgia","name":"Imereti","cap":false},
{"id":"georgia_4","countryId":"georgia","name":"Kakheti","cap":false},
{"id":"georgia_5","countryId":"georgia","name":"Tbilisi","cap":true},
{"id":"germany_1","countryId":"germany","name":"Baden-Württemberg","cap":false},
{"id":"germany_2","countryId":"germany","name":"Bavaria","cap":false},
{"id":"germany_3","countryId":"germany","name":"Brandenburg","cap":true},
{"id":"germany_4","countryId":"germany","name":"Lower Saxony","cap":false},
{"id":"germany_5","countryId":"germany","name":"Rhine","cap":false},
{"id":"germany_6","countryId":"germany","name":"Saxony","cap":false},
{"id":"ghana_1","countryId":"ghana","name":"Brong-Ahafo","cap":false},
{"id":"ghana_2","countryId":"ghana","name":"Eastern Ghana","cap":false},
{"id":"ghana_3","countryId":"ghana","name":"Northern Ghana","cap":true},
{"id":"ghana_4","countryId":"ghana","name":"Western Ghana","cap":false},
{"id":"greece_1","countryId":"greece","name":"Aegean Islands","cap":false},
{"id":"greece_2","countryId":"greece","name":"Crete","cap":false},
{"id":"greece_3","countryId":"greece","name":"Epirus","cap":false},
{"id":"greece_4","countryId":"greece","name":"Macedonia","cap":false},
{"id":"greece_5","countryId":"greece","name":"Peloponnese","cap":false},
{"id":"greece_6","countryId":"greece","name":"Thessaly","cap":true},
{"id":"grenada_1","countryId":"grenada","name":"Grenada","cap":true},
{"id":"guatemala_1","countryId":"guatemala","name":"Northern Guatemala","cap":false},
{"id":"guatemala_2","countryId":"guatemala","name":"Southern Guatemala","cap":true},
{"id":"guinea_1","countryId":"guinea","name":"Boké and Labé","cap":false},
{"id":"guinea_2","countryId":"guinea","name":"Faranah","cap":false},
{"id":"guinea_3","countryId":"guinea","name":"Kankan","cap":false},
{"id":"guinea_4","countryId":"guinea","name":"Kindia and Mamou","cap":true},
{"id":"guinea_5","countryId":"guinea","name":"Nzérékoré","cap":false},
{"id":"guinea_bissau_1","countryId":"guinea_bissau","name":"Guinea-Bissau","cap":true},
{"id":"guyana_1","countryId":"guyana","name":"Central Guyana","cap":true},
{"id":"guyana_2","countryId":"guyana","name":"East Guyana","cap":false},
{"id":"guyana_3","countryId":"guyana","name":"West Guyana","cap":false},
{"id":"haiti_1","countryId":"haiti","name":"Haiti","cap":true},
{"id":"honduras_1","countryId":"honduras","name":"Eastern Honduras","cap":false},
{"id":"honduras_2","countryId":"honduras","name":"Western Honduras","cap":true},
{"id":"hungary_1","countryId":"hungary","name":"Great Plains","cap":false},
{"id":"hungary_2","countryId":"hungary","name":"Northern Hungary","cap":false},
{"id":"hungary_3","countryId":"hungary","name":"Pest","cap":true},
{"id":"hungary_4","countryId":"hungary","name":"Transdanubia","cap":false},
{"id":"iceland_1","countryId":"iceland","name":"Eastern Iceland","cap":false},
{"id":"iceland_2","countryId":"iceland","name":"Northeastern Iceland","cap":false},
{"id":"iceland_3","countryId":"iceland","name":"Southern Iceland","cap":false},
{"id":"iceland_4","countryId":"iceland","name":"Western Iceland","cap":true},
{"id":"india_1","countryId":"india","name":"Dravida","cap":false},
{"id":"india_2","countryId":"india","name":"Gujarat","cap":false},
{"id":"india_3","countryId":"india","name":"Madhya Pradesh","cap":false},
{"id":"india_4","countryId":"india","name":"Maratha","cap":false},
{"id":"india_5","countryId":"india","name":"Northeastern India","cap":false},
{"id":"india_6","countryId":"india","name":"Uttar Pradesh","cap":true},
{"id":"indonesia_1","countryId":"indonesia","name":"Java","cap":true},
{"id":"indonesia_2","countryId":"indonesia","name":"Kalimantan","cap":false},
{"id":"indonesia_3","countryId":"indonesia","name":"Maluku","cap":false},
{"id":"indonesia_4","countryId":"indonesia","name":"Papua","cap":false},
{"id":"indonesia_5","countryId":"indonesia","name":"Sulawesi","cap":false},
{"id":"indonesia_6","countryId":"indonesia","name":"Sumatra","cap":false},
{"id":"iran_1","countryId":"iran","name":"Central Iran","cap":false},
{"id":"iran_2","countryId":"iran","name":"Iranian Azerbaijan","cap":false},
{"id":"iran_3","countryId":"iran","name":"Iranian Balochistan","cap":false},
{"id":"iran_4","countryId":"iran","name":"Khorasan","cap":false},
{"id":"iran_5","countryId":"iran","name":"Persian Gulf Coast","cap":false},
{"id":"iran_6","countryId":"iran","name":"Tehran","cap":true},
{"id":"iraq_1","countryId":"iraq","name":"Al Anbar","cap":false},
{"id":"iraq_2","countryId":"iraq","name":"Baghdad","cap":true},
{"id":"iraq_3","countryId":"iraq","name":"Gulf Region","cap":false},
{"id":"iraq_4","countryId":"iraq","name":"Northern Iraq","cap":false},
{"id":"ireland_1","countryId":"ireland","name":"Connacht","cap":false},
{"id":"ireland_2","countryId":"ireland","name":"Leinster","cap":true},
{"id":"ireland_3","countryId":"ireland","name":"Munster","cap":false},
{"id":"ireland_4","countryId":"ireland","name":"Ulster","cap":false},
{"id":"israel_1","countryId":"israel","name":"Jerusalem","cap":true},
{"id":"israel_2","countryId":"israel","name":"Northern District","cap":false},
{"id":"israel_3","countryId":"israel","name":"Southern District","cap":false},
{"id":"italy_1","countryId":"italy","name":"Lazio","cap":true},
{"id":"italy_2","countryId":"italy","name":"Naples","cap":false},
{"id":"italy_3","countryId":"italy","name":"Northeastern Italy","cap":false},
{"id":"italy_4","countryId":"italy","name":"Romagna & Tuscany","cap":false},
{"id":"italy_5","countryId":"italy","name":"Sardinia","cap":false},
{"id":"italy_6","countryId":"italy","name":"Sicily","cap":false},
{"id":"ivory_coast_1","countryId":"ivory_coast","name":"Northeastern Côte d'Ivoire","cap":true},
{"id":"ivory_coast_2","countryId":"ivory_coast","name":"Northwestern Côte d'Ivoire","cap":false},
{"id":"ivory_coast_3","countryId":"ivory_coast","name":"Southeastern Côte d'Ivoire","cap":false},
{"id":"ivory_coast_4","countryId":"ivory_coast","name":"Southwestern Côte d'Ivoire","cap":false},
{"id":"jamaica_1","countryId":"jamaica","name":"Jamaica","cap":true},
{"id":"japan_1","countryId":"japan","name":"Chubu","cap":false},
{"id":"japan_2","countryId":"japan","name":"Hokkaido","cap":false},
{"id":"japan_3","countryId":"japan","name":"Kanto","cap":true},
{"id":"japan_4","countryId":"japan","name":"Kyushu","cap":false},
{"id":"japan_5","countryId":"japan","name":"Shikoku","cap":false},
{"id":"japan_6","countryId":"japan","name":"Tohoku","cap":false},
{"id":"jordan_1","countryId":"jordan","name":"Al Karak","cap":false},
{"id":"jordan_2","countryId":"jordan","name":"Amman","cap":true},
{"id":"jordan_3","countryId":"jordan","name":"Irbid","cap":false},
{"id":"jordan_4","countryId":"jordan","name":"Zarqa","cap":false},
{"id":"kazakhstan_1","countryId":"kazakhstan","name":"Aktobe","cap":false},
{"id":"kazakhstan_2","countryId":"kazakhstan","name":"Astana","cap":true},
{"id":"kazakhstan_3","countryId":"kazakhstan","name":"East Kazakhstan","cap":false},
{"id":"kazakhstan_4","countryId":"kazakhstan","name":"Turkistan","cap":false},
{"id":"kazakhstan_5","countryId":"kazakhstan","name":"Ulytau","cap":false},
{"id":"kazakhstan_6","countryId":"kazakhstan","name":"West Kazakhstan","cap":false},
{"id":"kenya_1","countryId":"kenya","name":"Central Kenya","cap":true},
{"id":"kenya_2","countryId":"kenya","name":"Kenyan Coast","cap":false},
{"id":"kenya_3","countryId":"kenya","name":"North Eastern Kenya","cap":false},
{"id":"kenya_4","countryId":"kenya","name":"Rift Valley","cap":false},
{"id":"kenya_5","countryId":"kenya","name":"Western Kenya","cap":false},
{"id":"kiribati_1","countryId":"kiribati","name":"Kiribati","cap":true},
{"id":"kosovo_1","countryId":"kosovo","name":"Kosovo","cap":true},
{"id":"kuwait_1","countryId":"kuwait","name":"Kuwait","cap":true},
{"id":"kyrgyzstan_1","countryId":"kyrgyzstan","name":"Bishkek","cap":true},
{"id":"kyrgyzstan_2","countryId":"kyrgyzstan","name":"Naryn","cap":false},
{"id":"kyrgyzstan_3","countryId":"kyrgyzstan","name":"Osh","cap":false},
{"id":"laos_1","countryId":"laos","name":"Luang Namtha","cap":false},
{"id":"laos_2","countryId":"laos","name":"Sekong","cap":false},
{"id":"laos_3","countryId":"laos","name":"Vientiane","cap":true},
{"id":"latvia_1","countryId":"latvia","name":"Kurzeme","cap":false},
{"id":"latvia_2","countryId":"latvia","name":"Pieriga","cap":true},
{"id":"latvia_3","countryId":"latvia","name":"Vidzeme","cap":false},
{"id":"latvia_4","countryId":"latvia","name":"Zemgale & Latgale","cap":false},
{"id":"lebanon_1","countryId":"lebanon","name":"Beirut","cap":true},
{"id":"lebanon_2","countryId":"lebanon","name":"North Lebanon","cap":false},
{"id":"lebanon_3","countryId":"lebanon","name":"South Lebanon","cap":false},
{"id":"lesotho_1","countryId":"lesotho","name":"Northern Lesotho","cap":false},
{"id":"lesotho_2","countryId":"lesotho","name":"Southern Lesotho","cap":true},
{"id":"liberia_1","countryId":"liberia","name":"Northeastern Liberia","cap":false},
{"id":"liberia_2","countryId":"liberia","name":"Southeastern Liberia","cap":false},
{"id":"liberia_3","countryId":"liberia","name":"Western Liberia","cap":true},
{"id":"libya_1","countryId":"libya","name":"Northeastern Libya","cap":false},
{"id":"libya_2","countryId":"libya","name":"Northwestern Libya","cap":true},
{"id":"libya_3","countryId":"libya","name":"Southeastern Libya","cap":false},
{"id":"libya_4","countryId":"libya","name":"Southwestern Libya","cap":false},
{"id":"liechtenstein_1","countryId":"liechtenstein","name":"Liechtenstein","cap":true},
{"id":"lithuania_1","countryId":"lithuania","name":"Aukštaitija","cap":false},
{"id":"lithuania_2","countryId":"lithuania","name":"Dzūkija","cap":true},
{"id":"lithuania_3","countryId":"lithuania","name":"Samogitia","cap":false},
{"id":"lithuania_4","countryId":"lithuania","name":"Suvalkija","cap":false},
{"id":"luxembourg_1","countryId":"luxembourg","name":"Luxembourg","cap":true},
{"id":"madagascar_1","countryId":"madagascar","name":"Antananarivo","cap":true},
{"id":"madagascar_2","countryId":"madagascar","name":"Antsiranana","cap":false},
{"id":"madagascar_3","countryId":"madagascar","name":"Fianarantsoa","cap":false},
{"id":"madagascar_4","countryId":"madagascar","name":"Mahajanga","cap":false},
{"id":"madagascar_5","countryId":"madagascar","name":"Toamasina","cap":false},
{"id":"madagascar_6","countryId":"madagascar","name":"Toliara","cap":false},
{"id":"malawi_1","countryId":"malawi","name":"Central Malawi","cap":true},
{"id":"malawi_2","countryId":"malawi","name":"Northern Malawi","cap":false},
{"id":"malawi_3","countryId":"malawi","name":"Southern Malawi","cap":false},
{"id":"malaysia_1","countryId":"malaysia","name":"Kedah and Perak","cap":false},
{"id":"malaysia_2","countryId":"malaysia","name":"Kuala Lumpur","cap":true},
{"id":"malaysia_3","countryId":"malaysia","name":"Pahang","cap":false},
{"id":"malaysia_4","countryId":"malaysia","name":"Sabah","cap":false},
{"id":"malaysia_5","countryId":"malaysia","name":"Sarawak","cap":false},
{"id":"maldives_1","countryId":"maldives","name":"Maldives","cap":true},
{"id":"mali_1","countryId":"mali","name":"Kayes","cap":false},
{"id":"mali_2","countryId":"mali","name":"Kidal","cap":false},
{"id":"mali_3","countryId":"mali","name":"Koulikoro & Sikasso","cap":true},
{"id":"mali_4","countryId":"mali","name":"Ménaka & Gao","cap":false},
{"id":"mali_5","countryId":"mali","name":"Ségou & Mopti","cap":false},
{"id":"mali_6","countryId":"mali","name":"Tombouctou","cap":false},
{"id":"malta_1","countryId":"malta","name":"Malta","cap":true},
{"id":"marshall_islands_1","countryId":"marshall_islands","name":"Marshall Islands","cap":true},
{"id":"mauritania_1","countryId":"mauritania","name":"Adrar","cap":false},
{"id":"mauritania_2","countryId":"mauritania","name":"Southeastern Mauritania","cap":false},
{"id":"mauritania_3","countryId":"mauritania","name":"Tiris Zemmour","cap":false},
{"id":"mauritania_4","countryId":"mauritania","name":"Western Mauritania","cap":true},
{"id":"mauritius_1","countryId":"mauritius","name":"Mauritius","cap":true},
{"id":"mexico_1","countryId":"mexico","name":"Jalisco & Michoacan","cap":false},
{"id":"mexico_2","countryId":"mexico","name":"Mexico City","cap":true},
{"id":"mexico_3","countryId":"mexico","name":"Northeastern Mexico","cap":false},
{"id":"mexico_4","countryId":"mexico","name":"Northwestern Mexico","cap":false},
{"id":"mexico_5","countryId":"mexico","name":"Yucatan Peninsula","cap":false},
{"id":"mexico_6","countryId":"mexico","name":"Zacatecas & San Luis Potosi","cap":false},
{"id":"micronesia_1","countryId":"micronesia","name":"Micronesia","cap":true},
{"id":"moldova_1","countryId":"moldova","name":"Moldova","cap":true},
{"id":"monaco_1","countryId":"monaco","name":"Monaco","cap":true},
{"id":"mongolia_1","countryId":"mongolia","name":"Eastern Mongolia","cap":false},
{"id":"mongolia_2","countryId":"mongolia","name":"Northern Mongolia","cap":false},
{"id":"mongolia_3","countryId":"mongolia","name":"Southern Mongolia","cap":false},
{"id":"mongolia_4","countryId":"mongolia","name":"Ulaanbaatar","cap":true},
{"id":"mongolia_5","countryId":"mongolia","name":"Western Mongolia","cap":false},
{"id":"montenegro_1","countryId":"montenegro","name":"Montenegro","cap":true},
{"id":"morocco_1","countryId":"morocco","name":"Central Atlantic Region","cap":true},
{"id":"morocco_2","countryId":"morocco","name":"Dakhla-Oued Ed-Dahab","cap":false},
{"id":"morocco_3","countryId":"morocco","name":"Drâa-Tafilalet","cap":false},
{"id":"morocco_4","countryId":"morocco","name":"Laâyoune-Sakia El Hamra","cap":false},
{"id":"morocco_5","countryId":"morocco","name":"Northern Morocco","cap":false},
{"id":"morocco_6","countryId":"morocco","name":"Souss-Massa","cap":false},
{"id":"mozambique_1","countryId":"mozambique","name":"Cabo Delgado & Niassa","cap":false},
{"id":"mozambique_2","countryId":"mozambique","name":"Manica","cap":false},
{"id":"mozambique_3","countryId":"mozambique","name":"Maputo","cap":true},
{"id":"mozambique_4","countryId":"mozambique","name":"Sofala","cap":false},
{"id":"mozambique_5","countryId":"mozambique","name":"Tete","cap":false},
{"id":"mozambique_6","countryId":"mozambique","name":"Zambezia & Nampula","cap":false},
{"id":"myanmar_1","countryId":"myanmar","name":"Kachin and Sagaing","cap":false},
{"id":"myanmar_2","countryId":"myanmar","name":"Nay Pyi Taw","cap":true},
{"id":"myanmar_3","countryId":"myanmar","name":"Rakhine and Chin","cap":false},
{"id":"myanmar_4","countryId":"myanmar","name":"Shan State","cap":false},
{"id":"myanmar_5","countryId":"myanmar","name":"Yangon","cap":false},
{"id":"namibia_1","countryId":"namibia","name":"Eastern Namibia","cap":true},
{"id":"namibia_2","countryId":"namibia","name":"Hardap","cap":false},
{"id":"namibia_3","countryId":"namibia","name":"Karas","cap":false},
{"id":"namibia_4","countryId":"namibia","name":"Kunene-Erongo","cap":false},
{"id":"namibia_5","countryId":"namibia","name":"Northern Namibia","cap":false},
{"id":"nauru_1","countryId":"nauru","name":"Nauru","cap":true},
{"id":"nepal_1","countryId":"nepal","name":"Northern Nepal","cap":false},
{"id":"nepal_2","countryId":"nepal","name":"Southeastern Nepal","cap":false},
{"id":"nepal_3","countryId":"nepal","name":"Southwestern Nepal","cap":true},
{"id":"netherlands_1","countryId":"netherlands","name":"Friesland","cap":false},
{"id":"netherlands_2","countryId":"netherlands","name":"Gelderland-Brabant","cap":false},
{"id":"netherlands_3","countryId":"netherlands","name":"Holland","cap":true},
{"id":"new_zealand_1","countryId":"new_zealand","name":"North Island","cap":true},
{"id":"new_zealand_2","countryId":"new_zealand","name":"South Island","cap":false},
{"id":"nicaragua_1","countryId":"nicaragua","name":"Eastern Nicaragua","cap":false},
{"id":"nicaragua_2","countryId":"nicaragua","name":"Western Nicaragua","cap":true},
{"id":"niger_1","countryId":"niger","name":"Agadez","cap":false},
{"id":"niger_2","countryId":"niger","name":"Tillabéri and Tahoua","cap":true},
{"id":"niger_3","countryId":"niger","name":"Zinder and Diffa","cap":false},
{"id":"nigeria_1","countryId":"nigeria","name":"Abuja","cap":true},
{"id":"nigeria_2","countryId":"nigeria","name":"Benue and Taraba","cap":false},
{"id":"nigeria_3","countryId":"nigeria","name":"Borno and Yobe","cap":false},
{"id":"nigeria_4","countryId":"nigeria","name":"Kano","cap":false},
{"id":"nigeria_5","countryId":"nigeria","name":"Kogi and Edo","cap":false},
{"id":"nigeria_6","countryId":"nigeria","name":"Sokoto and Niger","cap":false},
{"id":"north_korea_1","countryId":"north_korea","name":"Hamgyong","cap":false},
{"id":"north_korea_2","countryId":"north_korea","name":"Hwanghae","cap":false},
{"id":"north_korea_3","countryId":"north_korea","name":"Jagang","cap":false},
{"id":"north_korea_4","countryId":"north_korea","name":"Pyongyang","cap":true},
{"id":"north_macedonia_1","countryId":"north_macedonia","name":"Northern Macedonia","cap":true},
{"id":"norway_1","countryId":"norway","name":"Central Norway","cap":false},
{"id":"norway_2","countryId":"norway","name":"Ostlandet","cap":true},
{"id":"norway_3","countryId":"norway","name":"Sorlandet","cap":false},
{"id":"norway_4","countryId":"norway","name":"Svalbard","cap":false},
{"id":"norway_5","countryId":"norway","name":"Vestlandet","cap":false},
{"id":"oman_1","countryId":"oman","name":"Al Wusta","cap":false},
{"id":"oman_2","countryId":"oman","name":"Dhofar","cap":false},
{"id":"oman_3","countryId":"oman","name":"Musandam","cap":false},
{"id":"oman_4","countryId":"oman","name":"Muscat","cap":true},
{"id":"oman_5","countryId":"oman","name":"Northern Oman","cap":false},
{"id":"pakistan_1","countryId":"pakistan","name":"Azad Kashmir","cap":false},
{"id":"pakistan_2","countryId":"pakistan","name":"Gilgit-Baltistan","cap":false},
{"id":"pakistan_3","countryId":"pakistan","name":"Khyber Pakhtunkhwa","cap":false},
{"id":"pakistan_4","countryId":"pakistan","name":"Pakistani Balochistan","cap":false},
{"id":"pakistan_5","countryId":"pakistan","name":"Punjab","cap":true},
{"id":"pakistan_6","countryId":"pakistan","name":"Sindh","cap":false},
{"id":"palau_1","countryId":"palau","name":"Palau","cap":true},
{"id":"palestine_1","countryId":"palestine","name":"Gaza Strip","cap":false},
{"id":"palestine_2","countryId":"palestine","name":"West Bank","cap":true},
{"id":"panama_1","countryId":"panama","name":"Eastern Panama","cap":true},
{"id":"panama_2","countryId":"panama","name":"Western Panama","cap":false},
{"id":"papua_new_guinea_1","countryId":"papua_new_guinea","name":"Mamose","cap":false},
{"id":"papua_new_guinea_2","countryId":"papua_new_guinea","name":"Papua Islands","cap":false},
{"id":"papua_new_guinea_3","countryId":"papua_new_guinea","name":"Papua and Highlands","cap":true},
{"id":"paraguay_1","countryId":"paraguay","name":"Central Paraguay","cap":true},
{"id":"paraguay_2","countryId":"paraguay","name":"Eastern Paraguay","cap":false},
{"id":"paraguay_3","countryId":"paraguay","name":"Northern Paraguay","cap":false},
{"id":"peru_1","countryId":"peru","name":"Arequipa","cap":false},
{"id":"peru_2","countryId":"peru","name":"Cuzco","cap":false},
{"id":"peru_3","countryId":"peru","name":"Lima","cap":true},
{"id":"peru_4","countryId":"peru","name":"Trujillo","cap":false},
{"id":"philippines_1","countryId":"philippines","name":"Luzon","cap":true},
{"id":"philippines_2","countryId":"philippines","name":"Mindanao","cap":false},
{"id":"philippines_3","countryId":"philippines","name":"Visayas","cap":false},
{"id":"poland_1","countryId":"poland","name":"Greater Poland","cap":false},
{"id":"poland_2","countryId":"poland","name":"Lesser Poland","cap":false},
{"id":"poland_3","countryId":"poland","name":"Masovia","cap":true},
{"id":"poland_4","countryId":"poland","name":"Northeastern Poland","cap":false},
{"id":"poland_5","countryId":"poland","name":"Pomerania","cap":false},
{"id":"poland_6","countryId":"poland","name":"Silesia","cap":false},
{"id":"portugal_1","countryId":"portugal","name":"Algarve","cap":false},
{"id":"portugal_2","countryId":"portugal","name":"Azores","cap":false},
{"id":"portugal_3","countryId":"portugal","name":"Central Portugal","cap":false},
{"id":"portugal_4","countryId":"portugal","name":"Lisbon & Alentejo","cap":true},
{"id":"portugal_5","countryId":"portugal","name":"Madeira","cap":false},
{"id":"portugal_6","countryId":"portugal","name":"Northern Portugal","cap":false},
{"id":"puerto_rico_1","countryId":"puerto_rico","name":"Puerto Rico","cap":true},
{"id":"qatar_1","countryId":"qatar","name":"Qatar","cap":true},
{"id":"republic_of_the_congo_1","countryId":"republic_of_the_congo","name":"Cuvette and Plateaux","cap":true},
{"id":"republic_of_the_congo_2","countryId":"republic_of_the_congo","name":"Sangha and Likouala","cap":false},
{"id":"republic_of_the_congo_3","countryId":"republic_of_the_congo","name":"Southern Congo","cap":false},
{"id":"romania_1","countryId":"romania","name":"Banat & Crișana","cap":false},
{"id":"romania_2","countryId":"romania","name":"Dobrogea","cap":false},
{"id":"romania_3","countryId":"romania","name":"Muntenia","cap":true},
{"id":"romania_4","countryId":"romania","name":"Oltenia","cap":false},
{"id":"romania_5","countryId":"romania","name":"Romanian Moldavia","cap":false},
{"id":"romania_6","countryId":"romania","name":"Transylvania","cap":false},
{"id":"russia_1","countryId":"russia","name":"Arctic Ural Northlands","cap":false},
{"id":"russia_2","countryId":"russia","name":"Kaliningrad","cap":false},
{"id":"russia_3","countryId":"russia","name":"Karelia","cap":false},
{"id":"russia_4","countryId":"russia","name":"Krasnoyarsk Krai","cap":false},
{"id":"russia_5","countryId":"russia","name":"Moscow","cap":true},
{"id":"russia_6","countryId":"russia","name":"Sakha Republic","cap":false},
{"id":"rwanda_1","countryId":"rwanda","name":"Rwanda","cap":true},
{"id":"saint_kitts_and_nevis_1","countryId":"saint_kitts_and_nevis","name":"Saint Kitts and Nevis","cap":true},
{"id":"saint_lucia_1","countryId":"saint_lucia","name":"Saint Lucia","cap":true},
{"id":"saint_vincent_and_the_grenadines_1","countryId":"saint_vincent_and_the_grenadines","name":"Saint Vincent and the Grenadines","cap":true},
{"id":"samoa_1","countryId":"samoa","name":"Samoa","cap":true},
{"id":"san_marino_1","countryId":"san_marino","name":"San Marino","cap":true},
{"id":"sao_tome_and_principe_1","countryId":"sao_tome_and_principe","name":"São Tomé and Príncipe","cap":true},
{"id":"saudi_arabia_1","countryId":"saudi_arabia","name":"Al Jawf","cap":false},
{"id":"saudi_arabia_2","countryId":"saudi_arabia","name":"Ar Riyad","cap":true},
{"id":"saudi_arabia_3","countryId":"saudi_arabia","name":"Ash Sharqiyah","cap":false},
{"id":"saudi_arabia_4","countryId":"saudi_arabia","name":"Asir","cap":false},
{"id":"saudi_arabia_5","countryId":"saudi_arabia","name":"Ha'il","cap":false},
{"id":"saudi_arabia_6","countryId":"saudi_arabia","name":"Makkah","cap":false},
{"id":"senegal_1","countryId":"senegal","name":"Central Senegal","cap":false},
{"id":"senegal_2","countryId":"senegal","name":"Dakar","cap":true},
{"id":"senegal_3","countryId":"senegal","name":"Northern Senegal","cap":false},
{"id":"senegal_4","countryId":"senegal","name":"Tambacounda","cap":false},
{"id":"serbia_1","countryId":"serbia","name":"Belgrade","cap":true},
{"id":"serbia_2","countryId":"serbia","name":"Eastern Serbia","cap":false},
{"id":"serbia_3","countryId":"serbia","name":"Vojvodina","cap":false},
{"id":"serbia_4","countryId":"serbia","name":"Western Serbia","cap":false},
{"id":"seychelles_1","countryId":"seychelles","name":"Seychelles","cap":true},
{"id":"sierra_leone_1","countryId":"sierra_leone","name":"Sierra Leone","cap":true},
{"id":"singapore_1","countryId":"singapore","name":"Singapore","cap":true},
{"id":"slovakia_1","countryId":"slovakia","name":"Presov & Kosice","cap":false},
{"id":"slovakia_2","countryId":"slovakia","name":"Western Slovakia","cap":true},
{"id":"slovakia_3","countryId":"slovakia","name":"Zilina & Banska Bystrica","cap":false},
{"id":"slovenia_1","countryId":"slovenia","name":"Slovenian Littoral","cap":true},
{"id":"slovenia_2","countryId":"slovenia","name":"Styria Carinthia","cap":false},
{"id":"solomon_islands_1","countryId":"solomon_islands","name":"Solomon Islands","cap":true},
{"id":"somalia_1","countryId":"somalia","name":"Bakool and Hiraan","cap":false},
{"id":"somalia_2","countryId":"somalia","name":"Bari and Sanaag","cap":false},
{"id":"somalia_3","countryId":"somalia","name":"Lower Juba","cap":false},
{"id":"somalia_4","countryId":"somalia","name":"Middle Shabelle","cap":true},
{"id":"somalia_5","countryId":"somalia","name":"Mudug and Nugaal","cap":false},
{"id":"somalia_6","countryId":"somalia","name":"Somaliland","cap":false},
{"id":"south_africa_1","countryId":"south_africa","name":"Free State","cap":true},
{"id":"south_africa_2","countryId":"south_africa","name":"KwaZulu-Natal","cap":false},
{"id":"south_africa_3","countryId":"south_africa","name":"Limpopo","cap":false},
{"id":"south_africa_4","countryId":"south_africa","name":"North West","cap":false},
{"id":"south_africa_5","countryId":"south_africa","name":"Northern Cape","cap":false},
{"id":"south_africa_6","countryId":"south_africa","name":"Southern Cape","cap":false},
{"id":"south_korea_1","countryId":"south_korea","name":"Eastern South Korea","cap":false},
{"id":"south_korea_2","countryId":"south_korea","name":"Northern South Korea","cap":true},
{"id":"south_korea_3","countryId":"south_korea","name":"Southern South Korea","cap":false},
{"id":"south_korea_4","countryId":"south_korea","name":"Western South Korea","cap":false},
{"id":"south_sudan_1","countryId":"south_sudan","name":"Bahr el Ghazal","cap":false},
{"id":"south_sudan_2","countryId":"south_sudan","name":"Equatoria","cap":true},
{"id":"south_sudan_3","countryId":"south_sudan","name":"Upper Nile","cap":false},
{"id":"spain_1","countryId":"spain","name":"Andalusia","cap":false},
{"id":"spain_2","countryId":"spain","name":"Castile & León","cap":true},
{"id":"spain_3","countryId":"spain","name":"Castilla-La Mancha","cap":false},
{"id":"spain_4","countryId":"spain","name":"Catalonia","cap":false},
{"id":"spain_5","countryId":"spain","name":"Galicia","cap":false},
{"id":"spain_6","countryId":"spain","name":"Northern Spain","cap":false},
{"id":"sri_lanka_1","countryId":"sri_lanka","name":"Eastern Sri Lanka","cap":false},
{"id":"sri_lanka_2","countryId":"sri_lanka","name":"Western Sri Lanka","cap":true},
{"id":"sudan_1","countryId":"sudan","name":"Darfur","cap":false},
{"id":"sudan_2","countryId":"sudan","name":"Northern Sudan","cap":true},
{"id":"sudan_3","countryId":"sudan","name":"Nuba Mountains","cap":false},
{"id":"suriname_1","countryId":"suriname","name":"North Suriname","cap":true},
{"id":"suriname_2","countryId":"suriname","name":"South Suriname","cap":false},
{"id":"sweden_1","countryId":"sweden","name":"Dalarna & Värmland","cap":false},
{"id":"sweden_2","countryId":"sweden","name":"Jämtland","cap":false},
{"id":"sweden_3","countryId":"sweden","name":"Lappland","cap":false},
{"id":"sweden_4","countryId":"sweden","name":"Skåne & Halland","cap":false},
{"id":"sweden_5","countryId":"sweden","name":"Småland","cap":false},
{"id":"sweden_6","countryId":"sweden","name":"Uppland","cap":true},
{"id":"switzerland_1","countryId":"switzerland","name":"Bern","cap":true},
{"id":"switzerland_2","countryId":"switzerland","name":"Ticons Grisons","cap":false},
{"id":"switzerland_3","countryId":"switzerland","name":"Zurich","cap":false},
{"id":"syria_1","countryId":"syria","name":"Aleppo & Idlib","cap":false},
{"id":"syria_2","countryId":"syria","name":"Damascus","cap":true},
{"id":"syria_3","countryId":"syria","name":"Dayr az Zawr","cap":false},
{"id":"syria_4","countryId":"syria","name":"Homs & Hama","cap":false},
{"id":"syria_5","countryId":"syria","name":"Lattakia & Tartus","cap":false},
{"id":"taiwan_1","countryId":"taiwan","name":"Central Taiwan","cap":false},
{"id":"taiwan_2","countryId":"taiwan","name":"Eastern Taiwan","cap":false},
{"id":"taiwan_3","countryId":"taiwan","name":"Northern Taiwan","cap":true},
{"id":"taiwan_4","countryId":"taiwan","name":"Southern Taiwan","cap":false},
{"id":"tajikistan_1","countryId":"tajikistan","name":"Dushanbe","cap":true},
{"id":"tajikistan_2","countryId":"tajikistan","name":"Gorno-Badakhshan","cap":false},
{"id":"tajikistan_3","countryId":"tajikistan","name":"Khatlon","cap":false},
{"id":"tajikistan_4","countryId":"tajikistan","name":"Leninabad","cap":false},
{"id":"tanzania_1","countryId":"tanzania","name":"Central Tanzania","cap":true},
{"id":"tanzania_2","countryId":"tanzania","name":"Eastern Tanzania","cap":false},
{"id":"tanzania_3","countryId":"tanzania","name":"Lakes Region","cap":false},
{"id":"tanzania_4","countryId":"tanzania","name":"Northern Tanzania","cap":false},
{"id":"tanzania_5","countryId":"tanzania","name":"Southern Tanzania","cap":false},
{"id":"tanzania_6","countryId":"tanzania","name":"Western Tanzania","cap":false},
{"id":"thailand_1","countryId":"thailand","name":"Bangkok","cap":true},
{"id":"thailand_2","countryId":"thailand","name":"Chiang Mai","cap":false},
{"id":"thailand_3","countryId":"thailand","name":"Nakhon Ratchasima","cap":false},
{"id":"thailand_4","countryId":"thailand","name":"Nakhon Sawan","cap":false},
{"id":"thailand_5","countryId":"thailand","name":"Nakhon Si Thammarat","cap":false},
{"id":"timor_leste_1","countryId":"timor_leste","name":"Timor-Leste","cap":true},
{"id":"togo_1","countryId":"togo","name":"Togo","cap":true},
{"id":"tonga_1","countryId":"tonga","name":"Tonga","cap":true},
{"id":"trinidad_and_tobago_1","countryId":"trinidad_and_tobago","name":"Trinidad & Tobago","cap":true},
{"id":"tunisia_1","countryId":"tunisia","name":"Sfax","cap":false},
{"id":"tunisia_2","countryId":"tunisia","name":"Tataouine","cap":false},
{"id":"tunisia_3","countryId":"tunisia","name":"Tunis","cap":true},
{"id":"tunisia_4","countryId":"tunisia","name":"Tunisian Oasis","cap":false},
{"id":"turkey_1","countryId":"turkey","name":"Aegean Region","cap":false},
{"id":"turkey_2","countryId":"turkey","name":"Central Anatolia","cap":true},
{"id":"turkey_3","countryId":"turkey","name":"Eastern Anatolia","cap":false},
{"id":"turkey_4","countryId":"turkey","name":"Marmara","cap":false},
{"id":"turkey_5","countryId":"turkey","name":"Southeastern Anatolia","cap":false},
{"id":"turkey_6","countryId":"turkey","name":"Turkish Mediterranean Coast","cap":false},
{"id":"turkmenistan_1","countryId":"turkmenistan","name":"Ashgabat","cap":true},
{"id":"turkmenistan_2","countryId":"turkmenistan","name":"Balkan Region","cap":false},
{"id":"turkmenistan_3","countryId":"turkmenistan","name":"Daşoguz Region","cap":false},
{"id":"turkmenistan_4","countryId":"turkmenistan","name":"Lebap Region","cap":false},
{"id":"turkmenistan_5","countryId":"turkmenistan","name":"Mary Region","cap":false},
{"id":"tuvalu_1","countryId":"tuvalu","name":"Tuvalu","cap":true},
{"id":"uganda_1","countryId":"uganda","name":"Central Uganda","cap":true},
{"id":"uganda_2","countryId":"uganda","name":"Eastern Uganda","cap":false},
{"id":"uganda_3","countryId":"uganda","name":"Northern Uganda","cap":false},
{"id":"uganda_4","countryId":"uganda","name":"Western Uganda","cap":false},
{"id":"ukraine_1","countryId":"ukraine","name":"Central Ukraine","cap":true},
{"id":"ukraine_2","countryId":"ukraine","name":"Donbas","cap":false},
{"id":"ukraine_3","countryId":"ukraine","name":"Eastern Galicia","cap":false},
{"id":"ukraine_4","countryId":"ukraine","name":"Left-Bank Ukraine","cap":false},
{"id":"ukraine_5","countryId":"ukraine","name":"South-Eastern Ukraine","cap":false},
{"id":"ukraine_6","countryId":"ukraine","name":"Western Volyn","cap":false},
{"id":"united_arab_emirates_1","countryId":"united_arab_emirates","name":"Abu Dhabi","cap":true},
{"id":"united_arab_emirates_2","countryId":"united_arab_emirates","name":"Dubai","cap":false},
{"id":"united_kingdom_1","countryId":"united_kingdom","name":"Central England","cap":false},
{"id":"united_kingdom_2","countryId":"united_kingdom","name":"Northern Ireland","cap":false},
{"id":"united_kingdom_3","countryId":"united_kingdom","name":"Scotland","cap":false},
{"id":"united_kingdom_4","countryId":"united_kingdom","name":"South Georgia","cap":false},
{"id":"united_kingdom_5","countryId":"united_kingdom","name":"Southeastern England","cap":true},
{"id":"united_kingdom_6","countryId":"united_kingdom","name":"Wales","cap":false},
{"id":"united_states_1","countryId":"united_states","name":"Alaska","cap":false},
{"id":"united_states_2","countryId":"united_states","name":"American Atlantic Coast","cap":true},
{"id":"united_states_3","countryId":"united_states","name":"American Great Lakes","cap":false},
{"id":"united_states_4","countryId":"united_states","name":"American Pacific Coast","cap":false},
{"id":"united_states_5","countryId":"united_states","name":"Northwestern USA","cap":false},
{"id":"united_states_6","countryId":"united_states","name":"Southwestern USA","cap":false},
{"id":"uruguay_1","countryId":"uruguay","name":"Montevideo","cap":true},
{"id":"uruguay_2","countryId":"uruguay","name":"Salto","cap":false},
{"id":"uzbekistan_1","countryId":"uzbekistan","name":"Bukhoro","cap":false},
{"id":"uzbekistan_2","countryId":"uzbekistan","name":"Navoi","cap":false},
{"id":"uzbekistan_3","countryId":"uzbekistan","name":"Samarkand","cap":false},
{"id":"uzbekistan_4","countryId":"uzbekistan","name":"Tashkent","cap":true},
{"id":"uzbekistan_5","countryId":"uzbekistan","name":"Western Uzbekistan","cap":false},
{"id":"vanuatu_1","countryId":"vanuatu","name":"Vanuatu","cap":true},
{"id":"vatican_city_1","countryId":"vatican_city","name":"Vatican City","cap":true},
{"id":"venezuela_1","countryId":"venezuela","name":"Central Venezuela","cap":true},
{"id":"venezuela_2","countryId":"venezuela","name":"Eastern Venezuela","cap":false},
{"id":"venezuela_3","countryId":"venezuela","name":"Insular Venezuela","cap":false},
{"id":"venezuela_4","countryId":"venezuela","name":"Venezuelan Guyana","cap":false},
{"id":"venezuela_5","countryId":"venezuela","name":"Western Venezuela","cap":false},
{"id":"vietnam_1","countryId":"vietnam","name":"Da Nang","cap":false},
{"id":"vietnam_2","countryId":"vietnam","name":"Dien Bien Phu","cap":false},
{"id":"vietnam_3","countryId":"vietnam","name":"Dong Hoi","cap":false},
{"id":"vietnam_4","countryId":"vietnam","name":"Hanoi","cap":true},
{"id":"vietnam_5","countryId":"vietnam","name":"Ho Chi Minh City","cap":false},
{"id":"yemen_1","countryId":"yemen","name":"Aden","cap":false},
{"id":"yemen_2","countryId":"yemen","name":"Al Hodeidah","cap":false},
{"id":"yemen_3","countryId":"yemen","name":"Hadramwt","cap":false},
{"id":"yemen_4","countryId":"yemen","name":"Ma'rib","cap":false},
{"id":"yemen_5","countryId":"yemen","name":"Sana'a","cap":true},
{"id":"yemen_6","countryId":"yemen","name":"Socotra","cap":false},
{"id":"zambia_1","countryId":"zambia","name":"Copperbelt","cap":false},
{"id":"zambia_2","countryId":"zambia","name":"Luapula","cap":false},
{"id":"zambia_3","countryId":"zambia","name":"Lusaka","cap":true},
{"id":"zambia_4","countryId":"zambia","name":"Muchinga","cap":false},
{"id":"zambia_5","countryId":"zambia","name":"Western Zambia","cap":false},
{"id":"zimbabwe_1","countryId":"zimbabwe","name":"Eastern Mashonaland","cap":false},
{"id":"zimbabwe_2","countryId":"zimbabwe","name":"Midlands and Masvingo","cap":false},
{"id":"zimbabwe_3","countryId":"zimbabwe","name":"Western Mashonaland","cap":true}
];

// WORLD_NEIGHBORS: region id -> ids of the regions it borders (land), is a short sea hop from, or is bridged to (see tools/region-neighbors.js)
const WORLD_NEIGHBORS = {
"afghanistan_1":["afghanistan_2","afghanistan_3","afghanistan_4","afghanistan_5","pakistan_3"],
"afghanistan_2":["afghanistan_1","afghanistan_3","china_5","pakistan_2","pakistan_3","tajikistan_2","tajikistan_3"],
"afghanistan_3":["afghanistan_1","afghanistan_2","afghanistan_4","afghanistan_5","afghanistan_6","tajikistan_3","turkmenistan_4","turkmenistan_5","uzbekistan_3"],
"afghanistan_4":["afghanistan_1","afghanistan_3","afghanistan_5","pakistan_3","pakistan_4"],
"afghanistan_5":["afghanistan_1","afghanistan_3","afghanistan_4","afghanistan_6","iran_3","pakistan_4"],
"afghanistan_6":["afghanistan_3","afghanistan_5","iran_3","iran_4","turkmenistan_1","turkmenistan_5"],
"albania_1":["albania_2","kosovo_1","montenegro_1","north_macedonia_1"],
"albania_2":["albania_1","greece_1","greece_3","north_macedonia_1"],
"algeria_1":["algeria_2","algeria_3","algeria_4","algeria_5"],
"algeria_2":["algeria_1","algeria_3","algeria_4","libya_2","tunisia_2","tunisia_3","tunisia_4"],
"algeria_3":["algeria_1","algeria_2","algeria_5","algeria_6","libya_2","libya_4","mali_2","mali_6","mauritania_3","niger_1"],
"algeria_4":["algeria_1","algeria_2","algeria_5","tunisia_3"],
"algeria_5":["algeria_1","algeria_3","algeria_4","algeria_6","morocco_1","morocco_3","morocco_5"],
"algeria_6":["algeria_3","algeria_5","mauritania_3","morocco_3","morocco_4"],
"andorra_1":["france_2","france_4","spain_4"],
"angola_1":["angola_3","dr_congo_3","republic_of_the_congo_3"],
"angola_2":["angola_3","angola_5","angola_6"],
"angola_3":["angola_1","angola_2","angola_5","dr_congo_3"],
"angola_4":["angola_5","dr_congo_1","dr_congo_2","dr_congo_3","zambia_5"],
"angola_5":["angola_2","angola_3","angola_4","angola_6","dr_congo_3","namibia_1","namibia_5","zambia_5"],
"angola_6":["angola_2","angola_5","namibia_5"],
"antigua_and_barbuda_1":["dominica_1","france_1","netherlands_3","saint_kitts_and_nevis_1"],
"argentina_1":["argentina_2","argentina_3","argentina_5","uruguay_1","uruguay_2"],
"argentina_2":["argentina_1","argentina_3","argentina_5","argentina_6","chile_2","chile_4"],
"argentina_3":["argentina_1","argentina_2","chile_3","chile_4","chile_5","united_kingdom_4"],
"argentina_4":["argentina_5","paraguay_1","paraguay_2"],
"argentina_5":["argentina_1","argentina_2","argentina_4","argentina_6","brazil_6","paraguay_1","paraguay_2","paraguay_3","uruguay_2"],
"argentina_6":["argentina_2","argentina_5","bolivia_3","chile_1","chile_2","paraguay_3"],
"armenia_1":["azerbaijan_2","azerbaijan_3","azerbaijan_4","georgia_3","georgia_5","iran_2","turkey_3"],
"australia_1":["australia_2","australia_3","australia_5"],
"australia_2":["australia_1","australia_3","papua_new_guinea_3"],
"australia_3":["australia_1","australia_2","australia_5","australia_6"],
"australia_4":["australia_5","new_zealand_2"],
"australia_5":["australia_1","australia_3","australia_4"],
"australia_6":["australia_3"],
"austria_1":["austria_3","austria_4","italy_3","slovenia_1","slovenia_2"],
"austria_2":["austria_3","austria_4","czechia_1","czechia_2","hungary_3","hungary_4","slovakia_2","slovenia_2"],
"austria_3":["austria_1","austria_2","austria_4","hungary_4","slovenia_2"],
"austria_4":["austria_1","austria_2","austria_3","czechia_1","germany_1","germany_2","italy_3","liechtenstein_1","switzerland_2","switzerland_3"],
"azerbaijan_1":["azerbaijan_5","azerbaijan_6"],
"azerbaijan_2":["armenia_1","azerbaijan_3","azerbaijan_6","georgia_4","georgia_5","russia_5"],
"azerbaijan_3":["armenia_1","azerbaijan_2","azerbaijan_5","azerbaijan_6","iran_2"],
"azerbaijan_4":["armenia_1","iran_2","turkey_3"],
"azerbaijan_5":["azerbaijan_1","azerbaijan_3","azerbaijan_6","iran_2"],
"azerbaijan_6":["azerbaijan_1","azerbaijan_2","azerbaijan_3","azerbaijan_5","russia_5"],
"bahamas_1":["cuba_1","cuba_2","cuba_3","dominican_republic_1","haiti_1","united_states_2"],
"bahrain_1":["qatar_1"],
"bangladesh_1":["bangladesh_2","india_5","myanmar_3"],
"bangladesh_2":["bangladesh_1","bangladesh_3","india_5"],
"bangladesh_3":["bangladesh_2","india_5"],
"barbados_1":["france_1","saint_lucia_1","saint_vincent_and_the_grenadines_1"],
"belarus_1":["belarus_2","belarus_3","belarus_4","poland_3","poland_4","ukraine_6"],
"belarus_2":["belarus_1","belarus_4","belarus_5","russia_5","ukraine_1","ukraine_6"],
"belarus_3":["belarus_1","belarus_4","belarus_6","lithuania_1","lithuania_2","poland_4"],
"belarus_4":["belarus_1","belarus_2","belarus_3","belarus_5","belarus_6","lithuania_1"],
"belarus_5":["belarus_2","belarus_4","belarus_6","russia_5"],
"belarus_6":["belarus_3","belarus_4","belarus_5","latvia_4","lithuania_1","russia_3","russia_5"],
"belgium_1":["belgium_2","belgium_3","france_3","netherlands_3","united_kingdom_5"],
"belgium_2":["belgium_1","belgium_3","netherlands_3","united_kingdom_5"],
"belgium_3":["belgium_1","belgium_2","france_3","germany_5","luxembourg_1","netherlands_2","netherlands_3"],
"belize_1":["belize_2","mexico_5"],
"belize_2":["belize_1","guatemala_1","mexico_5"],
"benin_1":["benin_2","burkina_faso_2","niger_2","nigeria_1","nigeria_5","nigeria_6","togo_1"],
"benin_2":["benin_1","nigeria_6","togo_1"],
"bhutan_1":["bhutan_2","china_4","india_5"],
"bhutan_2":["bhutan_1","china_4","india_5"],
"bolivia_1":["bolivia_2","bolivia_3","brazil_2","brazil_4","chile_1","paraguay_3"],
"bolivia_2":["bolivia_1","brazil_4","chile_1","colombia_1","peru_1","peru_2"],
"bolivia_3":["argentina_6","bolivia_1","chile_1","paraguay_3"],
"bosnia_and_herzegovina_1":["bosnia_and_herzegovina_2","croatia_1","croatia_2","croatia_3","croatia_4"],
"bosnia_and_herzegovina_2":["bosnia_and_herzegovina_1","croatia_2","croatia_4","montenegro_1","serbia_1","serbia_4"],
"botswana_1":["botswana_2","botswana_4","botswana_5","south_africa_3","zimbabwe_2"],
"botswana_2":["botswana_1","botswana_3","botswana_4","botswana_5","namibia_2"],
"botswana_3":["botswana_2","botswana_5","namibia_2","south_africa_4","south_africa_5"],
"botswana_4":["botswana_1","botswana_2","namibia_1","namibia_2","zambia_3","zimbabwe_2"],
"botswana_5":["botswana_1","botswana_2","botswana_3","south_africa_3","south_africa_4"],
"brazil_1":["brazil_2","brazil_3","brazil_4","brazil_5","brazil_6"],
"brazil_2":["bolivia_1","brazil_1","brazil_4","brazil_6","paraguay_1","paraguay_2","paraguay_3"],
"brazil_3":["brazil_1","brazil_4","brazil_5"],
"brazil_4":["bolivia_1","bolivia_2","brazil_1","brazil_2","brazil_3","colombia_1","france_1","guyana_1","guyana_3","suriname_2","venezuela_4"],
"brazil_5":["brazil_1","brazil_3","brazil_6"],
"brazil_6":["argentina_5","brazil_1","brazil_2","brazil_5","paraguay_2","uruguay_1","uruguay_2"],
"brunei_1":["malaysia_5"],
"bulgaria_1":["bulgaria_2","bulgaria_3","bulgaria_4","greece_4","romania_4","turkey_4"],
"bulgaria_2":["bulgaria_1","bulgaria_4","romania_1","romania_4","serbia_2"],
"bulgaria_3":["bulgaria_1","romania_2","romania_4"],
"bulgaria_4":["bulgaria_1","bulgaria_2","greece_4","north_macedonia_1","serbia_2"],
"burkina_faso_1":["burkina_faso_2","burkina_faso_3","ghana_3","mali_4","mali_6","niger_2"],
"burkina_faso_2":["benin_1","burkina_faso_1","ghana_3","niger_2","togo_1"],
"burkina_faso_3":["burkina_faso_1","ghana_3","ivory_coast_2","ivory_coast_3","mali_3","mali_5","mali_6"],
"burundi_1":["dr_congo_4","rwanda_1","tanzania_3","tanzania_6"],
"cambodia_1":["cambodia_2","cambodia_3","cambodia_4","thailand_1","thailand_3"],
"cambodia_2":["cambodia_1","cambodia_4","thailand_1","vietnam_5"],
"cambodia_3":["cambodia_1","cambodia_4","thailand_3"],
"cambodia_4":["cambodia_1","cambodia_2","cambodia_3","laos_2","thailand_3","vietnam_1","vietnam_5"],
"cameroon_1":["cameroon_2","cameroon_3","cameroon_4","cameroon_5","central_african_republic_3","central_african_republic_4","nigeria_2","nigeria_3","republic_of_the_congo_2"],
"cameroon_2":["cameroon_1","central_african_republic_3","chad_2","chad_6","nigeria_3"],
"cameroon_3":["cameroon_1","cameroon_4","cameroon_5","equatorial_guinea_1","equatorial_guinea_2","gambia_1","republic_of_the_congo_2"],
"cameroon_4":["cameroon_1","cameroon_3","cameroon_5","equatorial_guinea_1","nigeria_2","nigeria_5"],
"cameroon_5":["cameroon_1","cameroon_3","cameroon_4","equatorial_guinea_1"],
"canada_1":["canada_2","canada_3","united_states_3","united_states_5"],
"canada_2":["canada_1","united_states_1","united_states_5"],
"canada_3":["canada_1","united_states_2","united_states_3"],
"cape_verde_1":["senegal_2"],
"central_african_republic_1":["central_african_republic_2","central_african_republic_3","central_african_republic_4","chad_2","chad_3","dr_congo_6","south_sudan_1","sudan_1"],
"central_african_republic_2":["central_african_republic_1","dr_congo_5","dr_congo_6","south_sudan_1","south_sudan_2"],
"central_african_republic_3":["cameroon_1","cameroon_2","central_african_republic_1","central_african_republic_4","chad_2"],
"central_african_republic_4":["cameroon_1","central_african_republic_1","central_african_republic_3","dr_congo_6","republic_of_the_congo_2"],
"chad_1":["chad_3","chad_4","chad_5","chad_6","libya_3","libya_4","niger_3"],
"chad_2":["cameroon_2","central_african_republic_1","central_african_republic_3","chad_3","chad_6"],
"chad_3":["central_african_republic_1","chad_1","chad_2","chad_4","chad_6","sudan_1"],
"chad_4":["chad_1","chad_3","libya_3","sudan_1"],
"chad_5":["chad_1","libya_4","niger_1","niger_3"],
"chad_6":["cameroon_2","chad_1","chad_2","chad_3","niger_3","nigeria_3"],
"chile_1":["argentina_6","bolivia_1","bolivia_2","bolivia_3","chile_2","peru_1"],
"chile_2":["argentina_2","argentina_6","chile_1","chile_4"],
"chile_3":["argentina_3","chile_5"],
"chile_4":["argentina_2","argentina_3","chile_2","chile_5"],
"chile_5":["argentina_3","chile_3","chile_4"],
"china_1":["china_2","china_4","china_5","china_6","mongolia_5"],
"china_2":["china_1","china_3","china_6","mongolia_1","mongolia_2","mongolia_3","mongolia_4","mongolia_5","russia_4"],
"china_3":["china_2","china_6","north_korea_1","north_korea_3","north_korea_4","russia_4","russia_6"],
"china_4":["bhutan_1","bhutan_2","china_1","china_5","china_6","india_3","india_5","myanmar_1","nepal_1","nepal_2","nepal_3"],
"china_5":["afghanistan_2","china_1","china_4","india_3","kazakhstan_3","kazakhstan_4","kyrgyzstan_2","kyrgyzstan_3","mongolia_5","pakistan_2","russia_1","tajikistan_2"],
"china_6":["china_1","china_2","china_3","china_4","laos_1","myanmar_1","myanmar_4","taiwan_1","vietnam_2","vietnam_4"],
"colombia_1":["bolivia_2","brazil_4","colombia_4","peru_2","peru_4","venezuela_4"],
"colombia_2":["colombia_3","colombia_4","colombia_5","venezuela_1"],
"colombia_3":["colombia_2","colombia_4","venezuela_1","venezuela_5"],
"colombia_4":["colombia_1","colombia_2","colombia_3","colombia_5","peru_4","venezuela_1","venezuela_4"],
"colombia_5":["colombia_2","colombia_4","ecuador_3","panama_2","peru_4"],
"comoros_1":["france_5","mozambique_1"],
"costa_rica_1":["costa_rica_2","nicaragua_1","panama_1"],
"costa_rica_2":["costa_rica_1","nicaragua_1","nicaragua_2"],
"croatia_1":["bosnia_and_herzegovina_1","croatia_2","croatia_3","croatia_4","hungary_4","slovenia_1","slovenia_2"],
"croatia_2":["bosnia_and_herzegovina_1","bosnia_and_herzegovina_2","croatia_1","croatia_3","montenegro_1"],
"croatia_3":["bosnia_and_herzegovina_1","croatia_1","croatia_2","slovenia_1","slovenia_2"],
"croatia_4":["bosnia_and_herzegovina_1","bosnia_and_herzegovina_2","croatia_1","hungary_1","hungary_4","serbia_1","serbia_3"],
"cuba_1":["bahamas_1","cuba_2","cuba_3","united_states_2"],
"cuba_2":["bahamas_1","cuba_1","haiti_1","jamaica_1"],
"cuba_3":["bahamas_1","cuba_1","united_states_2"],
"cyprus_1":["lebanon_1","lebanon_2","lebanon_3","syria_4","syria_5","turkey_2","turkey_5","turkey_6"],
"czechia_1":["austria_2","austria_4","czechia_2","czechia_3","czechia_4","germany_2","germany_6","poland_1"],
"czechia_2":["austria_2","czechia_1","czechia_3","poland_1","poland_6","slovakia_2","slovakia_3"],
"czechia_3":["czechia_1","czechia_2","germany_6","poland_1"],
"czechia_4":["czechia_1","germany_2","germany_6"],
"denmark_1":["denmark_2","germany_4"],
"denmark_2":["denmark_1"],
"denmark_3":["sweden_4"],
"djibouti_1":["eritrea_2","ethiopia_4","ethiopia_5","somalia_6"],
"dominica_1":["antigua_and_barbuda_1","france_1","saint_lucia_1"],
"dominican_republic_1":["bahamas_1","haiti_1","puerto_rico_1"],
"dr_congo_1":["angola_4","dr_congo_2","dr_congo_3","dr_congo_4","dr_congo_5","dr_congo_6"],
"dr_congo_2":["angola_4","dr_congo_1","dr_congo_4","tanzania_5","tanzania_6","zambia_1","zambia_2","zambia_4","zambia_5"],
"dr_congo_3":["angola_1","angola_3","angola_4","angola_5","dr_congo_1","dr_congo_6","republic_of_the_congo_1","republic_of_the_congo_3"],
"dr_congo_4":["burundi_1","dr_congo_1","dr_congo_2","dr_congo_5","rwanda_1","tanzania_6","uganda_4"],
"dr_congo_5":["central_african_republic_2","dr_congo_1","dr_congo_4","dr_congo_6","south_sudan_2","uganda_3","uganda_4"],
"dr_congo_6":["central_african_republic_1","central_african_republic_2","central_african_republic_4","dr_congo_1","dr_congo_3","dr_congo_5","republic_of_the_congo_1","republic_of_the_congo_2"],
"ecuador_1":["ecuador_2","ecuador_3","peru_4"],
"ecuador_2":["ecuador_1","ecuador_3","peru_4"],
"ecuador_3":["colombia_5","ecuador_1","ecuador_2","peru_4"],
"egypt_1":["egypt_2","egypt_3","egypt_4","egypt_5","egypt_6"],
"egypt_2":["egypt_1","egypt_3","egypt_5"],
"egypt_3":["egypt_1","egypt_2","egypt_6","libya_1"],
"egypt_4":["egypt_1","egypt_6","sudan_2"],
"egypt_5":["egypt_1","egypt_2","israel_3","jordan_1","palestine_1","saudi_arabia_1"],
"egypt_6":["egypt_1","egypt_3","egypt_4","libya_1","libya_3","sudan_2"],
"el_salvador_1":["el_salvador_2","honduras_2"],
"el_salvador_2":["el_salvador_1","guatemala_2","honduras_2"],
"equatorial_guinea_1":["cameroon_3","cameroon_4","cameroon_5","equatorial_guinea_2","nigeria_5"],
"equatorial_guinea_2":["cameroon_3","equatorial_guinea_1","gabon_2","gambia_1","sao_tome_and_principe_1"],
"eritrea_1":["eritrea_2","ethiopia_5","sudan_2","sudan_3"],
"eritrea_2":["djibouti_1","eritrea_1","ethiopia_5","sudan_2"],
"estonia_1":["estonia_4"],
"estonia_2":["estonia_3","estonia_4"],
"estonia_3":["estonia_2","estonia_4","latvia_3","latvia_4","russia_3"],
"estonia_4":["estonia_1","estonia_2","estonia_3","latvia_3"],
"eswatini_1":["mozambique_3","south_africa_2"],
"ethiopia_1":["ethiopia_3","ethiopia_5","south_sudan_3","sudan_3"],
"ethiopia_2":["ethiopia_3"],
"ethiopia_3":["ethiopia_1","ethiopia_2","ethiopia_4","ethiopia_5","kenya_1","kenya_4","south_sudan_2","south_sudan_3"],
"ethiopia_4":["djibouti_1","ethiopia_3","ethiopia_5","kenya_1","kenya_3","somalia_1","somalia_5","somalia_6"],
"ethiopia_5":["djibouti_1","eritrea_1","eritrea_2","ethiopia_1","ethiopia_3","ethiopia_4","sudan_3"],
"fiji_1":["tonga_1"],
"finland_1":["finland_2","finland_3","finland_5","russia_3"],
"finland_2":["finland_1","finland_4","finland_5","russia_3"],
"finland_3":["finland_1","norway_4","russia_3","sweden_3"],
"finland_4":["finland_2","finland_5","russia_3"],
"finland_5":["finland_1","finland_2","finland_4"],
"france_1":["antigua_and_barbuda_1","barbados_1","brazil_4","dominica_1","france_4","saint_kitts_and_nevis_1","saint_lucia_1","saint_vincent_and_the_grenadines_1","suriname_1","suriname_2","united_kingdom_1","united_kingdom_5","united_kingdom_6"],
"france_2":["andorra_1","france_3","france_4","italy_4","italy_5","monaco_1","spain_4","switzerland_1"],
"france_3":["belgium_1","belgium_3","france_2","france_4","germany_1","germany_5","luxembourg_1","switzerland_1","switzerland_3","united_kingdom_1","united_kingdom_5"],
"france_4":["andorra_1","france_1","france_2","france_3","spain_4","spain_6","united_kingdom_5","united_kingdom_6"],
"france_5":["comoros_1","madagascar_2","mauritius_1"],
"gabon_1":["gabon_2","gambia_1","republic_of_the_congo_1","republic_of_the_congo_2","republic_of_the_congo_3"],
"gabon_2":["equatorial_guinea_2","gabon_1","gambia_1","republic_of_the_congo_3"],
"gambia_1":["cameroon_3","equatorial_guinea_2","gabon_1","gabon_2","republic_of_the_congo_2"],
"georgia_1":["georgia_3","russia_5"],
"georgia_2":["georgia_3","turkey_3"],
"georgia_3":["armenia_1","georgia_1","georgia_2","georgia_5","russia_5","turkey_3"],
"georgia_4":["azerbaijan_2","georgia_5","russia_5"],
"georgia_5":["armenia_1","azerbaijan_2","georgia_3","georgia_4","russia_5"],
"germany_1":["austria_4","france_3","germany_2","germany_4","germany_5","switzerland_1","switzerland_3"],
"germany_2":["austria_4","czechia_1","czechia_4","germany_1","germany_4","germany_6","switzerland_3"],
"germany_3":["germany_4","germany_6","poland_1"],
"germany_4":["denmark_1","germany_1","germany_2","germany_3","germany_5","germany_6","netherlands_1","netherlands_2"],
"germany_5":["belgium_3","france_3","germany_1","germany_4","luxembourg_1","netherlands_2","netherlands_3"],
"germany_6":["czechia_1","czechia_3","czechia_4","germany_2","germany_3","germany_4","poland_1"],
"ghana_1":["ghana_2","ghana_3","ghana_4","ivory_coast_3"],
"ghana_2":["ghana_1","ghana_3","ghana_4","togo_1"],
"ghana_3":["burkina_faso_1","burkina_faso_2","burkina_faso_3","ghana_1","ghana_2","ivory_coast_3","togo_1"],
"ghana_4":["ghana_1","ghana_2","ivory_coast_3"],
"greece_1":["albania_2","greece_3","greece_5"],
"greece_2":["greece_6","turkey_1"],
"greece_3":["albania_2","greece_1","greece_4","greece_5","greece_6","north_macedonia_1"],
"greece_4":["bulgaria_1","bulgaria_4","greece_3","north_macedonia_1","turkey_4"],
"greece_5":["greece_1","greece_3","greece_6"],
"greece_6":["greece_2","greece_3","greece_5","turkey_1"],
"grenada_1":["saint_vincent_and_the_grenadines_1","trinidad_and_tobago_1","venezuela_3"],
"guatemala_1":["belize_2","guatemala_2","honduras_1","honduras_2","mexico_5"],
"guatemala_2":["el_salvador_2","guatemala_1","honduras_2","mexico_5"],
"guinea_1":["guinea_4","guinea_bissau_1","senegal_4"],
"guinea_2":["guinea_3","guinea_4","guinea_5","liberia_1","mali_1","sierra_leone_1"],
"guinea_3":["guinea_2","guinea_5","ivory_coast_2","mali_1","mali_3"],
"guinea_4":["guinea_1","guinea_2","mali_1","senegal_4","sierra_leone_1"],
"guinea_5":["guinea_2","guinea_3","ivory_coast_2","liberia_1"],
"guinea_bissau_1":["guinea_1","senegal_1","senegal_4"],
"guyana_1":["brazil_4","guyana_2","guyana_3","suriname_2","venezuela_4"],
"guyana_2":["guyana_1","venezuela_4"],
"guyana_3":["brazil_4","guyana_1","suriname_1","suriname_2"],
"haiti_1":["bahamas_1","cuba_2","dominican_republic_1","jamaica_1"],
"honduras_1":["guatemala_1","honduras_2","nicaragua_1","nicaragua_2"],
"honduras_2":["el_salvador_1","el_salvador_2","guatemala_1","guatemala_2","honduras_1","nicaragua_2"],
"hungary_1":["croatia_4","hungary_2","hungary_3","hungary_4","romania_1","romania_6","serbia_3"],
"hungary_2":["hungary_1","hungary_3","romania_1","romania_6","slovakia_1","slovakia_3","ukraine_3"],
"hungary_3":["austria_2","hungary_1","hungary_2","hungary_4","slovakia_2","slovakia_3"],
"hungary_4":["austria_2","austria_3","croatia_1","croatia_4","hungary_1","hungary_3","serbia_3","slovenia_2"],
"iceland_1":["iceland_2"],
"iceland_2":["iceland_1","iceland_3","iceland_4","norway_1"],
"iceland_3":["iceland_2","iceland_4"],
"iceland_4":["iceland_2","iceland_3"],
"india_1":["india_4","indonesia_6","maldives_1","sri_lanka_1","sri_lanka_2"],
"india_2":["india_3","india_4","india_6","pakistan_5","pakistan_6"],
"india_3":["china_4","china_5","india_2","india_4","india_6","nepal_1","pakistan_1","pakistan_2","pakistan_5"],
"india_4":["india_1","india_2","india_3","india_5","india_6"],
"india_5":["bangladesh_1","bangladesh_2","bangladesh_3","bhutan_1","bhutan_2","china_4","india_4","india_6","myanmar_1","myanmar_3","nepal_1","nepal_2","nepal_3"],
"india_6":["india_2","india_3","india_4","india_5","nepal_1","nepal_3"],
"indonesia_1":["indonesia_2","indonesia_6"],
"indonesia_2":["indonesia_1","indonesia_5","malaysia_4","malaysia_5","philippines_2"],
"indonesia_3":["indonesia_4","indonesia_5","palau_1","philippines_2","timor_leste_1"],
"indonesia_4":["indonesia_3","papua_new_guinea_1","papua_new_guinea_3"],
"indonesia_5":["indonesia_2","indonesia_3"],
"indonesia_6":["india_1","indonesia_1","malaysia_1","malaysia_2","malaysia_3","singapore_1"],
"iran_1":["iran_3","iran_4","iran_5","iran_6","iraq_3","kuwait_1"],
"iran_2":["armenia_1","azerbaijan_3","azerbaijan_4","azerbaijan_5","iran_6","iraq_4","turkey_3"],
"iran_3":["afghanistan_5","afghanistan_6","iran_1","iran_4","iran_5","pakistan_4"],
"iran_4":["afghanistan_6","iran_1","iran_3","iran_6","turkmenistan_1","turkmenistan_2","turkmenistan_5"],
"iran_5":["iran_1","iran_3"],
"iran_6":["iran_1","iran_2","iran_4","iraq_2","iraq_3","iraq_4","turkmenistan_2"],
"iraq_1":["iraq_2","iraq_4","jordan_4","saudi_arabia_3","syria_3","syria_4"],
"iraq_2":["iran_6","iraq_1","iraq_3","iraq_4","saudi_arabia_3"],
"iraq_3":["iran_1","iran_6","iraq_2","kuwait_1","saudi_arabia_3"],
"iraq_4":["iran_2","iran_6","iraq_1","iraq_2","syria_3","turkey_3"],
"ireland_1":["ireland_2","ireland_3","ireland_4"],
"ireland_2":["ireland_1","ireland_3","ireland_4","united_kingdom_2"],
"ireland_3":["ireland_1","ireland_2"],
"ireland_4":["ireland_1","ireland_2","united_kingdom_2"],
"israel_1":["israel_2","israel_3","palestine_2"],
"israel_2":["israel_1","jordan_3","lebanon_1","lebanon_3","palestine_2","syria_2"],
"israel_3":["egypt_5","israel_1","jordan_1","palestine_1","palestine_2"],
"italy_1":["italy_2","italy_3","vatican_city_1"],
"italy_2":["italy_1","italy_6"],
"italy_3":["austria_1","austria_4","italy_1","italy_4","san_marino_1","slovenia_1","switzerland_2","vatican_city_1"],
"italy_4":["france_2","italy_3","monaco_1","switzerland_1","switzerland_2","vatican_city_1"],
"italy_5":["france_2"],
"italy_6":["italy_2","malta_1"],
"ivory_coast_1":["ivory_coast_2","ivory_coast_3","ivory_coast_4"],
"ivory_coast_2":["burkina_faso_3","guinea_3","guinea_5","ivory_coast_1","ivory_coast_3","ivory_coast_4","liberia_1","mali_3"],
"ivory_coast_3":["burkina_faso_3","ghana_1","ghana_3","ghana_4","ivory_coast_1","ivory_coast_2"],
"ivory_coast_4":["ivory_coast_1","ivory_coast_2","liberia_1","liberia_2"],
"jamaica_1":["cuba_2","haiti_1"],
"japan_1":["japan_3","japan_5"],
"japan_2":["japan_6","russia_6"],
"japan_3":["japan_1","japan_6"],
"japan_4":["japan_5","south_korea_1","south_korea_3","taiwan_1","taiwan_2","taiwan_3","taiwan_4"],
"japan_5":["japan_1","japan_4"],
"japan_6":["japan_2","japan_3"],
"jordan_1":["egypt_5","israel_3","jordan_2","palestine_2","saudi_arabia_1"],
"jordan_2":["jordan_1","jordan_3","jordan_4","palestine_2","saudi_arabia_1"],
"jordan_3":["israel_2","jordan_2","jordan_4","palestine_2","syria_2"],
"jordan_4":["iraq_1","jordan_2","jordan_3","palestine_2","saudi_arabia_1","saudi_arabia_3","syria_2","syria_4"],
"kazakhstan_1":["kazakhstan_2","kazakhstan_5","kazakhstan_6","russia_1","russia_3","turkmenistan_2","uzbekistan_5"],
"kazakhstan_2":["kazakhstan_1","kazakhstan_3","kazakhstan_5","russia_1","russia_3"],
"kazakhstan_3":["china_5","kazakhstan_2","kazakhstan_4","kazakhstan_5","russia_1"],
"kazakhstan_4":["china_5","kazakhstan_3","kazakhstan_5","kyrgyzstan_1","kyrgyzstan_2","kyrgyzstan_3","uzbekistan_2","uzbekistan_3","uzbekistan_4"],
"kazakhstan_5":["kazakhstan_1","kazakhstan_2","kazakhstan_3","kazakhstan_4","uzbekistan_2","uzbekistan_5"],
"kazakhstan_6":["kazakhstan_1","russia_1","russia_3","russia_5"],
"kenya_1":["ethiopia_3","ethiopia_4","kenya_2","kenya_3","kenya_4"],
"kenya_2":["kenya_1","kenya_3","kenya_4","somalia_3","tanzania_2","tanzania_4"],
"kenya_3":["ethiopia_4","kenya_1","kenya_2","somalia_1","somalia_3"],
"kenya_4":["ethiopia_3","kenya_1","kenya_2","kenya_5","south_sudan_2","tanzania_3","tanzania_4","uganda_2","uganda_3"],
"kenya_5":["kenya_4","tanzania_3","uganda_1","uganda_2"],
"kiribati_1":["united_states_4"],
"kosovo_1":["albania_1","montenegro_1","north_macedonia_1","serbia_2","serbia_4"],
"kuwait_1":["iran_1","iraq_3","saudi_arabia_3"],
"kyrgyzstan_1":["kazakhstan_4","kyrgyzstan_2","kyrgyzstan_3"],
"kyrgyzstan_2":["china_5","kazakhstan_4","kyrgyzstan_1","kyrgyzstan_3"],
"kyrgyzstan_3":["china_5","kazakhstan_4","kyrgyzstan_1","kyrgyzstan_2","tajikistan_1","tajikistan_2","tajikistan_4","uzbekistan_4"],
"laos_1":["china_6","laos_3","myanmar_4","thailand_2","vietnam_2"],
"laos_2":["cambodia_4","laos_3","thailand_3","vietnam_1","vietnam_3"],
"laos_3":["laos_1","laos_2","thailand_2","thailand_3","thailand_4","vietnam_2","vietnam_3","vietnam_4"],
"latvia_1":["latvia_2","lithuania_3"],
"latvia_2":["latvia_1","latvia_3","lithuania_1","lithuania_3"],
"latvia_3":["estonia_3","estonia_4","latvia_2","latvia_4","lithuania_1"],
"latvia_4":["belarus_6","estonia_3","latvia_3","lithuania_1","russia_3"],
"lebanon_1":["cyprus_1","israel_2","lebanon_2","lebanon_3","syria_2","syria_4"],
"lebanon_2":["cyprus_1","lebanon_1","syria_4","syria_5"],
"lebanon_3":["cyprus_1","israel_2","lebanon_1","syria_2"],
"lesotho_1":["lesotho_2","south_africa_1","south_africa_2"],
"lesotho_2":["lesotho_1","south_africa_1"],
"liberia_1":["guinea_2","guinea_5","ivory_coast_2","ivory_coast_4","liberia_2","liberia_3","sierra_leone_1"],
"liberia_2":["ivory_coast_4","liberia_1"],
"liberia_3":["liberia_1","sierra_leone_1"],
"libya_1":["egypt_3","egypt_6","libya_2","libya_3","libya_4"],
"libya_2":["algeria_2","algeria_3","libya_1","libya_4","tunisia_2"],
"libya_3":["chad_1","chad_4","egypt_6","libya_1","libya_4","sudan_1","sudan_2"],
"libya_4":["algeria_3","chad_1","chad_5","libya_1","libya_2","libya_3","niger_1"],
"liechtenstein_1":["austria_4","switzerland_2","switzerland_3"],
"lithuania_1":["belarus_3","belarus_4","belarus_6","latvia_2","latvia_3","latvia_4","lithuania_2","lithuania_3","lithuania_4"],
"lithuania_2":["belarus_3","lithuania_1","lithuania_4","poland_4"],
"lithuania_3":["latvia_1","latvia_2","lithuania_1","lithuania_4","russia_2"],
"lithuania_4":["lithuania_1","lithuania_2","lithuania_3","poland_3","poland_4","russia_2"],
"luxembourg_1":["belgium_3","france_3","germany_5"],
"madagascar_1":["madagascar_3","madagascar_4","madagascar_5"],
"madagascar_2":["france_5","madagascar_4","madagascar_5"],
"madagascar_3":["madagascar_1","madagascar_4","madagascar_5","madagascar_6"],
"madagascar_4":["madagascar_1","madagascar_2","madagascar_3","madagascar_5"],
"madagascar_5":["madagascar_1","madagascar_2","madagascar_3","madagascar_4"],
"madagascar_6":["madagascar_3"],
"malawi_1":["malawi_2","malawi_3","mozambique_1","mozambique_5","zambia_4"],
"malawi_2":["malawi_1","mozambique_1","tanzania_5","zambia_4"],
"malawi_3":["malawi_1","mozambique_1","mozambique_5","mozambique_6"],
"malaysia_1":["indonesia_6","malaysia_2","malaysia_3","thailand_5"],
"malaysia_2":["indonesia_6","malaysia_1","malaysia_3"],
"malaysia_3":["indonesia_6","malaysia_1","malaysia_2","singapore_1"],
"malaysia_4":["indonesia_2","malaysia_5","philippines_1","philippines_2"],
"malaysia_5":["brunei_1","indonesia_2","malaysia_4"],
"maldives_1":["india_1"],
"mali_1":["guinea_2","guinea_3","guinea_4","mali_3","mauritania_2","senegal_4"],
"mali_2":["algeria_3","mali_4","mali_6","niger_1"],
"mali_3":["burkina_faso_3","guinea_3","ivory_coast_2","mali_1","mali_5","mauritania_2"],
"mali_4":["burkina_faso_1","mali_2","mali_6","niger_1","niger_2"],
"mali_5":["burkina_faso_3","mali_3","mali_6","mauritania_2"],
"mali_6":["algeria_3","burkina_faso_1","burkina_faso_3","mali_2","mali_4","mali_5","mauritania_1","mauritania_2","mauritania_3"],
"malta_1":["italy_6"],
"marshall_islands_1":["nauru_1"],
"mauritania_1":["mali_6","mauritania_2","mauritania_3","mauritania_4","morocco_2"],
"mauritania_2":["mali_1","mali_3","mali_5","mali_6","mauritania_1","mauritania_4","senegal_3","senegal_4"],
"mauritania_3":["algeria_3","algeria_6","mali_6","mauritania_1","morocco_2","morocco_4"],
"mauritania_4":["mauritania_1","mauritania_2","morocco_2","senegal_3"],
"mauritius_1":["france_5","seychelles_1"],
"mexico_1":["mexico_2","mexico_4","mexico_6"],
"mexico_2":["mexico_1","mexico_3","mexico_5","mexico_6"],
"mexico_3":["mexico_2","mexico_4","mexico_6","united_states_6"],
"mexico_4":["mexico_1","mexico_3","mexico_6","united_states_4","united_states_6"],
"mexico_5":["belize_1","belize_2","guatemala_1","guatemala_2","mexico_2"],
"mexico_6":["mexico_1","mexico_2","mexico_3","mexico_4"],
"micronesia_1":["papua_new_guinea_2"],
"moldova_1":["romania_2","romania_5","ukraine_1","ukraine_3"],
"monaco_1":["france_2","italy_4"],
"mongolia_1":["china_2","mongolia_4","russia_4"],
"mongolia_2":["china_2","mongolia_3","mongolia_4","mongolia_5","russia_4"],
"mongolia_3":["china_2","mongolia_2","mongolia_4"],
"mongolia_4":["china_2","mongolia_1","mongolia_2","mongolia_3","russia_4"],
"mongolia_5":["china_1","china_2","china_5","mongolia_2","russia_1","russia_4"],
"montenegro_1":["albania_1","bosnia_and_herzegovina_2","croatia_2","kosovo_1","serbia_4"],
"morocco_1":["algeria_5","morocco_3","morocco_5","morocco_6"],
"morocco_2":["mauritania_1","mauritania_3","mauritania_4","morocco_4"],
"morocco_3":["algeria_5","algeria_6","morocco_1","morocco_4","morocco_6"],
"morocco_4":["algeria_6","mauritania_3","morocco_2","morocco_3"],
"morocco_5":["algeria_5","morocco_1","spain_1"],
"morocco_6":["morocco_1","morocco_3"],
"mozambique_1":["comoros_1","malawi_1","malawi_2","malawi_3","mozambique_6","tanzania_2","tanzania_5"],
"mozambique_2":["mozambique_3","mozambique_4","mozambique_5","zimbabwe_1","zimbabwe_2","zimbabwe_3"],
"mozambique_3":["eswatini_1","mozambique_2","mozambique_4","south_africa_2","south_africa_3","zimbabwe_1","zimbabwe_2"],
"mozambique_4":["mozambique_2","mozambique_3","mozambique_5","mozambique_6"],
"mozambique_5":["malawi_1","malawi_3","mozambique_2","mozambique_4","mozambique_6","zambia_3","zambia_4","zimbabwe_1","zimbabwe_3"],
"mozambique_6":["malawi_3","mozambique_1","mozambique_4","mozambique_5"],
"myanmar_1":["china_4","china_6","india_5","myanmar_2","myanmar_3","myanmar_4"],
"myanmar_2":["myanmar_1","myanmar_3","myanmar_4","myanmar_5","thailand_2"],
"myanmar_3":["bangladesh_1","india_5","myanmar_1","myanmar_2","myanmar_5"],
"myanmar_4":["china_6","laos_1","myanmar_1","myanmar_2","myanmar_5","thailand_2"],
"myanmar_5":["myanmar_2","myanmar_3","myanmar_4","thailand_1","thailand_2","thailand_4","thailand_5"],
"namibia_1":["angola_5","botswana_4","namibia_2","namibia_4","namibia_5","zambia_3","zambia_5","zimbabwe_2"],
"namibia_2":["botswana_2","botswana_3","botswana_4","namibia_1","namibia_3","namibia_4","south_africa_5"],
"namibia_3":["namibia_2","south_africa_5"],
"namibia_4":["namibia_1","namibia_2","namibia_5"],
"namibia_5":["angola_5","angola_6","namibia_1","namibia_4"],
"nauru_1":["marshall_islands_1","solomon_islands_1"],
"nepal_1":["china_4","india_3","india_5","india_6","nepal_3"],
"nepal_2":["china_4","india_5","nepal_3"],
"nepal_3":["china_4","india_5","india_6","nepal_1","nepal_2"],
"netherlands_1":["germany_4","netherlands_2","netherlands_3"],
"netherlands_2":["belgium_3","germany_4","germany_5","netherlands_1","netherlands_3"],
"netherlands_3":["antigua_and_barbuda_1","belgium_1","belgium_2","belgium_3","germany_5","netherlands_1","netherlands_2","saint_kitts_and_nevis_1","united_kingdom_5"],
"new_zealand_1":["new_zealand_2"],
"new_zealand_2":["australia_4","new_zealand_1","samoa_1","tuvalu_1"],
"nicaragua_1":["costa_rica_1","costa_rica_2","honduras_1","nicaragua_2"],
"nicaragua_2":["costa_rica_2","honduras_1","honduras_2","nicaragua_1"],
"niger_1":["algeria_3","chad_5","libya_4","mali_2","mali_4","niger_2","niger_3","nigeria_6"],
"niger_2":["benin_1","burkina_faso_1","burkina_faso_2","mali_4","niger_1","nigeria_6"],
"niger_3":["chad_1","chad_5","chad_6","niger_1","nigeria_3","nigeria_4","nigeria_6"],
"nigeria_1":["benin_1","nigeria_2","nigeria_4","nigeria_5","nigeria_6"],
"nigeria_2":["cameroon_1","cameroon_4","nigeria_1","nigeria_3","nigeria_4","nigeria_5"],
"nigeria_3":["cameroon_1","cameroon_2","chad_6","niger_3","nigeria_2","nigeria_4"],
"nigeria_4":["niger_3","nigeria_1","nigeria_2","nigeria_3","nigeria_6"],
"nigeria_5":["benin_1","cameroon_4","equatorial_guinea_1","nigeria_1","nigeria_2","nigeria_6"],
"nigeria_6":["benin_1","benin_2","niger_1","niger_2","niger_3","nigeria_1","nigeria_4","nigeria_5"],
"north_korea_1":["china_3","north_korea_3","russia_6"],
"north_korea_2":["north_korea_4","south_korea_2"],
"north_korea_3":["china_3","north_korea_1","north_korea_4"],
"north_korea_4":["china_3","north_korea_2","north_korea_3","south_korea_2"],
"north_macedonia_1":["albania_1","albania_2","bulgaria_4","greece_3","greece_4","kosovo_1","serbia_2"],
"norway_1":["iceland_2","norway_2","norway_4","norway_5","sweden_1","sweden_2","sweden_3"],
"norway_2":["norway_1","norway_3","norway_5","sweden_1","sweden_2"],
"norway_3":["norway_2","norway_5"],
"norway_4":["finland_3","norway_1","russia_3","sweden_3"],
"norway_5":["norway_1","norway_2","norway_3"],
"oman_1":["oman_2","oman_4","oman_5","saudi_arabia_3"],
"oman_2":["oman_1","saudi_arabia_3","yemen_3"],
"oman_3":["united_arab_emirates_2"],
"oman_4":["oman_1","oman_5"],
"oman_5":["oman_1","oman_4","saudi_arabia_3","united_arab_emirates_1","united_arab_emirates_2"],
"pakistan_1":["india_3","pakistan_2","pakistan_3","pakistan_5"],
"pakistan_2":["afghanistan_2","china_5","india_3","pakistan_1","pakistan_3"],
"pakistan_3":["afghanistan_1","afghanistan_2","afghanistan_4","pakistan_1","pakistan_2","pakistan_4","pakistan_5"],
"pakistan_4":["afghanistan_4","afghanistan_5","iran_3","pakistan_3","pakistan_5","pakistan_6"],
"pakistan_5":["india_2","india_3","pakistan_1","pakistan_3","pakistan_4","pakistan_6"],
"pakistan_6":["india_2","pakistan_4","pakistan_5"],
"palau_1":["indonesia_3"],
"palestine_1":["egypt_5","israel_3"],
"palestine_2":["israel_1","israel_2","israel_3","jordan_1","jordan_2","jordan_3","jordan_4"],
"panama_1":["costa_rica_1","panama_2"],
"panama_2":["colombia_5","panama_1"],
"papua_new_guinea_1":["indonesia_4","papua_new_guinea_3"],
"papua_new_guinea_2":["micronesia_1","papua_new_guinea_3","solomon_islands_1"],
"papua_new_guinea_3":["australia_2","indonesia_4","papua_new_guinea_1","papua_new_guinea_2"],
"paraguay_1":["argentina_4","argentina_5","brazil_2","paraguay_2","paraguay_3"],
"paraguay_2":["argentina_4","argentina_5","brazil_2","brazil_6","paraguay_1"],
"paraguay_3":["argentina_5","argentina_6","bolivia_1","bolivia_3","brazil_2","paraguay_1"],
"peru_1":["bolivia_2","chile_1","peru_2","peru_3"],
"peru_2":["bolivia_2","colombia_1","peru_1","peru_3","peru_4"],
"peru_3":["peru_1","peru_2","peru_4"],
"peru_4":["colombia_1","colombia_4","colombia_5","ecuador_1","ecuador_2","ecuador_3","peru_2","peru_3"],
"philippines_1":["malaysia_4","philippines_3","taiwan_4"],
"philippines_2":["indonesia_2","indonesia_3","malaysia_4","philippines_3"],
"philippines_3":["philippines_1","philippines_2"],
"poland_1":["czechia_1","czechia_2","czechia_3","germany_3","germany_6","poland_5","poland_6"],
"poland_2":["poland_3","poland_4","poland_6","slovakia_1","slovakia_3","ukraine_3"],
"poland_3":["belarus_1","lithuania_4","poland_2","poland_4","poland_5","poland_6","russia_2"],
"poland_4":["belarus_1","belarus_3","lithuania_2","lithuania_4","poland_2","poland_3","russia_2","ukraine_3","ukraine_6"],
"poland_5":["poland_1","poland_3","poland_6","russia_2"],
"poland_6":["czechia_2","poland_1","poland_2","poland_3","poland_5","slovakia_3"],
"portugal_1":["portugal_4","spain_1"],
"portugal_2":["portugal_5"],
"portugal_3":["portugal_4","portugal_6","spain_1","spain_3"],
"portugal_4":["portugal_1","portugal_3","spain_1"],
"portugal_5":["portugal_2","spain_1"],
"portugal_6":["portugal_3","spain_2","spain_3","spain_5"],
"puerto_rico_1":["dominican_republic_1"],
"qatar_1":["bahrain_1","saudi_arabia_3"],
"republic_of_the_congo_1":["dr_congo_3","dr_congo_6","gabon_1","republic_of_the_congo_2","republic_of_the_congo_3"],
"republic_of_the_congo_2":["cameroon_1","cameroon_3","central_african_republic_4","dr_congo_6","gabon_1","gambia_1","republic_of_the_congo_1"],
"republic_of_the_congo_3":["angola_1","dr_congo_3","gabon_1","gabon_2","republic_of_the_congo_1"],
"romania_1":["bulgaria_2","hungary_1","hungary_2","romania_4","romania_5","romania_6","serbia_1","serbia_2","serbia_3","ukraine_3"],
"romania_2":["bulgaria_3","moldova_1","romania_3","romania_4","romania_5","ukraine_1"],
"romania_3":["romania_2","romania_4","romania_5","romania_6"],
"romania_4":["bulgaria_1","bulgaria_2","bulgaria_3","romania_1","romania_2","romania_3","romania_6"],
"romania_5":["moldova_1","romania_1","romania_2","romania_3","romania_6","ukraine_1","ukraine_3"],
"romania_6":["hungary_1","hungary_2","romania_1","romania_3","romania_4","romania_5"],
"russia_1":["china_5","kazakhstan_1","kazakhstan_2","kazakhstan_3","kazakhstan_6","mongolia_5","russia_3","russia_4"],
"russia_2":["lithuania_3","lithuania_4","poland_3","poland_4","poland_5"],
"russia_3":["belarus_6","estonia_3","finland_1","finland_2","finland_3","finland_4","kazakhstan_1","kazakhstan_2","kazakhstan_6","latvia_4","norway_4","russia_1","russia_5"],
"russia_4":["china_2","china_3","mongolia_1","mongolia_2","mongolia_4","mongolia_5","russia_1","russia_6"],
"russia_5":["azerbaijan_2","azerbaijan_6","belarus_2","belarus_5","belarus_6","georgia_1","georgia_3","georgia_4","georgia_5","kazakhstan_6","russia_3","ukraine_1","ukraine_2","ukraine_4","ukraine_5"],
"russia_6":["china_3","japan_2","north_korea_1","russia_4","united_states_1"],
"rwanda_1":["burundi_1","dr_congo_4","tanzania_3","uganda_4"],
"saint_kitts_and_nevis_1":["antigua_and_barbuda_1","france_1","netherlands_3"],
"saint_lucia_1":["barbados_1","dominica_1","france_1","saint_vincent_and_the_grenadines_1"],
"saint_vincent_and_the_grenadines_1":["barbados_1","france_1","grenada_1","saint_lucia_1"],
"samoa_1":["new_zealand_2","tonga_1"],
"san_marino_1":["italy_3"],
"sao_tome_and_principe_1":["equatorial_guinea_2"],
"saudi_arabia_1":["egypt_5","jordan_1","jordan_2","jordan_4","saudi_arabia_3","saudi_arabia_5","saudi_arabia_6"],
"saudi_arabia_2":["saudi_arabia_3","saudi_arabia_4","saudi_arabia_5","saudi_arabia_6","yemen_3","yemen_4","yemen_5"],
"saudi_arabia_3":["iraq_1","iraq_2","iraq_3","jordan_4","kuwait_1","oman_1","oman_2","oman_5","qatar_1","saudi_arabia_1","saudi_arabia_2","saudi_arabia_5","united_arab_emirates_1","yemen_3"],
"saudi_arabia_4":["saudi_arabia_2","saudi_arabia_6","yemen_5"],
"saudi_arabia_5":["saudi_arabia_1","saudi_arabia_2","saudi_arabia_3","saudi_arabia_6"],
"saudi_arabia_6":["saudi_arabia_1","saudi_arabia_2","saudi_arabia_4","saudi_arabia_5"],
"senegal_1":["guinea_bissau_1","senegal_2","senegal_3","senegal_4"],
"senegal_2":["cape_verde_1","senegal_1","senegal_3"],
"senegal_3":["mauritania_2","mauritania_4","senegal_1","senegal_2","senegal_4"],
"senegal_4":["guinea_1","guinea_4","guinea_bissau_1","mali_1","mauritania_2","senegal_1","senegal_3"],
"serbia_1":["bosnia_and_herzegovina_2","croatia_4","romania_1","serbia_2","serbia_3","serbia_4"],
"serbia_2":["bulgaria_2","bulgaria_4","kosovo_1","north_macedonia_1","romania_1","serbia_1","serbia_4"],
"serbia_3":["croatia_4","hungary_1","hungary_4","romania_1","serbia_1"],
"serbia_4":["bosnia_and_herzegovina_2","kosovo_1","montenegro_1","serbia_1","serbia_2"],
"seychelles_1":["mauritius_1"],
"sierra_leone_1":["guinea_2","guinea_4","liberia_1","liberia_3"],
"singapore_1":["indonesia_6","malaysia_3"],
"slovakia_1":["hungary_2","poland_2","slovakia_3","ukraine_3"],
"slovakia_2":["austria_2","czechia_2","hungary_3","slovakia_3"],
"slovakia_3":["czechia_2","hungary_2","hungary_3","poland_2","poland_6","slovakia_1","slovakia_2"],
"slovenia_1":["austria_1","croatia_1","croatia_3","italy_3","slovenia_2"],
"slovenia_2":["austria_1","austria_2","austria_3","croatia_1","croatia_3","hungary_4","slovenia_1"],
"solomon_islands_1":["nauru_1","papua_new_guinea_2","vanuatu_1"],
"somalia_1":["ethiopia_4","kenya_3","somalia_3","somalia_4","somalia_5"],
"somalia_2":["somalia_5","somalia_6","yemen_6"],
"somalia_3":["kenya_2","kenya_3","somalia_1","somalia_4"],
"somalia_4":["somalia_1","somalia_3","somalia_5"],
"somalia_5":["ethiopia_4","somalia_1","somalia_2","somalia_4","somalia_6"],
"somalia_6":["djibouti_1","ethiopia_4","somalia_2","somalia_5"],
"south_africa_1":["lesotho_1","lesotho_2","south_africa_2","south_africa_4","south_africa_5","south_africa_6"],
"south_africa_2":["eswatini_1","lesotho_1","mozambique_3","south_africa_1","south_africa_3","south_africa_4"],
"south_africa_3":["botswana_1","botswana_5","mozambique_3","south_africa_2","south_africa_4","zimbabwe_2"],
"south_africa_4":["botswana_3","botswana_5","south_africa_1","south_africa_2","south_africa_3","south_africa_5"],
"south_africa_5":["botswana_3","namibia_2","namibia_3","south_africa_1","south_africa_4","south_africa_6"],
"south_africa_6":["south_africa_1","south_africa_5"],
"south_korea_1":["japan_4","south_korea_2","south_korea_3","south_korea_4"],
"south_korea_2":["north_korea_2","north_korea_4","south_korea_1","south_korea_4"],
"south_korea_3":["japan_4","south_korea_1","south_korea_4"],
"south_korea_4":["south_korea_1","south_korea_2","south_korea_3"],
"south_sudan_1":["central_african_republic_1","central_african_republic_2","south_sudan_2","south_sudan_3","sudan_1","sudan_3"],
"south_sudan_2":["central_african_republic_2","dr_congo_5","ethiopia_3","kenya_4","south_sudan_1","south_sudan_3","uganda_3"],
"south_sudan_3":["ethiopia_1","ethiopia_3","south_sudan_1","south_sudan_2","sudan_3"],
"spain_1":["morocco_5","portugal_1","portugal_3","portugal_4","portugal_5","spain_3"],
"spain_2":["portugal_6","spain_3","spain_4","spain_5","spain_6"],
"spain_3":["portugal_3","portugal_6","spain_1","spain_2","spain_4"],
"spain_4":["andorra_1","france_2","france_4","spain_2","spain_3","spain_6"],
"spain_5":["portugal_6","spain_2","spain_6"],
"spain_6":["france_4","spain_2","spain_4","spain_5"],
"sri_lanka_1":["india_1","sri_lanka_2"],
"sri_lanka_2":["india_1","sri_lanka_1"],
"sudan_1":["central_african_republic_1","chad_3","chad_4","libya_3","south_sudan_1","sudan_2","sudan_3"],
"sudan_2":["egypt_4","egypt_6","eritrea_1","eritrea_2","libya_3","sudan_1","sudan_3"],
"sudan_3":["eritrea_1","ethiopia_1","ethiopia_5","south_sudan_1","south_sudan_3","sudan_1","sudan_2"],
"suriname_1":["france_1","guyana_3","suriname_2"],
"suriname_2":["brazil_4","france_1","guyana_1","guyana_3","suriname_1"],
"sweden_1":["norway_1","norway_2","sweden_2","sweden_4","sweden_5","sweden_6"],
"sweden_2":["norway_1","norway_2","sweden_1","sweden_3","sweden_6"],
"sweden_3":["finland_3","norway_1","norway_4","sweden_2"],
"sweden_4":["denmark_3","sweden_1","sweden_5"],
"sweden_5":["sweden_1","sweden_4","sweden_6"],
"sweden_6":["sweden_1","sweden_2","sweden_5"],
"switzerland_1":["france_2","france_3","germany_1","italy_4","switzerland_2","switzerland_3"],
"switzerland_2":["austria_4","italy_3","italy_4","liechtenstein_1","switzerland_1","switzerland_3"],
"switzerland_3":["austria_4","france_3","germany_1","germany_2","liechtenstein_1","switzerland_1","switzerland_2"],
"syria_1":["syria_3","syria_4","syria_5","turkey_5"],
"syria_2":["israel_2","jordan_3","jordan_4","lebanon_1","lebanon_3","syria_4"],
"syria_3":["iraq_1","iraq_4","syria_1","syria_4","turkey_3","turkey_5"],
"syria_4":["cyprus_1","iraq_1","jordan_4","lebanon_1","lebanon_2","syria_1","syria_2","syria_3","syria_5","turkey_5"],
"syria_5":["cyprus_1","lebanon_2","syria_1","syria_4","turkey_5"],
"taiwan_1":["china_6","japan_4","taiwan_2","taiwan_3","taiwan_4"],
"taiwan_2":["japan_4","taiwan_1","taiwan_3","taiwan_4"],
"taiwan_3":["japan_4","taiwan_1","taiwan_2"],
"taiwan_4":["japan_4","philippines_1","taiwan_1","taiwan_2"],
"tajikistan_1":["kyrgyzstan_3","tajikistan_2","tajikistan_3","tajikistan_4","uzbekistan_3"],
"tajikistan_2":["afghanistan_2","china_5","kyrgyzstan_3","tajikistan_1","tajikistan_3"],
"tajikistan_3":["afghanistan_2","afghanistan_3","tajikistan_1","tajikistan_2","uzbekistan_3"],
"tajikistan_4":["kyrgyzstan_3","tajikistan_1","uzbekistan_3","uzbekistan_4"],
"tanzania_1":["tanzania_2","tanzania_3","tanzania_4","tanzania_5","tanzania_6"],
"tanzania_2":["kenya_2","mozambique_1","tanzania_1","tanzania_4","tanzania_5"],
"tanzania_3":["burundi_1","kenya_4","kenya_5","rwanda_1","tanzania_1","tanzania_4","tanzania_6","uganda_1","uganda_4"],
"tanzania_4":["kenya_2","kenya_4","tanzania_1","tanzania_2","tanzania_3"],
"tanzania_5":["dr_congo_2","malawi_2","mozambique_1","tanzania_1","tanzania_2","tanzania_6","zambia_4"],
"tanzania_6":["burundi_1","dr_congo_2","dr_congo_4","tanzania_1","tanzania_3","tanzania_5"],
"thailand_1":["cambodia_1","cambodia_2","myanmar_5","thailand_3","thailand_4","thailand_5"],
"thailand_2":["laos_1","laos_3","myanmar_2","myanmar_4","myanmar_5","thailand_4"],
"thailand_3":["cambodia_1","cambodia_3","cambodia_4","laos_2","laos_3","thailand_1","thailand_4"],
"thailand_4":["laos_3","myanmar_5","thailand_1","thailand_2","thailand_3"],
"thailand_5":["malaysia_1","myanmar_5","thailand_1"],
"timor_leste_1":["indonesia_3"],
"togo_1":["benin_1","benin_2","burkina_faso_2","ghana_2","ghana_3"],
"tonga_1":["fiji_1","samoa_1"],
"trinidad_and_tobago_1":["grenada_1","venezuela_2","venezuela_3","venezuela_4"],
"tunisia_1":["tunisia_2","tunisia_3","tunisia_4"],
"tunisia_2":["algeria_2","libya_2","tunisia_1","tunisia_4"],
"tunisia_3":["algeria_2","algeria_4","tunisia_1","tunisia_4"],
"tunisia_4":["algeria_2","tunisia_1","tunisia_2","tunisia_3"],
"turkey_1":["greece_2","greece_6","turkey_4","turkey_6"],
"turkey_2":["cyprus_1","turkey_4","turkey_5","turkey_6"],
"turkey_3":["armenia_1","azerbaijan_4","georgia_2","georgia_3","iran_2","iraq_4","syria_3","turkey_4","turkey_5"],
"turkey_4":["bulgaria_1","greece_4","turkey_1","turkey_2","turkey_3","turkey_5","turkey_6"],
"turkey_5":["cyprus_1","syria_1","syria_3","syria_4","syria_5","turkey_2","turkey_3","turkey_4","turkey_6"],
"turkey_6":["cyprus_1","turkey_1","turkey_2","turkey_4","turkey_5"],
"turkmenistan_1":["afghanistan_6","iran_4","turkmenistan_2","turkmenistan_3","turkmenistan_4","turkmenistan_5"],
"turkmenistan_2":["iran_4","iran_6","kazakhstan_1","turkmenistan_1","turkmenistan_3","uzbekistan_5"],
"turkmenistan_3":["turkmenistan_1","turkmenistan_2","turkmenistan_4","uzbekistan_5"],
"turkmenistan_4":["afghanistan_3","turkmenistan_1","turkmenistan_3","turkmenistan_5","uzbekistan_1","uzbekistan_3","uzbekistan_5"],
"turkmenistan_5":["afghanistan_3","afghanistan_6","iran_4","turkmenistan_1","turkmenistan_4"],
"tuvalu_1":["new_zealand_2"],
"uganda_1":["kenya_5","tanzania_3","uganda_2","uganda_3","uganda_4"],
"uganda_2":["kenya_4","kenya_5","uganda_1","uganda_3"],
"uganda_3":["dr_congo_5","kenya_4","south_sudan_2","uganda_1","uganda_2","uganda_4"],
"uganda_4":["dr_congo_4","dr_congo_5","rwanda_1","tanzania_3","uganda_1","uganda_3"],
"ukraine_1":["belarus_2","moldova_1","romania_2","romania_5","russia_5","ukraine_3","ukraine_4","ukraine_5","ukraine_6"],
"ukraine_2":["russia_5","ukraine_4","ukraine_5"],
"ukraine_3":["hungary_2","moldova_1","poland_2","poland_4","romania_1","romania_5","slovakia_1","ukraine_1","ukraine_6"],
"ukraine_4":["russia_5","ukraine_1","ukraine_2","ukraine_5"],
"ukraine_5":["russia_5","ukraine_1","ukraine_2","ukraine_4"],
"ukraine_6":["belarus_1","belarus_2","poland_4","ukraine_1","ukraine_3"],
"united_arab_emirates_1":["oman_5","saudi_arabia_3","united_arab_emirates_2"],
"united_arab_emirates_2":["oman_3","oman_5","united_arab_emirates_1"],
"united_kingdom_1":["france_1","france_3","united_kingdom_3","united_kingdom_5","united_kingdom_6"],
"united_kingdom_2":["ireland_2","ireland_4","united_kingdom_6"],
"united_kingdom_3":["united_kingdom_1"],
"united_kingdom_4":["argentina_3"],
"united_kingdom_5":["belgium_1","belgium_2","france_1","france_3","france_4","netherlands_3","united_kingdom_1","united_kingdom_6"],
"united_kingdom_6":["france_1","france_4","united_kingdom_1","united_kingdom_2","united_kingdom_5"],
"united_states_1":["canada_2","russia_6"],
"united_states_2":["bahamas_1","canada_3","cuba_1","cuba_3","united_states_3","united_states_6"],
"united_states_3":["canada_1","canada_3","united_states_2","united_states_5","united_states_6"],
"united_states_4":["kiribati_1","mexico_4","united_states_5","united_states_6"],
"united_states_5":["canada_1","canada_2","united_states_3","united_states_4","united_states_6"],
"united_states_6":["mexico_3","mexico_4","united_states_2","united_states_3","united_states_4","united_states_5"],
"uruguay_1":["argentina_1","brazil_6","uruguay_2"],
"uruguay_2":["argentina_1","argentina_5","brazil_6","uruguay_1"],
"uzbekistan_1":["turkmenistan_4","uzbekistan_2","uzbekistan_3","uzbekistan_5"],
"uzbekistan_2":["kazakhstan_4","kazakhstan_5","uzbekistan_1","uzbekistan_3","uzbekistan_5"],
"uzbekistan_3":["afghanistan_3","kazakhstan_4","tajikistan_1","tajikistan_3","tajikistan_4","turkmenistan_4","uzbekistan_1","uzbekistan_2","uzbekistan_4"],
"uzbekistan_4":["kazakhstan_4","kyrgyzstan_3","tajikistan_4","uzbekistan_3"],
"uzbekistan_5":["kazakhstan_1","kazakhstan_5","turkmenistan_2","turkmenistan_3","turkmenistan_4","uzbekistan_1","uzbekistan_2"],
"vanuatu_1":["solomon_islands_1"],
"vatican_city_1":["italy_1","italy_3","italy_4"],
"venezuela_1":["colombia_2","colombia_3","colombia_4","venezuela_2","venezuela_4","venezuela_5"],
"venezuela_2":["trinidad_and_tobago_1","venezuela_1","venezuela_3","venezuela_4"],
"venezuela_3":["grenada_1","trinidad_and_tobago_1","venezuela_2","venezuela_4"],
"venezuela_4":["brazil_4","colombia_1","colombia_4","guyana_1","guyana_2","trinidad_and_tobago_1","venezuela_1","venezuela_2","venezuela_3"],
"venezuela_5":["colombia_3","venezuela_1"],
"vietnam_1":["cambodia_4","laos_2","vietnam_3","vietnam_5"],
"vietnam_2":["china_6","laos_1","laos_3","vietnam_4"],
"vietnam_3":["laos_2","laos_3","vietnam_1","vietnam_4"],
"vietnam_4":["china_6","laos_3","vietnam_2","vietnam_3"],
"vietnam_5":["cambodia_2","cambodia_4","vietnam_1"],
"yemen_1":["yemen_2","yemen_4","yemen_5"],
"yemen_2":["yemen_1","yemen_5"],
"yemen_3":["oman_2","saudi_arabia_2","saudi_arabia_3","yemen_4"],
"yemen_4":["saudi_arabia_2","yemen_1","yemen_3","yemen_5"],
"yemen_5":["saudi_arabia_2","saudi_arabia_4","yemen_1","yemen_2","yemen_4"],
"yemen_6":["somalia_2"],
"zambia_1":["dr_congo_2","zambia_2","zambia_3","zambia_4","zambia_5"],
"zambia_2":["dr_congo_2","zambia_1","zambia_4"],
"zambia_3":["botswana_4","mozambique_5","namibia_1","zambia_1","zambia_4","zambia_5","zimbabwe_2","zimbabwe_3"],
"zambia_4":["dr_congo_2","malawi_1","malawi_2","mozambique_5","tanzania_5","zambia_1","zambia_2","zambia_3"],
"zambia_5":["angola_4","angola_5","dr_congo_2","namibia_1","zambia_1","zambia_3"],
"zimbabwe_1":["mozambique_2","mozambique_3","mozambique_5","zimbabwe_2","zimbabwe_3"],
"zimbabwe_2":["botswana_1","botswana_4","mozambique_2","mozambique_3","namibia_1","south_africa_3","zambia_3","zimbabwe_1","zimbabwe_3"],
"zimbabwe_3":["mozambique_2","mozambique_5","zambia_3","zimbabwe_1","zimbabwe_2"]
};

module.exports = { WORLD_LAYOUT, WORLD_REGIONS, WORLD_NEIGHBORS };
};
__defs['resource-distribution'] = function(module, exports, require){
"use strict";

/* ============================================================
   MONTHLY BALANCED RANDOM RESOURCE DISTRIBUTION

   World model (unchanged): ONE persistent world, ~195 countries. Resources belong to REGIONS,
   countries get resources by owning regions. Once per month (UTC, key "YYYY-MM") the resource of
   every region is re-rolled with seeded weighted randomness and then BALANCED so every country's
   total economic value stays within RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE.

   Never touched by a monthly cycle: countries, players, region ownership, wars, buildings, progress.
   rc_regionWars/{regionId}     which war currently reserves a region (active:true); written by war.declareWar, released when captureRegionForWar settles
   Firestore documents:
     rc_world/regions            region definitions + OWNERSHIP (created once, migration is idempotent)
     rc_world/resourceState      pointer to the current cycle
     rc_resource_cycles/{YYYY-MM} one document per month (doc id = unique constraint), history is kept
     rc_countries/{id}           gets regionalLastAt for lazy production accrual (3 decimals; regionalCarry is a legacy field, folded in once)
   Everything here is server-side; clients only read via getRegionResources.
   ============================================================ */
const admin = require("firebase-admin");
const { COUNTRIES, COUNTRY_BY_ID } = require("./countries");
const RC = require("./resource-config");
const WR = require("./world-regions");
const { fail } = require("./errors");
const { round3 } = require("./war-core");

function db() { return admin.firestore(); }
function FV() { return admin.firestore.FieldValue; }
const now = () => Date.now();
const HOUR = 3600000;

/* ---------------- pure helpers: seed, PRNG, month ---------------- */

function hash32(str) {            // FNV-1a -> 32-bit unsigned
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function monthKeyOf(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
function nextMonthStartMs(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0);
}
function seedFor(monthKey, cfg, salt) {
  return hash32("realmclash-resources|" + monthKey + "|v" + cfg.ALGORITHM_VERSION + (salt ? "|" + salt : ""));
}
function isMonthKey(k) { return typeof k === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(k); }

/* ---------------- pure: regions, values, production ---------------- */

// Region list = the REAL war regions of the world map (functions/lib/world-regions.js, generated from the map by tools/gen-war-map.js).
// Each region keeps the map's name. Only the GAME's own resources exist: the source map's resources are ignored; a region's geography
// comes from the country's natural resources (first regions) or a seeded random pick, exactly like before.
function buildDefaultRegions(cfg) {
  const out = {}, seen = {};
  WR.WORLD_REGIONS.forEach((w) => {
    const c = COUNTRY_BY_ID[w.countryId]; if (!c) return;
    const i = seen[c.id] = (seen[c.id] || 0);
    seen[c.id]++;
    const rnd = mulberry32(hash32("region|" + w.id));
    const geo = i < c.resources.length ? (RC.NATURAL_TO_GEO[c.resources[i]] || "plains") : RC.GEOGRAPHIES[Math.floor(rnd() * RC.GEOGRAPHIES.length)];
    out[w.id] = newRegion(w.id, c, w.name, geo);
  });
  return out;
}
function newRegion(id, country, name, geo) {
  return {
    id, countryId: country.id, name, geo,
    ownerCountryId: country.id,               // OWNERSHIP: only wars / conquest may change this, never the monthly cycle
    occupiedBy: null, resistance: 0, stability: 100, infrastructure: 1, development: 1,
  };
}

function tierOf(resource) { return RC.TIER_OF[resource]; }
function geoWeight(geo, resource) {
  const g = RC.RESOURCE_GEOGRAPHY_WEIGHTS[geo];
  return (g && g[resource]) || RC.RESOURCE_GEOGRAPHY_WEIGHTS.baseline;
}
// economic value of one hour of a region's BASE production: production x value x quality
function economicValue(resource, quality) {
  return RC.RESOURCE_BASE_PRODUCTION[resource] * (quality == null ? 1 : quality) * RC.RESOURCE_VALUES[resource];
}
function baseProduction(resource, quality) { return RC.RESOURCE_BASE_PRODUCTION[resource] * (quality == null ? 1 : quality); }

// FinalProduction = Base x Quality x Infrastructure x Development x Stability x Occupation
function regionProduction(region, a, cfg) {
  if (!a) return 0;
  const infra = 1 + cfg.INFRASTRUCTURE_STEP * Math.max(0, (region.infrastructure || 1) - 1);
  const dev = 1 + cfg.DEVELOPMENT_STEP * Math.max(0, (region.development || 1) - 1);
  const stab = Math.max(cfg.MIN_STABILITY_MODIFIER, Math.min(1, (region.stability == null ? 100 : region.stability) / 100));
  const occ = occupationModifier(region, cfg);
  return baseProduction(a.r, a.q) * infra * dev * stab * occ;
}
function occupationModifier(region, cfg) {
  if (!region.occupiedBy) return 1;
  return (region.resistance || 0) >= cfg.HIGH_RESISTANCE_FROM ? cfg.HIGH_RESISTANCE_MODIFIER : cfg.OCCUPATION_MODIFIER;
}

/* ---------------- pure: the RANDOM + BALANCED algorithm ---------------- */

// regions: {id: region}, prevAssign: {id:{r,q}} | null  ->  { assign, countryValues, stats }
function generateDistribution(regions, seed, prevAssign, cfg) {
  const rnd = mulberry32(seed);
  const ids = Object.keys(regions).sort();
  const n = ids.length;
  const countryIds = Array.from(new Set(ids.map((id) => regions[id].ownerCountryId))).sort();
  const cIndex = {}; countryIds.forEach((c, i) => { cIndex[c] = i; });

  // 1) RANDOM phase: seeded weighted pick, tier caps keep valuable resources concentrated in few regions
  const caps = {}, used = {};
  Object.keys(RC.RESOURCE_TIERS).forEach((t) => { caps[t] = Math.max(1, Math.floor(RC.TIER_MAX_SHARE[t] * n)); used[t] = 0; });
  const order = ids.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  const res = new Array(n), qual = new Array(n), geo = new Array(n), owner = new Array(n), pos = {};
  ids.forEach((id, i) => { pos[id] = i; geo[i] = regions[id].geo; owner[i] = cIndex[regions[id].ownerCountryId]; });
  order.forEach((id) => {
    const i = pos[id];
    const weights = RC.ALL_RESOURCES.map((r) => {
      const tier = tierOf(r);
      if (used[tier] >= caps[tier]) return 0;
      let w = RC.TIER_BASE_WEIGHT[tier] * geoWeight(geo[i], r);
      if (prevAssign && prevAssign[id] && prevAssign[id].r === r) w *= cfg.VARIETY_REPEAT_PENALTY;   // variety, not forced rotation
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let x = rnd() * total, pick = RC.ALL_RESOURCES[0];
    for (let k = 0; k < weights.length; k++) { x -= weights[k]; if (x <= 0) { pick = RC.ALL_RESOURCES[k]; break; } }
    res[i] = pick; used[tierOf(pick)]++;
    qual[i] = Math.round((cfg.QUALITY_MIN + rnd() * (cfg.QUALITY_MAX - cfg.QUALITY_MIN)) * 100) / 100;
  });

  // 2) BALANCING phase: swap deposits (resource + quality) between a rich and a poor country while it helps.
  // Countries own 1..6 REAL regions of the world map, so what is balanced is the MEAN value per region (a 1-region and a 6-region
  // country are equally "rich" when their regions are worth the same), not the total.
  const val = new Array(n), tot = new Array(countryIds.length).fill(0);
  for (let i = 0; i < n; i++) { val[i] = economicValue(res[i], qual[i]); tot[owner[i]] += val[i]; }
  const byCountry = countryIds.map(() => []);
  for (let i = 0; i < n; i++) byCountry[owner[i]].push(i);
  const mean = (c) => (byCountry[c].length ? tot[c] / byCountry[c].length : 0);
  const spreadOf = () => { let mx = -Infinity, mn = Infinity; for (let c = 0; c < tot.length; c++) { const m = mean(c); if (m > mx) mx = m; if (m < mn) mn = m; } return { mx, mn, spread: mx > 0 ? (mx - mn) / mx : 0 }; };
  const okSwap = (a, b) => geoWeight(geo[b], res[a]) >= cfg.MIN_SWAP_GEO_WEIGHT && geoWeight(geo[a], res[b]) >= cfg.MIN_SWAP_GEO_WEIGHT;
  const doSwap = (a, b) => {
    const ca = owner[a], cb = owner[b];
    const r = res[a], q = qual[a], v = val[a];
    res[a] = res[b]; qual[a] = qual[b]; val[a] = val[b];
    res[b] = r; qual[b] = q; val[b] = v;
    // exact recompute for the two touched countries (cheap, avoids float drift)
    tot[ca] = byCountry[ca].reduce((s, k) => s + val[k], 0);
    tot[cb] = byCountry[cb].reduce((s, k) => s + val[k], 0);
  };
  // best swap between two given countries (S richer than W, by MEAN): moving value d changes the mean gap by d*(1/nS+1/nW); it must shrink the gap, ideally to zero
  const bestBetween = (S, W) => {
    const gap = mean(S) - mean(W), k = 1 / byCountry[S].length + 1 / byCountry[W].length; let best = null, bestScore = Infinity;
    for (const a of byCountry[S]) for (const b of byCountry[W]) {
      const d = val[a] - val[b];
      if (d <= 0 || d * k >= 2 * gap) continue;
      if (!okSwap(a, b)) continue;
      const score = Math.abs(gap - d * k);
      if (score < bestScore) { bestScore = score; best = [a, b, score - gap]; }
    }
    return best;
  };
  let iterations = 0, stalls = 0, st = spreadOf();
  const TOP = 6, C = countryIds.length;
  while (st.spread > cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE && iterations < cfg.MAX_BALANCING_ITERATIONS && stalls < 60 && C > 1) {
    iterations++;
    const idx = countryIds.map((_, i) => i).sort((x, y) => mean(y) - mean(x));
    let moved = false, bestPair = null, bestScore = Infinity;
    for (let s = 0; s < Math.min(TOP, C); s++) for (let w = 0; w < Math.min(TOP, C); w++) {
      const S = idx[s], W = idx[C - 1 - w];
      if (S === W || mean(S) <= mean(W)) continue;
      const p = bestBetween(S, W);
      if (p && p[2] < bestScore) { bestScore = p[2]; bestPair = p; }
    }
    if (!bestPair) {          // fall back to random rich/poor pairs
      for (let k = 0; k < 60 && !bestPair; k++) {
        const S = Math.floor(rnd() * C), W = Math.floor(rnd() * C);
        if (S === W || mean(S) <= mean(W)) continue;
        bestPair = bestBetween(S, W);
      }
    }
    if (bestPair) { doSwap(bestPair[0], bestPair[1]); moved = true; }
    stalls = moved ? 0 : stalls + 1;
    st = spreadOf();
  }

  // 3) FINE-TUNING phase: swaps alone can get stuck (countries own 1..6 regions, deposits are discrete). Nudge the quality of single
  // deposits INSIDE the normal quality range (QUALITY_MIN..QUALITY_MAX): lower the richest country's regions, raise the poorest one's.
  const unit = (i) => RC.RESOURCE_BASE_PRODUCTION[res[i]] * RC.RESOURCE_VALUES[res[i]];
  const retune = (c, wantDelta) => {           // wantDelta > 0 raises, < 0 lowers the TOTAL of country c as far as the quality range allows; returns the value moved
    let left = Math.abs(wantDelta), moved2 = 0;
    const list = byCountry[c].slice().sort((x, y) => wantDelta > 0 ? (unit(y) * cfg.QUALITY_MAX - val[y]) - (unit(x) * cfg.QUALITY_MAX - val[x]) : (val[y] - unit(y) * cfg.QUALITY_MIN) - (val[x] - unit(x) * cfg.QUALITY_MIN));
    for (const i of list) {
      if (left < 1e-6) break;
      const u = unit(i), target = Math.max(cfg.QUALITY_MIN, Math.min(cfg.QUALITY_MAX, Math.round((val[i] + Math.sign(wantDelta) * left) / u * 100) / 100));
      const nv = economicValue(res[i], target); if (Math.abs(nv - val[i]) < 1e-6) continue;
      moved2 += Math.abs(nv - val[i]); left -= Math.abs(nv - val[i]); qual[i] = target; val[i] = nv;
    }
    tot[c] = byCountry[c].reduce((a, k) => a + val[k], 0);
    return moved2;
  };
  let tunes = 0;
  while (st.spread > cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE && tunes < 4000 && C > 1) {
    tunes++; iterations++;
    const idx = countryIds.map((_, i) => i).sort((x, y) => mean(y) - mean(x));
    const S = idx[0], W = idx[C - 1], gap = mean(S) - mean(W);
    const a = retune(S, -gap / 2 * byCountry[S].length), b = retune(W, gap / 2 * byCountry[W].length);
    if (a + b < 1e-6) break;
    st = spreadOf();
  }

  const assign = {};
  ids.forEach((id, i) => { assign[id] = { r: res[i], q: qual[i] }; });
  const countryValues = {}; countryIds.forEach((c, i) => { countryValues[c] = Math.round(tot[i]); });
  const avg = tot.reduce((a, t, c) => a + mean(c), 0) / Math.max(1, tot.length);
  const within = st.spread <= cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE;
  const stats = {
    max: Math.round(st.mx), min: Math.round(st.mn), avg: Math.round(avg), spreadPct: Math.round(st.spread * 10000) / 100,
    tolerancePct: cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE * 100, withinTolerance: within, iterations, regions: n, countries: countryIds.length,
    warning: within ? null : "Balance tolerance not reached; closest distribution kept.",
  };
  return { assign, countryValues, stats };
}

/* ---------------- pure: per-country views ---------------- */

function countryProduction(countryId, regions, assign, cfg) {
  const perHour = {}; let valuePerHour = 0, count = 0, rare = 0;
  Object.keys(regions).forEach((id) => {
    const rg = regions[id];
    if (rg.ownerCountryId !== countryId) return;
    const a = assign[id]; if (!a) return;
    const p = regionProduction(rg, a, cfg);
    perHour[a.r] = (perHour[a.r] || 0) + p;
    valuePerHour += p * RC.RESOURCE_VALUES[a.r]; count++;
    if (tierOf(a.r) === "RARE" || tierOf(a.r) === "VERY_RARE") rare++;
  });
  Object.keys(perHour).forEach((r) => { perHour[r] = round3(perHour[r]); });
  return { perHour, valuePerHour: round3(valuePerHour), regionCount: count, rareCount: rare };
}

function balanceTable(regions, assign, cfg) {
  const owners = Array.from(new Set(Object.keys(regions).map((id) => regions[id].ownerCountryId))).sort();
  const rows = owners.map((c) => { const p = countryProduction(c, regions, assign, cfg); return { countryId: c, totalValue: p.valuePerHour, resourceCount: Object.keys(p.perHour).length, rareCount: p.rareCount, avgProduction: p.regionCount ? Math.round(Object.values(p.perHour).reduce((a, b) => a + b, 0) / p.regionCount) : 0 }; });
  const avg = rows.reduce((a, r) => a + r.totalValue, 0) / Math.max(1, rows.length);
  rows.forEach((r) => { r.diffPct = avg ? Math.round((r.totalValue - avg) / avg * 1000) / 10 : 0; });
  return rows;
}

/* ---------------- Firestore: config, regions (migration), cycles ---------------- */

async function loadConfig() {
  const cfg = Object.assign({}, RC.RESOURCE_DISTRIBUTION_CONFIG, { ADMIN_UIDS: [] });
  try {
    const snap = await db().doc("rc_config/resources").get();
    if (snap.exists) {
      const o = snap.data();
      Object.keys(RC.CFG_NUMBER_LIMITS).forEach((k) => { if (typeof o[k] === "number" && isFinite(o[k])) cfg[k] = Math.max(RC.CFG_NUMBER_LIMITS[k][0], Math.min(RC.CFG_NUMBER_LIMITS[k][1], o[k])); });
      ["MONTHLY_DISTRIBUTION_ENABLED", "ADMIN_TOOLS_ENABLED"].forEach((k) => { if (typeof o[k] === "boolean") cfg[k] = o[k]; });
      if (Array.isArray(o.ADMIN_UIDS)) cfg.ADMIN_UIDS = o.ADMIN_UIDS.filter((u) => typeof u === "string");
    }
  } catch (e) { /* defaults */ }
  return cfg;
}

const regionsRef = () => db().doc("rc_world/regions");
const regionLockRef = (regionId) => db().doc("rc_regionWars/" + regionId);   // one doc per region: which war currently reserves it (active:true) — the "two wars, one region" guard
const stateRef = () => db().doc("rc_world/resourceState");
const cycleRef = (key) => db().doc("rc_resource_cycles/" + key);

/* MIGRATION: creates missing regions from the existing country data. Idempotent, and it NEVER overwrites a region
   that already exists (so ownership / occupation / development set by wars or admins is preserved). */
let _regionsCache = null;       // {at, regions}: the regions doc is ~170 KB, so country pages must not re-read it on every call
const REGIONS_TTL_MS = 30000;   // ownership changes (wars) become visible within 30s; call invalidateRegions() right after changing a region
function invalidateRegions() { _regionsCache = null; }
async function ensureRegions(cfg) {
  if (_regionsCache && now() - _regionsCache.at < REGIONS_TTL_MS) return _regionsCache.regions;
  cfg = cfg || await loadConfig();
  const snap = await regionsRef().get();
  // a stored world with another LAYOUT (an older map) is replaced as a whole: its region ids do not exist any more
  const stale = snap.exists && snap.data().layout !== WR.WORLD_LAYOUT;
  const existing = snap.exists && !stale ? (snap.data().regions || {}) : {};
  const wanted = buildDefaultRegions(cfg);
  const missing = Object.keys(wanted).filter((id) => !existing[id]);
  if (!missing.length) { _regionsCache = { at: now(), regions: existing }; return existing; }
  await db().runTransaction(async (tx) => {
    const cur = await tx.get(regionsRef());
    if (!cur.exists || cur.data().layout !== WR.WORLD_LAYOUT) {          // new world (or old layout): write every region, ownership starts fresh
      tx.set(regionsRef(), { regions: wanted, layout: WR.WORLD_LAYOUT, version: 1, updatedAt: now() });
      return;
    }
    const have = cur.data().regions || {};
    const add = {}; Object.keys(wanted).forEach((id) => { if (!have[id]) add[id] = wanted[id]; });
    if (Object.keys(add).length) tx.set(regionsRef(), { regions: add, layout: WR.WORLD_LAYOUT, version: 1, updatedAt: now() }, { merge: true });
  });
  const again = await regionsRef().get();
  const out = again.exists ? (again.data().regions || {}) : {};
  _regionsCache = { at: now(), regions: out };
  return out;
}

let _cache = null;     // {key, cycle} — read-through cache, never the source of truth (a restart just reloads from Firestore)

async function loadCycle(key) {
  const s = await cycleRef(key).get();
  return s.exists ? s.data() : null;
}

async function previousAssign(key) {
  try {
    const st = await stateRef().get();
    const prevKey = st.exists ? st.data().currentMonthKey : null;
    if (prevKey && prevKey !== key) { const c = await loadCycle(prevKey); if (c) return { key: prevKey, assign: c.assign || {} }; }
  } catch (e) { /* no history */ }
  return { key: null, assign: null };
}

// Returns the cycle document for `monthKey` (default: the current UTC month), generating it ONCE if it does not exist.
async function ensureDistribution(monthKey, opts) {
  const cfg = (opts && opts.cfg) || await loadConfig();
  const key = monthKey || monthKeyOf(now());
  if (!isMonthKey(key)) fail("invalid-argument", "INVALID_MONTH");
  if (_cache && _cache.key === key && !(opts && opts.fresh)) return _cache.cycle;
  const existing = await loadCycle(key);
  if (existing && existing.status === "complete" && existing.layout === WR.WORLD_LAYOUT) { _cache = { key, cycle: existing }; return existing; }
  if (!cfg.MONTHLY_DISTRIBUTION_ENABLED) return null;
  const regions = await ensureRegions(cfg);
  const prev = await previousAssign(key);
  const seed = seedFor(key, cfg);
  const gen = generateDistribution(regions, seed, prev.assign, cfg);
  if (!gen.stats.withinTolerance) console.warn("[resources] " + key + ": balance spread " + gen.stats.spreadPct + "% > tolerance " + gen.stats.tolerancePct + "% after " + gen.stats.iterations + " iterations");
  const t = now();
  const doc = { monthKey: key, seed, status: "complete", layout: WR.WORLD_LAYOUT, algorithmVersion: cfg.ALGORITHM_VERSION, createdAt: t, completedAt: t, prevMonthKey: prev.key, assign: gen.assign, countryValues: gen.countryValues, stats: gen.stats };
  // doc id == monthKey is the unique constraint; the transaction makes "check then create" atomic
  const saved = await db().runTransaction(async (tx) => {
    const s = await tx.get(cycleRef(key));
    if (s.exists && s.data().status === "complete" && s.data().layout === WR.WORLD_LAYOUT) return s.data();
    tx.set(cycleRef(key), doc);
    tx.set(stateRef(), { currentMonthKey: key, updatedAt: t }, { merge: true });
    return doc;
  });
  _cache = { key, cycle: saved };
  return saved;
}

/* Lazy production (TERRITORIAL ECONOMY): the CURRENT OWNER country's National Treasury accrues what its regions
   produced since the last accrual (timestamp based, no cron needed). Values keep 3 decimals: nothing is floored and
   nothing waits in a hidden carry. A legacy `regionalCarry` (< 1 unit per resource, left by the old integer system)
   is folded into the treasury once and zeroed, so no value is lost. */
async function accrueRegionalProduction(countryId) {
  const cfg = await loadConfig();
  if (!cfg.MONTHLY_DISTRIBUTION_ENABLED || !COUNTRY_BY_ID[countryId]) return null;
  const cycle = await ensureDistribution(null, { cfg });
  if (!cycle) return null;
  const regions = await ensureRegions(cfg);
  const prod = countryProduction(countryId, regions, cycle.assign, cfg);
  const cRef = db().doc("rc_countries/" + countryId), t = now();
  return db().runTransaction(async (tx) => {
    const s = await tx.get(cRef);
    const d = s.exists ? s.data() : {};
    const last = d.regionalLastAt || 0;
    if (!last) { tx.set(cRef, { regionalLastAt: t }, { merge: true }); return { gained: {} }; }
    const elapsed = Math.min(Math.max(0, t - last), cfg.MAX_ACCRUAL_MS);
    if (t - last < 60000) return { gained: {} };
    const carry = d.regionalCarry || {}, inc = {}, gained = {}, zeroed = {};
    const keys = Array.from(new Set(Object.keys(prod.perHour).concat(Object.keys(carry))));
    keys.forEach((r) => {
      const amount = round3((carry[r] || 0) + (prod.perHour[r] || 0) * elapsed / HOUR);
      if (carry[r]) zeroed[r] = 0;
      if (amount > 0) { inc[r] = FV().increment(amount); gained[r] = amount; }
    });
    const patch = { resources: inc, regionalLastAt: t };
    if (Object.keys(zeroed).length) patch.regionalCarry = zeroed;
    tx.set(cRef, patch, { merge: true });
    return { gained };
  });
}

/* ---------------- Territorial consequence of a war ----------------
   REGION-TARGETED WARS: a war is fought over ONE region (war.targetRegionId, chosen by the attacker at declaration; the
   defender is that region's owner AT THAT MOMENT). If the attacker wins, exactly that region changes owner. Nothing else
   is ever picked on the loser's behalf. Only OWNERSHIP changes (ownerCountryId); occupation / resistance are cleared. The
   region's resource and production setup are untouched, and no player nationality is touched. From that moment the
   production belongs to the new owner's National Treasury (what was produced before is settled to the old owner first). */

// Pure. Decides what a finished war does to its target region. Returns { ok:true } or { ok:false, status, reason }.
//   status "none" = the targeted region could NOT legally be transferred (explicit reason, nothing else is taken)
//   status "held" = the defender won, so the region stays where it is
function transferVerdict(w, regs) {
  if (!w.targetRegionId) return { ok: false, status: "none", reason: "LEGACY_NO_TARGET" };       // war declared before region targeting existed
  const rg = regs[w.targetRegionId];
  if (!rg) return { ok: false, status: "none", reason: "REGION_NOT_FOUND" };
  if (w.winnerCountryId !== w.attackerCountryId) return { ok: false, status: "held", reason: "DEFENDER_HELD" };
  if (rg.ownerCountryId !== w.defenderCountryId) return { ok: false, status: "none", reason: "OWNER_CHANGED" };   // never move a region that is no longer the defender's
  return { ok: true };
}

// Settles a finished war's territory ONCE (idempotent: only a war whose territory.status is "pending" is processed).
async function captureRegionForWar(warId) {
  const wRef = db().doc("rc_wars/" + warId);
  const w0s = await wRef.get();
  const w0 = w0s.exists ? w0s.data() : null;
  if (!w0 || w0.status !== "finished" || !w0.territory || w0.territory.status !== "pending") return w0 ? w0.territory || null : null;
  // Both countries are paid up to NOW with the OLD ownership, so the capture is never retroactive.
  for (const cid of [w0.winnerCountryId, w0.loserCountryId]) { try { await accrueRegionalProduction(cid); } catch (e) { console.error("settle accrual", cid, e); } }
  try { await ensureRegions(); } catch (e) { /* the transaction below reads the regions doc itself */ }
  invalidateRegions();
  const t = now();
  const rid0 = w0.targetRegionId;
  const territory = await db().runTransaction(async (tx) => {
    const reads = [tx.get(wRef), tx.get(regionsRef())];
    if (rid0) reads.push(tx.get(regionLockRef(rid0)));
    const [wSnap, rSnap, lSnap] = await Promise.all(reads);
    const w = wSnap.data();
    if (!w.territory || w.territory.status !== "pending") return w.territory || null;          // someone else already settled it: never twice
    const regs = rSnap.exists ? (rSnap.data().regions || {}) : {};
    const lock = lSnap && lSnap.exists ? lSnap.data() : null;
    const rg = w.targetRegionId ? regs[w.targetRegionId] : null;
    const base = { regionId: w.targetRegionId || null, regionName: (rg && rg.name) || w.targetRegionName || w.targetRegionId || null, at: t };
    let verdict = transferVerdict(w, regs);
    // the region must still be reserved by THIS war, otherwise another settlement could be racing for it
    if (verdict.ok && !(lock && lock.active && lock.warId === warId)) verdict = { ok: false, status: "none", reason: "REGION_NOT_RESERVED" };
    let result;
    if (verdict.ok) {
      tx.set(regionsRef(), { regions: { [w.targetRegionId]: { ownerCountryId: w.winnerCountryId, occupiedBy: null, resistance: 0 } } }, { merge: true });
      result = Object.assign(base, { status: "captured", fromCountryId: w.defenderCountryId, toCountryId: w.winnerCountryId });
    } else if (verdict.status === "held") {
      result = Object.assign(base, { status: "held", reason: verdict.reason, ownerCountryId: w.defenderCountryId });
    } else {
      result = Object.assign(base, { status: "none", reason: verdict.reason });
    }
    if (w.targetRegionId && lock && lock.warId === warId) tx.set(regionLockRef(w.targetRegionId), { active: false, releasedAt: t }, { merge: true });   // release the reservation
    tx.set(wRef, Object.assign({}, w, { territory: result }));
    return result;
  });
  invalidateRegions();
  return territory;
}

// regionId -> warId for every region currently reserved by a war (a finished war keeps its region reserved until its territory is settled).
async function activeRegionLocks() {
  const q = await db().collection("rc_regionWars").where("active", "==", true).get();
  const out = {};
  q.docs.forEach((d) => { const x = d.data(); if (x && x.warId) out[d.id] = x.warId; });
  return out;
}

/* ---------------- read APIs ---------------- */

function regionView(rg, a, cfg, lockWarId) {
  const tier = a ? tierOf(a.r) : null;
  return {
    id: rg.id, name: rg.name, geo: rg.geo, owner: rg.ownerCountryId, occupiedBy: rg.occupiedBy || null,
    reservedByWarId: lockWarId || null,          // set while an active war is being fought over this region
    stability: rg.stability == null ? 100 : rg.stability, resistance: rg.resistance || 0,
    resource: a ? a.r : null, tier, quality: a ? a.q : null,
    baseProduction: a ? round3(baseProduction(a.r, a.q)) : 0,
    production: a ? round3(regionProduction(rg, a, cfg)) : 0,
    unitValue: a ? RC.RESOURCE_VALUES[a.r] : 0,
    value: a ? round3(regionProduction(rg, a, cfg) * RC.RESOURCE_VALUES[a.r]) : 0,
    occupationModifier: occupationModifier(rg, cfg),
  };
}

/* ---------------- war targeting: who can be attacked ---------------- */
// A country may only declare war over a region that BORDERS one of its own regions: a shared land border, a short sea crossing or a
// "bridge" for cut-off lands (WR.WORLD_NEIGHBORS, generated by tools/gen-war-map.js). When a war is won the region changes owner, so the
// front moves with the conquest. A country that owns no region at all may target any region (otherwise a country that lost everything
// could never come back).
function attackVerdict(regions, attackerCountryId, targetRegionId) {
  const mine = Object.keys(regions).filter((id) => regions[id] && regions[id].ownerCountryId === attackerCountryId);
  if (!mine.length) return { ok: true, reason: "NO_REGIONS" };
  const nb = WR.WORLD_NEIGHBORS && WR.WORLD_NEIGHBORS[targetRegionId];
  if (!nb) return { ok: false, reason: "NO_NEIGHBOR_DATA" };
  const via = nb.find((id) => regions[id] && regions[id].ownerCountryId === attackerCountryId);
  return via ? { ok: true, reason: "ADJACENT", via } : { ok: false, reason: "NOT_ADJACENT" };
}

async function getRegionResources(countryId, viewerCountryId) {
  if (!countryId || !COUNTRY_BY_ID[countryId]) fail("invalid-argument", "INVALID_TARGET");
  const cfg = await loadConfig();
  const t = now();
  const cycle = await ensureDistribution(null, { cfg });
  if (!cycle) return { serverNow: t, enabled: false, countryId };
  const regions = await ensureRegions(cfg);
  const mine = Object.keys(regions).filter((id) => regions[id].ownerCountryId === countryId).sort();
  const prod = countryProduction(countryId, regions, cycle.assign, cfg);
  const totalProd = Object.values(prod.perHour).reduce((a, b) => a + b, 0);
  // war availability of the OWNER (read-only, for the target picker; declareWar re-checks everything itself)
  let locks = {}; try { locks = await activeRegionLocks(); } catch (e) { /* no lock info */ }
  let ownerWar = { atWar: false, cooldownUntil: 0 };
  try {
    const cs = await db().doc("rc_countries/" + countryId).get(), cd = cs.exists ? cs.data() : {};
    if (cd.activeWarId) { const ws = await db().doc("rc_wars/" + cd.activeWarId).get(); ownerWar.atWar = !!(ws.exists && ws.data().status !== "finished"); }
    ownerWar.cooldownUntil = cd.warCooldownUntil || 0;
  } catch (e) { /* defaults */ }
  return {
    serverNow: t, enabled: true, countryId, monthKey: cycle.monthKey, ownerWar,
    nextRotationAt: nextMonthStartMs(t), daysToRotation: Math.max(0, Math.ceil((nextMonthStartMs(t) - t) / 86400000)),
    overview: { perHour: prod.perHour, valuePerHour: prod.valuePerHour, regionCount: prod.regionCount, rareCount: prod.rareCount, totalPerHour: Math.round(totalProd * 10) / 10 },
    regions: mine.map((id) => {
      const v = regionView(regions[id], cycle.assign[id], cfg, locks[id]);
      if (viewerCountryId && viewerCountryId !== countryId) v.adjacent = attackVerdict(regions, viewerCountryId, id).ok;   // lets the war picker grey out regions that do not touch the viewer's country (the server re-checks in declareWar)
      return v;
    }),
    tiers: RC.TIER_OF, values: RC.RESOURCE_VALUES,
  };
}

/* ---------------- admin / debug (never reachable by normal players) ---------------- */

function assertAdmin(uid, cfg) {
  if (!cfg.ADMIN_TOOLS_ENABLED || !cfg.ADMIN_UIDS.includes(uid)) fail("permission-denied", "ADMIN_ONLY");
}
async function adminResourceDistribution(uid, data) {
  const cfg = await loadConfig();
  assertAdmin(uid, cfg);
  const op = data && data.op, key = (data && data.monthKey) || monthKeyOf(now());
  if (!isMonthKey(key)) fail("invalid-argument", "INVALID_MONTH");
  if (op === "history") {
    const q = await db().collection("rc_resource_cycles").get();
    return { cycles: q.docs.map((d) => d.data()).map((c) => ({ monthKey: c.monthKey, seed: c.seed, createdAt: c.createdAt, algorithmVersion: c.algorithmVersion, stats: c.stats })).sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1)) };
  }
  if (op === "generate") { const c = await ensureDistribution(key, { cfg, fresh: true }); return { monthKey: key, created: !!c, stats: c && c.stats }; }
  if (op === "preview") {
    const regions = await ensureRegions(cfg), prev = await previousAssign(key);
    const gen = generateDistribution(regions, seedFor(key, cfg, data.salt || "preview"), prev.assign, cfg);
    return { monthKey: key, preview: true, stats: gen.stats, table: balanceTable(regions, gen.assign, cfg).sort((a, b) => b.totalValue - a.totalValue).slice(0, 50) };
  }
  if (op === "balance") {
    const cycle = await ensureDistribution(key, { cfg }), regions = await ensureRegions(cfg);
    return { monthKey: key, stats: cycle.stats, table: balanceTable(regions, cycle.assign, cfg).sort((a, b) => b.totalValue - a.totalValue) };
  }
  if (op === "regenerate") {      // replaces ONE month's resources; keeps the old one in rc_resource_cycles_archive. Ownership is untouched.
    if (data.confirm !== true) fail("failed-precondition", "CONFIRM_REQUIRED");
    const old = await loadCycle(key), regions = await ensureRegions(cfg), prev = await previousAssign(key);
    const n = ((old && old.regenerations) || 0) + 1, t = now();
    const gen = generateDistribution(regions, seedFor(key, cfg, "regen" + n), prev.assign, cfg);
    if (old) await db().doc("rc_resource_cycles_archive/" + key + "_" + t).set(old);
    const doc = { monthKey: key, seed: seedFor(key, cfg, "regen" + n), status: "complete", algorithmVersion: cfg.ALGORITHM_VERSION, createdAt: (old && old.createdAt) || t, completedAt: t, regenerations: n, prevMonthKey: prev.key, assign: gen.assign, countryValues: gen.countryValues, stats: gen.stats };
    await db().doc("rc_resource_cycles/" + key).set(doc);
    _cache = null;
    return { monthKey: key, regenerated: n, stats: gen.stats };
  }
  fail("invalid-argument", "UNKNOWN_OP");
}

function _resetCache() { _cache = null; _regionsCache = null; }

module.exports = {
  hash32, mulberry32, monthKeyOf, nextMonthStartMs, seedFor, isMonthKey,
  buildDefaultRegions, economicValue, baseProduction, regionProduction, occupationModifier, generateDistribution, countryProduction, balanceTable,
  attackVerdict, loadConfig, ensureRegions, invalidateRegions, ensureDistribution, accrueRegionalProduction, transferVerdict, captureRegionForWar, activeRegionLocks, regionsRef, regionLockRef, getRegionResources, adminResourceDistribution, _resetCache,
};
};
__defs['economy'] = function(module, exports, require){
"use strict";

/* ============================================================
   COUNTRY ECONOMY — Firestore-facing helpers.
   Country economy state lives in rc_countries/{countryId}, which clients can
   READ but never write (see firestore.rules). The existing rc_kingdoms doc keeps
   the Leader / members / chat; this doc holds the server-owned NATIONAL TREASURY
   (`resources`, 3 decimals) and war state pointers. The treasury belongs to the
   country, never to the Leader's personal wallet. It is fed by TWO separate sources:
   the National PvE Tax (by player nationality) and the territorial production
   (by current region owner).
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
  Object.keys(d.resources || {}).forEach((r) => { resources[r] = W.round3(d.resources[r]); });
  return {
    id,
    exists: !!data,
    natural,
    specialitiesChangedAt: d.specialitiesChangedAt || 0,
    taxRate: d.taxRate != null ? d.taxRate : (def ? def.tax : 10),
    resources,
    activeWarId: d.activeWarId || null,
    warCooldownUntil: d.warCooldownUntil || 0,
  };
}

async function readCountry(tx, id) {
  const snap = await tx.get(countryRef(id));
  return normalizeCountry(id, snap.exists ? snap.data() : null);
}

/* ---------- National PvE Tax ----------
   Player -> nationality -> nationality country -> National Treasury.
   The destination depends ONLY on the player's nationality: never on the region the player
   stands in, never on who owns that region, never on the country's territorial resources. */

// A player's nationality. Legacy players that have none yet fall back to their citizenship (kingdomId).
function nationalityOf(player) {
  const n = player && (player.nationality || player.kingdomId);
  return n && COUNTRY_BY_ID[n] ? n : null;
}

// Read phase. Must run BEFORE any tx write in the same transaction.
// Returns null when the player has no (known) nationality — nothing is taxed then.
async function readEconomyForPlayer(tx, player) {
  const cid = nationalityOf(player);
  if (!cid) return null;
  return { countryId: cid, country: await readCountry(tx, cid) };
}

// Pure phase: splits `gains` ({resourceId: grossAmount}) into player net + national tax (3 decimals, no carry).
// The tax applies to EVERY PvE resource gain, whatever the country's territorial resources are.
function applyTaxToGains(econ, player, gains, now, cfg) {
  cfg = cfg || W.WAR_CONFIG;
  const out = { net: {}, lines: [], countryInc: {} };
  Object.keys(gains).forEach((res) => {
    const gross = Math.max(0, W.round3(gains[res]));
    if (!econ) { out.net[res] = gross; return; }
    const s = W.splitPvE({ gross, taxPct: W.normalTaxPct(econ.country.taxRate, cfg), cfg });
    out.net[res] = s.player;
    if (s.tax) out.countryInc[res] = W.round3((out.countryInc[res] || 0) + s.tax);
    out.lines.push({ resource: res, gross: s.gross, player: s.player, tax: s.tax });
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
}

module.exports = { nationalityOf, countryRef, normalizeCountry, readCountry, readEconomyForPlayer, applyTaxToGains, commitEconomy };

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
     rc_wars/{warId}                     the war: target region, rounds, score, territory (what happened to the target region)
     rc_regionWars/{regionId}            which war currently reserves a region (active:true) — two wars can never fight over one region
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
const RD = require("./resource-distribution");
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
  minMembers: [0, 500],
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
      if (typeof o.requireAdjacency === "boolean") cfg.requireAdjacency = o.requireAdjacency;
    }
  } catch (e) { /* defaults */ }
  return cfg;
}

// What a war remembers about the rules it was declared under.
function cfgSnapshot(cfg) {
  return {
    roundMs: cfg.roundMs, roundsToWin: cfg.roundsToWin, maxRounds: cfg.maxRounds,
    cooldownMs: cfg.cooldownMs, strikeEnergyCost: cfg.strikeEnergyCost,
    strikeCooldownMs: cfg.strikeCooldownMs, maxStrikesPerPlayerPerRound: cfg.maxStrikesPerPlayerPerRound,
    maxHitsPerTarget: cfg.maxHitsPerTarget, duelMaxRounds: cfg.duelMaxRounds,
  };
}

function newWarId() { return "war_" + now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }

/* ============================================================
   declareWar — only the Leader of the declaring country, and only against a REGION.
   The defender is never supplied by the client: it is the region's CURRENT owner (rc_world/regions, read inside the
   transaction). The historical / original country of a region plays no role at all.
   ============================================================ */
const REGION_ID_RE = /^[A-Za-z0-9_]{1,80}$/;
async function declareWar(uid, data) {
  const regionId = data && data.targetRegionId;
  if (!regionId && data && data.targetCountryId) fail("invalid-argument", "REGION_REQUIRED");     // country-targeted wars no longer exist
  if (typeof regionId !== "string" || !REGION_ID_RE.test(regionId)) fail("invalid-argument", "INVALID_REGION");
  const cfg = await loadConfig();
  await RD.ensureRegions();            // creates the default regions once if the world has none yet (idempotent, outside the transaction)

  const declared = await db().runTransaction(async (tx) => {
    const t = now();
    const pSnap = await tx.get(playerRef(uid));
    if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
    const aid = pSnap.data().kingdomId;
    if (!aid || !COUNTRY_BY_ID[aid]) fail("failed-precondition", "NO_COUNTRY");

    // Authoritative region data, read INSIDE the transaction: ownership is revalidated at the moment of commit.
    const [kSnap, rSnap, lockSnap, A] = await Promise.all([tx.get(kingdomRef(aid)), tx.get(RD.regionsRef()), tx.get(RD.regionLockRef(regionId)), E.readCountry(tx, aid)]);
    if (!kSnap.exists || kSnap.data().leaderId !== uid) fail("permission-denied", "NOT_LEADER");
    const regions = rSnap.exists ? (rSnap.data().regions || {}) : {};
    const region = regions[regionId];
    if (!region) fail("not-found", "INVALID_REGION");
    const targetId = region.ownerCountryId;                       // <- the defender: the CURRENT owner, nobody else
    if (!targetId || !COUNTRY_BY_ID[targetId]) fail("failed-precondition", "REGION_HAS_NO_OWNER");
    if (targetId === aid) fail("invalid-argument", "OWN_REGION");
    // Front line: only a region that borders one of the attacker's own regions can be attacked (regions read inside this transaction).
    if (cfg.requireAdjacency !== false) { const av = RD.attackVerdict(regions, aid, regionId); if (!av.ok) fail("failed-precondition", "NOT_ADJACENT", { regionId, reason: av.reason }); }
    const D = await E.readCountry(tx, targetId);

    // One war per region: a region reserved by a war that is still running (or whose territory is not settled yet) cannot be targeted again.
    const lock = lockSnap.exists ? lockSnap.data() : null;
    if (lock && lock.active && lock.warId) {
      const lw = await tx.get(warRef(lock.warId));
      const lwd = lw.exists ? lw.data() : null;
      if (lwd && (lwd.status !== "finished" || (lwd.territory && lwd.territory.status === "pending"))) fail("failed-precondition", "REGION_ALREADY_TARGETED", { regionId, warId: lock.warId });
    }

    // A stored activeWarId only counts if that war is really still running.
    const ptrs = [A.activeWarId, D.activeWarId];
    const ptrSnaps = await Promise.all(ptrs.map((id) => (id ? tx.get(warRef(id)) : null)));
    const running = (s) => !!(s && s.exists && s.data().status !== "finished");
    if (running(ptrSnaps[0])) fail("failed-precondition", "ALREADY_AT_WAR");
    if (running(ptrSnaps[1])) fail("failed-precondition", "TARGET_AT_WAR");

    if (A.warCooldownUntil > t) fail("failed-precondition", "COOLDOWN_ACTIVE", { countryId: aid, msRemaining: A.warCooldownUntil - t });
    if (D.warCooldownUntil > t) fail("failed-precondition", "TARGET_COOLDOWN", { countryId: targetId, msRemaining: D.warCooldownUntil - t });

    if (cfg.minMembers > 0) {       // optional minimum (rc_config/war), 0 by default
      const [aMembers, dMembers] = await Promise.all([
        db().collection("rc_players").where("kingdomId", "==", aid).limit(cfg.minMembers).get(),
        db().collection("rc_players").where("kingdomId", "==", targetId).limit(cfg.minMembers).get(),
      ]);
      if (aMembers.size < cfg.minMembers || dMembers.size < cfg.minMembers) fail("failed-precondition", "NOT_ENOUGH_MEMBERS", { required: cfg.minMembers });
    }

    const id = newWarId();
    const war = {
      id, status: "preparing",
      attackerCountryId: aid, defenderCountryId: targetId,
      targetRegionId: regionId, targetRegionName: region.name || regionId,     // what the war is fought over (shown everywhere)
      declaredBy: uid, declaredAt: t, startsAt: t + cfg.prepMs,
      cfg: cfgSnapshot(cfg),
      finalScore: { [aid]: 0, [targetId]: 0 },
      rounds: [],
      winnerCountryId: null, loserCountryId: null,
      territory: null, startedAt: null, endedAt: null,
    };
    tx.set(warRef(id), war);
    tx.set(RD.regionLockRef(regionId), { regionId, warId: id, active: true, attackerCountryId: aid, defenderCountryId: targetId, at: t });
    tx.set(E.countryRef(aid), { activeWarId: id }, { merge: true });
    tx.set(E.countryRef(targetId), { activeWarId: id }, { merge: true });
    return { warId: id, startsAt: war.startsAt, serverNow: t, attackerCountryId: aid, defenderCountryId: targetId, targetRegionId: regionId, targetRegionName: war.targetRegionName };
  });
  const targetId = declared.defenderCountryId;
  const an = COUNTRY_BY_ID[declared.attackerCountryId].name, dn = COUNTRY_BY_ID[targetId].name;
  const msg = `⚔ ${an} declared war on ${dn} over ${declared.targetRegionName}! Round 1 starts in ${Math.max(1, Math.round(cfg.prepMs / 60000))} min.`;
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

    const w = res.war;
    if (res.finished) {
      // A victory has a TERRITORIAL consequence (settled right after this transaction by settleWarTerritory).
      w.territory = { status: "pending" };
      const cooldownUntil = w.endedAt + w.cfg.cooldownMs;
      [w.attackerCountryId, w.defenderCountryId].forEach((cid) => {
        tx.set(E.countryRef(cid), { activeWarId: null, warCooldownUntil: cooldownUntil }, { merge: true });
      });
    }
    tx.set(warRef(warId), w);
    announce = { before: { status: war.status, rounds: (war.rounds || []).map((r) => ({ round: r.round, status: r.status })) }, after: w };
    return { war: w, changed: true };
  });
  if (announce) await announceWarProgress(announce.before, announce.after);
  if (result.war && result.war.status === "finished" && result.war.territory && result.war.territory.status === "pending") {
    try { await settleWarTerritory(warId); } catch (e) { console.error("settle territory", warId, e); }   // tickWars retries it if this fails
    const fresh = await warRef(warId).get();
    if (fresh.exists) result.war = fresh.data();
  }
  return result;
}

// Posts the news of whatever just happened (war started, round decided, war over) to BOTH countries' chats.
/* The attacker takes the TARGETED region if it wins (ownership), see resource-distribution.captureRegionForWar. Idempotent. */
const SETTLE_REASON = {
  LEGACY_NO_TARGET: "this war was declared before wars targeted regions, so no region changes hands",
  REGION_NOT_FOUND: "the targeted region no longer exists",
  OWNER_CHANGED: "the region no longer belongs to the defender",
  REGION_NOT_RESERVED: "the region is reserved by another settlement",
};
async function settleWarTerritory(warId) {
  const territory = await RD.captureRegionForWar(warId);
  if (territory && territory.status && territory.status !== "pending") {
    const nm = (id) => (COUNTRY_BY_ID[id] ? COUNTRY_BY_ID[id].name : id);
    const wSnap = await warRef(warId).get(), w = wSnap.exists ? wSnap.data() : null;
    let text = null;
    if (territory.status === "captured") text = `🗺 ${nm(territory.toCountryId)} captured the region ${territory.regionName} from ${nm(territory.fromCountryId)}: control passes from ${nm(territory.fromCountryId)} to ${nm(territory.toCountryId)}. Its production now goes to ${nm(territory.toCountryId)}'s National Treasury.`;
    else if (territory.status === "held") text = `🛡 ${nm(territory.ownerCountryId)} held ${territory.regionName}. Control of the region does not change.`;
    else if (territory.status === "none") text = `🗺 No region changed hands${territory.regionName ? " (" + territory.regionName + ")" : ""}: ${SETTLE_REASON[territory.reason] || "the region could not be transferred"}.`;
    if (text && w) await Promise.all([Community.postSystemChat(w.attackerCountryId, text), Community.postSystemChat(w.defenderCountryId, text)]);
  }
  return territory;
}
function shortNum(n) { n = Math.floor(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); }
async function announceWarProgress(before, after) {
  const A = after.attackerCountryId, D = after.defenderCountryId;
  const nm = (id) => (COUNTRY_BY_ID[id] ? COUNTRY_BY_ID[id].name : id);
  const lines = [];
  const over = after.targetRegionName ? ` over ${after.targetRegionName}` : "";
  if (before.status === "preparing" && after.status !== "preparing") lines.push(`⚔ The war ${nm(A)} vs ${nm(D)}${over} has started! Round 1 is on.`);
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
    lines.push(`🏆 ${nm(after.winnerCountryId)} won the war against ${nm(after.loserCountryId)} (${after.finalScore[after.winnerCountryId] || 0}-${after.finalScore[after.loserCountryId] || 0}).${after.targetRegionName ? (after.winnerCountryId === A ? ` ${nm(A)} takes ${after.targetRegionName}.` : ` ${nm(D)} keeps ${after.targetRegionName}.`) : ""}`);
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

/* Damage of one round grouped by the country it was dealt for: { countryId: { uid: damage } }.
   A player may now strike for BOTH sides of a war, so the round doc keeps `contribBy`; `contrib` stays the per-player total.
   Older round docs (no contribBy) are read through their single recorded side (`members`). */
function roundByCountry(rd) {
  const contrib = (rd && rd.contrib) || {}, members = (rd && rd.members) || {}, by = (rd && rd.contribBy) || {};
  const out = {}, seen = {};
  Object.keys(by).forEach((cc) => Object.keys(by[cc] || {}).forEach((u) => {
    const v = Number(by[cc][u]) || 0;
    if (v > 0) { (out[cc] = out[cc] || {})[u] = v; seen[u] = (seen[u] || 0) + v; }
  }));
  Object.keys(contrib).forEach((u) => {
    const rest = (Number(contrib[u]) || 0) - (seen[u] || 0);
    if (!seen[u] && rest > 0 && members[u]) { out[members[u]] = out[members[u]] || {}; out[members[u]][u] = (out[members[u]][u] || 0) + rest; }
  });
  return out;
}

/* Which side ("attack" | "defend") a player last fought on in a war (informational only: sides are not locked). Older docs have no `side`; their countryId was the fighter's own country. */
function warSideOf(war, wp) {
  if (wp.side === "attack" || wp.side === "defend") return wp.side;
  if (wp.countryId && wp.countryId === war.attackerCountryId) return "attack";
  if (wp.countryId && wp.countryId === war.defenderCountryId) return "defend";
  return null;
}
// The viewer's own numbers for one war (side, strikes this round, cooldown, damage) — shown next to the Attack / Defend buttons.
function warMe(war, wp) {
  const cur = W.currentRound(war), cfg = war.cfg || {};
  return {
    side: warSideOf(war, wp),
    strikes: cur ? ((wp.strikes || {})[cur.round] || 0) : 0,
    lastStrikeAt: wp.lastStrikeAt || 0,
    damage: Object.values(wp.damage || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    maxStrikes: cfg.maxStrikesPerPlayerPerRound, cooldownMs: 0, energyCost: cfg.strikeEnergyCost,
  };
}

/* warStrike(uid, { warId?, side? })
   OPEN WARS: any player may fight in any active war, whatever his nationality.
   - side "attack" fights for the attacking country, "defend" for the defending one (also against the player's own country).
   - without `side` a citizen of one of the two countries fights for his own country (the old behaviour).
   - NO side lock: a player may strike for either side, as often as the cooldown / strike cap / energy allow. */
async function warStrike(uid, data) {
  const pSnap0 = await playerRef(uid).get();
  if (!pSnap0.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap0.data().kingdomId;      // the player's nationality
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
  const reqSide = data && data.side ? String(data.side) : null;
  if (reqSide && reqSide !== "attack" && reqSide !== "defend") fail("invalid-argument", "INVALID_SIDE");
  let warId = data && data.warId ? String(data.warId) : null;
  if (!warId) {
    const cSnap = await E.countryRef(cid).get();
    const country = E.normalizeCountry(cid, cSnap.exists ? cSnap.data() : null);
    if (!country.activeWarId) fail("failed-precondition", "NO_ACTIVE_WAR");
    warId = country.activeWarId;
  }

  const { war: war0 } = await advanceWar(warId);        // bring the war up to "now" first
  if (war0.status !== "active") fail("failed-precondition", war0.status === "preparing" ? "WAR_NOT_STARTED" : "WAR_ENDED", { startsAt: war0.startsAt });
  const isParty = cid === war0.attackerCountryId || cid === war0.defenderCountryId;
  if (!reqSide && !isParty) fail("failed-precondition", "SIDE_REQUIRED");
  const side = reqSide || (cid === war0.attackerCountryId ? "attack" : "defend");
  const fightCid = side === "attack" ? war0.attackerCountryId : war0.defenderCountryId;   // the country this strike is for
  const cur0 = W.currentRound(war0);
  if (!cur0) fail("failed-precondition", "ROUND_ENDED");
  const enemyId = side === "attack" ? war0.defenderCountryId : war0.attackerCountryId;
  const cfg = war0.cfg;
  const n = cur0.round;

  // Choose the opponent server-side, skipping enemies this player already hit the maximum times this round.
  const wpSnap0 = await warPlayerRef(warId, uid).get();
  const hits0 = (wpSnap0.exists && wpSnap0.data().hits) || {};
  const candSnap = await db().collection("rc_players").where("kingdomId", "==", enemyId).limit(40).get();
  const cands = candSnap.docs.filter((d) => { const x = d.data(); return d.id !== uid && x.username && x.class && G.CLASSES[x.class]; });
  // An enemy country with NO citizens cannot fight back: the strike is uncontested (see below). Otherwise a real citizen is the opponent.
  const undefended = !cands.length;
  const eligible = cands.filter((d) => (hits0[n + "_" + d.id] || 0) < cfg.maxHitsPerTarget);
  if (!undefended && !eligible.length) fail("failed-precondition", "TARGETS_EXHAUSTED");
  const target = undefended ? null : G.pick(eligible);
  const targetData = target ? target.data() : null;

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
    // no waiting period between strikes (only the energy cost and the per-round strike cap limit a player)
    if (target && ((wp.hits || {})[n + "_" + target.id] || 0) >= cfg.maxHitsPerTarget) fail("failed-precondition", "TARGET_LIMIT");

    const { energyCur, maxEnergy, now: energyNow } = G.applyEnergyRegen(c);
    if (energyCur < cfg.strikeEnergyCost) {
      fail("failed-precondition", "NOT_ENOUGH_ENERGY", { required: cfg.strikeEnergyCost, available: Math.floor(energyCur), perHour: G.energyRegenPerHour(maxEnergy) });
    }
    const newEnergy = G.clamp(energyCur - cfg.strikeEnergyCost, 0, maxEnergy);

    // Uncontested strike (the enemy country has no citizens): the attacker deals his full maximum HP as damage, still limited by Energy, cooldown and the per-round strike cap.
    const duel = target ? simulateDuel(c, targetData, cfg.duelMaxRounds) : { damage: Math.floor(G.effectiveStats(c).maxHp), won: true, foeMaxHp: 0, foeHpLeft: 0 };
    const d = duel.damage;

    // Weekly damage counter (week = 7-day block starting Monday 00:00 UTC) for the global rankings.
    const wkKey = Math.floor((t - 345600000) / 604800000);
    const prevWk = (c.weeklyDmg && c.weeklyDmg.week === wkKey) ? (c.weeklyDmg.dmg || 0) : 0;
    tx.update(playerRef(uid), { energyCur: newEnergy, lastEnergyAt: energyNow, weeklyDmg: { week: wkKey, dmg: prevWk + d }, totalDmg: FV().increment(d) });
    tx.set(warPlayerRef(warId, uid), {
      warId, uid, countryId: fightCid, side, nat: cid, lastStrikeAt: t,
      strikes: { [n]: FV().increment(1) },
      hits: target ? { [n + "_" + target.id]: FV().increment(1) } : {},
      damage: { [n]: FV().increment(d) },
    }, { merge: true });
    // Pure increments on the round doc: concurrent strikes never overwrite each other.
    tx.set(roundRef(warId, n), {
      damage: { [fightCid]: FV().increment(d) },
      contrib: { [uid]: FV().increment(d) },
      members: { [uid]: fightCid },                                // last side (kept for older readers)
      contribBy: { [fightCid]: { [uid]: FV().increment(d) } },   // per-country split (a player can fight for both sides)
    }, { merge: true });

    return {
      warId, round: n, side, damage: d, won: duel.won,
      target: targetData ? { name: targetData.username, level: targetData.level, maxHp: duel.foeMaxHp, hpLeft: duel.foeHpLeft } : { name: "an undefended country", level: 0, maxHp: 0, hpLeft: 0 },
      energyCur: newEnergy, lastEnergyAt: energyNow, serverNow: t,
    };
  });
}

// Every resource a citizen can gather (zones) or a country specialises in.
function allTaxableResources() {
  const set = new Set();
  G.ZONES.forEach((z) => (z.resources || []).forEach((r) => set.add(r)));
  Object.values(COUNTRY_BY_ID).forEach((c) => (c.resources || []).forEach((r) => set.add(r)));
  return Array.from(set).sort();
}
/* ============================================================
   getCountryState — everything the Economy / War tabs display, computed
   server-side (including "now"), so the client never does war maths.
   ============================================================ */
function summarizeWar(war, cid, t) {
  return {
    id: war.id, status: war.status,
    attackerCountryId: war.attackerCountryId, defenderCountryId: war.defenderCountryId,
    targetRegionId: war.targetRegionId || null, targetRegionName: war.targetRegionName || null,
    finalScore: war.finalScore, winnerCountryId: war.winnerCountryId, loserCountryId: war.loserCountryId,
    rounds: (war.rounds || []).map((x) => ({ round: x.round, winner: x.winner, damage: x.damage, startsAt: x.startsAt, endsAt: x.endsAt, status: x.status })),
    startedAt: war.startedAt, endedAt: war.endedAt, startsAt: war.startsAt,
    result: war.status === "finished" ? (war.winnerCountryId === cid ? "victory" : "defeat") : null,
    territory: war.territory || null,   // { status: pending|captured|held|none, regionId, regionName, fromCountryId, toCountryId, reason }
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
  return {
    serverNow: t, countryId: cid,
    specialities: c.natural,
  };
}

async function getCountryState(uid) {
  const pSnap = await playerRef(uid).get();
  if (!pSnap.exists) fail("not-found", "NO_CHARACTER");
  const cid = pSnap.data().kingdomId;
  if (!cid || !COUNTRY_BY_ID[cid]) fail("failed-precondition", "NO_COUNTRY");
  await Community.maybeSucceedLeader(cid);   // a Leader who has been away for 7 days is replaced here, lazily
  try { await RD.accrueRegionalProduction(cid); } catch (e) { console.error("regional production", cid, e); }   // regions are the country's main income

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
          maxStrikes: war.cfg.maxStrikesPerPlayerPerRound, cooldownMs: 0, energyCost: war.cfg.strikeEnergyCost,
        };
        // top contributors of the country this round
        const byC = roundByCountry(rd);
        const sideTop = (cc) => Object.keys(byC[cc] || {}).sort((a, b) => byC[cc][b] - byC[cc][a]).slice(0, 5).map((u) => ({ u, cc }));
        const tops = sideTop(war.attackerCountryId).concat(sideTop(war.defenderCountryId));
        const pSnaps = await Promise.all(tops.map((x) => db().collection("rc_players").doc(x.u).get().catch(() => null)));
        live.top = tops.map((x, i) => { const pd = pSnaps[i] && pSnaps[i].exists ? pSnaps[i].data() : {}; return { uid: x.u, damage: byC[x.cc][x.u], country: x.cc, username: pd.username || "Player", level: pd.level || 1 }; });
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
  return {
    serverNow: t, countryId: cid,
    isLeader: leaderId === uid, leaderId,
    taxRate: W.normalTaxPct(country.taxRate),
    resources: country.resources,
    naturalResources: country.natural,
    specialityOptions: allTaxableResources(),
    specialityCooldownUntil: country.specialitiesChangedAt ? country.specialitiesChangedAt + SPECIALITY_COOLDOWN_MS : 0,
    cooldownUntil: country.warCooldownUntil,
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
  const live=all.filter(w=>w.status==="active" || w.status==="preparing");
  const mineWp={};
  if (uid) await Promise.all(live.map(async (w) => { try { const s = await warPlayerRef(w.id, uid).get(); mineWp[w.id] = warMe(w, s.exists ? s.data() : {}); } catch (e) { /* no personal numbers for this war */ } }));
  // The war doc only receives a round's damage when the round is RESOLVED; strikes are written to the round doc. Merge the running
  // round's live damage in, so the score bar moves with every strike instead of waiting for the round to end.
  const withLive = async (w) => {
    const s = Object.assign(summarizeWar(w, null, t), { me: mineWp[w.id] || null });
    const cur = w.status === "active" ? W.currentRound(w) : null;
    if (cur) {
      try {
        const rs = await roundRef(w.id, cur.round).get();
        const dmg = rs.exists ? (rs.data().damage || {}) : {};
        s.rounds = (s.rounds || []).map((r) => (r.round === cur.round ? Object.assign({}, r, { damage: dmg }) : r));
      } catch (e) { /* keep the stored numbers */ }
    }
    return s;
  };
  const active=(await Promise.all(live.map(withLive))).sort((a,b)=>(a.startsAt||a.startedAt||0)-(b.startsAt||b.startedAt||0));
  const recent=all.filter(w=>w.status==="finished").sort((a,b)=>(b.endedAt||0)-(a.endedAt||0)).slice(0,20).map(w=>summarizeWar(w, null, t));
  return {serverNow:t, active, recent};
}

async function tickWars() {
  const t = now();
  try { await RD.ensureDistribution(); } catch (e) { console.error("monthly resource distribution", e); }   // once per month, idempotent (no second cron job)
  const out = { advanced: 0, settled: 0 };
  const live = await db().collection("rc_wars").where("status", "in", ["preparing", "active"]).limit(100).get();
  for (const d of live.docs) {
    try { const r = await advanceWar(d.id); if (r.changed) out.advanced++; } catch (e) { console.error("tick advance", d.id, e); }
  }
  // a finished war whose territory settlement did not complete (crash / lost connection) is settled here, once
  const open = await db().collection("rc_wars").where("territory.status", "==", "pending").limit(50).get();
  for (const d of open.docs) {
    try { await settleWarTerritory(d.id); out.settled++; } catch (e) { console.error("tick settle", d.id, e); }
  }
  return out;
}

module.exports = { announceWarProgress, declareWar, advanceWar, settleWarTerritory, warStrike, setCountrySpecialities, getCountryPublic, getCountryState, getWorldWars, tickWars, simulateDuel, loadConfig, _setClock };
};
__defs['index'] = function(module, exports, require){
"use strict";
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const G = require("./lib/game-core");
const E = require("./lib/economy");
const W = require("./lib/war-core");
const War = require("./lib/war");
const Community = require("./lib/community");
const RD = require("./lib/resource-distribution");
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
    const xpGain = Math.round(G.rnd(8, 14) * foe.level * rewardMult);
    const goldGain = Math.round(G.rnd(6, 12) * foe.level * rewardMult);
    c.xp = (c.xp || 0) + xpGain; c.gold = (c.gold || 0) + goldGain;
    const resGain = {};
    zone.resources.forEach((r) => { resGain[r] = W.round3(G.rndInt(2, 6) * rewardMult); });
    // The National PvE Tax (3 decimals) is taken from the NEW gain only, never from what the player already holds.
    const taxed = E.applyTaxToGains(econ, c, resGain, Date.now());
    zone.resources.forEach((r) => { c.resourceBag[r] = W.round3((c.resourceBag[r] || 0) + taxed.net[r]); });
    E.commitEconomy(tx, econ, taxed);
    rewardLines.push({ label: "XP gained", value: "+" + xpGain }, { label: "Gold gained", value: "+" + goldGain });
    rewardLines.push({ label: "Resources", value: zone.resources.map((r) => `+${taxed.net[r]} ${r}`).join(", ") + taxLabel(taxed) });
    checkLevelUps(c, rewardLines);
  } else if (result === "lose") {
    rewardLines.push({ label: "Result", value: "Defeated — no rewards." });
  } else {
    rewardLines.push({ label: "Result", value: "You retreated safely." });
  }

  tx.update(playerRef, {
    hpCur: c.hpCur, manaCur: c.manaCur, resourceCur: c.resourceCur,
    xp: c.xp, level: c.level, skillPoints: c.skillPoints, gold: c.gold,
    resourceBag: c.resourceBag, inventory: c.inventory,
    energyCur: c.energyCur, lastEnergyAt: c.lastEnergyAt,
    ...(econ && !c.nationality ? { nationality: econ.countryId } : {}),   // legacy players: citizenship becomes their stored nationality
  });
  tx.delete(sessionRef);
  return { ended: true, result, logs, rewardLines, me, foe };
}

function taxLabel(taxed) {
  const parts = taxed.lines.filter((l) => l.tax).map((l) => `${l.resource}: -${l.tax.toFixed(3)}`);
  return parts.length ? ` (national tax ${parts.join(", ")})` : "";
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
      c.resourceBag[r] = W.round3((c.resourceBag[r] || 0) + taxed.net[r]);
      E.commitEconomy(tx, econ, taxed);
      res.resource = r; res.amount = taxed.net[r]; res.gross = taxed.lines[0] ? taxed.lines[0].gross : taxed.net[r];
      update.resourceBag = c.resourceBag;
      if (econ && !c.nationality) update.nationality = econ.countryId;
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
exports.warStrike = functions.https.onCall((data, context) => wrap(() => War.warStrike(requireAuth(context), data)));
exports.setCountrySpecialities = functions.https.onCall((data, context) => wrap(() => War.setCountrySpecialities(requireAuth(context), data)));
exports.getCountryPublic = functions.https.onCall((data, context) => wrap(() => War.getCountryPublic(requireAuth(context), data)));
exports.transferLeadership = functions.https.onCall((data, context) => wrap(() => Community.transferLeadership(requireAuth(context), data)));
exports.getRegionResources = functions.https.onCall((data, context) => wrap(async () => {
  const uid = requireAuth(context);
  const pl = await db.doc("rc_players/" + uid).get(), viewer = pl.exists ? pl.data().kingdomId : null;
  let cid = data && data.countryId;
  if (!cid) cid = viewer;
  return RD.getRegionResources(cid, viewer);   // read-only; generating the month happens server-side, never on a client request's say-so
}));
exports.adminResourceDistribution = functions.https.onCall((data, context) => wrap(() => RD.adminResourceDistribution(requireAuth(context), data || {})));
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
