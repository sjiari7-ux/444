"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { install } = require("./harness");

const env = install();
const db = env.db;
const G = require("../lib/game-core");
const W = require("../lib/war-core");
const E = require("../lib/economy");
const War = require("../lib/war");
const { COUNTRY_BY_ID, COUNTRIES } = require("../lib/countries");
const idx = require("../index");

let T = Date.now();
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const CFG = W.WAR_CONFIG;

function mkPlayer(username, country, extra) {
  const cls = G.CLASSES.warrior;
  const c = {
    username, class: "warrior", level: 10, xp: 0, gold: 0, skillPoints: 0,
    hpCur: 400, energyCur: 100, lastEnergyAt: Date.now(), resourceCur: 0, manaCur: 20,
    generalSkills: { health: 0, damage: 0, defense: 0, stamina: 0, storage: 0 },
    classSkills: {}, equipment: { weapon: null, armor: null, helmet: null, boots: null, gloves: null, accessory: null },
    inventory: [], resourceBag: { wood: 0, stone: 0, food: 0, coal: 0, iron: 0, ore: 0, herbs: 0, leather: 0, frost: 0, voidessence: 0 },
    pvp: { rating: 1000, wins: 0, losses: 0, protectedUntil: 0 }, bossCooldowns: {},
    kingdomId: country, kingdomRole: "Recruit",
  };
  cls.skills.forEach((s) => { c.classSkills[s.id] = 0; });
  return Object.assign(c, extra || {});
}

function world() {
  db.store.clear();
  T = Date.now();
  War._setClock(() => T);
  G.pickStepEvent = origPickStepEvent; G.pick = origPick; G.rndInt = origRndInt;
  db.seed("rc_kingdoms/morocco", { id: "morocco", leaderId: "m1", treasury: {}, chat: [] });
  db.seed("rc_kingdoms/germany", { id: "germany", leaderId: "g1", treasury: {}, chat: [] });
  db.seed("rc_players/m1", mkPlayer("MoroccoLeader", "morocco", { kingdomRole: "Leader" }));
  db.seed("rc_players/m2", mkPlayer("MoroccoTwo", "morocco"));
  db.seed("rc_players/g1", mkPlayer("GermanLeader", "germany", { kingdomRole: "Leader" }));
  db.seed("rc_players/g2", mkPlayer("GermanTwo", "germany"));
}
const origPickStepEvent = G.pickStepEvent, origPick = G.pick, origRndInt = G.rndInt;

async function declare() {
  const r = await War.declareWar("m1", { targetCountryId: "germany" });
  return r.warId;
}
async function startWar() { // declared + prep finished, round 1 running
  const id = await declare();
  T = db.read("rc_wars/" + id).startsAt;
  await War.advanceWar(id);
  return id;
}
// Stand-in for "many strikes already happened": writes round damage the way warStrike does.
function putDamage(warId, n, dmg) {
  const cur = db.read(`rc_wars/${warId}/rounds/${n}`) || { damage: {}, contrib: {}, members: {} };
  Object.keys(dmg).forEach((cid, i) => {
    cur.damage[cid] = dmg[cid];
    const u = cid === "morocco" ? "m1" : "g1";
    cur.contrib[u] = dmg[cid]; cur.members[u] = cid;
  });
  db.seed(`rc_wars/${warId}/rounds/${n}`, cur);
}
async function finishRound(warId, n, dmg) {
  putDamage(warId, n, dmg);
  const war = db.read("rc_wars/" + warId);
  T = war.rounds[n - 1].endsAt;
  return (await War.advanceWar(warId)).war;
}
async function expectFail(promise, message) {
  await assert.rejects(promise, (e) => { assert.equal(e.message, message, "got " + e.message + " " + JSON.stringify(e.details)); return true; });
}

/* ------------------------------------------------------------------ */
test("countries.js matches the client KINGDOMS list (ids, resources, tax)", () => {
  const cfg = fs.readFileSync(path.join(__dirname, "../../js/config.js"), "utf8");
  const rows = [...cfg.matchAll(/\{id:'([a-z_]+)', name:'([^']+)', flag:'([a-z]+)', resources:\['([a-z]+)','([a-z]+)'\], tax:(\d+)\}/g)];
  assert.equal(rows.length, COUNTRIES.length);
  rows.forEach((m) => {
    const c = COUNTRY_BY_ID[m[1]];
    assert.ok(c, m[1]);
    assert.deepEqual(c.resources, [m[4], m[5]], m[1]);
    assert.equal(c.tax, Number(m[6]), m[1]);
    assert.ok(c.tax >= CFG.minTaxPct && c.tax <= CFG.maxTaxPct, m[1] + " tax in band");
  });
});

test("firestore.rules: new economy/war collections are client read-only", () => {
  const rules = fs.readFileSync(path.join(__dirname, "../../firestore.rules"), "utf8");
  ["rc_countries", "rc_wars", "rc_warPlayers", "rc_config"].forEach((col) => {
    const i = rules.indexOf("match /" + col + "/");
    assert.ok(i > 0, col + " has a rule");
    assert.match(rules.slice(i, i + 400), /allow write: if false;/, col);
  });
  assert.match(rules, /match \/rounds\/\{roundId\}[\s\S]*?allow write: if false;/);
});

/* ---------- TEST 1 — normal resource tax ---------- */
test("T1 normal tax: 100 Iron at 10% -> player 90, country +10", async () => {
  const s = W.splitGenerated({ gross: 100, normalPct: 10, warPct: 0, carry: null });
  assert.equal(s.player, 90); assert.equal(s.normal, 10); assert.equal(s.war, 0);

  world();
  db.seed("rc_countries/morocco", { taxRate: 10, resources: { iron: 0, stone: 0 } });
  const p = mkPlayer("x", "morocco");
  const out = await db.runTransaction(async (tx) => {
    const econ = await E.readEconomyForPlayer(tx, p);
    const taxed = E.applyTaxToGains(econ, p, { iron: 100, coal: 100 }, T);
    E.commitEconomy(tx, econ, taxed);
    return taxed;
  });
  assert.equal(out.net.iron, 90);
  assert.equal(out.net.coal, 100, "a resource Morocco doesn't naturally produce is not taxed");
  assert.equal(db.read("rc_countries/morocco").resources.iron, 10);
});

test("tax rounding never loses fractions (carry) and total tax is capped", () => {
  let carry = null, country = 0, player = 0;
  for (let i = 0; i < 10; i++) { const s = W.splitGenerated({ gross: 3, normalPct: 10, warPct: 0, carry }); carry = s.carry; country += s.normal; player += s.player; }
  assert.equal(country, 3); assert.equal(player, 27);
  const capped = W.splitGenerated({ gross: 100, normalPct: 15, warPct: 25, carry: null });
  assert.equal(capped.normal + capped.war, 30, "normal+war tax limited to maxEffectiveTaxPct");
  assert.equal(capped.player, 70);
  assert.equal(capped.normal + capped.war + capped.player, 100, "nothing created or destroyed");
});

/* ---------- war flow ---------- */
test("declareWar: Leader only, real target, no self-war", async () => {
  world();
  await expectFail(War.declareWar("m2", { targetCountryId: "germany" }), "NOT_LEADER");
  await expectFail(War.declareWar("g1", { targetCountryId: "germany" }), "INVALID_TARGET");
  await expectFail(War.declareWar("m1", { targetCountryId: "atlantis" }), "INVALID_TARGET");
  const r = await War.declareWar("m1", { targetCountryId: "germany" });
  const war = db.read("rc_wars/" + r.warId);
  assert.equal(war.status, "preparing");
  assert.equal(war.startsAt, T + CFG.prepMs);
  assert.equal(db.read("rc_countries/morocco").activeWarId, r.warId);
  assert.equal(db.read("rc_countries/germany").activeWarId, r.warId);
  await expectFail(War.declareWar("m1", { targetCountryId: "spain" }), "ALREADY_AT_WAR");
  db.seed("rc_kingdoms/spain", { leaderId: "s1" }); db.seed("rc_players/s1", mkPlayer("S", "spain", { kingdomRole: "Leader" }));
  await expectFail(War.declareWar("s1", { targetCountryId: "germany" }), "TARGET_AT_WAR");
});

test("T2 round 1: Morocco 1000 vs Germany 900 -> Morocco wins round, score 1-0", async () => {
  world();
  const id = await startWar();
  let war = db.read("rc_wars/" + id);
  assert.equal(war.status, "active"); assert.equal(war.rounds[0].endsAt - war.rounds[0].startsAt, CFG.roundMs);
  war = await finishRound(id, 1, { morocco: 1000, germany: 900 });
  assert.equal(war.rounds[0].winner, "morocco");
  assert.deepEqual([war.finalScore.morocco, war.finalScore.germany], [1, 0]);
  assert.equal(war.status, "active"); assert.equal(war.rounds.length, 2, "round 2 started");
  assert.equal(war.rounds[1].startsAt, war.rounds[0].endsAt);
});

test("T3 2-0: war ends immediately, round 3 never starts", async () => {
  world();
  const id = await startWar();
  await finishRound(id, 1, { morocco: 1000, germany: 900 });
  const war = await finishRound(id, 2, { morocco: 500, germany: 100 });
  assert.equal(war.status, "finished"); assert.equal(war.winnerCountryId, "morocco"); assert.equal(war.loserCountryId, "germany");
  assert.equal(war.rounds.length, 2);
  assert.deepEqual([war.finalScore.morocco, war.finalScore.germany], [2, 0]);
  assert.equal(war.reward.status, "awaiting_choice");
  assert.equal(db.read("rc_countries/morocco").activeWarId, null);
});

test("T4 1-1 -> round 3 starts;  T5 round 3 decides 2-1", async () => {
  world();
  const id = await startWar();
  await finishRound(id, 1, { morocco: 82400, germany: 75200 });
  let war = await finishRound(id, 2, { morocco: 71300, germany: 90100 });
  assert.equal(war.status, "active"); assert.equal(war.rounds.length, 3);
  assert.deepEqual([war.finalScore.morocco, war.finalScore.germany], [1, 1]);
  war = await finishRound(id, 3, { morocco: 105200, germany: 93500 });
  assert.equal(war.status, "finished"); assert.equal(war.winnerCountryId, "morocco");
  assert.deepEqual([war.finalScore.morocco, war.finalScore.germany], [2, 1]);
  assert.equal(war.rounds.length, 3);
});

test("a war can never exceed 3 rounds and there is always a winner (deterministic tie-break)", async () => {
  world();
  const id = await startWar();
  await finishRound(id, 1, { morocco: 10, germany: 10 });   // tie, nobody participated equally -> defender (Germany)
  let war = db.read("rc_wars/" + id);
  assert.equal(war.rounds[0].winner, "germany"); assert.equal(war.rounds[0].tieBreak, "defender");
  const byParticipants = W.resolveRoundWinner({ damage: { a: 5, b: 5 }, contrib: { u1: 3, u2: 2, u3: 5 }, members: { u1: "a", u2: "a", u3: "b" } }, "a", "b");
  assert.equal(byParticipants.winnerId, "a"); assert.equal(byParticipants.tieBreak, "participants");
  putDamage(id, 2, { morocco: 50, germany: 10 });
  war = await finishRound(id, 2, { morocco: 50, germany: 10 });
  assert.equal(war.rounds.length, 3);
  war = await finishRound(id, 3, { morocco: 7, germany: 7 });
  assert.equal(war.status, "finished"); assert.ok(war.winnerCountryId);
  const r = W.resolveRoundWinner({ damage: {}, contrib: {}, members: {} }, "a", "b");
  assert.equal(r.winnerId, "b"); assert.equal(r.tieBreak, "defender");
});

test("a war that ends while everybody is offline is finalized on the next call, with consistent timestamps", async () => {
  world();
  const id = await startWar();
  putDamage(id, 1, { morocco: 5, germany: 1 });
  const r1End = db.read("rc_wars/" + id).rounds[0].endsAt;
  T = r1End + 10 * DAY; // nobody touched the war for 10 days
  const { war } = await War.advanceWar(id);
  assert.equal(war.status, "finished");
  assert.equal(war.rounds[0].endsAt, r1End);
  assert.equal(war.rounds[1].startsAt, r1End);
});

/* ---------- reward + war tax ---------- */
async function morocco2_0() {
  const id = await startWar();
  await finishRound(id, 1, { morocco: 1000, germany: 900 });
  await finishRound(id, 2, { morocco: 1000, germany: 900 });
  return id;
}

test("T6 leader chooses ONE resource, only from what Germany actually produces", async () => {
  world();
  const id = await morocco2_0();
  const offered = db.read("rc_wars/" + id).reward.options;
  assert.deepEqual(offered.slice().sort(), COUNTRY_BY_ID.germany.resources.slice().sort());
  assert.ok(!offered.includes("wood") && !offered.includes("food"));
  const state = await War.getCountryState("m1");
  assert.deepEqual(state.pendingReward.options.slice().sort(), offered.slice().sort());
  assert.equal(state.isLeader, true);
  assert.equal((await War.getCountryState("m2")).isLeader, false);

  await expectFail(War.chooseWarReward("m2", { warId: id, resourceId: "coal" }), "NOT_LEADER");
  await expectFail(War.chooseWarReward("g1", { warId: id, resourceId: "coal" }), "NOT_LEADER");
  await expectFail(War.chooseWarReward("m1", { warId: id, resourceId: "wood" }), "INVALID_RESOURCE");
  await expectFail(War.chooseWarReward("m1", { warId: id, resourceId: null }), "INVALID_ACTION");
  const res = await War.chooseWarReward("m1", { warId: id, resourceId: "coal" });
  assert.equal(res.rate, 10);
  assert.equal(res.expiresAt - res.startedAt, 14 * DAY, "exactly 14 days");
  await expectFail(War.chooseWarReward("m1", { warId: id, resourceId: "iron" }), "REWARD_NOT_AVAILABLE");
  const war = db.read("rc_wars/" + id);
  assert.equal(war.selectedResource, "coal"); assert.equal(war.reward.status, "active");
  assert.equal(db.read("rc_countries/germany").warTaxOut.winnerCountryId, "morocco");
  assert.equal(db.read("rc_countries/germany").pendingReward, null);
  assert.equal(db.read("rc_countries/morocco").warTaxIn.length, 1);
});

test("a client-chosen percentage or duration is ignored (fixed by the war's rules)", async () => {
  world();
  const id = await morocco2_0();
  const res = await War.chooseWarReward("m1", { warId: id, resourceId: "coal", rate: 99, days: 365, expiresAt: 1 });
  assert.equal(res.rate, 10); assert.equal(res.expiresAt - res.startedAt, 14 * DAY);
});

test("T7 war tax stacking: 100 Coal -> player 80, Germany +10, Morocco +10", async () => {
  world();
  const id = await morocco2_0();
  await War.chooseWarReward("m1", { warId: id, resourceId: "coal" });
  db.seed("rc_countries/germany", Object.assign(db.read("rc_countries/germany"), { taxRate: 10 }));
  db.seed("rc_players/g2", mkPlayer("GermanTwo", "germany", { resourceBag: { coal: 50000 } })); // T9 baseline
  const p = db.read("rc_players/g2");
  const out = await db.runTransaction(async (tx) => {
    const econ = await E.readEconomyForPlayer(tx, p);
    const taxed = E.applyTaxToGains(econ, p, { coal: 100, iron: 100 }, T);
    E.commitEconomy(tx, econ, taxed);
    return taxed;
  });
  assert.equal(out.net.coal, 80);
  assert.equal(out.net.iron, 90, "war tax only touches the chosen resource; normal tax still applies to iron");
  assert.equal(db.read("rc_countries/germany").resources.coal, 10);
  assert.equal(db.read("rc_countries/morocco").resources.coal, 10);
  assert.equal(db.read("rc_countries/morocco").warTaxCollected[id], 10);
  assert.equal(db.read("rc_players/g2").resourceBag.coal, 50000, "T9: existing inventory is never touched");
});

test("T8 expiry: after 14 days new Coal no longer goes to Morocco; tick cleans up", async () => {
  world();
  const id = await morocco2_0();
  const { expiresAt } = await War.chooseWarReward("m1", { warId: id, resourceId: "coal" });
  const p = mkPlayer("g", "germany");
  const probe = async (now) => db.runTransaction(async (tx) => {
    const econ = await E.readEconomyForPlayer(tx, p);
    return E.applyTaxToGains(econ, p, { coal: 100 }, now);
  });
  assert.equal((await probe(expiresAt - 1)).winnerInc.coal, 10, "still active 1ms before expiry");
  assert.equal((await probe(expiresAt)).winnerInc.coal, undefined, "serverTime >= expiresAt is expired");
  T = expiresAt + 1000;
  const r = await War.tickWars();
  assert.equal(r.expiredTaxes, 1);
  assert.equal(db.read("rc_countries/germany").warTaxOut, null);
  assert.equal(db.read("rc_wars/" + id).reward.status, "expired");
  assert.equal(db.read("rc_wars/" + id).selectedResource, "coal", "history is kept");
  const st = await War.getCountryState("m1");
  assert.equal(st.history[0].rewardState, "expired"); assert.equal(st.warTaxIn.length, 0);
});

test("T10 the war tax belongs to the country: a Leader change doesn't touch it", async () => {
  world();
  const id = await morocco2_0();
  await War.chooseWarReward("m1", { warId: id, resourceId: "coal" });
  db.seed("rc_kingdoms/morocco", { id: "morocco", leaderId: "m2", treasury: {}, chat: [] });
  const st = await War.getCountryState("m2");
  assert.equal(st.warTaxIn.length, 1); assert.equal(st.warTaxIn[0].resourceId, "coal"); assert.equal(st.isLeader, true);
  assert.equal((await War.getCountryState("g2")).warTaxOut.resourceId, "coal");
});

test("new Leader can still claim a pending reward; unclaimed rewards are forfeited after the window", async () => {
  world();
  const id = await morocco2_0();
  db.seed("rc_kingdoms/morocco", { id: "morocco", leaderId: "m2", treasury: {}, chat: [] }); // leader changed before choosing
  await expectFail(War.chooseWarReward("m1", { warId: id, resourceId: "coal" }), "NOT_LEADER");
  const id2 = id;
  T = db.read("rc_wars/" + id2).reward.claimExpiresAt + 1;
  await expectFail(War.chooseWarReward("m2", { warId: id2, resourceId: "coal" }), "REWARD_EXPIRED");
  const r = await War.tickWars();
  assert.equal(r.forfeited, 1);
  assert.equal(db.read("rc_countries/germany").pendingReward, null);
});

test("protection: no war on a country paying war tax, nor during the post-war cooldown", async () => {
  world();
  const id = await morocco2_0();
  await War.chooseWarReward("m1", { warId: id, resourceId: "coal" });
  db.seed("rc_kingdoms/spain", { leaderId: "s1" }); db.seed("rc_players/s1", mkPlayer("S", "spain", { kingdomRole: "Leader" }));
  db.seed("rc_players/s2", mkPlayer("S2", "spain"));
  await expectFail(War.declareWar("m1", { targetCountryId: "spain" }), "COOLDOWN_ACTIVE");
  await expectFail(War.declareWar("s1", { targetCountryId: "germany" }), "TARGET_COOLDOWN");
  T += CFG.cooldownMs + 1; // cooldown over, but Germany is still paying the 14-day war tax
  await expectFail(War.declareWar("s1", { targetCountryId: "germany" }), "TARGET_PROTECTED");
  await War.declareWar("m1", { targetCountryId: "spain" });
});

/* ---------- strikes / anti-exploit ---------- */
function setCfg(o) { db.seed("rc_config/war", o); }

test("strike: server-simulated damage goes to the striker's country, costs Energy, ignores client numbers", async () => {
  world(); setCfg({ strikeCooldownMs: 0 });
  const id = await startWar();
  const res = await idx.warStrike({ damage: 999999999, winner: "morocco" }, { auth: { uid: "m2" } });
  assert.ok(res.damage >= 0 && res.damage <= res.target.maxHp, "damage bounded by the target's HP: " + res.damage);
  assert.ok(["GermanLeader", "GermanTwo"].includes(res.target.name));
  const rd = db.read(`rc_wars/${id}/rounds/1`);
  assert.equal(rd.damage.morocco, res.damage);
  assert.equal(rd.contrib.m2, res.damage);
  assert.equal(db.read("rc_players/m2").energyCur < 100, true);
  assert.equal(db.read(`rc_warPlayers/${id}_m2`).strikes[1], 1);
});

test("strike: cooldown, strike cap, per-target cap, energy", async () => {
  world();
  await startWar();
  await War.warStrike("m1");
  await expectFail(War.warStrike("m1"), "COOLDOWN_ACTIVE");

  world(); setCfg({ strikeCooldownMs: 0, maxStrikesPerPlayerPerRound: 2 });
  await startWar();
  await War.warStrike("m1"); await War.warStrike("m1");
  await expectFail(War.warStrike("m1"), "STRIKE_LIMIT");

  world(); setCfg({ strikeCooldownMs: 0, maxHitsPerTarget: 1 }); // two German players -> only 2 counted hits per round
  await startWar();
  await War.warStrike("m1"); await War.warStrike("m1");
  await expectFail(War.warStrike("m1"), "TARGETS_EXHAUSTED");

  world(); setCfg({ strikeCooldownMs: 0 });
  db.seed("rc_players/m1", mkPlayer("MoroccoLeader", "morocco", { kingdomRole: "Leader", energyCur: 3 }));
  await startWar();
  await expectFail(War.warStrike("m1"), "NOT_ENOUGH_ENERGY");
});

test("strike: only members of the two countries, only while a round is running", async () => {
  world(); setCfg({ strikeCooldownMs: 0 });
  db.seed("rc_players/s2", mkPlayer("S2", "spain"));
  const id = await declare();
  await expectFail(War.warStrike("m1"), "WAR_NOT_STARTED");           // still in preparation
  await expectFail(War.warStrike("s2"), "NO_ACTIVE_WAR");             // a third country
  T = db.read("rc_wars/" + id).startsAt; await War.advanceWar(id);
  await War.warStrike("m1");
  // round 1 ends; with no more damage Germany wins it on tie-break, round 2 is now live and strikes go there
  T = db.read("rc_wars/" + id).rounds[0].endsAt + 1;
  const r = await War.warStrike("m2");
  assert.equal(r.round, 2);
  T = db.read("rc_wars/" + id).rounds[1].endsAt + 1; // nobody strikes in round 2 -> war ends 0-2 or so
  await War.advanceWar(id);
  const fin = db.read("rc_wars/" + id);
  if (fin.status === "finished") await expectFail(War.warStrike("m1"), "NO_ACTIVE_WAR");
});

test("strike: a hit that arrives after the round closed is rejected, not counted", async () => {
  world(); setCfg({ strikeCooldownMs: 0 });
  const id = await startWar();
  const endsAt = db.read("rc_wars/" + id).rounds[0].endsAt;
  // simulate the race: the strike's pre-check saw round 1, but the clock passed its end before the transaction ran
  let first = true;
  War._setClock(() => { if (first) { first = false; return endsAt - 1000; } return endsAt + 1; });
  await assert.rejects(War.warStrike("m1"));
  War._setClock(() => T);
  const rd = db.read(`rc_wars/${id}/rounds/1`);
  assert.ok(!rd || !rd.damage || !rd.damage.morocco, "no damage recorded for the late strike");
});

test("full loop: strikes decide rounds, a leader claims the tax", async () => {
  world(); setCfg({ strikeCooldownMs: 0 });
  // make Morocco overwhelmingly stronger so the outcome is deterministic
  db.seed("rc_players/m1", mkPlayer("MoroccoLeader", "morocco", { kingdomRole: "Leader", level: 60, generalSkills: { health: 0, damage: 50, defense: 0, stamina: 0, storage: 0 } }));
  db.seed("rc_players/g1", mkPlayer("GermanLeader", "germany", { kingdomRole: "Leader", level: 1 }));
  db.seed("rc_players/g2", mkPlayer("GermanTwo", "germany", { level: 1 }));
  const id = await startWar();
  for (let round = 1; round <= 2; round++) {
    await War.warStrike("m1"); await War.warStrike("m1");
    const r = db.read("rc_wars/" + id).rounds[round - 1];
    T = r.endsAt; await War.advanceWar(id);
  }
  const war = db.read("rc_wars/" + id);
  assert.equal(war.status, "finished"); assert.equal(war.winnerCountryId, "morocco");
  await War.chooseWarReward("m1", { warId: id, resourceId: "iron" });
  assert.equal(db.read("rc_countries/germany").warTaxOut.resourceId, "iron");
});

/* ---------- PvE + Road integration (server transactions, read-before-write enforced) ---------- */
test("Road step: resources are taxed on the server; fractions accumulate exactly", async () => {
  world();
  const zone = G.ZONES[0];
  const res = zone.resources[0];
  const country = COUNTRIES.find((c) => c.resources.includes(res)).id;
  db.seed("rc_kingdoms/" + country, { leaderId: "r1" });
  db.seed("rc_countries/" + country, { taxRate: 10, resources: {} });
  db.seed("rc_players/r1", mkPlayer("Roady", country));
  G.pickStepEvent = () => "resource"; G.pick = () => res; G.rndInt = () => 3;
  for (let i = 0; i < 10; i++) await idx.takeRoadStep({ zoneId: zone.id }, { auth: { uid: "r1" } });
  const p = db.read("rc_players/r1");
  const ctry = db.read("rc_countries/" + country);
  assert.equal(p.resourceBag[res] + ctry.resources[res], 30, "all 30 generated units accounted for");
  assert.equal(ctry.resources[res], 3, "10% of 30");
  assert.equal(p.resourceBag[res], 27);
  assert.equal(Math.round(p.energyCur), 80, "10 steps x 2 energy");
});

test("Road step: gold / monster events still work and monster needs no extra Energy", async () => {
  world();
  const zone = G.ZONES[0];
  G.pickStepEvent = () => "gold"; G.rndInt = () => 5;
  let r = await idx.takeRoadStep({ zoneId: zone.id }, { auth: { uid: "m1" } });
  assert.equal(r.gold, 5); assert.equal(db.read("rc_players/m1").gold, 5);
  G.pickStepEvent = () => "monster"; G.rndInt = origRndInt;
  r = await idx.takeRoadStep({ zoneId: zone.id }, { auth: { uid: "m1" } });
  assert.ok(r.monster && r.monster.sessionId);
  assert.ok(db.read("rc_players/m1/combat/session"));
  assert.equal(Math.round(db.read("rc_players/m1").energyCur), 96);
  await assert.rejects(idx.takeRoadStep({ zoneId: "nope" }, { auth: { uid: "m1" } }));
});

test("PvE boss win: gains are taxed (country + war tax) inside resolveCombatRound", async () => {
  world();
  const zone = G.ZONES[0];
  const resId = zone.resources[0];
  const loser = COUNTRIES.find((c) => c.resources.includes(resId) && c.id !== "morocco").id;
  db.seed("rc_kingdoms/" + loser, { leaderId: "l1" });
  db.seed("rc_players/l1", mkPlayer("Loser", loser));
  db.seed("rc_countries/" + loser, { taxRate: 10, resources: {}, warTaxOut: { warId: "w9", winnerCountryId: "morocco", loserCountryId: loser, resourceId: resId, rate: 10, startedAt: Date.now(), expiresAt: Date.now() + DAY } });
  const c = db.read("rc_players/l1");
  const me = G.buildCombatant(c, true, c.username);
  const foe = G.buildMonster(zone, 5, zone.boss, "boss"); foe.hp = 1; foe.eva = 0; foe.def = 0;
  db.seed("rc_players/l1/combat/session", { sessionId: "s1", uid: "l1", mode: "pve", zoneId: zone.id, boss: true, elite: false, me, foe, round: 1, maxRounds: 30, ended: false });
  G.rndInt = (a, b) => b; // deterministic: 6 * 3.2 = 19 per resource
  const out = await idx.resolveCombatRound({ sessionId: "s1", action: { kind: "attack" } }, { auth: { uid: "l1" } });
  G.rndInt = origRndInt;
  assert.equal(out.ended, true); assert.equal(out.result, "win");
  const p = db.read("rc_players/l1");
  assert.equal(p.resourceBag[resId], 17, "19 gross - 1 country - 1 war tax");
  assert.equal(db.read("rc_countries/" + loser).resources[resId], 1);
  assert.equal(db.read("rc_countries/morocco").resources[resId], 1);
  assert.match(out.rewardLines.find((l) => l.label === "Resources").value, /country tax/);
});

test("getCountryState: live war view for both sides", async () => {
  world(); setCfg({ strikeCooldownMs: 0 });
  const id = await startWar();
  await War.warStrike("m1");
  const st = await War.getCountryState("g1");
  assert.equal(st.activeWar.id, id); assert.equal(st.activeWar.live.round, 1);
  assert.ok(st.activeWar.live.damage.morocco >= 0);
  assert.equal(st.activeWar.mine.strikes, 0);
  assert.equal((await War.getCountryState("m1")).activeWar.mine.strikes, 1);
  assert.equal(typeof st.serverNow, "number");
});
