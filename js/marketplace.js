/* ═══════════════════════════════════════════════════════════════
   ARCADIA MMO — Player Market (real listings, real supply & demand)
   ═══════════════════════════════════════════════════════════════
   No more synthetic AMM curve. A seller picks their own price and
   quantity and posts a listing; any other player can buy from it,
   in full or in part. Price only ever moves because a real trade
   happened at that price.

   Firestore shape — collection `marketListings`, one doc per listing:
     {
       itemKey:      string   (a MARKET_CATALOG key)
       sellerId:     string   (auth uid)
       sellerName:   string   (display name at time of listing)
       pricePerUnit: number   (gold, > 0)
       quantity:     number   (integer, > 0 — units still unsold)
       createdAt:    Firestore server timestamp
     }

   REQUIRED FIRESTORE SECURITY RULES — see MARKET_SETUP.md at the
   project root. Without those rules, listings can be created but
   nobody else will be able to read or buy from them.
   ═══════════════════════════════════════════════════════════════ */

const MARKET_LISTINGS_PER_ITEM = 40;

function marketCollection(){
  return db.collection('marketListings');
}

/* ───────────────────────── Browse (buy side) ───────────────────────── */

function openMarketDetail(key){
  state.marketDetailItem = key;
  renderBody();
  loadListingsFor(key);
}
function closeMarketDetail(){
  state.marketDetailItem = null;
  renderBody();
}

async function loadListingsFor(key){
  if(!db){
    pushLog(state, 'The player market needs a cloud connection.', 'lose');
    renderBody();
    return;
  }
  // Only show the "Loading offers…" skeleton on the very first load for
  // this item. The background poll in refreshOpenMarketViews() (every
  // PRICE_TICK_MS while the Market tab is open) calls this same function
  // to quietly pick up other players' activity — flipping the loading
  // flag and re-rendering on every one of those polls was tearing down
  // and rebuilding the whole page every 15s, which is what made the
  // market view look like it kept flashing/disappearing.
  const hadCache = !!state.marketListingsCache[key];
  if(!hadCache){
    state.marketListingsLoading = true;
    renderBody();
  }
  try{
    const snap = await marketCollection()
      .where('itemKey', '==', key)
      .orderBy('pricePerUnit', 'asc')
      .limit(MARKET_LISTINGS_PER_ITEM)
      .get();
    const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const changed = JSON.stringify(fresh) !== JSON.stringify(state.marketListingsCache[key] || null);
    state.marketListingsCache[key] = fresh;
    state.marketListingsLoading = false;
    // Skip the re-render entirely on a background poll that found no
    // actual change — nothing on screen needs to move.
    if(!hadCache || changed) renderBody();
    return;
  }catch(e){
    console.error('[Arcadia Market] Failed to load listings for', key, e);
    state.marketListingsCache[key] = state.marketListingsCache[key] || [];
    pushLog(state, "Couldn't load listings right now.", 'lose');
  }
  state.marketListingsLoading = false;
  renderBody();
}

// Buys `amount` units off a single listing (partial buys are fine — the
// listing's quantity just shrinks; it's deleted once it hits 0). Runs as a
// Firestore transaction against the listing doc + the seller's player doc
// so a listing can never be sold twice over and the seller is always paid.
async function buyFromListing(listingId, amount){
  if(!db || !UID){ pushLog(state, 'The player market needs a cloud connection.', 'lose'); return; }
  amount = Math.floor(Number(amount));
  if(!(amount > 0)) return;

  const listingRef = marketCollection().doc(listingId);
  let result;
  try{
    result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(listingRef);
      if(!snap.exists) throw new Error('SOLD_OUT');
      const listing = snap.data();
      if(listing.sellerId === UID) throw new Error('OWN_LISTING');
      const buyQty = Math.min(amount, listing.quantity);
      if(buyQty <= 0) throw new Error('SOLD_OUT');
      const cost = Math.ceil(buyQty * listing.pricePerUnit);

      if(buyQty >= listing.quantity){
        tx.delete(listingRef);
      } else {
        tx.update(listingRef, { quantity: listing.quantity - buyQty });
      }
      // Pay the seller directly in the same atomic transaction — no
      // window where the listing is gone but the seller wasn't paid.
      const sellerRef = db.collection('players').doc(listing.sellerId);
      tx.update(sellerRef, { gold: firebase.firestore.FieldValue.increment(cost) });

      return { itemKey: listing.itemKey, qty: buyQty, cost, pricePerUnit: listing.pricePerUnit, sellerName: listing.sellerName };
    });
  }catch(e){
    if(e.message === 'OWN_LISTING'){
      pushLog(state, "That's your own listing — cancel it from My Listings instead.", 'lose');
    } else if(e.message === 'SOLD_OUT'){
      pushLog(state, 'That listing is gone — someone beat you to it.', 'lose');
    } else {
      console.error('[Arcadia Market] Buy failed:', e);
      pushLog(state, "Couldn't complete that purchase.", 'lose');
    }
    renderBody();
    if(state.marketDetailItem) loadListingsFor(state.marketDetailItem);
    return;
  }

  const cap = getStorageCap(state);
  const used = getTotalStorageUsed(state);
  const roomLeft = Math.max(0, cap - used);
  if(roomLeft < result.qty){
    // Rare edge case: storage filled up between opening the modal and the
    // transaction landing. We already paid — keep what fits, refund the rest.
    const fitQty = roomLeft;
    const refund = result.cost - Math.floor(fitQty * result.pricePerUnit);
    state.inv[result.itemKey] += fitQty;
    state.gold += refund; // refund is purely local bookkeeping against what we already sent
    pushLog(state, `Storage was full — bought ${fitQty}/${result.qty} ${MARKET_CATALOG[result.itemKey].name}, refunded ${refund}g.`, 'lose');
  } else {
    state.gold -= result.cost;
    state.inv[result.itemKey] += result.qty;
    updateMissionProgress('bought', result.qty);
    pushLog(state, `Bought ${result.qty} ${MARKET_CATALOG[result.itemKey].name} from ${escapeHtml(result.sellerName||'a player')} for ${result.cost}g`, 'gain');
  }
  recordTradePrice(result.itemKey, result.pricePerUnit);
  renderBody(); scheduleSave();
  loadListingsFor(result.itemKey);
}

/* ───────────────────────── Sell (listing side) ───────────────────────── */

function openSellModal(key){
  state.marketSellItem = key;
  renderBody();
  loadMyListings();
}
function closeSellModal(){
  state.marketSellItem = null;
  renderBody();
}

async function loadMyListings(){
  if(!db || !UID) return;
  const hadCache = state.myListingsCache.length > 0;
  if(!hadCache){
    state.myListingsLoading = true;
    renderBody();
  }
  try{
    const snap = await marketCollection().where('sellerId', '==', UID).get();
    const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const changed = JSON.stringify(fresh) !== JSON.stringify(state.myListingsCache);
    state.myListingsCache = fresh;
    state.myListingsLoading = false;
    if(!hadCache || changed) renderBody();
    return;
  }catch(e){
    console.error('[Arcadia Market] Failed to load my listings:', e);
    pushLog(state, "Couldn't load your listings right now.", 'lose');
  }
  state.myListingsLoading = false;
  renderBody();
}

async function createListing(key, qty, pricePerUnit){
  if(!db || !UID){ pushLog(state, 'The player market needs a cloud connection.', 'lose'); return; }
  qty = Math.floor(Number(qty));
  pricePerUnit = Math.round(Number(pricePerUnit) * 10) / 10;
  if(!(qty > 0)){ pushLog(state, 'Enter a quantity to list.', 'lose'); return; }
  if(!(pricePerUnit > 0)){ pushLog(state, 'Enter a price per unit.', 'lose'); return; }
  if((state.inv[key] || 0) < qty){ pushLog(state, "You don't have that many to list.", 'lose'); return; }

  // Take the items out of the backpack immediately, client-side, exactly
  // like every other inventory change in this game — this is the player's
  // own item count and only their own client ever touches it, so there's
  // no cross-player race to worry about here (unlike the gold credit on a
  // sale, which is why that part runs through a transaction above).
  state.inv[key] -= qty;
  renderBody(); scheduleSave();

  try{
    await marketCollection().add({
      itemKey: key,
      sellerId: UID,
      sellerName: state.username || 'Player',
      pricePerUnit,
      quantity: qty,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    updateMissionProgress('sold', qty);
    pushLog(state, `Listed ${qty} ${MARKET_CATALOG[key].name} at ${pricePerUnit}g each`, 'sell');
  }catch(e){
    console.error('[Arcadia Market] Failed to create listing:', e);
    state.inv[key] += qty; // refund locally — the listing never made it to Firestore
    pushLog(state, "Couldn't post that listing — items returned to your backpack.", 'lose');
  }
  renderBody(); scheduleSave();
  loadMyListings();
}

async function cancelListing(listingId){
  if(!db || !UID) return;
  const listingRef = marketCollection().doc(listingId);
  try{
    const returned = await db.runTransaction(async (tx) => {
      const snap = await tx.get(listingRef);
      if(!snap.exists) return null;
      const listing = snap.data();
      if(listing.sellerId !== UID) throw new Error('NOT_YOURS');
      tx.delete(listingRef);
      return { itemKey: listing.itemKey, quantity: listing.quantity };
    });
    if(returned){
      state.inv[returned.itemKey] = (state.inv[returned.itemKey] || 0) + returned.quantity;
      pushLog(state, `Cancelled listing — ${returned.quantity} ${MARKET_CATALOG[returned.itemKey].name} returned to your backpack`, 'gain');
    }
  }catch(e){
    console.error('[Arcadia Market] Cancel failed:', e);
    pushLog(state, "Couldn't cancel that listing.", 'lose');
  }
  renderBody(); scheduleSave();
  loadMyListings();
}

/* ───────────────────────── Misc / filters ───────────────────────── */

function setMarketView(view){
  state.marketView = view;
  renderBody();
  if(view === 'mine') loadMyListings();
}

// Called every PRICE_TICK_MS while the Market tab is open (see main.js) so
// an open order book or "My Listings" reflects other players' activity
// without needing to be reopened.
function refreshOpenMarketViews(){
  if(state.marketDetailItem) loadListingsFor(state.marketDetailItem);
  else if(state.marketView === 'mine') loadMyListings();
}
