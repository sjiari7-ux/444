/* ---------------- PvP ---------------- */
let _kingdomFetchInFlight = false;
function renderKingdom(){
  const c = S.char;
  const kv = S.kingdomView;
  if(!kv){
    if(!_kingdomFetchInFlight){ _kingdomFetchInFlight = true; loadKingdomView().finally(()=>{ _kingdomFetchInFlight = false; }); }
    return `<div class="empty"><h3>Loading kingdoms...</h3></div>`;
  }
  if(kv.unavailable){
    return `
    <div class="view-header"><h2>Kingdom</h2></div>
    <div class="panel empty">
      <h3>Shared storage unavailable</h3>
      <p class="faint">Kingdoms need shared storage, which isn't reachable right now — check your connection and reload.</p>
    </div>`;
  }
  if(kv.loading){ return `<div class="empty"><h3>Loading kingdoms...</h3></div>`; }
  if(kv.error){ return `<div class="panel empty"><h3>Couldn't load kingdom data</h3><p class="faint">Please try again.</p><button class="btn btn-primary" style="margin-top:10px;" data-action="nav" data-screen="kingdom">Retry</button></div>`; }

  if(kv.mode==='browse'){
    const cd = (c.kingdomCooldownUntil||0) - Date.now();
    if(cd > 0){
      return `
      <div class="view-header"><h2>Kingdom</h2></div>
      <div class="panel empty">
        <h3>On cooldown</h3>
        <p class="faint">You may join a new kingdom in ${fmtMs(cd)}.</p>
      </div>`;
    }
    const cards = kv.kingdoms.map(k=>`
      <div class="zone-card">
        <div style="display:flex; align-items:center;">
          ${imgIcon(KINGDOM_ICONS[k.id], k.name, 'kingdom-icon')}
          <div>
            <h4>${k.name}</h4>
            <div class="lvl">Resources: ${k.resources.map(r=>RESOURCE_NAMES[r]||titleCase(r)).join(', ')} &middot; Tax ${k.tax}%</div>
            <div class="faint" style="margin-top:2px;">${k.memberCount} member${k.memberCount===1?'':'s'} &middot; Treasury: ${fmtNum(k.treasury.gold||0)}g</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="join-kingdom" data-kingdom="${k.id}">Join</button>
      </div>`).join('');
    function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
    return `
    <div class="view-header"><h2>Kingdom</h2><p>Join one of six kingdoms. Membership is shared and visible to every player in this game.</p></div>
    ${cards}`;
  }

  // mode === 'mine'
  const k = kv.kingdom;
  const kdef = KINGDOMS.find(x=>x.id===k.id);
  const treasury = k.treasury || {};
  const myRank = kingdomRank(c.kingdomRole);
  const canManageRoles = myRank >= 3;
  const canKick = myRank >= 2;
  const leaderMissing = !k.leaderId;
  const memberRows = kv.members.map(m=>{
    const rank = kingdomRank(m.kingdomRole);
    const isMe = m.id===MY_ID;
    let actions = '';
    if(!isMe && myRank > rank){
      if(canManageRoles){
        actions += `<button class="btn btn-sm" data-action="kingdom-member" data-id="${m.id}" data-op="promote" ${rank>=myRank-1?'disabled':''}>Promote</button>`;
        actions += `<button class="btn btn-sm" data-action="kingdom-member" data-id="${m.id}" data-op="demote" ${rank<=0?'disabled':''}>Demote</button>`;
      }
      if(canKick){
        actions += `<button class="btn btn-sm btn-danger" data-action="kingdom-member" data-id="${m.id}" data-op="kick">Kick</button>`;
      }
    }
    return `<div class="skill-row">
      <div>
        <div style="font-weight:700; color:var(--parchment); font-size:13.5px;">${esc(m.username)} ${isMe?'<span class="faint">(you)</span>':''}</div>
        <div class="faint">Lv.${m.level||1} &middot; ${m.kingdomRole||'Recruit'}</div>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">${actions}</div>
    </div>`;
  }).join('');
  const treasuryRows = KINGDOM_TREASURY_RESOURCES.map(r=>`<div><span>${r==='gold'?'Gold':RESOURCE_NAMES[r]||r}</span><b>${fmtNum(treasury[r]||0)}</b></div>`).join('');
  const chat = Array.isArray(k.chat) ? k.chat : [];
  const chatLines = chat.slice().reverse().map(m=>`<div class="log-line"><b>${esc(m.senderName)}:</b> ${esc(m.text)}</div>`).join('') || '<div class="faint" style="padding:8px;">No messages yet. Say hello.</div>';

  return `
  <div class="view-header"><h2>${kdef.name}</h2><p>You are a ${c.kingdomRole} &middot; Tax ${kdef.tax}% &middot; Resources: ${kdef.resources.map(r=>RESOURCE_NAMES[r]||r).join(', ')}</p></div>
  ${leaderMissing ? `<div class="panel" style="margin-bottom:14px; border-color:var(--brass);">
    <div class="panel-title">This kingdom has no Leader</div>
    ${myRank>=2 ? `<button class="btn btn-primary btn-sm" data-action="claim-leadership">Claim Leadership</button>` : `<p class="faint">An Officer or above can claim leadership.</p>`}
  </div>` : ''}
  <div class="grid grid-2" style="margin-bottom:16px;">
    <div class="panel">
      <div class="panel-title">Treasury</div>
      <div class="stat-list">${treasuryRows}</div>
      <div class="divider"></div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-sm btn-accent" data-action="donate-kingdom" data-resource="gold" data-amount="50">Donate 50 Gold</button>
        <button class="btn btn-sm btn-accent" data-action="donate-kingdom" data-resource="gold" data-amount="200">Donate 200 Gold</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Members (${kv.members.length})</div>
      <div style="max-height:220px; overflow-y:auto;">${memberRows}</div>
    </div>
  </div>
  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Kingdom Chat</div>
    <div class="log" id="kingdom-chat-log">${chatLines}</div>
    <div style="display:flex; gap:8px; margin-top:10px;">
      <input type="text" id="kingdom-chat-input" maxlength="200" placeholder="Say something to your kingdom...">
      <button class="btn btn-primary" data-action="kingdom-chat-send">Send</button>
    </div>
  </div>
  <button class="btn btn-danger" data-action="leave-kingdom">Leave Kingdom</button>`;
}

let _marketFetchInFlight = false;
function renderMarket(){
  const c = S.char;
  if(S.marketListings===null){
    if(!_marketFetchInFlight){ _marketFetchInFlight = true; loadMarketListings().finally(()=>{ _marketFetchInFlight = false; }); }
    return `<div class="view-header"><h2>Market</h2></div><div class="empty"><h3>Loading market...</h3></div>`;
  }
  if(S.marketUnavailable){
    return `
    <div class="view-header"><h2>Market</h2></div>
    <div class="panel empty">
      <h3>Shared storage unavailable</h3>
      <p class="faint">The player market needs shared storage, which isn't reachable right now — check your connection and reload.</p>
    </div>`;
  }

  const tabs = `<div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
    <button class="btn btn-sm ${S.marketTab==='browse'?'btn-primary':''}" data-action="market-tab" data-tab="browse">Browse</button>
    <button class="btn btn-sm ${S.marketTab==='sell'?'btn-primary':''}" data-action="market-tab" data-tab="sell">Sell</button>
    <button class="btn btn-sm ${S.marketTab==='mine'?'btn-primary':''}" data-action="market-tab" data-tab="mine">My Listings</button>
  </div>`;

  let body = '';
  if(S.marketTab==='browse'){
    const filters = ['all','resource','material','consumable','equipment'];
    const filterRow = `<div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">${filters.map(f=>`<button class="btn btn-sm ${S.marketFilter===f?'btn-accent':''}" data-action="market-filter" data-filter="${f}">${f==='all'?'All':MARKET_KIND_LABELS[f]}</button>`).join('')}</div>`;
    const listings = S.marketListings.filter(l=> S.marketFilter==='all' || l.kind===S.marketFilter);
    const cards = listings.map(l=>{
      const isMine = l.sellerId===MY_ID;
      return `<div class="zone-card">
        <div>
          <h4 style="font-size:14px;">${marketItemLabel(l)}</h4>
          <div class="lvl">Seller: ${esc(l.sellerName)} &middot; ${l.pricePerUnit}g${l.qty>1?' each':''} &middot; Total: ${fmtNum(l.totalPrice)}g</div>
        </div>
        <button class="btn btn-sm ${isMine?'':'btn-primary'}" data-action="buy-listing" data-id="${l.id}" ${isMine?'disabled title="This is your own listing"':''}>${isMine?'Yours':'Buy'}</button>
      </div>`;
    }).join('') || '<div class="panel empty"><h3>No listings</h3><p class="faint">Nothing here yet — check back later or list something yourself.</p></div>';
    body = filterRow + cards;
  } else if(S.marketTab==='sell'){
    const kinds = ['resource','material','consumable','equipment'];
    const kindRow = `<div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">${kinds.map(k=>`<button class="btn btn-sm ${S.marketSellKind===k?'btn-accent':''}" data-action="market-sell-kind" data-kind="${k}">${MARKET_KIND_LABELS[k]}</button>`).join('')}</div>`;
    const items = sellableByKind(c, S.marketSellKind);
    const options = items.map(i=>`<option value="${i.id}">${esc(i.name)} (have ${i.have})</option>`).join('') || '<option value="">Nothing available</option>';
    const showQty = S.marketSellKind!=='equipment';
    body = `${kindRow}
    <div class="panel">
      <div class="panel-title">List an item</div>
      ${items.length===0 ? '<p class="faint">You have nothing of this type to sell.</p>' : `
      <label class="field">Item</label>
      <select id="market-sell-item" style="width:100%; background:#171008; border:1px solid var(--border); color:var(--text); padding:11px 13px; border-radius:6px; font-size:14px; margin-bottom:12px;">${options}</select>
      ${showQty ? `<label class="field">Quantity</label><input type="text" id="market-sell-qty" value="1" style="margin-bottom:12px;">` : ''}
      <label class="field">${showQty?'Price per unit (gold)':'Price (gold)'}</label>
      <input type="text" id="market-sell-price" value="10" style="margin-bottom:14px;">
      <button class="btn btn-primary btn-block" data-action="market-create-listing">Create Listing</button>
      `}
    </div>`;
  } else {
    const mine = S.marketListings.filter(l=>l.sellerId===MY_ID);
    body = mine.map(l=>`<div class="zone-card">
      <div>
        <h4 style="font-size:14px;">${marketItemLabel(l)}</h4>
        <div class="lvl">${l.pricePerUnit}g${l.qty>1?' each':''} &middot; Total: ${fmtNum(l.totalPrice)}g</div>
      </div>
      <button class="btn btn-sm btn-danger" data-action="cancel-listing" data-id="${l.id}">Cancel</button>
    </div>`).join('') || '<div class="panel empty"><h3>No active listings</h3><p class="faint">Anything you list will show up here.</p></div>';
  }

  return `
  <div class="view-header"><h2>Market</h2><p>Buy and sell resources, materials, potions and gear with other players. All listings and gold here are real and shared.</p></div>
  ${tabs}
  ${body}`;
}

function renderPvp(){
  const c = S.char;
  const now = Date.now();
  const protectedMs = (c.pvp.protectedUntil||0) - now;
  if(protectedMs > 0){
    return `
    <div class="view-header"><h2>PvP Arena</h2><p>Rating ${Math.round(c.pvp.rating)} &middot; ${c.pvp.wins}W-${c.pvp.losses}L</p></div>
    <div class="panel empty">
      <h3>Under protection</h3>
      <p class="faint">You're shielded from attack after your last loss.</p>
      <p style="margin-top:10px; font-family:var(--font-display); color:var(--brass-bright); font-size:20px;">${fmtMs(protectedMs)}</p>
    </div>`;
  }
  if(c.energyCur < PVP_ENERGY_COST){
    return `
    <div class="view-header"><h2>PvP Arena</h2><p>Rating ${Math.round(c.pvp.rating)} &middot; ${c.pvp.wins}W-${c.pvp.losses}L</p></div>
    <div class="panel empty">
      <h3>Not enough energy</h3>
      <p class="faint">PvP battles cost ${PVP_ENERGY_COST} Energy. Rest or wait for it to regenerate.</p>
    </div>`;
  }
  if(!S.pvpCandidates){
    return `
    <div class="view-header"><h2>PvP Arena</h2><p>Rating ${Math.round(c.pvp.rating)} &middot; ${c.pvp.wins}W-${c.pvp.losses}L</p></div>
    <div class="panel empty">
      <h3>${icon('target','style="width:34px;height:34px;stroke:var(--brass);margin-bottom:10px"')}</h3>
      <h3>Ready to fight?</h3>
      <p class="faint" style="margin-bottom:16px;">Search for an opponent near your level and rating. Costs ${PVP_ENERGY_COST} Energy.</p>
      <button class="btn btn-primary" data-action="find-opponents">Find Opponent</button>
    </div>`;
  }
  const cards = S.pvpCandidates.map((o,i)=>{
    const oc = o.class ? CLASSES[o.class] : null;
    return `<div class="panel" style="margin-bottom:12px;">
      <div class="row">
        <div>
          <h4 style="font-size:15px;">${esc(o.username)} ${o.isBot?'<span class="faint">(unranked bot)</span>':''}</h4>
          <div class="faint">${oc?oc.name:''} &middot; Level ${o.level} &middot; Rating ${Math.round(o.pvp?.rating||1000)}</div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="fight-opponent" data-idx="${i}">Fight</button>
      </div>
    </div>`;
  }).join('');
  return `
  <div class="view-header"><h2>PvP Arena</h2><p>Rating ${Math.round(c.pvp.rating)} &middot; ${c.pvp.wins}W-${c.pvp.losses}L</p></div>
  <div class="panel-title" style="margin-bottom:10px;">Matched opponents</div>
  ${cards}
  <button class="btn" data-action="find-opponents">Search Again</button>`;
}

