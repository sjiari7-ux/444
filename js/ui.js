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
  if(!id || id==='brass'){ root.removeProperty('--brass'); root.removeProperty('--brass-bright'); return; } // default = WarEra blue from warera.css
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
  <div class="loader-wrap" style="min-height:100vh; padding:20px;">
    <div class="we-login">
      <div class="we-login-mark">${icon('sword','style="width:100%;height:100%"')}</div>
      <h1>REALMCLASH</h1>
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
  <div class="loader-wrap" style="min-height:100vh; padding:20px;">
    <div style="max-width:760px; width:100%;">
      <div style="text-align:center; margin-bottom:26px;">
        <div class="we-login-mark">${icon('sword','style="width:100%;height:100%"')}</div>
        <h1 style="font-size:30px;">REALMCLASH</h1>
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

/* ---------------- Shell / nav ---------------- */
const NAV = [
  {id:'home', label:'Overview', icon:'home', group:'WORLD'},
  {id:'world', label:'World', icon:'globe', group:'WORLD'},
  {id:'rankings', label:'Rankings', icon:'chart', group:'WORLD'},
  {id:'adventure', label:'PvE', icon:'sword', group:'PLAY'},
  {id:'pvp', label:'PvP', icon:'target', group:'PLAY'},
  {id:'kingdom', label:'Kingdom', icon:'crown', group:'FACTION'},
  {id:'market', label:'Market', icon:'scroll', group:'ECONOMY'},
  {id:'craft', label:'Craft', icon:'flask', group:'ECONOMY'},
  {id:'inventory', label:'Inventory', icon:'bag', group:'PLAYER'},
  {id:'profile', label:'Profile', icon:'user', group:'PLAYER'},
];

function renderStatusBar(){
  const c = S.char, eff = effectiveStats(c);
  const initials = c.username.slice(0,2).toUpperCase();
  const hpRegen = Math.max(1, Math.round(eff.maxHp*HP_REGEN_PCT));
  return `
  <div class="statusbar">
    <div class="sb-id">
      <div class="sb-avatar">${initials}<span class="sb-lvl-badge">${c.level}</span></div>
    </div>
    <div class="sb-bars">
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('heart','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.round(c.hpCur)}/${eff.maxHp}</span><span class="sb-regen">&#9650;${hpRegen}</span></div>
        <div class="bar-track"><div class="bar-fill bar-hp" style="width:${clamp(c.hpCur/eff.maxHp*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('bolt','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.floor(c.energyCur)}/${eff.maxEnergy}</span><span class="sb-regen" title="${energyRegenTooltip(c, eff)}">${c.energyCur>=eff.maxEnergy?'Full':'+'+energyRegenPerHour(eff.maxEnergy)+'/hr'}</span></div>
        <div class="bar-track"><div class="bar-fill bar-energy" style="width:${clamp(c.energyCur/eff.maxEnergy*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('drop','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.round(c.manaCur)}/${eff.maxMana}</span><span class="sb-regen">&#9650;${MANA_REGEN_AMT}</span></div>
        <div class="bar-track"><div class="bar-fill bar-mana" style="width:${clamp(c.manaCur/eff.maxMana*100,0,100)}%"></div></div>
      </div>
    </div>
    <div class="sb-stat">${icon('crown','style="width:12px;height:12px;vertical-align:-1px; stroke:var(--brass-bright)"')} <b>${fmtNum(c.gold)}</b></div>
    <div class="sb-rating">${icon('shield','style="width:13px;height:13px"')} ${Math.round(c.pvp.rating)}</div>
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
  const ids=['home','world','adventure','pvp','profile'];
  return NAV.filter(n=>ids.includes(n.id)).map(n=>`<button class="tabbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');
}

/* ---------------- Home ---------------- */
function renderHome(){
  const c = S.char, eff = effectiveStats(c);
  const need = xpNeeded(c.level);
  if(S.worldWars===null) loadWorldWars();
  const wars = S.worldWars?.active || [];
  const recent = S.worldWars?.recent || [];
  const warCards = wars.slice(0,3).map(w=>renderWorldWarCard(w)).join('') || `<div class="world-empty"><div class="world-empty-icon">${icon('shield')}</div><div><b>No active world wars</b><span>The realm is quiet for now.</span></div></div>`;
  const news = [...wars.map(w=>({type:'war', text:`${countryName(w.attackerCountryId)} entered a war against ${countryName(w.defenderCountryId)}`, at:w.startedAt||Date.now()})), ...recent.slice(0,4).map(w=>({type:'result', text:`${countryName(w.winnerCountryId)} defeated ${countryName(w.loserCountryId)}`, at:w.endedAt||Date.now()}))].sort((a,b)=>b.at-a.at).slice(0,5);
  return `
  ${weHero('Welcome back, '+esc(c.username),CLASSES[c.class].name+' · Level '+c.level+' · '+countryName(c.kingdomId))}
  <div style="margin:10px 0"><button class="btn btn-primary" data-action="nav" data-screen="world">${icon('globe')} Enter the World</button></div>
  <div class="world-metrics">
    <div class="metric"><span>ACTIVE WARS</span><b>${wars.length}</b></div>
    <div class="metric"><span>YOUR RATING</span><b>${Math.round(c.pvp.rating)}</b></div>
    <div class="metric"><span>LEVEL</span><b>${c.level}</b></div>
    <div class="metric"><span>GOLD</span><b>${fmtNum(c.gold)}</b></div>
  </div>
  <div class="world-home-grid">
    <section class="panel world-panel world-panel-large">
      <div class="section-head"><div><span class="eyebrow">LIVE EVENTS</span><h3>Wars shaping the world</h3></div><button class="btn btn-sm" data-action="nav" data-screen="world">View all</button></div>
      <div class="war-feed">${warCards}</div>
    </section>
    <section class="panel world-panel">
      <div class="section-head"><div><span class="eyebrow">YOUR FACTION</span><h3>${kingdomFlag(c.kingdomId)} ${countryName(c.kingdomId)}</h3></div><button class="icon-btn" data-action="nav" data-screen="kingdom">${icon('arrow')}</button></div>
      <div class="faction-stat"><span>Battle power</span><b>${eff.atk + eff.def * 2}</b></div>
      <div class="faction-stat"><span>Resources</span><b>${fmtNum(resourceTotal(c))}</b></div>
      <div class="faction-stat"><span>PvP record</span><b>${c.pvp.wins}W · ${c.pvp.losses}L</b></div>
      <button class="btn btn-accent btn-block" data-action="nav" data-screen="kingdom">Open Kingdom</button>
    </section>
  </div>
  <div class="world-home-grid lower">
    <section class="panel world-panel">
      <div class="section-head"><div><span class="eyebrow">PLAYER</span><h3>Prepare your next move</h3></div></div>
      <div class="action-list">
        <button data-action="nav" data-screen="adventure">${icon('sword')}<span><b>Explore PvE</b><small>Fight, earn XP and gather resources.</small></span><i>→</i></button>
        <button data-action="nav" data-screen="pvp">${icon('target')}<span><b>Enter PvP</b><small>Find an opponent near your rating.</small></span><i>→</i></button>
        <button data-action="nav" data-screen="market">${icon('scroll')}<span><b>Visit Market</b><small>Trade with the world.</small></span><i>→</i></button>
      </div>
    </section>
    <section class="panel world-panel">
      <div class="section-head"><div><span class="eyebrow">WORLD NEWS</span><h3>Latest events</h3></div></div>
      <div class="news-list">${news.map(n=>`<div class="news-row"><span class="news-dot ${n.type}"></span><span>${esc(n.text)}</span><time>${fmtRelative(n.at)}</time></div>`).join('') || '<div class="empty-mini">No public events yet.</div>'}</div>
    </section>
  </div>
  <div class="panel character-strip">
    <div><span class="eyebrow">CHARACTER</span><b>${esc(c.username)}</b><span>Level ${c.level} · ${CLASSES[c.class].name}</span></div>
    <div class="xp-track"><div style="width:${clamp(c.xp/need*100,0,100)}%"></div></div><span class="xp-label">${fmtNum(c.xp)} / ${fmtNum(need)} XP</span>
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
  return `<button class="we-battle ${rel}" data-action="world-war" data-id="${esc(w.id)}">
    <div class="we-b-top"><span>${w.status==='preparing'?'PREPARING':'ACTIVE'}</span><span>${round?`ROUND ${round.round}/${w.maxRounds||3}`:'WAR'}</span></div>
    <div class="we-b-mid"><div class="we-b-side">${kingdomFlag(a,34,'margin:0')}<small>${esc(countryName(a))}</small></div><b>${sa}</b><em>${icon('sword','style="width:16px;height:16px"')}</em><b>${sd}</b><div class="we-b-side">${kingdomFlag(d,34,'margin:0')}<small>${esc(countryName(d))}</small></div></div>
    <div class="we-b-time">${round?.endsAt?countdown(round.endsAt):'Awaiting round'}</div>
    <div class="we-dmgbar"><span class="l">${fmtNum(da)}</span><div><i style="width:${pa}%"></i></div><span class="r">${fmtNum(dd)}</span></div>
  </button>`;
}
function warScore(w){
  const out={a:0,d:0}; (w.rounds||[]).forEach(r=>{if(r.winner===w.attackerCountryId)out.a++; else if(r.winner===w.defenderCountryId)out.d++;}); return out;
}
function currentWarRound(w){
  const now=Date.now()+(S.serverOffset||0); return (w.rounds||[]).find(r=>r.status==='active'||(r.startsAt<=now&&r.endsAt>now)) || (w.rounds||[]).find(r=>r.status==='preparing');
}

function viewBack(label){ return `<button class="btn btn-sm" data-action="view-back" style="margin:0 0 12px">&larr; ${label||'Back'}</button>`; }
function viewOnlyChip(){ return `<span class="we-chip" title="You can look, but not change anything here">View only</span>`; }
function renderCountryView(){
  const id=S.viewCountryId, v=S.viewCountry, kdef=KINGDOMS.find(k=>k.id===id);
  const back=viewBack('Back');
  if(!kdef) return back+`<div class="we-empty"><h3>Country not found</h3></div>`;
  if(!v||v.id!==id||v.loading) return back+`<div class="empty"><h3>Loading ${esc(kdef.name)}…</h3></div>`;
  if(v.unavailable||v.error) return back+`<div class="we-empty"><h3>Couldn't load this country</h3><button class="btn btn-primary" data-action="view-country" data-id="${esc(id)}">Retry</button></div>`;
  const members=v.members, treasury=v.kingdom.treasury||{}, tab=['home','government','citizens'].includes(S.viewCountryTab)?S.viewCountryTab:'home';
  const wk=weekKeyNow(), wdmg=members.reduce((n,m)=>n+((m.weeklyDmg&&m.weeklyDmg.week===wk)?(m.weeklyDmg.dmg||0):0),0);
  const t=Date.now(), online=members.filter(m=>(t-Number(m.updatedAt||0))<5*60*1000).length;
  const wars=(S.worldWars&&S.worldWars.active||[]).filter(w=>w.attackerCountryId===id||w.defenderCountryId===id);
  const byRole=r=>members.filter(m=>m.kingdomRole===r);
  const av=(m,cls)=>`<div class="we-gav ${cls||''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i></div>`;
  const person=(m,cls)=>`<div class="we-role-p" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,cls)}<b>${esc(m.username)}</b></div>`;
  const roleCard=(label,cls,list)=>`<div class="we-role ${cls}"><h4>${label}</h4>${list.length?list.map(m=>person(m)).join(''):'<p>No one nominated yet.</p>'}</div>`;
  const tabs=[['home','Home','castle'],['government','Government','crown'],['citizens','Citizens','users']];
  const tabRow=`<div class="country-module-nav we-ptabs">${tabs.map(x=>`<button class="country-module ${tab===x[0]?'active':''}" data-action="view-ctab" data-tab="${x[0]}">${icon(x[2])}<span>${x[1]}</span></button>`).join('')}</div>`;
  const hero=`<div class="we-chero"><div class="we-banner"></div><div class="we-chead"><div class="we-flag">${kingdomFlag(id,64,'margin:0')}</div><div><small>⚑ Country ${viewOnlyChip()}</small><h2>${esc(kdef.name)}</h2><div class="we-cstats"><span><small>Citizens</small><b>${members.length}</b></span><span><small>Online</small><b>${online}</b></span><span><small>Treasury</small><b>${fmtNum(treasury.gold||0)}</b></span><span><small>Tax</small><b>${kdef.tax}%</b></span></div></div></div></div>`;
  let body='';
  if(tab==='home'){
    body=`<div class="we-sec">RANKINGS</div><div class="we-tiles">${weTile('Citizens',members.length,'green')}${weTile('Weekly damages',fmtNum(wdmg))}${weTile('Treasury',fmtNum(treasury.gold||0),'gold')}${weTile('National tax',kdef.tax+'%')}</div>
      <div class="we-sec">WARS</div>${wars.length?`<div class="we-battles">${wars.map(renderWorldWarCard).join('')}</div>`:'<p class="faint">At peace. No ongoing wars.</p>'}
      <div class="we-sec">GOVERNMENT</div><div class="we-gov-strip">${['Leader','Co-Leader','Officer'].map(r=>byRole(r).slice(0,4).map(m=>`<div data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,r==='Leader'?'gold':r==='Co-Leader'?'blue':'red')}</div>`).join('')).join('')||'<p class="faint">No government yet.</p>'}</div>`;
  } else if(tab==='government'){
    body=`<div class="we-gov-grid"><div class="we-role gold wide"><h4>★ Leader</h4>${byRole('Leader').map(m=>`<div class="we-role-p c" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer">${av(m,'gold')}<b>${esc(m.username)}</b></div>`).join('')||'<p>No one nominated yet.</p>'}</div>${roleCard('Co-Leader','blue',byRole('Co-Leader'))}${roleCard('Officers','red',byRole('Officer'))}</div>`;
  } else {
    body=`<div class="we-sec">CITIZENS — ${members.length}</div>`+members.map(m=>{ const on=(t-Number(m.updatedAt||0))<5*60*1000; return `<div class="we-mrow we-card" data-action="view-player" data-id="${esc(m.id)}"><div class="we-gav ${on?'on':''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i><u class="dot ${on?'on':''}"></u></div><div class="nm"><b>${esc(m.username)}</b><small>${esc(m.kingdomRole||'Recruit')} · ${CLASSES[m.class]?CLASSES[m.class].name:'—'}</small></div>${CHAT_ROLE_ICON[m.kingdomRole]?`<span class="rl">${icon(CHAT_ROLE_ICON[m.kingdomRole])}</span>`:''}</div>`; }).join('');
  }
  return back+hero+tabRow+body;
}
function renderPlayerView(){
  const id=S.viewPlayerId, v=S.viewPlayer, back=viewBack('Back');
  if(!v||v.id!==id||v.loading) return back+`<div class="empty"><h3>Loading profile…</h3></div>`;
  if(v.missing) return back+`<div class="we-empty"><h3>Player not found</h3></div>`;
  if(v.unavailable||v.error) return back+`<div class="we-empty"><h3>Couldn't load this profile</h3><button class="btn btn-primary" data-action="view-player" data-id="${esc(id)}">Retry</button></div>`;
  const p=v.data, wk=weekKeyNow(), wd=(p.weeklyDmg&&p.weeklyDmg.week===wk)?(p.weeklyDmg.dmg||0):0, pv=p.pvp||{rating:1000,wins:0,losses:0};
  const fmtDate=ts=>new Date(Number(ts)||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const ago=p.updatedAt?(Date.now()-p.updatedAt<5*60*1000?'now':fmtRelative(p.updatedAt)+' ago'):'—';
  const kdef=KINGDOMS.find(k=>k.id===p.kingdomId);
  const hero=`<div class="we-chero we-phero"><div class="we-banner"></div><div class="we-chead"><div class="we-pav"><div class="we-avatar">${esc((p.username||'?').slice(0,2).toUpperCase())}</div><span class="lv">${p.level||1}</span></div><div><h2>${kdef?kingdomFlag(p.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px'):''}${esc(p.username)} ${viewOnlyChip()}</h2><div class="we-cstats pl"><span><small>Citizen since</small><b>${fmtDate(p.createdAt)}</b></span><span><small>Last connection</small><b>${ago}</b></span></div></div></div></div>`;
  const country=kdef?`<div class="we-sec">COUNTRY</div><div class="we-opp" data-action="view-country" data-id="${esc(p.kingdomId)}" style="cursor:pointer"><div class="we-cflag">${kingdomFlag(p.kingdomId,30,'margin:0')}</div><div class="nm"><b>${esc(kdef.name)}</b><small>${esc(p.kingdomRole||'Recruit')}</small></div><span class="faint">View &rsaquo;</span></div>`:'';
  return back+hero+`
    <div class="we-sec">RANKINGS</div>
    <div class="we-tiles">${weTile('Level',p.level||1)}${weTile('Class',CLASSES[p.class]?CLASSES[p.class].name:'—')}${weTile('PvP rating',Math.round(pv.rating||1000),'gold')}${weTile('Wins / Losses',(pv.wins||0)+' / '+(pv.losses||0),'green')}${weTile('Weekly damages',fmtNum(wd))}${weTile('Total damages',fmtNum(p.totalDmg||0))}</div>
    ${country}`;
}
function renderWarDetail(){
  const all=[...(S.worldWars?.active||[]),...(S.worldWars?.recent||[])];
  const w=all.find(x=>x.id===S.worldWarsSelected);
  const back=`<button class="btn btn-sm" data-action="nav" data-screen="world" style="margin:0 0 12px">&larr; Battles</button>`;
  if(S.worldWars===null){ loadWorldWars(); return back+`<div class="empty"><h3>Loading war…</h3></div>`; }
  if(!w) return back+`<div class="we-empty"><h3>War not found</h3><p>It may have just ended. Check the History tab.</p></div>`;
  const a=w.attackerCountryId, d=w.defenderCountryId, sc=w.finalScore||warScore(w), sa=sc.a??sc[a]??0, sd=sc.d??sc[d]??0;
  const rs=w.rounds||[], round=currentWarRound(w), my=S.char&&S.char.kingdomId, mine=(a===my||d===my);
  const finished=w.status==='finished'||w.endedAt;
  if(S.warFighters===undefined || !S.warFighters[w.id]) loadWarFighters(w.id);
  const wf=(S.warFighters&&S.warFighters[w.id])||{list:[],loading:true};
  const col=cid=>wf.list.filter(f=>f.countryId===cid).slice(0,8).map((f,i)=>`<div class="we-rank" data-action="view-player" data-id="${esc(f.uid)}" style="cursor:pointer"><i>${i+1}</i><div class="we-gav"><span>${esc((f.username||'?').slice(0,2).toUpperCase())}</span><i>${f.level||1}</i></div><b>${esc(f.username)}</b><span class="dm">${fmtNum(f.dmg)}</span></div>`).join('')||'<p class="faint" style="padding:6px 2px">'+(wf.loading?'Loading…':'No fighters yet')+'</p>';
  const fighters=`<div class="we-sec">TOP FIGHTERS</div><div class="we-fcols"><div><div class="we-fh">${kingdomFlag(a,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(countryName(a))}</div><div class="we-ranks">${col(a)}</div></div><div><div class="we-fh">${kingdomFlag(d,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(countryName(d))}</div><div class="we-ranks">${col(d)}</div></div></div>`;
  const rrows=rs.map(r=>{
    const dm=r.damage||{}, da=Number(dm[a]||0), dd=Number(dm[d]||0), t=da+dd, pa=t?Math.round(da/t*100):50;
    const st=r.winner?`Won by ${esc(countryName(r.winner))}`:(round&&round.round===r.round?'In progress':'Pending');
    return `<div class="we-tile" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><b style="font-size:14px">Round ${r.round}</b><small style="color:var(--text-dim)">${st}</small></div>
      <div class="we-dmgbar" style="margin-top:8px"><span class="l">${fmtNum(da)}</span><div><i style="width:${pa}%"></i></div><span class="r">${fmtNum(dd)}</span></div></div>`;
  }).join('')||'<p class="faint">No rounds started yet.</p>';
  return back+`
  <div class="we-wd">
    <div class="we-wd-side" data-action="view-country" data-id="${esc(a)}" style="cursor:pointer">${kingdomFlag(a,56,'margin:0')}<b>${esc(countryName(a))}</b><small>Attacker</small></div>
    <div class="we-wd-score"><strong>${sa}</strong><em>—</em><strong>${sd}</strong><div class="we-chip">${finished?'FINISHED':(w.status==='preparing'?'PREPARING':'ACTIVE')}</div></div>
    <div class="we-wd-side" data-action="view-country" data-id="${esc(d)}" style="cursor:pointer">${kingdomFlag(d,56,'margin:0')}<b>${esc(countryName(d))}</b><small>Defender</small></div>
  </div>
  ${round?.endsAt&&!finished?`<div class="we-tile" style="text-align:center;margin-top:10px"><small>Round ${round.round} ends in</small><b>${countdown(round.endsAt)}</b></div>`:''}
  ${fighters}
  <div class="we-sec">ROUNDS</div>${rrows}
  ${mine&&!finished?`<button class="btn btn-primary btn-block" style="margin-top:12px;padding:12px" data-action="open-war-room">Open War Room</button>`:`<p class="faint" style="margin-top:12px">${mine?'This war is over.':'Only citizens of the two countries can fight in this war.'}</p>`}`;
}
function renderWorld(){
  if(S.worldWars===null){
    loadWorldWars();
    return `${weHero('Loading the realm…','Connecting to the living world')}<div class="world-loading"><div class="loader-ring"></div></div>`;
  }
  const active=S.worldWars.active||[], recent=S.worldWars.recent||[];
  const my=S.char&&S.char.kingdomId, bt=S.battleTab==='history'?'history':'active', bf=S.battleFilter||'all';
  const involves=w=>w.attackerCountryId===my||w.defenderCountryId===my;
  const list=active.filter(w=>bf==='mine'?involves(w):bf==='enemies'?(involves(w)&&true):true);
  const mine=list.filter(involves), others=list.filter(w=>!involves(w));
  const section=(t,ws)=>ws.length?`<div class="we-sec">${t}</div><div class="we-battles">${ws.map(renderWorldWarCard).join('')}</div>`:'';
  const chips=[['all','All'],['mine','Your country']].map(f=>`<button class="we-fchip ${bf===f[0]?'on':''}" data-action="battle-filter" data-f="${f[0]}">${f[1]}</button>`).join('');
  const tabRow=`<div class="country-module-nav we-ptabs"><button class="country-module ${bt==='active'?'active':''}" data-action="battle-tab" data-tab="active">${icon('sword')}<span>Active</span>${active.length?`<i class="we-dot">${active.length}</i>`:''}</button><button class="country-module ${bt==='history'?'active':''}" data-action="battle-tab" data-tab="history">${icon('chart')}<span>History</span></button></div>`;
  const hist=`<div class="panel world-history">${recent.slice(0,15).map(w=>`<div class="history-war"><span class="history-result ${w.winnerCountryId===w.attackerCountryId?'a':'d'}">${w.winnerCountryId===w.attackerCountryId?'VICTORY':'RESULT'}</span><b>${kingdomFlag(w.attackerCountryId)}${esc(countryName(w.attackerCountryId))}</b><span>vs</span><b>${kingdomFlag(w.defenderCountryId)}${esc(countryName(w.defenderCountryId))}</b><strong>${w.finalScore?.a ?? warScore(w).a} — ${w.finalScore?.d ?? warScore(w).d}</strong><time>${fmtRelative(w.endedAt)}</time></div>`).join('')||'<div class="empty-mini">No finished wars yet.</div>'}</div>`;
  const activeView=`<div class="we-sec">ONGOING BATTLES</div>${active.length?'':'<p class="faint">Nothing in play. Wars declared by countries will show up here.</p>'}<div class="we-filters">${chips}</div>${section('YOUR COUNTRY',mine)}${section('OTHER WARS',others)}`;
  const countries=`<div class="we-sec">COUNTRIES</div><div class="we-countries">${KINGDOMS.slice(0,40).map(k=>{const atWar=active.some(w=>w.attackerCountryId===k.id||w.defenderCountryId===k.id);return `<button class="we-country ${atWar?'at-war':''}" data-action="view-country" data-id="${k.id}"><span class="fl">${kingdomFlag(k.id)}</span><span><b>${esc(k.name)}</b><small>${atWar?'AT WAR':'Peace'} · tax ${k.tax}%</small></span></button>`}).join('')}</div>`;
  return `<div class="we-chero"><div class="we-banner war"></div><div class="we-chead"><div><h2>Battles</h2></div></div></div>${tabRow}${bt==='history'?hist:activeView}${countries}`;
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
function weHero(title, sub, cls){
  return `<div class="we-chero"><div class="we-banner ${cls||''}"></div><div class="we-chead"><div><h2>${title}</h2>${sub?`<small>${sub}</small>`:''}</div></div></div>`;
}
function weTile(l,v,cls){ return `<div class="we-tile ${cls||''}"><small>${l}</small><b>${v}</b></div>`; }
function renderAdventure(){
  const c = S.char;
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
  ${weHero('Realm Explorer','Select a zone to hunt monsters and gather resources','pve')}
  <div class="we-tiles" style="margin-top:12px">${weTile('Level',c.level)}${weTile('Energy',Math.floor(c.energyCur)+'/'+effectiveStats(c).maxEnergy,'green')}${weTile('Zones open',ZONES.filter(z=>c.level>=z.min-5).length+'/'+ZONES.length,'gold')}</div>
  <div class="we-sec">ZONES</div>
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
  const act=(cls,ic,title,desc,cost,action,dis)=>`<button class="we-act ${cls}" data-action="${action}" data-zone="${z.id}" ${dis?'disabled':''}><span class="ai">${icon(ic)}</span><b>${title}</b><small>${desc}</small><em>${cost}</em></button>`;
  return `
  <button class="btn btn-sm" data-action="nav" data-screen="adventure" style="margin-bottom:12px;">&larr; Realm Explorer</button>
  <div class="we-zhero" style="background:linear-gradient(180deg,rgba(22,26,29,.1),rgba(22,26,29,.92)),${banner}"><div class="we-zov"><h2>${z.name}</h2><div class="we-chips"><span class="we-chip">Lv ${z.min}&ndash;${z.uncapped?z.min+'+':z.max}</span><span class="we-chip">${icon('sword','style="width:11px;height:11px;vertical-align:-1px"')} ${z.monsters.length} monsters</span></div></div></div>
  <div class="we-sec">RESOURCES</div><div class="we-res">${z.resources.map(r=>`<div class="country-resource"><div class="country-resource-icon">${resourceIcon(r,22)}</div><span>${RESOURCE_NAMES[r]}</span></div>`).join('')}</div>
  <div class="we-sec">ZONE BOSS</div>
  <div class="we-tile ${bossCd>0?'':'gold'}" style="display:flex;justify-content:space-between;align-items:center"><div><small>Boss</small><b>${z.boss}</b></div><span class="we-chip">${bossCd>0?'Ready in '+fmtMs(bossCd):'Ready'}</span></div>
  <div class="we-sec">ACTIONS</div>
  <div class="we-acts">
    ${act('green','arrow','Take a Step','Wander the road: cheap, mostly small finds','Low energy','zone-road',locked)}
    ${act('blue','target','Explore','Find monsters and resources','Energy','enter-zone',locked)}
    ${act('red','sword','Elite Hunt','Tougher monster, better drops','20 Energy','enter-zone-elite',eliteLocked)}
    ${act('gold','crown','Zone Boss','Unique boss, guaranteed high-tier drop','30 Energy · 30m cd','enter-zone-boss',bossLocked)}
  </div>`;
}

function renderRoad(){
  const c = S.char;
  const road = S.road;
  const zone = ZONES.find(z=>z.id===road.zoneId);
  const g = road.gained;
  const resSummary = Object.entries(g.resources).map(([k,v])=>`+${v} ${resourceIcon(k,14)} ${RESOURCE_NAMES[k]}`).join(', ');
  return `
  ${weHero('The Road &mdash; '+zone.name,'Each step costs '+STEP_ENERGY_COST+' Energy. Most steps are quiet, some pay off, and sometimes something finds you.','pve')}
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
  ${weHero('Crafting','Turn raw resources and Energy into materials and potions','market')}
  <div class="we-tiles" style="margin-top:12px">${weTile('Backpack',bagCount(c)+'/'+BAG_CAPACITY)}${weTile('Energy',Math.floor(c.energyCur)+'/'+eff.maxEnergy,'green')}</div>
  <div class="we-sec">RESOURCES</div>
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
  ${weHero('Inventory','Bag: '+bagCount(c)+'/'+BAG_CAPACITY,'market')}
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
  const tab = ['skills','settings'].includes(S.profileTab) ? S.profileTab : 'stats';
  const _c=S.char;
  const fmtDate=ts=>new Date(Number(ts)||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const tabs=[['stats','Home','user'],['skills','Skills','chart'],['settings','Settings','gear']];
  const tabRow=`<div class="country-module-nav we-ptabs">${tabs.map(t=>`<button class="country-module ${tab===t[0]?'active':''}" data-action="profile-tab" data-tab="${t[0]}">${icon(t[2])}<span>${t[1]}</span>${t[0]==='skills'&&_c.skillPoints>0?`<i class="we-dot">${_c.skillPoints}</i>`:''}</button>`).join('')}</div>`;
  const hero=`<div class="we-chero we-phero"><div class="we-banner"></div><div class="we-chead"><div class="we-pav"><div class="we-avatar">${esc(_c.username.slice(0,2).toUpperCase())}</div><span class="lv">${_c.level}</span><span class="fg">${kingdomFlag(_c.kingdomId,16,'margin:0;vertical-align:0')}</span></div><div><h2>${kingdomFlag(_c.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(_c.username)}</h2><div class="we-cstats pl"><span><small>Citizen since</small><b>${fmtDate(_c.createdAt)}</b></span><span><small>Last connection</small><b>${fmtRelative(_c.updatedAt)==='now'?'now':fmtRelative(_c.updatedAt)+' ago'}</b></span></div></div></div></div>`;
  return hero + tabRow + (tab==='settings' ? renderSettings() : renderProfileStats(tab));
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
  const tile=(l,v,cls)=>`<div class="we-tile ${cls||''}"><small>${l}</small><b>${v}</b></div>`;
  if(tab==='skills'){
    return `
    <div class="we-skillhead"><div class="we-lvl">${c.level}</div><div><b>${c.skillPoints} skill points</b><br><span class="faint">Upgrade your skills!</span></div><button class="btn btn-danger btn-sm" data-action="reset-skills" style="margin-left:auto">Reset</button></div>
    <div class="we-sec">${esc(cls.resource).toUpperCase()} SKILLS</div>
    <div class="we-skills">${classRows}</div>
    <div class="we-sec">GENERAL SKILLS</div>
    <div class="we-skills">${genRows}</div>`;
  }
  const eqRow=EQUIP_SLOTS.map(sl=>{ const it=(c.equipment||{})[sl]; return `<button class="we-eq ${it?'tier-'+it.tier:''}" data-action="nav" data-screen="inventory" title="${esc(it?it.name:sl)}">${it?esc(it.name.slice(0,2).toUpperCase()):'+'}<small>${sl}</small></button>`; }).join('');
  return `
  <div class="we-sec">EQUIPMENT</div>
  <div class="we-eqrow">${eqRow}</div>
  <div class="we-sec">RANKINGS</div>
  <div class="we-tiles">
    ${tile('Level',c.level)}
    ${tile('XP',fmtNum(c.xp||0)+(need?' / '+fmtNum(need):''),'gold')}
    ${tile('PvP rating',Math.round(c.pvp.rating))}
    ${tile('Wins / Losses',c.pvp.wins+' / '+c.pvp.losses,'green')}
  </div>
  <div class="we-sec">WEALTH</div>
  <div class="we-tiles">
    ${tile('Gold',fmtNum(c.gold),'gold')}
    ${tile('Items',(c.inventory||[]).length)}
    ${tile('Skill points',c.skillPoints)}
  </div>
  <div class="we-sec">COMBAT STATS</div>
  <div class="we-tiles">
    ${tile('Max HP',eff.maxHp)}${tile('Attack',eff.atk)}${tile('Defense',eff.def)}${tile('Speed',eff.spd)}
    ${tile('Crit %',eff.crit+'%')}${tile('Evasion %',eff.eva+'%')}${tile('Max Energy',eff.maxEnergy)}${tile('Max Mana',eff.maxMana)}
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
  ${weHero('Settings','Appearance and account')}

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
          <div class="kingdom-discover-title"><span class="eyebrow">KINGDOM</span><h3>${k.name}</h3><p>${k.memberCount} citizens · ${k.tax}% tax</p></div>
        </div>
        <div class="kingdom-resource-row">${k.resources.map(r=>`<span>${resourceIcon(r,16)} ${RESOURCE_NAMES[r]||titleCase(r)}</span>`).join('')}</div>
        <div class="kingdom-discover-foot"><span>${icon('coins')} Treasury <b>${fmtNum(k.treasury.gold||0)}</b></span><button class="btn btn-primary btn-sm" data-action="join-kingdom" data-kingdom="${k.id}">Join Kingdom</button></div>
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
    return `<div class="member-line"><div class="member-avatar" data-action="view-player" data-id="${m.id}">${(m.username||'?').slice(0,2).toUpperCase()}</div><div class="member-main" data-action="view-player" data-id="${m.id}" style="cursor:pointer"><b>${esc(m.username)} ${isMe?'<span class="faint">· You</span>':''}</b><small>Lv.${m.level||1} · ${m.kingdomRole||'Recruit'}</small></div><div class="member-actions">${actions}</div></div>`;
  }).join('');
  const treasuryRows = KINGDOM_TREASURY_RESOURCES.map(r=>`<div><span>${resourceIcon(r,14)} ${r==='gold'?'Gold':RESOURCE_NAMES[r]||r}</span><b>${fmtNum(treasury[r]||0)}</b></div>`).join('');
  const chat = Array.isArray(k.chat) ? k.chat : [];
  const chatLines = chat.slice().reverse().map(m=>`<div class="log-line"><b>${esc(m.senderName)}:</b> ${esc(m.text)}</div>`).join('') || '<div class="faint" style="padding:8px;">No messages yet. Say hello.</div>';
  const st = S.countryState && S.countryState.data;
  const activeWar = st && st.activeWar;
  const tabs = ['overview','government','treasury','war','citizens','chat','rankings','economy'];
  const tabLabel = {overview:'Home',government:'Government',treasury:'Account',war:'Wars',citizens:'Citizens',chat:'Chat',rankings:'Rankings',economy:'Economy'};
  const tabIcon = {overview:'castle',citizens:'users',government:'crown',treasury:'coins',chat:'chat',rankings:'chart',economy:'hammer',war:'swords'};
  const activeTab = tabs.includes(S.kingdomTab) ? S.kingdomTab : 'overview';
  const tabRow = `<div class="country-module-nav">${tabs.map(t=>`<button class="country-module ${activeTab===t?'active':''}" data-action="kingdom-tab" data-tab="${t}">${icon(tabIcon[t])}<span>${tabLabel[t]}</span>${t==='war'&&activeWar?'<i>LIVE</i>':''}</button>`).join('')}</div>`;

  const resourceTiles = kdef.resources.map(r=>`<div class="country-resource"><div class="country-resource-icon">${resourceIcon(r,25)}</div><span>${RESOURCE_NAMES[r]||r}</span><b>${fmtNum(st?.resources?.[r]||0)}</b></div>`).join('');
  const readiness = activeWar ? 'WAR ACTIVE' : 'PEACE';
  const readinessClass = activeWar ? 'danger' : 'safe';
  const avatarHtml=(m,cls)=>m?`<div class="we-gav ${cls||''}" data-action="view-player" data-id="${esc(m.id)}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i></div>`:'';
  const byRole=r=>members.filter(m=>m.kingdomRole===r);
  const roleCard=(label,cls,list)=>`<div class="we-role ${cls}"><h4>${label}</h4>${list.length?list.map(m=>`<div class="we-role-p">${avatarHtml(m)}<b>${esc(m.username)}</b></div>`).join(''):'<p>No one nominated yet.</p>'}</div>`;
  const weHome=`
    <div class="we-sec">RANKINGS</div>
    <div class="we-tiles">
      <div class="we-tile green"><small>Active population</small><b>${members.length}</b></div>
      <div class="we-tile gold"><small>Treasury</small><b>${fmtNum(treasury.gold||0)}</b></div>
      <div class="we-tile"><small>National tax</small><b>${kdef.tax}%</b></div>
      <div class="we-tile"><small>Total power</small><b>${fmtNum(members.reduce((n,m)=>n+(m.level||1),0))}</b></div>
    </div>
    <div class="we-sec">GOVERNMENT</div>
    <div class="we-gov-strip">${['Leader','Co-Leader','Officer'].map(r=>byRole(r).slice(0,4).map(m=>avatarHtml(m,r==='Leader'?'gold':r==='Co-Leader'?'blue':'red')).join('')).join('')||'<p class="faint">No government yet.</p>'}</div>
    <div class="we-sec">NATIONAL RESOURCES</div>
    <div class="we-res">${resourceTiles||'<span class="faint">None</span>'}</div>
    <div class="we-sec">${icon('castle','style="width:12px;height:12px"')} YOUR POSITION</div>
    <div class="we-tile"><small>Role</small><b>${c.kingdomRole||'Recruit'}</b></div>`;
  const weGov=`<div class="we-gov-grid">
    <div class="we-role gold wide">${'<h4>★ Leader</h4>'}${byRole('Leader').map(m=>`<div class="we-role-p c">${avatarHtml(m,'gold')}<b>${esc(m.username)}</b></div>`).join('')||'<p>No one nominated yet.</p>'}</div>
    ${roleCard('Co-Leader','blue',byRole('Co-Leader'))}
    ${roleCard('Officers','red',byRole('Officer'))}
  </div>`;
  const weCit=`<div class="country-card"><div class="country-card-head"><span>CITIZENS</span><b>${members.length}</b></div><div class="member-list">${memberRows}</div></div>`;

  let tabBody='';
  if(activeTab==='overview') tabBody=weHome;
  else if(activeTab==='citizens') tabBody=weCit;
  else if(activeTab==='government') tabBody=weGov;
  else if(activeTab==='treasury') tabBody=`<div class="country-card wide"><div class="country-card-head"><span>ROYAL TREASURY</span><b>${fmtNum(treasury.gold||0)} GOLD</b></div><div class="treasury-big"><div class="treasury-emblem">${icon('coins')}</div><div><small>AVAILABLE GOLD</small><strong>${fmtNum(treasury.gold||0)}</strong><p>Funds contributed by the citizens of ${kdef.name}.</p></div></div><div class="stat-list treasury-list">${treasuryRows}</div><div class="country-actions"><button class="btn btn-primary" data-action="donate-kingdom" data-resource="gold" data-amount="50">Donate 50 Gold</button><button class="btn" data-action="donate-kingdom" data-resource="gold" data-amount="200">Donate 200 Gold</button></div></div>`;
  else if(activeTab==='chat') tabBody=`<div class="country-card wide"><div class="country-card-head"><span>INNER COURT CHAT</span><b>${chat.length} messages</b></div><div class="log kingdom-chat-modern" id="kingdom-chat-log">${chatLines}</div><div class="chat-compose"><input type="text" id="kingdom-chat-input" maxlength="200" placeholder="Speak to your kingdom..."><button class="btn btn-primary" data-action="kingdom-chat-send">Send</button></div></div>`;
  else if(activeTab==='rankings') tabBody=renderRankings(c);
  else if(activeTab==='economy') tabBody=renderEconomy(c,kv);
  else if(activeTab==='war') tabBody=renderWar(c,kv);

  return `
    <div class="we-chero">
      <div class="we-banner"></div>
      <div class="we-chead"><div class="we-flag">${flagIcon(kdef.flag,64)}</div><div><small>⚑ Country</small><h2>${esc(kdef.name)}</h2><div class="we-cstats"><span><small>Citizens</small><b>${members.length}</b></span><span><small>Treasury</small><b>${fmtNum(treasury.gold||0)}</b></span><span><small>Tax</small><b>${kdef.tax}%</b></span><span><small>Status</small><b class="${readinessClass}">${readiness}</b></span></div></div></div>
    </div>
    ${leaderMissing ? `<div class="country-alert"><span>${icon('crown')}</span><div><b>Leadership is vacant</b><p>${govMembers.length?'An Officer or above can claim leadership.':'No Officer exists yet, so any citizen can claim leadership.'}</p></div>${(myRank>=2||!govMembers.length)?'<button class="btn btn-primary btn-sm" data-action="claim-leadership">Claim Leadership</button>':''}</div>`:''}
    ${tabRow}
    ${tabBody}
    <div class="country-footer-action"><button class="btn btn-danger" data-action="leave-kingdom">Leave Kingdom</button></div>`;
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
      const tRow=(t,i)=>{ const mem = kv.members.find(x=>x.id===t.uid); const nm=t.username||(mem?mem.username:'Player'), lvl=t.level||(mem?mem.level:1)||1; return `<div class="we-rank" data-action="view-player" data-id="${esc(t.uid)}"><i>${i+1}</i><div class="we-gav"><span>${esc(nm.slice(0,2).toUpperCase())}</span><i>${lvl}</i></div><b>${esc(nm)}</b><span class="dm">${fmtNum(t.damage)}</span></div>`; };
      const sideList=cc=>(lv.top||[]).filter(t=>t.country===cc||(!t.country&&cc===me)).map(tRow).join('')||'<p class="faint">No damage yet.</p>';
      const top = (lv.top&&lv.top.length) ? `<div class="we-two"><div><div class="we-sec">DEFENDERS · ${kingdomFlag(d)}${esc(countryName(d))}</div><div class="we-ranks">${sideList(d)}</div></div><div><div class="we-sec">ATTACKERS · ${kingdomFlag(a)}${esc(countryName(a))}</div><div class="we-ranks">${sideList(a)}</div></div></div>` : '';
      html += `<div class="panel" style="margin-bottom:16px;">
        <div class="panel-title">${lv.round===3?'ROUND 3 &mdash; FINAL ROUND':'CURRENT WAR'}</div>${head}
        <div class="we-dmgbar big" style="margin-top:12px"><span class="l">${kingdomFlag(a)}${fmtNum(lv.damage[a]||0)}</span><div><i style="width:${((lv.damage[a]||0)+(lv.damage[d]||0))?Math.round((lv.damage[a]||0)/((lv.damage[a]||0)+(lv.damage[d]||0))*100):50}%"></i></div><span class="r">${fmtNum(lv.damage[d]||0)}${kingdomFlag(d)}</span></div>
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
      ${top ? `<div class="panel" style="margin-bottom:16px;"><div class="panel-title">Top fighters this round</div>${top}</div>` : ''}`;
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
function renderGlobalRankings(){
  const rv=S.rankingsView, tab=S.rankTab==='countries'?'countries':'players', my=S.char;
  const head=`<div class="we-chero"><div class="we-banner"></div><div class="we-chead"><div><h2>Rankings</h2></div></div></div>
    <div class="country-module-nav we-ptabs"><button class="country-module ${tab==='players'?'active':''}" data-action="rank-tab" data-tab="players">${icon('user')}<span>Players</span></button><button class="country-module ${tab==='countries'?'active':''}" data-action="rank-tab" data-tab="countries">${icon('globe')}<span>Countries</span></button></div>`;
  if(!rv || rv.loading) return head+`<div class="empty"><h3>Loading rankings...</h3></div>`;
  if(rv.unavailable) return head+`<div class="panel empty"><h3>Rankings unavailable</h3></div>`;
  if(rv.error) return head+`<div class="panel empty"><h3>Couldn't load rankings</h3><button class="btn btn-primary" data-action="nav" data-screen="rankings">Retry</button></div>`;
  const resets=Math.max(0,weekResetsAt()-srvNow());
  const medal=['gold','silver','bronze'];
  const pl=rv.weeklyPlayers||[], co=rv.weeklyCountries||[];
  const myIdx=pl.findIndex(p=>p.username===my.username), myCo=co.findIndex(x=>x.id===my.kingdomId);
  const tiles=`<div class="we-tiles"><div class="we-tile gold"><small>Weekly damages reset in</small><b>${fmtMs(resets)}</b></div><div class="we-tile"><small>Your player rank</small><b>${myIdx>=0?'#'+(myIdx+1):'—'}</b></div><div class="we-tile"><small>Your country rank</small><b>${myCo>=0?'#'+(myCo+1):'—'}</b></div></div>`;
  let rows;
  if(tab==='players'){
    rows=pl.map((p,i)=>`<div class="we-rrow ${medal[i]||''} ${p.username===my.username?'me':''}" ${p.id?`data-action="view-player" data-id="${esc(p.id)}"`:''} style="cursor:pointer"><span class="rk">${i+1}</span><div class="we-gav"><span>${esc(p.username.slice(0,2).toUpperCase())}</span><i>${p.level}</i></div><div class="nm"><b>${esc(p.username)}</b><small>${kingdomFlag(p.kingdomId,14,'margin:0 4px 0 0;vertical-align:-2px')}${esc(countryName(p.kingdomId)||'')}</small></div><span class="dm">${icon('sword','style="width:13px;height:13px"')} ${fmtNum(p.dmg)}</span></div>`).join('');
  } else {
    rows=co.map((x,i)=>`<div class="we-rrow ${medal[i]||''} ${x.id===my.kingdomId?'me':''}" data-action="view-country" data-id="${esc(x.id)}" style="cursor:pointer"><span class="rk">${i+1}</span><div class="we-cflag">${kingdomFlag(x.id,30,'margin:0')}</div><div class="nm"><b>${esc(countryName(x.id))}</b><small>${x.fighters} fighter${x.fighters===1?'':'s'}</small></div><span class="dm">${icon('sword','style="width:13px;height:13px"')} ${fmtNum(x.dmg)}</span></div>`).join('');
  }
  return head+`<div class="we-sec">WEEKLY DAMAGES</div>${tiles}<div class="we-sec">${tab==='players'?'TOP PLAYERS':'TOP COUNTRIES'}</div>${rows||'<p class="faint">No damage dealt this week yet. Strike in a war to appear here.</p>'}`;
}
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
  const playerRows = rv.topPlayers.map((p,i)=>`<div class="row" style="padding:6px 0;" ${p.id?`data-action="view-player" data-id="${esc(p.id)}"`:''}>
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
function chatNameColor(n){ let h=0; for(const ch of String(n||'')) h=(h*31+ch.charCodeAt(0))%360; return `hsl(${h},70%,72%)`; }
function chatMsgHtml(m){ // used by the new-message popup
  const ini = esc((m.senderName||'?').slice(0,2).toUpperCase());
  return `<div class="we-msg"><div class="we-av"><div class="av">${ini}</div><span class="lv">${m.senderLevel||1}</span><span class="fg">${kingdomFlag(m.senderKingdom,16,'margin:0;vertical-align:0')}</span></div><div class="bd"><b style="color:${chatNameColor(m.senderName)}">${esc(m.senderName)}</b><p>${esc(m.text)}</p></div></div>`;
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
  const mine = m.senderId ? m.senderId===MY_ID : m.senderName===S.char.username;
  const role = roleOf ? roleOf(m) : null;
  const txt = `<p>${esc(m.text)}</p>`;
  if(!first) return `<div class="we-msg cont ${mine?'mine':''}"><div class="we-sp"></div><div class="bd">${txt}</div></div>`;
  const ini = esc((m.senderName||'?').slice(0,2).toUpperCase());
  return `<div class="we-msg ${mine?'mine':''}"><div class="we-av" ${m.senderId?`data-action="view-player" data-id="${esc(m.senderId)}"`:''}><div class="av">${ini}</div><span class="lv">${m.senderLevel||1}</span><span class="fg">${kingdomFlag(m.senderKingdom,16,'margin:0;vertical-align:0')}</span></div>
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
  const row=m=>`<div class="we-mrow" data-action="view-player" data-id="${esc(m.id)}" style="cursor:pointer"><div class="we-gav ${m.online?'on':''}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><i>${m.level||1}</i><u class="dot ${m.online?'on':''}"></u></div><div class="nm"><b>${esc(m.username)}</b><small>${esc(m.kingdomRole||'Recruit')}</small></div>${CHAT_ROLE_ICON[m.kingdomRole]?`<span class="rl">${icon(CHAT_ROLE_ICON[m.kingdomRole])}</span>`:''}</div>`;
  const on=list.filter(m=>m.online), off=list.filter(m=>!m.online);
  return `<div class="we-mpanel"><div class="we-sec" style="margin-top:4px">ONLINE — ${on.length}</div>${on.map(row).join('')||'<p class="faint">Nobody online.</p>'}${off.length?`<div class="we-sec">OFFLINE — ${off.length}</div>${off.map(row).join('')}`:''}</div>`;
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
    if(mem) sub=`${mem.length} citizens · ${mem.filter(m=>m.online).length} online`; else sub='Loading…';
    if(S.chatMembersOpen) body=chatMembersPanel();
    else if(!kv || kv.loading) body=`<div class="faint" style="padding:12px;">Loading country chat...</div>`;
    else if(kv.mode!=='mine') body=`<div class="faint" style="padding:12px;">Country chat unavailable.</div>`;
    else {
      const msgs=(kv.kingdom.chat||[]).map(m=>Object.assign({senderKingdom:c.kingdomId, senderLevel:lvlMap[m.senderId]||m.senderLevel||1}, m));
      body = chatListHtml(msgs, m=>roleMap[m.senderId]) || '<div class="faint" style="padding:12px;">No messages yet. Rally your country!</div>';
    }
  }
  const strip = ch==='country' && chatMembers() ? `<div class="we-mstrip">${chatMembers().slice(0,8).map(m=>`<div class="we-gav sm ${m.online?'on':''}" title="${esc(m.username)}" data-action="view-player" data-id="${esc(m.id)}"><span>${esc((m.username||'?').slice(0,2).toUpperCase())}</span><u class="dot ${m.online?'on':''}"></u></div>`).join('')}<button class="we-mmore ${S.chatMembersOpen?'on':''}" data-action="chat-members-toggle">${icon('users')} ${S.chatMembersOpen?'Back to chat':'All citizens'}</button></div>` : '';
  const title = ch==='country' ? `${kingdomFlag(c.kingdomId,18,'margin:0 8px 0 0;vertical-align:-3px')}${esc(countryName(c.kingdomId))}` : 'World Chat';
  return `
  <div class="chat-widget-panel we-chatpanel">
    <div class="we-ch-head"><div><b>${title}</b><small>${sub}</small></div><button class="chat-widget-close" data-action="chat-widget-toggle">&times;</button></div>
    <div class="we-chat-tabs">
      <button class="${ch==='global'?'on':''}" data-action="chat-channel" data-ch="global">World${unreadG?`<i class="we-dot">${unreadG>9?'9+':unreadG}</i>`:''}</button>
      <button class="${ch==='country'?'on':''}" data-action="chat-channel" data-ch="country" ${hasCountry?'':'disabled title="Join a country first"'}>${hasCountry?kingdomFlag(c.kingdomId,14,'margin:0 6px 0 0;vertical-align:-2px'):''}Country${unreadK?`<i class="we-dot">${unreadK>9?'9+':unreadK}</i>`:''}</button>
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
    return `${weHero('Market','','market')}<div class="empty"><h3>Loading market...</h3></div>`;
  }
  if(S.marketUnavailable){
    return `
    ${weHero('Market','','market')}
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
  ${weHero('Market','Buy and sell resources, materials, potions and gear with other players','market')}
  ${tabs}
  ${body}`;
}

function renderPvp(){
  const c = S.char;
  const now = Date.now();
  const protectedMs = (c.pvp.protectedUntil||0) - now;
  const tot = c.pvp.wins + c.pvp.losses;
  const head = `${weHero('PvP Arena','Fight other players to climb the ladder','pvp')}
    <div class="we-tiles" style="margin-top:12px">${weTile('Rating',Math.round(c.pvp.rating),'gold')}${weTile('Wins',c.pvp.wins,'green')}${weTile('Losses',c.pvp.losses)}${weTile('Win rate',tot?Math.round(c.pvp.wins/tot*100)+'%':'—')}</div>`;
  const msg=(ic,t,p,extra)=>`${head}<div class="we-empty"><div class="ei">${icon(ic)}</div><h3>${t}</h3><p>${p}</p>${extra||''}</div>`;
  if(protectedMs > 0) return msg('shield','Under protection',"You're shielded from attack after your last loss.",`<div class="we-big">${fmtMs(protectedMs)}</div>`);
  if(c.energyCur < PVP_ENERGY_COST) return msg('bolt','Not enough energy',`PvP battles cost ${PVP_ENERGY_COST} Energy. Wait for it to regenerate.`);
  if(!S.pvpCandidates) return msg('target','Ready to fight?',`Search for an opponent near your level and rating. Costs ${PVP_ENERGY_COST} Energy.`,'<button class="btn btn-primary" data-action="find-opponents">Find Opponent</button>');
  const cards = S.pvpCandidates.map((o,i)=>{
    const oc = o.class ? CLASSES[o.class] : null, rt=Math.round(o.pvp?.rating||1000), diff=rt-Math.round(c.pvp.rating);
    return `<div class="we-opp"><div class="we-gav" ${o.id&&!o.isBot?`data-action="view-player" data-id="${esc(o.id)}"`:''}><span>${esc((o.username||'?').slice(0,2).toUpperCase())}</span><i>${o.level}</i></div>
      <div class="nm"><b>${kingdomFlag(o.kingdomId,16,'margin:0 6px 0 0;vertical-align:-2px')}${esc(o.username)}</b><small>${oc?oc.name+' · ':''}${o.isBot?'Unranked bot':'Rating '+rt}</small></div>
      <span class="we-diff ${diff>=0?'up':'down'}">${diff>=0?'+':''}${diff}</span>
      <button class="btn btn-primary btn-sm" data-action="fight-opponent" data-idx="${i}">Fight</button></div>`;
  }).join('');
  return `${head}<div class="we-sec">MATCHED OPPONENTS</div>${cards}<button class="btn" style="margin-top:6px" data-action="find-opponents">Search Again</button>`;
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
  ${weHero(cb.mode==='pve'?(cb.boss?'Zone Boss':cb.elite?'Elite Hunt':'Battle'):'PvP Duel','Round '+cb.round+' of '+cb.maxRounds,'pvp')}
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
  if(S.screen==='home') body = renderHome();
  else if(S.screen==='world') body = renderWorld();
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
        <div class="brand-mark">${icon('sword','style="width:100%;height:100%;stroke:#60a5fa"')}</div>
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
  <div class="tabbar">${renderTabbar(navActive)}</div>
  ${S.char ? renderChatWidget() : ''}
  ${(S.chatPop && !S.chatWidgetOpen) ? `<button class="chat-pop" data-action="chat-widget-toggle">${chatMsgHtml(S.chatPop)}</button>` : ''}
  ${S.toast ? `<div class="toast">${esc(S.toast)}</div>` : ''}
  `;
  if(S.char){ startChatListener(); startKingdomChatListener(); }
  if(S.screen==='kingdom'){
    const input = document.getElementById('kingdom-chat-input');
    if(input){
      input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); sendKingdomChat(input.value); } });
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
