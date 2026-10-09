"use strict";

/* ============================================================
   APP STATE + RENDER
   ============================================================ */
const S = {
  screen: 'loading',
  char: null,
  combat: null, // transient combat session
  pvpCandidates: null,
  road: null, // {zoneId, log:[], gained:{xp,gold,resources:{}}}
  kingdomView: null,
  rankingsView: null,
  generalChat: null,
  chatWidgetOpen: false, // docked chat, floats over every screen — the only chat entry point now
  marketListings: null,
  marketTab: 'browse',
  marketFilter: 'all',
  marketSellKind: 'resource',
  marketSellItem: null,
  craftQty: {},
  zoneDetailId: null,
  toast: null,
  toastTimer: null,
  craftFilter: null,
  kingdomTab: 'overview',
  countryState: null, // {status:'loading'|'ready'|'error'|'unavailable', data} from the getCountryState Cloud Function
  serverOffset: 0,    // serverNow - Date.now(), so countdowns follow SERVER time
  _warTarget: '',      // REGION id the Leader is about to declare war over (Wars tab)
  _warCountry: '',     // country whose regions are listed in the Wars tab picker
  profileTab: 'stats', // 'stats' | 'settings' — Profile and Settings share one nav slot
  worldWars: null,
  worldWarsAt: 0,
};

function showToast(msg){
  S.toast = msg;
  render();
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(()=>{ S.toast=null; render(); }, 2600);
}

/* ---- In-game dialogs: replaces native alert/confirm/prompt. askConfirm() resolves true/false exactly once. ---- */
let _dlgResolve = null;
function askConfirm(opts){
  if(_dlgResolve){ const r=_dlgResolve; _dlgResolve=null; r(false); }   // a newer dialog supersedes (= cancels) an older one
  return new Promise(resolve=>{
    _dlgResolve = resolve;
    S.dialog = Object.assign({title:'Confirm', body:'', confirmLabel:'Confirm', cancelLabel:'Cancel', danger:false}, opts||{});
    render();
    setTimeout(()=>{ const b=document.querySelector('.rc-dlg [data-action="dlg-cancel"]'); if(b) b.focus(); }, 0);
  });
}
function closeDialog(result){
  const r = _dlgResolve; _dlgResolve = null; S.dialog = null;
  render();
  if(r) r(!!result);                       // resolver is cleared first, so a double click can never confirm twice
}
function renderDialog(){
  const d = S.dialog; if(!d) return '';
  const rows = (d.facts||[]).map(f=>`<div class="rc-dlg-fact"><span>${esc(f[0])}</span><b>${esc(f[1])}</b></div>`).join('');
  return `<div class="rc-dlg-back" data-action="dlg-backdrop"><div class="rc-dlg" role="alertdialog" aria-modal="true" aria-labelledby="rc-dlg-title">
    <h3 id="rc-dlg-title">${esc(d.title)}</h3>
    ${rows ? `<div class="rc-dlg-facts">${rows}</div>` : ''}
    <p class="rc-dlg-body">${esc(d.body)}</p>
    <div class="rc-dlg-btns">
      <button class="btn" data-action="dlg-cancel">${esc(d.cancelLabel)}</button>
      <button class="btn ${d.danger?'btn-danger':'btn-primary'}" data-action="dlg-ok">${esc(d.confirmLabel)}</button>
    </div></div></div>`;
}
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && S.dialog) closeDialog(false); });

function setScreen(scr){
  S.screen = scr;
  render();
  window.scrollTo(0,0);
}

async function persist(){ render(); if(S.char) saveCharacter(S.char); } // update the screen first; save runs in the background

// Pushes the chosen accent onto the two CSS vars (--brass / --brass-bright)
// that the whole UI is built on, so switching schemes in Settings re-skins
// buttons, active nav, panel titles, etc. without touching any other CSS.
function applyColorScheme(id){
  // Whole-UI themes: the CSS re-skins itself from html[data-theme="..."] (see theme.css). 'brass' = the default look = no attribute.
  // Chosen theme is stored in the character (colorScheme) and mirrored in localStorage so the login / loading screens already use it.
  const root = document.documentElement;
  root.style.removeProperty('--brass'); root.style.removeProperty('--brass-bright');   // leftovers of the old accent-only schemes
  if(!id){ try{ id = localStorage.getItem('arcadia_theme'); }catch(e){} }
  const scheme = getColorScheme(id);
  if(scheme.id==='brass') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', scheme.id);
  if(S.char){ try{ localStorage.setItem('arcadia_theme', scheme.id); }catch(e){} }
}

// Hover text for the Energy bar's regen label — the countdown is display-only,
// the authoritative value always comes from applyRegen()'s timestamp math.
function energyRegenTooltip(c, eff){
  if(c.energyCur >= eff.maxEnergy) return 'Energy is full.';
  const info = energyRegenInfo(c, eff);
  return `+${info.perHour} Energy per hour (20% of Max Energy) · next point in ${fmtMs(info.msToNext)} · full in ${fmtMs(info.msToFull)}`;
}

/* ---------------- Login gate ---------------- */
function renderLogin(){
  return `
  <div class="loader-wrap rc-hero-bg" style="min-height:100vh; padding:20px;">
    <div class="rc-login">
      <img class="rc-logo" src="icons/ui/logo.webp" alt="RealmClash">
      <p>Fight for your country in a world at war. Become a leader, a soldier or a trader.</p>
      <button class="btn btn-primary btn-block" data-action="google-signin" style="padding:14px;">Sign in with Google</button>
      <small>Your progress is saved to your account.</small>
    </div>
  </div>`;
}

/* ---------------- Character creation ---------------- */
function renderCountryCards(state){
  const q = (state.countrySearch||'').trim().toLowerCase();
  const list = q ? KINGDOMS.filter(k=>k.name.toLowerCase().includes(q)) : KINGDOMS;
  return list.map(k=>{
    const sel = state.countryId===k.id;
    return `<div class="class-card ${sel?'selected':''}" data-action="pick-country" data-country="${k.id}">
      <h3>${flagIcon(k.flag,22,'margin-right:6px;')}${k.name}</h3>
      <div class="faint">${k.resources.map(r=>RESOURCE_NAMES[r]||r).join(', ')}</div>
    </div>`;
  }).join('') || '<p class="faint">No country matches your search.</p>';
}

function renderCreate(){
  const state = S._create || (S._create = {username:'', classId:null, countryId:null, countrySearch:''});
  const cards = Object.values(CLASSES).map(cls=>{
    const sel = state.classId===cls.id;
    return `<div class="class-card ${sel?'selected':''}" data-action="pick-class" data-class="${cls.id}">
      <h3>${itemIcon(cls.icon,20,'margin-right:6px;')}${cls.name}</h3>
      <div class="res">Resource: ${cls.resource}</div>
      <div class="faint">${cls.tagline}</div>
      <ul>${cls.skills.map(s=>`<li>${s.name}</li>`).join('')}</ul>
    </div>`;
  }).join('');
  return `
  <div class="loader-wrap rc-hero-bg" style="min-height:100vh; padding:20px;">
    <div style="max-width:760px; width:100%;">
      <div style="text-align:center; margin-bottom:26px;">
        <img class="rc-logo sm" src="icons/ui/logo.webp" alt="RealmClash">
        <p class="muted" style="margin-top:6px;">Create your character and enter the fight.</p>
      </div>
      <div class="panel" style="margin-bottom:16px;">
        <label class="field">Username</label>
        <input type="text" id="username-input" maxlength="18" placeholder="Choose a name (min. 3 characters)" value="${esc(state.username)}">
        <p class="faint" style="margin-top:6px;">At least 3 characters, and must be unique — no two players can share a name.</p>
      </div>
      <div class="panel-title" style="margin-bottom:10px;">Choose your class</div>
      <div class="grid grid-3" style="margin-bottom:20px;">${cards}</div>
      <div class="panel-title" style="margin-bottom:10px;">Choose your country</div>
      <input type="text" id="country-search" placeholder="Search countries..." value="${esc(state.countrySearch||'')}" style="margin-bottom:10px;">
      ${state.countryId ? `<p class="faint" style="margin-bottom:10px;">Selected: ${kingdomFlag(state.countryId)}${KINGDOMS.find(k=>k.id===state.countryId).name}</p>` : ''}
      <div id="country-grid" class="grid grid-3" style="margin-bottom:20px; max-height:360px; overflow-y:auto;">${renderCountryCards(state)}</div>
      <button class="btn btn-primary btn-block" data-action="create-character" ${(!state.classId || !state.countryId)?'disabled':''} style="padding:14px;">Begin your journey</button>
    </div>
  </div>`;
}

/* ---------------- World Map (js/map.js) ---------------- */
function mapWarsList(){ return (S.worldWars && S.worldWars.active) || []; }
/* Simple one-colour line icons for the 10 game resources (24x24, stroke = rarity colour). */
const RES_PATH = {
  food:'M12 21V9M12 9c-2.2-.8-3.4-2.6-3.4-5 2.2.2 3.4 2.2 3.4 5zM12 9c2.2-.8 3.4-2.6 3.4-5-2.2.2-3.4 2.2-3.4 5zM12 14c-2.2-.8-3.4-2.6-3.4-5M12 14c2.2-.8 3.4-2.6 3.4-5M12 19c-2.2-.8-3.4-2.6-3.4-5M12 19c2.2-.8 3.4-2.6 3.4-5',
  wood:'M9 5.5h9.5c1.5 0 2.5 2.8 2.5 6.5s-1 6.5-2.5 6.5H9M5.5 12a3.5 6.5 0 1 0 7 0a3.5 6.5 0 1 0-7 0M9 10.2c1 0 1 3.6 0 3.6',
  stone:'M4 17l2.5-8L12 5l6 3.5L20 17l-6.5 3zM6.5 9l5.5 3 6-3.5M12 12l1.5 8',
  herbs:'M5 19C5 10 10.5 4.5 20 4.5 20 14 14.5 19.5 6 19.5M5 19.5L14 10.5',
  leather:'M7 5l2.5 1.8h5L17 5l3.5 3.5-2 2.5.5 3.5-2.5 1.5-.5 3.5h-2.8l-.7-2.8h-1l-.7 2.8H8.5L8 16.5 5.5 14.5 6 11 3.5 8.5z',
  iron:'M3 17l3-8h12l3 8zM6 9l-1.5 4.5M18 9l1.5 4.5M4.5 13.5h15',
  coal:'M5 15l2-7 6-3 5 4 1 7-6 3.5zM7 8l6 3 5-2M13 11l-1 8.5',
  ore:'M5 16l3-6 5-2.5 5 3 1 6-5.5 3zM8 10l5 2 5-1.5M13 12l-.5 7M19 3.5v3M17.5 5h3',
  frost:'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2',
  voidessence:'M12 3c4.5 5 6.5 7.5 6.5 10.5a6.5 6.5 0 0 1-13 0C5.5 10.5 7.5 8 12 3zM9.5 14.5a2.5 2.5 0 0 0 5 0'
};
const MAP_TIER_COL = {COMMON:'#b8ab95', UNCOMMON:'#7fbf7a', RARE:'#4fd1ff', VERY_RARE:'#c9a0ff'};
function resBadgeIcon(r, s){ return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RES_PATH[r] ? `<path d="${RES_PATH[r]}"/>` : '<circle cx="12" cy="12" r="7"/>'}</svg>`; }
/* Territories of a country for the canvas badges (cached list; loads the country once, same cache as the sheet). */
function terrForMap(id){
  const mr = S.mapRegions && S.mapRegions[id];
  if(mr===undefined || (mr!=='loading' && Date.now()-mr.at > 300000)) loadMapRegions(id);
  if(!mr || mr==='loading' || !mr.data || !mr.data.enabled) return null;
  return mr.badges || (mr.badges = mr.data.regions.filter(g=>g.resource).map(g=>({id:g.id, name:g.name, col:MAP_TIER_COL[g.tier] || MAP_TIER_COL.COMMON, d:RES_PATH[g.resource], img:RESOURCE_ICONS[g.resource]?iconUrl(RESOURCE_ICONS[g.resource]):null, occ:!!g.occupiedBy, by:g.occupiedBy||'', res:g.resource, prod:g.production||0, v:g.value||0})));
}
const MAP_TIER = {COMMON:'Common', UNCOMMON:'Uncommon', RARE:'Rare', VERY_RARE:'Very rare'};
/* ---------------- Region-targeted wars ----------------
   A war is declared over ONE region. The defender is whoever owns that region RIGHT NOW (the server derives it; the client only sends the region id).
   `d` = getRegionResources(ownerId) data (regions currently owned by ownerId + ownerWar + reservations). Nothing here decides the outcome. */
function regionWarStatus(g, d, ownerId){
  const now = srvNow(), me = S.char && S.char.kingdomId, st = S.countryState && S.countryState.data;
  if(me && ownerId===me) return {code:'own', label:"Your country's region", can:false, avail:false};
  if(g.reservedByWarId) return {code:'reserved', label:'Already targeted by an active war', can:false, avail:false};
  if(d.ownerWar && d.ownerWar.atWar) return {code:'owner-war', label:'Its owner is already at war', can:false, avail:false};
  if(d.ownerWar && d.ownerWar.cooldownUntil > now) return {code:'owner-cool', label:'Protected after its owner\'s last war ('+fmtClock(d.ownerWar.cooldownUntil-now)+')', can:false, avail:false};
  if(st && st.countryId===me){
    if(!st.isLeader) return {code:'not-leader', label:'Available target. Only your Leader can declare war', can:false, avail:true};
    if(st.activeWar) return {code:'my-war', label:'Available target. Your country is already at war', can:false, avail:true};
    if(st.cooldownUntil>now) return {code:'my-cool', label:'Available target. Your country is recovering ('+fmtClock(st.cooldownUntil-now)+')', can:false, avail:true};
  }
  return {code:'ok', label:'Available target. War can be declared', can:true, avail:true};
}
function regionStatusColor(s){ return s.can ? '#9ad18b' : (s.avail ? '#e8c766' : '#ffb4a8'); }
/* One row per region currently owned by `ownerId`: name, current owner, target status and (when allowed) the Declare-war button. */
function renderRegionTargets(ownerId, d){
  const rows = d.regions.map(g=>{
    const s = regionWarStatus(g, d, ownerId), rn = g.resource ? resName(g.resource) : 'No resource';
    const btn = s.can ? `<button class="btn btn-sm btn-danger" data-action="map-declare-war" data-region="${esc(g.id)}" data-region-name="${esc(g.name)}" data-owner="${esc(ownerId)}" aria-label="Declare war over ${esc(g.name)}">${icon('sword','class="ic-inline" aria-hidden="true"')} Declare war</button>` : '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #2a3040;">
      <div style="min-width:0;"><b>${esc(g.name)}</b>
        <div class="faint" style="font-size:12px;">${esc(rn)} &middot; ${fmtNum(g.production)}/h &middot; Current owner: ${kingdomFlag(ownerId,14)} ${esc(countryName(ownerId))}</div>
        <div style="font-size:12px;color:${regionStatusColor(s)};">${esc(s.label)}</div></div>${btn}</div>`;
  }).join('');
  return `<div class="rc-sec" style="margin-top:10px">REGIONS &mdash; CONTROL &amp; WAR</div>
    <p class="faint" style="font-size:12px;margin:0 0 4px">A war is declared over control of ONE region. Its defender is the country that owns that region right now, and the winner takes exactly that region.</p>${rows || '<p class="faint">No regions.</p>'}`;
}
/* Territories of a country for the map sheet. Read-only data from the existing getRegionResources call (server owns every number); nothing is computed or invented here. */
function renderMapTerritories(id){
  const mr = S.mapRegions && S.mapRegions[id];
  if(mr===undefined || (mr!=='loading' && Date.now()-mr.at > 300000)) loadMapRegions(id);
  if(mr===undefined || mr==='loading') return '<p class="faint" style="margin:8px 0">Loading territories&hellip;</p>';
  const d = mr.data; if(!d || !d.enabled) return '';
  const rows = d.regions.map(g=>{
    const col = MAP_TIER_COL[g.tier] || MAP_TIER_COL.COMMON, rn = g.resource ? resName(g.resource) : 'No resource';
    const tip = `${g.name} · ${rn} · ${MAP_TIER[g.tier]||''} · Stability ${Math.round(g.stability)}%${g.occupiedBy?' · Occupied by '+countryName(g.occupiedBy):''}`;
    return `<div title="${esc(tip)}" style="width:72px;text-align:center;">
      <div style="width:56px;height:56px;border-radius:50%;margin:0 auto 5px;display:grid;place-items:center;border:2px solid ${col};color:${col};background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.07),transparent 70%);">${resBadgeIcon(g.resource, 28)}</div>
      <div style="font-weight:700;font-size:15px;line-height:1.1;">${fmtNum(g.production)}<small style="font-weight:500;opacity:.6;font-size:.72em;">/h</small></div>
      <div class="faint" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(rn)}</div>${g.occupiedBy?'<div style="font-size:10px;color:#e0766a;">Occupied</div>':''}</div>`;
  }).join('');
  return `<div class="rc-sec" style="margin-top:10px">TERRITORIES <span class="tag">${esc(d.monthKey)}</span></div>${rows ? '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-around;margin-bottom:6px;">'+rows+'</div>' : '<p class="faint">No territories.</p>'}
    <p class="faint" style="font-size:12px;margin:6px 0 8px">Resources rotate every month; the monthly rotation never changes who owns a territory. Next rotation in ${d.daysToRotation} day${d.daysToRotation===1?'':'s'}.</p>${renderRegionTargets(id, d)}`;
}
/* Region panel: only this region's info: its name, who controls it (flag) and its resource(s) with icon + output per hour; Declare war per region when allowed. */
function renderMapPanel(id, selR, ts){
  const k = KINGDOMS.find(x=>x.id===id);
  if(!k) return '';
  ts = ts || [];
  const mr = S.mapRegions && S.mapRegions[id];
  if(mr===undefined || (mr!=='loading' && Date.now()-mr.at > 300000)) loadMapRegions(id);
  const d = (mr && mr!=='loading' && mr.data && mr.data.enabled) ? mr.data : null;
  const w = mapWarsList().find(x=>x.attackerCountryId===id || x.defenderCountryId===id);
  const me = S.char && S.char.kingdomId;
  const mine = !!me && id===me;
  const atWarWithMe = !!w && !!me && (w.attackerCountryId===me || w.defenderCountryId===me);
  const heldBy = (ts.map(t=>t.by).find(Boolean)) || '';
  const occupied = !!heldBy && heldBy!==id;
  // Only this region's own info: who controls it + its resource(s). With no sub-region picked we fall back to the country's territories.
  const items = selR ? ts : (d ? d.regions.filter(g=>g.resource).map(g=>({id:g.id, name:g.name, res:g.resource, prod:g.production||0, by:g.occupiedBy||''})) : []);
  const ctrl = occupied ? heldBy : id;
  const sub = occupied
    ? `Held by ${kingdomFlag(heldBy,14,'margin:0 3px 0 0;vertical-align:-2px')}${esc(countryName(heldBy))} &middot; belongs to ${esc(k.name)}`
    : `Controlled by ${esc(k.name)}${mine?' (you)':''}`;
  const pills = (occupied?'<span class="rp-pill bad">Occupied</span>':'') + ((!mine && atWarWithMe)?'<span class="rp-pill bad">At war</span>':'');
  const head = `<div class="rp-head">${kingdomFlag(ctrl,40,'margin:0;flex:none')}<div class="rp-tx"><div class="rp-name">${esc(selR ? selR.n : k.name)}</div><div class="rp-sub">${sub}</div></div>${pills}</div>`;
  const rows = items.map(t=>{
    const g = d && d.regions ? d.regions.find(x=>x.id===t.id) : null;
    const s = g ? regionWarStatus(g, d, id) : null;
    const btn = (s && s.can) ? `<button class="btn btn-sm btn-danger" data-action="map-declare-war" data-region="${esc(t.id)}" data-region-name="${esc(g.name)}" data-owner="${esc(id)}" aria-label="Declare war over ${esc(g.name)}">${icon('sword','class="ic-inline" aria-hidden="true"')} Declare war</button>` : '';
    const note = (s && !s.can && s.code!=='own') ? `<div class="rp-note" style="color:${regionStatusColor(s)}">${esc(s.label)}</div>` : '';
    return `<div class="rp-res"><div class="rc-tile-ic">${resourceIcon(t.res,24)}</div><div class="rp-tx"><b>${esc(RESOURCE_NAMES[t.res]||resName(t.res))}</b><small>${fmtNum(t.prod)} per hour</small>${note}</div>${btn}</div>`;
  }).join('');
  const body = rows || (mr==='loading' || mr===undefined ? '<p class="faint" style="margin:10px 0">Loading&hellip;</p>' : '<p class="faint" style="margin:10px 0">No resource here.</p>');
  return `${head}${body}<div class="rp-foot"><button class="btn btn-sm" data-action="view-country" data-id="${esc(id)}">View country</button></div>`;
}
function renderMapScreen(){
  if(S.worldWars===null) loadWorldWars();
  return `<div id="wm-host"></div>`;
}
function mountMapScreen(){
  const host = document.getElementById('wm-host'); if(!host || typeof WorldMap==='undefined') return;
  WorldMap.attach(host, {myId: S.char && S.char.kingdomId, wars: mapWarsList, selected: S.mapSel, sheetHtml: renderMapPanel, ownRegion: true, terr: terrForMap,
    onSelect: id=>{ S.mapSel = id; }});
}

/* ---------------- Shell / nav ---------------- */
const NAV = [
  {id:'world', label:'War', icon:'swords', group:'WORLD'},
  {id:'map', label:'Map', icon:'map', group:'WORLD'},
  {id:'rankings', label:'Rankings', icon:'chart', group:'WORLD'},
  {id:'adventure', label:'PvE', icon:'sword', group:'PLAY'},
  {id:'pvp', label:'PvP', icon:'target', group:'PLAY'},
  {id:'kingdom', label:'Kingdom', icon:'crown', group:'FACTION'},
  {id:'market', label:'Market', icon:'scroll', group:'ECONOMY'},
  {id:'craft', label:'Craft', icon:'flask', group:'ECONOMY'},
  {id:'inventory', label:'Inventory', icon:'bag', group:'PLAYER'},
  {id:'profile', label:'Profile', icon:'user', group:'PLAYER'},
];

/* XP % for the ring around ANY avatar: own char -> live data, others -> their xp/level if known, else message snapshot (senderXp), else full ring */
function xpPct(o){
  const c=S.char;
  if(o && c && ((o.id && o.id===MY_ID) || (o.senderId && o.senderId===MY_ID))) o=c;
  if(o && o.xp!=null && o.level){ const need=xpNeeded(o.level); return need?clamp(Math.round((Number(o.xp)||0)/need*100),0,100):100; }
  if(o && o.senderXp!=null) return clamp(Number(o.senderXp)||0,0,100);
  return 100;
}
/* XP ring card: hover (desktop) or tap (mobile) the ring around the avatar. Built in <body> because .statusbar clips overflow. */
function totalXp(c){ let t=c.xp||0; for(let l=1;l<c.level;l++) t+=xpNeeded(l); return t; }
function xpCardHtml(c){
  const need=xpNeeded(c.level), xp=Math.round(c.xp||0), pct=need?clamp(Math.round(xp/need*100),0,100):100;
  return `<div class="xp-card-title">Level ${c.level}</div>
    <div class="xp-card-sub">Gain XP by fighting and exploring!</div>
    <div class="bar-track xp-card-bar"><div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#7c3aed,#a78bfa)"></div><span>${fmtNum(xp)}${need?'/'+fmtNum(need):''}</span></div>
    ${need?`<div class="xp-card-left">${fmtNum(Math.max(0,need-xp))} XP to Level ${c.level+1}</div>`:''}
    <div class="xp-card-row"><span>Level ${c.level+1} reward</span><b>&#10022; 1 Skill Point</b></div>
    <div class="xp-card-row"><span>Total XP</span><b>${statIcon('xp',14)} ${fmtNum(totalXp(c))}</b></div>`;
}
function showXpCard(anchor){
  const c=S.char; if(!c) return;
  let d=document.getElementById('xp-card');
  if(!d){ d=document.createElement('div'); d.id='xp-card'; d.className='xp-card'; document.body.appendChild(d); }
  d.innerHTML=xpCardHtml(c);
  const r=anchor.getBoundingClientRect();
  d.style.top=(r.bottom+8)+'px';
  d.style.left=Math.max(8,Math.min(r.left,window.innerWidth-d.offsetWidth-8))+'px';
}
function hideXpCard(){ const d=document.getElementById('xp-card'); if(d) d.remove(); }
/* Daily reward: compact status-bar chip, shown ONLY while today's reward is unclaimed. Claim logic/validation unchanged (claim-daily -> claimDailyReward). */
function dailyChip(c){
  const today = Math.floor(srvNow()/86400000);
  if(((c.daily||{}).day) === today) return '';
  return `<button class="world-alert daily-chip" data-action="claim-daily" title="Daily reward ready: tap to claim" aria-label="Claim daily reward">${icon('star','style="width:13px;height:13px"')} Daily</button>`;
}
function renderStatusBar(){
  const c = S.char, eff = effectiveStats(c);
  const initials = c.username.slice(0,2).toUpperCase();
  const xpNeed = xpNeeded(c.level), xpPct = xpNeed ? clamp(Math.round((c.xp||0)/xpNeed*100),0,100) : 100;
  const hpRegen = Math.max(1, Math.round(eff.maxHp*HP_REGEN_PCT));
  return `
  <div class="statusbar">
    <div class="sb-id">
      <div class="sb-xp" data-action="xp-card" style="--p:${xpPct}"><div class="sb-avatar">${initials}<span class="sb-lvl-badge">${c.level}</span></div></div>
    </div>
    <div class="sb-bars">
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${statIcon('hp',14)} ${Math.round(c.hpCur)}/${eff.maxHp}</span><span class="sb-regen">&#9650;${hpRegen}</span></div>
        <div class="bar-track"><div class="bar-fill bar-hp" style="width:${clamp(c.hpCur/eff.maxHp*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${statIcon('energy',14)} ${Math.floor(c.energyCur)}/${eff.maxEnergy}</span><span class="sb-regen" title="${energyRegenTooltip(c, eff)}">${c.energyCur>=eff.maxEnergy?'Full':'+'+energyRegenPerHour(eff.maxEnergy)+'/hr'}</span></div>
        <div class="bar-track"><div class="bar-fill bar-energy" style="width:${clamp(c.energyCur/eff.maxEnergy*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${statIcon('mana',14)} ${Math.round(c.manaCur)}/${eff.maxMana}</span><span class="sb-regen">&#9650;${MANA_REGEN_AMT}</span></div>
        <div class="bar-track"><div class="bar-fill bar-mana" style="width:${clamp(c.manaCur/eff.maxMana*100,0,100)}%"></div></div>
      </div>
    </div>
    <div class="sb-stat">${resourceIcon('gold',14)} <b>${fmtNum(c.gold)}</b></div>
    <div class="sb-rating">${leagueBadge(c.pvp.rating,18)} ${Math.round(c.pvp.rating)}</div>
    ${dailyChip(c)}
    <button class="world-alert ${S.worldWars?.active?.length?'live':''}" data-action="nav" data-screen="world">${icon('sword','style="width:13px;height:13px"')} ${S.worldWars?.active?.length||0} WARS</button>
  </div>`;
}

function renderNav(activeId){
  let last='';
  return NAV.map(n=>{
    const head = n.group!==last ? `<div class="nav-group-label">${n.group}</div>` : '';
    last=n.group;
    const warCount = n.id==='world' && S.worldWars && S.worldWars.active ? S.worldWars.active.length : 0;
    return head+`<button class="navbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span>${warCount?`<b class="nav-count">${warCount}</b>`:''}</button>`;
  }).join('');
}
function renderTabbar(activeId){
  const ids=['world','kingdom','adventure','pvp','profile'];
  return NAV.filter(n=>ids.includes(n.id)).map(n=>`<button class="tabbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');
}

/* Mobile side drawer (pill): replaces the bottom tabbar on phones. Holds ALL screens, handle stays visible when closed. */
function renderDrawer(activeId){
  const btns = NAV.map(n=>{
    const warCount = n.id==='world' && S.worldWars && S.worldWars.active ? S.worldWars.active.length : 0;
    return `<button class="md-btn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}"><span class="md-ic">${icon(n.icon)}</span><span class="md-lb">${n.label}</span>${warCount?`<b class="nav-count">${warCount}</b>`:''}</button>`;
  }).join('');
  return `<div class="mdrawer ${S.navOpen?'open':''}" id="mdrawer">
    <div class="md-dim" data-action="md-toggle"></div>
    <div class="md-wrap">
      <nav class="md-pill">${btns}</nav>
      <button class="md-handle" data-action="md-toggle" aria-label="Menu"><span>&#8250;</span></button>
    </div>
  </div>`;
}

function fmtRelative(ts){
  const d=Math.max(0,Date.now()-Number(ts||Date.now())), m=Math.floor(d/60000);
  if(m<1) return 'now'; if(m<60) return `${m}m`; const h=Math.floor(m/60); if(h<24) return `${h}h`; return `${Math.floor(h/24)}d`;
}
function renderWorldWarCard(w){
  const a=w.attackerCountryId, d=w.defenderCountryId, score=w.finalScore||warScore(w), sa=score.a??score[a]??0, sd=score.d??score[d]??0;
  const round=currentWarRound(w), rs=w.rounds||[], last=rs[rs.length-1];
  const dm=((round&&round.damage)||(last&&last.damage)||{}), da=Number(dm[a]||0), dd=Number(dm[d]||0), tot=da+dd;
  const my=S.char&&S.char.kingdomId, rel=(a===my||d===my)?'you':'';
  const pa=tot?Math.round(da/tot*100):50;
  return `<button class="rc-battle ${rel}" data-action="world-war" data-id="${esc(w.id)}">
    <div class="rc-b-top"><span>${w.status==='preparing'?'PREPARING':'ACTIVE'}</span><span>${round?`ROUND ${round.round}/${w.maxRounds||3}`:'WAR'}</span></div>
    <div class="rc-b-mid"><div class="rc-b-side">${kingdomFlag(a,34,'margin:0')}<small>${esc(countryName(a))}</small></div><b>${sa}</b><em>${icon('sword','style="width:16px;height:16px"')}</em><b>${sd}</b><div class="rc-b-side">${kingdomFlag(d,34,'margin:0')}<small>${esc(countryName(d))}</small></div></div>
    <div class="rc-b-time">${w.targetRegionName?`<b>${esc(w.targetRegionName)}</b> &middot; `:''}${round?.endsAt?countdown(round.endsAt):'Awaiting round'}</div>
    <div class="rc-dmgbar"><span class="l">${fmtDmg(da)}</span><div><i style="width:${pa}%"></i></div><span class="r">${fmtDmg(dd)}</span></div>
  </button>`;
}
function warScore(w){
  const out={a:0,d:0}; (w.rounds||[]).forEach(r=>{if(r.winner===w.attackerCountryId)out.a++; else if(r.winner===w.defenderCountryId)out.d++;}); return out;
}
function currentWarRound(w){
  const now=Date.now()+(S.serverOffset||0); return (w.rounds||[]).find(r=>r.status==='active'||(r.startsAt<=now&&r.endsAt>now)) || (w.rounds||[]).find(r=>r.status==='preparing');
}

function viewBack(label){ return `<button class="btn btn-sm" data-action="view-back" style="margin:0 0 12px">&larr; ${label||'Back'}</button>`; }
function viewOnlyChip(){ return `<span class="rc-chip" title="You can look, but not change anything here">View only</span>`; }
function renderCountryView(){
  const id=S.viewCountryId, v=S.viewCountry, kdef=KINGDOMS.find(k=>k.id===id);
  const back=viewBack('Back');
  if(!kdef) return back+`<div class="rc-empty"><h3>Country not found</h3></div>`;
  if(!v||v.id!==id||v.loading) return back+`<div class="empty"><h3>Loading ${esc(kdef.name)}…</h3></div>`;
  if(v.unavailable||v.error) return back+`<div class="rc-empty"><h3>Couldn't load this country</h3><button class="btn btn-primary" data-action="view-country" data-id="${esc(id)}">Retry</button></div>`;
  const members=v.members, treasury=v.kingdom.treasury||{}, tab=['home','government','citizens'].includes(S.viewCountryTab)?S.viewCountryTab:'home';
  const wk=weekKeyNow(), wdmg=members.reduce((n,m)=>n+((m.weeklyDmg&&m.weeklyDmg.week===wk)?(m.weeklyDmg.dmg||0):0),0);
  const t=Date.now(), online=members.filter(m=>(t-Number(m.updatedAt||0))<5*60*1000).length;
  const wars=(S.worldWars&&S.worldWars.active||[]).filter(w=>w.attackerCountryId===id||w.defenderCountryId===id);
  const byRole=r=>members.filter(m=>m.kingdomRole===r);
  const av=(m,cls)=>`<div class="rc-gav ${cls||''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i></div>`;
  const person=(m,cls)=>`<div class="rc-role-p" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,cls)}<b>${esc(m.username)}</b></div>`;
  const roleCard=(label,cls,list)=>`<div class="rc-role ${cls}"><h4>${label}</h4>${list.length?list.map(m=>person(m)).join(''):'<p>No one nominated yet.</p>'}</div>`;
  const ec=v.econ||null;
  const specHtml=(ec&&ec.specialities&&ec.specialities.length)?`<div class="rc-sec">SPECIALITIES</div><div class="kingdom-resource-row">${ec.specialities.map(r=>`<span>${resourceIcon(r,16)} ${resName(r)}</span>`).join('')}</div>`:'';
  const tabs=[['home','Home','castle'],['government','Government','scroll'],['citizens','Citizens','users']];
  const tabRow=`<div class="country-module-nav rc-ptabs">${tabs.map(x=>`<button class="country-module ${tab===x[0]?'active':''}" data-action="view-ctab" data-tab="${x[0]}">${icon(x[2])}<span>${x[1]}</span></button>`).join('')}</div>`;
  const hero=`<div class="rc-chero"><div class="rc-banner country"></div><div class="rc-chead"><div class="rc-flag">${kingdomFlag(id,92,'margin:0')}</div><div><small>${icon('flag','class="ic-inline" aria-hidden="true"')} Country ${viewOnlyChip()}</small><h2>${esc(kdef.name)}</h2><div class="rc-cstats"><span><small>Citizens</small><b>${members.length}</b></span><span><small>Online</small><b>${online}</b></span><span><small>Donation fund</small><b>${resourceIcon('gold',16)} ${fmtNum(treasury.gold||0)}</b></span><span><small>Tax</small><b>${kdef.tax}%</b></span></div></div></div></div>`;
  let body='';
  if(tab==='home'){
    body=`<div class="rc-sec">COUNTRY STATS</div><div class="rc-tiles">${statTile('Citizens',members.length,'green')}${statTile('Weekly damages',fmtDmg(wdmg))}${statTile('Donation fund',`${resourceIcon('gold',16)} ${fmtNum(treasury.gold||0)}`,'gold')}${statTile('National tax',kdef.tax+'%')}</div>
      <div class="rc-sec">WARS</div>${wars.length?`<div class="rc-battles">${wars.map(renderWorldWarCard).join('')}</div>`:emptyState('castle','At peace','No ongoing wars for this country.',{action:'nav',screen:'map',label:'Open the map'})}
      ${specHtml}
      <div class="rc-sec">GOVERNMENT</div><div class="rc-gov-strip">${['Leader','Co-Leader','Officer'].map(r=>byRole(r).slice(0,4).map(m=>`<div data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,r==='Leader'?'gold':r==='Co-Leader'?'blue':'red')}</div>`).join('')).join('')||'<p class="faint">No government yet.</p>'}</div>`;
  } else if(tab==='government'){
    body=govLayout(byRole('Leader'),byRole('Co-Leader'),byRole('Officer'),person);
  } else {
    body=`<div class="rc-sec">CITIZENS — ${members.length}</div>`+members.map(m=>{ const on=(t-Number(m.updatedAt||0))<5*60*1000; return `<div class="rc-mrow rc-card" data-action="view-player" data-id="${esc(m.id)}"><div class="rc-gav ${on?'on':''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i><u class="dot ${on?'on':''}"></u></div><div class="nm"><b>${esc(m.username)}</b><small>${esc(m.kingdomRole||'Recruit')} · ${CLASSES[m.class]?CLASSES[m.class].name:'—'}</small></div>${CHAT_ROLE_ICON[m.kingdomRole]?`<span class="rl">${icon(CHAT_ROLE_ICON[m.kingdomRole])}</span>`:''}</div>`; }).join('');
  }
  return back+hero+tabRow+body;
}
function renderPlayerView(){
  const id=S.viewPlayerId, v=S.viewPlayer, back=viewBack('Back');
  if(!v||v.id!==id||v.loading) return back+`<div class="empty"><h3>Loading profile…</h3></div>`;
  if(v.missing) return back+`<div class="rc-empty"><h3>Player not found</h3></div>`;
  if(v.unavailable||v.error) return back+`<div class="rc-empty"><h3>Couldn't load this profile</h3><button class="btn btn-primary" data-action="view-player" data-id="${esc(id)}">Retry</button></div>`;
  const p=v.data, wk=weekKeyNow(), wd=(p.weeklyDmg&&p.weeklyDmg.week===wk)?(p.weeklyDmg.dmg||0):0, pv=p.pvp||{rating:1000,wins:0,losses:0};
  const fmtDate=ts=>new Date(Number(ts)||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const ago=p.updatedAt?(Date.now()-p.updatedAt<5*60*1000?'now':fmtRelative(p.updatedAt)+' ago'):'—';
  const kdef=KINGDOMS.find(k=>k.id===p.kingdomId);
  const hero=`<div class="rc-chero rc-phero"><div class="rc-banner"></div><div class="rc-chead"><div class="rc-pav" style="--p:${xpPct(p)}"><div class="rc-avatar">${esc((p.username||'?').slice(0,2).toUpperCase())}</div><span class="lv">${p.level||1}</span></div><div><h2>${kdef?kingdomFlag(p.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px'):''}${esc(p.username)} ${viewOnlyChip()}</h2><div class="rc-cstats pl"><span><small>Citizen since</small><b>${fmtDate(p.createdAt)}</b></span><span><small>Last connection</small><b>${ago}</b></span></div></div></div></div>`;
  const country=kdef?`<div class="rc-sec">COUNTRY</div><div class="rc-opp" data-action="view-country" data-id="${esc(p.kingdomId)}" style="cursor:pointer"><div class="rc-cflag">${kingdomFlag(p.kingdomId,30,'margin:0')}</div><div class="nm"><b>${esc(kdef.name)}</b><small>${esc(p.kingdomRole||'Recruit')}</small></div><span class="faint">View &rsaquo;</span></div>`:'';
  return back+hero+`
    <div class="rc-sec">EQUIPMENT</div>
    <div class="rc-eqrow">${equipRowHtml(p.equipment,false)}</div>
    <div class="rc-sec">PLAYER STATS</div>
    <div class="rc-tiles">${statTile('Level',p.level||1)}${statTile('Class',CLASSES[p.class]?CLASSES[p.class].name:'—')}${statTile('PvP rating',Math.round(pv.rating||1000),'gold')}${statTile('League',leagueBadge(pv.rating||1000,22)+' '+leagueOf(pv.rating||1000).name)}${statTile('Wins / Losses',(pv.wins||0)+' / '+(pv.losses||0),'green')}${statTile('Weekly damages',fmtDmg(wd))}${statTile('Total damages',fmtDmg(p.totalDmg||0))}</div>
    ${country}`;
}
/* Open wars: any player picks a side (Attack = attacking country, Defend = defending country), whatever his nationality.
   The server validates everything (side lock, cooldown, strike cap, energy); nothing is decided client-side. */
function warStrikeBlock(w){
  const a=w.attackerCountryId, d=w.defenderCountryId, my=S.char&&S.char.kingdomId;
  const finished=w.status==='finished'||w.endedAt;
  if(finished) return `<p class="wa-note">This war is over.</p>`;
  const prep=w.status==='preparing', me=w.me||null, now=srvNow();
  const coolLeft=me?Math.max(0,me.lastStrikeAt+me.cooldownMs-now):0;
  const full=!!me&&me.strikes>=me.maxStrikes;
  const btn=(sd,cid,label,ic)=>{
    const locked=!!me&&!!me.side&&me.side!==sd, busy=prep||coolLeft>0||full;
    const why=locked?'You already fight for the other side in this war':prep?'Fighting opens when the war starts':full?'Strike limit reached for this round':coolLeft>0?'Ready in '+Math.ceil(coolLeft/1000)+'s':'';
    return `<button class="wa-btn ${sd==='attack'?'wa-att':'wa-def'}${me&&me.side===sd?' on':''}" data-action="war-strike" data-war="${esc(w.id)}" data-side="${sd}" ${locked||busy?'disabled':''} title="${esc(why)}">${icon(ic,'class="ic-inline" aria-hidden="true"')} ${label}<small>${sd==='attack'?'for ':''}${esc(countryName(cid))}${me&&me.energyCost!=null?' &middot; '+me.energyCost+' energy':''}</small></button>`;
  };
  const sideName=me&&me.side?countryName(me.side==='attack'?a:d):null;
  const line=prep?`Fighting opens in ${countdown(w.startsAt)}`:sideName?`You fight for ${esc(sideName)} (${me.side==='attack'?'attacker':'defender'}).`:`You're a citizen of ${esc(countryName(my))}. Pick a side to fight.`;
  const stats=me&&!prep?`<div class="wa-stats"><span>Your damage <b>${fmtNum(me.damage)}</b></span><span>Strikes <b>${me.strikes}/${me.maxStrikes}</b></span><span>Cooldown <b class="${coolLeft?'':'rdy'}">${coolLeft?Math.ceil(coolLeft/1000)+'s':'ready'}</b></span></div>`:'';
  return `<div class="wa-btns">${btn('attack',a,'Attack','sword')}${btn('defend',d,'Defend','shield')}</div><p class="wa-note">${line}</p>${stats}`;
}
function renderWarDetail(){
  const all=[...(S.worldWars?.active||[]),...(S.worldWars?.recent||[])];
  const w=all.find(x=>x.id===S.worldWarsSelected);
  const back=`<button class="btn btn-sm" data-action="nav" data-screen="world" style="margin:0 0 12px">&larr; War</button>`;
  if(S.worldWars===null){ loadWorldWars(); return back+`<div class="empty"><h3>Loading war…</h3></div>`; }
  if(!w) return back+`<div class="rc-empty"><h3>War not found</h3><p>It may have just ended. Check the History tab.</p></div>`;
  const a=w.attackerCountryId, d=w.defenderCountryId, sc=w.finalScore||warScore(w), sa=sc.a??sc[a]??0, sd=sc.d??sc[d]??0;
  const rs=w.rounds||[], round=currentWarRound(w);
  const finished=w.status==='finished'||w.endedAt;
  if(S.warFighters===undefined || !S.warFighters[w.id]) loadWarFighters(w.id);
  const wf=(S.warFighters&&S.warFighters[w.id])||{list:[],loading:true};
  const row=(f,i,cls)=>{ const lv=f.level||1, nm=f.nat?countryName(f.nat):''; return `<div class="wa-fr ${cls}" data-action="view-player" data-id="${esc(f.uid)}"><i>${i+1}</i><span class="wa-av">${esc((f.username||'?').slice(0,2).toUpperCase())}<b>${lv}</b></span><div class="wa-nm"><b>${esc(f.username)}</b><small>${f.nat?kingdomFlag(f.nat,14,'margin:0'):''}${nm?esc(nm)+' · ':''}Lv ${lv}</small></div><em>${fmtDmg(f.dmg)}</em></div>`; };
  const col=(cid,cls)=>wf.list.filter(f=>f.countryId===cid).slice(0,6).map((f,i)=>row(f,i,cls)).join('')||'<div class="wa-empty">'+(wf.loading?'Loading…':'No fighters yet')+'</div>';
  const sel=S.warRoundSel&&S.warRoundSel.id===w.id?S.warRoundSel.n:null;
  const shown=rs.find(r=>r.round===sel)||round||rs[rs.length-1]||null;
  const tabs=rs.map(r=>`<button class="wa-tab${shown&&shown.round===r.round?' on':''}${r.winner===a?' wa-wa':r.winner===d?' wa-wd':''}" data-action="war-round" data-id="${esc(w.id)}" data-n="${r.round}">Round ${r.round}</button>`).join('');
  const dm=(shown&&shown.damage)||{}, da=Number(dm[a]||0), dd=Number(dm[d]||0), t=da+dd, pa=t?Math.round(da/t*1000)/10:50, pd=Math.round((100-pa)*10)/10;
    return back+`
  <div class="wa"><i class="wa-rv r1"></i><i class="wa-rv r2"></i><i class="wa-rv r3"></i><i class="wa-rv r4"></i>
    <div class="wa-head"><small>Region war</small><b>${esc(w.targetRegionName||'War')}</b><div class="wa-tabs">${tabs}</div></div>
    <div class="wa-vs">
      <div class="wa-side" data-action="view-country" data-id="${esc(a)}">${kingdomFlag(a,56,'margin:0 auto 5px;display:block')}<b>${esc(countryName(a))}</b><small class="a">Attacker</small></div>
      <div class="wa-mid"><strong>${sa} : ${sd}</strong><div class="wa-tm"><small>${finished?'Finished':w.status==='preparing'?'Starts in':'<i></i>Live · round ends in'}</small>${finished?'':`<b>${w.status==='preparing'?countdown(w.startsAt):(round?.endsAt?countdown(round.endsAt):'')}</b>`}</div></div>
      <div class="wa-side" data-action="view-country" data-id="${esc(d)}">${kingdomFlag(d,56,'margin:0 auto 5px;display:block')}<b>${esc(countryName(d))}</b><small class="d">Defender</small></div>
    </div>
    <div class="wa-bar"><i class="wa-a" style="width:${pa}%"></i><i class="wa-d" style="width:${pd}%"></i><s class="wa-pin" style="left:${pa}%"></s></div>
    <div class="wa-pct"><span>${fmtDmg(da)} &middot; ${pa}%</span><span>${pd}% &middot; ${fmtDmg(dd)}</span></div>
    ${warStrikeBlock(w)}
    ${finished&&w.targetRegionName&&w.territory?`<p class="wa-note">${warTerritoryText(w.territory,w.targetRegionName)}</p>`:''}
    <div class="wa-cols"><div class="wa-fh">Top attackers</div>${col(a,'a')}<div class="wa-fh d">Top defenders</div>${col(d,'d')}</div>
  </div>`;
}
function renderWorld(){
  if(S.worldWars===null){
    loadWorldWars();
    return `${pageHero('Loading the realm…','Connecting to the living world')}<div class="world-loading"><div class="loader-ring"></div></div>`;
  }
  const active=S.worldWars.active||[], recent=S.worldWars.recent||[];
  const my=S.char&&S.char.kingdomId, bt=S.battleTab==='history'?'history':'active', bf=S.battleFilter||'all';
  const involves=w=>w.attackerCountryId===my||w.defenderCountryId===my;
  const list=active.filter(w=>bf==='mine'?involves(w):bf==='enemies'?(involves(w)&&true):true);
  const mine=list.filter(involves), others=list.filter(w=>!involves(w));
  const section=(t,ws)=>ws.length?`<div class="rc-sec">${t}</div><div class="rc-battles">${ws.map(renderWorldWarCard).join('')}</div>`:'';
  const chips=[['all','All'],['mine','Your country']].map(f=>`<button class="rc-fchip ${bf===f[0]?'on':''}" data-action="battle-filter" data-f="${f[0]}">${f[1]}</button>`).join('');
  const tabRow=`<div class="country-module-nav rc-ptabs"><button class="country-module ${bt==='active'?'active':''}" data-action="battle-tab" data-tab="active">${icon('sword')}<span>Active</span>${active.length?`<i class="rc-dot">${active.length}</i>`:''}</button><button class="country-module ${bt==='history'?'active':''}" data-action="battle-tab" data-tab="history">${icon('scroll')}<span>History</span></button></div>`;
  const hist=`<div class="panel world-history">${recent.slice(0,15).map(w=>`<div class="history-war"><span class="history-result ${w.winnerCountryId===w.attackerCountryId?'a':'d'}">${w.winnerCountryId===w.attackerCountryId?'VICTORY':'RESULT'}</span><b>${kingdomFlag(w.attackerCountryId)}${esc(countryName(w.attackerCountryId))}</b><span>vs</span><b>${kingdomFlag(w.defenderCountryId)}${esc(countryName(w.defenderCountryId))}</b><strong>${w.finalScore?.a ?? warScore(w).a} — ${w.finalScore?.d ?? warScore(w).d}</strong>${w.targetRegionName?`<small>over ${esc(w.targetRegionName)}</small>`:''}<time>${fmtRelative(w.endedAt)}</time></div>`).join('')||'<div class="empty-mini">No finished wars yet.</div>'}</div>`;
  const activeView=`<div class="rc-sec">ONGOING BATTLES</div>${active.length?'':emptyState('swords','No battles right now','Wars declared by countries will show up here.',{action:'nav',screen:'map',label:'Open the map'})}<div class="rc-filters">${chips}</div>${section('YOUR COUNTRY',mine)}${section('OTHER WARS',others)}`;
  const myK=S.char&&S.char.kingdomId, warring=k=>active.some(w=>w.attackerCountryId===k.id||w.defenderCountryId===k.id);
  const ordered=KINGDOMS.slice().sort((x,y)=>((y.id===myK)-(x.id===myK))||(warring(y)-warring(x))||x.name.localeCompare(y.name));
  const countries=`<div class="rc-sec">COUNTRIES — ${KINGDOMS.length}</div><input type="text" id="country-search" class="rc-search" placeholder="Search a country…" autocomplete="off"><div class="rc-countries" id="rc-countries">${ordered.map(k=>{const atWar=warring(k);return `<button class="rc-country ${atWar?'at-war':''} ${k.id===myK?'mine':''}" data-name="${esc(k.name.toLowerCase())}" data-action="view-country" data-id="${k.id}"><span class="fl">${kingdomFlag(k.id)}</span><span><b>${esc(k.name)}${k.id===myK?' <em>(you)</em>':''}</b><small>${atWar?'AT WAR':'Peace'} · tax ${k.tax}%</small></span></button>`}).join('')}</div><p class="faint" id="country-none" style="display:none">No country found.</p>`;
  const shortcuts=`<div class="rc-shortcuts">${myK?`<button class="btn btn-sm" data-action="view-country" data-id="${myK}">${icon('castle')} My country</button>`:''}</div>`;
  return `<div class="rc-chero"><div class="rc-banner war"></div><div class="rc-chead"><div><h2>War</h2></div></div></div>${shortcuts}${tabRow}${bt==='history'?hist:activeView}${countries}`;
}

/* ---------------- Adventure ---------------- */
const ZONE_BANNERS = {
  plains: 'linear-gradient(160deg, #4a7c3f, #2e5230)',
  forest: 'linear-gradient(160deg, #1f4d2e, #16321f)',
  mountain: 'linear-gradient(160deg, #5b6b78, #33404a)',
  cave: 'linear-gradient(160deg, #4a2e6b, #241536)',
  swamp: 'linear-gradient(160deg, #3d4a2e, #232b1a)',
  darkzone: 'linear-gradient(160deg, #5a1f24, #250d0f)',
  frozen: 'linear-gradient(160deg, #3e6b8a, #1d3446)',
  abyss: 'linear-gradient(160deg, #2a1240, #0d0616)',
};
/* Compact empty state: icon + short text + at most one REAL action (data-action must already exist). */
function emptyState(ic, title, text, act){
  const btn = act ? `<button class="btn btn-sm btn-primary" data-action="${act.action}"${act.screen?` data-screen="${act.screen}"`:''}${act.tab?` data-tab="${act.tab}"`:''}>${esc(act.label)}</button>` : '';
  return `<div class="rc-empty">${ic?`<div class="rc-empty-ic">${icon(ic)}</div>`:''}<h4>${esc(title)}</h4>${text?`<p>${esc(text)}</p>`:''}${btn}</div>`;
}
function pageHero(title, sub, cls){
  return `<div class="rc-chero"><div class="rc-banner ${cls||''}"></div><div class="rc-chead"><div><h2>${title}</h2>${sub?`<small>${sub}</small>`:''}</div></div></div>`;
}
function leagueBadge(rating,size){ const L=leagueOf(rating); size=size||18; return `<img src="${iconUrl('league_'+L.id+'.webp')}" alt="${L.name}" title="${L.name}" class="lg-badge-img" style="width:${size}px;height:${size}px;flex:none;vertical-align:middle;object-fit:contain">`; }
function leaguePanel(rating){
  const p=leagueProgress(rating);
  return `<div class="lg-panel">${leagueBadge(rating,38)}<div class="lg-main"><b style="color:${p.league.color}">${p.league.name} League</b>
    <small>${p.next?`${p.toNext} rating to ${p.next.name}`:'Top league — you are at the summit'}</small>
    <div class="bar-track" style="margin-top:5px;"><div class="bar-fill" style="width:${p.pct}%;background:${p.league.color}"></div></div></div></div>`;
}
const TILE_ICONS = {
  'Rating':'star','PvP rating':'star','Wins':'trophy','Losses':'x','Win rate':'percent','Wins / Losses':'trophy',
  'Level':'crown','Class':'swords','Zones open':'map','Backpack':'bag','Items':'bag','Gear':'shield','Skill points':'star',
  'Attack':'sword','Defense':'shield','Speed':'bolt','Crit %':'target','Evasion %':'drop',
  'Citizens':'users','Active population':'users','Weekly damages':'sword','Total damages':'swords','National tax':'coins','Total power':'bolt','Role':'crown',
  'Donation fund':'coins','Gold':'coins','Your player rank':'user','Your country rank':'flag','Weekly damages reset in':'bolt'
};
function govLayout(L, C, O, person){
  const open = t => `<b class="gv-open">${t}</b>`;
  const box = (label,cls,ic,list,empty)=>`<div class="rc-tile ${cls} gv-card"><div class="gv-head"><div class="rc-tile-ic">${icon(ic)}</div><div class="gv-tx"><small>${label}</small>${list.length?'':open(empty)}</div>${list.length?`<span class="gv-count">${list.length}</span>`:''}</div>${list.map(m=>person(m)).join('')}</div>`;
  const hero = L.length
    ? L.map(m=>`<div class="gv-lead">${person(m,'gold')}</div>`).join('')
    : `<div class="gv-lead"><div class="gv-tx">${open('No leader yet')}<small>Leader seat is open</small></div></div>`;
  return `<div class="rc-tile gold gv-hero">${hero}<div class="rc-tile-ic">${icon('crown')}</div></div>
    <div class="gv-row">${box('Co-leader','blue','shield',C,'Open seat')}${box('Officers','red','star',O,'Open seats')}</div>`;
}
function statTile(l,v,cls,ic){
  v = String(v==null ? '' : v);
  let glyph = '';
  if(ic){ glyph = ic.charAt(0)==='<' ? ic : icon(ic); }
  else {
    const m = v.match(/^\s*(<img[^>]*>)\s*/);
    if(m){ glyph = m[1].replace(/width:\d+px;height:\d+px;/,'width:22px;height:22px;'); v = v.slice(m[0].length); }
    else if(TILE_ICONS[l]) glyph = icon(TILE_ICONS[l]);
  }
  if(!glyph) return `<div class="rc-tile ${cls||''}"><small>${l}</small><b>${v}</b></div>`;
  return `<div class="rc-tile has-ic ${cls||''}"><div class="rc-tile-ic">${glyph}</div><div class="rc-tile-tx"><small>${l}</small><b>${v}</b></div></div>`;
}
function renderAdventure(){
  const c = S.char;
  const tiles = ZONES.map(z=>{
    const locked = c.level < z.min - 5;
    const banner = z.icon ? `url('${iconUrl(z.icon)}') center/cover` : (ZONE_BANNERS[z.id]||'var(--panel-2)');
    return `<div class="zone-tile ${locked?'locked':''}">
      <div class="zone-banner" style="background:${banner};"></div>
      <div class="zone-tile-body">
        <h4>${z.name}</h4>
        <div class="zone-tile-meta">
          <span class="tag">Lv.${z.min}&ndash;${z.uncapped?z.min+'+':z.max}</span>
          <span class="tag">${icon('sword','style="width:10px;height:10px;vertical-align:-1px"')} ${z.monsters.length}</span>
        </div>
        ${locked
          ? `<button class="btn btn-sm btn-block" disabled>${icon('lock','style="width:12px;height:12px"')} Requires Lv.${z.min-5}</button>`
          : `<button class="btn btn-primary btn-sm btn-block" data-action="view-zone" data-zone="${z.id}">View</button>`}
      </div>
    </div>`;
  }).join('');
  return `
  ${pageHero('PvE','Realm Explorer — select a zone to hunt monsters and gather resources','pve')}
  <div class="rc-tiles" style="margin-top:12px">${statTile('Level',c.level)}${statTile('Energy',`${statIcon('energy',16)} ${Math.floor(c.energyCur)}/${effectiveStats(c).maxEnergy}`,'blue')}${statTile('Zones open',ZONES.filter(z=>c.level>=z.min-5).length+'/'+ZONES.length,'gold')}</div>
  <div class="rc-sec">ZONES</div>
  <div class="zone-grid">${tiles}</div>`;
}

function renderZoneDetail(){
  const c = S.char;
  const now = Date.now();
  const z = ZONES.find(x=>x.id===S.zoneDetailId);
  if(!z) return renderAdventure();
  const eff = effectiveStats(c);
  const energy = Math.floor(c.energyCur), maxEn = eff.maxEnergy;
  const locked = c.level < z.min - 5;
  const eliteLocked = locked || c.level < z.min;
  const bossCd = (c.bossCooldowns[z.id]||0) - now;
  const bossLocked = eliteLocked || bossCd > 0;
  const banner = z.icon ? `url('${iconUrl(z.icon)}') center/cover` : (ZONE_BANNERS[z.id]||'var(--panel-2)');
  const topLevel = z.uncapped ? z.min+80 : z.max;
  const bossLvl = clamp(c.level, z.min, topLevel);
  const bossHp = Math.round((38 + bossLvl*11) * BOSS_MULT.hp);
  const bossXp = Math.round(11 * bossLvl * 3.2), bossGold = Math.round(9 * bossLvl * 3.2);
  // action definitions (cost = Energy, stars = difficulty out of 4)
  const defs = [
    {id:'step',  cls:'green', ic:'arrow',  title:'Take a Step', desc:'Wander the road: cheap, mostly small finds', cost:STEP_ENERGY_COST, stars:1, action:'zone-road',        lockMsg: locked ? 'Requires Lv.'+(z.min-5) : ''},
    {id:'explore',cls:'blue', ic:'target', title:'Explore',     desc:'Find monsters and resources',                cost:10,               stars:2, action:'enter-zone',       lockMsg: locked ? 'Requires Lv.'+(z.min-5) : ''},
    {id:'elite', cls:'red',   ic:'sword',  title:'Elite Hunt',  desc:'Tougher monster, bigger rewards',            cost:20,               stars:3, action:'enter-zone-elite', lockMsg: eliteLocked ? 'Requires Lv.'+z.min : ''},
    {id:'boss',  cls:'gold',  ic:'crown',  title:'Zone Boss',   desc:'Unique boss, huge XP, gold and resources',   cost:BOSS_ENERGY_COST, stars:4, action:'enter-zone-boss',  lockMsg: eliteLocked ? 'Requires Lv.'+z.min : (bossCd>0 ? 'Ready in '+fmtMs(bossCd) : '')},
  ];
  // recommended action: depends on where the player stands inside the zone's level range, only among actions that are open AND affordable
  const span = Math.max(1, topLevel - z.min), pos = (c.level - z.min) / span;
  const wanted = pos < 0.35 ? ['explore','step'] : pos < 0.75 ? ['elite','explore','step'] : ['boss','elite','explore','step'];
  const avail = id => { const d = defs.find(x=>x.id===id); return d && !d.lockMsg && energy >= d.cost; };
  const recId = wanted.find(avail) || null;
  const stars = n => `<span class="stars">${'&#9733;'.repeat(n)}<span class="off">${'&#9733;'.repeat(4-n)}</span></span>`;
  const act = d => {
    const short = !d.lockMsg && energy < d.cost;
    const note = d.lockMsg ? `<span class="note">${icon('lock','style="width:11px;height:11px;vertical-align:-1px"')} ${d.lockMsg}</span>` : (short ? `<span class="note">Need ${d.cost-energy} more Energy</span>` : '');
    return `<button class="rc-act ${d.cls} ${short?'short':''} ${d.id===recId?'rec':''}" data-action="${d.action}" data-zone="${z.id}" ${d.lockMsg?'disabled':''}>
      ${d.id===recId?'<span class="rec-tag">Recommended</span>':''}
      <span class="ai">${icon(d.ic)}</span><b>${d.title}</b><small>${d.desc}</small>
      <span class="act-foot"><em>${statIcon('energy',12)} ${d.cost}</em>${stars(d.stars)}</span>${note}
    </button>`;
  };
  const enPct = Math.max(0, Math.min(100, Math.round(c.energyCur / Math.max(1,maxEn) * 100)));
  return `
  <button class="btn btn-sm" data-action="nav" data-screen="adventure" style="margin-bottom:12px;">&larr; PvE</button>
  <div class="rc-zhero" style="background:linear-gradient(180deg,rgba(22,26,29,.1),rgba(22,26,29,.92)),${banner}"><div class="rc-zov"><div class="rc-zrow"><div><h2>${z.name}</h2><div class="rc-chips"><span class="rc-chip">Lv ${z.min}&ndash;${z.uncapped?z.min+'+':z.max}</span><span class="rc-chip">${icon('sword','style="width:11px;height:11px;vertical-align:-1px"')} ${z.monsters.length} monsters</span></div></div>
    <div class="rc-zen"><small>${statIcon('energy',13)} Energy</small><b>${energy}<span>/${maxEn}</span></b><div class="en-track"><i style="width:${enPct}%"></i></div></div></div></div></div>
  <div class="rc-sec">RESOURCES</div><div class="rc-res">${z.resources.map(r=>`<div class="country-resource"><div class="country-resource-icon">${resourceIcon(r,22)}</div><span>${RESOURCE_NAMES[r]}</span></div>`).join('')}</div>
  <div class="rc-sec">ZONE BOSS</div>
  <div class="rc-zboss ${bossCd>0?'cd':''}">
    <div class="zb-ico">${icon('crown')}</div>
    <div class="zb-body"><small>Boss &middot; Lv ${bossLvl}</small><b>${z.boss}</b>
      <div class="zb-chips"><span class="rc-chip">${statIcon('hp',12)} ~${fmtNum(bossHp)} HP</span><span class="rc-chip">${statIcon('xp',12)} ~+${fmtNum(bossXp)} XP</span><span class="rc-chip">${resourceIcon('gold',12)} ~+${fmtNum(bossGold)}</span></div></div>
    <span class="zb-state">${bossCd>0?'Ready in '+fmtMs(bossCd):'Ready'}</span>
  </div>
  <div class="rc-sec">ACTIONS</div>
  <div class="rc-acts">${defs.map(act).join('')}</div>`;
}

function renderRoad(){
  const c = S.char;
  const road = S.road;
  const zone = ZONES.find(z=>z.id===road.zoneId);
  const g = road.gained;
  const eff = effectiveStats(c);
  const energy = Math.floor(c.energyCur), maxEn = eff.maxEnergy;
  const enPct = Math.max(0, Math.min(100, Math.round(c.energyCur / Math.max(1,maxEn) * 100)));
  const noEnergy = c.energyCur < STEP_ENERGY_COST;
  const TRAIL_COL = {flavor:'#64748b', gold:'#facc15', resource:'#4ade80', xp:'#a78bfa', item:'#60a5fa', monster:'#f87171'};
  const trail = (road.trail||[]).slice(-9);
  const dots = trail.map(k=>`<i class="rd-dot" style="background:${TRAIL_COL[k]||'#64748b'}"></i><i class="rd-seg"></i>`).join('');
  const resChips = Object.entries(g.resources).map(([k,v])=>`<span class="rc-chip" style="display:inline-flex;align-items:center;gap:4px;">${resourceIcon(k,14)} +${v} ${RESOURCE_NAMES[k]}</span>`).join('');
  const evIcon = l => l.k==='gold' ? resourceIcon('gold',18) : l.k==='resource' ? resourceIcon(l.rk,18) : l.k==='xp' ? statIcon('xp',18)
    : l.k==='monster' ? icon('swords','style="width:18px;height:18px;color:#f87171"') : l.k==='item' ? icon('bag','style="width:18px;height:18px;color:#60a5fa"') : '<i class="rd-pt"></i>';
  const events = road.log.slice(-8).reverse().map((l,i)=>`<div class="rd-ev ${l.cls||''}" style="opacity:${[1,1,.85,.7,.6,.5,.45,.4][i]}"><span class="rd-ei">${evIcon(l)}</span><span class="rd-et">${l.text}</span>${l.amt?`<b class="rd-ea">${l.amt}</b>`:''}</div>`).join('');
  return `
  ${pageHero('The Road &mdash; '+zone.name,'Each step costs '+STEP_ENERGY_COST+' Energy. Most steps are quiet, some pay off, and sometimes something finds you.','pve')}
  <div class="rd-en"><span>${statIcon('energy',13)} Energy</span><b>${energy}<small>/${maxEn}</small></b><div class="en-track"><i style="width:${enPct}%"></i></div></div>
  <div class="rc-sec">THIS WALK</div>
  <div class="rd-tiles">
    <div class="rd-tile"><small>${statIcon('xp',14)} XP</small><b>+${fmtNum(g.xp)}</b></div>
    <div class="rd-tile"><small>${resourceIcon('gold',14)} Gold</small><b>+${fmtNum(g.gold)}</b></div>
    <div class="rd-tile"><small>${icon('arrow','style="width:14px;height:14px"')} Steps</small><b>${road.steps||0}</b></div>
  </div>
  ${resChips?`<div class="rd-res">${resChips}</div>`:''}
  <div class="rd-trail">${dots}<i class="rd-now"></i></div>
  <div class="rc-sec">EVENTS</div>
  <div class="rd-feed">${events}</div>
  <div class="rd-btns">
    <button class="btn btn-primary" data-action="take-step" ${noEnergy?'disabled':''}>${noEnergy?'Out of Energy':`Take a Step <span class="rd-cost">${statIcon('energy',12)} ${STEP_ENERGY_COST}</span>`}</button>
    <button class="btn" data-action="road-leave" style="white-space:nowrap;">Leave</button>
  </div>
  ${noEnergy?`<p class="faint" style="text-align:center;margin-top:8px;">Out of Energy &mdash; it regenerates about +${Math.round(energyRegenPerHour(maxEn))} per hour.</p>`:''}`;
}

/* ---------------- Craft ---------------- */
/* ---------------- Forge screen (second tab of the Craft page) ---------------- */
function craftTabs(){
  const t = S.craftTab==='forge' ? 'forge' : 'craft';
  return `<div class="forge-tabs"><button class="btn btn-sm ${t==='craft'?'btn-accent':''}" data-action="craft-tab" data-tab="craft">Craft</button><button class="btn btn-sm ${t==='forge'?'btn-accent':''}" data-action="craft-tab" data-tab="forge">Forge</button></div>`;
}
function renderForge(){
  const c = S.char, eff = effectiveStats(c);
  const slot = EQUIP_SLOTS.includes(S.forgeSlot) ? S.forgeSlot : 'weapon';
  const slotBtns = EQUIP_SLOTS.map(s=>`<button class="btn btn-sm ${s===slot?'btn-accent':''}" data-action="forge-slot" data-slot="${s}">${icon(SLOT_ICO[s]||'shield','style="width:14px;height:14px"')} ${SLOT_NOUN[s]}</button>`).join('');
  const chip = (ico, label, have, need)=>`<span class="req-chip ${have<need?'short':''}">${ico} ${label} ${fmtRes(have)}/${fmtRes(need)}</span>`;
  const matName = id => { const r = RECIPES.find(x=>x.out.id===id); return r ? r.out.name : id; };
  const cards = TIERS.map(t=>{
    const f = FORGE_TIERS[t.id];
    const art = weaponArtKey({slot, tier:t.id});
    const stats = gearStatChips(equipmentStatRange(slot, t.id, c.level));
    const chips = chip(statIcon('energy',13),'Energy',Math.floor(c.energyCur),f.energy)
      + Object.entries(f.resources||{}).map(([k,v])=>chip(resourceIcon(k,12),RESOURCE_NAMES[k],c.resourceBag[k]||0,v)).join('')
      + Object.entries(f.materials||{}).map(([k,v])=>chip(itemIcon(MATERIAL_ICONS[k],12),matName(k),matCount(c,k),v)).join('');
    const ok = forgeCheck(c, slot, t.id).ok;
    return `<div class="craft-card">
      <div class="row" style="align-items:center;gap:10px;">
        <div class="rc-ibox ${art?'has-art':''}" style="--rar:${GEAR_RAR[t.id]||'#475569'};flex:0 0 54px;">${art?artImg(art)+`<span class="fb" style="display:none">${icon(SLOT_ICO[slot]||'shield')}</span>`:icon(SLOT_ICO[slot]||'shield')}<i class="lv">${c.level}</i></div>
        <div style="flex:1;min-width:0;font-weight:700;color:var(--parchment);font-size:14px;">${t.name} ${SLOT_NOUN[slot]}</div><span class="tag">Lv.${c.level}</span></div>
      <div class="rc-chips2" style="margin:8px 0 10px;">${stats}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">${chips}</div>
      <button class="btn btn-sm btn-accent btn-block" data-action="forge" data-slot="${slot}" data-tier="${t.id}" ${ok?'':'disabled'}>Forge +${f.xp}XP</button>
    </div>`;
  }).join('');
  return `
  ${pageHero('Craft','Forge: turn resources, materials and Energy into equipment','craft')}
  ${craftTabs()}
  <div class="rc-tiles">${statTile('Backpack',bagCount(c)+'/'+BAG_CAPACITY)}${statTile('Energy',`${statIcon('energy',16)} ${Math.floor(c.energyCur)}/${eff.maxEnergy}`,'blue')}</div>
  <p class="faint" style="margin:12px 0;">Monsters no longer drop gear. Forge it here with resources, materials and Energy (no gold). Stats are random inside the range shown for each tier, and the item takes your current level. You can also buy gear on the Market. Make Planks, Bread, Steel and Tanned Leather in the Craft tab.</p>
  <div class="forge-slots">${slotBtns}</div>
  <div class="craft-grid">${cards}</div>`;
}

function renderCraft(){
  if(S.craftTab==='forge') return renderForge();
  const c = S.char;
  const eff = effectiveStats(c);
  const cards = RECIPES.map(r=>{
    const max = maxCraftable(c, r);
    const qty = clamp((S.craftQty&&S.craftQty[r.id])||1, 1, Math.max(1,max));
    const reqChips = Object.entries(r.inputs).map(([k,v])=>{
      const have = c.resourceBag[k]||0;
      const need = v*qty;
      const short = have < need;
      return `<span class="req-chip ${short?'short':''}">${resourceIcon(k,12)} ${fmtRes(have)}/${fmtRes(need)}</span>`;
    }).join('');
    const energyShort = r.energy && c.energyCur < r.energy*qty;
    const energyChip = r.energy ? `<span class="req-chip ${energyShort?'short':''}">${statIcon('energy',13)} ${Math.round(c.energyCur)}/${r.energy*qty}</span>` : '';
    const iconColor = r.out.kind==='consumable' ? 'var(--emerald)' : 'var(--brass)';
    return `<div class="craft-card">
      <div class="row" style="align-items:flex-start;">
        <div class="craft-icon" style="background:${iconColor}22; color:${iconColor}; border-color:${iconColor}55;">${r.out.icon ? itemIcon(r.out.icon,36) : esc(r.name[0])}</div>
        ${r.xp?`<span class="tag" style="border-color:var(--emerald); color:var(--emerald-bright);">+${r.xp*qty}XP</span>`:''}
      </div>
      <div style="margin-top:8px; font-weight:700; color:var(--parchment); font-size:14px;">${esc(r.name)}</div>
      <div class="faint" style="margin-bottom:10px;">Produces ${qty}</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">${energyChip}${reqChips}</div>
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="qty-stepper">
          <button class="btn btn-sm" data-action="craft-qty-dec" data-recipe="${r.id}" ${qty<=1?'disabled':''}>&minus;</button>
          <span>${qty}</span>
          <button class="btn btn-sm" data-action="craft-qty-inc" data-recipe="${r.id}" ${qty>=max?'disabled':''}>+</button>
        </div>
        <button class="btn btn-sm btn-accent btn-block" data-action="craft" data-recipe="${r.id}" ${max<=0?'disabled':''}>Craft x${qty}</button>
      </div>
    </div>`;
  }).join('');
  const resChips = Object.entries(c.resourceBag).filter(([,v])=>v>0).map(([k,v])=>`<span class="tag" style="margin:0 6px 6px 0;">${RESOURCE_NAMES[k]}: <b style="color:var(--parchment)">${fmtRes(v)}</b></span>`).join('') || '<span class="faint">No resources yet &mdash; fight in Adventure zones to gather some.</span>';
  return `
  ${pageHero('Craft','Turn raw resources and Energy into materials and potions','craft')}
  ${craftTabs()}
  <div class="rc-tiles" style="margin-top:12px">${statTile('Backpack',bagCount(c)+'/'+BAG_CAPACITY)}${statTile('Energy',`${statIcon('energy',16)} ${Math.floor(c.energyCur)}/${eff.maxEnergy}`,'blue')}</div>
  <div class="rc-sec">RESOURCES</div>
  <div style="margin-bottom:16px;">${resChips}</div>
  <div class="craft-grid">${cards}</div>`;
}

/* ---------------- Inventory ---------------- */
function renderInventory(){
  const c = S.char;
  const RAR={common:'#b8ab95',uncommon:'#7fbf7a',rare:'#4fd1ff',epic:'#c9a0ff',legendary:'#ffc35c'};
  const TIERN={common:0,uncommon:1,rare:2,epic:3,legendary:4};
  const statChips=st=>Object.entries(st||{}).map(([k,v])=>`<span class="rc-st s-${k}">+${v} ${k.toUpperCase()}</span>`).join('');
  const tile=(it,actions,ico)=>{ const art=weaponArtKey(it); return `<div class="rc-item" style="--rar:${RAR[it.tier]||'#475569'}">
      <div class="rc-ibox ${art?'has-art':''}">${art?artImg(art)+`<span class="fb" style="display:none">${icon(ico)}</span>`:icon(ico)}${it.qty>1?`<b class="q">x${it.qty}</b>`:''}${it.level?`<i class="lv">${it.level}</i>`:''}</div>
      <div class="rc-iname">${esc(it.name)}</div>
      ${it.tier?`<span class="rc-tier">${it.tier}</span>`:''}
      ${it.stats?`<div class="rc-chips2">${statChips(it.stats)}</div>`:''}
      <div class="rc-iact">${actions}</div></div>`; };
  const slots = EQUIP_SLOTS.map(slot=>{
    const it = c.equipment[slot];
    return it
      ? tile(it, `<button class="btn btn-sm" data-action="unequip" data-slot="${slot}">Unequip</button>${upgradeButtonHtml(it, c)}`, SLOT_ICO[slot]||'shield').replace('<div class="rc-item"','<div class="rc-item eq"')
        .replace('<div class="rc-ibox">',`<div class="rc-slotname">${slot}</div><div class="rc-ibox">`)
      : `<div class="rc-item empty"><div class="rc-slotname">${slot}</div><div class="rc-ibox">${icon(SLOT_ICO[slot]||'shield')}</div><div class="rc-iname faint">Empty</div></div>`;
  }).join('');
  const sortFn=(x,y)=>(TIERN[y.tier]||0)-(TIERN[x.tier]||0)||(y.level||1)-(x.level||1);
  const gear = c.inventory.filter(i=>i.kind==='equipment').sort(sortFn);
  const consumables = c.inventory.filter(i=>i.kind==='consumable');
  const materials = c.inventory.filter(i=>i.kind==='material');
  const sell=it=>`<button class="btn btn-sm" data-action="sell" data-uid="${it.uid}">Sell &middot; ${sellPrice(it)} ${resourceIcon('gold',13)}</button>`;
  const gearCards = gear.map(it=>tile(it, `<button class="btn btn-sm btn-primary" data-action="equip" data-uid="${it.uid}">Equip</button>${sell(it)}${upgradeButtonHtml(it, c)}`, SLOT_ICO[it.slot]||'shield')).join('') || '<p class="faint">No gear in your bag.</p>';
  const consCards = consumables.map(it=>tile(it, `<button class="btn btn-sm btn-primary" data-action="use-item" data-uid="${it.uid}">Use</button>`, 'bolt')).join('') || '<p class="faint">No consumables.</p>';
  const matCards = materials.map(it=>tile(it, sell(it), 'hammer')).join('') || '<p class="faint">No materials.</p>';
  const pct=Math.min(100,Math.round(bagCount(c)/BAG_CAPACITY*100));
  const resEntries = Object.entries(c.resourceBag||{}).filter(([,v])=>v>0);
  const resCards = resEntries.map(([k,v])=>`<div class="rc-item" style="--rar:#475569">
      <div class="rc-ibox">${resourceIcon(k,34)||icon('hammer')}<b class="q">x${fmtRes(v)}</b></div>
      <div class="rc-iname">${esc(RESOURCE_NAMES[k]||k)}</div></div>`).join('') || emptyState('bag','No resources yet','Fight in PvE zones to gather some.',{action:'nav',screen:'adventure',label:'Go to PvE'});
  return `
  ${pageHero('Inventory','Equip your gear, use items and sell what you do not need','inventory')}
  <div class="rc-tiles" style="margin-top:12px">
    <div class="rc-tile has-ic"><div class="rc-tile-ic">${icon('bag')}</div><div class="rc-tile-tx"><small>Bag</small><b>${bagCount(c)}/${BAG_CAPACITY}</b><div class="rc-bagbar"><i style="width:${pct}%"></i></div></div></div>
    ${statTile('Gold',`${resourceIcon('gold',16)} ${fmtNum(c.gold)}`,'gold')}
    ${statTile('Gear',gear.length)}
  </div>
  <div class="rc-sec">EQUIPMENT</div><div class="rc-items">${slots}</div>
  <div class="rc-sec">GEAR — ${gear.length}</div><div class="rc-items">${gearCards}</div>
  <div class="rc-sec">CONSUMABLES — ${consumables.length}</div><div class="rc-items">${consCards}</div>
  <div class="rc-sec">RESOURCES — ${resEntries.length}</div><div class="rc-items">${resCards}</div>
  <div class="rc-sec">MATERIALS — ${materials.length}</div><div class="rc-items">${matCards}</div>`;
}
function upgradeButtonHtml(it, c){
  const cost = UPGRADE_COSTS[it.tier];
  if(!cost) return ''; // already legendary, or unknown tier
  const nextTier = TIERS[TIER_ORDER.indexOf(it.tier)+1];
  const parts = [];
  let affordable = c.gold >= cost.gold;
  parts.push(cost.gold+'g');
  if(cost.resources){
    Object.entries(cost.resources).forEach(([k,v])=>{
      if((c.resourceBag[k]||0) < v) affordable = false;
      parts.push(`${v} ${RESOURCE_NAMES[k]}`);
    });
  }
  if(cost.materials){
    Object.entries(cost.materials).forEach(([k,v])=>{
      const have = c.inventory.filter(i=>i.kind==='material' && i.id===k).reduce((a,i)=>a+(i.qty||1),0);
      if(have < v) affordable = false;
      parts.push(`${v}x ${k.replace(/_/g,' ')}`);
    });
  }
  return `<button class="btn btn-sm ${affordable?'btn-primary':''}" data-action="upgrade-item" data-uid="${it.uid}" ${affordable?'':'disabled'} title="${parts.join(', ')}">Upgrade &rarr; ${nextTier.name}</button>`;
}
function sellPrice(it){
  if(it.kind==='equipment'){ const tm={common:1,uncommon:1.8,rare:3,epic:5,legendary:8}[it.tier]||1; return Math.round(8*(it.level||1)*tm); }
  if(it.kind==='consumable') return 6;
  return 3;
}

/* ---------------- Profile (Stats + Settings tabs) ---------------- */
function renderProfile(){
  const tab = ['skills','settings'].includes(S.profileTab) ? S.profileTab : 'stats';
  const _c=S.char;
  const fmtDate=ts=>new Date(Number(ts)||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const tabs=[['stats','Home','user'],['skills','Skills','chart'],['settings','Settings','gear']];
  const tabRow=`<div class="country-module-nav rc-ptabs">${tabs.map(t=>`<button class="country-module ${tab===t[0]?'active':''}" data-action="profile-tab" data-tab="${t[0]}">${icon(t[2])}<span>${t[1]}</span>${t[0]==='skills'&&_c.skillPoints>0?`<i class="rc-dot">${_c.skillPoints}</i>`:''}</button>`).join('')}</div>`;
  const hero=`<div class="rc-chero rc-phero"><div class="rc-banner"></div><div class="rc-chead"><div class="rc-pav" style="--p:${xpPct(_c)}"><div class="rc-avatar">${esc(_c.username.slice(0,2).toUpperCase())}</div><span class="lv">${_c.level}</span><span class="fg">${kingdomFlag(_c.kingdomId,16,'margin:0;vertical-align:0')}</span></div><div><h2>${kingdomFlag(_c.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(_c.username)}</h2><div class="rc-cstats pl"><span><small>Citizen since</small><b>${fmtDate(_c.createdAt)}</b></span><span><small>Last connection</small><b>${fmtRelative(_c.updatedAt)==='now'?'now':fmtRelative(_c.updatedAt)+' ago'}</b></span></div></div></div></div>`;
  return hero + tabRow + (tab==='settings' ? renderSettings() : renderProfileStats(tab));
}
/* Equipment slots row, shared by your own profile (clickable → inventory) and other players' profiles (view only). */
function equipRowHtml(equipment, clickable){
  return EQUIP_SLOTS.map(sl=>{
    const it=(equipment||{})[sl], art=weaponArtKey(it);
    const inner=`${it?(art?`<div class="rc-eq-art">${artImg(art)}<span class="fb" style="display:none">${icon(SLOT_ICO[sl]||'shield')}</span></div>`:icon(SLOT_ICO[sl]||'shield')):'+'}<small>${sl}</small>`;
    const cls=`rc-eq ${it?'tier-'+it.tier:''}`, tip=`title="${esc(it?it.name:sl)}"`;
    return clickable ? `<button class="${cls}" data-action="nav" data-screen="inventory" ${tip}>${inner}</button>` : `<div class="${cls}" ${tip}>${inner}</div>`;
  }).join('');
}
function renderProfileStats(tab){
  const c = S.char, eff = effectiveStats(c);
  const cls = CLASSES[c.class];
  const genRows = GENERAL_SKILLS.map(gs=>{
    const lvl = c.generalSkills[gs.id];
    const cost = generalSkillCost(lvl);
    const maxed = lvl>=GENERAL_SKILL_MAX;
    return `<div class="skill-row">
      <div>
        <div style="font-weight:700; color:var(--parchment); font-size:13.5px;">${gs.name} <span class="faint">Lv.${lvl}</span></div>
        <div class="faint">${gs.desc}</div>
      </div>
      <button class="btn btn-sm ${maxed?'':'btn-primary'}" data-action="buy-general" data-skill="${gs.id}" ${maxed || c.skillPoints<cost ? 'disabled':''}>${maxed?'Max':cost+' pt'}</button>
    </div>`;
  }).join('');
  const classRows = cls.skills.map(s=>{
    const lvl = c.classSkills[s.id];
    const maxed = lvl>=MAX_SKILL_LEVEL;
    const cost = maxed?0:SKILL_UPGRADE_COST[lvl];
    const pips = Array.from({length:MAX_SKILL_LEVEL},(_,i)=>`<div class="pip ${i<lvl?'on':''}"></div>`).join('');
    return `<div class="skill-row">
      <div style="flex:1;">
        <div style="font-weight:700; color:var(--parchment); font-size:13.5px;">${s.name} <span class="faint">Lv.${lvl}/${MAX_SKILL_LEVEL}</span></div>
        <div class="faint">${s.desc}</div>
        <div class="pip-row">${pips}</div>
      </div>
      <button class="btn btn-sm ${maxed?'':'btn-primary'}" data-action="buy-class-skill" data-skill="${s.id}" ${maxed || c.skillPoints<cost ? 'disabled':''}>${maxed?'Max':cost+' pt'}</button>
    </div>`;
  }).join('');
  const need = xpNeeded(c.level);
  const tile=statTile;
  if(tab==='skills'){
    return `
    <div class="rc-skillhead"><div class="rc-lvl">${c.level}</div><div><b>${c.skillPoints} skill points</b><br><span class="faint">Upgrade your skills!</span></div><button class="btn btn-danger btn-sm" data-action="reset-skills" style="margin-left:auto">Reset</button></div>
    <div class="rc-sec">${esc(cls.resource).toUpperCase()} SKILLS</div>
    <div class="rc-skills">${classRows}</div>
    <div class="rc-sec">GENERAL SKILLS</div>
    <div class="rc-skills">${genRows}</div>`;
  }
  const eqRow=equipRowHtml(c.equipment, true);
  return `
  <div class="rc-sec">EQUIPMENT</div>
  <div class="rc-eqrow">${eqRow}</div>
  <div class="rc-sec">PLAYER STATS</div>
  <div class="rc-tiles">
    ${tile('Level',c.level)}
    ${tile('XP',`${statIcon('xp',16)} ${fmtNum(c.xp||0)}${need?' / '+fmtNum(need):''}`,'gold')}
    ${tile('PvP rating',Math.round(c.pvp.rating))}
    ${tile('League',leagueBadge(c.pvp.rating,22)+' '+leagueOf(c.pvp.rating).name)}
    ${tile('Wins / Losses',c.pvp.wins+' / '+c.pvp.losses,'green')}
  </div>
  <div class="rc-sec">WEALTH</div>
  <div class="rc-tiles">
    ${tile('Gold',`${resourceIcon('gold',16)} ${fmtNum(c.gold)}`,'gold')}
    ${tile('Items',(c.inventory||[]).length)}
    ${tile('Skill points',c.skillPoints)}
  </div>
  <div class="rc-sec">COMBAT STATS</div>
  <div class="rc-tiles">
    ${tile('Max HP',`${statIcon('hp',16)} ${eff.maxHp}`)}${tile('Attack',eff.atk)}${tile('Defense',eff.def)}${tile('Speed',eff.spd)}
    ${tile('Crit %',eff.crit+'%')}${tile('Evasion %',eff.eva+'%')}${tile('Max Energy',`${statIcon('energy',16)} ${eff.maxEnergy}`)}${tile('Max Mana',`${statIcon('mana',16)} ${eff.maxMana}`)}
  </div>`;
}

/* ---------------- Settings ---------------- */
function renderSettings(){
  const c = S.char;
  if(S._settingsUsername === undefined || S._settingsUsername === null) S._settingsUsername = c.username;
  const activeScheme = getColorScheme(c.colorScheme).id;
  const swatches = COLOR_SCHEMES.map(s=>`
    <button class="color-swatch ${s.id===activeScheme?'selected':''}" data-action="set-color-scheme" data-color="${s.id}" title="${esc(s.name)}" style="--swatch-color:${s.base};">
      <span class="color-swatch-dot" style="background:${s.base};"></span>
      <span class="color-swatch-label">${esc(s.name)}</span>
    </button>`).join('');
  return `
  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Your email</div>
    <div style="font-weight:700; color:var(--parchment); font-size:14px;">${HAS_DB && FB_USER_EMAIL ? esc(FB_USER_EMAIL) : 'Not linked'}</div>
    ${HAS_DB && !FB_USER_EMAIL ? `<button class="btn btn-sm" data-action="google-signin" style="margin-top:10px;">Sign in with Google</button>
    <p class="faint" style="margin-top:8px; line-height:1.6;">Link a Google account so your progress follows you to other devices and browsers instead of staying tied to this one.</p>` : ''}
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Update infos</div>
    <label class="field">Username</label>
    <input type="text" id="settings-username-input" maxlength="18" value="${esc(S._settingsUsername)}">
    <div style="display:flex; justify-content:flex-end; margin-top:10px;">
      <button class="btn btn-primary" data-action="update-username">Update</button>
    </div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Appearance</div>
    <div class="faint" style="margin-bottom:10px; text-transform:uppercase; letter-spacing:.05em;">Theme</div>
    <div class="color-swatch-grid">${swatches}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Account</div>
    <div class="stat-list">
      <div><span>Player ID</span><b style="font-size:11px;">${esc(String(MY_ID||'').slice(0,14))}&hellip;</b></div>
      <div><span>Storage</span><b>${HAS_DB?'Shared (cross-viewer)':'Local to this browser'}</b></div>
    </div>
    <p class="faint" style="margin-top:10px; line-height:1.6;">
      This is an in-browser prototype of REALMCLASH MMO's core loop. ${HAS_DB
        ? 'Your character is saved to shared storage, so other people who open this page can be matched against you in the PvP Arena.'
        : 'Real-player matchmaking is unavailable in this view, so PvP opponents are simulated.'}
      Combat is resolved locally rather than by a trusted server, so treat this as a feel-the-loop demo, not a cheat-proof build.
    </p>
  </div>
  <div class="panel">
    <div class="panel-title">Danger zone</div>
    <p class="faint" style="margin-bottom:10px;">Delete this character and start over.</p>
    <button class="btn btn-danger" data-action="reset-character">Delete character</button>
  </div>`;
}
function bindSettingsEvents(){
  const input = document.getElementById('settings-username-input');
  if(input){
    input.addEventListener('input', e=>{ S._settingsUsername = e.target.value; });
  }
}

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
    return `<div class="country-empty"><div class="country-empty-icon">${icon('castle')}</div><h2>Kingdoms are offline</h2><p>Shared country data is unavailable in this session.</p></div>`;
  }
  if(kv.loading){ return `<div class="empty"><h3>Loading kingdoms...</h3></div>`; }
  if(kv.error){ return `<div class="panel empty"><h3>Couldn't load kingdom data</h3><p class="faint">Please try again.</p><button class="btn btn-primary" style="margin-top:10px;" data-action="nav" data-screen="kingdom">Retry</button></div>`; }

  if(kv.mode==='browse'){
    const cd = (c.kingdomCooldownUntil||0) - Date.now();
    if(cd > 0){
      return `<div class="country-empty"><div class="country-empty-icon">${icon('lock')}</div><h2>Kingdom transfer locked</h2><p>You may join a new kingdom in <b>${fmtMs(cd)}</b>.</p></div>`;
    }
    const cards = kv.kingdoms.map(k=>`
      <article class="kingdom-discover-card">
        <div class="kingdom-discover-top">
          <div class="kingdom-crest">${flagIcon(k.flag,42)}</div>
          <div class="kingdom-discover-title"><span class="eyebrow">KINGDOM</span><h3>${k.name}</h3><p>${plural(k.memberCount,'citizen')} · ${k.tax}% tax</p></div>
        </div>
        <div class="kingdom-resource-row">${k.resources.map(r=>`<span>${resourceIcon(r,16)} ${RESOURCE_NAMES[r]||titleCase(r)}</span>`).join('')}</div>
        <div class="kingdom-discover-foot"><span>${resourceIcon('gold',14)} Donation fund <b>${fmtNum(k.treasury.gold||0)}</b></span><button class="btn btn-primary btn-sm" data-action="join-kingdom" data-kingdom="${k.id}">Join Kingdom</button></div>
      </article>`).join('');
    function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
    return `
      <div class="country-hero discover-hero"><div><span class="eyebrow">THE GREAT REALMS</span><h2>Choose your kingdom</h2><p>Find a faction, build your influence and shape the world.</p></div><div class="hero-emblem">${icon('globe')}</div></div>
      <div class="kingdom-discover-grid">${cards}</div>`;
  }

  const k = kv.kingdom;
  const kdef = KINGDOMS.find(x=>x.id===k.id) || {name:k.id, flag:'', resources:[], tax:0};
  const treasury = k.treasury || {};
  const myRank = kingdomRank(c.kingdomRole);
  const canManageRoles = myRank >= 3;
  const canKick = myRank >= 2;
  const leaderMissing = !k.leaderId;
  const members = kv.members || [];
  const govMembers = members.filter(m=>kingdomRank(m.kingdomRole)>=2).sort((a,b)=>kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole));
  const memberRows = members.map(m=>{
    const rank=kingdomRank(m.kingdomRole), isMe=m.id===MY_ID;
    let actions='';
    if(!isMe && myRank>rank){
      if(canManageRoles){
        actions += `<button class="btn btn-sm" data-action="kingdom-member" data-id="${m.id}" data-op="promote" ${rank>=myRank-1?'disabled':''}>Promote</button>`;
        actions += `<button class="btn btn-sm" data-action="kingdom-member" data-id="${m.id}" data-op="demote" ${rank<=0?'disabled':''}>Demote</button>`;
      }
      if(canKick) actions += `<button class="btn btn-sm btn-danger" data-action="kingdom-member" data-id="${m.id}" data-op="kick">Kick</button>`;
    }
    if(!isMe && c.kingdomRole==='Leader') actions += `<button class="btn btn-sm" data-action="make-leader" data-id="${m.id}" data-name="${esc(m.username||'')}">Make Leader</button>`;
    return `<div class="member-line"><div class="member-avatar" style="--p:${xpPct(m)}" data-action="view-player" data-id="${m.id}">${(m.username||'?').slice(0,2).toUpperCase()}</div><div class="member-main" data-action="view-player" data-id="${m.id}" style="cursor:pointer"><b>${esc(m.username)} ${isMe?'<span class="faint">· You</span>':''}</b><small>Lv.${m.level||1} · ${m.kingdomRole||'Recruit'}</small></div><div class="member-actions">${actions}</div></div>`;
  }).join('');
  const treasuryRows = KINGDOM_TREASURY_RESOURCES.map(r=>`<div><span>${resourceIcon(r,14)} ${r==='gold'?'Gold':RESOURCE_NAMES[r]||r}</span><b>${fmtNum(treasury[r]||0)}</b></div>`).join('');
  const st = S.countryState && S.countryState.data;
  const activeWar = st && st.activeWar;
  const tabs = ['overview','government','treasury','war','citizens','economy'];
  const tabLabel = {overview:'Home',government:'Government',treasury:'Account',war:'Wars',citizens:'Citizens',economy:'Economy'};
  const tabIcon = {overview:'castle',citizens:'users',government:'scroll',treasury:'bag',economy:'chart',war:'shield'};
  const activeTab = tabs.includes(S.kingdomTab) ? S.kingdomTab : 'overview';
  const tabRow = `<div class="country-module-nav">${tabs.map(t=>`<button class="country-module ${activeTab===t?'active':''}" data-action="kingdom-tab" data-tab="${t}">${icon(tabIcon[t])}<span>${tabLabel[t]}</span>${t==='war'&&activeWar?'<i>LIVE</i>':''}</button>`).join('')}</div>`;

  const resourceTiles = ((st&&st.naturalResources)||kdef.resources).map(r=>`<div class="country-resource"><div class="country-resource-icon">${resourceIcon(r,25)}</div><span>${RESOURCE_NAMES[r]||r}</span><b>${fmtNum(st?.resources?.[r]||0)}</b></div>`).join('');
  const readiness = activeWar ? 'WAR ACTIVE' : 'PEACE';
  const readinessClass = activeWar ? 'danger' : 'safe';
  const avatarHtml=(m,cls)=>m?`<div class="rc-gav ${cls||''}" style="--p:${xpPct(m)}" data-action="view-player" data-id="${esc(m.id)}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i></div>`:'';
  const byRole=r=>members.filter(m=>m.kingdomRole===r);
  const roleCard=(label,cls,list)=>`<div class="rc-role ${cls}"><h4>${label}</h4>${list.length?list.map(m=>`<div class="rc-role-p">${avatarHtml(m)}<b>${esc(m.username)}</b></div>`).join(''):'<p>No one nominated yet.</p>'}</div>`;
  const homeBody=`
    <div class="rc-sec">KINGDOM STATS</div>
    <div class="rc-tiles">
      ${statTile('Active population',members.length,'green')}
      ${statTile('Donation fund',`${resourceIcon('gold',16)} ${fmtNum(treasury.gold||0)}`,'gold')}
      ${statTile('National tax',kdef.tax+'%')}
      ${statTile('Total power',fmtNum(members.reduce((n,m)=>n+(m.level||1),0)))}
    </div>
    <div class="rc-sec">GOVERNMENT</div>
    <div class="rc-gov-strip">${['Leader','Co-Leader','Officer'].map(r=>byRole(r).slice(0,4).map(m=>avatarHtml(m,r==='Leader'?'gold':r==='Co-Leader'?'blue':'red')).join('')).join('')||'<p class="faint">No government yet.</p>'}</div>
    <div class="rc-sec">NATIONAL RESOURCES</div>
    <div class="rc-res">${resourceTiles||'<span class="faint">None</span>'}</div>
    <div class="rc-sec">${icon('castle','style="width:12px;height:12px"')} YOUR POSITION</div>
    ${statTile('Role',c.kingdomRole||'Recruit')}
    <div class="country-footer-action"><button class="btn btn-danger" data-action="leave-kingdom">Leave Kingdom</button></div>`;
  const govBody=govLayout(byRole('Leader'),byRole('Co-Leader'),byRole('Officer'),(m,cls)=>`<div class="rc-role-p">${avatarHtml(m,cls)}<b>${esc(m.username)}</b></div>`);
  const citBody=`<div class="country-card"><div class="country-card-head"><span>CITIZENS</span><b>${members.length}</b></div><div class="member-list">${memberRows}</div></div>`;

  let tabBody='';
  if(activeTab==='overview') tabBody=homeBody;
  else if(activeTab==='citizens') tabBody=citBody;
  else if(activeTab==='government') tabBody=govBody;
  else if(activeTab==='treasury') tabBody=`<div class="country-card wide"><div class="country-card-head"><span>KINGDOM DONATION FUND</span><b>${resourceIcon('gold',16)} ${fmtNum(treasury.gold||0)} GOLD</b></div><div class="treasury-big"><div class="treasury-emblem">${icon('coins')}</div><div><small>AVAILABLE GOLD</small><strong>${fmtNum(treasury.gold||0)}</strong><p>Funds contributed by the citizens of ${kdef.name}.</p></div></div><div class="stat-list treasury-list">${treasuryRows}</div><div class="country-actions"><button class="btn btn-primary" data-action="donate-kingdom" data-resource="gold" data-amount="50">Donate 50 Gold</button><button class="btn" data-action="donate-kingdom" data-resource="gold" data-amount="200">Donate 200 Gold</button></div></div>`;
  else if(activeTab==='economy') tabBody=renderEconomy(c,kv);
  else if(activeTab==='war') tabBody=renderWar(c,kv);

  return `
    <div class="rc-chero">
      <div class="rc-banner country"></div>
      <div class="rc-chead"><div class="rc-flag">${flagIcon(kdef.flag,92)}</div><div><small>${icon('flag','class="ic-inline" aria-hidden="true"')} Country</small><h2>${esc(kdef.name)}</h2><div class="rc-cstats"><span><small>Citizens</small><b>${members.length}</b></span><span><small>Donation fund</small><b>${resourceIcon('gold',16)} ${fmtNum(treasury.gold||0)}</b></span><span><small>Tax</small><b>${kdef.tax}%</b></span><span><small>Status</small><b class="${readinessClass}">${readiness}</b></span></div></div></div>
    </div>
    ${leaderMissing ? `<div class="country-alert"><span>${icon('crown')}</span><div><b>Leadership is vacant</b><p>${govMembers.length?'An Officer or above can claim leadership.':'No Officer exists yet, so any citizen can claim leadership.'}</p></div>${(myRank>=2||!govMembers.length)?'<button class="btn btn-primary btn-sm" data-action="claim-leadership">Claim Leadership</button>':''}</div>`:''}
    ${tabRow}
    ${tabBody}`;
}

/* ---------------- Country economy & war (all numbers come from the server) ---------------- */
function countryName(id){ const k = KINGDOMS.find(x=>x.id===id); return k ? k.name : id; }
function srvNow(){ return Date.now() + (S.serverOffset||0); }
function dailyPanel(c){
  const DAY=86400000, today=Math.floor(srvNow()/DAY), d=c.daily||{};
  const claimed = d.day===today;
  const streak = claimed ? d.streak : (d.day===today-1 ? Math.min((d.streak||0)+1,7) : 1);
  const days = Array.from({length:7},(_,i)=>`<span class="daily-dot ${i<streak-(claimed?0:1)?'done':(i===streak-1&&!claimed?'next':'')}">${i+1}</span>`).join('');
  return `<section class="panel daily-panel"><div class="section-head"><div><span class="eyebrow">DAILY REWARD</span><h3>${claimed?'Claimed today':'Your reward is ready'}</h3></div>
    ${claimed?`<span class="faint">Next in ${countdown((today+1)*DAY)}</span>`:`<button class="btn btn-primary" data-action="claim-daily">Claim +${20*streak} ${resourceIcon('gold',14)} &amp; +20 energy</button>`}</div>
    <div class="daily-streak">${days}</div><p class="faint" style="margin:6px 0 0;">Come back every day: the streak raises the reward up to day 7.</p></section>`;
}
function fmtClock(ms){
  if(ms<=0) return '00:00';
  const s = Math.ceil(ms/1000), d = Math.floor(s/86400), h = Math.floor(s%86400/3600), m = Math.floor(s%3600/60), r = s%60;
  const hh = String(h).padStart(2,'0'), mm = String(m).padStart(2,'0'), ss = String(r).padStart(2,'0');
  return d>0 ? `${d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
}
function countdown(endsAt){ return `<span data-countdown="${endsAt}">${fmtClock(endsAt - srvNow())}</span>`; }
function resName(r){ return RESOURCE_NAMES[r] || (r.charAt(0).toUpperCase()+r.slice(1)); }

function countryStatePanel(){ // shared loading / error / unavailable handling for both tabs
  const cs = S.countryState;
  if(!cs || (cs.status==='loading' && !cs.data)) return `<div class="empty"><h3>Loading...</h3></div>`;
  if(cs.status==='unavailable') return `<div class="panel empty"><h3>Unavailable</h3><p class="faint">Country economy and wars need the game servers, which this view can't reach.</p></div>`;
  if(!cs.data) return `<div class="panel empty"><h3>Couldn't load</h3><button class="btn btn-primary" style="margin-top:10px;" data-action="country-refresh">Retry</button></div>`;
  return null;
}

function renderEconomy(c, kv){
  const blocked = countryStatePanel(); if(blocked) return blocked;
  const st = S.countryState.data, k = kv.kingdom;
  const leader = kv.members.find(m=>m.id===st.leaderId);
  const resRows = Object.keys(st.resources).map(r=>`<div><span>${resourceIcon(r,14)} ${resName(r)}</span><b>${fmt3(st.resources[r])}</b></div>`).join('');
  let specPanel = '';
  if(st.isLeader){
    const pick = S._specPick || st.naturalResources.slice();
    const locked = st.specialityCooldownUntil > st.serverNow;
    const changed = pick.slice().sort().join() !== st.naturalResources.slice().sort().join();
    specPanel = `<div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Specialities</div>
      <p class="faint">Pick exactly 2 headline resources for your country. They are only a showcase: they no longer change any tax.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin:8px 0;">${st.specialityOptions.map(r=>`<button class="btn ${pick.includes(r)?'btn-primary':''}" data-action="spec-pick" data-resource="${r}" ${locked?'disabled':''}>${resourceIcon(r,14)} ${resName(r)}</button>`).join('')}</div>
      <button class="btn btn-primary" data-action="spec-confirm" ${(!locked && changed && pick.length===2)?'':'disabled'}>Save specialities</button>
      <p class="faint" style="margin-top:6px;">${locked ? `You can change them again in ${countdown(st.specialityCooldownUntil)}.` : 'After saving, they can be changed again in 7 days.'}</p>
    </div>`;
  }

  const rr = S.regionRes;
  const TIER_LABEL = {COMMON:'Common', UNCOMMON:'Uncommon', RARE:'Rare', VERY_RARE:'Very rare'};
  const regionPanel = (rr && rr.enabled) ? `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Regions &amp; Resources <span class="tag">${esc(rr.monthKey)}</span></div>
      <details class="rc-more"><summary>How this works</summary><p class="faint">Region resources are re-rolled every month and balanced between countries. Next rotation in ${rr.daysToRotation} day${rr.daysToRotation===1?'':'s'}. Owning a region gives your country its resource.</p></details>
      <div class="stat-list" style="margin:8px 0;">
        ${Object.keys(rr.overview.perHour).map(r=>`<div><span>${resourceIcon(r,14)} ${resName(r)}</span><b>+${fmt3(rr.overview.perHour[r])}/hour</b></div>`).join('') || '<div><span>No production</span><b>&mdash;</b></div>'}
        <div style="grid-column:1/-1;"><span>Total economic value</span><b>${fmt3(rr.overview.valuePerHour)}/hour</b></div>
      </div>
      ${rr.regions.map(g=>`<div class="row" style="padding:8px 0;border-top:1px solid var(--border);align-items:center;gap:10px;">
        <div style="flex:0 0 28px;">${g.resource?resourceIcon(g.resource,22):''}</div>
        <div style="flex:1;min-width:0;"><b>${esc(g.name)}</b><div class="faint" style="font-size:12px;">${g.resource?resName(g.resource):'No resource'} &middot; ${TIER_LABEL[g.tier]||''} &middot; Owner ${countryName(g.owner)}${g.occupiedBy?' &middot; Occupied by '+countryName(g.occupiedBy):''} &middot; Stability ${g.stability}%${g.resistance?' &middot; Resistance '+g.resistance+'%':''}</div></div>
        <div style="text-align:right;white-space:nowrap;"><b>${fmt3(g.production)}/h</b><div class="faint" style="font-size:12px;">value ${fmt3(g.value)}</div></div>
      </div>`).join('')}
    </div>` : '';
  return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">${kingdomFlag(st.countryId,20)}${countryName(st.countryId)}</div>
      <div class="stat-list">
        <div><span>Leader</span><b>${leader ? esc(leader.username) : (st.leaderId ? 'Unknown' : 'None')}</b></div>
        <div><span>Citizens</span><b>${kv.members.length}</b></div>
        <div><span>National PvE Tax</span><b>${st.taxRate}%</b></div>
        <div><span>Donation fund</span><b>${resourceIcon('gold',14)} ${fmtNum((k.treasury||{}).gold||0)} Gold</b></div>
      </div>
      <details class="rc-more"><summary>How this works</summary><p class="faint">National PvE Tax: ${st.taxRate}% of every NEW resource a citizen earns from PvE (Road, adventures) goes to the National Treasury of the player's NATIONALITY country. Resources already in inventories are never taxed.</p></details>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">National Treasury</div>
      <div class="stat-list">${resRows||'<div><span class="faint">Empty</span><b>0.000</b></div>'}</div>
      <details class="rc-more"><summary>How this works</summary><p class="faint">Owned by the country, not by its Leader${st.isLeader?' (you may only manage it through your Leader powers)':''}. It is fed by two separate sources: the National PvE Tax of the country's citizens, and the production of the regions the country currently owns.</p></details>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Your Wallet</div>
      <div class="stat-list"><div><span>${resourceIcon('gold',14)} Gold</span><b>${fmtRes(c.gold||0)}</b></div></div>
      <details class="rc-more"><summary>How this works</summary><p class="faint">Personal. Separate from the National Treasury: neither the tax nor the regions' production ever pays a player or a Leader directly.</p></details>
    </div>
    ${regionPanel}${specPanel}`;
}

const REGION_WHY = {LEGACY_NO_TARGET:'war declared before wars targeted regions', OWNER_CHANGED:'the region no longer belonged to the defender', REGION_NOT_RESERVED:'the region was reserved by another war', REGION_NOT_FOUND:'the region no longer exists'};
function warTerritoryText(t, fallbackRegion){
  if(!t) return '';
  const rn = esc(t.regionName || fallbackRegion || 'the region');
  if(t.status==='captured') return `${rn}: control passed from ${esc(countryName(t.fromCountryId))} to ${esc(countryName(t.toCountryId))}`;
  if(t.status==='held') return `${rn} stayed under ${esc(countryName(t.ownerCountryId))} control`;
  if(t.status==='none') return 'No region changed hands'+(REGION_WHY[t.reason]?' ('+REGION_WHY[t.reason]+')':'');
  if(t.status==='pending') return 'Territory being settled…';
  return '';
}
function renderWarHistoryRow(h, myId){
  const a = h.attackerCountryId, d = h.defenderCountryId, t = h.territory;
  const land = warTerritoryText(t, h.targetRegionName);
  return `<div class="skill-row"><div>
    <div style="font-weight:700;">${kingdomFlag(a)}${countryName(a)} ${h.finalScore[a]||0}&ndash;${h.finalScore[d]||0} ${kingdomFlag(d)}${countryName(d)}</div>
    ${h.targetRegionName?`<div class="faint">Over ${esc(h.targetRegionName)}</div>`:''}
    <div class="faint">${h.result==='victory'?'Victory':'Defeat'}${land?' &middot; '+land:''}</div>
  </div></div>`;
}

/* Wars tab: choose WHO owns the region you want (their current owner), then WHICH region. The server derives the defender from the region. */
function renderRegionWarPicker(me){
  const cc = S._warCountry || '', mr = cc && S.mapRegions && S.mapRegions[cc];
  if(cc && (mr===undefined || (mr!=='loading' && Date.now()-mr.at > 300000))) loadMapRegions(cc);
  const d = mr && mr!=='loading' && mr.data && mr.data.enabled ? mr.data : null;
  let list = '', summary = '', pick = null;
  if(cc){
    if(mr===undefined || mr==='loading') list = '<p class="faint">Loading regions&hellip;</p>';
    else if(!d) list = '<p class="faint">Regions are unavailable right now.</p>';
    else list = d.regions.map(g=>{
      const s = regionWarStatus(g, d, cc), on = S._warTarget===g.id, rn = g.resource ? resName(g.resource) : 'No resource';
      if(on && s.can) pick = g;
      return `<button class="btn ${on?'btn-primary':''}" style="display:block;width:100%;text-align:left;margin-bottom:6px;" data-action="war-pick-region" data-region="${esc(g.id)}" ${s.can?'':'disabled'}>
        <b>${esc(g.name)}</b> <span class="faint">&middot; ${esc(rn)} &middot; ${fmtNum(g.production)}/h</span>
        <div style="font-size:12px;color:${regionStatusColor(s)};">${esc(s.label)}</div></button>`;
    }).join('');
  }
  if(pick) summary = `<div class="panel" style="margin:8px 0;"><div class="faint">You are declaring war on</div><div style="font-size:16px;font-weight:700;">${kingdomFlag(cc,22)}${esc(countryName(cc))}</div>
      <div class="faint" style="margin-top:4px;">over control of <b>${esc(pick.name)}</b>. The defender is the region's current owner. If you win, ${esc(pick.name)} passes to ${esc(countryName(me))}; if you lose, nothing changes hands.</div></div>`;
  return `<p class="faint" style="margin-bottom:8px;">Wars are fought over a REGION. Choose the country that currently owns it, then the region. The war starts after a short preparation and is fought over at most 3 rounds &mdash; first to win 2 takes the victory, and the winning attacker takes that exact region.</p>
    <select id="war-target-country" style="width:100%;margin-bottom:8px;">${'<option value="">Choose the country that owns the region...</option>'+KINGDOMS.filter(k=>k.id!==me).map(k=>`<option value="${k.id}" ${cc===k.id?'selected':''}>${esc(k.name)}</option>`).join('')}</select>
    ${list}${summary}
    <button class="btn btn-danger" data-action="declare-war" ${pick?'':'disabled'}>Declare War over this region</button>`;
}
function renderWar(c, kv){
  const blocked = countryStatePanel(); if(blocked) return blocked;
  const st = S.countryState.data, me = st.countryId, now = srvNow();
  let html = '';

  // ---- current war ----
  const w = st.activeWar;
  if(w){
    // The fight itself (Strike, scores, top fighters) lives on the war page; here the war is only summarised + linked.
    const a = w.attackerCountryId, d = w.defenderCountryId;
    const sc = w.finalScore || {};
    const status = w.status==='preparing' ? `Round 1 starts in ${countdown(w.startsAt)}` : `Round ${(w.live&&w.live.round)||1} / 3 &middot; ${esc(countryName(a))} ${sc[a]||0} &mdash; ${sc[d]||0} ${esc(countryName(d))}`;
    html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">${w.status==='preparing'?'WAR DECLARED':'WAR IN PROGRESS'}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div style="font-size:16px; font-weight:700;">${kingdomFlag(a,22)}${esc(countryName(a))}</div><div class="faint">VS</div>
        <div style="font-size:16px; font-weight:700;">${kingdomFlag(d,22)}${esc(countryName(d))}</div></div>
      ${w.targetRegionName ? `<div class="faint" style="margin-top:8px;">${icon('swords','class="ic-inline" aria-hidden="true"')} Over control of <b>${esc(w.targetRegionName)}</b></div>` : ''}
      <p style="margin-top:8px;">${status}</p>
      <button class="btn btn-primary btn-block" style="margin-top:10px;" data-action="world-war" data-id="${esc(w.id)}">Go to the war &amp; strike</button></div>`;
  } else {
    // ---- declare a war (Leader only) ----
    const cool = st.cooldownUntil - now;
    let body;
    if(!st.isLeader) body = `<p class="faint">Only your country's Leader can declare war.</p>`;
    else if(cool>0) body = `<p class="faint">Your country is recovering from its last war. A new war can be declared in ${countdown(st.cooldownUntil)}.</p>`;
    else body = renderRegionWarPicker(me);
    html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">No war in progress</div>${body}</div>`;
  }

  // ---- history ----
  const histPanel = `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">War History</div>${st.history.length ? st.history.map(h=>renderWarHistoryRow(h, me)).join('') : emptyState('scroll','No wars yet','Wars your country fights will be recorded here.')}</div>`;
  return histPanel + html;      // the record comes first; current war / declare section below it
}

/* ---------------- Country rankings ---------------- */
function renderGlobalRankings(){
  const rv=S.rankingsView, tab=S.rankTab==='countries'?'countries':'players', my=S.char;
  const head=`${pageHero('Rankings','Top players and countries','rankings')}
    <div class="country-module-nav rc-ptabs"><button class="country-module ${tab==='players'?'active':''}" data-action="rank-tab" data-tab="players">${icon('user')}<span>Players</span></button><button class="country-module ${tab==='countries'?'active':''}" data-action="rank-tab" data-tab="countries">${icon('globe')}<span>Countries</span></button></div>`;
  if(!rv || rv.loading) return head+`<div class="empty"><h3>Loading rankings…</h3></div>`;
  if(rv.unavailable) return head+`<div class="panel empty"><h3>Rankings unavailable</h3></div>`;
  if(rv.error) return head+`<div class="panel empty"><h3>Couldn't load rankings</h3><button class="btn btn-primary" data-action="nav" data-screen="rankings">Retry</button></div>`;
  const modes = tab==='players' ? [['level','Level'],['rating','PvP rating'],['dmg','Weekly damage']] : [['level','Total level'],['rating','Avg rating'],['dmg','Weekly damage']];
  const sort = modes.some(m=>m[0]===S.rankSort) ? S.rankSort : 'level';
  const chips=`<div class="rc-filters">${modes.map(m=>`<button class="rc-fchip ${sort===m[0]?'on':''}" data-action="rank-sort" data-sort="${m[0]}">${m[1]}</button>`).join('')}</div>`;
  const medal=['gold','silver','bronze'];
  let rows='', myRank='—', myCoRank='—';
  const pKey = {level:p=>p.level, rating:p=>p.rating, dmg:p=>p.dmg}[sort];
  const cKey = {level:x=>x.totalLevel, rating:x=>x.avgRating, dmg:x=>x.dmg}[sort];
  const pl=(rv.list||[]).filter(p=>sort!=='dmg'||p.dmg>0).slice().sort((a,b)=>pKey(b)-pKey(a)||b.level-a.level||b.rating-a.rating);
  const co=(rv.countries||[]).filter(x=>sort!=='dmg'||x.dmg>0).slice().sort((a,b)=>cKey(b)-cKey(a)||b.totalLevel-a.totalLevel);
  const pIdx=pl.findIndex(p=>p.id===MY_ID); if(pIdx>=0) myRank='#'+(pIdx+1);
  const cIdx=co.findIndex(x=>x.id===my.kingdomId); if(cIdx>=0) myCoRank='#'+(cIdx+1);
  const metricP=p=> sort==='dmg' ? `${icon('sword','style="width:13px;height:13px"')} ${fmtDmg(p.dmg)}` : sort==='rating' ? `${leagueBadge(p.rating,16)} ${p.rating}` : `Lv ${p.level}`;
  const subP=p=> sort==='level' ? `${leagueBadge(p.rating,14)} Rating ${p.rating}` : sort==='rating' ? `Lv ${p.level}` : `Lv ${p.level} · ${leagueBadge(p.rating,14)} Rating ${p.rating}`;
  const metricC=x=> sort==='dmg' ? `${icon('sword','style="width:13px;height:13px"')} ${fmtDmg(x.dmg)}` : sort==='rating' ? `${x.avgRating}` : `Lv ${fmtNum(x.totalLevel)}`;
  if(tab==='players'){
    rows=pl.slice(0,25).map((p,i)=>`<div class="rc-rrow ${medal[i]||''} ${p.id===MY_ID?'me':''}" data-action="view-player" data-id="${esc(p.id)}"><span class="rk">${i+1}</span><div class="rc-gav"><span>${esc(p.username.slice(0,2).toUpperCase())}</span><i>${p.level}</i></div><div class="nm"><b>${esc(p.username)}</b><small>${kingdomFlag(p.kingdomId,14,'margin:0 4px 0 0;vertical-align:-2px')}${esc(countryName(p.kingdomId)||'No country')} · ${subP(p)}</small></div><span class="dm">${metricP(p)}</span></div>`).join('');
  } else {
    rows=co.map((x,i)=>`<div class="rc-rrow ${medal[i]||''} ${x.id===my.kingdomId?'me':''}" data-action="view-country" data-id="${esc(x.id)}"><span class="rk">${i+1}</span><div class="rc-cflag">${kingdomFlag(x.id,30,'margin:0')}</div><div class="nm"><b>${esc(countryName(x.id))}</b><small>${plural(x.players,'player')} · Avg rating ${x.avgRating}</small></div><span class="dm">${metricC(x)}</span></div>`).join('');
  }
  const tiles=`<div class="rc-tiles">${sort==='dmg'?`${statTile('Weekly damages reset in',countdown(weekResetsAt()),'gold')}`:''}${statTile('Your player rank',myRank)}${statTile('Your country rank',myCoRank)}</div>`;
  const empty = sort==='dmg' ? 'No damage dealt this week yet. Strike in a war to appear here.' : 'No players yet.';
  return head+chips+tiles+`<div class="rc-sec">${tab==='players'?'TOP PLAYERS':'TOP COUNTRIES'}</div>${rows||`<p class="faint">${empty}</p>`}`;
}

/* ---------------- Docked World Chat widget ---------------- */
// Persistent floating chat, present on every screen — this is now the
// single access point for general chat (no separate 'chat' nav tab).
let _chatFetchInFlight = false;
function chatNameColor(n){ let h=0; for(const ch of String(n||'')) h=(h*31+ch.charCodeAt(0))%360; return `hsl(${h},70%,72%)`; }
function chatMsgHtml(m){ // used by the new-message popup
  const ini = esc((m.senderName||'?').slice(0,2).toUpperCase());
  return `<div class="rc-msg"><div class="rc-av" style="--p:${xpPct(m)}"><div class="av">${ini}</div><span class="lv">${m.senderLevel||1}</span><span class="fg">${kingdomFlag(m.senderKingdom,16,'margin:0;vertical-align:0')}</span></div><div class="bd"><b style="color:${chatNameColor(m.senderName)}">${esc(m.senderName)}</b><p>${esc(m.text)}</p></div></div>`;
}
const CHAT_ROLE_ICON = {Leader:'crown','Co-Leader':'shield',Officer:'star'};
function chatChannelNow(){ return (S.chatChannel==='country' && S.char && S.char.kingdomId) ? 'country' : 'global'; }
function chatClock(ts){ return new Date(Number(ts)||Date.now()).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
function chatMembers(){
  const kv=S.kingdomView; if(!kv||kv.mode!=='mine') return null;
  const t=Date.now();
  return kv.members.map(m=>Object.assign({}, m, {online: m.id===MY_ID || (t-Number(m.updatedAt||0)) < 5*60*1000}))
    .sort((a,b)=>(b.online-a.online)||(kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole))||((b.level||1)-(a.level||1)));
}
function chatBubbleHtml(m, first, roleOf){
  if(m.system) return `<div class="rc-sys">${esc(m.text)}</div>`;
  const mine = m.senderId ? m.senderId===MY_ID : m.senderName===S.char.username;
  const role = roleOf ? roleOf(m) : null;
  const txt = `<p>${esc(m.text)}</p>`;
  if(!first) return `<div class="rc-msg cont ${mine?'mine':''}"><div class="rc-sp"></div><div class="bd">${txt}</div></div>`;
  const ini = esc((m.senderName||'?').slice(0,2).toUpperCase());
  return `<div class="rc-msg ${mine?'mine':''}"><div class="rc-av" style="--p:${xpPct(m)}" ${m.senderId?`data-action="view-player" data-id="${esc(m.senderId)}"`:''}><div class="av">${ini}</div><span class="lv">${m.senderLevel||1}</span><span class="fg">${kingdomFlag(m.senderKingdom,16,'margin:0;vertical-align:0')}</span></div>
    <div class="bd"><div class="who"><b style="color:${chatNameColor(m.senderName)}">${esc(m.senderName)}</b>${role&&CHAT_ROLE_ICON[role]?`<span class="rl">${icon(CHAT_ROLE_ICON[role])}</span>`:''}<time>${chatClock(m.ts)}</time></div>${txt}</div></div>`;
}
function chatListHtml(msgs, roleOf){
  let prev=null;
  const items = msgs.map(m=>{
    const key = m.senderId || m.senderName;
    const first = !prev || (prev.senderId||prev.senderName)!==key || (m.ts-prev.ts) > 5*60*1000;
    prev = m;
    return chatBubbleHtml(m, first, roleOf);
  });
  return items.reverse().join('');
}
function chatMembersPanel(){
  const list=chatMembers();
  if(!list) return `<div class="faint" style="padding:14px;">Loading citizens…</div>`;
  const row=m=>`<div class="rc-mrow" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer"><div class="rc-gav ${m.online?'on':''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i><u class="dot ${m.online?'on':''}"></u></div><div class="nm"><b>${esc(m.username)}</b><small>${esc(m.kingdomRole||'Recruit')}</small></div>${CHAT_ROLE_ICON[m.kingdomRole]?`<span class="rl">${icon(CHAT_ROLE_ICON[m.kingdomRole])}</span>`:''}</div>`;
  const on=list.filter(m=>m.online), off=list.filter(m=>!m.online);
  return `<div class="rc-mpanel"><div class="rc-sec" style="margin-top:4px">ONLINE — ${on.length}</div>${on.map(row).join('')||'<p class="faint">Nobody online.</p>'}${off.length?`<div class="rc-sec">OFFLINE — ${off.length}</div>${off.map(row).join('')}`:''}</div>`;
}
function renderChatWidget(){
  const c=S.char, hasCountry=!!(c&&c.kingdomId);
  const unreadG=S.chatUnread||0, unreadK=S.chatUnreadK||0, total=unreadG+unreadK;
  if(!S.chatWidgetOpen){
    return `<button class="chat-widget-toggle" data-action="chat-widget-toggle" title="Chat">${icon('chat')}${total?`<span class="chat-badge">${total>9?'9+':total}</span>`:''}</button>`;
  }
  const ch=chatChannelNow();
  let body='', sub='';
  if(ch==='global'){
    if(S.generalChat===null && !_chatFetchInFlight){ _chatFetchInFlight=true; loadGeneralChat().finally(()=>{ _chatFetchInFlight=false; }); }
    sub='Everyone, every country';
    body = S.generalChatUnavailable ? `<div class="faint" style="padding:12px;">Chat unavailable.</div>`
      : S.generalChat===null ? `<div class="faint" style="padding:12px;">Loading chat...</div>`
      : (chatListHtml(S.generalChat) || '<div class="faint" style="padding:12px;">No messages yet. Say hello.</div>');
  } else {
    const kv=S.kingdomView;
    if(!kv && !_kvChatFetch){ _kvChatFetch=true; loadKingdomView().finally(()=>{ _kvChatFetch=false; }); }
    const mem=chatMembers();
    const roleMap={}, lvlMap={}; (kv&&kv.members||[]).forEach(m=>{ roleMap[m.id]=m.kingdomRole; lvlMap[m.id]=m.level; });
    if(mem) sub=`${plural(mem.length,'citizen')} · ${mem.filter(m=>m.online).length} online`; else sub='Loading…';
    if(S.chatMembersOpen) body=chatMembersPanel();
    else if(!kv || kv.loading) body=`<div class="faint" style="padding:12px;">Loading country chat...</div>`;
    else if(kv.mode!=='mine') body=`<div class="faint" style="padding:12px;">Country chat unavailable.</div>`;
    else {
      const msgs=(kv.kingdom.chat||[]).map(m=>Object.assign({senderKingdom:c.kingdomId, senderLevel:lvlMap[m.senderId]||m.senderLevel||1}, m));
      body = chatListHtml(msgs, m=>roleMap[m.senderId]) || '<div class="faint" style="padding:12px;">No messages yet. Rally your country!</div>';
    }
  }
  const strip = ch==='country' && chatMembers() ? `<div class="rc-mstrip">${chatMembers().slice(0,8).map(m=>`<div class="rc-gav sm ${m.online?'on':''}" title="${esc(m.username)}" data-action="view-player" data-id="${esc(m.id)}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><u class="dot ${m.online?'on':''}"></u></div>`).join('')}<button class="rc-mmore ${S.chatMembersOpen?'on':''}" data-action="chat-members-toggle">${icon('users')} ${S.chatMembersOpen?'Back to chat':'All citizens'}</button></div>` : '';
  const title = ch==='country' ? `${kingdomFlag(c.kingdomId,18,'margin:0 8px 0 0;vertical-align:-3px')}${esc(countryName(c.kingdomId))}` : 'World Chat';
  return `
  <div class="chat-widget-panel rc-chatpanel">
    <div class="rc-ch-head"><div><b>${title}</b><small>${sub}</small></div><button class="chat-widget-close" data-action="chat-widget-toggle">&times;</button></div>
    <div class="rc-chat-tabs">
      <button class="${ch==='global'?'on':''}" data-action="chat-channel" data-ch="global">World${unreadG?`<i class="rc-dot">${unreadG>9?'9+':unreadG}</i>`:''}</button>
      <button class="${ch==='country'?'on':''}" data-action="chat-channel" data-ch="country" ${hasCountry?'':'disabled title="Join a country first"'}>${hasCountry?kingdomFlag(c.kingdomId,14,'margin:0 6px 0 0;vertical-align:-2px'):''}Country${unreadK?`<i class="rc-dot">${unreadK>9?'9+':unreadK}</i>`:''}</button>
    </div>
    ${strip}
    <div class="log ${S.chatMembersOpen&&ch==='country'?'plain':''}" id="world-chat-log">${body}</div>
    <div class="chat-widget-input-row" ${S.chatMembersOpen&&ch==='country'?'style="display:none"':''}>
      <input type="text" id="world-chat-input" maxlength="200" placeholder="${ch==='country'?'Message your country…':'Say something to the world…'}">
      <button class="btn btn-primary" data-action="chat-widget-send">Send</button>
    </div>
  </div>`;
}
let _kvChatFetch = false;

let _marketFetchInFlight = false;
function renderMarket(){
  const c = S.char;
  if(S.marketListings===null){
    if(!_marketFetchInFlight){ _marketFetchInFlight = true; loadMarketListings().finally(()=>{ _marketFetchInFlight = false; }); }
    return `${pageHero('Market','','market')}<div class="empty"><h3>Loading market...</h3></div>`;
  }
  if(S.marketUnavailable){
    return `
    ${pageHero('Market','','market')}
    <div class="panel empty">
      <h3>Shared storage unavailable</h3>
      <p class="faint">The player market needs real cross-player storage, which this view doesn't have access to. No fake listings are shown here.</p>
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
          <div class="lvl">Seller: ${kingdomFlag(l.sellerKingdom)}${esc(l.sellerName)} &middot; ${l.pricePerUnit} ${resourceIcon('gold',13)}${l.qty>1?' each':''} &middot; Total: ${fmtNum(l.totalPrice)} ${resourceIcon('gold',13)}</div>
        </div>
        <button class="btn btn-sm ${isMine?'':'btn-primary'}" data-action="buy-listing" data-id="${l.id}" ${isMine?'disabled title="This is your own listing"':''}>${isMine?'Yours':'Buy'}</button>
      </div>`;
    }).join('') || emptyState('scroll','No listings','Nothing is for sale here right now.',{action:'market-tab',tab:'sell',label:'Sell an item'});
    body = filterRow + cards;
  } else if(S.marketTab==='sell'){
    const kinds = ['resource','material','consumable','equipment'];
    const kindRow = `<div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">${kinds.map(k=>`<button class="btn btn-sm ${S.marketSellKind===k?'btn-accent':''}" data-action="market-sell-kind" data-kind="${k}">${MARKET_KIND_LABELS[k]}</button>`).join('')}</div>`;
    const items = sellableByKind(c, S.marketSellKind);
    const pickedId = items.some(i=>i.id===S.marketSellItem) ? S.marketSellItem : (items[0] ? items[0].id : '');
    const picker = items.map(i=>`<button type="button" class="mk-pick ${i.id===pickedId?'on':''}" data-action="market-pick" data-id="${esc(i.id)}">${marketIcon(S.marketSellKind,i.itemId,i.gear,28)}<span class="mk-pick-name">${esc(i.name)}</span>${i.gear&&i.gear.stats?`<span class="rc-chips2" style="justify-content:center;">${gearStatChips(i.gear.stats)}</span>`:''}<small>have ${i.have}</small></button>`).join('');
    const showQty = S.marketSellKind!=='equipment';
    body = `${kindRow}
    <div class="panel">
      <div class="panel-title">List an item</div>
      ${items.length===0 ? '<p class="faint">You have nothing of this type to sell.</p>' : `
      <label class="field">Item</label>
      <input type="hidden" id="market-sell-item" value="${esc(pickedId)}">
      <div class="mk-picker">${picker}</div>
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
        <div class="lvl">${l.pricePerUnit} ${resourceIcon('gold',13)}${l.qty>1?' each':''} &middot; Total: ${fmtNum(l.totalPrice)} ${resourceIcon('gold',13)}</div>
      </div>
      <button class="btn btn-sm btn-danger" data-action="cancel-listing" data-id="${l.id}">Cancel</button>
    </div>`).join('') || emptyState('scroll','No active listings','Anything you list will show up here.',{action:'market-tab',tab:'sell',label:'List an item'});
  }

  return `
  ${pageHero('Market','Buy and sell resources, materials, potions and gear with other players','market')}
  ${tabs}
  ${body}`;
}

function renderPvp(){
  const c = S.char;
  const now = Date.now();
  const protectedMs = (c.pvp.protectedUntil||0) - now;
  const tot = c.pvp.wins + c.pvp.losses;
  const head = `${pageHero('PvP','Arena — fight other players to climb the ladder','pvp')}
    <div class="rc-tiles" style="margin-top:12px">${statTile('Rating',Math.round(c.pvp.rating),'gold')}${statTile('Wins',c.pvp.wins,'green')}${statTile('Losses',c.pvp.losses)}${statTile('Win rate',tot?Math.round(c.pvp.wins/tot*100)+'%':'—')}</div>${leaguePanel(c.pvp.rating)}`;
  const msg=(ic,t,p,extra)=>`${head}<div class="rc-empty"><div class="ei">${icon(ic)}</div><h3>${t}</h3><p>${p}</p>${extra||''}</div>`;
  if(protectedMs > 0) return msg('shield','Under protection',"You're shielded from attack after your last loss.",`<div class="rc-big">${fmtMs(protectedMs)}</div>`);
  if(c.energyCur < PVP_ENERGY_COST) return msg('bolt','Not enough energy',`PvP battles cost ${PVP_ENERGY_COST} Energy. Wait for it to regenerate.`);
  if(!S.pvpCandidates) return msg('target','Ready to fight?',`Search for an opponent near your level and rating. Costs ${PVP_ENERGY_COST} Energy.`,'<button class="btn btn-primary" data-action="find-opponents">Find Opponent</button>');
  const cards = S.pvpCandidates.map((o,i)=>{
    const oc = o.class ? CLASSES[o.class] : null, rt=Math.round(o.pvp?.rating||1000), diff=rt-Math.round(c.pvp.rating);
    return `<div class="rc-opp"><div class="rc-gav" ${o.id&&!o.isBot?`data-action="view-player" data-id="${esc(o.id)}"`:''}><span>${esc((o.username||'?').slice(0,2).toUpperCase())}</span><i>${o.level}</i></div>
      <div class="nm"><b>${kingdomFlag(o.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(o.username)}</b><small>${oc?oc.name+' · ':''}${o.isBot?'Practice bot · no rating':leagueBadge(rt,14)+' Rating '+rt}</small></div>
      <span class="rc-diff ${diff>=0?'up':'down'}">${diff>=0?'+':''}${diff}</span>
      <button class="btn btn-primary btn-sm" data-action="fight-opponent" data-idx="${i}">Fight</button></div>`;
  }).join('');
  return `${head}<div class="rc-sec">MATCHED OPPONENTS</div>${cards}<button class="btn" style="margin-top:6px" data-action="find-opponents">Search Again</button>`;
}

/* ---------------- Combat screen ---------------- */
function renderCombat(){
  const cb = S.combat;
  if(!cb) return '';
  const me = cb.me, foe = cb.foe;
  const fighterBlock = (f, side)=>{
    const buffs = f.buffs.map(b=>`<span class="buff-chip">${b.tag} ${b.amount>0?'+':''}${b.amount} ${b.stat}</span>`).join('');
    return `<div class="fighter ${side}">
      <h4>${esc(f.label)}</h4>
      <div class="cls">${f.class?itemIcon(CLASSES[f.class].icon,14,'margin-right:3px;')+CLASSES[f.class].name+' &middot; Lv.'+f.level:'Lv.'+f.level+' Monster'}</div>
      <div class="sb-bar-label"><span>HP</span><span>${Math.max(0,Math.round(f.hp))}/${f.maxHp}</span></div>
      <div class="bar-track" style="margin-bottom:8px;"><div class="bar-fill bar-hp" style="width:${clamp(f.hp/f.maxHp*100,0,100)}%"></div></div>
      ${f.resourceMax>0?`<div class="sb-bar-label"><span>${f.resourceName}</span><span>${Math.round(f.resource)}/${f.resourceMax}</span></div>
      <div class="bar-track"><div class="bar-fill bar-mana" style="width:${clamp(f.resource/f.resourceMax*100,0,100)}%"></div></div>`:''}
      <div class="buff-row">${buffs}</div>
    </div>`;
  };
  let actionsHtml = '';
  if(cb.ended){
    const resultLabel = cb.result==='win' ? '<span class="badge-win">Victory</span>' : cb.result==='lose' ? '<span class="badge-loss">Defeat</span>' : cb.result==='flee' ? '<span class="badge-draw">Fled</span>' : '<span class="badge-draw">Draw</span>';
    actionsHtml = `
    <div class="panel" style="margin-top:14px;">
      <div class="panel-title">${resultLabel}</div>
      <div class="stat-list">
        ${cb.rewardLines.map(l=>`<div style="grid-column:1/-1;"><span>${l.label}</span><b>${l.value}</b></div>`).join('')}
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:14px;" data-action="close-combat">Continue</button>
    </div>`;
  } else {
    const consumables = S.char.inventory.filter(i=>i.kind==='consumable');
    const skillBtns = me.skills.map(s=>{
      const lvl = S.char.classSkills[s.id]||0;
      const afford = me.resource >= s.cost;
      return `<button class="btn act-btn" data-action="combat-skill" data-skill="${s.id}" ${afford?'':'disabled'}>
        <span class="n">${s.name}</span><span class="d">${s.cost} ${me.resourceName} &middot; Lv.${lvl}</span>
      </button>`;
    }).join('');
    const itemBtn = consumables.length ? `<button class="btn act-btn" data-action="combat-item-menu"><span class="n">Use Item</span><span class="d">${consumables.length} available</span></button>` : `<button class="btn act-btn" disabled><span class="n">Use Item</span><span class="d">None in bag</span></button>`;
    actionsHtml = `
    <div class="actions">
      <button class="btn act-btn btn-primary" data-action="combat-attack"><span class="n">Attack</span><span class="d">Basic strike</span></button>
      ${skillBtns}
      <button class="btn act-btn" data-action="combat-defend"><span class="n">Defend</span><span class="d">Reduce incoming damage</span></button>
      ${itemBtn}
      ${cb.mode==='pve' ? `<button class="btn act-btn btn-danger" data-action="combat-flee"><span class="n">Flee</span><span class="d">End the fight</span></button>` : ''}
    </div>
    ${S.showItemMenu ? `<div class="panel" style="margin-top:10px;">
      <div class="panel-title">Choose an item</div>
      ${consumables.map(it=>`<button class="btn btn-sm" style="margin:0 6px 6px 0;" data-action="combat-item" data-uid="${it.uid}">${it.name} (${it.qty})</button>`).join('')}
    </div>`:''}
    `;
  }
  return `
  ${pageHero(cb.mode==='pve'?(cb.boss?'Zone Boss':cb.elite?'Elite Hunt':'Battle'):'PvP Duel','Round '+cb.round+' of '+cb.maxRounds,'pvp')}
  <div class="arena">
    ${fighterBlock(me,'me')}
    <div class="vs">VS</div>
    ${fighterBlock(foe,'foe')}
  </div>
  <div class="log" id="combat-log">${cb.log.slice().reverse().map(l=>`<div class="log-line ${l.cls}">${esc(l.text)}</div>`).join('')}</div>
  ${actionsHtml}
  `;
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
let _mapRenderT = 0;
function render(){
  // render() rebuilds #app = the map canvas is pulled out of the page. Chat messages and the 20s regen tick call render() all the time,
  // so wait until the finger / mouse is off the map, otherwise the drag or pinch dies in the middle.
  if(S.screen==='map' && typeof WorldMap!=='undefined' && WorldMap.busy && WorldMap.busy()){ clearTimeout(_mapRenderT); _mapRenderT = setTimeout(render, 250); return; }
  applyColorScheme(S.char ? S.char.colorScheme : null);
  const app = document.getElementById('app');
  if(S.screen==='loading'){
    app.innerHTML = `<div class="loader-wrap">
      <div class="loader-mark">${icon('crown','style="width:100%;height:100%;stroke:var(--brass)"')}</div>
      <p>ENTERING REALMCLASH MMO</p>
    </div>`;
    return;
  }
  if(S.screen==='login'){
    app.innerHTML = renderLogin();
    return;
  }
  if(S.screen==='create'){
    app.innerHTML = renderCreate();
    bindCreateEvents();
    return;
  }
  let body = '';
  if(S.screen==='world') body = renderWorld();
  else if(S.screen==='map') body = renderMapScreen();
  else if(S.screen==='war-detail') body = renderWarDetail();
  else if(S.screen==='country-view') body = renderCountryView();
  else if(S.screen==='player-view') body = renderPlayerView();
  else if(S.screen==='rankings') body = renderGlobalRankings();
  else if(S.screen==='adventure') body = renderAdventure();
  else if(S.screen==='zone-detail') body = renderZoneDetail();
  else if(S.screen==='road') body = renderRoad();
  else if(S.screen==='combat') body = renderCombat();
  else if(S.screen==='pvp') body = renderPvp();
  else if(S.screen==='kingdom') body = renderKingdom();
  else if(S.screen==='market') body = renderMarket();
  else if(S.screen==='craft') body = renderCraft();
  else if(S.screen==='inventory') body = renderInventory();
  else if(S.screen==='profile') body = renderProfile();

  const navActive = (S.screen==='war-detail'||S.screen==='country-view'||S.screen==='player-view') ? 'world' : S.screen==='combat' ? (S.combat && S.combat.mode==='pvp' ? 'pvp':'adventure') : ((S.screen==='road'||S.screen==='zone-detail') ? 'adventure' : S.screen);
  // 'settings' no longer has its own nav slot — it lives under Profile's Settings tab.

  app.innerHTML = `
  <div class="app-shell">
    <div class="sidebar">
      <div class="brand">
        <div class="brand-mark">${icon('sword','style="width:100%;height:100%;stroke:#e0983a"')}</div>
        <div class="brand-name">REALMCLASH</div>
      </div>
      <div class="navlist">${renderNav(navActive)}</div>
      <div class="nav-foot">LIVE WORLD · MMO STRATEGY</div>
    </div>
    <div class="main">
      ${renderStatusBar()}
      <div class="view">${body}</div>
    </div>
  </div>
  ${renderDrawer(navActive)}
  ${S.char ? renderChatWidget() : ''}
  ${(S.chatPop && !S.chatWidgetOpen) ? `<button class="chat-pop" data-action="chat-widget-toggle">${chatMsgHtml(S.chatPop)}</button>` : ''}
  ${S.toast ? `<div class="toast">${esc(S.toast)}</div>` : ''}
  ${renderDialog()}
  `;
  if(S.char){ startChatListener(); startKingdomChatListener(); }
  if(S.screen==='map') mountMapScreen();
  if(S.screen==='world'){
    const cs=document.getElementById('country-search');
    if(cs){
      cs.value = S.countrySearch || '';
      const apply=()=>{ const q=cs.value.trim().toLowerCase(); S.countrySearch=cs.value; let n=0;
        document.querySelectorAll('#rc-countries .rc-country').forEach(b=>{ const ok=!q||b.dataset.name.includes(q); b.style.display=ok?'':'none'; if(ok) n++; });
        const none=document.getElementById('country-none'); if(none) none.style.display=n?'none':''; };
      cs.addEventListener('input', apply); apply();
    }
  }
  if(S.chatWidgetOpen){
    const input = document.getElementById('world-chat-input');
    if(input){
      input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendChatCurrent(input.value); } });
    }
  }
  if(S.screen==='profile' && S.profileTab==='settings'){
    bindSettingsEvents();
  }
}
