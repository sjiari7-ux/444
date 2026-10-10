# Governance (who leads a country) — what changed

Rules (all enforced by the server code in `functions/lib/governance.js`, never by the browser):

| Topic | Rule |
|---|---|
| Term | A Leader rules **30 days**. Old countries get their 30 days the first time anyone opens them. |
| Election | Starts by itself when the term ends. **48 h** in total: **24 h registration** (any citizen may run), then **24 h voting**. |
| Who votes | Every citizen **above level 10** (11+), **one vote**, final. Someone who joined the country after the election started cannot vote. |
| Winner | Most votes. Tie -> higher level -> joined the country first. |
| During the election | The Leader keeps ruling and may run. Frozen: hand-over of leadership, promote/demote, kick, declare war. |
| Old Leader wins | Keeps the post **and the team**, new 30-day term. |
| Someone else wins | New Leader. Old Leader + all Co-Leaders/Officers become **Member**; the new Leader picks a new team. |
| Nobody registers | The Leader stays another term. |
| Leader away 4 days | The highest-ranking **active** government member takes over (Co-Leader, then Officer; ties: level, then seniority). The old Leader becomes Officer. With nobody to hand it to -> an election. |
| Vacant seat | Citizens above level 10 exist -> election. Nobody above level 10, or only one citizen -> the **Claim Leadership** button. |

Everything runs lazily (when a citizen opens the country): no scheduler needed.

## Files
- `functions/lib/governance.js` (new) + 4 callables in `functions/index.js`: `getGovernance`, `nominateCandidate`, `voteCandidate`, `claimLeadership`
- `functions/lib/community.js`: old 7-day succession removed; `transferLeadership` frozen during elections and starts a fresh term
- `functions/lib/war.js`: `declareWar` frozen during elections; `getCountryState` runs the governance clock
- `js/storage.js`, `js/main.js`, `js/ui.js`: Government tab (election panel), banner, vote/register actions, claim through the server
- `firebase-deploy/firestore.rules`: **publish the new rules** (see the SPARK MODE comments)
- `tools/test-server.js` (group G, 39 checks), `tools/test-governance-ui.js` (26 checks, new), `tools/check.js` (step 7)
- `js/server-local.js` and `dist/` regenerated (`node tools/build-local.js`, `node tools/pack.js`)

## Before uploading
`node tools/check.js` (needs your `icons/` folder next to `index.html`; it is not in the zip).
