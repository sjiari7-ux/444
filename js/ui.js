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
  chatWidgetOpen: false, // WarEra-style docked chat, floats over every screen — the only chat entry point now
  marketListings: null,
  marketTab: 'browse',
  marketFilter: 'all',
  marketSellKind: 'resource',
  craftQty: {},
  zoneDetailId: null,
  toast: null,
  toastTimer: null,
  craftFilter: null,
  kingdomTab: 'overview',
  countryState: null, // {status:'loading'|'ready'|'error'|'unavailable', data} from the getCountryState Cloud Function
  serverOffset: 0,    // serverNow - Date.now(), so countdowns follow SERVER time
  _warTarget: '',
  _rewardPick: null,
  worldState: null,   // {status, data} public wars/countries — see loadWorldState()
  warTab: 'active',
  modal: null,        // {type:'war'|'country', id}
  notifs: [],         // recent toasts, shown in the HUD bell panel
  notifOpen: false,
  moreOpen: false,
  profileTab: 'stats', // 'stats' | 'settings' — Profile and Settings share one nav slot
};

const NOTIF_TYPES = {
  war:{icon:'swords', cls:'nt-war', label:'War'}, battle:{icon:'target', cls:'nt-battle', label:'Battle'},
  market:{icon:'coin', cls:'nt-market', label:'Market'}, success:{icon:'star', cls:'nt-success', label:'Success'},
  country:{icon:'flag', cls:'nt-country', label:'Country'}, system:{icon:'bell', cls:'nt-system', label:'System'},
};
function guessNotifType(msg){
  const m = String(msg).toLowerCase();
  if(/\bwar\b|strike|declare/.test(m)) return 'war';
  if(/listing|sold|market|bought|purchase/.test(m)) return 'market';
  if(/craft|forged|level up|complete|victory/.test(m)) return 'success';
  if(/kingdom|country|joined|left/.test(m)) return 'country';
  return 'system';
}
function showToast(msg, type){
  type = NOTIF_TYPES[type] ? type : guessNotifType(msg);
  S.toast = {msg, type};
  S.notifs.unshift({msg, type, at:Date.now()});
  if(S.notifs.length > 25) S.notifs.length = 25;
  S.unread = (S.unread||0) + 1;
  render();
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(()=>{ S.toast=null; render(); }, 2800);
}

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
  const scheme = getColorScheme(id);
  const root = document.documentElement.style;
  root.setProperty('--brass', scheme.base);
  root.setProperty('--brass-bright', scheme.bright);
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
  <div class="loader-wrap" style="padding:20px;">
    <div class="auth-card">
      ${icon('globe','class="auth-logo"')}
      <h1 class="auth-title">ARCADIA</h1>
      <div class="auth-tag">A living world of nations</div>
      <div class="panel" style="text-align:left;">
        <p class="muted" style="margin-bottom:var(--s-4);">Sign in with Google to enter the world. Your character, country and progress are saved to your account.</p>
        <button class="btn btn-primary btn-block" data-action="google-signin" style="padding:13px;">Sign in with Google</button>
      </div>
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
  <div class="loader-wrap" style="min-height:100vh; padding:20px;">
    <div style="max-width:780px; width:100%;">
      <div style="text-align:center; margin-bottom:26px;">
        ${icon('globe','class="auth-logo" style="width:44px;height:44px;"')}
        <h1 class="auth-title" style="font-size:32px;">ARCADIA</h1>
        <div class="auth-tag" style="margin-bottom:0;">Forge your character &middot; choose your nation</div>
      </div>
      <div class="panel" style="margin-bottom:16px;">
        <label class="field">Username</label>
        <input type="text" id="username-input" maxlength="18" placeholder="Choose a name (min. 3 characters)" value="${esc(state.username)}">
        <p class="faint" style="margin-top:6px;">At least 3 characters, and must be unique — no two players can share a name.</p>
      </div>
      <div class="panel-title" style="margin-bottom:10px;">1 &middot; Choose your class</div>
      <div class="grid grid-3" style="margin-bottom:20px;">${cards}</div>
      <div class="panel-title" style="margin-bottom:10px;">2 &middot; Choose your country</div>
      <input type="text" id="country-search" placeholder="Search countries..." value="${esc(state.countrySearch||'')}" style="margin-bottom:10px;">
      ${state.countryId ? `<p class="faint" style="margin-bottom:10px;">Selected: ${kingdomFlag(state.countryId)}${KINGDOMS.find(k=>k.id===state.countryId).name}</p>` : ''}
      <div id="country-grid" class="grid grid-3" style="margin-bottom:20px; max-height:360px; overflow-y:auto;">${renderCountryCards(state)}</div>
      <button class="btn btn-primary btn-block" data-action="create-character" ${(!state.classId || !state.countryId)?'disabled':''} style="padding:14px;">Begin your journey</button>
    </div>
  </div>`;
}

/* ---------------- Shell / nav ---------------- */
const NAV_GROUPS = [
  {label:'World',    items:[{id:'home', label:'World', icon:'globe'}, {id:'wars', label:'War Center', icon:'swords'}]},
  {label:'Military', items:[{id:'pvp', label:'PvP Arena', icon:'target'}, {id:'adventure', label:'Adventure', icon:'map'}]},
  {label:'Faction',  items:[{id:'kingdom', label:'Country', icon:'flag'}]},
  {label:'Economy',  items:[{id:'market', label:'Market', icon:'coin'}, {id:'craft', label:'Crafting', icon:'flask'}]},
  {label:'Player',   items:[{id:'inventory', label:'Inventory', icon:'bag'}, {id:'profile', label:'Profile', icon:'user'}]},
];
const NAV = NAV_GROUPS.reduce((a,g)=>a.concat(g.items), []);
const MOBILE_TABS = [
  {id:'home', label:'World', icon:'globe'}, {id:'wars', label:'Wars', icon:'swords'},
  {id:'pvp', label:'PvP', icon:'target'}, {id:'market', label:'Market', icon:'coin'},
  {id:'profile', label:'Player', icon:'user'},
];
const SCREEN_ZONE = {home:'world', wars:'war', pvp:'pvp', combat:'pvp', adventure:'pve', 'zone-detail':'pve', road:'pve',
  kingdom:'kingdom', market:'market', craft:'market', inventory:'player', profile:'player'};

/* ---- shared helpers (presentation only) ---- */
function worldData(){ return S.worldState && S.worldState.data; }
function liveWars(){ const w = worldData(); return w ? w.live : []; }
let _worldFetchInFlight = false;
function ensureWorld(){
  if(S.worldState || _worldFetchInFlight) return;
  _worldFetchInFlight = true;
  loadWorldState().finally(()=>{ _worldFetchInFlight = false; });
}
function cFlag(id, cls){
  const k = KINGDOMS.find(x=>x.id===id);
  return `<span class="war-flag ${cls||''}">${k ? `<img src="https://flagcdn.com/w80/${k.flag}.png" alt="">` : ''}</span>`;
}
function agoText(ts){
  const s = Math.max(0, Math.floor((srvNow()-ts)/1000));
  if(s < 60) return 'just now';
  if(s < 3600) return Math.floor(s/60)+' min ago';
  if(s < 86400) return Math.floor(s/3600)+' h ago';
  return Math.floor(s/86400)+' d ago';
}
function eventView(e){
  const A = `<b>${esc(countryName(e.a))}</b>`, B = `<b>${esc(countryName(e.b))}</b>`;
  switch(e.type){
    case 'WAR_STARTED': return {ic:'swords', cls:'feed-war', t:`${A} declared war on ${B}`};
    case 'WAR_ROUND_STARTED': return {ic:'flag', cls:'feed-war', t:`Round ${e.round} began: ${A} vs ${B}`};
    case 'WAR_ROUND_ENDED': return {ic:'trophy', cls:'feed-win', t:`${A} won Round ${e.round} against ${B}`};
    case 'WAR_ENDED': return {ic:'crown', cls:'feed-win', t:`${A} won the war against ${B}`};
    case 'WAR_TAX_SET': return {ic:'coin', cls:'feed-econ', t:`${A} set ${esc(resName(e.resource))} as war tax on ${B}`};
  }
  return {ic:'globe', cls:'feed-world', t:'World event'};
}
function renderFeed(events, limit){
  if(!events || !events.length) return `<p class="faint">No world events yet. Wars and their results appear here as they happen.</p>`;
  return `<div class="feed">${events.slice(0,limit).map(e=>{
    const v = eventView(e);
    return `<div class="feed-item" data-action="war-view" data-war="${esc(e.warId)}"><div class="feed-ic ${v.cls}">${icon(v.ic)}</div><div><div class="t">${v.t}</div><div class="ago">${agoText(e.at)}</div></div></div>`;
  }).join('')}</div>`;
}

/* ---- war card (used on Home, War Center, modal list) ---- */
function warCardHtml(w){
  const a = w.attackerCountryId, d = w.defenderCountryId, my = S.char && S.char.kingdomId;
  const sa = (w.finalScore||{})[a]||0, sd = (w.finalScore||{})[d]||0;
  const cur = (w.rounds||[])[(w.rounds||[]).length-1];
  const prep = w.status==='preparing', fin = w.status==='finished';
  const chip = prep ? `<span class="chip prep">${icon('clock')}Preparing</span>` : fin ? `<span class="chip ended">Ended</span>` : `<span class="chip live">Live</span>`;
  const roundNo = cur ? cur.round : (w.rounds||[]).length;
  const pips = [1,2,3].map(n=>`<i class="round-pip ${n<roundNo||(fin&&n<=roundNo)?'done':(n===roundNo&&!fin&&!prep?'cur':'')}"></i>`).join('');
  let timer = '';
  if(prep) timer = `<div class="war-timer"><small>Round 1 starts in</small>${countdown(w.startsAt)}</div>`;
  else if(!fin && cur) timer = `<div class="war-timer"><small>Round ${cur.round} ends in</small>${countdown(cur.endsAt)}</div>`;
  else if(fin) timer = `<div class="war-timer"><small>Finished</small>${agoText(w.endedAt||0)}</div>`;
  let split = '';
  const dm = w._liveDamage;
  if(!fin && !prep && dm){
    const da = dm[a]||0, dd = dm[d]||0, tot = da+dd;
    split = `<div class="war-split" title="Round damage"><i class="a" style="width:${tot?da/tot*100:50}%"></i><i class="b" style="width:${tot?dd/tot*100:50}%"></i></div>`;
  }
  const winA = fin && w.winnerCountryId===a, winD = fin && w.winnerCountryId===d;
  return `<div class="war-card ${fin?'done':''} ${(a===my||d===my)?'mine':''}">
    <div class="war-top">${chip}<div class="round-pips" title="Rounds">${pips}</div></div>
    <div class="war-sides">
      <div class="war-side ${winA?'win':''}" data-action="country-view" data-country="${a}">${cFlag(a)}<div style="min-width:0"><div class="nm">${esc(countryName(a))}</div><div class="role">Attacker</div></div></div>
      <div class="war-mid"><div class="war-score num">${sa}<i>:</i>${sd}</div><div class="war-vs">VS</div></div>
      <div class="war-side r ${winD?'win':''}" data-action="country-view" data-country="${d}">${cFlag(d)}<div style="min-width:0"><div class="nm">${esc(countryName(d))}</div><div class="role">Defender</div></div></div>
    </div>
    ${split}
    <div class="war-bottom">${timer}<button class="btn btn-sm" data-action="war-view" data-war="${esc(w.id)}">View war</button></div>
  </div>`;
}
function worldStatePanel(){
  const ws = S.worldState;
  if(!ws || (ws.status==='loading' && !ws.data)) return `<div class="skeleton"></div><div class="skeleton"></div>`;
  if(ws.status==='unavailable') return `<div class="panel empty"><h3>World offline</h3><p class="faint">Live world data needs the shared game servers, which this session can't reach.</p></div>`;
  if(!ws.data) return `<div class="panel empty"><h3>Couldn't reach the world</h3><button class="btn btn-primary" style="margin-top:10px;" data-action="world-refresh">Retry</button></div>`;
  return null;
}

/* ---------------- HUD ---------------- */
function renderHud(){
  const c = S.char, eff = effectiveStats(c);
  const initials = c.username.slice(0,2).toUpperCase();
  const live = liveWars().length;
  const bar = (ic, cur, max, cls, extra)=>`<div class="hud-bar"><div class="top"><span>${icon(ic)}<span class="hud-val">${Math.floor(cur)}/${max}</span></span><span class="regen">${extra||''}</span></div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${clamp(cur/max*100,0,100)}%"></div></div></div>`;
  return `
  <header class="hud">
    <div class="hud-brand">${icon('globe')}ARCADIA</div>
    <button class="hud-pill hide-m" data-action="nav" data-screen="home" aria-label="World">${icon('globe')}World</button>
    <button class="hud-pill ${live?'war':''}" data-action="nav" data-screen="wars" aria-label="Wars">${live?'<i class="dot"></i>':''}${icon('swords')}<span class="hud-val">${live}</span><span class="hide-m">Wars</span></button>
    <div class="hud-bars">
      ${bar('heart', c.hpCur, eff.maxHp, 'bar-hp', '')}
      ${bar('bolt', c.energyCur, eff.maxEnergy, 'bar-energy', c.energyCur>=eff.maxEnergy?'Full':'+'+energyRegenPerHour(eff.maxEnergy)+'/h')}
      ${bar('drop', c.manaCur, eff.maxMana, 'bar-mana', '')}
      ${bar('star', c.xp, xpNeeded(c.level), 'bar-xp', 'Lv '+c.level)}
    </div>
    <div class="hud-spacer"></div>
    <span class="hud-pill show-m" title="Energy">${icon('bolt')}<span class="hud-val">${Math.floor(c.energyCur)}</span></span>
    <span class="hud-pill hud-coins" title="Gold">${icon('coin')}<span class="hud-val">${fmtNum(c.gold)}</span></span>
    <button class="hud-pill hud-bell" data-action="toggle-notifs" aria-label="Notifications">${icon('bell')}${S.unread?`<span class="count">${Math.min(S.unread,9)}</span>`:''}</button>
    <button class="hud-avatar" data-action="nav" data-screen="profile" aria-label="Profile">${initials}<span class="lvl">${c.level}</span></button>
  </header>`;
}
function renderNotifPanel(){
  if(!S.notifOpen) return '';
  const rows = S.notifs.map(n=>{ const t = NOTIF_TYPES[n.type]||NOTIF_TYPES.system;
    return `<div class="notif ${t.cls}"><div class="ic">${icon(t.icon)}</div><div>${esc(n.msg)}<small>${t.label} &middot; ${agoText(n.at)}</small></div></div>`; }).join('');
  return `<div class="notif-panel" role="dialog" aria-label="Notifications"><div class="notif-head"><span>Notifications</span><button class="btn btn-ghost btn-icon" data-action="toggle-notifs" aria-label="Close">${icon('close')}</button></div>${rows || '<div class="empty" style="padding:26px;"><p class="faint">Nothing new. Battles, crafts and market sales appear here.</p></div>'}</div>`;
}

function renderNav(activeId){
  const live = liveWars().length;
  return NAV_GROUPS.map(g=>`<div class="nav-group">${g.label}</div>`+g.items.map(n=>
    `<button class="navbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}" ${activeId===n.id?'aria-current="page"':''}>${icon(n.icon)}<span>${n.label}</span>${n.id==='wars'&&live?`<span class="nav-badge">${live}</span>`:''}</button>`).join('')).join('');
}
function renderTabbar(activeId){
  const live = liveWars().length;
  const more = !MOBILE_TABS.some(t=>t.id===activeId);
  return MOBILE_TABS.map(n=>`<button class="tabbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span>${n.id==='wars'&&live?`<b class="nav-badge">${live}</b>`:''}</button>`).join('')
    + `<button class="tabbtn ${more?'active':''}" data-action="toggle-more">${icon('dots')}<span>More</span></button>`;
}
function renderMoreSheet(activeId){
  if(!S.moreOpen) return '';
  const rest = NAV.filter(n=>!MOBILE_TABS.some(t=>t.id===n.id));
  return `<div class="sheet-backdrop" data-action="toggle-more"></div><div class="sheet" role="dialog" aria-label="More">${rest.map(n=>`<button class="navbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span></button>`).join('')}<button class="navbtn" data-action="open-chat">${icon('chat')}<span>World Chat</span></button></div>`;
}

/* ---------------- Modals ---------------- */
function renderModal(){
  const m = S.modal; if(!m) return '';
  const wd = worldData();
  if(m.type==='war'){
    const w = wd && wd.live.concat(wd.finished).find(x=>x.id===m.id);
    if(!w) return modalShell('War', `<p class="faint">This war is no longer in the public record.</p>`);
    const a = w.attackerCountryId, d = w.defenderCountryId, my = S.char.kingdomId;
    const rounds = (w.rounds||[]).map(r=>{
      const dm = r.damage || (r.status==='active' && w._liveDamage) || {};
      const res = r.status==='done' ? `<b class="badge-win">${esc(countryName(r.winner))}</b>` : `<span class="chip live">Live</span>`;
      return `<div class="skill-row"><div><b>Round ${r.round}</b><div class="faint">${esc(countryName(a))} ${fmtNum(dm[a]||0)} &ndash; ${fmtNum(dm[d]||0)} ${esc(countryName(d))}</div></div><div>${res}</div></div>`;
    }).join('') || `<p class="faint">Round 1 has not started yet.</p>`;
    const tax = w.status==='finished' && w.selectedResource
      ? `<div class="stat-list" style="margin-top:12px;"><div><span>War tax</span><b>${resourceIcon(w.selectedResource,14)} ${esc(resName(w.selectedResource))}</b></div><div><span>Rate</span><b>${w.warTaxRate}% for ${w.warTaxDurationDays} days</b></div></div>` : '';
    const mine = (a===my||d===my) ? `<button class="btn btn-danger btn-block" style="margin-top:14px;" data-action="goto-country-war">${icon('swords','style="width:16px;height:16px"')} Open your war room</button>` : '';
    return modalShell('War report', `${warCardHtml(w)}<div class="panel-title" style="margin-top:6px;">Rounds</div>${rounds}${tax}
      <div class="faint" style="margin-top:10px;">Declared ${agoText(w.declaredAt||0)}${w.declaredAt?'':''}</div>${mine}`, true);
  }
  if(m.type==='country'){
    const id = m.id, k = KINGDOMS.find(x=>x.id===id); if(!k) return '';
    const cs = wd && wd.countries[id], eco = wd && wd.econ[id];
    const wars = wd ? wd.live.filter(w=>w.attackerCountryId===id||w.defenderCountryId===id) : [];
    const res = eco && eco.resources ? Object.entries(eco.resources).filter(([,v])=>v>0).sort((x,y)=>y[1]-x[1]).slice(0,6) : [];
    return modalShell(k.name, `
      <div class="faction-head">${cFlag(id)}<div><h3>${esc(k.name)}</h3><div class="faint">${wars.length?'<span class="chip live">At war</span>':'<span class="chip info">At peace</span>'}</div></div></div>
      <div class="stat-list">
        <div><span>Citizens</span><b>${cs?cs.players:0}</b></div>
        <div><span>Total levels</span><b>${cs?fmtNum(cs.totalLevel):0}</b></div>
        <div><span>Avg PvP rating</span><b>${cs&&cs.players?Math.round(cs.ratingSum/cs.players):'&ndash;'}</b></div>
        <div><span>Base tax</span><b>${k.tax}%</b></div>
        <div><span>Natural resources</span><b>${k.resources.map(r=>resourceIcon(r,14)+' '+esc(resName(r))).join(', ')}</b></div>
      </div>
      ${res.length?`<div class="panel-title" style="margin-top:14px;">Stockpile</div><div style="display:flex; gap:6px; flex-wrap:wrap;">${res.map(([r,v])=>`<span class="req-chip">${resourceIcon(r,14)} ${esc(resName(r))} ${fmtNum(v)}</span>`).join('')}</div>`:''}
      ${wars.map(warCardHtml).join('') ? `<div class="panel-title" style="margin-top:14px;">Active wars</div>${wars.map(warCardHtml).join('')}` : ''}
      ${id===S.char.kingdomId?`<button class="btn btn-primary btn-block" style="margin-top:14px;" data-action="nav" data-screen="kingdom">Open your country</button>`:''}`, true);
  }
  return '';
}
function modalShell(title, body, wide){
  return `<div class="modal-backdrop" data-action="modal-close-bg"><div class="panel modal-card ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <button class="btn btn-ghost btn-icon modal-close" data-action="modal-close" aria-label="Close">${icon('close')}</button>
    <div class="panel-title">${esc(title)}</div>${body}</div></div>`;
}

/* ---------------- Home = World overview ---------------- */
function renderHome(){
  const c = S.char, eff = effectiveStats(c), my = c.kingdomId;
  ensureWorld();
  const blocked = worldStatePanel();
  const wd = worldData();
  const live = wd ? wd.live : [];
  const inCountries = wd ? Object.keys(wd.countries).length : 0;
  const day = Date.now()-86400000;
  const ev24 = wd ? wd.events.filter(e=>e.at>day).length : 0;
  const tile = (cls, ic, l, v)=>`<div class="stat-tile ${cls}"><div class="l">${icon(ic)}${l}</div><div class="v">${v}</div></div>`;
  const hero = `
  <section class="world-hero">
    <div class="eyebrow" style="font:700 12px var(--font-display); letter-spacing:.24em; color:var(--brass-bright); text-transform:uppercase;">World status</div>
    <h2>Arcadia</h2>
    <p class="sub">${esc(c.username)}, citizen of ${esc(countryName(my))}. Here is the state of the world.</p>
    <div class="tile-row">
      ${tile('war','swords','Active wars', wd?live.length:'&ndash;')}
      ${tile('world','flag','Nations', wd?inCountries:'&ndash;')}
      ${tile('econ','users','Active players', wd?wd.active:'&ndash;')}
      ${tile('gold','news','Events (24h)', wd?ev24:'&ndash;')}
    </div>
  </section>`;

  // current wars
  let warsHtml;
  if(blocked) warsHtml = blocked;
  else if(!live.length) warsHtml = `<div class="panel empty"><h3>The world is at peace</h3><p class="faint">No wars are being fought. When a country declares war, it appears here for everyone.</p></div>`;
  else warsHtml = live.slice().sort((x,y)=>((y.attackerCountryId===my||y.defenderCountryId===my)-(x.attackerCountryId===my||x.defenderCountryId===my))).slice(0,3).map(warCardHtml).join('');

  // my country
  let countryHtml = '';
  if(wd){
    const all = Object.values(wd.countries), mine = wd.countries[my];
    const maxLv = Math.max(1,...all.map(x=>x.totalLevel)), maxP = Math.max(1,...all.map(x=>x.players));
    const avg = x=> x.players ? x.ratingSum/x.players : 0, maxR = Math.max(1,...all.map(avg));
    const eco = wd.econ[my], res = eco && eco.resources ? Object.entries(eco.resources).filter(([,v])=>v>0).sort((p,q)=>q[1]-p[1]).slice(0,4) : [];
    const meter = (l,v,pct,cls)=>`<div class="meter"><div class="top"><span>${l}</span><b>${v}</b></div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${clamp(pct,2,100)}%"></div></div></div>`;
    countryHtml = `<div class="panel" style="margin-top:var(--s-4);"><div class="panel-title">${icon('flag')}Your country</div>
      <div class="faction-head card-interactive" data-action="country-view" data-country="${my}">${cFlag(my)}<div><h3>${esc(countryName(my))}</h3><div class="faint">${live.some(w=>w.attackerCountryId===my||w.defenderCountryId===my)?'<span class="chip live">At war</span>':'<span class="chip info">At peace</span>'}</div></div></div>
      ${mine ? meter('Military (avg rating)', Math.round(avg(mine)), avg(mine)/maxR*100, 'bar-war') + meter('Total levels', fmtNum(mine.totalLevel), mine.totalLevel/maxLv*100, 'bar-xp') + meter('Citizens', mine.players, mine.players/maxP*100, 'bar-econ') : ''}
      ${res.length?`<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px;">${res.map(([r,v])=>`<span class="req-chip">${resourceIcon(r,14)} ${esc(resName(r))} ${fmtNum(v)}</span>`).join('')}</div>`:''}
      <button class="btn btn-block" style="margin-top:14px;" data-action="nav" data-screen="kingdom">Manage country</button></div>`;
  }

  // what next
  const nexts = [];
  const atWar = live.find(w=>w.status==='active' && (w.attackerCountryId===my||w.defenderCountryId===my));
  if(atWar) nexts.push({cls:'war', ic:'swords', t:'Your country is at war', d:'Strike the enemy to push the round score', act:'goto-country-war'});
  if(c.energyCur >= PVP_ENERGY_COST) nexts.push({ic:'target', t:'Fight in the PvP Arena', d:`${Math.floor(c.energyCur)} energy ready &middot; rating ${Math.round(c.pvp.rating)}`, act:'nav', scr:'pvp'});
  nexts.push({ic:'map', t:'Explore Adventure', d:'Gather resources, loot gear and earn XP', act:'nav', scr:'adventure'});
  nexts.push({ic:'coin', t:'Check the Market', d:'Trade resources and gear with other players', act:'nav', scr:'market'});
  const nextHtml = `<div class="next-list">${nexts.slice(0,4).map(n=>`<button class="next-item ${n.cls||''}" data-action="${n.act}" ${n.scr?`data-screen="${n.scr}"`:''}>${icon(n.ic)}<div><div>${n.t}</div><div class="d">${n.d}</div></div>${icon('chevron','class="go"')}</button>`).join('')}</div>`;

  const player = `<div class="panel" style="margin-top:var(--s-4);"><div class="panel-title">${icon('user')}You</div>
    <div class="row"><div><div style="font:700 22px var(--font-display); letter-spacing:.05em; text-transform:uppercase; color:var(--text-primary);">${esc(c.username)}</div><div class="faint">${CLASSES[c.class].name} &middot; Level ${c.level}</div></div><span class="chip win">${icon('shield')}${Math.round(c.pvp.rating)}</span></div>
    <div class="meter"><div class="top"><span>XP</span><b>${fmtNum(c.xp)} / ${fmtNum(xpNeeded(c.level))}</b></div><div class="bar-track"><div class="bar-fill bar-xp" style="width:${clamp(c.xp/xpNeeded(c.level)*100,0,100)}%"></div></div></div>
    <div class="stat-list" style="margin-top:12px;"><div><span>Attack</span><b>${eff.atk}</b></div><div><span>Defense</span><b>${eff.def}</b></div><div><span>Gold</span><b>${fmtNum(c.gold)}</b></div><div><span>Record</span><b>${c.pvp.wins}W &ndash; ${c.pvp.losses}L</b></div></div></div>`;

  const news = `<div class="panel"><div class="panel-title">${icon('news')}World news<span class="grow"></span><button class="btn btn-ghost btn-sm" data-action="world-refresh">Refresh</button></div>${wd?renderFeed(wd.events, 8):'<div class="skeleton" style="min-height:120px"></div>'}</div>`;

  return `${hero}
  <div class="grid grid-main">
    <div>
      <div class="panel-title" style="margin-bottom:var(--s-3);">${icon('swords')}Current world wars<span class="grow"></span><button class="btn btn-ghost btn-sm" data-action="nav" data-screen="wars">All wars</button></div>
      ${warsHtml}
      ${countryHtml}
    </div>
    <div>
      <div class="panel"><div class="panel-title">${icon('flag')}What next</div>${nextHtml}</div>
      <div style="margin-top:var(--s-4);">${news}</div>
      ${player}
    </div>
  </div>
  ${wd ? `<div class="panel" style="margin-top:var(--s-4);"><div class="panel-title">${icon('map')}World atlas</div>${renderAtlas()}</div>` : ''}`;
}

function renderAtlas(){
  const wd = worldData(), my = S.char.kingdomId;
  const warring = {}; wd.live.forEach(w=>{ warring[w.attackerCountryId]=1; warring[w.defenderCountryId]=1; });
  const list = KINGDOMS.slice().sort((a,b)=>((warring[b.id]?1:0)-(warring[a.id]?1:0)) || ((wd.countries[b.id]?wd.countries[b.id].players:0)-(wd.countries[a.id]?wd.countries[a.id].players:0)) || a.name.localeCompare(b.name));
  const shown = S.atlasAll ? list : list.slice(0,24);
  return `<div class="atlas">${shown.map(k=>{
    const cs = wd.countries[k.id];
    return `<button class="atlas-tile ${k.id===my?'mine':''} ${warring[k.id]?'atwar':''}" data-action="country-view" data-country="${k.id}">
      ${warring[k.id]?`<span class="wm" title="At war">${icon('swords')}</span>`:''}
      <span class="flag"><img src="https://flagcdn.com/w40/${k.flag}.png" alt=""></span><span class="nm">${esc(k.name)}</span><span class="sm">${cs?cs.players:0} citizen${cs&&cs.players===1?'':'s'}</span></button>`;
  }).join('')}</div>
  <div style="text-align:center; margin-top:12px;"><button class="btn btn-ghost btn-sm" data-action="atlas-toggle">${S.atlasAll?'Show fewer':'Show all '+KINGDOMS.length+' nations'}</button></div>`;
}

/* ---------------- War Center (global) ---------------- */
function renderWars(){
  ensureWorld();
  const my = S.char.kingdomId, wd = worldData(), blocked = worldStatePanel();
  const live = wd ? wd.live : [], fin = wd ? wd.finished : [];
  const tabs = `<div class="tabs" role="tablist">
    <button class="tab ${S.warTab==='active'?'active':''}" data-action="war-tab" data-tab="active">Active &amp; upcoming${wd?` (${live.length})`:''}</button>
    <button class="tab ${S.warTab==='recent'?'active':''}" data-action="war-tab" data-tab="recent">Recent wars${wd?` (${fin.length})`:''}</button></div>`;
  let body;
  if(blocked) body = blocked;
  else if(S.warTab==='recent') body = fin.length ? fin.map(warCardHtml).join('') : `<div class="panel empty"><h3>No war history</h3><p class="faint">Finished wars are recorded here.</p></div>`;
  else body = live.length ? live.slice().sort((x,y)=>((y.attackerCountryId===my||y.defenderCountryId===my)-(x.attackerCountryId===my||x.defenderCountryId===my))).map(warCardHtml).join('')
    : `<div class="panel empty"><h3>No active wars</h3><p class="faint">The world is quiet. Country Leaders can declare war from the Country screen.</p><button class="btn btn-primary" style="margin-top:12px;" data-action="goto-country-war">Open your war room</button></div>`;
  return `
  <div class="view-header split"><div><div class="eyebrow">World</div><h2>War Center</h2><p>Every war in Arcadia is public. Tap a war for round details.</p></div>
    <div style="display:flex; gap:8px;"><button class="btn" data-action="world-refresh">Refresh</button><button class="btn btn-danger" data-action="goto-country-war">${icon('swords','style="width:16px;height:16px"')} Your war room</button></div></div>
  ${tabs}
  <div class="grid grid-main"><div>${body}</div>
  <div><div class="panel"><div class="panel-title">${icon('news')}World news</div>${wd?renderFeed(wd.events,12):'<div class="skeleton"></div>'}</div></div></div>`;
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
function renderAdventure(){
  const c = S.char;
  const now = Date.now();
  const tiles = ZONES.map(z=>{
    const locked = c.level < z.min - 5;
    const banner = z.icon ? `url('icons/${z.icon}') center/cover` : (ZONE_BANNERS[z.id]||'var(--panel-2)');
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
  <div class="view-header"><h2>Realm Explorer</h2><p>Select a zone to enter.</p></div>
  <div class="zone-grid">${tiles}</div>`;
}

function renderZoneDetail(){
  const c = S.char;
  const now = Date.now();
  const z = ZONES.find(x=>x.id===S.zoneDetailId);
  if(!z) return renderAdventure();
  const locked = c.level < z.min - 5;
  const eliteLocked = locked || c.level < z.min;
  const bossCd = (c.bossCooldowns[z.id]||0) - now;
  const bossLocked = eliteLocked || bossCd > 0;
  const banner = z.icon ? `url('icons/${z.icon}') center/cover` : (ZONE_BANNERS[z.id]||'var(--panel-2)');
  const resChips = z.resources.map(r=>`${resourceIcon(r,14)} ${RESOURCE_NAMES[r]}`).join(', ');
  return `
  <button class="btn btn-sm" data-action="nav" data-screen="adventure" style="margin-bottom:14px;">&larr; Realm Explorer</button>
  <div class="zone-banner" style="background:${banner}; height:140px; border-radius:12px; margin-bottom:16px;"></div>
  <div class="view-header"><h2>${z.name}</h2><p>Level ${z.min}&ndash;${z.uncapped?z.min+'+':z.max} &middot; Resources: ${resChips}</p></div>
  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Zone Boss</div>
    <div class="row"><span>${z.boss}</span><span class="faint">${bossCd>0?`Ready in ${fmtMs(bossCd)}`:'Ready'}</span></div>
  </div>
  <div class="grid grid-2">
    <button class="btn btn-accent btn-block" style="padding:14px;" data-action="zone-road" data-zone="${z.id}" ${locked?'disabled':''} title="Wander the road: cheap, mostly small finds, occasional monster">Take a Step</button>
    <button class="btn btn-primary btn-block" style="padding:14px;" data-action="enter-zone" data-zone="${z.id}" ${locked?'disabled':''}>Explore</button>
    <button class="btn btn-danger btn-block" style="padding:14px;" data-action="enter-zone-elite" data-zone="${z.id}" ${eliteLocked?'disabled':''} title="Tougher monster, 20 Energy, better drops">Elite Hunt</button>
    <button class="btn btn-block" style="padding:14px; ${bossLocked?'':'border-color:var(--brass); color:var(--brass-bright);'}" data-action="enter-zone-boss" data-zone="${z.id}" ${bossLocked?'disabled':''} title="Unique boss, 30 Energy, guaranteed high-tier drop, 30 min cooldown">Zone Boss</button>
  </div>`;
}

function renderRoad(){
  const c = S.char, eff = effectiveStats(c);
  const road = S.road;
  const zone = ZONES.find(z=>z.id===road.zoneId);
  const g = road.gained;
  const resSummary = Object.entries(g.resources).map(([k,v])=>`+${v} ${resourceIcon(k,14)} ${RESOURCE_NAMES[k]}`).join(', ');
  return `
  <div class="view-header"><h2>The Road &mdash; ${zone.name}</h2><p>Take a step at a time. Each step costs ${STEP_ENERGY_COST} Energy. Most steps are quiet, some pay off, and every so often something finds you.</p></div>
  <div class="panel" style="margin-bottom:14px;">
    <div class="panel-title">This walk so far</div>
    <div class="stat-list">
      <div><span>XP</span><b>+${g.xp}</b></div>
      <div><span>Gold</span><b>+${g.gold}</b></div>
      <div style="grid-column:1/-1;"><span>Resources</span><b>${resSummary||'&mdash;'}</b></div>
    </div>
  </div>
  <div class="log" style="height:220px;">${road.log.slice().reverse().map(l=>`<div class="log-line ${l.cls||''}">${l.text}</div>`).join('')}</div>
  <div style="display:flex; gap:10px; margin-top:14px;">
    <button class="btn btn-primary btn-block" data-action="take-step" ${c.energyCur<STEP_ENERGY_COST?'disabled':''} style="padding:14px;">${c.energyCur<STEP_ENERGY_COST?'Out of Energy':'Take a Step'}</button>
    <button class="btn" data-action="road-leave">Leave the Road</button>
  </div>`;
}

/* ---------------- Craft ---------------- */
function renderCraft(){
  const c = S.char;
  const eff = effectiveStats(c);
  const cards = RECIPES.map(r=>{
    const max = maxCraftable(c, r);
    const qty = clamp((S.craftQty&&S.craftQty[r.id])||1, 1, Math.max(1,max));
    const reqChips = Object.entries(r.inputs).map(([k,v])=>{
      const have = c.resourceBag[k]||0;
      const need = v*qty;
      const short = have < need;
      return `<span class="req-chip ${short?'short':''}">${resourceIcon(k,12)} ${have}/${need}</span>`;
    }).join('');
    const energyShort = r.energy && c.energyCur < r.energy*qty;
    const energyChip = r.energy ? `<span class="req-chip ${energyShort?'short':''}">&#9889; ${Math.round(c.energyCur)}/${r.energy*qty}</span>` : '';
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
  const resChips = Object.entries(c.resourceBag).filter(([,v])=>v>0).map(([k,v])=>`<span class="tag" style="margin:0 6px 6px 0;">${RESOURCE_NAMES[k]}: <b style="color:var(--parchment)">${v}</b></span>`).join('') || '<span class="faint">No resources yet &mdash; fight in Adventure zones to gather some.</span>';
  return `
  <div class="view-header row" style="align-items:flex-end;">
    <div><h2>Crafting</h2><p>Turn raw resources and Energy into materials and potions.</p></div>
    <span class="tag">Backpack ${bagCount(c)}/${BAG_CAPACITY}</span>
  </div>
  <div style="margin-bottom:16px;">${resChips}</div>
  <div class="craft-grid">${cards}</div>`;
}

/* ---------------- Inventory ---------------- */
function renderInventory(){
  const c = S.char;
  const slots = EQUIP_SLOTS.map(slot=>{
    const it = c.equipment[slot];
    return `<div class="eq-slot">
      <div class="slot-name">${slot}</div>
      ${it ? `<div style="font-weight:700; color:var(--parchment);">${esc(it.name)} <span class="tag tag-${it.tier}">${it.tier}</span></div>
        <div class="faint">${statsSummary(it.stats)}</div>
        <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-sm" data-action="unequip" data-slot="${slot}">Unequip</button>
          ${upgradeButtonHtml(it, c)}
        </div>`
        : `<div class="faint">Empty</div>`}
    </div>`;
  }).join('');
  const gear = c.inventory.filter(i=>i.kind==='equipment');
  const consumables = c.inventory.filter(i=>i.kind==='consumable');
  const materials = c.inventory.filter(i=>i.kind==='material');
  function statsSummary(st){ if(!st) return ''; return Object.entries(st).map(([k,v])=>`+${v} ${k.toUpperCase()}`).join(', '); }
  function itemCard(it, actions){
    const tierTag = it.tier ? `<span class="tag tag-${it.tier}">${it.tier}</span>` : '';
    return `<div class="item-card">
      <h5>${esc(it.name)} ${tierTag}</h5>
      ${it.stats ? `<div class="faint">${statsSummary(it.stats)}</div>` : ''}
      ${it.qty>1?`<div class="faint">x${it.qty}</div>`:''}
      <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">${actions}</div>
    </div>`;
  }
  const gearCards = gear.map(it=>itemCard(it, `<button class="btn btn-sm btn-accent" data-action="equip" data-uid="${it.uid}">Equip</button><button class="btn btn-sm" data-action="sell" data-uid="${it.uid}">Sell (${sellPrice(it)}g)</button>${upgradeButtonHtml(it, c)}`)).join('') || '<p class="faint">No gear in your bag.</p>';
  const consCards = consumables.map(it=>itemCard(it, `<button class="btn btn-sm btn-accent" data-action="use-item" data-uid="${it.uid}">Use</button>`)).join('') || '<p class="faint">No consumables.</p>';
  const matCards = materials.map(it=>itemCard(it, `<button class="btn btn-sm" data-action="sell" data-uid="${it.uid}">Sell (${sellPrice(it)}g)</button>`)).join('') || '<p class="faint">No materials.</p>';
  return `
  <div class="view-header"><h2>Inventory</h2><p>Bag: ${bagCount(c)}/${BAG_CAPACITY}</p></div>
  <div class="panel-title" style="margin-bottom:10px;">Equipped</div>
  <div class="eq-slots">${slots}</div>
  <div class="panel-title" style="margin-bottom:10px;">Gear</div>
  <div class="inv-grid" style="margin-bottom:18px;">${gearCards}</div>
  <div class="panel-title" style="margin-bottom:10px;">Consumables</div>
  <div class="inv-grid" style="margin-bottom:18px;">${consCards}</div>
  <div class="panel-title" style="margin-bottom:10px;">Materials</div>
  <div class="inv-grid">${matCards}</div>`;
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
  const activeTab = S.profileTab==='settings' ? 'settings' : 'stats';
  const tabRow = `<div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
    <button class="btn btn-sm ${activeTab==='stats'?'btn-primary':''}" data-action="profile-tab" data-tab="stats">${icon('user','style="width:12px;height:12px;vertical-align:-1px"')} Stats</button>
    <button class="btn btn-sm ${activeTab==='settings'?'btn-primary':''}" data-action="profile-tab" data-tab="settings">${icon('gear','style="width:12px;height:12px;vertical-align:-1px"')} Settings</button>
  </div>`;
  return tabRow + (activeTab==='settings' ? renderSettings() : renderProfileStats());
}
function renderProfileStats(){
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
  return `
  <div class="view-header"><h2>Profile</h2><p>${kingdomFlag(c.kingdomId)}${esc(c.username)} &middot; ${itemIcon(cls.icon,16,'margin-right:2px;')}${cls.name} &middot; Level ${c.level}</p></div>
  <div class="grid grid-2" style="margin-bottom:16px;">
    <div class="panel">
      <div class="panel-title">Combat stats</div>
      <div class="stat-list">
        <div><span>Max HP</span><b>${eff.maxHp}</b></div>
        <div><span>Attack</span><b>${eff.atk}</b></div>
        <div><span>Defense</span><b>${eff.def}</b></div>
        <div><span>Speed</span><b>${eff.spd}</b></div>
        <div><span>Crit %</span><b>${eff.crit}%</b></div>
        <div><span>Evasion %</span><b>${eff.eva}%</b></div>
        <div><span>Max Energy</span><b>${eff.maxEnergy}</b></div>
        <div><span>Max Mana</span><b>${eff.maxMana}</b></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">PvP record</div>
      <div class="stat-list">
        <div><span>Rating</span><b>${Math.round(c.pvp.rating)}</b></div>
        <div><span>Wins</span><b>${c.pvp.wins}</b></div>
        <div><span>Losses</span><b>${c.pvp.losses}</b></div>
        <div><span>Skill Points</span><b>${c.skillPoints}</b></div>
      </div>
    </div>
  </div>
  <div class="panel" style="margin-bottom:16px;">
    <div class="row" style="margin-bottom:8px;">
      <div class="panel-title" style="margin:0;">Class skills &mdash; ${cls.resource}</div>
      <button class="btn btn-sm btn-danger" data-action="reset-skills">Reset</button>
    </div>
    ${classRows}
  </div>
  <div class="panel">
    <div class="panel-title">General skills</div>
    ${genRows}
  </div>`;
}

/* ---------------- Settings ---------------- */
function renderSettings(){
  const c = S.char;
  if(S._settingsUsername === undefined || S._settingsUsername === null) S._settingsUsername = c.username;
  const activeScheme = c.colorScheme || 'brass';
  const swatches = COLOR_SCHEMES.map(s=>`
    <button class="color-swatch ${s.id===activeScheme?'selected':''}" data-action="set-color-scheme" data-color="${s.id}" title="${esc(s.name)}" style="--swatch-color:${s.base};">
      <span class="color-swatch-dot" style="background:${s.base};"></span>
      <span class="color-swatch-label">${esc(s.name)}</span>
    </button>`).join('');
  return `
  <div class="view-header"><h2>Settings</h2></div>

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
    <div class="faint" style="margin-bottom:10px; text-transform:uppercase; letter-spacing:.05em;">Color scheme</div>
    <div class="color-swatch-grid">${swatches}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="panel-title">Account</div>
    <div class="stat-list">
      <div><span>Player ID</span><b style="font-size:11px;">${esc(MY_ID.slice(0,14))}&hellip;</b></div>
      <div><span>Storage</span><b>${HAS_DB?'Shared (cross-viewer)':'Local to this browser'}</b></div>
    </div>
    <p class="faint" style="margin-top:10px; line-height:1.6;">
      This is an in-browser prototype of ARCADIA's core loop. ${HAS_DB
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
    return `
    <div class="view-header"><h2>Kingdom</h2></div>
    <div class="panel empty">
      <h3>Shared storage unavailable</h3>
      <p class="faint">Kingdoms need real cross-player storage, which this view doesn't have access to. No fake kingdom data is shown here — try opening this game through its normal Artifact link.</p>
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
        <div>
          <h4>${flagIcon(k.flag,20,'margin-right:6px;')}${k.name}</h4>
          <div class="lvl">Resources: ${k.resources.map(r=>`${resourceIcon(r,14)} ${RESOURCE_NAMES[r]||titleCase(r)}`).join(', ')} &middot; Tax ${k.tax}%</div>
          <div class="faint" style="margin-top:2px;">${k.memberCount} member${k.memberCount===1?'':'s'} &middot; Treasury: ${fmtNum(k.treasury.gold||0)}g</div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="join-kingdom" data-kingdom="${k.id}">Join</button>
      </div>`).join('');
    function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
    return `
    <div class="view-header"><h2>Kingdom</h2><p>Join a country. Membership is shared and visible to every player in this game.</p></div>
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
  const treasuryRows = KINGDOM_TREASURY_RESOURCES.map(r=>`<div><span>${resourceIcon(r,14)} ${r==='gold'?'Gold':RESOURCE_NAMES[r]||r}</span><b>${fmtNum(treasury[r]||0)}</b></div>`).join('');
  const chat = Array.isArray(k.chat) ? k.chat : [];
  const chatLines = chat.slice().reverse().map(m=>`<div class="log-line"><b>${esc(m.senderName)}:</b> ${esc(m.text)}</div>`).join('') || '<div class="faint" style="padding:8px;">No messages yet. Say hello.</div>';

  const ROLE_ICON = {Leader:'crown', 'Co-Leader':'shield', Officer:'star'};
  const govMembers = kv.members.filter(m=>kingdomRank(m.kingdomRole)>=2).sort((a,b)=>kingdomRank(b.kingdomRole)-kingdomRank(a.kingdomRole));
  const govRow = govMembers.length ? govMembers.map(m=>{
    const initials = (m.username||'?').slice(0,2).toUpperCase();
    const ri = ROLE_ICON[m.kingdomRole];
    return `<div class="gov-avatar">
      <div class="circle">${initials}${ri?`<span class="role-badge">${icon(ri)}</span>`:''}</div>
      <div class="name">${esc(m.username)}</div>
      <div class="faint" style="font-size:10px;">${m.kingdomRole}</div>
    </div>`;
  }).join('') : '<p class="faint">No Officers or above yet.</p>';

  const tabs = ['overview','government','treasury','chat','rankings','economy','war'];
  const tabLabel = {overview:'Overview', government:'Government', treasury:'Treasury', chat:'Chat', rankings:'Rankings', economy:'Economy', war:'War'};
  const activeTab = tabs.includes(S.kingdomTab) ? S.kingdomTab : 'overview';
  const tabRow = `<div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">${tabs.map(t=>`<button class="btn btn-sm ${activeTab===t?'btn-primary':''}" data-action="kingdom-tab" data-tab="${t}">${tabLabel[t]}</button>`).join('')}</div>`;

  let tabBody = '';
  if(activeTab==='overview'){
    tabBody = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Government</div>
      <div class="gov-row">${govRow}</div>
    </div>
    <div class="panel">
      <div class="panel-title">Treasury</div>
      <div class="stat-list">${treasuryRows}</div>
      <div class="divider"></div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-sm btn-accent" data-action="donate-kingdom" data-resource="gold" data-amount="50">Donate 50 Gold</button>
        <button class="btn btn-sm btn-accent" data-action="donate-kingdom" data-resource="gold" data-amount="200">Donate 200 Gold</button>
      </div>
    </div>`;
  } else if(activeTab==='government'){
    tabBody = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Government</div>
      <div class="gov-row">${govRow}</div>
    </div>
    <div class="panel">
      <div class="panel-title">Members (${kv.members.length})</div>
      <div style="max-height:320px; overflow-y:auto;">${memberRows}</div>
    </div>`;
  } else if(activeTab==='treasury'){
    tabBody = `
    <div class="panel">
      <div class="panel-title">Treasury</div>
      <div class="stat-list">${treasuryRows}</div>
      <div class="divider"></div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-sm btn-accent" data-action="donate-kingdom" data-resource="gold" data-amount="50">Donate 50 Gold</button>
        <button class="btn btn-sm btn-accent" data-action="donate-kingdom" data-resource="gold" data-amount="200">Donate 200 Gold</button>
      </div>
    </div>`;
  } else if(activeTab==='rankings'){
    tabBody = renderRankings(c);
  } else if(activeTab==='economy'){
    tabBody = renderEconomy(c, kv);
  } else if(activeTab==='war'){
    tabBody = renderWar(c, kv);
  } else {
    tabBody = `
    <div class="panel">
      <div class="panel-title">Kingdom Chat</div>
      <div class="log" id="kingdom-chat-log">${chatLines}</div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <input type="text" id="kingdom-chat-input" maxlength="200" placeholder="Say something to your kingdom...">
        <button class="btn btn-primary" data-action="kingdom-chat-send">Send</button>
      </div>
    </div>`;
  }

  const banner = 'var(--panel-2)';
  return `
  <div class="kd-banner" style="background:${banner};">
    <div class="kd-banner-body">
      <div class="kd-banner-head">
        <div class="kd-banner-flag">${flagIcon(kdef.flag,40)}</div>
        <div>
          <h2>${kdef.name}</h2>
          <div class="faint">You are a ${c.kingdomRole} &middot; Tax ${kdef.tax}%</div>
        </div>
      </div>
      <div class="kd-stat-mini-row">
        <div class="kd-stat-mini"><div class="l">Members</div><div class="v">${kv.members.length}</div></div>
        <div class="kd-stat-mini"><div class="l">Treasury Gold</div><div class="v">${fmtNum(treasury.gold||0)}</div></div>
        <div class="kd-stat-mini"><div class="l">Resources</div><div class="v">${kdef.resources.map(r=>resourceIcon(r,15)).join(' ')}</div></div>
      </div>
    </div>
  </div>
  ${leaderMissing ? `<div class="panel" style="margin-bottom:14px; border-color:var(--brass);">
    <div class="panel-title">This kingdom has no Leader</div>
    ${myRank>=2 ? `<button class="btn btn-primary btn-sm" data-action="claim-leadership">Claim Leadership</button>` : `<p class="faint">An Officer or above can claim leadership.</p>`}
  </div>` : ''}
  ${tabRow}
  ${tabBody}
  <div style="margin-top:16px;"><button class="btn btn-danger" data-action="leave-kingdom">Leave Kingdom</button></div>`;
}

/* ---------------- Country economy & war (all numbers come from the server) ---------------- */
function countryName(id){ const k = KINGDOMS.find(x=>x.id===id); return k ? k.name : id; }
function srvNow(){ return Date.now() + (S.serverOffset||0); }
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
  const resRows = Object.keys(st.resources).map(r=>`<div><span>${resourceIcon(r,14)} ${resName(r)}${st.naturalResources.includes(r)?'':' <span class="faint">(war spoils)</span>'}</span><b>${fmtNum(st.resources[r])}</b></div>`).join('');
  const out = st.warTaxOut && st.warTaxOut.active ? `
    <div class="panel" style="margin-bottom:16px; border-color:var(--danger);">
      <div class="panel-title">&#9888; War Tax</div>
      <p>Your country lost a war against ${kingdomFlag(st.warTaxOut.winnerCountryId)}<b>${countryName(st.warTaxOut.winnerCountryId)}</b>.</p>
      <div class="stat-list">
        <div><span>Resource affected</span><b>${resourceIcon(st.warTaxOut.resourceId,14)} ${resName(st.warTaxOut.resourceId)}</b></div>
        <div><span>War Tax</span><b>${st.warTaxOut.rate}% of newly gathered</b></div>
        <div><span>Remaining</span><b>${countdown(st.warTaxOut.expiresAt)}</b></div>
      </div>
      <p class="faint" style="margin-top:6px;">Resources you already own are never touched.</p>
    </div>` : '';
  const inn = st.warTaxIn.map(t=>`
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">&#127942; War Spoils</div>
      <p>${kingdomFlag(st.countryId)}<b>${countryName(st.countryId)}</b> is receiving ${t.rate}% of ${resourceIcon(t.resourceId,14)} <b>${resName(t.resourceId)}</b> newly gathered by ${kingdomFlag(t.loserCountryId)}<b>${countryName(t.loserCountryId)}</b>.</p>
      <div class="stat-list"><div><span>Collected so far</span><b>${fmtNum(t.collected||0)}</b></div><div><span>Remaining</span><b>${countdown(t.expiresAt)}</b></div></div>
    </div>`).join('');
  return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">${kingdomFlag(st.countryId,20)}${countryName(st.countryId)}</div>
      <div class="stat-list">
        <div><span>Leader</span><b>${leader ? esc(leader.username) : (st.leaderId ? 'Unknown' : 'None')}</b></div>
        <div><span>Citizens</span><b>${kv.members.length}</b></div>
        <div><span>Country tax</span><b>${st.taxRate}%</b></div>
        <div><span>Treasury</span><b>${fmtNum((k.treasury||{}).gold||0)} Gold</b></div>
      </div>
      <p class="faint" style="margin-top:8px;">When a citizen gathers ${st.naturalResources.map(resName).join(' or ')} (PvE, Road), ${st.taxRate}% of that NEW amount goes to the country. Resources already in inventories are never taxed.</p>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Country Resources</div>
      <div class="stat-list">${resRows}</div>
    </div>
    ${out}${inn}`;
}

function renderWarHistoryRow(h, myId){
  const a = h.attackerCountryId, d = h.defenderCountryId;
  const tax = h.selectedResource ? (h.rewardState==='active'
      ? `${resName(h.selectedResource)} Tax &mdash; Active, ${fmtClock(h.taxMsRemaining)} remaining`
      : `${resName(h.selectedResource)} Tax &mdash; Expired`)
    : (h.rewardState==='awaiting_choice' ? 'Reward not chosen yet' : h.rewardState==='forfeited' ? 'Reward forfeited' : '');
  return `<div class="skill-row"><div>
    <div style="font-weight:700;">${kingdomFlag(a)}${countryName(a)} ${h.finalScore[a]||0}&ndash;${h.finalScore[d]||0} ${kingdomFlag(d)}${countryName(d)}</div>
    <div class="faint">${h.result==='victory'?'Victory':'Defeat'}${tax?' &middot; '+tax:''}</div>
  </div></div>`;
}

function renderWar(c, kv){
  const blocked = countryStatePanel(); if(blocked) return blocked;
  const st = S.countryState.data, me = st.countryId, now = srvNow();
  let html = '';

  // ---- victory: the winning Leader picks ONE resource ----
  if(st.pendingReward){
    const pr = st.pendingReward;
    if(st.isLeader){
      html += `<div class="panel" style="margin-bottom:16px;">
        <div class="panel-title">&#127942; WAR VICTORY</div>
        <p>You defeated ${kingdomFlag(pr.loserCountryId)}<b>${countryName(pr.loserCountryId)}</b>.<br>Choose ONE resource to tax for 14 days (10% of what their citizens gather from now on).</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin:10px 0;">${pr.options.map(r=>`<button class="btn ${S._rewardPick===r?'btn-primary':''}" data-action="reward-pick" data-resource="${r}">${resourceIcon(r,14)} ${resName(r)}</button>`).join('')}</div>
        <button class="btn btn-primary" data-action="reward-confirm" data-war="${pr.warId}" ${S._rewardPick?'':'disabled'}>Confirm</button>
        <p class="faint" style="margin-top:6px;">Choose before ${countdown(pr.claimExpiresAt)} runs out.</p>
      </div>`;
    } else {
      html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">&#127942; WAR VICTORY</div><p>Your country defeated ${kingdomFlag(pr.loserCountryId)}<b>${countryName(pr.loserCountryId)}</b>. The Leader has not chosen the resource to tax yet.</p></div>`;
    }
  }

  // ---- current war ----
  const w = st.activeWar;
  if(w){
    const a = w.attackerCountryId, d = w.defenderCountryId;
    const head = `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <div style="font-size:16px; font-weight:700;">${kingdomFlag(a,22)}${countryName(a)}</div><div class="faint">VS</div>
      <div style="font-size:16px; font-weight:700;">${kingdomFlag(d,22)}${countryName(d)}</div></div>`;
    if(w.status==='preparing'){
      html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">WAR DECLARED</div>${head}
        <p style="margin-top:10px;">Round 1 starts in ${countdown(w.startsAt)}.</p></div>`;
    } else {
      const lv = w.live || {round:1, damage:{}}, cur = w.rounds[w.rounds.length-1];
      const myDmg = lv.damage[me]||0, enemy = me===a ? d : a, enDmg = lv.damage[enemy]||0;
      const m = w.mine;
      const coolLeft = m ? Math.max(0, m.lastStrikeAt + m.cooldownMs - now) : 0;
      const canStrike = m && coolLeft===0 && m.strikes < m.maxStrikes;
      const top = (lv.top||[]).map((t,i)=>{ const mem = kv.members.find(x=>x.id===t.uid); return `<div><span>#${i+1} ${mem?esc(mem.username):'Player'}</span><b>${fmtNum(t.damage)}</b></div>`; }).join('');
      html += `<div class="panel" style="margin-bottom:16px;">
        <div class="panel-title">${lv.round===3?'ROUND 3 &mdash; FINAL ROUND':'CURRENT WAR'}</div>${head}
        <div class="stat-list" style="margin-top:10px;">
          <div><span>Round</span><b>${lv.round} / 3</b></div>
          <div><span>Round wins</span><b>${countryName(a)} ${w.finalScore[a]||0} &mdash; ${w.finalScore[d]||0} ${countryName(d)}</b></div>
          <div><span>Time left in round</span><b>${countdown(cur.endsAt)}</b></div>
          <div><span>${kingdomFlag(me)}${countryName(me)} damage</span><b>${fmtNum(myDmg)}</b></div>
          <div><span>${kingdomFlag(enemy)}${countryName(enemy)} damage</span><b>${fmtNum(enDmg)}</b></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-primary" data-action="war-strike" ${canStrike?'':'disabled'}>Strike (${m?m.energyCost:10} Energy)</button>
          <span class="faint">${m ? `Your damage: ${fmtNum(m.damage)} &middot; Strikes: ${m.strikes}/${m.maxStrikes}${coolLeft?` &middot; ready in ${Math.ceil(coolLeft/1000)}s`:''}` : ''}</span>
        </div>
        <p class="faint" style="margin-top:6px;">Each strike is a real duel against a citizen of ${countryName(enemy)}; the server counts the HP you take off them.</p>
      </div>
      ${top ? `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">Top fighters this round</div><div class="stat-list">${top}</div></div>` : ''}`;
    }
  } else {
    // ---- declare a war (Leader only) ----
    const cool = st.cooldownUntil - now;
    let body;
    if(!st.isLeader) body = `<p class="faint">Only your country's Leader can declare war.</p>`;
    else if(cool>0) body = `<p class="faint">Your country is recovering from its last war. A new war can be declared in ${countdown(st.cooldownUntil)}.</p>`;
    else body = `<p class="faint" style="margin-bottom:8px;">Pick a country. The war starts after a short preparation and is fought over at most 3 rounds &mdash; first to win 2 takes the victory.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <select id="war-target" style="flex:1; min-width:180px;">${'<option value="">Choose a country...</option>'+KINGDOMS.filter(k=>k.id!==me).map(k=>`<option value="${k.id}" ${S._warTarget===k.id?'selected':''}>${k.name}</option>`).join('')}</select>
        <button class="btn btn-danger" data-action="declare-war">Declare War</button>
      </div>`;
    html += `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">No war in progress</div>${body}</div>`;
  }

  // ---- history ----
  html += `<div class="panel"><div class="panel-title">War History</div>${st.history.length ? st.history.map(h=>renderWarHistoryRow(h, me)).join('') : '<p class="faint">No wars yet.</p>'}</div>`;
  return html;
}

/* ---------------- Country rankings ---------------- */
function renderRankings(c){
  const rv = S.rankingsView;
  if(!rv || rv.loading) return `<div class="empty"><h3>Loading rankings...</h3></div>`;
  if(rv.unavailable) return `<div class="panel empty"><h3>Rankings unavailable</h3><p class="faint">Rankings need shared storage, which this view doesn't have access to.</p></div>`;
  if(rv.error) return `<div class="panel empty"><h3>Couldn't load rankings</h3><button class="btn btn-primary" style="margin-top:10px;" data-action="kingdom-tab" data-tab="rankings">Retry</button></div>`;
  const countryRows = rv.countries.map((r,i)=>{
    const k = KINGDOMS.find(x=>x.id===r.id);
    const mine = r.id===c.kingdomId;
    return `<div class="row" style="padding:8px 0; ${mine?'color:var(--brass-bright);':''}">
      <div><b>#${i+1}</b> &nbsp;${kingdomFlag(r.id,18)}${k.name}${mine?' <span class="faint">(you)</span>':''}</div>
      <div class="faint">${r.players} player${r.players===1?'':'s'} &middot; Lv. total ${fmtNum(r.totalLevel)} &middot; Avg rating ${Math.round(r.ratingSum/r.players)}</div>
    </div>`;
  }).join('') || '<p class="faint">No players yet.</p>';
  const playerRows = rv.topPlayers.map((p,i)=>`<div class="row" style="padding:6px 0;">
      <div><b>#${i+1}</b> &nbsp;${kingdomFlag(p.kingdomId)}${esc(p.username)}</div>
      <div class="faint">Lv. ${p.level||1} &middot; Rating ${Math.round((p.pvp&&p.pvp.rating)||1000)}</div>
    </div>`).join('') || '<p class="faint">No players yet.</p>';
  return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-title">Top countries</div>
      ${countryRows}
    </div>
    <div class="panel">
      <div class="panel-title">Top players</div>
      ${playerRows}
    </div>`;
}

/* ---------------- Docked World Chat widget (WarEra-style) ---------------- */
// Persistent floating chat, present on every screen — this is now the
// single access point for general chat (no separate 'chat' nav tab).
let _chatFetchInFlight = false;
function renderChatWidget(){
  if(!S.chatWidgetOpen){
    return `<button class="chat-widget-toggle" data-action="chat-widget-toggle" title="World Chat">${icon('chat')}</button>`;
  }
  if(S.generalChat===null && !_chatFetchInFlight){
    _chatFetchInFlight = true;
    loadGeneralChat().finally(()=>{ _chatFetchInFlight = false; });
  }
  const lines = S.generalChatUnavailable
    ? `<div class="faint" style="padding:8px;">Chat unavailable.</div>`
    : S.generalChat===null
      ? `<div class="faint" style="padding:8px;">Loading chat...</div>`
      : (S.generalChat.slice().reverse().map(m=>`<div class="log-line"><b>${kingdomFlag(m.senderKingdom)}${esc(m.senderName)}:</b> ${esc(m.text)}</div>`).join('') || '<div class="faint" style="padding:8px;">No messages yet. Say hello.</div>');
  return `
  <div class="chat-widget-panel">
    <div class="chat-widget-head">
      <span>World Chat</span>
      <button class="chat-widget-close" data-action="chat-widget-toggle">&times;</button>
    </div>
    <div class="log" id="world-chat-log">${lines}</div>
    <div class="chat-widget-input-row">
      <input type="text" id="world-chat-input" maxlength="200" placeholder="Say something...">
      <button class="btn btn-primary" data-action="chat-widget-send">Send</button>
    </div>
  </div>`;
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
          <div class="lvl">Seller: ${kingdomFlag(l.sellerKingdom)}${esc(l.sellerName)} &middot; ${l.pricePerUnit}g${l.qty>1?' each':''} &middot; Total: ${fmtNum(l.totalPrice)}g</div>
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
          <h4 style="font-size:15px;">${kingdomFlag(o.kingdomId)}${esc(o.username)} ${o.isBot?'<span class="faint">(unranked bot)</span>':''}</h4>
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
  <div class="view-header"><h2>${cb.mode==='pve'?(cb.boss?'Zone Boss':cb.elite?'Elite Hunt':'Battle'):'PvP Duel'}</h2><p>Round ${cb.round} of ${cb.maxRounds}</p></div>
  <div class="arena">
    ${fighterBlock(me,'me')}
    <div class="vs">VS</div>
    ${fighterBlock(foe,'foe')}
  </div>
  <div class="log" id="combat-log">${cb.log.slice().reverse().map(l=>`<div class="log-line ${l.cls}">${l.text}</div>`).join('')}</div>
  ${actionsHtml}
  `;
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
function render(){
  applyColorScheme(S.char ? S.char.colorScheme : 'brass');
  document.body.dataset.zone = SCREEN_ZONE[S.screen] || 'world';
  const app = document.getElementById('app');
  if(S.screen==='loading'){
    app.innerHTML = `<div class="loader-wrap">
      <div class="loader-mark">${icon('globe','style="width:100%;height:100%;stroke:var(--brass-bright)"')}</div>
      <p>ENTERING ARCADIA</p>
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
  if(S.screen==='home') body = renderHome();
  else if(S.screen==='wars') body = renderWars();
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

  const navActive = S.screen==='combat' ? (S.combat && S.combat.mode==='pvp' ? 'pvp':'adventure') : ((S.screen==='road'||S.screen==='zone-detail') ? 'adventure' : S.screen);
  // 'settings' has no nav slot — it lives under Profile's Settings tab.
  const nt = S.toast ? (NOTIF_TYPES[S.toast.type]||NOTIF_TYPES.system) : null;

  app.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="brand">
        <div class="brand-mark">${icon('globe','style="width:100%;height:100%;stroke:var(--brass-bright)"')}</div>
        <div class="brand-name">ARCADIA</div>
      </div>
      <nav class="navlist">${renderNav(navActive)}</nav>
      <div class="nav-foot">A persistent world<br>of nations &amp; wars</div>
    </aside>
    <div class="main">
      ${renderHud()}
      <main class="view" id="view">${body}</main>
    </div>
  </div>
  <nav class="tabbar" aria-label="Main navigation">${renderTabbar(navActive)}</nav>
  ${renderMoreSheet(navActive)}
  ${renderNotifPanel()}
  ${renderModal()}
  ${S.char ? renderChatWidget() : ''}
  ${S.toast ? `<div class="toast ${nt.cls}" role="status"><div class="ic">${icon(nt.icon)}</div><div>${esc(S.toast.msg)}</div></div>` : ''}
  `;
  if(S.screen==='kingdom'){
    const input = document.getElementById('kingdom-chat-input');
    if(input){
      input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendKingdomChat(input.value); } });
    }
  }
  if(S.chatWidgetOpen){
    const input = document.getElementById('world-chat-input');
    if(input){
      input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendGeneralChat(input.value); } });
    }
  }
  if(S.screen==='profile' && S.profileTab==='settings'){
    bindSettingsEvents();
  }
}
