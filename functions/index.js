/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Server-side war round resolver
   ═══════════════════════════════════════════════════════════════
   Runs on a schedule ON GOOGLE'S SERVERS (not in any player's
   browser), so a war round advances even if zero players are
   online. Mirrors resolveWarRoundIfDue() from territory.js exactly
   — same constants, same win/finish logic — just running with the
   Admin SDK instead of the client SDK.

   SETUP:
   1. Requires the Firebase "Blaze" (pay-as-you-go) plan — Cloud
      Functions don't run on the free Spark plan. In practice a
      game this size costs cents/month; the schedule below only
      does work when a round is actually overdue.
   2. From your project root:
        npm install -g firebase-tools   (if not already installed)
        firebase init functions        (choose JavaScript, this folder)
        cd functions && npm install firebase-admin firebase-functions
   3. Drop this file in as functions/index.js.
   4. Deploy:
        firebase deploy --only functions
   5. Adjust the schedule below ("every 5 minutes") to taste — more
      frequent = rounds flip closer to on-time, but a little more
      invocations. Every 5 min is a good default for a 6h round.
   ═══════════════════════════════════════════════════════════════ */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Keep these in sync with the values in territory.js
const WAR_ROUND_HOURS = 6;
const WAR_ROUNDS_TO_WIN = 2;
const WAR_COOLDOWN_HOURS = 12;
const WAR_DECLARE_GOLD_COST = 0; // free for now — keep in sync with territory.js
const TERRITORY_CAPTURE_DEFENSE = 90;
const TERRITORY_ATTACK_ENERGY = 8;
const TERRITORY_CAPITAL_INDEX = 1;
const ALLIANCE_RANK = { leader: 5, coleader: 4, officer: 3, member: 2, recruit: 1 };
const ZONE_ADJACENCY = {
  plains:   ['forest', 'mountain', 'swamp'],
  forest:   ['plains', 'cave'],
  cave:     ['forest', 'dark'],
  dark:     ['cave', 'swamp'],
  swamp:    ['dark', 'mountain', 'plains'],
  mountain: ['swamp', 'plains'],
};
// Keep in sync with ZONE_HOME_KINGDOM / KINGDOM_HOME_ZONE / CORE_GATE_INDEX /
// CORE_ROUTE_INDICES in territory.js — this is the server-side mirror of
// the Ancient Core route graph, re-verifying a kingdom's whole corridor to
// the Core server-side instead of trusting the client's check alone.
const ZONE_HOME_KINGDOM = {
  plains: 'europe', forest: 'asia', cave: 'north_america',
  dark: 'south_america', swamp: 'arab_world', mountain: 'africa',
};
const KINGDOM_HOME_ZONE = {};
Object.keys(ZONE_HOME_KINGDOM).forEach(z => { KINGDOM_HOME_ZONE[ZONE_HOME_KINGDOM[z]] = z; });
const CORE_GATE_INDEX = 3;
const CORE_ROUTE_INDICES = [2, 3, 4]; // Outpost -> Fortress Gate -> Mountain Pass — keep in sync with territory.js
function coreGateId(zone){ return `${zone}_${CORE_GATE_INDEX}`; }
function coreRouteTerritoryIds(zone){ return CORE_ROUTE_INDICES.map(idx => `${zone}_${idx}`); }
// Real connectivity check, mirrors kingdomHoldsCoreGate() in territory.js:
// the WHOLE corridor (Outpost -> Fortress Gate -> Mountain Pass) between
// the kingdom's unconquerable Capital and the Core must be in its own
// hands, not just the final Gate. A single batched getAll() keeps this to
// one round-trip instead of CORE_ROUTE_INDICES.length separate reads.
async function kingdomHoldsCoreGate(kingdomId){
  const homeZone = KINGDOM_HOME_ZONE[kingdomId];
  if(!homeZone) return false;
  const refs = coreRouteTerritoryIds(homeZone).map(id => db.collection('territories').doc(id));
  const snaps = await db.getAll(...refs);
  return snaps.every(snap => snap.exists && snap.data().ownerKingdom === kingdomId);
}
// Hard ceiling on a single hit's reported damage. This is a sanity clamp,
// NOT a real anti-cheat boundary: contributeToWar still trusts the dmg the
// client computed from the player's own stats, and those stats are still
// self-writable client-side (see the open item about players/{uid} in the
// chat). This only stops obviously-forged values (e.g. dmg: 999999999)
// from ever landing in Firestore. Raise it if legitimate endgame builds
// ever exceed it.
const MAX_SINGLE_HIT_DAMAGE = 10000;

// ── ANCIENT CORE — hold bonus (Phase C) ──────────────────────────────
// "Do NOT make the Core owner permanently unbeatable" — so the bonus
// decays the longer one kingdom holds it, down to a floor, instead of
// staying flat forever. Resets to full strength on every new capture
// (capturedAt gets overwritten in attackCore/resolveDueCoreSiege).
const CORE_DIVIDEND_BASE_GOLD = 150;
const CORE_DIVIDEND_BASE_MAGIC_STONES = 8;
const CORE_BONUS_DECAY_HOURS = 72; // bonus linearly decays to the floor over 3 days of unbroken control
const CORE_BONUS_FLOOR = 0.4;      // never drops below 40% of the base dividend

function isCapitalTerritory(tid){
  return tid.endsWith(`_${TERRITORY_CAPITAL_INDEX}`);
}

async function kingdomHasFootholdNear(zone, kingdomId){
  const zones = [zone, ...(ZONE_ADJACENCY[zone] || [])];
  const snap = await db.collection('territories').where('zone', 'in', zones).where('ownerKingdom', '==', kingdomId).limit(1).get();
  return !snap.empty;
}

async function requireMemberRank(kingdomId, uid, minRole){
  const memberSnap = await db.collection('alliances').doc(kingdomId).collection('members').doc(uid).get();
  if(!memberSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this kingdom.');
  const role = memberSnap.data().role;
  if((ALLIANCE_RANK[role] || 0) < (ALLIANCE_RANK[minRole] || 0)){
    throw new HttpsError('permission-denied', 'Your kingdom rank is too low for this action.');
  }
  return role;
}

async function resolveOneTerritory(doc){
  const tid = doc.id;
  const ref = db.collection('territories').doc(tid);
  try{
    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if(!snap.exists || !snap.data().war) return null;
      const cur = snap.data();
      const war = cur.war;
      const endsAtMs = war.roundEndsAt && war.roundEndsAt.toMillis ? war.roundEndsAt.toMillis() : 0;
      if(Date.now() < endsAtMs) return null; // not due yet

      const attackerWonRound = (war.attackerDamage || 0) > (war.defenderDamage || 0); // ties favor the defender
      const attackerWins = (war.attackerWins || 0) + (attackerWonRound ? 1 : 0);
      const defenderWins = (war.defenderWins || 0) + (attackerWonRound ? 0 : 1);

      if(attackerWins >= WAR_ROUNDS_TO_WIN){
        tx.update(ref, {
          ownerKingdom: war.attackerKingdom,
          defense: TERRITORY_CAPTURE_DEFENSE,
          capturedBy: null,
          capturedByName: war.startedByName || null,
          capturedAt: admin.firestore.FieldValue.serverTimestamp(),
          war: admin.firestore.FieldValue.delete(),
          warCooldownUntil: admin.firestore.Timestamp.fromMillis(Date.now() + WAR_COOLDOWN_HOURS * 3600000),
        });
        return { tid, finished: true, winner: 'attacker', attackerKingdom: war.attackerKingdom, defenderKingdom: cur.ownerKingdom };
      }
      if(defenderWins >= WAR_ROUNDS_TO_WIN){
        tx.update(ref, {
          war: admin.firestore.FieldValue.delete(),
          warCooldownUntil: admin.firestore.Timestamp.fromMillis(Date.now() + WAR_COOLDOWN_HOURS * 3600000),
        });
        return { tid, finished: true, winner: 'defender', attackerKingdom: war.attackerKingdom, defenderKingdom: cur.ownerKingdom };
      }
      tx.update(ref, {
        'war.round': (war.round || 1) + 1,
        'war.attackerDamage': 0,
        'war.defenderDamage': 0,
        'war.attackerHits': 0,
        'war.defenderHits': 0,
        'war.attackerWins': attackerWins,
        'war.defenderWins': defenderWins,
        'war.roundEndsAt': admin.firestore.Timestamp.fromMillis(Date.now() + WAR_ROUND_HOURS * 3600000),
        'war.contributions': {},
      });
      return { tid, finished: false, nextRound: (war.round || 1) + 1 };
    });
    if(outcome){
      console.log('[war-resolver]', JSON.stringify(outcome));
      if(outcome.finished){
        // Kingdom win/loss tally for the Kingdoms leaderboard — moved here
        // (Admin SDK, bypasses rules) since the client no longer detects
        // "the siege just finished" itself. Previously this was a plain
        // client write with no membership check at all on the receiving
        // side; doing it here instead of loosening that rule closes that
        // gap too.
        const attackerWon = outcome.winner === 'attacker';
        await Promise.all([
          db.collection('alliances').doc(outcome.attackerKingdom).set({
            warsWon: admin.firestore.FieldValue.increment(attackerWon ? 1 : 0),
            warsLost: admin.firestore.FieldValue.increment(attackerWon ? 0 : 1),
          }, { merge: true }),
          db.collection('alliances').doc(outcome.defenderKingdom).set({
            warsWon: admin.firestore.FieldValue.increment(attackerWon ? 0 : 1),
            warsLost: admin.firestore.FieldValue.increment(attackerWon ? 1 : 0),
          }, { merge: true }),
        ]);
        if(attackerWon){ await awardSeasonPoints(outcome.attackerKingdom, SEASON_POINTS_TERRITORY_WIN); }
      }
    }
  }catch(e){
    console.error(`[war-resolver] Failed resolving ${tid}:`, e.message);
  }
}

exports.resolveDueWarRounds = onSchedule('every 5 minutes', async () => {
  // Only territories that currently have an active war need checking.
  const snap = await db.collection('territories').where('war', '!=', null).get();
  if(snap.empty) return;
  await Promise.all(snap.docs.map(resolveOneTerritory));
});

/* ═══════════════════════════════════════════════════════════════
   declareWar — replaces the direct client write to territories/{tid}.
   Mirrors declareWar()'s checks from territory.js, but every check is
   re-verified here against Firestore instead of trusting the caller's
   local `state`. Called with: { tid, kingdomId }
   ═══════════════════════════════════════════════════════════════ */
exports.declareWar = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if(!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const { tid, kingdomId } = request.data || {};
  if(typeof tid !== 'string' || typeof kingdomId !== 'string'){
    throw new HttpsError('invalid-argument', 'tid and kingdomId are required.');
  }

  await requireMemberRank(kingdomId, uid, 'officer');

  const ref = db.collection('territories').doc(tid);
  const doc = await ref.get();
  if(!doc.exists) throw new HttpsError('not-found', 'Outpost not found.');
  const t = doc.data();

  if(isCapitalTerritory(tid)) throw new HttpsError('failed-precondition', "A kingdom's capital can never be attacked.");
  if(t.ownerKingdom === kingdomId) throw new HttpsError('failed-precondition', 'You already hold this outpost.');
  if(t.war) throw new HttpsError('failed-precondition', 'A siege is already underway here.');
  const cooldownMs = t.warCooldownUntil && t.warCooldownUntil.toMillis ? t.warCooldownUntil.toMillis() : 0;
  if(cooldownMs > Date.now()) throw new HttpsError('failed-precondition', 'This outpost is on cooldown after a recent siege.');
  if(!(await kingdomHasFootholdNear(t.zone, kingdomId))){
    throw new HttpsError('failed-precondition', 'Your kingdom needs ground in this zone or a bordering one first.');
  }

  if(WAR_DECLARE_GOLD_COST > 0){
    const playerRef = db.collection('players').doc(uid);
    await db.runTransaction(async (tx) => {
      const pSnap = await tx.get(playerRef);
      const gold = (pSnap.exists && typeof pSnap.data().gold === 'number') ? pSnap.data().gold : 0;
      if(gold < WAR_DECLARE_GOLD_COST) throw new HttpsError('failed-precondition', 'Not enough gold.');
      tx.update(playerRef, { gold: admin.firestore.FieldValue.increment(-WAR_DECLARE_GOLD_COST) });
    });
  }

  const playerName = (await db.collection('players').doc(uid).get()).data().username || 'Player';

  await ref.update({
    war: {
      attackerKingdom: kingdomId,
      round: 1,
      roundEndsAt: admin.firestore.Timestamp.fromMillis(Date.now() + WAR_ROUND_HOURS * 3600000),
      attackerDamage: 0, defenderDamage: 0,
      attackerHits: 0, defenderHits: 0,
      attackerWins: 0, defenderWins: 0,
      startedBy: uid,
      startedByName: playerName,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      contributions: {},
    },
    warCooldownUntil: admin.firestore.FieldValue.delete(),
  });

  return { ok: true };
});

/* ═══════════════════════════════════════════════════════════════
   contributeToWar — replaces the direct client write to
   territories/{tid}. Verifies the caller is really a member of a
   kingdom on the side they claim, deducts their own energy
   server-side, and clamps the reported damage. It still trusts the
   *amount* of damage the client computed (see MAX_SINGLE_HIT_DAMAGE
   above) — closing that fully requires computing combat power from
   the player's stored stats here instead of accepting `dmg`, which
   depends on locking down players/{uid} first (see chat).
   Called with: { tid, side: 'attack'|'defend', kingdomId, dmg }
   ═══════════════════════════════════════════════════════════════ */
exports.contributeToWar = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if(!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const { tid, side, kingdomId, dmg } = request.data || {};
  if(typeof tid !== 'string' || (side !== 'attack' && side !== 'defend') || typeof kingdomId !== 'string'){
    throw new HttpsError('invalid-argument', 'tid, side and kingdomId are required.');
  }
  const cleanDmg = Math.max(1, Math.min(MAX_SINGLE_HIT_DAMAGE, Math.round(Number(dmg) || 0)));

  await requireMemberRank(kingdomId, uid, 'recruit');

  const tRef = db.collection('territories').doc(tid);
  const pRef = db.collection('players').doc(uid);
  const playerSnap = await pRef.get();
  const playerName = (playerSnap.exists && playerSnap.data().username) || 'Player';

  await db.runTransaction(async (tx) => {
    const tSnap = await tx.get(tRef);
    if(!tSnap.exists || !tSnap.data().war) throw new HttpsError('failed-precondition', 'This siege has already ended.');
    const war = tSnap.data().war;

    const isAttacker = side === 'attack';
    if(isAttacker && war.attackerKingdom !== kingdomId) throw new HttpsError('permission-denied', 'Your kingdom is not attacking this outpost.');
    if(!isAttacker && war.attackerKingdom === kingdomId) throw new HttpsError('permission-denied', "You can't defend against your own kingdom's siege.");

    const pSnap = await tx.get(pRef);
    const stamina = (pSnap.exists && typeof pSnap.data().stamina === 'number') ? pSnap.data().stamina : 0;
    if(stamina < TERRITORY_ATTACK_ENERGY) throw new HttpsError('failed-precondition', 'Not enough energy.');

    const contribKey = `${uid}__${side}`;
    const dmgField = isAttacker ? 'attackerDamage' : 'defenderDamage';
    const hitField = isAttacker ? 'attackerHits' : 'defenderHits';

    tx.update(pRef, { stamina: admin.firestore.FieldValue.increment(-TERRITORY_ATTACK_ENERGY) });
    tx.update(tRef, {
      [`war.${dmgField}`]: admin.firestore.FieldValue.increment(cleanDmg),
      [`war.${hitField}`]: admin.firestore.FieldValue.increment(1),
      [`war.contributions.${contribKey}.dmg`]: admin.firestore.FieldValue.increment(cleanDmg),
      [`war.contributions.${contribKey}.hits`]: admin.firestore.FieldValue.increment(1),
      [`war.contributions.${contribKey}.name`]: playerName,
      [`war.contributions.${contribKey}.side`]: side,
      [`war.contributions.${contribKey}.uid`]: uid,
      [`war.contributions.${contribKey}.kingdom`]: kingdomId,
    });
  });

  // Kingdom leaderboard tally — same field the old client write used
  // (alliances/{id}.totalWarDamage), just done with the Admin SDK now.
  await db.collection('alliances').doc(kingdomId).set({
    totalWarDamage: admin.firestore.FieldValue.increment(cleanDmg),
  }, { merge: true });

  return { ok: true, dmg: cleanDmg };
});

/* ═══════════════════════════════════════════════════════════════
   ANCIENT CORE — capture & siege
   Same shape as the territory war engine above (round timer, damage
   race, per-player contributions), just aimed at meta/ancientCore
   instead of territories/{tid}. First capture (core.ownerKingdom is
   null) is an instant flag-plant — no defenders exist yet. Once a
   kingdom holds it, taking it back goes through the same best-of-N
   siege as a territory. Keep CORE_GATE_INDEX etc. in sync with
   territory.js.
   ═══════════════════════════════════════════════════════════════ */
const CORE_COOLDOWN_HOURS = WAR_COOLDOWN_HOURS;

/* Creates meta/ancientCore with its default shape the first time any
   Core-related Cloud Function runs, using the Admin SDK (bypasses
   firestore.rules — the client is intentionally NOT allowed to write this
   doc at all, same as territories/{tid}.war). Safe to call every time;
   it's a no-op once the doc exists. */
async function ensureCoreDocExists(){
  const ref = db.collection('meta').doc('ancientCore');
  const doc = await ref.get();
  if(doc.exists) return { ref, core: doc.data() };
  const initial = {
    ownerKingdom: null,
    status: 'unclaimed',
    seasonId: 1,
    coreHealth: null,
    routeNodes: Object.keys(ZONE_HOME_KINGDOM).flatMap(coreRouteTerritoryIds),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(initial, { merge: true });
  return { ref, core: initial };
}

exports.attackCore = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if(!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const { kingdomId } = request.data || {};
  if(typeof kingdomId !== 'string') throw new HttpsError('invalid-argument', 'kingdomId is required.');

  await requireMemberRank(kingdomId, uid, 'officer');

  if(!(await kingdomHoldsCoreGate(kingdomId))){
    throw new HttpsError('failed-precondition', "Your kingdom doesn't hold its Gate — the route to the Core is cut.");
  }

  const { ref, core } = await ensureCoreDocExists();

  if(core.ownerKingdom === kingdomId) throw new HttpsError('failed-precondition', 'Your kingdom already holds the Core.');
  if(core.siege) throw new HttpsError('failed-precondition', 'The Core is already under siege.');
  const cooldownMs = core.coreCooldownUntil && core.coreCooldownUntil.toMillis ? core.coreCooldownUntil.toMillis() : 0;
  if(cooldownMs > Date.now()) throw new HttpsError('failed-precondition', 'The Core is still recovering from a recent siege.');

  const playerName = (await db.collection('players').doc(uid).get()).data().username || 'Player';

  if(!core.ownerKingdom){
    // Unclaimed — no defenders to fight, this is a first capture.
    await ref.update({
      ownerKingdom: kingdomId,
      status: 'held',
      capturedBy: uid,
      capturedByName: playerName,
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, captured: true };
  }

  // Held by another kingdom — open a siege, same round shape as territory war.
  await ref.update({
    status: 'contested',
    siege: {
      attackerKingdom: kingdomId,
      round: 1,
      roundEndsAt: admin.firestore.Timestamp.fromMillis(Date.now() + WAR_ROUND_HOURS * 3600000),
      attackerDamage: 0, defenderDamage: 0,
      attackerHits: 0, defenderHits: 0,
      attackerWins: 0, defenderWins: 0,
      startedBy: uid,
      startedByName: playerName,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      contributions: {},
    },
    coreCooldownUntil: admin.firestore.FieldValue.delete(),
  });
  return { ok: true, captured: false, siegeStarted: true };
});

/* Called with: { side: 'attack'|'defend', kingdomId, dmg } — mirrors
   contributeToWar exactly, just against meta/ancientCore's `siege` field. */
exports.contributeToCore = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if(!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const { side, kingdomId, dmg } = request.data || {};
  if((side !== 'attack' && side !== 'defend') || typeof kingdomId !== 'string'){
    throw new HttpsError('invalid-argument', 'side and kingdomId are required.');
  }
  const cleanDmg = Math.max(1, Math.min(MAX_SINGLE_HIT_DAMAGE, Math.round(Number(dmg) || 0)));

  await requireMemberRank(kingdomId, uid, 'recruit');

  const ref = db.collection('meta').doc('ancientCore');
  const pRef = db.collection('players').doc(uid);
  const playerSnap = await pRef.get();
  const playerName = (playerSnap.exists && playerSnap.data().username) || 'Player';

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if(!snap.exists || !snap.data().siege) throw new HttpsError('failed-precondition', 'This siege has already ended.');
    const core = snap.data();
    const siege = core.siege;

    const isAttacker = side === 'attack';
    if(isAttacker && siege.attackerKingdom !== kingdomId) throw new HttpsError('permission-denied', 'Your kingdom is not attacking the Core.');
    if(!isAttacker && core.ownerKingdom !== kingdomId) throw new HttpsError('permission-denied', "You can't defend a Core your kingdom doesn't hold.");

    const pSnap = await tx.get(pRef);
    const stamina = (pSnap.exists && typeof pSnap.data().stamina === 'number') ? pSnap.data().stamina : 0;
    if(stamina < TERRITORY_ATTACK_ENERGY) throw new HttpsError('failed-precondition', 'Not enough energy.');

    const contribKey = `${uid}__${side}`;
    const dmgField = isAttacker ? 'attackerDamage' : 'defenderDamage';
    const hitField = isAttacker ? 'attackerHits' : 'defenderHits';

    tx.update(pRef, { stamina: admin.firestore.FieldValue.increment(-TERRITORY_ATTACK_ENERGY) });
    tx.update(ref, {
      [`siege.${dmgField}`]: admin.firestore.FieldValue.increment(cleanDmg),
      [`siege.${hitField}`]: admin.firestore.FieldValue.increment(1),
      [`siege.contributions.${contribKey}.dmg`]: admin.firestore.FieldValue.increment(cleanDmg),
      [`siege.contributions.${contribKey}.hits`]: admin.firestore.FieldValue.increment(1),
      [`siege.contributions.${contribKey}.name`]: playerName,
      [`siege.contributions.${contribKey}.side`]: side,
      [`siege.contributions.${contribKey}.uid`]: uid,
      [`siege.contributions.${contribKey}.kingdom`]: kingdomId,
    });
  });

  await db.collection('alliances').doc(kingdomId).set({
    totalWarDamage: admin.firestore.FieldValue.increment(cleanDmg),
  }, { merge: true });

  return { ok: true, dmg: cleanDmg };
});

/* Mirrors resolveOneTerritory above, run on the same 5-minute schedule,
   just resolving meta/ancientCore's `siege` field instead of a
   territories/{tid}.war field. */
exports.resolveDueCoreSiege = onSchedule('every 5 minutes', async () => {
  const ref = db.collection('meta').doc('ancientCore');
  try{
    const { core: seeded } = await ensureCoreDocExists(); // no-op once it exists
    if(!seeded.siege) return; // nothing under siege — the get() above is enough
    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if(!snap.exists || !snap.data().siege) return null;
      const core = snap.data();
      const siege = core.siege;
      const endsAtMs = siege.roundEndsAt && siege.roundEndsAt.toMillis ? siege.roundEndsAt.toMillis() : 0;
      if(Date.now() < endsAtMs) return null; // not due yet

      const attackerWonRound = (siege.attackerDamage || 0) > (siege.defenderDamage || 0); // ties favor the defender
      const attackerWins = (siege.attackerWins || 0) + (attackerWonRound ? 1 : 0);
      const defenderWins = (siege.defenderWins || 0) + (attackerWonRound ? 0 : 1);

      if(attackerWins >= WAR_ROUNDS_TO_WIN){
        tx.update(ref, {
          ownerKingdom: siege.attackerKingdom,
          status: 'held',
          capturedBy: null,
          capturedByName: siege.startedByName || null,
          capturedAt: admin.firestore.FieldValue.serverTimestamp(),
          siege: admin.firestore.FieldValue.delete(),
          coreCooldownUntil: admin.firestore.Timestamp.fromMillis(Date.now() + CORE_COOLDOWN_HOURS * 3600000),
        });
        return { finished: true, winner: 'attacker', attackerKingdom: siege.attackerKingdom, defenderKingdom: core.ownerKingdom };
      }
      if(defenderWins >= WAR_ROUNDS_TO_WIN){
        tx.update(ref, {
          status: 'held',
          siege: admin.firestore.FieldValue.delete(),
          coreCooldownUntil: admin.firestore.Timestamp.fromMillis(Date.now() + CORE_COOLDOWN_HOURS * 3600000),
        });
        return { finished: true, winner: 'defender', attackerKingdom: siege.attackerKingdom, defenderKingdom: core.ownerKingdom };
      }
      tx.update(ref, {
        'siege.round': (siege.round || 1) + 1,
        'siege.attackerDamage': 0,
        'siege.defenderDamage': 0,
        'siege.attackerHits': 0,
        'siege.defenderHits': 0,
        'siege.attackerWins': attackerWins,
        'siege.defenderWins': defenderWins,
        'siege.roundEndsAt': admin.firestore.Timestamp.fromMillis(Date.now() + WAR_ROUND_HOURS * 3600000),
        'siege.contributions': {},
      });
      return { finished: false, nextRound: (siege.round || 1) + 1 };
    });
    if(outcome){
      console.log('[core-resolver]', JSON.stringify(outcome));
      if(outcome.finished){
        const attackerWon = outcome.winner === 'attacker';
        await Promise.all([
          db.collection('alliances').doc(outcome.attackerKingdom).set({
            coreWarsWon: admin.firestore.FieldValue.increment(attackerWon ? 1 : 0),
            coreWarsLost: admin.firestore.FieldValue.increment(attackerWon ? 0 : 1),
          }, { merge: true }),
          db.collection('alliances').doc(outcome.defenderKingdom).set({
            coreWarsWon: admin.firestore.FieldValue.increment(attackerWon ? 0 : 1),
            coreWarsLost: admin.firestore.FieldValue.increment(attackerWon ? 1 : 0),
          }, { merge: true }),
        ]);
        await awardSeasonPoints(attackerWon ? outcome.attackerKingdom : outcome.defenderKingdom, SEASON_POINTS_CORE_SIEGE_WIN);
      }
    }
  }catch(e){
    console.error('[core-resolver] Failed resolving Core siege:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════
   creditCoreDividend — Phase C: the reward for holding the Core.
   Pays the current owner kingdom a resource stipend on a schedule,
   decaying the longer they've held it unbroken (see CORE_BONUS_DECAY_HOURS
   above) so the bonus helps without letting one kingdom snowball forever.
   Also tallies coreControlPoints per kingdom — the running total the
   season system (a later phase) will use to decide the seasonal winner.
   Pays out even while under siege (defense phase): the owner keeps
   earning until they actually lose the siege, same as holding a
   territory keeps taxing it while a war is in progress.
   ═══════════════════════════════════════════════════════════════ */
exports.creditCoreDividend = onSchedule('every 30 minutes', async () => {
  try{
    const { core } = await ensureCoreDocExists();
    if(!core.ownerKingdom) return; // unclaimed — nobody to pay

    const capturedAtMs = core.capturedAt && core.capturedAt.toMillis ? core.capturedAt.toMillis() : Date.now();
    const holdHours = Math.max(0, (Date.now() - capturedAtMs) / 3600000);
    const decay = Math.max(CORE_BONUS_FLOOR, 1 - (holdHours / CORE_BONUS_DECAY_HOURS) * (1 - CORE_BONUS_FLOOR));
    const goldAmount = Math.round(CORE_DIVIDEND_BASE_GOLD * decay);
    const magicAmount = Math.round(CORE_DIVIDEND_BASE_MAGIC_STONES * decay);

    await db.collection('alliances').doc(core.ownerKingdom).set({
      treasury: {
        gold: admin.firestore.FieldValue.increment(goldAmount),
        magic_stones: admin.firestore.FieldValue.increment(magicAmount),
      },
      coreControlPoints: admin.firestore.FieldValue.increment(1),
    }, { merge: true });
    // Feed the seasonal leaderboard too — holding the Core is the single
    // biggest source of Season Points (SEASON_POINTS_CORE_TICK per 30 min).
    await awardSeasonPoints(core.ownerKingdom, SEASON_POINTS_CORE_TICK);

    console.log('[core-dividend]', JSON.stringify({ kingdom: core.ownerKingdom, goldAmount, magicAmount, decay: decay.toFixed(2) }));
  }catch(e){
    console.error('[core-dividend] Failed:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════
   SEASON SYSTEM
   Ancient Core ownership already existed; what was missing was any
   sense that the war has a beginning/end and a score. meta/season is
   the running scoreboard for the current season (kingdomId -> points);
   every 30-min Core dividend tick, every territory capture, and every
   won Core siege feeds it via awardSeasonPoints(). resolveDueSeason
   (scheduled, same "runs even if nobody's online" pattern as the war/
   core resolvers) closes the season out once endsAt passes: crowns the
   kingdom with the most points, pays them a one-time treasury reward,
   appends a compact entry to meta/season.history (kept short — no new
   top-level collection, so no firestore.rules change needed: meta/{id}
   is already write-locked to server-only, see firestore.rules), and
   immediately opens the next season.
   ═══════════════════════════════════════════════════════════════ */
const SEASON_LENGTH_DAYS = 30;
const SEASON_POINTS_CORE_TICK = 5;      // per 30-min Core dividend tick, to the Core's current owner
const SEASON_POINTS_TERRITORY_WIN = 3;  // per outpost captured (attacker only — defenders keep what they already had)
const SEASON_POINTS_CORE_SIEGE_WIN = 40; // one-off, big — winning/defending a full Core siege matters far more than one outpost
const SEASON_HISTORY_MAX = 20;          // keep the last N seasons; older ones just fall off the end
const SEASON_REWARD_GOLD = 5000;
const SEASON_REWARD_MAGIC_STONES = 200;

function newSeasonDoc(seasonNumber, startMs){
  return {
    seasonNumber,
    startedAt: admin.firestore.Timestamp.fromMillis(startMs),
    endsAt: admin.firestore.Timestamp.fromMillis(startMs + SEASON_LENGTH_DAYS * 86400000),
    points: {},
  };
}

async function ensureSeasonDocExists(){
  const ref = db.collection('meta').doc('season');
  const doc = await ref.get();
  if(doc.exists) return { ref, season: doc.data() };
  const initial = newSeasonDoc(1, Date.now());
  await ref.set(initial, { merge: true });
  return { ref, season: initial };
}

// Called from anywhere a kingdom does something season-worthy. Safe to
// call even before meta/season exists (bootstraps it first).
async function awardSeasonPoints(kingdomId, points){
  if(!kingdomId || !points) return;
  await ensureSeasonDocExists();
  await db.collection('meta').doc('season').update({
    [`points.${kingdomId}`]: admin.firestore.FieldValue.increment(points),
  });
}

exports.resolveDueSeason = onSchedule('every 1 hours', async () => {
  const ref = db.collection('meta').doc('season');
  try{
    const { season: seeded } = await ensureSeasonDocExists(); // no-op once it exists
    const endsAtMs = seeded.endsAt && seeded.endsAt.toMillis ? seeded.endsAt.toMillis() : 0;
    if(Date.now() < endsAtMs) return; // not due yet

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if(!snap.exists) return null;
      const season = snap.data();
      const stillDueMs = season.endsAt && season.endsAt.toMillis ? season.endsAt.toMillis() : 0;
      if(Date.now() < stillDueMs) return null; // another invocation already rolled it over

      const points = season.points || {};
      const ranked = Object.entries(points).sort((a, b) => b[1] - a[1]);
      const winnerKingdom = ranked.length ? ranked[0][0] : null;
      const winnerPoints = ranked.length ? ranked[0][1] : 0;

      const historyEntry = {
        seasonNumber: season.seasonNumber || 1,
        winnerKingdom, winnerPoints, points,
        endedAt: admin.firestore.Timestamp.fromMillis(Date.now()),
      };
      const history = (season.history || []).concat([historyEntry]).slice(-SEASON_HISTORY_MAX);

      const next = newSeasonDoc((season.seasonNumber || 1) + 1, Date.now());
      tx.set(ref, { ...next, history }, { merge: false }); // merge:false — old season's `points` must NOT bleed into the new one

      // Keep the Ancient Core's own seasonId label in step with the new season.
      tx.set(db.collection('meta').doc('ancientCore'), { seasonId: next.seasonNumber }, { merge: true });

      return historyEntry;
    });

    if(outcome && outcome.winnerKingdom){
      await db.collection('alliances').doc(outcome.winnerKingdom).set({
        treasury: {
          gold: admin.firestore.FieldValue.increment(SEASON_REWARD_GOLD),
          magic_stones: admin.firestore.FieldValue.increment(SEASON_REWARD_MAGIC_STONES),
        },
        seasonsWon: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
      console.log('[season-resolver] Season', outcome.seasonNumber, 'won by', outcome.winnerKingdom, 'with', outcome.winnerPoints, 'points');
    }
  }catch(e){
    console.error('[season-resolver] Failed:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════
   resolveDueElections — presidential elections, one per kingdom.
   Candidacy (electionCandidates) and votes (electionVotes) are
   plain client writes, each doc owned by its own uid — Firestore
   rules alone stop double votes and impersonated candidacy. Only
   the count-and-crown step runs here, because it rewrites someone
   ELSE's member role (loser → coleader, winner → leader), which a
   normal player write can never do (see firestore.rules). Mirrors
   resolveDueWarRounds above: runs on a schedule so a term still
   turns over even if nobody is online when it ends.
   Keep ELECTION_TERM_MS in sync with js/alliance.js.
   ═══════════════════════════════════════════════════════════════ */
const KINGDOM_IDS = ['europe', 'asia', 'arab_world', 'africa', 'north_america', 'south_america'];
const ELECTION_TERM_MS = 7 * 24 * 60 * 60 * 1000; // 7-day presidential term

async function resolveOneElection(kingdomId){
  const ref = db.collection('alliances').doc(kingdomId);
  try{
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if(!snap.exists) return; // nobody has founded this kingdom yet
      const a = snap.data();
      const termEndsAtMs = a.presidentTermEndsAt && a.presidentTermEndsAt.toMillis ? a.presidentTermEndsAt.toMillis() : 0;

      if(!termEndsAtMs){
        // First time this kingdom is seen by the resolver — just start
        // the clock. Whoever is leader today finishes out this first term.
        tx.set(ref, {
          presidentTermEndsAt: admin.firestore.Timestamp.fromMillis(Date.now() + ELECTION_TERM_MS),
          electionTermNumber: a.electionTermNumber || 1,
        }, { merge: true });
        return;
      }

      // ── Reads (all of them, before any write below — Firestore
      // transactions forbid reading after writing) ──────────────────
      const termNumber = a.electionTermNumber || 1;
      const leaderSnap = a.leaderId ? await tx.get(ref.collection('members').doc(a.leaderId)) : null;
      // The elected president can leave the kingdom mid-term (leaveAlliance
      // in js/alliance.js no longer tries — and fails — to hand off the role
      // itself, since only this resolver is trusted to rewrite someone
      // else's role). Treat that as due immediately rather than leaving the
      // kingdom headless until the term naturally ends.
      const seatVacant = !!a.leaderId && leaderSnap && !leaderSnap.exists;
      const termDue = Date.now() >= termEndsAtMs;
      if(!termDue && !seatVacant) return; // term running, seat filled — nothing to do

      const membersSnap = seatVacant ? await tx.get(ref.collection('members')) : null;
      let candSnap = null, voteSnap = null;
      if(termDue){
        [candSnap, voteSnap] = await Promise.all([
          tx.get(ref.collection('electionCandidates').where('termNumber', '==', termNumber)),
          tx.get(ref.collection('electionVotes').where('termNumber', '==', termNumber)),
        ]);
      }

      // ── Writes ──────────────────────────────────────────────────────
      let leaderId = a.leaderId, leaderName = a.leaderName;

      if(seatVacant){
        // Hand the seat to the highest-ranked remaining member as a
        // caretaker until the next scheduled election instead of leaving
        // the kingdom leaderless in the meantime.
        const remaining = membersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
        remaining.sort((x, y) => (ALLIANCE_RANK[y.role] || 0) - (ALLIANCE_RANK[x.role] || 0) || (y.totalDonated || 0) - (x.totalDonated || 0));
        const successor = remaining[0] || null;
        leaderId = successor ? successor.uid : null;
        leaderName = successor ? (successor.username || 'Player') : null;
        if(successor){
          tx.update(ref.collection('members').doc(successor.uid), { role: 'leader' });
          tx.update(db.collection('players').doc(successor.uid), { allianceRole: 'leader' });
        }
      }

      if(termDue){
        const candidates = {};
        candSnap.docs.forEach(d => { candidates[d.id] = { name: d.data().name, votes: 0, registeredAt: d.data().registeredAt }; });
        voteSnap.docs.forEach(d => {
          const c = candidates[d.data().candidateUid];
          if(c) c.votes++;
        });
        // No candidates, or nobody voted → the incumbent (possibly the
        // caretaker just appointed above) quietly serves another term.
        const ranked = Object.entries(candidates).sort((x, y) =>
          y[1].votes - x[1].votes ||
          regAtMs(x[1].registeredAt) - regAtMs(y[1].registeredAt) // earlier registration breaks ties
        );
        if(ranked.length && ranked[0][1].votes > 0 && ranked[0][0] !== leaderId){
          if(leaderId){
            tx.update(ref.collection('members').doc(leaderId), { role: 'coleader' });
            tx.update(db.collection('players').doc(leaderId), { allianceRole: 'coleader' });
          }
          leaderId = ranked[0][0];
          leaderName = ranked[0][1].name;
          tx.update(ref.collection('members').doc(leaderId), { role: 'leader' });
          tx.update(db.collection('players').doc(leaderId), { allianceRole: 'leader' });
        }
        tx.set(ref, {
          leaderId, leaderName,
          presidentTermEndsAt: admin.firestore.Timestamp.fromMillis(Date.now() + ELECTION_TERM_MS),
          electionTermNumber: termNumber + 1,
          lastElectionWinner: leaderName,
          lastElectionVotes: ranked.length ? ranked[0][1].votes : 0,
        }, { merge: true });
      } else if(seatVacant){
        tx.set(ref, { leaderId, leaderName }, { merge: true });
      }
    });
  }catch(e){
    console.error(`[election-resolver] Failed resolving ${kingdomId}:`, e.message);
  }
}
function regAtMs(ts){ return ts && ts.toMillis ? ts.toMillis() : 0; }

exports.resolveDueElections = onSchedule('every 30 minutes', async () => {
  await Promise.all(KINGDOM_IDS.map(resolveOneElection));
});
