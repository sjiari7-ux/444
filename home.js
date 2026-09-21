/* ---------------- Home ---------------- */
function renderHome(){
  const c = S.char, eff = effectiveStats(c);
  const need = xpNeeded(c.level);
  return `
  <div class="view-header"><h2>Welcome back, ${esc(c.username)}</h2><p>${CLASSES[c.class].name} &middot; Level ${c.level} &middot; ${resourceTotal(c)} resources carried</p></div>
  <div class="grid grid-2" style="margin-bottom:16px;">
    <div class="panel">
      <div class="panel-title">Character</div>
      <div class="stat-list">
        <div><span>Level</span><b>${c.level}</b></div>
        <div><span>XP</span><b>${fmtNum(c.xp)} / ${fmtNum(need)}</b></div>
        <div><span>Gold</span><b>${fmtNum(c.gold)}</b></div>
        <div><span>Attack</span><b>${eff.atk}</b></div>
        <div><span>Defense</span><b>${eff.def}</b></div>
        <div><span>Speed</span><b>${eff.spd}</b></div>
      </div>
      <div class="divider"></div>
      <div class="row"><span class="muted">PvP Rating</span><b>${Math.round(c.pvp.rating)}</b></div>
      <div class="row" style="margin-top:6px;"><span class="muted">Record</span><b>${c.pvp.wins}W &ndash; ${c.pvp.losses}L</b></div>
    </div>
    <div class="panel">
      <div class="panel-title">Ready to act</div>
      <p class="faint" style="margin-bottom:14px;">Fight monsters to gain XP and gear, then take your build into the Arena.</p>
      <button class="btn btn-primary btn-block" data-action="nav" data-screen="adventure" style="margin-bottom:10px;">${icon('sword','style="width:16px;height:16px"')} Enter Adventure</button>
      <button class="btn btn-accent btn-block" data-action="nav" data-screen="pvp">${icon('target','style="width:16px;height:16px"')} Enter PvP Arena</button>
    </div>
  </div>
  <div class="panel">
    <div class="panel-title">The core loop</div>
    <p class="faint" style="line-height:1.7;">Build your character &rarr; prepare your build &rarr; fight &rarr; improve &rarr; enter PvP &rarr; raise your rating &rarr; face stronger opponents.</p>
  </div>`;
}

