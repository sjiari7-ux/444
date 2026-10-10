# Shop (cosmetics, paid with gems)

Free-to-play rule: the shop sells ONLY looks (avatar rings, profile covers, name styles). Nothing changes how strong a player is.

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
