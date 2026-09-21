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
function zoneBannerStyle(zoneId, extra){
  const photo = ZONE_PHOTOS[zoneId];
  const bg = (photo ? `url('${photo}') center/cover no-repeat, ` : '') + (ZONE_BANNERS[zoneId]||'var(--panel-2)');
  return `background:${bg};${extra||''}`;
}
function renderAdventure(){
  const c = S.char;
  const now = Date.now();
  const tiles = ZONES.map(z=>{
    const locked = c.level < z.min - 5;
    return `<div class="zone-tile ${locked?'locked':''}">
      <div class="zone-banner" style="${zoneBannerStyle(z.id)}"></div>
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
  return `
  <button class="btn btn-sm" data-action="nav" data-screen="adventure" style="margin-bottom:14px;">&larr; Realm Explorer</button>
  <div class="zone-banner" style="${zoneBannerStyle(z.id, 'height:140px;border-radius:12px;margin-bottom:16px;')}"></div>
  <div class="view-header"><h2>${z.name}</h2><p>Level ${z.min}&ndash;${z.uncapped?z.min+'+':z.max} &middot; Resources: ${z.resources.map(r=>RESOURCE_NAMES[r]).join(', ')}</p></div>
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
  const resSummary = Object.entries(g.resources).map(([k,v])=>`+${v} ${RESOURCE_NAMES[k]}`).join(', ');
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

