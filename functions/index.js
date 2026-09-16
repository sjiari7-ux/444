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
// Hard ceiling on a single hit's reported damage. This is a sanity clamp,
// NOT a real anti-cheat boundary: contributeToWar still trusts the dmg the
// client computed from the player's own stats, and those stats are still
// self-writable client-side (see the open item about players/{uid} in the
// chat). This only stops obviously-forged values (e.g. dmg: 999999999)
// from ever landing in Firestore. Raise it if legitimate endgame builds
// ever exceed it.
const MAX_SINGLE_HIT_DAMAGE = 10000;

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
