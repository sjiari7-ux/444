/* ============================================================
   CHARACTER MODEL
   ============================================================ */
function newCharacter(id, username, classId){
  const cls = CLASSES[classId];
  const now = Date.now();
  const c = {
    id, username, class: classId, level:1, xp:0,
    gold:150,
    hpCur: cls.base.hp, energyCur:100, resourceCur:0, manaCur:20,
    generalSkills:{health:0,damage:0,defense:0,stamina:0,storage:0},
    classSkills:{}, skillPoints:0,
    equipment:{weapon:null,armor:null,helmet:null,boots:null,gloves:null,accessory:null},
    inventory:[],
    resourceBag:{wood:0,stone:0,food:0,coal:0,iron:0,ore:0,herbs:0,leather:0,frost:0,voidessence:0},
    pvp:{rating:1000, wins:0, losses:0, protectedUntil:0},
    bossCooldowns:{},
    kingdomId:null, kingdomRole:null, kingdomJoinedAt:0, kingdomCooldownUntil:0,
    lastEnergyAt: now, lastHpAt: now, lastManaAt: now,
    createdAt: now, updatedAt: now,
  };
  cls.skills.forEach(s=> c.classSkills[s.id]=0);
  // starting equipment (crude, weak, non-tiered "starter" gear)
  const w = makeEquipment('weapon', 'common', 1); w.name = cls.startEq.weapon; w.starter=true;
  const a = makeEquipment('armor', 'common', 1); a.name = cls.startEq.armor; a.starter=true;
  c.equipment.weapon = w; c.equipment.armor = a;
  return c;
}

function makeEquipment(slot, tierId, level){
  const tier = TIERS.find(t=>t.id===tierId) || TIERS[0];
  const base = 3 + level*1.4;
  const stats = {};
  if(slot==='weapon'){ stats.atk = Math.round(base*1.3*tier.mult); }
  else if(slot==='armor'){ stats.def = Math.round(base*0.85*tier.mult); stats.hp = Math.round(base*3*tier.mult); }
  else if(slot==='helmet'){ stats.def = Math.round(base*0.55*tier.mult); stats.hp = Math.round(base*1.4*tier.mult); }
  else if(slot==='boots'){ stats.spd = Math.round(base*0.5*tier.mult); stats.eva = Math.round(base*0.3*tier.mult); }
  else if(slot==='gloves'){ stats.atk = Math.round(base*0.45*tier.mult); stats.crit = Math.round(base*0.22*tier.mult); }
  else if(slot==='accessory'){ stats.crit = Math.round(base*0.35*tier.mult); stats.eva = Math.round(base*0.35*tier.mult); }
  return {
    uid: uid(), kind:'equipment', slot, tier: tier.id,
    name: tier.name + ' ' + SLOT_NOUN[slot],
    level, stats,
  };
}

function xpNeeded(level){ return XP_FOR_LEVEL(level); }

function effectiveStats(c){
  const cls = CLASSES[c.class];
  const lvl = c.level;
  let hp = cls.base.hp + cls.growth.hp*(lvl-1) + c.generalSkills.health*8;
  let atk = cls.base.atk + cls.growth.atk*(lvl-1) + c.generalSkills.damage*2;
  let def = cls.base.def + cls.growth.def*(lvl-1) + c.generalSkills.defense*2;
  let spd = cls.base.spd + cls.growth.spd*(lvl-1);
  let crit = cls.base.crit + cls.growth.crit*(lvl-1);
  let eva = cls.base.eva + cls.growth.eva*(lvl-1);
  EQUIP_SLOTS.forEach(slot=>{
    const it = c.equipment[slot];
    if(it && it.stats){
      hp += it.stats.hp||0; atk += it.stats.atk||0; def += it.stats.def||0;
      spd += it.stats.spd||0; crit += it.stats.crit||0; eva += it.stats.eva||0;
    }
  });
  const maxEnergy = 100 + c.generalSkills.stamina*6;
  const maxMana = c.class==='mage' ? (20 + lvl*4) : (20 + Math.floor(lvl*0.5));
  const resourceMax = c.class==='mage' ? maxMana : 100;
  const storageCap = 500 + c.generalSkills.storage*40;
  return {
    maxHp: Math.round(hp), atk: Math.round(atk), def: Math.round(def),
    spd: Math.round(spd*10)/10, crit: Math.round(crit*10)/10, eva: Math.round(eva*10)/10,
    maxEnergy: Math.round(maxEnergy), maxMana: Math.round(maxMana),
    resourceMax: Math.round(resourceMax), storageCap: Math.round(storageCap),
  };
}

function bagCount(c){ return c.inventory.length; }
function resourceTotal(c){ return Object.values(c.resourceBag).reduce((a,b)=>a+b,0); }

function applyRegen(c){
  const now = Date.now();
  const eff = effectiveStats(c);
  const eTicks = Math.floor((now - c.lastEnergyAt) / ENERGY_REGEN_MS);
  if(eTicks>0){ c.energyCur = clamp(c.energyCur + eTicks*ENERGY_REGEN_AMT, 0, eff.maxEnergy); c.lastEnergyAt += eTicks*ENERGY_REGEN_MS; }
  const hTicks = Math.floor((now - c.lastHpAt) / HP_REGEN_MS);
  if(hTicks>0){ c.hpCur = clamp(c.hpCur + hTicks*Math.max(1,Math.round(eff.maxHp*HP_REGEN_PCT)), 0, eff.maxHp); c.lastHpAt += hTicks*HP_REGEN_MS; }
  const mTicks = Math.floor((now - c.lastManaAt) / MANA_REGEN_MS);
  if(mTicks>0){ c.manaCur = clamp(c.manaCur + mTicks*MANA_REGEN_AMT, 0, eff.maxMana); c.lastManaAt += mTicks*MANA_REGEN_MS; }
  c.hpCur = clamp(c.hpCur, 0, eff.maxHp);
  c.energyCur = clamp(c.energyCur, 0, eff.maxEnergy);
  if(c.class!=='mage') c.manaCur = clamp(c.manaCur, 0, eff.maxMana);
}

