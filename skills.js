/* ---------------- Skills ---------------- */
function buyGeneralSkill(skillId){
  const c = S.char;
  const lvl = c.generalSkills[skillId];
  if(lvl>=GENERAL_SKILL_MAX) return;
  const cost = generalSkillCost(lvl);
  if(c.skillPoints < cost) return;
  c.skillPoints -= cost;
  c.generalSkills[skillId] += 1;
  const eff = effectiveStats(c);
  c.hpCur = clamp(c.hpCur, 0, eff.maxHp);
  showToast('Skill improved.');
}
function buyClassSkill(skillId){
  const c = S.char;
  const lvl = c.classSkills[skillId];
  if(lvl>=MAX_SKILL_LEVEL) return;
  const cost = SKILL_UPGRADE_COST[lvl];
  if(c.skillPoints < cost) return;
  c.skillPoints -= cost;
  c.classSkills[skillId] += 1;
  showToast('Skill upgraded.');
}
function resetClassSkills(){
  const c = S.char;
  let refund = 0;
  Object.keys(c.classSkills).forEach(id=>{
    const lvl = c.classSkills[id];
    for(let i=0;i<lvl;i++) refund += SKILL_UPGRADE_COST[i];
    c.classSkills[id] = 0;
  });
  c.skillPoints += refund;
  showToast('Class skills reset.');
}
function resetGeneralSkills(){
  const c = S.char;
  let refund = 0;
  Object.keys(c.generalSkills).forEach(id=>{
    const lvl = c.generalSkills[id];
    for(let i=0;i<lvl;i++) refund += generalSkillCost(i);
    c.generalSkills[id] = 0;
  });
  c.skillPoints += refund;
  const eff = effectiveStats(c);
  c.hpCur = clamp(c.hpCur, 0, eff.maxHp);
  showToast('General skills reset.');
}

