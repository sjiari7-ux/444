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
