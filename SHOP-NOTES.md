# Shop (cosmetics, paid with gems)

Free-to-play rule: the shop sells ONLY looks (avatar rings, profile covers, name styles, gear skins). Nothing changes how strong a player is.

## What was added
| File | Change |
|---|---|
| `functions/lib/shop.js` (NEW) | catalog + `getShop`, `buyCosmetic`, `equipCosmetic`, `creditGems` (webhook only, NOT a callable) |
| `functions/index.js` | 3 callables: `getShop`, `buyCosmetic`, `equipCosmetic` |
| `tools/parts/order.json` | `shop` module added (then `node tools/build-local.js` -> `js/server-local.js`) |
| `js/config.js` | `gem` icon, `RARITY`, `CHECKOUT_ENABLED = false`, `GEM_PACKS` (placeholder prices) |
| `js/storage.js` | `loadShop`, `shopBuy`, `shopEquip`, `shopErrorMsg`, `queueCosLookup` (what other players wear) |
| `js/ui.js` | Shop in the nav (PLAYER group), `renderShop` (tabs Avatars / Covers / Styles / Gems), cosmetics shown on the status bar, your profile and other players' profiles |
| `js/main.js` | actions `shop-tab`, `shop-reload`, `shop-buy`, `shop-equip`, `gems-buy` |
| `theme.css` | shop screen + the look of every item (`.cos-<id>`) |
| `firebase-deploy/firestore.rules` | `rc_wallets`, `rc_cosmetics`, `rc_payments` (SPARK MODE comments: read them) |
| `tools/test-shop.js`, `tools/test-shop-ui.js` | 26 + 31 checks, also steps 8 in `tools/check.js` |

## Data
* `rc_wallets/{uid}` = `{ gems, owned: [ids], equipped: {avatar, cover, style} }` (only the owner reads it)
* `rc_cosmetics/{uid}` = what he wears, public read (other players see it)
* `rc_payments/{paymentId}` = payment log (idempotency), nobody reads/writes it from the browser

## Add a new item
1. `functions/lib/shop.js` -> add a line in `CATALOG` (slot, id, name, rarity, description). Price comes from the rarity (`PRICE`).
2. `theme.css` -> add `.cos-<slot>_<id>{...}` (see the existing ones).
3. `node tools/build-local.js && node tools/test-shop-ui.js` (the test fails if an item has no CSS).

## Test it now (no real money)
Gem packs are OFF (`CHECKOUT_ENABLED=false`): the Buy button only explains that payments are not connected.
To test buying items, give yourself gems by hand: Firebase Console > Firestore > `rc_wallets` > document = your uid > field `gems` (number) = 500.

## BEFORE selling gems for real money (must do, in this order)
1. Blaze + Cloud Functions live (step C in the chat), `USE_LOCAL_FN=false`.
2. Choose a payment provider that works for you (Stripe is not available for Moroccan businesses as far as I could find; check PayPal / a "merchant of record" provider / a company in a supported country).
3. Checkout creates the payment on the SERVER; the provider's WEBHOOK (a Cloud Function, signature verified) calls `Shop.creditGems(uid, gems, paymentId)`. Never credit gems from the browser.
4. In `firestore.rules` set `rc_wallets` and `rc_cosmetics` to `allow write: if false;` and deploy the rules.
5. `CHECKOUT_ENABLED = true` and write `startGemCheckout(pack)` in `js/storage.js`.
6. Check the law/tax side of selling digital goods and the store rules if you ever publish an app (Apple / Google take a cut and require their own in-app purchase).

## Picture covers
Profile covers can be pictures: `theme.css` -> `.cos-cover_<id>{background:<dark fade>,url(icons/banners/banner-<name>.webp) center/cover no-repeat !important;}` (1920x640 WebP). Today: `cover_jungle` (rare), `cover_liberty` (epic), `cover_galleon` (legendary). What a player wears is shown on his profile and everybody else sees it there (rc_cosmetics).

## Gear skins (Shop > Skins)
A skin is a set of 6 pictures (weapon, helmet, armor, gloves, boots, accessory) that repaints the pictures of the gear you wear (bag, equipment slots, paper doll, profile equipment row; other players see yours on your profile). Looks only: the stats never change.
* Pictures: `icons/skins/<set>_<slot>_<rarity>.webp` (256 px, transparent). Slots use the game's names (`helmet`, not `head`).
* Server: `functions/lib/shop.js` -> `skin("<set>", name, rarity, desc)` in `CATALOG`, id `skin_<set>`, slot `skin`. Price = `PRICE[rarity] * SKIN_MULT` (60/90/120/250/400 x 2: 120 / 180 / 240 / 500 / 800 gems). `uncommon` (90) was added to `PRICE`.
* Client: `js/config.js` -> `SKIN_SETS` (set -> rarity, used to build the file names), `skinUrl()`, `artImg(base, skinId)` (falls back to the normal picture if a skin file is missing). `js/ui.js` -> Skins tab, `shopSkinGrid`, `cosSkin(id)`.
* Look of the card: `theme.css` -> `.cos-skin_<set>{--sk:...;--sk2:...}` (accent / backdrop colours).
* Sets today: school, pirate (common) / aviation, tactical (uncommon) / sakura, wasteland (rare) / shrine, gnawa (epic) / idol, vampire (legendary).

### Add a new skin set
1. Add the 6 files to `icons/skins/` as `<set>_<slot>_<rarity>.webp`.
2. `functions/lib/shop.js` -> one `skin(...)` line. `js/config.js` -> one entry in `SKIN_SETS`. `theme.css` -> one `.cos-skin_<set>` line.
3. `node tools/build-local.js && node tools/check.js` (`tools/test-shop-skins.js` fails if a picture, a colour line or a `SKIN_SETS` entry is missing or the rarities disagree).

## Shop Home (landing tab: daily gift, newest skins, daily picks)
The Shop now opens on **Home**. Three blocks:
1. **Daily reward (ONE for the whole game)**: gold + energy + gems in a single claim (the game's `claimDailyReward`, the status-bar "Daily" chip and the Home panel do the same thing). 1 gem a day, 10 gems on day 7, then the 7-day loop starts again (a missed day restarts it too). Gold is `20 x day` (20 ... 140) and +20 energy, as before. Rebalance in ONE place: `functions/lib/community.js` -> `DAILY` (`gems: [1,1,1,1,1,1,10]`; 100 gems = $0.99 in the packs). State = `daily {day, streak}` in `rc_players/{uid}`; the gems are added to `rc_wallets/{uid}` in the same transaction. The shop only READS the state to draw the panel.
2. **Newest skins + "What is different"**: the `NEW_SHOWN` (3) newest skins, then a table: rarity, price, theme, colours, arrival date, the 6 pieces, buy button. A `NEW` badge shows for `NEW_DAYS` (14) days.
3. **Today's picks**: 3 items the player does not own, new every UTC day, different per player (seeded by uid + day). Computed on the server in `getShop` (`picks`, `picksUntil`).

### When you add a new skin
`skin("<set>", name, rarity, desc, "YYYY-MM-DD", "short theme")`: put TODAY's date and a 2-3 word theme. It then appears by itself in "Newest skins" (and the NEW badge) with no other change. The dates of the 10 existing skins are placeholders (spread over 20 Sep - 10 Oct 2026): edit them to the real days if you want.
Tests: `node tools/test-shop-home.js` (also step 8 of `tools/check.js`).
