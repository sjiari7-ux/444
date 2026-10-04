# Server logic (single source of truth)

All game rules that must not be trusted to the browser live here:

- `index.js`      – the callable functions (adventures, road, PvP, wars, daily reward, leadership...)
- `lib/*.js`      – rules and helpers (war-core, economy, war, community, game-core, countries, errors)

## Day-to-day (no Firebase billing needed)

The game currently runs this same code **inside the browser** through `js/server-local.js`.
That file is GENERATED. Never edit it by hand:

    node tools/build-local.js     # regenerates js/server-local.js from functions/
    node tools/check.js           # syntax + server tests + missing-image check (run before every upload)

## Going live with real players (this is what stops cheating)

1. Upgrade the Firebase project to the Blaze plan (needed for Cloud Functions).
2. From the project root:  `cd functions && npm install && cd .. && firebase deploy --only functions`
3. In `js/storage.js` set `const USE_LOCAL_FN = false;` and remove the
   `<script src="js/server-local.js">` line from `index.html`. The game then calls the deployed functions.
4. Lock the database with Firestore rules (clients may read, but not write wars/countries/config).

Until step 2-4 are done, a technical player can still edit the code in their own browser.
