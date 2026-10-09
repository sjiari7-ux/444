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
  prepMs: 30 * 60 * 1000,          // declaration -> round 1 starts
  roundMs: 5 * 60 * 60 * 1000,     // fixed duration of every round
  roundsToWin: 2,
  maxRounds: 3,
  cooldownMs: 24 * 60 * 60 * 1000, // post-war protection for BOTH countries
  minMembers: 0,                   // no minimum: a country with 0 players can be attacked, and one without regions can attack (it still needs a Leader player to declare)
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

const REGION_NAME_PREFIX = ["Northern", "Southern", "Eastern", "Western", "Central", "Coastal"];

const RESOURCE_DISTRIBUTION_CONFIG = {
  MONTHLY_DISTRIBUTION_ENABLED: true,
  RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE: 0.10,   // (max - min) / max country value must be <= this
  MAX_BALANCING_ITERATIONS: 5000,
  ALGORITHM_VERSION: 1,
  REGIONS_PER_COUNTRY: 4,
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
  RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE: [0.01, 0.5], MAX_BALANCING_ITERATIONS: [0, 50000], REGIONS_PER_COUNTRY: [1, 12],
  QUALITY_MIN: [0.5, 1], QUALITY_MAX: [1, 2], VARIETY_REPEAT_PENALTY: [0, 1], MIN_SWAP_GEO_WEIGHT: [0, 5],
  OCCUPATION_MODIFIER: [0, 1], HIGH_RESISTANCE_MODIFIER: [0, 1], MAX_ACCRUAL_MS: [0, 30 * 24 * 3600 * 1000],
};

module.exports = {
  RESOURCE_TIERS, TIER_VALUE, TIER_BASE_PRODUCTION, TIER_MAX_SHARE, TIER_BASE_WEIGHT,
  RESOURCE_VALUES, RESOURCE_BASE_PRODUCTION, TIER_OF, ALL_RESOURCES,
  RESOURCE_GEOGRAPHY_WEIGHTS, NATURAL_TO_GEO, GEOGRAPHIES, REGION_NAME_PREFIX,
  RESOURCE_DISTRIBUTION_CONFIG, CFG_NUMBER_LIMITS,
};
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

// Default region list built from the EXISTING country data (natural resources inspire the geography of the first regions).
function buildDefaultRegions(cfg) {
  const out = {};
  COUNTRIES.forEach((c) => {
    for (let i = 0; i < cfg.REGIONS_PER_COUNTRY; i++) {
      const id = c.id + "_" + (i + 1);
      const rnd = mulberry32(hash32("region|" + id));
      const geo = i < c.resources.length ? (RC.NATURAL_TO_GEO[c.resources[i]] || "plains") : RC.GEOGRAPHIES[Math.floor(rnd() * RC.GEOGRAPHIES.length)];
      out[id] = newRegion(id, c, i, geo);
    }
  });
  return out;
}
function newRegion(id, country, i, geo) {
  return {
    id, countryId: country.id, name: RC.REGION_NAME_PREFIX[i % RC.REGION_NAME_PREFIX.length] + " " + country.name, geo,
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

  // 2) BALANCING phase: swap deposits (resource + quality) between a rich and a poor country while it helps
  const val = new Array(n), tot = new Array(countryIds.length).fill(0);
  for (let i = 0; i < n; i++) { val[i] = economicValue(res[i], qual[i]); tot[owner[i]] += val[i]; }
  const byCountry = countryIds.map(() => []);
  for (let i = 0; i < n; i++) byCountry[owner[i]].push(i);
  const spreadOf = () => { let mx = -Infinity, mn = Infinity; for (const t of tot) { if (t > mx) mx = t; if (t < mn) mn = t; } return { mx, mn, spread: mx > 0 ? (mx - mn) / mx : 0 }; };
  const okSwap = (a, b) => geoWeight(geo[b], res[a]) >= cfg.MIN_SWAP_GEO_WEIGHT && geoWeight(geo[a], res[b]) >= cfg.MIN_SWAP_GEO_WEIGHT;
  const doSwap = (a, b) => {
    const ca = owner[a], cb = owner[b];
    const r = res[a], q = qual[a], v = val[a];
    res[a] = res[b]; qual[a] = qual[b]; val[a] = val[b];
    res[b] = r; qual[b] = q; val[b] = v;
    tot[ca] += val[a] - v; tot[cb] += val[b] - val[a] + 0; // recomputed below for exactness
    // exact recompute for the two touched countries (cheap, avoids float drift)
    tot[ca] = byCountry[ca].reduce((s, k) => s + val[k], 0);
    tot[cb] = byCountry[cb].reduce((s, k) => s + val[k], 0);
  };
  // best swap between two given countries (S richer than W): value moved d must satisfy 0 < d < gap, closest to gap/2
  const bestBetween = (S, W) => {
    const gap = tot[S] - tot[W]; let best = null, bestScore = Infinity;
    for (const a of byCountry[S]) for (const b of byCountry[W]) {
      const d = val[a] - val[b];
      if (d <= 0 || d >= gap) continue;
      if (!okSwap(a, b)) continue;
      const score = Math.abs(gap / 2 - d);
      if (score < bestScore) { bestScore = score; best = [a, b]; }
    }
    return best;
  };
  let iterations = 0, stalls = 0, st = spreadOf();
  const TOP = 6, C = countryIds.length;
  while (st.spread > cfg.RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE && iterations < cfg.MAX_BALANCING_ITERATIONS && stalls < 60 && C > 1) {
    iterations++;
    const idx = countryIds.map((_, i) => i).sort((x, y) => tot[y] - tot[x]);
    let moved = false, bestPair = null, bestScore = Infinity;
    for (let s = 0; s < Math.min(TOP, C); s++) for (let w = 0; w < Math.min(TOP, C); w++) {
      const S = idx[s], W = idx[C - 1 - w];
      if (S === W || tot[S] <= tot[W]) continue;
      const p = bestBetween(S, W);
      if (p) { const sc = Math.abs((tot[S] - tot[W]) / 2 - (val[p[0]] - val[p[1]])) - (tot[S] - tot[W]) * 0.5; if (sc < bestScore) { bestScore = sc; bestPair = p; } }
    }
    if (!bestPair) {          // fall back to random rich/poor pairs
      for (let k = 0; k < 60 && !bestPair; k++) {
        const S = Math.floor(rnd() * C), W = Math.floor(rnd() * C);
        if (S === W || tot[S] <= tot[W]) continue;
        bestPair = bestBetween(S, W);
      }
    }
    if (bestPair) { doSwap(bestPair[0], bestPair[1]); moved = true; }
    stalls = moved ? 0 : stalls + 1;
    st = spreadOf();
  }

  const assign = {};
  ids.forEach((id, i) => { assign[id] = { r: res[i], q: qual[i] }; });
  const countryValues = {}; countryIds.forEach((c, i) => { countryValues[c] = Math.round(tot[i]); });
  const avg = tot.reduce((a, b) => a + b, 0) / Math.max(1, tot.length);
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
  const existing = snap.exists ? (snap.data().regions || {}) : {};
  const wanted = buildDefaultRegions(cfg);
  const missing = Object.keys(wanted).filter((id) => !existing[id]);
  if (!missing.length) { _regionsCache = { at: now(), regions: existing }; return existing; }
  await db().runTransaction(async (tx) => {
    const cur = await tx.get(regionsRef());
    const have = cur.exists ? (cur.data().regions || {}) : {};
    const add = {}; Object.keys(wanted).forEach((id) => { if (!have[id]) add[id] = wanted[id]; });
    if (Object.keys(add).length) tx.set(regionsRef(), { regions: add, version: 1, updatedAt: now() }, { merge: true });
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
  if (existing && existing.status === "complete") { _cache = { key, cycle: existing }; return existing; }
  if (!cfg.MONTHLY_DISTRIBUTION_ENABLED) return null;
  const regions = await ensureRegions(cfg);
  const prev = await previousAssign(key);
  const seed = seedFor(key, cfg);
  const gen = generateDistribution(regions, seed, prev.assign, cfg);
  if (!gen.stats.withinTolerance) console.warn("[resources] " + key + ": balance spread " + gen.stats.spreadPct + "% > tolerance " + gen.stats.tolerancePct + "% after " + gen.stats.iterations + " iterations");
  const t = now();
  const doc = { monthKey: key, seed, status: "complete", algorithmVersion: cfg.ALGORITHM_VERSION, createdAt: t, completedAt: t, prevMonthKey: prev.key, assign: gen.assign, countryValues: gen.countryValues, stats: gen.stats };
  // doc id == monthKey is the unique constraint; the transaction makes "check then create" atomic
  const saved = await db().runTransaction(async (tx) => {
    const s = await tx.get(cycleRef(key));
    if (s.exists && s.data().status === "complete") return s.data();
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

async function getRegionResources(countryId) {
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
    regions: mine.map((id) => regionView(regions[id], cycle.assign[id], cfg, locks[id])),
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
  loadConfig, ensureRegions, invalidateRegions, ensureDistribution, accrueRegionalProduction, transferVerdict, captureRegionForWar, activeRegionLocks, regionsRef, regionLockRef, getRegionResources, adminResourceDistribution, _resetCache,
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
  let cid = data && data.countryId;
  if (!cid) { const p = await db.collection("rc_players").doc(uid).get(); cid = p.exists ? p.data().kingdomId : null; }
  return RD.getRegionResources(cid);   // read-only; generating the month happens server-side, never on a client request's say-so
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
