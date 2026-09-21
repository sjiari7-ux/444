/* ---------------- Shell / nav ---------------- */
const NAV = [
  {id:'home', label:'Home', icon:'home'},
  {id:'adventure', label:'Adventure', icon:'sword'},
  {id:'pvp', label:'PvP', icon:'target'},
  {id:'kingdom', label:'Kingdom', icon:'crown'},
  {id:'market', label:'Market', icon:'scroll'},
  {id:'craft', label:'Craft', icon:'flask'},
  {id:'inventory', label:'Inventory', icon:'bag'},
  {id:'profile', label:'Profile', icon:'user'},
  {id:'settings', label:'Settings', icon:'gear'},
];

function renderStatusBar(){
  const c = S.char, eff = effectiveStats(c);
  const initials = c.username.slice(0,2).toUpperCase();
  const classIconSrc = CLASS_ICONS[c.class];
  const avatarInner = classIconSrc
    ? `<img src="${classIconSrc}" alt="" style="width:70%;height:70%;object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"><span style="display:none;">${initials}</span>`
    : initials;
  const hpRegen = Math.max(1, Math.round(eff.maxHp*HP_REGEN_PCT));
  return `
  <div class="statusbar">
    <div class="sb-id">
      <div class="sb-avatar">${avatarInner}<span class="sb-lvl-badge">${c.level}</span></div>
    </div>
    <div class="sb-bars">
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('heart','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.round(c.hpCur)}/${eff.maxHp}</span><span class="sb-regen">&#9650;${hpRegen}</span></div>
        <div class="bar-track"><div class="bar-fill bar-hp" style="width:${clamp(c.hpCur/eff.maxHp*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('bolt','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.round(c.energyCur)}/${eff.maxEnergy}</span><span class="sb-regen">&#9650;${ENERGY_REGEN_AMT}</span></div>
        <div class="bar-track"><div class="bar-fill bar-energy" style="width:${clamp(c.energyCur/eff.maxEnergy*100,0,100)}%"></div></div>
      </div>
      <div class="sb-bar">
        <div class="sb-bar-label"><span>${icon('drop','style="width:10px;height:10px;vertical-align:-1px"')} ${Math.round(c.manaCur)}/${eff.maxMana}</span><span class="sb-regen">&#9650;${MANA_REGEN_AMT}</span></div>
        <div class="bar-track"><div class="bar-fill bar-mana" style="width:${clamp(c.manaCur/eff.maxMana*100,0,100)}%"></div></div>
      </div>
    </div>
    <div class="sb-stat">${icon('crown','style="width:12px;height:12px;vertical-align:-1px; stroke:var(--brass-bright)"')} <b>${fmtNum(c.gold)}</b></div>
    <div class="sb-rating">${icon('shield','style="width:13px;height:13px"')} ${Math.round(c.pvp.rating)}</div>
  </div>`;
}

function renderNav(activeId){
  return NAV.map(n=>`<button class="navbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');
}
function renderTabbar(activeId){
  return NAV.map(n=>`<button class="tabbtn ${activeId===n.id?'active':''}" data-action="nav" data-screen="${n.id}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');
}

