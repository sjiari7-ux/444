#!/usr/bin/env node
"use strict";
/* Tests the Shop screen (js/ui.js renderShop / shopCard / cosOf) and its wiring in main.js / config.js / theme.css,
   with the REAL code cut out of those files. Usage: node tools/test-shop-ui.js */
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error("anchor missing: " + a); return s.slice(i, j); };
let pass = 0, failn = 0;
const check = (n, c, x) => { c ? pass++ : failn++; console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  -> " + JSON.stringify(x))); };

const ui = R("js/ui.js"), cfg = R("js/config.js"), main = R("js/main.js"), css = R("theme.css");
const RARITY_SRC = cfg.slice(cfg.indexOf("const RARITY"));       // RARITY + CHECKOUT_ENABLED + GEM_PACKS (end of config.js)
const cat = [];
const slots = { avatar: ["emerald", "frost", "ember", "gold", "void"], cover: ["dunes", "deepsea", "crimson", "aurora", "royal", "jungle", "liberty", "galleon"], style: ["gold", "frost", "ember", "royal"] };
const price = { common: 60, rare: 120, epic: 250, legendary: 400 }, rar = ["common", "rare", "rare", "epic", "legendary"];
Object.keys(slots).forEach((s) => slots[s].forEach((n, i) => cat.push({ id: s + "_" + n, slot: s, name: n, rarity: rar[i % 5], price: price[rar[i % 5]], desc: "d" })));

const ctx = { srvNow: () => Date.now(), countdown: (t) => `<span data-countdown="${t}">00:00</span>`, askConfirm: async (o) => { ctx.asked = o; return ctx.answer; }, shopBuy: async (id) => { ctx.bought = id; }, shopBuyBundle: async (id) => { ctx.boughtB = id; }, render: () => { ctx.rendered = true; }, S: { char: { username: "Aziz", class: null }, cosCache: {} }, MY_ID: "me", queued: [], console,
  icon: (n) => `<i:${n}>`, esc: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), fmtNum: (n) => String(n), cav: () => "", iconUrl: (f) => "icons/ui/" + String(f).replace(/\.png$/, ".webp"),
  pageHero: (t) => `<hero>${t}</hero>`, queueCosLookup: (id) => ctx.queued.push(id) };
vm.createContext(ctx);
vm.runInContext(RARITY_SRC + "\n" + between(ui, "function dailyReady", "function dailyChip") + "\n" + between(ui, "function cosOf", "function renderStatusBar") + "\n" + between(ui, "/* ---------------- Shop:", "function renderMarket"), ctx);
const run = (e) => vm.runInContext(e, ctx);
const grid = (h) => h.slice(h.indexOf('class="shop-grid"'));   // the spotlight (changes daily) sits above the grid: order tests look at the grid only
const ready = (o) => Object.assign({ status: "ready", gems: 0, owned: [], equipped: { avatar: null, cover: null, style: null }, catalog: cat }, o);

console.log("states");
ctx.S.shop = undefined; check("no state yet -> loading", /Loading the shop/.test(run("renderShop()")));
ctx.S.shop = { status: "loading" }; check("loading", /Loading the shop/.test(run("renderShop()")));
ctx.S.shop = { status: "unavailable" }; check("unavailable (no cloud)", /needs the online game/.test(run("renderShop()")));
ctx.S.shop = { status: "error" }; check("error has a Retry button", /data-action="shop-reload"/.test(run("renderShop()")));

console.log("catalog tabs");
ctx.S.shop = ready({ gems: 100 }); ctx.S.shopTab = "avatar";
let h = run("renderShop()");
check("default tab = avatars: 5 cards, no cover/style items", (h.match(/class="shop-card/g) || []).length === 5 && !/cos-cover_/.test(grid(h)) && /cos-avatar_gold/.test(h), (h.match(/class="shop-card/g) || []).length);   // the grid only: the daily spotlight above it may feature any slot
check("gem balance shown", /<b>100<\/b> gems/.test(h));
ctx.S.shopTab = "cover"; h = run("renderShop()");
check("covers tab: 8 cards with banner previews", (h.match(/class="shop-card/g) || []).length === 8 && /rc-banner shop-pcover cos-cover_royal/.test(h));
ctx.S.shopTab = "style"; h = run("renderShop()");
check("styles tab: 4 cards, preview uses the player's name", (h.match(/class="shop-card/g) || []).length === 4 && /cos-name shop-pname cos-style_royal">Aziz</.test(h));
ctx.S.shopTab = "bogus"; check("unknown tab falls back to Home", /DAILY GIFT|shop-daily|Newest skins/.test(run("renderShop()")) || !/shop-grid/.test(run("renderShop()")));

console.log("buy / equip buttons");
ctx.S.shopTab = "avatar"; ctx.S.shop = ready({ gems: 100 }); h = run("renderShop()");
check("affordable item: enabled Buy", /data-action="shop-buy" data-item="avatar_emerald" >/.test(h));
check("too expensive item: the price button opens the Gems tab (no dead button)", !/data-action="shop-buy" data-item="avatar_void"/.test(h) && /shop-cta short" data-action="shop-tab" data-tab="gems"/.test(h) && /Need \d+ more gems/.test(h));
ctx.S.shop = ready({ gems: 100, owned: ["avatar_frost"] }); h = run("renderShop()");
check("owned item: Equip button (and no Buy for it)", /data-action="shop-equip" data-slot="avatar" data-item="avatar_frost"/.test(h) && !/data-action="shop-buy" data-item="avatar_frost"/.test(h));
ctx.S.shop = ready({ gems: 100, owned: ["avatar_frost"], equipped: { avatar: "avatar_frost", cover: null, style: null } }); h = run("renderShop()");
check("equipped item: 'Equipped' + Take off (empty item id)", /Equipped/.test(h) && /data-action="shop-equip" data-slot="avatar" data-item=""/.test(h));


console.log("profile-style cards + preview window");
ctx.S.shopTab = "cover"; ctx.S.shopPreview = null; ctx.S.shop = ready({ gems: 500 }); h = run("renderShop()");
check("every card has a 'Preview profile' button", (h.match(/data-action="shop-preview" data-item="/g) || []).length >= 5);
check("every card shows avatar + username on the cover", (h.match(/class="shop-who"/g) || []).length >= 5 && /shop-pname">Aziz</.test(h));
check("no preview window while nothing is selected", !/shop-pv-back/.test(h));
ctx.S.shopTab = "avatar"; ctx.S.shop = ready({ gems: 500, owned: ["cover_royal"], equipped: { avatar: null, cover: "cover_royal", style: null } }); h = run("renderShop()");
check("avatar cards are drawn on the cover the player wears", /shop-pcover cos-cover_royal/.test(h));
ctx.S.shopTab = "avatar"; ctx.S.shop = ready({ gems: 500 }); ctx.S.shopPreview = "avatar_void"; h = run("renderShop()");
check("preview window opens for the chosen item", /shop-pv-back/.test(h) && /shop-pv-info"><b>void</.test(h) && /rc-avatar cos-avatar_void/.test(h));
check("preview window can buy and close", /data-action="shop-buy" data-item="avatar_void"/.test(h) && /data-action="shop-pv-close"/.test(h) && /data-action="shop-pv-backdrop"/.test(h));
ctx.S.shopPreview = "nope"; check("unknown preview id -> no window", !/shop-pv-back/.test(run("renderShop()")));
ctx.S.shopPreview = null;
["shop-preview", "shop-pv-close", "shop-pv-backdrop"].forEach((a) => check("main.js handles " + a, new RegExp("action==='" + a + "'").test(main)));


console.log("gem image + banner");
check("balance, price button and packs use the gem image", (run("renderShop()").match(/class="gem-ic" src="icons\/ui\/gem\.webp"/g) || []).length >= 2);
check("shop banner css points to banner-shop.webp for every theme", (css.match(/\.rc-banner\.shop\{background-image:[^}]*banner-shop\.webp/g) || []).length === 5);
check("banner-shop.webp and gem.webp exist", fs.existsSync(path.join(__dirname, "..", "icons/banners/banner-shop.webp")) && fs.existsSync(path.join(__dirname, "..", "icons/ui/gem.webp")));
console.log("gem packs");
ctx.S.shopTab = "gems"; h = run("renderShop()");
check("4 packs, each with a Buy button", (h.match(/data-action="gems-buy"/g) || []).length === 4);
check("says gems never make you stronger", /never make you stronger/.test(h));
check("checkout is OFF until a payment provider is connected", run("CHECKOUT_ENABLED") === false);
check("pack ids are unique", new Set(run("GEM_PACKS.map(k=>k.id)")).size === 4);

console.log("what players wear");
ctx.S.cosCache = { other: { avatar: "avatar_gold", cover: null, style: "style_royal" } };
check("cosOf returns what is cached", run("cosOf('other')").avatar === "avatar_gold");
check("cosCls -> CSS class", run("cosCls(cosOf('other'),'avatar')") === " cos-avatar_gold" && run("cosCls(cosOf('other'),'cover')") === "");
ctx.queued.length = 0; run("cosOf('stranger')");
check("unknown player: asks for a lookup, returns {}", ctx.queued[0] === "stranger" && Object.keys(run("cosOf('x2')")).length === 0);

console.log("wiring");
check("Shop is in the nav and routed", /\{id:'shop', label:'Shop', icon:'gem'/.test(ui) && /S\.screen==='shop'\) body = renderShop\(\)/.test(ui));
check("status bar / own profile / other profiles use the cosmetics", /sb-avatar\$\{cosCls\(cosOf\(MY_ID\),'avatar'\)\}/.test(ui) && /rc-banner\$\{cosCls\(_cs,'cover'\)\}/.test(ui) && /cos-name\$\{cosCls\(_cs,'style'\)\}/.test(ui));
["shop-tab", "shop-reload", "shop-buy", "shop-equip", "gems-buy"].forEach((a) => check("main.js handles " + a, new RegExp("action==='" + a + "'").test(main)));
check("buy/equip are double-tap guarded", /GUARDED_ACTIONS = new Set\(\[[^\]]*'shop-buy','shop-equip'/.test(main));
check("opening the Shop screen loads it", /screen==='shop'\)\{ loadShop\(\); \}/.test(main));
const missingCss = cat.filter((i) => !new RegExp("\\.cos-" + i.id + "[\\s{,]").test(css)).map((i) => i.id);
check("every catalog item has its CSS in theme.css", missingCss.length === 0, missingCss);
const srv = [...R("functions/lib/shop.js").matchAll(/^\s*item\("(\w+)", "(\w+)"/gm)].map((m) => m[1] + "_" + m[2]).sort().join();
check("the test catalog = the real server catalog (ids)", srv === cat.map((i) => i.id).sort().join(), srv);

console.log("bundles, spotlight, filters, confirmation");
const bundles = [{ id: "bundle_a", name: "Set A", desc: "x", items: ["avatar_emerald", "cover_dunes", "style_gold"] }, { id: "bundle_b", name: "Set B", desc: "y", items: ["avatar_frost", "cover_deepsea", "style_frost"] }];
ctx.S.shopFilter = undefined; ctx.S.shopSort = undefined; ctx.S.shopPreview = null;
ctx.S.shopTab = "bundles"; ctx.S.shop = ready({ gems: 500, bundles, bundleDiscount: 0.25 }); h = run("renderShop()");
check("Sets tab: one card per set with -25% and 'save' text", (h.match(/class="shop-card/g) || []).length === 2 && /-25%/.test(h) && /3 items/.test(h) && /save 45 gems/.test(h), h.slice(0, 200));
check("set price = 135 (3 x 60 minus 25%) and buys through shop-buy-bundle", /data-action="shop-buy-bundle" data-item="bundle_a" >[^<]*<img[^>]*> 135/.test(h));
check("set card shows all 3 items on the mini profile", /cos-avatar_emerald/.test(h) && /cos-cover_dunes/.test(h) && /cos-style_gold/.test(h));
ctx.S.shop = ready({ gems: 500, bundles, bundleDiscount: 0.25, owned: ["avatar_emerald", "cover_dunes", "style_gold"] }); h = run("renderShop()");
check("owned set -> 'Equip set'", /data-action="shop-equip-set" data-item="bundle_a"/.test(h));
ctx.S.shop = ready({ gems: 500, bundles, bundleDiscount: 0.25, owned: ["avatar_emerald", "cover_dunes", "style_gold"], equipped: { avatar: "avatar_emerald", cover: "cover_dunes", style: "style_gold" } }); h = run("renderShop()");
check("set fully worn -> 'Equipped', no buy / equip action", /Equipped/.test(h) && !/data-action="shop-equip-set" data-item="bundle_a"/.test(h));
ctx.S.shopPreview = "bundle_b"; ctx.S.shop = ready({ gems: 500, bundles, bundleDiscount: 0.25 }); h = run("renderShop()");
check("set preview: all three items on the profile + 'Includes'", /shop-pv-back/.test(h) && /Includes: frost, deepsea, frost/.test(h) && /rc-banner cos-cover_deepsea/.test(h) && /cos-style_frost/.test(h));
ctx.S.shopPreview = null;

ctx.S.shopTab = "avatar"; ctx.S.shop = ready({ gems: 100, owned: ["avatar_frost"], equipped: { avatar: "avatar_frost", cover: null, style: null }, bundles });
h = run("renderShop()");
const gh = grid(h);
check("owned / worn items come first in the default order", gh.indexOf("avatar_frost") < gh.indexOf("avatar_emerald") && gh.indexOf("avatar_emerald") < gh.indexOf("avatar_gold"));
check("spotlight shows an unowned epic/legendary item", /class="shop-spot"/.test(h) && /Featured today/.test(h));
ctx.S.shop = ready({ gems: 500, owned: ["avatar_gold", "avatar_void", "cover_aurora", "cover_royal", "style_ember", "style_royal"], bundles: [] }); h = run("renderShop()");
check("no spotlight when every epic/legendary item is owned", !/class="shop-spot"/.test(h));
ctx.S.shop = ready({ gems: 100 }); ctx.S.shopSort = "high"; h = run("renderShop()");
h = grid(h); check("sort: price high -> low", h.indexOf("cos-avatar_void") < h.indexOf("cos-avatar_gold") && h.indexOf("cos-avatar_gold") < h.indexOf("cos-avatar_emerald"));
ctx.S.shopSort = "low"; h = grid(run("renderShop()")); check("sort: price low -> high", h.indexOf("cos-avatar_emerald") < h.indexOf("cos-avatar_void"));
ctx.S.shopSort = "rarity"; h = grid(run("renderShop()")); check("sort: rarity (legendary first)", h.indexOf("cos-avatar_void") < h.indexOf("cos-avatar_emerald"));
ctx.S.shopSort = undefined; ctx.S.shopFilter = "buy"; h = run("renderShop()");
check("filter 'Can buy': only what 100 gems can buy (emerald 60) and no spotlight", (h.match(/class="shop-card/g) || []).length === 1 && /avatar_emerald/.test(h) && !/class="shop-spot"/.test(h), (h.match(/class="shop-card/g) || []).length);
ctx.S.shopFilter = "owned"; h = run("renderShop()");
check("filter 'Owned' with nothing owned: friendly empty state with a reset button", /Nothing matches this filter/.test(h) && /data-action="shop-filter" data-v="all"/.test(h));
ctx.S.shopFilter = undefined;
check("filter + sort chips are wired in main.js", /action==='shop-filter'/.test(main) && /action==='shop-sort'/.test(main));

console.log("confirmation before buying");
ctx.S.shop = ready({ gems: 500, bundles, bundleDiscount: 0.25 }); ctx.answer = false; ctx.asked = null; ctx.bought = null; ctx.boughtB = null;
run("shopConfirmBuy('avatar_gold')").then ? 0 : 0;
(async () => {
  await run("shopConfirmBuy('avatar_gold')");
  check("asks first: price 250, balance 500, left 250", ctx.asked && JSON.stringify(ctx.asked.facts) === JSON.stringify([["Price", "250 gems"], ["Your gems", "500"], ["Left after buying", "250 gems"]]), ctx.asked && ctx.asked.facts);
  check("cancel -> nothing is bought", ctx.bought === null);
  ctx.answer = true; await run("shopConfirmBuy('avatar_gold')");
  check("confirm -> bought", ctx.bought === "avatar_gold");
  await run("shopConfirmBuy('bundle_a')");
  check("a set is confirmed then bought as a set", ctx.boughtB === "bundle_a" && /Includes: emerald/.test(ctx.asked.body));
  ctx.asked = null; ctx.bought = null; ctx.S.shop = ready({ gems: 10 }); ctx.rendered = false;
  await run("shopConfirmBuy('avatar_gold')");
  check("not enough gems: no dialog, goes to the Gems tab", ctx.asked === null && ctx.bought === null && ctx.S.shopTab === "gems");
  ctx.S.shop = ready({ gems: 500, owned: ["avatar_gold"] }); ctx.asked = null; await run("shopConfirmBuy('avatar_gold')");
  check("already owned: no dialog", ctx.asked === null);
  check("buy actions go through the confirmation", /shop-buy' \|\| action==='shop-buy-bundle'\)\{ await shopConfirmBuy/.test(main));
  check("sets: buy / equip actions are guarded and wired", /'shop-buy-bundle','shop-equip-set'(,'shop-claim-daily')?\]\)/.test(main) && /action==='shop-equip-set'/.test(main));
  check("packs: best value and popular badges", (() => { ctx.S.shopTab = "gems"; const g = run("renderShop()"); return /Best value/.test(g) && /Popular/.test(g) && /gems per \$1/.test(g) && /\+17%/.test(g); })());

  console.log("everybody sees what a player wears");
  const stor = R("js/storage.js");
  const ctx2 = { S: { cosCache: {}, cosAt: {} }, HAS_DB: true, renders: 0, render: () => { ctx2.renders++; }, withTimeout: (p) => p, Date, JSON, Object, clearTimeout, setTimeout: (f) => 0, MY_ID: "me" };
  const docs = { "rc_cosmetics/p1": { avatar: "avatar_gold", cover: "cover_royal", style: null } };
  ctx2.DB = { doc: (path) => ({ get: async () => ({ exists: path in docs, data: () => docs[path] }) }) };
  vm.createContext(ctx2);
  vm.runInContext(between(stor, "const COS_TTL", "/* Who holds every CONQUERED region"), ctx2);
  const r2 = (e) => vm.runInContext(e, ctx2);
  r2("queueCosLookup('p1')"); await r2("_cosFlush()");
  check("another player's skin is read from rc_cosmetics (public)", ctx2.S.cosCache.p1.avatar === "avatar_gold" && ctx2.S.cosCache.p1.cover === "cover_royal" && ctx2.renders === 1, ctx2.S.cosCache);
  r2("queueCosLookup('p1')"); check("fresh entry is not read again (no loop / no spam)", Object.keys(r2("_cosPending")).length === 0);
  ctx2.S.cosAt.p1 = Date.now() - 60000; docs["rc_cosmetics/p1"] = { avatar: "avatar_void", cover: null, style: null };
  r2("queueCosLookup('p1')"); await r2("_cosFlush()");
  check("after 45 s the entry is re-read: his NEW skin appears without reload", ctx2.S.cosCache.p1.avatar === "avatar_void" && ctx2.renders === 2, ctx2.S.cosCache.p1);
  ctx2.S.cosAt.p1 = 0; docs["rc_cosmetics/p1"] = { avatar: null, cover: null, style: null };
  r2("queueCosLookup('p1')"); await r2("_cosFlush()");
  check("taking everything off is seen too", ctx2.S.cosCache.p1 === null && ctx2.renders === 3);
  const n0 = ctx2.renders; ctx2.S.cosAt.p1 = 0; r2("queueCosLookup('p1')"); await r2("_cosFlush()");
  check("no change -> no re-render", ctx2.renders === n0);
  r2("queueCosLookup('system')"); r2("queueCosLookup('')"); check("system / empty ids are never looked up", Object.keys(r2("_cosPending")).length === 0);
  const placesUi = [["chat message", /class="av\$\{cosAv\(m\.senderId\)\}"/], ["rankings", /rc-gav\$\{cosAv\(p\.id\)\}/], ["citizens", /rc-gav \$\{on\?'on':''\}\$\{cosAv\(m\.id\)\}/], ["citizens list", /cit-av\$\{cosAv\(m\.id\)\}/], ["chat members", /rc-gav \$\{m\.online\?'on':''\}\$\{cosAv\(m\.id\)\}/], ["pvp opponents", /rc-gav\$\{o\.isBot\?'':cosAv\(o\.id\)\}/], ["my home card", /rc-avatar\$\{cosAv\(MY_ID\)\}/]];
  placesUi.forEach(([n, re]) => check("skin shown on: " + n, re.test(ui)));
  check("name style shown in chat / rankings / lists", /cos-name\$\{cosNm\(m\.senderId\)\}/.test(ui) && /cos-name\$\{cosNm\(p\.id\)\}/.test(ui));
  check("opening a profile forces a fresh read", /\(S\.cosAt = S\.cosAt \|\| \{\}\)\[id\] = 0/.test(main));
  check("avatar colours beat the per-theme frames (CSS)", (css.match(/html \.cos-avatar_\w+\[class\]\{border-color/g) || []).length === 5);
  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})();
