# Country Economy & War — how it works

Loop: player gathers (PvE / Road) → country tax on the NEW amount → country resources → war (max 3 rounds, first to 2) → winner's Leader picks ONE enemy resource → 10% war tax on newly gathered amounts for 14 days → auto-expiry.

## Where the code is
| File | Role |
|---|---|
| `functions/lib/war-core.js` | Pure rules: config defaults, tax split, round winner + tie-break, war state machine |
| `functions/lib/economy.js` | Country docs, applies tax to gains inside a transaction |
| `functions/lib/war.js` | declareWar, advanceWar, warStrike, chooseWarReward, getCountryState, tickWars |
| `functions/lib/countries.js` | Server copy of the country list (kept in sync with `js/config.js` by a test) |
| `functions/index.js` | Callables: `getCountryState`, `declareWar`, `warStrike`, `chooseWarReward`, `takeRoadStep` (Road moved server-side), `warTick` (every minute); PvE rewards now taxed |
| `functions/test/` | `npm test` inside `functions/` (in-memory Firestore; no emulator needed) |
| `firestore.rules` | `rc_countries`, `rc_wars` (+`rounds`), `rc_warPlayers`, `rc_config`: clients read-only |
| `js/ui.js`, `js/main.js`, `js/storage.js` | Kingdom screen → new **Economy** and **War** tabs; Road calls `takeRoadStep` |

## Firestore schema (all written only by Cloud Functions)
- `rc_countries/{countryId}`: `taxRate`, `resources{res:n}`, `activeWarId`, `warCooldownUntil`, `warTaxOut{warId,winnerCountryId,loserCountryId,resourceId,rate,startedAt,expiresAt}` (tax THIS country pays), `warTaxIn[]` (taxes it collects), `warTaxCollected{warId:n}`, `pendingReward{warId,winnerCountryId,expiresAt}`
- `rc_wars/{warId}`: `status` preparing|active|finished, attacker/defender ids, `startsAt`, `rounds[{round,startsAt,endsAt,status,winner,damage}]`, `finalScore`, `winnerCountryId`, `loserCountryId`, `selectedResource`, `warTaxRate`, `warTaxDurationDays`, `reward{status,options,claimExpiresAt,resourceId,rate,startedAt,expiresAt}`, `cfg` (rules snapshot), `startedAt`, `endedAt`
- `rc_wars/{warId}/rounds/{n}`: `damage{countryId:n}`, `contrib{uid:n}`, `members{uid:countryId}`
- `rc_warPlayers/{warId}_{uid}`: per-player `strikes{round:n}`, `hits{round_targetUid:n}`, `lastStrikeAt`, `damage{round:n}`
- `rc_config/war` (optional, create by hand): override any of `prepMs, roundMs, cooldownMs, minMembers, warTaxRate, warTaxDays, rewardClaimMs, strikeEnergyCost, strikeCooldownMs, maxStrikesPerPlayerPerRound, maxHitsPerTarget`. Each war snapshots its own rules when declared.
- `rc_players/{uid}.taxCarry{res:{normal,war}}`: fractional tax remainder so small gains still pay tax over time.

## Balance defaults (`war-core.js` → `WAR_CONFIG`)
Prep 30 min · round 2 h · post-war cooldown 24 h · war tax 10% for 14 days · normal tax 5–15% · combined tax capped at 30% · strike costs 10 Energy, 10 s cooldown, max 30 strikes per player per round, max 3 counted hits per enemy player per round · `minMembers: 1` (raise for production).

## Deploy
`firebase deploy --only functions,firestore:rules` (the `warTick` schedule needs Cloud Scheduler / Blaze; everything also advances lazily without it).
