#!/usr/bin/env node
"use strict";
/* Tests the gear skins of the Shop (functions/lib/shop.js + js/config.js + js/ui.js + theme.css + icons/skins/).
   A skin = a set of 6 pictures that repaints the gear you wear. Looks only. Usage: node tools/test-shop-skins.js */
const Module = require("module"), fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const R = (f) => fs.readFileSync(path.join(root, f), "utf8");
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error("anchor missing: " + a); return s.slice(i, j); };
let pass = 0, failn = 0;
const check = (n, c, x) => { c ? pass++ : failn++; console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  -> " + JSON.stringify(x))); };

/* ---- server side, against a tiny in-memory Firestore (same one as tools/test-shop.js) ---- */
const store = {}, clone = (o) => JSON.parse(JSON.stringify(o));
const ref = (p) => ({ path: p, get: async () => ({ exists: p in store, data: () => clone(store[p]) }) });
const fake = { doc: ref, runTransaction: async (fn) => { const w = []; const tx = { get: async (r) => r.get(), set: (r, d) => w.push([r.path, clone(d)]) }; const out = await fn(tx); w.forEach(([p, d]) => { store[p] = d; }); return out; } };
const origLoad = Module._load;
Module._load = function (req, parent, ...rest) { if (req === "firebase-admin") return { firestore: () => fake }; return origLoad.call(this, req, parent, ...rest); };
const Shop = require(path.join(root, "functions/lib/shop.js"));
Shop._setClock(() => 1700000000000);
const give = (uid, gems) => { store["rc_wallets/" + uid] = Object.assign({ gems: 0, owned: [], equipped: {} }, store["rc_wallets/" + uid], { gems }); };
const failsWith = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };

const cfg = R("js/config.js"), ui = R("js/ui.js"), css = R("theme.css");
const ctxC = {}; vm.createContext(ctxC);
vm.runInContext(cfg.slice(cfg.indexOf("const RARITY")), ctxC);           // RARITY, SKIN_SETS, SKIN_SLOTS, skinUrl (end of config.js)
const SKIN_SETS = vm.runInContext("SKIN_SETS", ctxC), SKIN_SLOTS = vm.runInContext("SKIN_SLOTS", ctxC);
const skins = Shop.CATALOG.filter((i) => i.slot === "skin");

(async () => {
  console.log("catalog");
  check("10 gear skins, ids skin_<set>", skins.length === 10 && skins.every((s) => s.id === "skin_" + s.set));
  check("every skin has a name, a description and a known rarity", skins.every((s) => s.name && s.desc && Shop.PRICE[s.rarity] > 0));
  check("price = rarity price x " + Shop.SKIN_MULT + " (one place to rebalance)", skins.every((s) => s.price === Shop.PRICE[s.rarity] * Shop.SKIN_MULT), skins.map((s) => [s.id, s.price]));
  check("dearer rarity = dearer skin", ["common", "uncommon", "rare", "epic", "legendary"].map((r) => (skins.find((s) => s.rarity === r) || {}).price).every((p, i, a) => p > 0 && (!i || p > a[i - 1])));
  check("2 sets per rarity", ["common", "uncommon", "rare", "epic", "legendary"].every((r) => skins.filter((s) => s.rarity === r).length === 2));
  check("the skin slot exists on the server", Shop.SLOTS.includes("skin"));
  check("client SKIN_SETS = server sets and rarities", JSON.stringify(Object.keys(SKIN_SETS).sort()) === JSON.stringify(skins.map((s) => s.set).sort()) && skins.every((s) => SKIN_SETS[s.set] === s.rarity), SKIN_SETS);
  check("the shop rarity list knows every rarity a skin uses", skins.every((s) => vm.runInContext("RARITY", ctxC)[s.rarity]));

  console.log("pictures + css");
  const missingFiles = [];
  skins.forEach((s) => SKIN_SLOTS.forEach((sl) => { const f = `icons/skins/${s.set}_${sl}_${s.rarity}.webp`; if (!fs.existsSync(path.join(root, f))) missingFiles.push(f); }));
  check("6 pictures per skin exist in icons/skins/", missingFiles.length === 0, missingFiles);
  const have = fs.existsSync(path.join(root, "icons/skins")) ? fs.readdirSync(path.join(root, "icons/skins")) : [];
  check("no stray file in icons/skins/", have.length === skins.length * 6, have.length);
  check("skinUrl builds icons/skins/<set>_<slot>_<rarity>.webp", vm.runInContext("skinUrl('skin_vampire','helmet')", ctxC) === "icons/skins/vampire_helmet_legendary.webp" && vm.runInContext("skinUrl('skin_nope','helmet')", ctxC) === null && vm.runInContext("skinUrl('skin_vampire','cape')", ctxC) === null);
  check("the 6 slots are the game's gear slots", JSON.stringify(SKIN_SLOTS.slice().sort()) === JSON.stringify(["accessory", "armor", "boots", "gloves", "helmet", "weapon"]));
  const noCss = skins.filter((s) => !new RegExp("\\.cos-" + s.id + "[\\s{,]").test(css)).map((s) => s.id);
  check("every skin has its colours in theme.css", noCss.length === 0, noCss);

  console.log("buy / equip on the server");
  give("u1", 100);
  const vamp = Shop.BY_ID.skin_vampire;
  let e = await failsWith(() => Shop.buyCosmetic("u1", { itemId: vamp.id }));
  check("not enough gems for a legendary skin (" + vamp.price + ")", e === "NOT_ENOUGH_GEMS" && !(store["rc_wallets/u1"].owned || []).length, e);
  give("u1", 2000);
  let r = await Shop.buyCosmetic("u1", { itemId: vamp.id });
  check("buy: gems go down by the price, skin owned and worn at once", r.gems === 2000 - vamp.price && r.owned.includes("skin_vampire") && r.equipped.skin === "skin_vampire", r);
  check("what others see (rc_cosmetics) holds the skin", store["rc_cosmetics/u1"].skin === "skin_vampire" && "avatar" in store["rc_cosmetics/u1"]);
  e = await failsWith(() => Shop.buyCosmetic("u1", { itemId: vamp.id }));
  check("buying it twice is refused", e === "ALREADY_OWNED", e);
  await Shop.buyCosmetic("u1", { itemId: "skin_school" });
  check("a second skin does not replace the one you wear", store["rc_wallets/u1"].equipped.skin === "skin_vampire");
  r = await Shop.equipCosmetic("u1", { slot: "skin", itemId: "skin_school" });
  check("equip another owned skin", r.equipped.skin === "skin_school" && store["rc_cosmetics/u1"].skin === "skin_school");
  r = await Shop.equipCosmetic("u1", { slot: "skin", itemId: null });
  check("take the skin off", r.equipped.skin === null && store["rc_cosmetics/u1"].skin === null);
  e = await failsWith(() => Shop.equipCosmetic("u1", { slot: "skin", itemId: "skin_idol" }));
  check("a skin you do not own cannot be worn", e === "NOT_OWNED", e);
  e = await failsWith(() => Shop.equipCosmetic("u1", { slot: "avatar", itemId: "skin_vampire" }));
  check("a skin cannot go in the avatar slot", e === "INVALID_ITEM", e);
  r = await Shop.equipCosmetic("u1", { slot: "avatar", itemId: null });
  check("existing slots still work next to skins", r.equipped.skin === null && r.owned.length === 2);
  const s2 = await Shop.getShop("u1");
  check("getShop sends the skins and the 'Gear skin' slot label", s2.catalog.filter((i) => i.slot === "skin").length === 10 && s2.slots.some((x) => x.id === "skin" && x.label === "Gear skin"));
  check("skins are looks only: a skin has no stats / power field", skins.every((s) => !("stats" in s) && !("atk" in s) && !("power" in s)));

  console.log("client: gear pictures");
  const art = { iconUrl: (f) => "icons/gear/" + String(f).replace(/\.(png|jpe?g)$/i, ".webp"), skinUrl: (id, sl) => vm.runInContext("skinUrl", ctxC)(id, sl), artFallback: () => {}, document: {} };
  vm.createContext(art);
  vm.runInContext(between(cfg, "function artImg(base, skinId)", "/* ====") , art);
  let h = vm.runInContext("artImg('armor_rare')", art);
  check("no skin: the normal gear picture", /src="icons\/gear\/armor_rare\.webp"/.test(h) && /onerror="artFallback\(this\)"/.test(h));
  h = vm.runInContext("artImg('armor_rare','skin_vampire')", art);
  check("skin worn: the skin picture, with the normal picture as fallback", /src="icons\/skins\/vampire_armor_legendary\.webp"/.test(h) && /data-def="icons\/gear\/armor_rare\.webp"/.test(h) && /onerror="skinFallback\(this\)"/.test(h), h);
  h = vm.runInContext("artImg('weapon_iron_sword','skin_pirate')", art);
  check("class starter weapons are repainted too", /icons\/skins\/pirate_weapon_common\.webp/.test(h));
  h = vm.runInContext("artImg('class_knight','skin_pirate')", art);
  check("non-gear pictures (classes...) are never repainted", /src="icons\/gear\/class_knight\.webp"/.test(h) && !/skins/.test(h));
  h = vm.runInContext("artImg('helmet_epic','skin_unknown')", art);
  check("unknown skin id: normal picture", /icons\/gear\/helmet_epic\.webp/.test(h) && !/skins/.test(h));
  const img = { onerror: "first", src: "icons/skins/x.webp", getAttribute: (k) => (k === "data-def" ? "icons/gear/armor_rare.webp" : null) };
  vm.runInContext("function artFallback(i){ i.hidden = true; }", art); vm.runInContext(between(cfg, "function skinFallback", "\n"), art);
  art.img = img; vm.runInContext("skinFallback(img)", art);
  check("missing skin file: swaps to the normal picture once", img.src === "icons/gear/armor_rare.webp" && typeof img.onerror === "function");
  img.onerror.call(img); check("...and if that is missing too, the drawn icon fallback runs", img.hidden === true);
  [["bag / equipped tiles", /artImg\(art,cosSkin\(MY_ID\)\)\+`<span class="fb" style="display:none">\$\{icon\(ico\)\}<\/span>`:icon\(ico\)\}\$\{it\.qty>1/], ["paper doll", /artImg\(art,cosSkin\(MY_ID\)\)\+`<span class="fb" style="display:none">\$\{icon\(ico\)\}<\/span>`:icon\(ico\)\}\$\{it\.level\?`<i class="lv">\$\{it\.level\}<\/i>`:''\}<\/div>\n        <div class="tx">/], ["equipment row", /rc-eq-art">\$\{artImg\(art,skin\)\}/], ["my profile row", /equipRowHtml\(c\.equipment, true, MY_ID\)/], ["other player's profile row", /equipRowHtml\(p\.equipment,false,id\)/]]
    .forEach(([n, re]) => check("skin shown on: " + n, re.test(ui)));
  check("forge and market keep the normal pictures (no skin there)", /\$\{art\?artImg\(art\)\+`<span class="fb" style="display:none">\$\{icon\(SLOT_ICO\[slot\]\|\|'shield'\)\}/.test(ui) && /\$\{art\?artImg\(art\)\+`<span class="fb" style="display:none">\$\{ico\}/.test(cfg));

  console.log("client: Skins tab");
  const cat = Shop.CATALOG;
  const ctx = { srvNow: () => Date.now(), askConfirm: async (o) => { ctx.asked = o; return true; }, shopBuy: async (id) => { ctx.bought = id; }, shopBuyBundle: async () => {}, render: () => {}, S: { char: { username: "Aziz", class: null }, cosCache: {} }, MY_ID: "me", queued: [], console,
    icon: (n) => `<i:${n}>`, esc: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), fmtNum: (n) => String(n), cav: () => "", iconUrl: (f) => "icons/ui/" + String(f).replace(/\.png$/, ".webp"),
    pageHero: (t, sub) => `<hero>${t}|${sub}</hero>`, queueCosLookup: (id) => ctx.queued.push(id) };
  vm.createContext(ctx);
  vm.runInContext(cfg.slice(cfg.indexOf("const RARITY")) + "\n" + between(ui, "function dailyReady", "function dailyChip") + "\n" + between(ui, "function cosOf", "function renderStatusBar") + "\n" + between(ui, "/* ---------------- Shop:", "function renderMarket"), ctx);
  const run = (x) => vm.runInContext(x, ctx);
  const ready = (o) => Object.assign({ status: "ready", gems: 0, owned: [], equipped: { avatar: null, cover: null, style: null, skin: null }, catalog: cat, bundles: [] }, o);
  ctx.S.shopTab = "skin"; ctx.S.shop = ready({ gems: 300 });
  h = run("renderShop()");
  const gh = h.slice(h.indexOf('class="shop-grid"'));
  check("Skins tab: 10 cards", (gh.match(/class="shop-card/g) || []).length === 10, (gh.match(/class="shop-card/g) || []).length);
  check("every card shows the 6 pictures of its set", (gh.match(/<img src="icons\/skins\//g) || []).length === 60 && /icons\/skins\/vampire_helmet_legendary\.webp/.test(gh) && /icons\/skins\/gnawa_boots_epic\.webp/.test(gh));
  check("cards are tinted with the set's css class and say the rarity", /shop-skin-cover cos-skin_vampire/.test(gh) && />Legendary</.test(gh) && />Uncommon</.test(gh));
  check("button says Preview skin (not 'profile')", /Preview skin/.test(gh) && !/Preview profile/.test(gh));
  check("Skins tab is in the tab row, the hero mentions gear skins", /data-tab="skin"><i:sword><span>Skins</.test(h) && /gear skins/.test(h));
  check("300 gems: affordable skins have Buy, dear ones open the Gems tab", /data-action="shop-buy" data-item="skin_school"/.test(gh) && !/data-action="shop-buy" data-item="skin_vampire"/.test(gh) && /Need 500 more gems/.test(gh));
  check("uncommon is ranked between common and rare", run("SHOP_RANK.common<SHOP_RANK.uncommon && SHOP_RANK.uncommon<SHOP_RANK.rare && SHOP_RANK.rare<SHOP_RANK.epic"));
  ctx.S.shopSort = "rarity"; h = run("renderShop()"); const g2 = h.slice(h.indexOf('class="shop-grid"'));
  check("sort by rarity: legendary skins first, commons last", g2.indexOf("skin_idol") < g2.indexOf("skin_shrine") && g2.indexOf("skin_shrine") < g2.indexOf("skin_sakura") && g2.indexOf("skin_sakura") < g2.indexOf("skin_aviation") && g2.indexOf("skin_aviation") < g2.indexOf("skin_school"));
  ctx.S.shopSort = undefined;
  ctx.S.shop = ready({ gems: 300, owned: ["skin_school"], equipped: { avatar: null, cover: null, style: null, skin: "skin_school" } }); h = run("renderShop()");
  check("worn skin: Equipped + Take off for the skin slot", /Equipped/.test(h) && /data-action="shop-equip" data-slot="skin" data-item=""/.test(h));
  ctx.S.shop = ready({ gems: 300, owned: ["skin_school"] }); h = run("renderShop()");
  check("owned skin: Equip for the skin slot", /data-action="shop-equip" data-slot="skin" data-item="skin_school"/.test(h));
  ctx.S.shopPreview = "skin_gnawa"; ctx.S.shop = ready({ gems: 900 }); h = run("renderShop()");
  check("preview window: big grid, name, rarity, what it does, buy + close", /shop-pv-skin cos-skin_gnawa/.test(h) && /shop-skin-grid big/.test(h) && /Gnawa Spirit/.test(h) && /Repaints the pictures of the 6 gear slots/.test(h) && /data-action="shop-buy" data-item="skin_gnawa"/.test(h) && /data-action="shop-pv-close"/.test(h) && !/rc-chero/.test(h), h.slice(0, 300));
  ctx.S.shopPreview = null; ctx.S.shopTab = "avatar"; ctx.S.shop = ready({ gems: 5000 }); h = run("renderShop()");
  check("avatar tab is unchanged (5 cards, no skin card)", (h.slice(h.indexOf('class="shop-grid"')).match(/class="shop-card/g) || []).length === 5 && !/shop-skin-cover cos-skin_[a-z]+"><div class="shop-skin-grid"><img[\s\S]{0,40}[\s\S]*class="shop-grid"/.test(h.slice(h.indexOf('class="shop-grid"'))));
  ctx.S.shopTab = "skin"; ctx.asked = null; ctx.S.shop = ready({ gems: 900 }); await run("shopConfirmBuy('skin_idol')");
  check("asks first: legendary skin 800 gems, 'looks only' text", ctx.asked && ctx.asked.facts[0][1] === "800 gems" && /never its stats/.test(ctx.asked.body), ctx.asked);
  ctx.S.cosCache = { other: { avatar: null, cover: null, style: null, skin: "skin_sakura" } };
  check("cosSkin: what another player wears / nothing", run("cosSkin('other')") === "skin_sakura" && run("cosSkin('nobody')") === null && run("cosSkin('')") === null);
  ctx.S.shopTab = "avatar"; ctx.S.shop = ready({ gems: 0, owned: ["avatar_gold", "avatar_void", "cover_aurora", "cover_royal", "style_ember", "style_royal", "skin_idol", "skin_vampire", "skin_shrine", "skin_gnawa"] });
  check("spotlight still only features epic / legendary things (skins included)", (() => { const t = run("renderShop()"); return !/class="shop-spot"/.test(t) || /Featured today/.test(t); })());

  console.log("other players see it");
  const stor = R("js/storage.js");
  const ctx2 = { S: { cosCache: {}, cosAt: {} }, HAS_DB: true, renders: 0, render: () => { ctx2.renders++; }, withTimeout: (p) => p, Date, JSON, Object, clearTimeout, setTimeout: () => 0, MY_ID: "me" };
  const docs = { "rc_cosmetics/p1": { avatar: null, cover: null, style: null, skin: "skin_vampire" } };
  ctx2.DB = { doc: (p) => ({ get: async () => ({ exists: p in docs, data: () => docs[p] }) }) };
  vm.createContext(ctx2);
  vm.runInContext(between(stor, "const COS_TTL", "/* Who holds every CONQUERED region"), ctx2);
  vm.runInContext("queueCosLookup('p1')", ctx2); await vm.runInContext("_cosFlush()", ctx2);
  check("a player wearing ONLY a skin is not read as 'nothing worn'", ctx2.S.cosCache.p1 && ctx2.S.cosCache.p1.skin === "skin_vampire" && ctx2.renders === 1, ctx2.S.cosCache);

  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})();
