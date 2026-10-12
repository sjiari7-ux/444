# War rules change: no cooldown, many wars at once, 12h lock-out after a lost attack

## New rules (all enforced in `functions/lib/war.js`)
* The post-war cooldown is GONE (no `warCooldownUntil`, no `COOLDOWN_ACTIVE` / `TARGET_COOLDOWN` for wars). Old cooldown values stored in Firestore are simply ignored.
* A country may fight several wars at once: no `ALREADY_AT_WAR` / `TARGET_AT_WAR`, no `activeWarId` pointer any more. A country can attack several regions, and several countries can attack the same country (each over its own region).
* A region that is already in a war (`rc_regionWars/{regionId}.active`) still cannot be attacked by a third country (`REGION_ALREADY_TARGETED`, unchanged).
* NEW: an attacker that LOSES a war for a region cannot declare a new war on that same region for 12h (`REGION_RECENTLY_LOST`, with `msRemaining`). It is per attacker AND per region: it may attack any other region at once, and other countries are not affected. A won war leaves no lock-out. The defender is never locked.
  * stored as `rc_regionWars/{regionId}.lostAttackers = { countryId: untilMs }` (written when the war finishes, `merge:true`, so declaring a war on the region keeps it)
  * duration: `reattackLockMs` (default 12h) in `WAR_CONFIG`; `rc_config/war.reattackLockMs` changes it without a deploy; each war snapshots it. `cooldownMs` was removed.

## Files
| file | change |
|---|---|
| `functions/lib/war-core.js` | `cooldownMs` -> `reattackLockMs: 12h` |
| `functions/lib/war.js` | `declareWar` (removed the 4 checks, added the lock-out check, lock doc written with merge), `advanceWar` (writes the lock-out when the attacker lost), new `liveWarsOf(cid)`, `warStrike` (no warId -> first running war), `getCountryState` (advances ALL wars of the country; returns `activeWar` = main war + `activeWars` = all; `cooldownUntil` removed) |
| `functions/lib/economy.js` | `activeWarId` / `warCooldownUntil` removed from `normalizeCountry` |
| `functions/lib/resource-distribution.js` | `ownerWar` removed from `getRegionResources`; new `regionLockouts()`; each region view gets `reattackUntil` for the viewing country |
| `js/ui.js` | region picker: removed "owner at war / protected / my war / recovering", added "lost-lock" status; Country > War tab: one panel per running war + the declare picker is always shown to the Leader |
| `js/main.js` | error messages: removed the 3 old ones, added `REGION_RECENTLY_LOST` |
| `tools/test-server.js` | old cooldown tests replaced; new checks M1..M9 (223 passed, 0 failed) |
| `js/server-local.js`, `dist/*` | regenerated (`node tools/build-local.js`, `node tools/pack.js`) |

Nothing to change in `firestore.rules`.

## World map: a conquered region takes the colour of its new owner
* `functions/lib/resource-distribution.js` `getRegionOwners()` + callable `getRegionOwners` (`functions/index.js`): `{ owners: { regionId: ownerCountryId } }` for the regions that are NOT held by their historical country only (small).
* `js/storage.js` `loadRegionOwners(force)` (cached 60 s, `S.regionOwners`); called when the map screen mounts (`js/ui.js` `mountMapScreen`) and when the Map tab is opened (`js/main.js`). The map repaints itself when the answer arrives.
* `tools/parts/map-renderer.js` AND `js/map.js` (same 3 edits, `map.js` is still exactly template + data): `ownerOf` / `fillOf` paint a conquered region with the hue of its owner (keeping the region's own shade); the gold "my country" overlay now follows the regions you hold, per region, instead of the whole original country shape.
* Tests: `test-server.js` MAP1, new `tools/test-map-recolor.js` (3 checks, also step in `tools/check.js`).
* Not changed: country-name labels and capitals stay where they are; the country outline colour stays; the red war pulse still paints the whole country shape of both fighters.

## Map colour chosen by the Leader (one colour for the whole country)
* Only the **Leader** can set it: callable `setCountryColor({ color: "#rrggbb" | null })` -> `War.setCountryColor` (`functions/lib/war.js`). Errors: `NOT_LEADER`, `INVALID_COLOR`. `color: null` goes back to the default shades.
* Stored in ONE doc: `rc_world/countryColors` -> `{ colors: { countryId: "#rrggbb" } }` (rules already allow it). It belongs to the COUNTRY, not to the regions, so when a region is conquered it simply takes the new owner's chosen colour (and loses the old one) with no extra writes.
* Served to everybody: `getRegionOwners` now returns `{ owners, colors }`; `getCountryState` returns `mapColor` for the Leader's panel (`RD.getCountryColors()` in `resource-distribution.js`).
* Map: `tools/parts/map-renderer.js` + `js/map.js` (`colOf` / `fillOf`): when the owner has a colour, ALL its regions (own + conquered) are filled with exactly that colour; otherwise the old per-region shades. Thin black region borders stay, so regions remain distinguishable.
* UI: Country > Economy tab, Leader only, panel "Map colour": 12 quick swatches + a free colour picker, "Save map colour" and "Back to default" (`js/ui.js` `colorPanel`, `js/main.js` actions `color-pick` / `color-save` / `color-reset`).
* Tests: `test-server.js` COL1..COL6 (230 passed), `test-map-recolor.js` (6 passed).
* Not enforced (say if you want it): two countries can pick the same colour; there is no cooldown on changing it.

## Country > Regions tab (own / conquered / lost)
* New tab **Regions** (between Wars and Citizens). Three lists for the country: **Our own** (historically ours, still ours), **Conquered** (held now, originally another country's, with the original country), **Lost** (historically ours, held by someone else now, with who holds it).
* Server: `RD.getCountryTerritory(countryId)` in `resource-distribution.js` + callable `getCountryTerritory` (`functions/index.js`; no `countryId` = the caller's own country). Read-only, uses `region.countryId` (historical) vs `region.ownerCountryId` (now) + the month's resource/tier.
* Client: `loadTerritory()` (`js/storage.js`, state `S.territory`), tab wiring in `js/main.js` (`kingdom-tab`, `territory-refresh`), `renderRegionsTab()` in `js/ui.js`.
* Tests: `test-server.js` TER1..TER3 (233 passed), new `tools/test-regions-tab.js` (7 passed, also a step in `tools/check.js`).
