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
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Keep these in sync with the values in territory.js
const WAR_ROUND_HOURS = 6;
const WAR_ROUNDS_TO_WIN = 2;
const WAR_COOLDOWN_HOURS = 12;
const TERRITORY_CAPTURE_DEFENSE = 90;

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
        return { tid, finished: true, winner: 'attacker' };
      }
      if(defenderWins >= WAR_ROUNDS_TO_WIN){
        tx.update(ref, {
          war: admin.firestore.FieldValue.delete(),
          warCooldownUntil: admin.firestore.Timestamp.fromMillis(Date.now() + WAR_COOLDOWN_HOURS * 3600000),
        });
        return { tid, finished: true, winner: 'defender' };
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
    if(outcome) console.log('[war-resolver]', JSON.stringify(outcome));
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
