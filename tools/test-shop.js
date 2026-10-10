#!/usr/bin/env node
"use strict";
/* Tests functions/lib/shop.js (gems wallet, buy, equip) against a tiny in-memory Firestore. Usage: node tools/test-shop.js */
const Module = require("module"), path = require("path");
const store = {}, clone = (o) => JSON.parse(JSON.stringify(o));
const ref = (p) => ({ path: p, get: async () => ({ exists: p in store, data: () => clone(store[p]) }) });
const fake = {
  doc: ref,
  runTransaction: async (fn) => {
    const writes = [];
    const tx = { get: async (r) => r.get(), set: (r, d) => writes.push([r.path, clone(d)]) };
    const out = await fn(tx);                       // nothing is written when fn throws (same as Firestore)
    writes.forEach(([p, d]) => { store[p] = d; });
    return out;
  },
};
const origLoad = Module._load;
Module._load = function (req, parent, ...rest) { if (req === "firebase-admin") return { firestore: () => fake }; return origLoad.call(this, req, parent, ...rest); };
const Shop = require(path.join(__dirname, "../functions/lib/shop.js"));
Shop._setClock(() => 1700000000000);

let pass = 0, fails = 0;
const check = (n, c, x) => { c ? pass++ : fails++; console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  -> " + JSON.stringify(x))); };
const fails_ = async (fn, msg) => { try { await fn(); return null; } catch (e) { return e; } };
const give = (uid, gems) => { store["rc_wallets/" + uid] = Object.assign({ gems: 0, owned: [], equipped: {} }, store["rc_wallets/" + uid], { gems }); };

(async () => {
  console.log("catalog");
  const ids = Shop.CATALOG.map((i) => i.id);
  check("ids are unique", new Set(ids).size === ids.length);
  check("every item has a slot, a price and a name", Shop.CATALOG.every((i) => Shop.SLOTS.includes(i.slot) && i.price > 0 && i.name && i.id.startsWith(i.slot + "_")));
  check("3 slots with items", Shop.SLOTS.every((s) => Shop.CATALOG.some((i) => i.slot === s)));

  console.log("getShop");
  let s = await Shop.getShop("u1");
  check("new player: 0 gems, nothing owned", s.gems === 0 && s.owned.length === 0 && !s.equipped.avatar);

  console.log("buy");
  give("u1", 100);
  let e = await fails_(() => Shop.buyCosmetic("u1", { itemId: "avatar_void" }));
  check("too poor -> NOT_ENOUGH_GEMS with numbers", e && e.message === "NOT_ENOUGH_GEMS" && e.details.required === 400 && e.details.available === 100, e && e.details);
  check("failed purchase changes nothing", store["rc_wallets/u1"].gems === 100 && !(store["rc_wallets/u1"].owned || []).length);
  e = await fails_(() => Shop.buyCosmetic("u1", { itemId: "nope" }));
  check("unknown item -> INVALID_ITEM", e && e.message === "INVALID_ITEM");
  e = await fails_(() => Shop.buyCosmetic("u1", {}));
  check("no item -> INVALID_ITEM", e && e.message === "INVALID_ITEM");
  let r = await Shop.buyCosmetic("u1", { itemId: "avatar_emerald" });
  check("buy a 60-gem item: gems 100 -> 40", r.gems === 40 && r.owned.includes("avatar_emerald"), r);
  check("first item of a slot is worn at once", r.equipped.avatar === "avatar_emerald");
  check("public mirror rc_cosmetics written", store["rc_cosmetics/u1"] && store["rc_cosmetics/u1"].avatar === "avatar_emerald");
  e = await fails_(() => Shop.buyCosmetic("u1", { itemId: "avatar_emerald" }));
  check("same item twice -> ALREADY_OWNED, no charge", e && e.message === "ALREADY_OWNED" && store["rc_wallets/u1"].gems === 40);

  console.log("equip");
  give("u1", 500);
  await Shop.buyCosmetic("u1", { itemId: "avatar_frost" });
  r = await Shop.equipCosmetic("u1", { slot: "avatar", itemId: "avatar_frost" });
  check("equip another owned item", r.equipped.avatar === "avatar_frost" && store["rc_cosmetics/u1"].avatar === "avatar_frost");
  e = await fails_(() => Shop.equipCosmetic("u1", { slot: "cover", itemId: "cover_royal" }));
  check("cannot wear what you do not own -> NOT_OWNED", e && e.message === "NOT_OWNED");
  e = await fails_(() => Shop.equipCosmetic("u1", { slot: "cover", itemId: "avatar_frost" }));
  check("item in the wrong slot -> INVALID_ITEM", e && e.message === "INVALID_ITEM");
  e = await fails_(() => Shop.equipCosmetic("u1", { slot: "hat", itemId: null }));
  check("unknown slot -> INVALID_SLOT", e && e.message === "INVALID_SLOT");
  r = await Shop.equipCosmetic("u1", { slot: "avatar", itemId: null });
  check("take it off (null)", r.equipped.avatar === null && store["rc_cosmetics/u1"].avatar === null);
  check("taking off keeps the item owned", r.owned.includes("avatar_frost"));

  console.log("wallets are separate");
  s = await Shop.getShop("u2");
  check("another player is not affected", s.gems === 0 && s.owned.length === 0);

  console.log("normalizeWallet (bad / tampered data)");
  const n = Shop.normalizeWallet({ gems: -5, owned: ["avatar_gold", "avatar_gold", "ghost"], equipped: { avatar: "avatar_frost", cover: "avatar_gold" } });
  check("negative gems -> 0, duplicates and unknown ids dropped", n.gems === 0 && n.owned.length === 1 && n.owned[0] === "avatar_gold", n);
  check("equipped must be owned and in the right slot", n.equipped.avatar === null && n.equipped.cover === null, n.equipped);

  console.log("creditGems (payment webhook only)");
  e = await fails_(() => Shop.creditGems("u3", 0, "p1"));
  check("0 gems refused", e && e.message === "INVALID_CREDIT");
  e = await fails_(() => Shop.creditGems("u3", 100, ""));
  check("no payment id refused", e && e.message === "INVALID_CREDIT");
  r = await Shop.creditGems("u3", 550, "pay_1");
  check("credits the wallet", r.gems === 550 && store["rc_wallets/u3"].gems === 550);
  r = await Shop.creditGems("u3", 550, "pay_1");
  check("the same payment never credits twice", r.duplicate === true && store["rc_wallets/u3"].gems === 550);
  check("shop is not exposing creditGems as a callable", !/exports\.creditGems/.test(require("fs").readFileSync(path.join(__dirname, "../functions/index.js"), "utf8")));

  console.log(`\n${pass} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
