"use strict";

/* ============================================================
   SHOP — cosmetics only (free-to-play: nothing here changes how strong a player is).
   - Gems are the shop currency. They are kept in rc_wallets/{uid}  { gems, owned[], equipped{avatar,cover,style} }.
   - What a player wears is mirrored in rc_cosmetics/{uid} { avatar, cover, style } so other players can see it (public read).
   - getShop          catalog + the player's gems / owned / equipped
   - buyCosmetic      spend gems on ONE item (inside a transaction: no double spend)
   - equipCosmetic    wear / take off an owned item
   GEMS ARE NEVER CREATED HERE. Real-money gem packs must be credited by the payment webhook (Cloud Function, Admin SDK) after
   the payment provider confirms the payment: see creditGems() below, it is the only place that adds gems.
   ============================================================ */
const admin = require("firebase-admin");
const { fail } = require("./errors");

let now = () => Date.now();
function _setClock(fn) { now = fn || (() => Date.now()); }
function db() { return admin.firestore(); }
const walletRef = (uid) => db().doc("rc_wallets/" + uid);
const cosRef = (uid) => db().doc("rc_cosmetics/" + uid);

const SLOTS = ["avatar", "cover", "style"];
const SLOT_LABEL = { avatar: "Avatar frame", cover: "Profile cover", style: "Name style" };
const PRICE = { common: 60, rare: 120, epic: 250, legendary: 400 };      // gems, by rarity (one place to rebalance)
const item = (slot, id, name, rarity, desc) => ({ id: slot + "_" + id, slot, name, rarity, price: PRICE[rarity], desc });

/* The look of each item lives in theme.css as  .cos-<id>  (the id below, e.g. .cos-avatar_gold). Add an item here AND there. */
const CATALOG = [
  item("avatar", "emerald", "Emerald Ring", "common", "A calm green ring around your portrait."),
  item("avatar", "frost", "Frost Ring", "rare", "Icy blue ring with a cold glow."),
  item("avatar", "ember", "Ember Ring", "rare", "A ring of slow, burning embers."),
  item("avatar", "gold", "Royal Gold", "epic", "A polished gold ring fit for a throne room."),
  item("avatar", "void", "Void Halo", "legendary", "A violet halo that pulses in the dark."),

  item("cover", "dunes", "Desert Dunes", "common", "Warm sand colours for your profile banner."),
  item("cover", "deepsea", "Deep Sea", "rare", "Dark teal waters with a faint shimmer."),
  item("cover", "crimson", "Crimson Siege", "rare", "The red sky of a long siege."),
  item("cover", "aurora", "Northern Aurora", "epic", "Green and violet lights over the ice."),
  item("cover", "royal", "Royal Banner", "legendary", "Deep purple and gold, with a slow shine."),

  item("style", "gold", "Golden Name", "common", "Your name in warm gold."),
  item("style", "frost", "Frost Name", "rare", "A cold blue gradient name."),
  item("style", "ember", "Ember Name", "epic", "A name that glows like a forge."),
  item("style", "royal", "Royal Name", "legendary", "Animated violet and gold name."),
];
const BY_ID = {};
CATALOG.forEach((i) => { BY_ID[i.id] = i; });

function normalizeWallet(w) {
  w = w || {};
  const gems = Number.isFinite(w.gems) && w.gems > 0 ? Math.floor(w.gems) : 0;
  const owned = [...new Set(Array.isArray(w.owned) ? w.owned : [])].filter((id) => BY_ID[id]);
  const eq = w.equipped || {}, equipped = {};
  SLOTS.forEach((s) => { const id = eq[s]; equipped[s] = id && BY_ID[id] && BY_ID[id].slot === s && owned.includes(id) ? id : null; });
  return { gems, owned, equipped };
}
const cosDoc = (equipped) => ({ avatar: equipped.avatar || null, cover: equipped.cover || null, style: equipped.style || null, updatedAt: now() });

async function getShop(uid) {
  const snap = await walletRef(uid).get();
  const w = normalizeWallet(snap.exists ? snap.data() : null);
  return { catalog: CATALOG, slots: SLOTS.map((s) => ({ id: s, label: SLOT_LABEL[s] })), gems: w.gems, owned: w.owned, equipped: w.equipped };
}

async function buyCosmetic(uid, data) {
  const id = data && typeof data.itemId === "string" ? data.itemId : "";
  const it = BY_ID[id];
  if (!it) fail("invalid-argument", "INVALID_ITEM");
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(walletRef(uid));
    const w = normalizeWallet(snap.exists ? snap.data() : null);
    if (w.owned.includes(id)) fail("already-exists", "ALREADY_OWNED");
    if (w.gems < it.price) fail("failed-precondition", "NOT_ENOUGH_GEMS", { required: it.price, available: w.gems });
    w.gems -= it.price;
    w.owned.push(id);
    if (!w.equipped[it.slot]) w.equipped[it.slot] = id;          // first item of a slot is worn straight away
    tx.set(walletRef(uid), w);
    tx.set(cosRef(uid), cosDoc(w.equipped));
    return { gems: w.gems, owned: w.owned, equipped: w.equipped, bought: id };
  });
}

async function equipCosmetic(uid, data) {
  const slot = data && data.slot, id = data && data.itemId ? data.itemId : null;
  if (!SLOTS.includes(slot)) fail("invalid-argument", "INVALID_SLOT");
  if (id && (!BY_ID[id] || BY_ID[id].slot !== slot)) fail("invalid-argument", "INVALID_ITEM");
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(walletRef(uid));
    const w = normalizeWallet(snap.exists ? snap.data() : null);
    if (id && !w.owned.includes(id)) fail("failed-precondition", "NOT_OWNED");
    w.equipped[slot] = id;                                         // null = take it off
    tx.set(walletRef(uid), w);
    tx.set(cosRef(uid), cosDoc(w.equipped));
    return { gems: w.gems, owned: w.owned, equipped: w.equipped };
  });
}

/* ONLY for the payment webhook (server side, after the provider confirmed the payment). Not exposed as a callable.
   `paymentId` makes it idempotent: the same payment can never credit twice. */
async function creditGems(uid, gems, paymentId) {
  if (!Number.isInteger(gems) || gems <= 0 || !paymentId) fail("invalid-argument", "INVALID_CREDIT");
  const payRef = db().doc("rc_payments/" + paymentId);
  return db().runTransaction(async (tx) => {
    const paid = await tx.get(payRef);
    if (paid.exists) return { duplicate: true };
    const snap = await tx.get(walletRef(uid));
    const w = normalizeWallet(snap.exists ? snap.data() : null);
    w.gems += gems;
    tx.set(walletRef(uid), w);
    tx.set(payRef, { uid, gems, at: now() });
    return { gems: w.gems };
  });
}

module.exports = { CATALOG, BY_ID, SLOTS, PRICE, getShop, buyCosmetic, equipCosmetic, creditGems, normalizeWallet, _setClock };
