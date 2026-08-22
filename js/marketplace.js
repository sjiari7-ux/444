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
  // Mark it loading before this first, modal-mounting render so it opens
  // straight to "Loading offers…" instead of briefly showing "No one is
  // selling this" for a frame while we don't have a cache yet.
  if(!state.marketListingsCache[key]) state.marketListingsLoading = true;
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
  // to quietly pick up other players' activity.
  //
  // Every update here goes through patchMarketDetailModal(), which
  // replaces just the listing rows inside the modal that's already on
  // screen, instead of renderBody() — renderBody() rebuilds #app's whole
  // innerHTML, which tears down and recreates the modal-overlay/modal-box
  // wrapper too. Those wrapper elements carry CSS entrance animations
  // (fadeIn/slideUp), so every one of those full re-renders restarted the
  // animation from opacity:0, which is what made the modal look like it
  // kept flashing/disappearing every time fresh data came in. patch*
  // falls back to a full renderBody() only if the modal isn't actually
  // mounted (e.g. this poll fired for an item whose modal already closed).
  const hadCache = !!state.marketListingsCache[key];
  if(!hadCache){
    state.marketListingsLoading = true;
    if(!patchMarketDetailModal(key)) renderBody();
  }
  try{
    const snap = await marketCollection()
      .where('itemKey', '==', key)
      .orderBy('pricePerUnit', 'asc')
      .orderBy('quantity', 'asc')
      .limit(MARKET_LISTINGS_PER_ITEM)
      .get();
    const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const changed = JSON.stringify(fresh) !== JSON.stringify(state.marketListingsCache[key] || null);
    state.marketListingsCache[key] = fresh;
    state.marketListingsLoading = false;
    // Skip the re-render entirely on a background poll that found no
    // actual change — nothing on screen needs to move.
    if(!hadCache || changed){
      if(!patchMarketDetailModal(key)) renderBody();
    }
    return;
  }catch(e){
    console.error('[Arcadia Market] Failed to load listings for', key, e);
    state.marketListingsCache[key] = state.marketListingsCache[key] || [];
    pushLog(state, "Couldn't load listings right now.", 'lose');
  }
  state.marketListingsLoading = false;
  if(!patchMarketDetailModal(key)) renderBody();
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

      return { itemKey: listing.itemKey, qty: buyQty, cost, pricePerUnit: listing.pricePerUnit, sellerName: listing.sellerName, sellerId: listing.sellerId };
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
  marketDeliverSaleNotice(result.sellerId, result.itemKey, result.qty, result.cost);
}

// Tells the SELLER, next time they're online, that their item sold — who
// bought it and what/how much, together in one notification. Mirrors the
// pvpReports pattern in js/pvp.js: a create-only doc in the seller's own
// subcollection (a buyer can't write anywhere else on the seller's player
// doc), which the seller's own client reads, turns into a notification,
// and deletes. Best-effort — if it fails the sale itself already went
// through in the transaction above, only the notice is lost.
async function marketDeliverSaleNotice(sellerId, itemKey, qty, cost){
  if(!db || !sellerId) return;
  try{
    await db.collection('players').doc(sellerId).collection('marketSales').add({
      buyerUid: UID,
      buyerName: state.username || 'A player',
      itemKey, qty, cost,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }catch(e){
    console.warn('[Arcadia Market] Could not deliver sale notice to seller (check Firestore rules):', e.code || e.message);
  }
}

// Applies any sales that landed on our own listings while we were offline
// (or on another tab): credits already happened server-side at buy time,
// this just surfaces who-bought-what as a notification. Self-writes only.
async function applyPendingMarketSales(){
  if(!db || !UID) return;
  try{
    const snap = await db.collection('players').doc(UID).collection('marketSales').limit(20).get();
    if(snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc=>{
      const s = doc.data();
      const itemName = (MARKET_CATALOG[s.itemKey] && MARKET_CATALOG[s.itemKey].name) || s.itemKey;
      if(typeof addNotification === 'function'){
        addNotification('market', '💰 Item Sold!', `${escapeHtml(s.buyerName||'A player')} bought ${s.qty} ${escapeHtml(itemName)} for ${s.cost}g.`);
      }
      batch.delete(doc.ref);
    });
    await batch.commit();
  }catch(e){
    console.error('[Arcadia Market] Failed to apply pending sale notices:', e.code || e.name, e.message);
  }
}

async function initMarketNoticesOnStart(){
  await applyPendingMarketSales();
  setInterval(()=>{ applyPendingMarketSales(); }, 3 * 60 * 1000);
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

// Guards against the same listing being posted twice if "List for sale"
// gets clicked again before the first click's Firestore write has come
// back (double-click, slow connection, etc). Without this, a repeated
// click on submitSellForm() -> createListing() posts two separate
// listings for the same item/price — which is what "Browse offers" was
// showing (two identical "You" rows for the same item).
let listingSubmitInFlight = false;

async function createListing(key, qty, pricePerUnit){
  if(listingSubmitInFlight){ return; }
  if(!db || !UID){ pushLog(state, 'The player market needs a cloud connection.', 'lose'); return; }
  qty = Math.floor(Number(qty));
  pricePerUnit = Math.round(Number(pricePerUnit) * 10) / 10;
  if(!(qty > 0)){ pushLog(state, 'Enter a quantity to list.', 'lose'); return; }
  if(!(pricePerUnit > 0)){ pushLog(state, 'Enter a price per unit.', 'lose'); return; }
  if((state.inv[key] || 0) < qty){ pushLog(state, "You don't have that many to list.", 'lose'); return; }

  listingSubmitInFlight = true;

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
  listingSubmitInFlight = false;
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
