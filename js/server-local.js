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
  minMembers: 1,                   // raise this once there are real players
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

  return db().runTransaction(async (tx) => {
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
    return { warId: id, startsAt: war.startsAt, serverNow: t };
  });
}

/* ============================================================
   advanceWar — moves a war forward to the current server time.
   Safe to call any number of times, from anywhere (every war call, a
   scheduled tick): a war ends correctly even if nobody is online.
   ============================================================ */
async function advanceWar(warId) {
  return db().runTransaction(async (tx) => {
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
    return { war: w, changed: true };
  });
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
  return db().runTransaction(async (tx) => {
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
    return { warId, resourceId, rate, startedAt: t, expiresAt, serverNow: t };
  });
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

module.exports = { declareWar, advanceWar, warStrike, chooseWarReward, setCountrySpecialities, getCountryPublic, getCountryState, getWorldWars, tickWars, simulateDuel, loadConfig, _setClock };

};
__defs['index'] = function(module, exports, require){
"use strict";
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const G = require("game-core");
const E = require("./lib/economy");
const War = require("./lib/war");
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
