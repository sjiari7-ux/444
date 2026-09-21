/* ---------------- Profile ---------------- */
function renderProfile(){
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
  <div class="view-header"><h2>Profile</h2><p>${esc(c.username)} &middot; ${cls.name} &middot; Level ${c.level}</p></div>
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
    <div class="row" style="margin-bottom:8px;">
      <div class="panel-title" style="margin:0;">General skills</div>
      <button class="btn btn-sm btn-danger" data-action="reset-general">Reset</button>
    </div>
    ${genRows}
  </div>`;
}

