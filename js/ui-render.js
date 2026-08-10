// ─── UI Renderers ───
function renderBodyHTML(){
  if(battleState) return renderBattle();
  switch(activeTab){
    case 'production': return renderProduction();
    case 'inventory': return renderInventory();
    case 'market': return renderMarket();
    case 'gear': return renderGear();
    case 'class': return renderClass();
    case 'skills': return renderSkills();
    case 'missions': return renderMissions();
    case 'leaderboard': return renderLeaderboard();
    case 'companies': return renderCompanies();
    case 'alliance': return renderAlliance();
    case 'settings': return renderSettings();
    case 'zones': return state.zoneView ? renderZoneView() : renderZones();
    default: return '';
  }
}

function renderProduction(){
  const cap = getStorageCap(state);
  const maxH = getMaxHealth(state);
  const maxE = getMaxEnergy(state);
  const ePct = maxE > 0 ? (state.energy/maxE)*100 : 0;
  return `
    <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:14px;color:var(--brass-bright);margin-bottom:8px;">🛠️ Crafting</div>
    ${renderCrafting()}
    <div class="panel" style="margin-top:14px;">
      <div class="panel-header">🍖 Recovery</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
        <div class="card" style="padding:12px;">
          <div style="font-size:13px;color:var(--dim);margin-bottom:8px;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡"> Energy</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="flex:1;"><div class="bar-track" style="height:10px;"><div class="bar-fill ${ePct<20?'warn':''}" style="width:${ePct}%"></div></div></div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--brass-bright);">${state.energy}/${maxE}</span>
          </div>
          <div style="font-size:11px;color:var(--dim);">Regenerates 1 point every 5 minutes</div>
        </div>
        <div class="card" style="padding:12px;">
          <div style="font-size:13px;color:var(--dim);margin-bottom:8px;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAx9JREFUSEuFVT1oFEEU/t5sBMFSxLh7gqA2prjdEyOikKTUQlGw11ZtEtRELXIp1EQladRWe0HRQstcoSgR7jZFbDQgeLsYxNJCzM7Tmf2b/bm4xd3e7c58P+97bwjJRQB44L35NF3xn28CiAG1snB1MbyLLGscjBGLaCWKNj952PiawyNexUAPw/ssa+jQJstRIlrjKOq08P2HuaHC0W+rT1/YlyRoioD98YYxPjGeRYylFoL36r8u2ccsYJKJz5scGVgX4MWmDB+nJDIFvtU4C+bnBTklZ1jShAYUvLylQUTnXNl/oThqgFXs3gExtMqaeXrFCkoYQfLUKdkANhUD65CbzSY2fmmAHu09QiRXYj/qqq2oUE0KchvLYWEWoy3+9jEGsJwLgvHEZFG0gAGmTkENYXwrmxi42JLB09giYV9l0H2zsJXFjI7Lga5BT9htAZrVsa5NsA7NtaYMH+gUdS3npGB+XWFt2jIIYACGJDp1OOq/0QrW0DjwR/BnraDktWoWzZTR8TiYUNx6Yk+bQLNbWbSN6eAI979kMe0KxxdA05TM4Ll4k9gHT4Ztda8ACiliGoOqSdK9Elj1ZOCmK/W7vnAmAV40o+nKQOnJRkgtYwJ8OMsaILdrypXBUgHgA5yd2wX7ADXSjVwOKN497/Z0XmVgJkD8Wv+3ZPcowp/qZzILktki7OsEWkhZM/GcSb8lw7YCUCkyrRNMY5xYxMzTngzvpbSyGqQcfct+S4zjKfGsyBIdF3lMq0XWTffOk8EJU2UJAFi17NPM9LLS1RIdDypFpT4wYkrEZ9wofFULYEr2hXMTwO28qAxIqleQJAfgW00Z3jFrkw27PJp5ZnrCaf+bPnnWGZ1CNAnj6WhRcY4jXL2y88BUkN77wp4EsDi4oXRjTrlRHEkjptl9DJBVsrpVT9iXCfSwPHOUVgm+4snwUUFZ2jeJGYWYDmLqi8Y0wPOmv8Q005TBQnoaFgdfbnXlTM5BigeDL5wZgO8mRtxwZX++Tn3WksTFQ998kHVvyboeHD1fPAR+dYTUD5WSgkH1qD3mSomsB/gL/oxeMA2V9SIAAAAASUVORK5CYII=" alt="❤️"> Health</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="flex:1;"><div class="bar-track" style="height:10px;"><div class="bar-fill health ${state.health<maxH*0.3?'health':''}" style="width:${(state.health/maxH)*100}%"></div></div></div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--health);">${Math.floor(state.health)}/${maxH}</span>
          </div>
          <div style="font-size:11px;color:var(--dim);">Regenerates 1 point every 30 seconds</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <button class="act-btn copper" style="width:auto;padding:9px 18px;" ${state.inv.food<5?'disabled':''} onclick="eat()">🍞 Eat 5 Food (+5<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡">)</button>
        <button class="act-btn red" style="width:auto;padding:9px 18px;" ${(state.inv.food<5||state.health>=maxH)?'disabled':''} onclick="healWithFood()">🩹 Heal (+20<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAx9JREFUSEuFVT1oFEEU/t5sBMFSxLh7gqA2prjdEyOikKTUQlGw11ZtEtRELXIp1EQladRWe0HRQstcoSgR7jZFbDQgeLsYxNJCzM7Tmf2b/bm4xd3e7c58P+97bwjJRQB44L35NF3xn28CiAG1snB1MbyLLGscjBGLaCWKNj952PiawyNexUAPw/ssa+jQJstRIlrjKOq08P2HuaHC0W+rT1/YlyRoioD98YYxPjGeRYylFoL36r8u2ccsYJKJz5scGVgX4MWmDB+nJDIFvtU4C+bnBTklZ1jShAYUvLylQUTnXNl/oThqgFXs3gExtMqaeXrFCkoYQfLUKdkANhUD65CbzSY2fmmAHu09QiRXYj/qqq2oUE0KchvLYWEWoy3+9jEGsJwLgvHEZFG0gAGmTkENYXwrmxi42JLB09giYV9l0H2zsJXFjI7Lga5BT9htAZrVsa5NsA7NtaYMH+gUdS3npGB+XWFt2jIIYACGJDp1OOq/0QrW0DjwR/BnraDktWoWzZTR8TiYUNx6Yk+bQLNbWbSN6eAI979kMe0KxxdA05TM4Ll4k9gHT4Ztda8ACiliGoOqSdK9Elj1ZOCmK/W7vnAmAV40o+nKQOnJRkgtYwJ8OMsaILdrypXBUgHgA5yd2wX7ADXSjVwOKN497/Z0XmVgJkD8Wv+3ZPcowp/qZzILktki7OsEWkhZM/GcSb8lw7YCUCkyrRNMY5xYxMzTngzvpbSyGqQcfct+S4zjKfGsyBIdF3lMq0XWTffOk8EJU2UJAFi17NPM9LLS1RIdDypFpT4wYkrEZ9wofFULYEr2hXMTwO28qAxIqleQJAfgW00Z3jFrkw27PJp5ZnrCaf+bPnnWGZ1CNAnj6WhRcY4jXL2y88BUkN77wp4EsDi4oXRjTrlRHEkjptl9DJBVsrpVT9iXCfSwPHOUVgm+4snwUUFZ2jeJGYWYDmLqi8Y0wPOmv8Q005TBQnoaFgdfbnXlTM5BigeDL5wZgO8mRtxwZX++Tn3WksTFQ998kHVvyboeHD1fPAR+dYTUD5WSgkH1qD3mSomsB/gL/oxeMA2V9SIAAAAASUVORK5CYII=" alt="❤️">)</button>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🍞 Crafted Consumables — No Energy Cost</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${Object.keys(BREAD_TIERS).map(key=>{
            const b = BREAD_TIERS[key];
            const have = state.inv[key]||0;
            const maxed = state.health >= getMaxHealth(state);
            return `<button class="mini-btn" style="border-color:var(--health);color:var(--health);" ${(have<1||maxed)?'disabled':''} onclick="consumeBread('${key}')">${ITEMS[key].icon} ${b.name} (+${b.heal} HP) ×${have}</button>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          ${Object.keys(ENERGY_POTION_TIERS).map(key=>{
            const p = ENERGY_POTION_TIERS[key];
            const have = state.inv[key]||0;
            const maxed = state.energy >= getMaxEnergy(state);
            return `<button class="mini-btn" style="border-color:var(--brass-bright);color:var(--brass-bright);" ${(have<1||maxed)?'disabled':''} onclick="consumeEnergyPotion('${key}')">${ITEMS[key].icon} ${p.name} (+${p.energy}<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡">) ×${have}</button>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function renderInventory(){
  const cap = getStorageCap(state);
  const totalItems = Object.values(state.inv).reduce((a,b)=>a+b,0);
  const storagePct = Math.min(100, (totalItems/cap)*100);
  const allCards = Object.keys(ITEMS).map(key=>{
    const it = ITEMS[key];
    const pct = Math.min(100, (state.inv[key]/cap)*100);
    const isResource = RESOURCES[key] !== undefined;
    const isBread = BREAD_TIERS[key] !== undefined;
    const isEnergy = ENERGY_POTION_TIERS[key] !== undefined;
    const isHealthPotion = key === 'health_potion';
    const canConsume = (isBread || isEnergy || isHealthPotion) && (state.inv[key]||0) > 0;
    let consumeBtn = '';
    if(isBread){
      const maxed = state.health >= getMaxHealth(state);
      consumeBtn = `<button class="mini-btn" style="border-color:var(--health);color:var(--health);margin-top:8px;width:100%;" ${maxed?'disabled':''} onclick="consumeBread('${key}')">🍽️ Eat (+${BREAD_TIERS[key].heal} HP)</button>`;
    } else if(isEnergy){
      const maxed = state.energy >= getMaxEnergy(state);
      consumeBtn = `<button class="mini-btn" style="border-color:var(--brass-bright);color:var(--brass-bright);margin-top:8px;width:100%;" ${maxed?'disabled':''} onclick="consumeEnergyPotion('${key}')">🧪 Drink (+${ENERGY_POTION_TIERS[key].energy}<img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡">)</button>`;
    } else if(isHealthPotion){
      const maxed = state.health >= getMaxHealth(state);
      consumeBtn = `<button class="mini-btn" style="border-color:var(--health);color:var(--health);margin-top:8px;width:100%;" ${maxed?'disabled':''} onclick="consumeBread('${key}')">🍽️ Use (+30-50 HP)</button>`;
    }
    return `<div class="card">
      <div class="card-top"><div class="card-icon" style="font-size:26px;">${it.icon}</div><div><div class="card-name">${it.name}</div><div class="card-sub">${fmtG(state.inv[key])} / ${fmtG(cap)}</div></div></div>
      <div class="bar-track"><div class="bar-fill ${isResource?'':'warn'}" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <span style="font-size:10px;color:var(--dim);font-family:'JetBrains Mono',monospace;">${pct.toFixed(0)}%</span>
        <span style="font-size:10px;color:var(--dim);">${isResource?'Resource':(isBread||isEnergy||isHealthPotion?'Consumable':'Good')}</span>
      </div>
      ${consumeBtn}
    </div>`;
  }).join('');
  return `
    <div class="panel" style="margin-bottom:14px;padding:12px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;color:var(--dim);">Total Storage Used</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--brass-bright);">${fmtG(totalItems)} / ${fmtG(cap)}</span>
      </div>
      <div class="bar-track" style="height:10px;"><div class="bar-fill ${storagePct>90?'warn':''}" style="width:${storagePct}%"></div></div>
    </div>
    <div class="grid">${allCards}</div>`;
}

function renderCrafting(){
  const cap = getStorageCap(state);
  const cards = Object.keys(RECIPES).map(key=>{
    const r = RECIPES[key];
    const g = GOODS[key];
    const locked = state.level < r.minLevel;
    const hasInputs = Object.keys(r.inputs).every(inp=> state.inv[inp] >= r.inputs[inp]);
    const hasSpace = state.inv[key]+r.output <= cap;
    const cost = getEnergyCost(state, r.energyCost);
    const hasEnergy = state.energy >= cost;
    const inputsHtml = Object.keys(r.inputs).map(inp=>{
      const have = state.inv[inp] || 0;
      const need = r.inputs[inp];
      const enough = have >= need;
      return `<span class="resource-chip" style="border-color:${enough?'var(--green)':'var(--red)'};color:${enough?'var(--green)':'var(--red)'};">${ITEMS[inp].icon} ${have}/${need}</span>`;
    }).join(' ');
    const canCraft = !locked && hasInputs && hasSpace && hasEnergy;
    return `<div class="card ${canCraft?'animate-glow':''}" style="${canCraft?'border-color:rgba(212,162,76,0.3);':''}">
      <div class="card-top"><div class="card-icon">${g.icon}</div><div><div class="card-name">${g.name}</div><div class="card-sub">Produces ${r.output} · <img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAyNJREFUSEuFVT1oFEEU/t4aL3tJEwtzP7sXJAQR6wgGSaGixaUxRUBMQERRCwlYpBIlAbGQIIYgKioERDGNIARt1SqNmEpQECS3t3fxBwUht3vx9slk/2bn9nSr3dk37837ft4QQAAY8uOvtK/7MQQQB1vk9/QMIgsaVXNW08CeRwRmv2bwiNLbn8FL1rBmO9aOdvmFxTn8VAS4dXOKPTxOtCJvCHpqgWZ6CpX5qEu5GwWJIHXUOJobxkjLo7cAutIL+atalzac2b3+LglvOqRRB+FBftdz/Rne+YaBfXERmRUCg1d7CtZIkrkAy+3FuJgASyItTunUSisAj8nnit5FEo1u6PnKlThXaqRMp3pewLHNBRCmO8NFY3qx8tKHXoEo+JT0EgfJoW7dnGbGQloRAj5uNroO7hr88qvTIXyIItWne6JRM8bAtJLar4YHes46n8yTQCPJwWbVMKHRkKz9MJyAZQD9AhKi2J4a6EymUFlK80cEkXp2p2beBDCTTp1UkhlM+E4tPqSXqp8iK6gcpKnYsY2LAAmiM22SJbzwWrQW90HIGpVZlYs2HyQCCHDqpeNosSgi+SKKmtGL1nxkZiW7SK6oKHZ1qDyxufHVHEILCwSUE+Yi/NHAo5l8dTUcOeq0aJMp1woDLrS7AMrhgPvPSHitF6zDYQG1m3aIAjJCkv+h75hP4uvd+erVpDj9kd5RReKXaxuTTLgPoFcEM2Mu6oYwRITJKOkOlPV+65UygFUO4jkeXjjuxsCg5/EzAh8AYa1b145Q3/pPkahRK10j5rntcQa8b7ja0b49/r/QE4qT2wEJ5evYpXsgvgCi23qhcjmcP65dnABhkUE5MO7oReuSMk3Tx2wa9s2acdoDLXkenew1Ksuhorwfhtls0lMAo9AwpeesJ5IVlXEdOS79AnG+GXtpi5578MrZor0ujwfHLt0C8Qls0TF9oPK5ow9Uoto0Lq7Yqvmwu2idU5Xj2saExzSeLVqnAirS57jUYspN66O8WTfPZvPWIxlOsS4gc7doXM9bi6lO7ky1emcIKZf268X1DyEf8nGbdmn4LzwhQV11Lo8iAAAAAElFTkSuQmCC" alt="⚡">${cost} · +${r.xp}XP</div></div></div>
      <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:5px;">${inputsHtml}</div>
      ${locked ? `<div class="locked-tag"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAqBJREFUSEuVVjtrFUEYPWd+gZUSK21UiGXsb1ASLBTBB4q2klYLBYkQA9pooa3YGhQfCFolKDe9wSoRY6OVAXvBao47j52dmd2b4MJddpj5vnO+8z3mEns8BCCEt6RDfkXzcy87t++s3C+8NWxipQOE7gA8CeC4PyVsgvgEaJHG/Am2BKjop6MVAPInA5N0EcCrdtv5KQ20DfC0IX9M4Nedz6XwJKVzAN4F544ZV0B8jGCnAFzNgKcN+bUQIwaUCCXiBGS1D9AXgIcjwCXSvE6BhjMpOgFbBGZI/q3FqHIQYGV1GdALyK1xjOT2kIySjgL4FveukHw5pHgvB7K61+iyBOCtIS+0OewXAiFr34A436RnmaSzK6rGU+wKMQoivQd0BuAjkreH6yudfSjgFqEPNOZsTqIr08qDpDGgEcRlGscqSBeqsKxpHy19tOskZ1MEsWSrJAdH1mpMYNR4KwASu6zkpSRnBtAJVfVB6thxw2jU6ZpHUKrsAJrAlhpCZQSRzZ6dnDKUd2n67mcnz2gvB5LTHePUflXrhqVvuljBccS0OoQDs6RZb2dPEYGk53mH+ij9if6Q2KWyVkhzrQfgorbSJoTp0F+Jb/rerVyzvS2SfigW0zQCqCD7X8Q7QqbpuBYwNVoccKsA5tKAy2dnDhbSUE3WZLVmaOYn5WARwv3ceGBEZ94r1AB5lzQP2ruh6ANJcxBWJ1VRHtmg63BgnuRa2/CFRF4mq8cibvRvolbVPPm9tD8heTO/InsAMRefAcxMrM6qfONyg+SJHLJotHyEWWmKwAKE6yIOVtdkneFfAJ4BeErDnXqkD86idtpIdkrAgrutADh2+/2e8BuEi3LDOyZ3JvVIfxZV/zDypaQjvoHI78lhftfWl0Gj3T9vdCwxhL+7FwAAAABJRU5ErkJggg==" alt="🔒"> Requires level ${r.minLevel}</div>` :
        `<div style="display:flex;gap:6px;">
          <button class="act-btn" style="flex:1;" ${(!hasInputs||!hasSpace||!hasEnergy)?'disabled':''} onclick="craft('${key}')">Craft</button>
          <button class="act-btn buy" style="flex:1;" ${(!hasInputs||!hasSpace||!hasEnergy)?'disabled':''} onclick="craftMax('${key}')">Craft Max</button>
        </div>`}
    </div>`;
  }).join('');
  return `<div class="grid">${cards}</div>`;
}
function sparklineSVG(history){
  if(!history || history.length < 2) return '';
  const w = 60, h = 20, min = Math.min(...history), max = Math.max(...history);
  const range = max - min || 1;
  const points = history.map((v,i) => {
    const x = (i / (history.length-1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const last = history[history.length-1], prev = history[history.length-2] || last;
  const color = last >= prev ? '#6fa285' : '#c2694a';
  return `<svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/>
  </svg>`;
}
function renderMarket(){
  const cap = getStorageCap(state);
  const mult = getSellMult(state);
  const tab = state.marketTab || 'all';
  const search = (state.marketSearch || '').toLowerCase();
  const allKeys = Object.keys(MARKET_CATALOG);
  const filteredKeys = allKeys.filter(key => {
    const it = MARKET_CATALOG[key];
    // Tab filter
    if (tab === 'weapons') {
      if (WEAPONS[key] === undefined) return false;
    } else if (tab === 'resources') {
      if (RESOURCES[key] === undefined && GOODS[key] === undefined) return false;
      // Also exclude weapons
      if (WEAPONS[key] !== undefined) return false;
    }
    // Search filter
    if (search) {
      const name = (it.name || '').toLowerCase();
      if (!name.includes(search)) return false;
    }
    return true;
  });
  const rows = filteredKeys.map(key=>{
    const it = MARKET_CATALOG[key];
    const price = state.prices[key];
    const prev = state.prevPrices[key];
    const trendUp = price >= prev;
    const trendPct = prev > 0 ? ((price/prev)-1)*100 : 0;
    const owned = state.inv[key];
    const canBuy1 = state.gold >= price && state.inv[key]+1<=cap;
    const canBuy10 = state.gold >= price*10 && state.inv[key]+10<=cap;
    const canBuyMax = state.gold >= Math.ceil(price) && state.inv[key]<cap;
    const canSell1 = owned >= 1;
    const canSell10 = owned >= 10;
    const canSellMax = owned >= 1;
    const bonusText = mult > 0.92 ? ` <span class="stat-pill">${(mult*100).toFixed(0)}%</span>` : '';
    const sparkline = sparklineSVG(state.priceHistory[key] || []);
    return `<div class="market-row">
      <div class="market-left">
        <div class="card-icon" style="font-size:26px;">${it.icon}</div>
        <div>
          <div class="card-name">${it.name}</div>
          <div class="market-owned">${fmtG(owned)} owned · Cap ${fmtG(cap)}</div>
        </div>
      </div>
      <div style="text-align:center;min-width:60px;">
        ${sparkline}
      </div>
      <div style="text-align:center;min-width:80px;">
        <div class="market-price" style="font-size:15px;">${price.toFixed(1)}g</div>
        <div class="market-trend ${trendUp?'up':'down'}" style="font-size:11px;">${trendUp?'▲':'▼'} ${Math.abs(trendPct).toFixed(1)}%</div>
      </div>
      <div class="market-actions">
        <button class="mini-btn buy" ${canBuy1?'':'disabled'} onclick="buy('${key}',1)">Buy ×1</button>
        <button class="mini-btn buy" ${canBuy10?'':'disabled'} onclick="buy('${key}',10)">×10</button>
        <button class="mini-btn buy" ${canBuyMax?'':'disabled'} onclick="buy('${key}','max')">Max</button>
        <button class="mini-btn sell" ${canSell1?'':'disabled'} onclick="sell('${key}',1)">Sell ×1</button>
        <button class="mini-btn sell" ${canSell10?'':'disabled'} onclick="sell('${key}',10)">×10</button>
        <button class="mini-btn sell" ${canSellMax?'':'disabled'} onclick="sell('${key}','max')">All${bonusText}</button>
      </div>
    </div>`;
  }).join('');
  return `
    <div class="panel" style="padding:0;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--panel-light);">
        <div class="panel-header" style="margin-bottom:0;"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAmlJREFUSEuFVr2KVDEYPedr7F0ZmEIQLEQQrLaxWgutt3EtRLQQFPcN1sLGzhdYC5tlQZ1tFhQbC7dRfAIbFUQ7YWQLK4scTXKTySa5M4EZQm5uvuT85RK+EYBCr2jdwfg8PyrnEKCGdeK4//c/SBLJ0D9RrHq/3MRiiWZnYRE5t0njYS5gpK/ftG6NJRuX0xTADoAfJJ9WJyiPWaExhl4Bl5y7+3/zjwGcA/DAyGexgJPM+ifI63Zxb2mT0wcA3yG8ofGF3zIkN8pB5i1ydRXAGZIHmYNigqQdAZeNvCnpPMlvLckVFFWBXQD3hylbvlDShZO7BPETiOskP6ZlWogyDaVOYl/SnOSapBsCZvSyErdoPJD0DsAXkg9ruk7KNCu19YGkXyQnaQFfCMJsEPsxxLM0/im13lVRCUvSkuQ2BVwzcrs2ZigErdFst/ZKRXKr+jQiaV/AcyPfL/zYureXBwGiaLQKllLjcnPz+I/O6bi0GxWdeZJOQfhpxsm42/vhsTIqhqy6BeEKjdspryJPrfNrY3Z94KR7BL6SPPITnLQP4RWNr/tADKOd4Mo+oPk0Da5+Ke9W4AKA20YeOWkOYErybxO3nrmU0p28ygVArAPYA/AWwBMAFwF4R/p4mNE4ae+M5ek7qC1mEYDPgB6RdlhofwOAl+UeyTvdQF1BQ5eDUg+SNgBNSfPJuPwQnWIRd+cUOeiHvqTTNP6Oq68s06wS7oNcYMk1Oaag8qqoruUg5OI+iGfMGs+AjO26wmQUokhy2/xoAi4kc9hO6gyMhJFyWu77D4nwSvrEaHKmiu7xKFwYrYboHw4CaSz/QJEYAAAAAElFTkSuQmCC" alt="📊"> Live Market</div>
        <div style="font-size:11px;color:var(--dim);">Prices update every 15 seconds · Sparklines show last 12 ticks</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--panel);">
        <input type="text" class="market-search" placeholder="Search weapons & items..." value="${state.marketSearch||''}" oninput="setMarketSearch(this.value)" style="flex:1;min-width:160px;">
        <button class="market-tab-btn ${state.marketTab==='all'?'active':''}" onclick="setMarketTab('all')">📦 All</button>
        <button class="market-tab-btn ${state.marketTab==='weapons'?'active':''}" onclick="setMarketTab('weapons')">⚔️ Weapons & Gear</button>
        <button class="market-tab-btn ${state.marketTab==='resources'?'active':''}" onclick="setMarketTab('resources')">🌲 Resources</button>
        <button class="mini-btn" onclick="clearMarketFilters()" style="padding:8px 12px;">✕ Clear</button>
      </div>
      ${rows}
    </div>`;
}


// ─── Companies & Class Rendering ───
function renderCompanies(){
  const cap = getStorageCap(state);
  const mgmtLevel = getCompanyManagementLevel(state.level);
  const maxAllowed = getMaxAllowedCompanies(state.level);
  const currentCount = state.companies.length;
  const canBuild = currentCount < MAX_COMPANIES && currentCount < maxAllowed;
  const nextConcreteCost = currentCount > 0 && currentCount < MAX_COMPANIES ? getConcreteCost(currentCount + 1) : 0;

  // Build modal
  let buildModal = '';
  if(state.companyBuildResource !== null){
    const chosenRes = state.companyBuildResource || COMPANY_RESOURCES[0];
    const it = ITEMS[chosenRes];
    const isFirstCompany = currentCount === 0;
    const hasConcrete = isFirstCompany || state.inv.concrete >= nextConcreteCost;
    const costText = isFirstCompany 
      ? '<span class="resource-chip" style="border-color:var(--green);color:var(--green);">🎁 Free!</span>'
      : `<span class="resource-chip" style="${hasConcrete?'border-color:var(--green);color:var(--green);':'border-color:var(--red);color:var(--red);'}">🧱 ${nextConcreteCost} Concrete</span>`;

    buildModal = `
      <div class="modal-overlay" onclick="if(event.target===this)cancelBuild()">
        <div class="modal-box">
          <div class="modal-header"><h3>🏗️ Build New Company</h3><button class="modal-close" onclick="cancelBuild()">✕</button></div>
          <div class="modal-body">
            <div style="font-size:12px;color:var(--dim);margin-bottom:12px;">Choose what resource this company will produce:</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;">
              ${COMPANY_RESOURCES.map(res => {
                const rIt = ITEMS[res];
                const active = res === chosenRes;
                return `<button class="mini-btn ${active?'buy':''}" style="padding:8px 4px;font-size:11px;${active?'background:rgba(111,162,133,0.14);':''}" onclick="selectBuildResource('${res}')">
                  <div style="font-size:18px;margin-bottom:2px;">${rIt.icon}</div><div>${rIt.name}</div>
                </button>`;
              }).join('')}
            </div>
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:40px;margin-bottom:6px;">${it.icon}</div>
              <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:15px;color:var(--brass-bright);">${it.name}</div>
              <div style="font-size:11px;color:var(--dim);margin-top:4px;">Production: ${ENGINE_PRODUCTION[1]}/hour · Engine Lv.1</div>
            </div>
            <div style="margin-top:14px;text-align:center;">
              <div style="font-size:12px;color:var(--dim);margin-bottom:8px;">Cost: ${costText}</div>
              <button class="act-btn buy" style="width:100%;padding:12px;" ${hasConcrete?'':'disabled'} onclick="buildCompany()">
                ${hasConcrete ? `🏗️ Build ${it.name} Company` : 'Not Enough Concrete'}
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  // Company cards
  const companyCards = state.companies.map((c, idx) => {
    const it = ITEMS[c.resource];
    const rate = ENGINE_PRODUCTION[c.engineLevel];
    const maxCap = rate * 24;
    const pct = maxCap > 0 ? (c.stored / maxCap) * 100 : 0;
    const canCollect = c.stored >= 1 && !c.disabled;
    const space = cap - state.inv[c.resource];
    const canUpgrade = c.engineLevel < 10;
    const upgradeCost = canUpgrade ? ENGINE_UPGRADE_COST[c.engineLevel + 1] : 0;
    const hasSteel = state.inv.steel >= upgradeCost;
    const menuOpen = state.companyMenuOpen === c.id;
    const isDisabled = c.disabled;
    const isChanging = state.companyChangeResourceId === c.id;

    const menuItems = [];
    menuItems.push({icon:'🔄', label:'Change production', action:`startChangeResource(${c.id});`, cls:''});

    if(canUpgrade){
      const ok = hasSteel ? '✓' : '✗';
      const okCls = hasSteel ? 'ok' : 'fail';
      menuItems.push({icon:'⚙️', label:'Upgrade automated engine', cost:`⚙️ ${state.inv.steel}/${upgradeCost} ${ok}`, action:`upgradeEngine(${c.id});closeCompanyMenu();`, cls:hasSteel?'':'disabled', checkCls:okCls});
    } else {
      menuItems.push({icon:'⚙️', label:'Upgrade automated engine', cost:'Max level', action:'', cls:'disabled', checkCls:''});
    }

    if(idx > 0){
      menuItems.push({icon:'⬆️', label:'Move to top', action:`moveCompanyToTop(${c.id});`, cls:''});
    }

    menuItems.push({icon:isDisabled?'▶️':'⏸️', label:isDisabled?'Enable company':'Disable company', action:`disableCompany(${c.id});`, cls:''});

    const menuHtml = menuOpen ? `
      <div class="company-menu" onclick="event.stopPropagation()">
        ${menuItems.map(item => `
          <div class="company-menu-item ${item.cls}" ${item.action ? `onclick="${item.action}"` : ''}>
            <span class="icon">${item.icon}</span>
            <span class="label">${item.label}</span>
            ${item.cost ? `<span class="check ${item.checkCls}">${item.cost}</span>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';

    const changeResourcePicker = isChanging ? `
      <div style="margin-top:10px;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;" onclick="event.stopPropagation()">
        <div style="font-size:11px;color:var(--dim);margin-bottom:8px;">Select new production (500g):</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
          ${COMPANY_RESOURCES.map(res => {
            const rIt = ITEMS[res];
            const active = res === c.resource;
            return `<button class="mini-btn ${active?'buy':''}" style="padding:6px 2px;font-size:10px;${active?'opacity:0.4;cursor:not-allowed;':''}" ${active?'disabled':''} onclick="selectChangeResource(${c.id},'${res}')">
              <div style="font-size:16px;">${rIt.icon}</div><div>${rIt.name}</div>
            </button>`;
          }).join('')}
        </div>
        <button class="mini-btn" style="width:100%;margin-top:8px;" onclick="cancelChangeResource()">Cancel</button>
      </div>
    ` : '';

    return `<div class="company-card" style="${isDisabled?'opacity:0.5;':''}${canCollect?'border-color:rgba(111,162,133,0.3);':''}">
      <button class="company-menu-btn" onclick="event.stopPropagation();toggleCompanyMenu(${c.id})">⋯</button>
      ${menuHtml}
      <div class="company-header">
        <div class="company-icon">${it.icon}</div>
        <div class="company-info">
          <div class="company-name">${it.name}${isDisabled?' <span style="color:var(--dim);font-size:11px;">(paused)</span>':''}</div>
          <div class="company-meta">Company #${c.id} · Engine Lv.${c.engineLevel} · ${rate}/hr</div>
        </div>
      </div>
      <div class="company-bar"><div class="company-bar-fill ${pct>90?'warn':''}" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:4px;font-family:'JetBrains Mono',monospace;">
        <span>${Math.floor(c.stored)} stored</span>
        <span>${pct.toFixed(0)}% · ${maxCap} cap</span>
      </div>
      <button class="act-btn buy" style="width:100%;margin-top:10px;padding:10px;" ${(!canCollect || space<=0)?'disabled':''} onclick="collectFromCompany(${c.id})">
        ${space<=0?'❌ Storage Full':(canCollect?`📦 Collect ${Math.min(Math.floor(c.stored),space)} ${it.icon}`:'⏳ Nothing to Collect')}
      </button>
      ${changeResourcePicker}
    </div>`;
  }).join('');

  const buildSection = currentCount >= MAX_COMPANIES ? '' : `
    <div class="panel" style="text-align:center;padding:24px;background:radial-gradient(ellipse at center,rgba(111,162,133,0.06) 0%,transparent 70%);">
      <div style="font-size:36px;margin-bottom:8px;">🏗️</div>
      <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:16px;color:var(--brass-bright);margin-bottom:6px;">Build New Company</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:12px;"><b>${currentCount}</b> / ${MAX_COMPANIES} companies · Management <b>Lv.${mgmtLevel}</b></div>
      ${canBuild ? `
        <div style="font-size:12px;color:var(--dim);margin-bottom:10px;">
          ${currentCount === 0 ? '<span class="resource-chip" style="border-color:var(--green);color:var(--green);">🎁 First company is FREE</span>' : `<span class="resource-chip">🧱 ${nextConcreteCost} Concrete</span>`}
          ${currentCount >= 2 ? `<span style="margin-left:8px;" class="resource-chip">🏭 Lv.${currentCount-1} Mgmt</span>` : ''}
        </div>
        <button class="act-btn buy" style="width:auto;padding:10px 24px;" onclick="openBuildSelector()">🏗️ Build Company</button>
      ` : `<div class="locked-tag"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAqBJREFUSEuVVjtrFUEYPWd+gZUSK21UiGXsb1ASLBTBB4q2klYLBYkQA9pooa3YGhQfCFolKDe9wSoRY6OVAXvBao47j52dmd2b4MJddpj5vnO+8z3mEns8BCCEt6RDfkXzcy87t++s3C+8NWxipQOE7gA8CeC4PyVsgvgEaJHG/Am2BKjop6MVAPInA5N0EcCrdtv5KQ20DfC0IX9M4Nedz6XwJKVzAN4F544ZV0B8jGCnAFzNgKcN+bUQIwaUCCXiBGS1D9AXgIcjwCXSvE6BhjMpOgFbBGZI/q3FqHIQYGV1GdALyK1xjOT2kIySjgL4FveukHw5pHgvB7K61+iyBOCtIS+0OewXAiFr34A436RnmaSzK6rGU+wKMQoivQd0BuAjkreH6yudfSjgFqEPNOZsTqIr08qDpDGgEcRlGscqSBeqsKxpHy19tOskZ1MEsWSrJAdH1mpMYNR4KwASu6zkpSRnBtAJVfVB6thxw2jU6ZpHUKrsAJrAlhpCZQSRzZ6dnDKUd2n67mcnz2gvB5LTHePUflXrhqVvuljBccS0OoQDs6RZb2dPEYGk53mH+ij9if6Q2KWyVkhzrQfgorbSJoTp0F+Jb/rerVyzvS2SfigW0zQCqCD7X8Q7QqbpuBYwNVoccKsA5tKAy2dnDhbSUE3WZLVmaOYn5WARwv3ceGBEZ94r1AB5lzQP2ruh6ANJcxBWJ1VRHtmg63BgnuRa2/CFRF4mq8cibvRvolbVPPm9tD8heTO/InsAMRefAcxMrM6qfONyg+SJHLJotHyEWWmKwAKE6yIOVtdkneFfAJ4BeErDnXqkD86idtpIdkrAgrutADh2+/2e8BuEi3LDOyZ3JvVIfxZV/zDypaQjvoHI78lhftfWl0Gj3T9vdCwxhL+7FwAAAABJRU5ErkJggg==" alt="🔒"> ${currentCount >= MAX_COMPANIES ? 'Maximum reached' : `Reach level ${(currentCount-1)*5} for next slot`}</div>`}
    </div>
  `;

  return `
    ${buildModal}
    <div class="section-title"><h2>🏭 Your Companies</h2><div class="sub">${currentCount}/${MAX_COMPANIES} companies · Collect below · ⋯ for more · 1-9 tabs</div></div>
    ${state.companies.length === 0 ? `
      <div class="panel" style="text-align:center;padding:32px;">
        <div style="font-size:48px;margin-bottom:12px;">🏭</div>
        <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:18px;color:var(--brass-bright);margin-bottom:8px;">No Companies Yet</div>
        <div style="font-size:13px;color:var(--dim);margin-bottom:16px;max-width:320px;margin-left:auto;margin-right:auto;">Build your first company to start automatic resource production.</div>
        ${canBuild ? `
          <div style="font-size:12px;color:var(--dim);margin-bottom:10px;">First company is <b>free</b> — pick any resource!</div>
          <button class="act-btn buy" style="width:auto;padding:12px 28px;font-size:14px;" onclick="openBuildSelector()">🏗️ Build First Company</button>
        ` : `<div class="locked-tag"><img class="ui-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAqBJREFUSEuVVjtrFUEYPWd+gZUSK21UiGXsb1ASLBTBB4q2klYLBYkQA9pooa3YGhQfCFolKDe9wSoRY6OVAXvBao47j52dmd2b4MJddpj5vnO+8z3mEns8BCCEt6RDfkXzcy87t++s3C+8NWxipQOE7gA8CeC4PyVsgvgEaJHG/Am2BKjop6MVAPInA5N0EcCrdtv5KQ20DfC0IX9M4Nedz6XwJKVzAN4F544ZV0B8jGCnAFzNgKcN+bUQIwaUCCXiBGS1D9AXgIcjwCXSvE6BhjMpOgFbBGZI/q3FqHIQYGV1GdALyK1xjOT2kIySjgL4FveukHw5pHgvB7K61+iyBOCtIS+0OewXAiFr34A436RnmaSzK6rGU+wKMQoivQd0BuAjkreH6yudfSjgFqEPNOZsTqIr08qDpDGgEcRlGscqSBeqsKxpHy19tOskZ1MEsWSrJAdH1mpMYNR4KwASu6zkpSRnBtAJVfVB6thxw2jU6ZpHUKrsAJrAlhpCZQSRzZ6dnDKUd2n67mcnz2gvB5LTHePUflXrhqVvuljBccS0OoQDs6RZb2dPEYGk53mH+ij9if6Q2KWyVkhzrQfgorbSJoTp0F+Jb/rerVyzvS2SfigW0zQCqCD7X8Q7QqbpuBYwNVoccKsA5tKAy2dnDhbSUE3WZLVmaOYn5WARwv3ceGBEZ94r1AB5lzQP2ruh6ANJcxBWJ1VRHtmg63BgnuRa2/CFRF4mq8cibvRvolbVPPm9tD8heTO/InsAMRefAcxMrM6qfONyg+SJHLJotHyEWWmKwAKE6yIOVtdkneFfAJ4BeErDnXqkD86idtpIdkrAgrutADh2+/2e8BuEi3LDOyZ3JvVIfxZV/zDypaQjvoHI78lhftfWl0Gj3T9vdCwxhL+7FwAAAABJRU5ErkJggg==" alt="🔒"> Reach level ${(currentCount-1)*5} to unlock next slot</div>`}
      </div>
    ` : `<div class="grid">${companyCards}</div>`}
    ${buildSection}
  `;
}


function renderClass(){
  const backLink = `<button class="mini-btn" style="margin-bottom:12px;" onclick="stopAllianceChatListener();activeTab='settings';renderBody();">← Back to Settings</button>`;
  if(!state.playerClass){
    return `
      ${backLink}
      <div class="section-title"><h2>🧙 Select Your Class</h2><div class="sub">Each class has unique stats and 3 exclusive skills. You can change later for a gold cost.</div></div>
      <div class="class-select-grid">${Object.keys(CLASS_DATA).map(key=>{
        const c = CLASS_DATA[key];
        return `<div class="class-select-card" style="--cc:${c.color};" onclick="selectClass('${key}')">
          <div class="cs-icon">${c.icon}</div>
          <div class="cs-name">${c.nameAr}</div>
          <div class="cs-desc">${c.desc}</div>
          <div class="cs-stats">
            <span>HP <b>${(c.stats.hp*100).toFixed(0)}%</b></span>
            <span>ATK <b>${(c.stats.atk*100).toFixed(0)}%</b></span>
            <span>DEF <b>${(c.stats.def*100).toFixed(0)}%</b></span>
            <span>SPD <b>${(c.stats.spd*100).toFixed(0)}%</b></span>
          </div>
          <button class="cs-select-btn" onclick="event.stopPropagation();selectClass('${key}')">Select</button>
        </div>`;
      }).join('')}</div>`;
  }

  const cls = CLASS_DATA[state.playerClass];
  const stats = cls.stats;
  const canReset = canResetClass();
  const resetCost = getClassResetCost();
  const cooldownLeft = Math.max(0, 7*24*60*60*1000 - (Date.now() - state.lastClassReset));
  const cooldownText = cooldownLeft > 0 ? `${Math.floor(cooldownLeft/3600000)}h ${Math.floor((cooldownLeft%3600000)/60000)}m` : 'Ready';

  const skillCards = cls.skills.map((sk, idx)=>{
    const lvl = state.classSkills[sk.key] || 0;
    const maxed = lvl >= CLASS_SKILL_MAX;
    const nextCost = maxed ? 0 : CLASS_SKILL_COST_TABLE[lvl];
    const canUpgrade = !maxed && state.classSkillPoints >= nextCost;
    const pct = (lvl / CLASS_SKILL_MAX) * 100;

    // Build effect text
    let effects = [];
    Object.keys(sk.perLevel).forEach(ef=>{
      const val = sk.perLevel[ef];
      const total = val * lvl;
      const nextTotal = val * (lvl + 1);
      let label = '';
      if(ef==='dmgBonus') label = `+${(total*100).toFixed(0)}% damage`;
      else if(ef==='critBonus') label = `+${(total*100).toFixed(0)}% crit`;
      else if(ef==='defBonus') label = `+${total} defense`;
      else if(ef==='drBonus') label = `+${(total*100).toFixed(0)}% damage reduction`;
      else if(ef==='regenBonus') label = `+${(total*100).toFixed(0)}% HP regen`;
      else if(ef==='pierceBonus') label = `+${(total*100).toFixed(0)}% pierce`;
      else if(ef==='spdBonus') label = `+${total} speed`;
      else if(ef==='dodgeBonus') label = `+${(total*100).toFixed(0)}% dodge`;
      else if(ef==='energyReduction') label = `-${(total*100).toFixed(0)}% energy cost`;
      else if(ef==='energyBonus') label = `+${total} max energy`;
      else if(ef==='healPerTurn') label = `+${total} HP/turn`;
      else if(ef==='healBonus') label = `+${(total*100).toFixed(0)}% healing`;
      else if(ef==='hpBonus') label = `+${total} max HP`;
      else if(ef==='sellBonus') label = `+${(total*100).toFixed(0)}% sell price`;
      else if(ef==='goldCapBonus') label = `+${(total*100).toFixed(0)}% gold cap`;
      else if(ef==='lootBonus') label = `+${(total*100).toFixed(0)}% loot chance`;
      else if(ef==='magicResist') label = `+${(total*100).toFixed(0)}% magic resist`;
      effects.push(label);
    });

    const effectsHtml = effects.map(e=>`<span class="sk-effect-tag">${e}</span>`).join('');
    return `<div class="skill-card-v2 ${canUpgrade?'upgradable':''}" style="--sk:${cls.color};">
      <div class="sk-top">
        <div class="sk-icon-box">${sk.icon}</div>
        <div>
          <div class="sk-name">${sk.nameAr}</div>
          <div class="sk-level">Level ${lvl}/${CLASS_SKILL_MAX}</div>
        </div>
      </div>
      <div class="sk-bar-track"><div class="sk-bar-fill" style="width:${pct}%;"></div></div>
      <div class="sk-desc">${sk.desc}</div>
      <div class="sk-effects">${effectsHtml}</div>
      ${maxed ? '<div class="sk-maxed">✨ Maxed</div>' : `<button class="sk-upgrade-btn" ${canUpgrade?'':'disabled'} onclick="upgradeClassSkill('${sk.key}')">UPGRADE · ${nextCost} CSP</button>`}
    </div>`;
  }).join('');

  return `
    ${backLink}
    <div class="gear-hero-card" style="--tc:${cls.color};border-color:${cls.color}40;">
      <div class="gh-icon" style="background:linear-gradient(135deg,${cls.color},${cls.color}99);border-color:${cls.color};">${cls.icon}</div>
      <div class="gh-name" style="color:${cls.color};">${cls.nameAr}</div>
      <div class="gh-sub">${cls.name} · ${cls.desc}</div>
    </div>
    <div class="stat-overview-grid">
      <div class="stat-overview-box"><div class="label">❤️ HP</div><div class="value">${(stats.hp*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">⚔️ ATK</div><div class="value">${(stats.atk*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">🛡️ DEF</div><div class="value">${(stats.def*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">💨 SPD</div><div class="value">${(stats.spd*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">🎯 CRIT</div><div class="value">${(stats.crit*100).toFixed(0)}%</div></div>
      <div class="stat-overview-box"><div class="label">🌀 DODGE</div><div class="value">${(stats.dodge*100).toFixed(0)}%</div></div>
    </div>
    <div class="sp-banner" style="background:linear-gradient(135deg,${cls.color} 0%,${cls.color}99 100%);">
      <div class="sp-label">🎯 Class Skill Points</div>
      <div class="sp-value">${state.classSkillPoints}</div>
    </div>
    <div class="section-title"><h2>🎯 Unique Skills</h2></div>
    <div class="skill-grid-v2">${skillCards}</div>
    <div class="panel" style="margin-top:16px;text-align:center;padding:20px;">
      <div style="font-size:24px;margin-bottom:8px;">🔄</div>
      <div class="panel-header" style="margin-bottom:6px;">Reset Class</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:12px;">Change your class. You will lose all class skill progress but regain the points spent.</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:10px;">Cooldown: ${cooldownText} · Resets: ${state.classResets}</div>
      <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:12px;">
        ${Object.keys(CLASS_DATA).filter(k=>k!==state.playerClass).map(k=>{
          const c = CLASS_DATA[k];
          return `<button class="mini-btn" style="border-color:${c.color};color:${c.color};" ${canReset?'':'disabled'} onclick="if(confirm('Reset to ${c.nameAr} ${c.icon} for ${fmtG(resetCost)}g?'))resetClass('${k}')">${c.icon} ${c.nameAr}</button>`;
        }).join('')}
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--dim);">Cost: <b style="color:var(--brass-bright);">${fmtG(resetCost)}g</b></div>
    </div>
  `;
}


// ─── Skills, Missions, Leaderboard, Settings, Log ───
const SKILL_COLORS = {
  health: '#d44c4c', damage: '#e8bd6e', defense: '#6fa285',
  stamina: '#7ab8d4', storage: '#b8a0d4', profit: '#d4a24c',
};

function renderSkills(){
  // ── Top stat overview strip ──
  const maxH = getMaxHealth(state);
  const maxE = getMaxEnergy(state);
  const overview = [
    { icon:'❤️', label:'Health', value: Math.floor(maxH) },
    { icon:'⚔️', label:'Attack', value: playerPower(state) },
    { icon:'🛡️', label:'Defense', value: `${(getDamageReduction(state)*100).toFixed(0)}%` },
    { icon:'🔋', label:'Energy', value: maxE },
    { icon:'📦', label:'Storage', value: getStorageCap(state) },
    { icon:'💰', label:'Profit', value: `+${((getSellMult(state)-1)*100).toFixed(0)}%` },
  ].map(o=>`<div class="stat-overview-box"><div class="label">${o.icon} ${o.label}</div><div class="value">${o.value}</div></div>`).join('');

  const cards = Object.keys(SKILLS).map(key=>{
    const sk = SKILLS[key];
    const lvl = state.skills[key];
    const cost = lvl + 1;
    const canUpgrade = state.skillPoints >= cost && lvl < sk.max;
    const maxed = lvl >= sk.max;
    const pct = (lvl / sk.max) * 100;
    const color = SKILL_COLORS[key];
    let effects = [];
    if(key === 'health'){
      effects.push(`+${lvl*sk.perLevel} HP`);
      if(!maxed) effects.push(`next +${(lvl+1)*sk.perLevel} HP`);
    } else if(key === 'damage'){
      effects.push(`+${lvl*sk.perLevel} DMG`);
      if(!maxed) effects.push(`next +${(lvl+1)*sk.perLevel} DMG`);
    } else if(key === 'defense'){
      effects.push(`-${(lvl*sk.perLevel*100).toFixed(0)}% dmg taken`);
      if(!maxed) effects.push(`next -${((lvl+1)*sk.perLevel*100).toFixed(0)}%`);
    } else if(key === 'stamina'){
      const reduction = Math.min(0.5, lvl*0.03);
      effects.push(`+${lvl*sk.perLevel} energy`);
      effects.push(`-${(reduction*100).toFixed(0)}% cost`);
    } else if(key === 'storage'){
      effects.push(`+${lvl*sk.perLevel} storage`);
      if(!maxed) effects.push(`next +${(lvl+1)*sk.perLevel}`);
    } else if(key === 'profit'){
      effects.push(`+${(lvl*sk.perLevel*100).toFixed(0)}% profit`);
      if(!maxed) effects.push(`next +${((lvl+1)*sk.perLevel*100).toFixed(0)}%`);
    }
    const effectsHtml = effects.map(e=>`<span class="sk-effect-tag">${e}</span>`).join('');

    return `<div class="skill-card-v2 ${canUpgrade?'upgradable':''}" style="--sk:${color};">
      <div class="sk-top">
        <div class="sk-icon-box">${sk.icon}</div>
        <div>
          <div class="sk-name">${sk.name}</div>
          <div class="sk-level">Level ${lvl}/${sk.max}</div>
        </div>
      </div>
      <div class="sk-bar-track"><div class="sk-bar-fill" style="width:${pct}%;"></div></div>
      <div class="sk-desc">${sk.desc}</div>
      <div class="sk-effects">${effectsHtml}</div>
      ${maxed
        ? '<div class="sk-maxed">✨ Maxed</div>'
        : `<button class="sk-upgrade-btn" ${canUpgrade?'':'disabled'} onclick="upgradeSkill('${key}')">UPGRADE · ${cost} SP</button>`}
    </div>`;
  }).join('');

  return `
    <button class="mini-btn" style="margin-bottom:12px;" onclick="stopAllianceChatListener();activeTab='settings';renderBody();">← Back to Settings</button>
    <div class="stat-overview-grid">${overview}</div>
    <div class="sp-banner">
      <div class="sp-label">🎯 Skill Points</div>
      <div class="sp-value">${state.skillPoints}</div>
    </div>
    <div class="skill-grid-v2">${cards}</div>
    <div class="panel" style="margin-top:14px;padding:14px 16px;">
      <div style="font-size:12px;color:var(--dim);">Earn 1 skill point with every new level. Spend wisely.</div>
    </div>`;
}

function renderMissions(){
  const rows = state.missions.list.map(ms=>{
    const tpl = MISSION_POOL.find(m=>m.id===ms.templateId);
    const progress = Math.min(ms.target, state.missions.counters[tpl.track]);
    return `<div class="mission-row ${ms.done?'done':''}">
      <div class="mission-mark">${ms.done?'✔':'○'}</div>
      <div>
        <div class="mission-title">${tpl.label(ms.target)}</div>
        <div class="mission-desc">${progress} / ${ms.target}</div>
        <div class="mission-reward">Reward: ${ms.reward}g</div>
      </div>
    </div>`;
  }).join('');
  return `
    <div class="reset-note">Missions reset in: ${hmsUntil(state.missions.resetAt)}</div>
    <div class="grid" style="grid-template-columns:1fr;">${rows}</div>`;
}

function renderLeaderboard(){
  const rows = [...state.leaderboard, { name:'You', level:state.level, gold:state.gold, me:true }];
  const byGold = [...rows].sort((a,b)=>b.gold-a.gold);
  const byLevel = [...rows].sort((a,b)=>b.level-a.level);
  const tbl = (list, valueKey, suffix)=> `
    <table class="lb-table">
      <tr><th>#</th><th>Player</th><th>${valueKey==='gold'?'Gold':'Level'}</th></tr>
      ${list.map((r,i)=>`<tr class="${r.me?'me':''}"><td class="lb-rank">${i+1}</td><td>${r.name}</td><td>${valueKey==='gold'?fmtG(r.gold)+'g':r.level}</td></tr>`).join('')}
    </table>`;
  return `
    <div class="lb-note">This is a local simulation (no real multiplayer connection) — a real leaderboard would need a shared backend database.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;">
      <div class="panel"><div class="section-title" style="margin-top:0;"><h2>🥇 Richest</h2></div>${tbl(byGold,'gold')}</div>
      <div class="panel"><div class="section-title" style="margin-top:0;"><h2>🥈 Highest Level</h2></div>${tbl(byLevel,'level')}</div>
    </div>`;
}

function settingsRow(icon, title, sub, onclick, danger){
  return `
    <div class="settings-row${danger?' danger':''}" onclick="${onclick}">
      <div class="settings-row-icon">${icon}</div>
      <div class="settings-row-body">
        <div class="settings-row-title">${title}</div>
        ${sub ? `<div class="settings-row-sub">${sub}</div>` : ''}
      </div>
      <div class="settings-row-chevron">›</div>
    </div>`;
}

function renderSettings(){
  const p = state.prestige;
  const canPrest = canPrestige(state);
  const isGuest = !!(auth && auth.currentUser && auth.currentUser.isAnonymous);
  const classInfo = CLASS_DATA[state.playerClass] || null;
  const className = classInfo ? classInfo.name : 'Adventurer';
  const classIcon = classInfo ? classInfo.icon : '🧭';

  return `
    <div class="grid" style="grid-template-columns:1fr;">

      <!-- Profile Hero -->
      <div class="profile-hero">
        <div class="profile-hero-top">
          <div class="profile-hero-avatar">${state.avatar || '🧙'}</div>
          <div>
            <div class="profile-hero-name">${state.username || 'Player'}</div>
            <div class="profile-hero-sub">Level ${state.level} · ${classIcon} ${className}</div>
          </div>
        </div>
        <div class="profile-hero-stats">
          <div class="profile-hero-stat"><div class="num">${fmtG(state.gold)}g</div><div class="lbl">Gold</div></div>
          <div class="profile-hero-divider"></div>
          <div class="profile-hero-stat"><div class="num" style="color:var(--green);">${state.combat.wins}</div><div class="lbl">Wins</div></div>
          <div class="profile-hero-divider"></div>
          <div class="profile-hero-stat"><div class="num" style="color:var(--red);">${state.combat.losses}</div><div class="lbl">Losses</div></div>
        </div>
        <div class="profile-hero-info">
          <span style="font-size:15px;">${isGuest ? '🎮' : '✉️'}</span>
          <span><b>${isGuest ? 'Guest Account' : (EMAIL || 'Linked Account')}</b> ${state.bio ? '· '+state.bio : ''}</span>
        </div>
      </div>

      <!-- PROFILE -->
      <div>
        <div class="settings-group-label">Profile</div>
        <div class="settings-list">
          ${settingsRow('👤','Personal Details','Avatar, name & bio','openPersonalDetailsModal()')}
          ${settingsRow('🎨','Appearance','Theme, language & accent','openPreferencesModal()')}
          ${settingsRow('🏆','Stats & Achievements','Session totals','openAchievementsModal()')}
        </div>
      </div>

      <!-- CHARACTER -->
      <div>
        <div class="settings-group-label">Character</div>
        <div class="settings-list">
          ${settingsRow(classIcon,'Class',`${className} · Unique skills`,`stopAllianceChatListener();activeTab='class';renderBody();`)}
          ${settingsRow('🎯','Skills','Spend skill points',`stopAllianceChatListener();activeTab='skills';renderBody();`)}
        </div>
      </div>

      <!-- ACCOUNT -->
      <div>
        <div class="settings-group-label">Account</div>
        <div class="settings-list">
          ${settingsRow('🔐','Login & Security', isGuest ? 'Playing as guest' : ('Linked to '+EMAIL), 'openSecurityModal()')}
          ${settingsRow('📊','Data & Backup','Export, import or clear local data','openDataModal()')}
        </div>
      </div>

      <!-- GAME -->
      <div>
        <div class="settings-group-label">Game</div>
        <div class="settings-list">
          ${settingsRow('✨','Prestige', canPrest ? 'Ready — Spiritual Renewal available' : `Requires level ${PRESTIGE_LEVEL_REQ}`, 'openPrestigeModal()')}
          ${settingsRow('ℹ️','About','Version, credits & support','openAboutModal()')}
          ${settingsRow('🗑️','Erase All Progress','Permanently delete saved data — cannot be undone','if(confirm(\'Erase all progress? This cannot be undone.\'))hardReset()', true)}
        </div>
      </div>

    </div>`;
}

// ===== PROFILE FUNCTIONS =====

function changeAvatar(avatarEmoji) {
    state.avatar = avatarEmoji;
    scheduleSave();
    renderHeader();
    renderBody();
    showToast('Success', 'Avatar updated', 'win');
}

function changeLanguage(lang) {
    state.language = lang;
    localStorage.setItem('arcadia_language', lang);
    showToast('Updated', lang === 'ar' ? 'Language: Arabic' : 'Language: English', 'win');
    renderBody();
    scheduleSave();
}

async function changeUsername(newName) {
    newName = newName.trim();
    if (newName.length < 3) {
        showToast('Error', 'Username must be at least 3 characters', 'lose');
        return;
    }
    if (!/^[a-zA-Z0-9_\u0600-\u06FF]+$/.test(newName)) {
        showToast('Error', 'Contains invalid characters', 'lose');
        return;
    }
    try {
        if (db) {
            const doc = await db.collection('usernames').doc(newName).get();
            if (doc.exists) {
                showToast('Error', 'Username already taken', 'lose');
                return;
            }
            if (state.username) {
                await db.collection('usernames').doc(state.username).delete();
            }
            await db.collection('usernames').doc(newName).set({ uid: UID });
            await db.collection('players').doc(UID).update({ username: newName });
        }
        state.username = newName;
        window.__playerUsername = newName;
        showToast('Success', `Username changed to ${newName}`, 'win');
        renderHeader();
        renderBody();
        scheduleSave();
    } catch (e) {
        showToast('Error', 'Failed to change username', 'lose');
        console.error(e);
    }
}

// ===== SETTINGS MODALS =====

function showModal(title, bodyHtml) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function openPersonalDetailsModal() {
    const avatarOptions = ['🧙', '⚔️', '🏹', '🔮', '💚', '💰', '🐉', '🐺', '🦅', '🛡️'];
    const avatarHtml = avatarOptions.map(a => `
        <button class="mini-btn ${state.avatar === a ? 'buy' : ''}"
                onclick="changeAvatar('${a}');this.closest('.modal-body').querySelectorAll('.mini-btn').forEach(b=>b.classList.remove('buy'));this.classList.add('buy');"
                style="font-size:22px;padding:6px 10px;">
            ${a}
        </button>`).join('');

    const body = `
        <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">📷 Choose your avatar:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${avatarHtml}</div>
        </div>
        <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">Display name</div>
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="font-family:'Cairo',sans-serif;font-weight:700;color:var(--text);">${state.username || 'Player'}</div>
                <button class="mini-btn buy" onclick="openNameModal()">✏️ Change</button>
            </div>
        </div>
        <div>
            <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">📝 Bio</div>
            <input type="text" class="username-input" id="bioInput" value="${state.bio || ''}"
                   placeholder="Write something about yourself..."
                   oninput="state.bio=this.value;scheduleSave();renderHeader();"
                   style="padding:8px 12px;font-size:13px;">
        </div>
    `;
    showModal('👤 Personal Details', body);
}

function openPreferencesModal() {
    const themeOptions = `
        <button class="mini-btn ${state.theme === 'dark' ? 'buy' : ''}" onclick="changeTheme('dark');this.closest('.modal-overlay').remove();openPreferencesModal();">🌙 Dark</button>
        <button class="mini-btn ${state.theme === 'light' ? 'buy' : ''}" onclick="changeTheme('light');this.closest('.modal-overlay').remove();openPreferencesModal();">☀️ Light</button>
    `;
    const fontSizeOptions = ['small', 'medium', 'large'].map(size => `
        <button class="mini-btn ${state.fontSize === size ? 'buy' : ''}"
                onclick="changeFontSize('${size}');this.closest('.modal-overlay').remove();openPreferencesModal();">
            ${size.charAt(0).toUpperCase() + size.slice(1)}
        </button>`).join('');
    const accentColors = ['#d4a24c', '#4a8cc4', '#6fa285', '#c44c4c', '#b8a0d4'];
    const accentHtml = accentColors.map(color => `
        <button class="mini-btn ${state.accentColor === color ? 'buy' : ''}"
                onclick="changeAccentColor('${color}');this.closest('.modal-overlay').remove();openPreferencesModal();"
                style="background:${color};width:30px;height:30px;border-radius:50%;border:2px solid ${state.accentColor === color ? 'var(--brass)' : 'var(--border)'};padding:0;"
                title="${color}"></button>`).join('');
    const langHtml = `
        <button class="mini-btn ${state.language === 'ar' ? 'buy' : ''}" onclick="changeLanguage('ar');this.closest('.modal-overlay').remove();openPreferencesModal();">🇸🇦 Arabic</button>
        <button class="mini-btn ${state.language === 'en' ? 'buy' : ''}" onclick="changeLanguage('en');this.closest('.modal-overlay').remove();openPreferencesModal();">🇬🇧 English</button>
    `;

    const body = `
        <div style="margin-bottom:16px;">
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;">🌐 Language</div>
            <div style="display:flex;gap:8px;">${langHtml}</div>
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;">🎨 Theme</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${themeOptions}</div>
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;">Font Size</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${fontSizeOptions}</div>
        </div>
        <div>
            <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;color:var(--brass-bright);margin-bottom:8px;">Accent Color</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${accentHtml}</div>
        </div>
    `;
    showModal('🎨 Appearance', body);
}

function openAchievementsModal() {
    const body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px;color:var(--dim);">
            <div>🪙 Gold: <b style="color:var(--text);">${fmtG(state.gold)}</b></div>
            <div>🏅 Level: <b style="color:var(--text);">${state.level}</b></div>
            <div>⚔️ Wins: <b style="color:var(--green);">${state.combat.wins}</b></div>
            <div>💀 Losses: <b style="color:var(--red);">${state.combat.losses}</b></div>
            <div>🎒 Gear Items: <b style="color:var(--text);">${state.gearBag.length}</b></div>
            <div>🔷 Shards: <b style="color:var(--text);">${state.shards}</b></div>
            <div>💎 Gems: <b style="color:var(--text);">${state.gems}</b></div>
            <div>🎯 Skill Points: <b style="color:var(--text);">${state.skillPoints}</b></div>
            <div>💰 Total Gold Earned: <b style="color:var(--text);">${fmtG(state.totalGoldEarned)}</b></div>
            <div>✨ Prestige Points: <b style="color:var(--prestige);">${state.prestige.points}</b></div>
        </div>
    `;
    showModal('🏆 Stats & Achievements', body);
}

function openSecurityModal() {
    const isGuest = !!(auth && auth.currentUser && auth.currentUser.isAnonymous);
    const body = isGuest ? `
        <p style="font-size:12.5px;color:var(--dim);margin-bottom:14px;">You are playing as a guest. Link your Google account to save progress and play across devices.</p>
        <button class="act-btn buy" style="width:auto;padding:8px 16px;font-size:12px;" onclick="linkGoogleAccount()">🔗 Link Google Account</button>
    ` : `
        <p style="font-size:12.5px;color:var(--dim);margin-bottom:14px;">Account linked to <b style="color:var(--text);">${EMAIL}</b></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="act-btn skill" style="width:auto;padding:8px 16px;font-size:12px;" onclick="changePassword()">🔒 Reset Password</button>
            <button class="act-btn red" style="width:auto;padding:8px 16px;font-size:12px;" onclick="if(confirm('Delete your account permanently?'))deleteAccount()">🗑️ Delete Account</button>
        </div>
    `;
    showModal('🔐 Login & Security', body);
}

function openDataModal() {
    const body = `
        <p style="font-size:12.5px;color:var(--dim);margin-bottom:14px;">Manage your locally saved game data.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="mini-btn buy" onclick="exportData()">📥 Export Data</button>
            <button class="mini-btn" onclick="document.getElementById('importInput').click()">📤 Import Data</button>
            <input type="file" id="importInput" accept=".json" style="display:none;" onchange="importData(this.files[0])">
            <button class="mini-btn red" onclick="if(confirm('Clear all local data?'))clearLocalData()">🗑️ Clear Local</button>
        </div>
    `;
    showModal('📊 Data & Backup', body);
}

function openPrestigeModal() {
    const p = state.prestige;
    const canPrest = canPrestige(state);
    const body = `
        <div style="text-align:center;">
            <div style="font-size:36px;margin-bottom:6px;">✨</div>
            <div style="font-size:12.5px;color:var(--dim);margin-bottom:12px;">At level ${PRESTIGE_LEVEL_REQ}, restart for permanent bonuses. Your gear stays with you! Companies will be reset.</div>
            <div style="max-width:300px;margin:0 auto 14px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-bottom:4px;">
                    <span>Progress to Prestige</span><span>${state.level} / ${PRESTIGE_LEVEL_REQ}</span>
                </div>
                <div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${Math.min(100,(state.level/PRESTIGE_LEVEL_REQ)*100)}%;background:var(--prestige);"></div></div>
            </div>
            <div style="font-size:12.5px;color:var(--dim);margin-bottom:4px;">Current Prestige Points: <b style="color:var(--prestige);">${p.points}</b></div>
            <div style="font-size:12.5px;color:var(--dim);margin-bottom:12px;">Total Gold Earned: <b style="color:var(--text);">${fmtG(state.totalGoldEarned)}g</b></div>
            ${canPrest ? `<div style="color:var(--prestige);margin:8px 0;font-size:13px;">🎉 You will gain <b>${Math.floor(state.level/5) + Math.floor(state.totalGoldEarned/5000)}</b> prestige points!</div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:14px 0;">
                <div class="bonus-tag">+${p.gatherBonus} gather</div>
                <div class="bonus-tag">+${(p.sellBonus*100).toFixed(0)}% sell</div>
                <div class="bonus-tag">+${p.energyBonus} max energy</div>
                <div class="bonus-tag">+${p.storageBonus} storage</div>
            </div>
            <button class="act-btn prestige ${canPrest?'animate-pulse':''}" style="width:auto;padding:12px 28px;font-size:13px;" ${canPrest?'':'disabled'} onclick="doPrestige();this.closest('.modal-overlay').remove();">
                ${canPrest ? '✨ Spiritual Renewal' : `🔒 Requires level ${PRESTIGE_LEVEL_REQ}`}
            </button>
        </div>
    `;
    showModal('✨ Prestige — Spiritual Renewal', body);
}

function openAboutModal() {
    const body = `
        <div style="font-size:12.5px;color:var(--dim);">
            <div><b>Version:</b> v1.0.0</div>
            <div><b>Developer:</b> Arcadia MMO Team</div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button class="mini-btn" onclick="alert('Report a bug: arcadia@email.com')">🐛 Report Bug</button>
                <button class="mini-btn buy" onclick="alert('Send feedback: arcadia@email.com')">💡 Feedback</button>
            </div>
        </div>
    `;
    showModal('ℹ️ About', body);
}

function openNameModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3>✏️ Change Username</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom:12px;">
                    <label style="font-size:13px;color:var(--dim);">Current name: <b style="color:var(--text);">${state.username}</b></label>
                </div>
                <input type="text" id="newUsernameInput" class="username-input" 
                       placeholder="Enter new username..." maxlength="15"
                       style="margin-bottom:8px;">
                <div id="nameError" style="color:var(--red);font-size:12px;display:none;"></div>
                <div id="nameSuccess" style="color:var(--green);font-size:12px;display:none;">✓ Username available!</div>
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" id="confirmNameBtn" onclick="confirmNameChange()">Confirm Change</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const input = document.getElementById('newUsernameInput');
    input.addEventListener('input', async function() {
        const val = this.value.trim();
        const errorEl = document.getElementById('nameError');
        const successEl = document.getElementById('nameSuccess');
        const confirmBtn = document.getElementById('confirmNameBtn');
        
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        confirmBtn.disabled = true;
        
        if (val.length < 3) {
            errorEl.textContent = 'Username must be at least 3 characters';
            errorEl.style.display = 'block';
            return;
        }
        if (!/^[a-zA-Z0-9_\u0600-\u06FF]+$/.test(val)) {
            errorEl.textContent = 'Contains invalid characters';
            errorEl.style.display = 'block';
            return;
        }
        if (val === state.username) {
            errorEl.textContent = 'This is your current username';
            errorEl.style.display = 'block';
            return;
        }
        
        try {
            if (db) {
                const doc = await db.collection('usernames').doc(val).get();
                if (doc.exists) {
                    errorEl.textContent = '❌ Username already taken';
                    errorEl.style.display = 'block';
                    return;
                }
            }
            successEl.style.display = 'block';
            confirmBtn.disabled = false;
        } catch(e) {
            errorEl.textContent = 'Connection error, try again';
            errorEl.style.display = 'block';
        }
    });
}

async function confirmNameChange() {
    const input = document.getElementById('newUsernameInput');
    const newName = input.value.trim();
    if (!newName) return;
    const modal = document.querySelector('.modal-overlay');
    await changeUsername(newName);
    if (modal) modal.remove();
}

// ===== DATA FUNCTIONS =====

function exportData() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arcadia_save.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Success', 'Data exported!', 'win');
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('This will replace your current progress. Continue?')) {
                state = migrateState(data);
                scheduleSave();
                render();
                showToast('Success', 'Data imported!', 'win');
            }
        } catch(err) {
            showToast('Error', 'Invalid file format', 'lose');
        }
    };
    reader.readAsText(file);
}

function clearLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    render();
    scheduleSave();
    showToast('Cleared', 'Local data cleared', 'win');
}

// ===== SECURITY FUNCTIONS =====

function changePassword() {
    if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
        showToast('Error', 'Guest accounts cannot change password. Link Google account first.', 'lose');
        return;
    }
    try {
        auth.sendPasswordResetEmail(auth.currentUser.email);
        showToast('Sent', `Password reset email sent to ${auth.currentUser.email}`, 'win');
    } catch(e) {
        showToast('Error', 'Failed to send reset email', 'lose');
    }
}

async function deleteAccount() {
    if (!auth || !auth.currentUser) return;
    if (!confirm('Are you sure? This will permanently delete your account and all progress!')) return;
    if (!confirm('This cannot be undone. Are you absolutely sure?')) return;
    
    try {
        // Delete Firestore data
        if (db) {
            await db.collection('players').doc(UID).delete();
            if (state.username) {
                await db.collection('usernames').doc(state.username).delete();
            }
        }
        // Delete auth account
        await auth.currentUser.delete();
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    } catch(e) {
        showToast('Error', 'Failed to delete account: ' + e.message, 'lose');
    }
}
function renderLog(){
  const el = document.getElementById('log-panel');
  if(el) el.innerHTML = renderLogHTML();
}

function renderLogHTML(){
  return state.log.slice().reverse().map(l=>`<div class="log-line ${l.cls}"><span class="t">${timeLabel(l.t)}</span>${l.text}</div>`).join('') || '<div class="log-line">Nothing yet.</div>';
}



/* ===== MISSING CONSTANTS ===== */

// ─── Misc Render Helpers ───
const BREAD_TIERS = {
  toasted_bread:     { name:'Toasted Bread',     heal:25 },
  honey_bread:       { name:'Honey Bread',       heal:50 },
  legendary_bread:   { name:'Legendary Bread',   heal:100 },
};

const ENERGY_POTION_TIERS = {
  small_energy_potion:    { name:'Small Energy Potion',    energy:15 },
  medium_energy_potion:   { name:'Medium Energy Potion',   energy:35 },
  large_energy_potion:    { name:'Large Energy Potion',    energy:80 },
  legendary_energy_potion:{ name:'Legendary Energy Potion',energy:200 },
};

const MAX_COMPANIES = 9;
const COMPANY_RESOURCES = ['wood','stone','food','coal','iron','gold','cotton','leather','sand','gemstones','water','salt','copper','silver','zinc','lead','magic_stones','herbs','honey'];
const ENGINE_PRODUCTION = [0, 10, 15, 22, 32, 45, 60, 80, 105, 135, 170];
const ENGINE_UPGRADE_COST = [0, 5, 10, 20, 35, 55, 80, 110, 150, 200, 280];

/* ===== UTILITY FUNCTIONS ===== */
function fmtG(n){
  if(typeof n !== 'number' || isNaN(n)) n = 0;
  if(n===0) return '0';
  if(n>=1000000) return (n/1000000).toFixed(1)+'M';
  if(n>=1000) return (n/1000).toFixed(1)+'K';
  return n.toLocaleString();
}
function timeLabel(ts){
  const d=new Date(ts);
  return d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}
function hmsUntil(ts){
  const diff=Math.max(0,ts-Date.now());
  const h=Math.floor(diff/3600000);
  const m=Math.floor((diff%3600000)/60000);
  const s=Math.floor((diff%60000)/1000);
  return `${h}h ${m}m ${s}s`;
}
/* ===== COMPANY HELPERS ===== */

// ─── Zone Rendering ───
function renderZones(){
  return `<div class="wrap animate-fade">
    <header class="hero" style="margin-bottom:18px;">
      <h1 style="font-size:24px;">🗺️ Realm Explorer</h1>
      <p style="color:var(--dim);font-size:13px;">Select a zone to enter</p>
    </header>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr));">
      ${ZONES.map(z=>{
        const locked = state.level < z.levelMin;
        return `<div onclick="${locked?'':'enterZoneView(\''+z.id+'\')'}" 
          style="background:var(--panel-light);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;cursor:${locked?'not-allowed':'pointer'};opacity:${locked?0.5:1};transition:all 0.2s;position:relative;overflow:hidden;"
          onmouseover="if(!${locked}){this.style.borderColor='var(--brass)';this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.25)'}"
          onmouseout="if(!${locked}){this.style.borderColor='var(--border)';this.style.transform='translateY(0)';this.style.boxShadow='none'}">
          <div style="font-size:36px;margin-bottom:8px;">${z.icon}</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:14px;color:var(--brass-bright);">${z.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${z.color};margin-top:4px;">Lv. ${z.levelMin}${z.levelMax?'-'+z.levelMax:'+'}</div>
          <div style="font-size:11px;color:var(--dim);margin-top:6px;">${(ZONE_RESOURCES[z.id]||[]).length} resources · ${(ZONE_MONSTERS[z.id]||[]).length} monsters</div>
          ${locked?`<div class="locked-tag" style="margin-top:8px;">🔒 Requires Lv.${z.levelMin}</div>`:''}
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,transparent 60%,${z.color}10 100%);pointer-events:none;"></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderZoneView(){
  const z = ZONES.find(x=>x.id===state.zoneView);
  if(!z) return '';
  const resources = ZONE_RESOURCES[z.id]||[];
  const monsters = ZONE_MONSTERS[z.id]||[];
  const tierColors = {common:'var(--tier-common)',uncommon:'var(--tier-uncommon)',rare:'var(--tier-rare)',epic:'var(--tier-epic)',legendary:'var(--tier-legendary)',mythic:'var(--tier-mythic)'};
  
  return `<div class="wrap animate-fade">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button class="act-btn" style="width:auto;padding:6px 12px;font-size:11px;" onclick="goBackFromZone()">← Back to Zones</button>
      <div style="font-size:28px;">${z.icon}</div>
      <div>
        <div style="font-family:'Cairo',sans-serif;font-weight:800;font-size:17px;color:var(--brass-bright);">${z.name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">Lv. ${z.levelMin} · ${resources.length} resources · ${monsters.length} threats</div>
      </div>
    </div>

    <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:14px;color:var(--green);margin-bottom:8px;">⚒️ Resources</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));margin-bottom:20px;">
      ${resources.map(rid=>{
        const r = RESOURCES[rid];
        if(!r) return '';
        const tier = r.tier || 'common';
        const canGather = state.energy >= 5;
        return `<div class="card" style="padding:14px;text-align:center;">
          <div style="font-size:30px;margin-bottom:6px;">${r.icon}</div>
          <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;">${r.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${tierColors[tier]};text-transform:uppercase;margin:4px 0;">${tier}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:8px;">${r.basePrice}g base</div>
          <button class="act-btn green" onclick="collect('${rid}')" ${canGather?'':'disabled'}>Gather (-5⚡)</button>
        </div>`;
      }).join('')}
    </div>

    <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:14px;color:var(--red);margin-bottom:8px;">⚔️ Monsters</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">
      ${monsters.map(m=>{
        const canFight = state.energy >= z.energyCost && state.health > 0;
        return `<div class="card" style="padding:14px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="font-size:32px;">${m.icon}</div>
            <div>
              <div style="font-family:'Cairo',sans-serif;font-weight:700;font-size:13px;">${m.name}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);">HP ${m.hp} · ATK ${m.a} · Lv.${m.level}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:10px;">
            <span class="stat-pill">${m.xp} XP</span>
            <span class="stat-pill">${m.g}g</span>
          </div>
          <button class="act-btn red" onclick="startBattle('${z.id}')" ${canFight?'':'disabled'}>
            ${canFight?'Fight (-'+z.energyCost+'⚡)':'Need ⚡/HP'}
          </button>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
// ===== THEME FUNCTIONS =====

function changeTheme(theme) {
    state.theme = theme;
    applyTheme(theme);
    scheduleSave();
    showToast('Updated', `Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, 'win');
    renderBody();
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.style.setProperty('--bg', '#f0ece4');
        root.style.setProperty('--panel', '#e8e0d5');
        root.style.setProperty('--panel-light', '#f5f0e8');
        root.style.setProperty('--text', '#1a1522');
        root.style.setProperty('--dim', '#5a5068');
        root.style.setProperty('--border', '#c8bdb0');
        // يمكنك إضافة المزيد من المتغيرات حسب الحاجة
    } else {
        // العودة إلى القيم الافتراضية (الموجودة في :root)
        root.style.setProperty('--bg', '#0f1b1a');
        root.style.setProperty('--panel', '#16302b');
        root.style.setProperty('--panel-light', '#1e3d36');
        root.style.setProperty('--text', '#e5ddc8');
        root.style.setProperty('--dim', '#9fb0a8');
        root.style.setProperty('--border', '#2c4a42');
    }
    applyAccentColor(state.accentColor);
}

function changeFontSize(size) {
    state.fontSize = size;
    applyFontSize(size);
    scheduleSave();
    showToast('Updated', `Font size: ${size}`, 'win');
}

function applyFontSize(size) {
    const root = document.documentElement;
    const sizes = { small: '12px', medium: '15px', large: '18px' };
    root.style.fontSize = sizes[size] || '15px';
}

function changeAccentColor(color) {
    state.accentColor = color;
    applyAccentColor(color);
    scheduleSave();
    showToast('Updated', 'Accent color changed', 'win');
}

function applyAccentColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--brass', color);
    root.style.setProperty('--brass-bright', color);
    // يمكنك تعديل الألوان المشتقة حسب الرغبة
}
