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
const slots = { avatar: ["emerald", "frost", "ember", "gold", "void"], cover: ["dunes", "deepsea", "crimson", "aurora", "royal"], style: ["gold", "frost", "ember", "royal"] };
const price = { common: 60, rare: 120, epic: 250, legendary: 400 }, rar = ["common", "rare", "rare", "epic", "legendary"];
Object.keys(slots).forEach((s) => slots[s].forEach((n, i) => cat.push({ id: s + "_" + n, slot: s, name: n, rarity: rar[i % 5], price: price[rar[i % 5]], desc: "d" })));

const ctx = { S: { char: { username: "Aziz", class: null }, cosCache: {} }, MY_ID: "me", queued: [], console,
  icon: (n) => `<i:${n}>`, esc: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), fmtNum: (n) => String(n), cav: () => "",
  pageHero: (t) => `<hero>${t}</hero>`, queueCosLookup: (id) => ctx.queued.push(id) };
vm.createContext(ctx);
vm.runInContext(RARITY_SRC + "\n" + between(ui, "function cosOf", "function renderStatusBar") + "\n" + between(ui, "/* ---------------- Shop:", "function renderMarket"), ctx);
const run = (e) => vm.runInContext(e, ctx);
const ready = (o) => Object.assign({ status: "ready", gems: 0, owned: [], equipped: { avatar: null, cover: null, style: null }, catalog: cat }, o);

console.log("states");
ctx.S.shop = undefined; check("no state yet -> loading", /Loading the shop/.test(run("renderShop()")));
ctx.S.shop = { status: "loading" }; check("loading", /Loading the shop/.test(run("renderShop()")));
ctx.S.shop = { status: "unavailable" }; check("unavailable (no cloud)", /needs the online game/.test(run("renderShop()")));
ctx.S.shop = { status: "error" }; check("error has a Retry button", /data-action="shop-reload"/.test(run("renderShop()")));

console.log("catalog tabs");
ctx.S.shop = ready({ gems: 100 }); ctx.S.shopTab = undefined;
let h = run("renderShop()");
check("default tab = avatars: 5 cards, no cover/style items", (h.match(/class="shop-card/g) || []).length === 5 && !/cos-cover_/.test(h) && /cos-avatar_gold/.test(h), (h.match(/class="shop-card/g) || []).length);
check("gem balance shown", /<b>100<\/b> gems/.test(h));
ctx.S.shopTab = "cover"; h = run("renderShop()");
check("covers tab: 5 cards with banner previews", (h.match(/class="shop-card/g) || []).length === 5 && /rc-banner shop-pcover cos-cover_royal/.test(h));
ctx.S.shopTab = "style"; h = run("renderShop()");
check("styles tab: 4 cards, preview uses the player's name", (h.match(/class="shop-card/g) || []).length === 4 && /cos-name shop-pname cos-style_royal">Aziz</.test(h));
ctx.S.shopTab = "bogus"; check("unknown tab falls back to avatars", /cos-avatar_frost/.test(run("renderShop()")));

console.log("buy / equip buttons");
ctx.S.shopTab = "avatar"; ctx.S.shop = ready({ gems: 100 }); h = run("renderShop()");
check("affordable item: enabled Buy", /data-action="shop-buy" data-item="avatar_emerald" >/.test(h));
check("too expensive item: disabled", /data-item="avatar_void" disabled/.test(h));
ctx.S.shop = ready({ gems: 100, owned: ["avatar_frost"] }); h = run("renderShop()");
check("owned item: Equip button (and no Buy for it)", /data-action="shop-equip" data-slot="avatar" data-item="avatar_frost"/.test(h) && !/data-action="shop-buy" data-item="avatar_frost"/.test(h));
ctx.S.shop = ready({ gems: 100, owned: ["avatar_frost"], equipped: { avatar: "avatar_frost", cover: null, style: null } }); h = run("renderShop()");
check("equipped item: 'Equipped' + Take off (empty item id)", /Equipped/.test(h) && /data-action="shop-equip" data-slot="avatar" data-item=""/.test(h));

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

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);
