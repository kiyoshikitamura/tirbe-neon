import { EQUIPMENTS_MASTER_DATA } from "./equipments_master_data";
import { CHARACTERS_MASTER, CHARACTER_GROWTH_PATTERNS, CHARACTER_AWAKENING_MASTER } from "./game_constants";

export function getCharacterBaseStats(characterId: string, level: number, awaken: number) {
  const charMaster = CHARACTERS_MASTER.find(c => c.id === characterId);
  const patternId = charMaster?.growthPatternId || "BALANCED";

  const rarity = (charMaster as any)?.rarity || "R";
  const rarityMultiplier = rarity === "SSR" ? 1.25 : rarity === "SR" ? 1.1 : rarity === "N" ? 0.95 : 1.0;

  const pattern = CHARACTER_GROWTH_PATTERNS.find(p => p.pattern_id === patternId) || CHARACTER_GROWTH_PATTERNS[0];
  const awakenMaster = CHARACTER_AWAKENING_MASTER.find(a => a.awakening_level === awaken);

  const hpBonus = awakenMaster ? awakenMaster.hp_bonus : 0;
  const atkBonus = awakenMaster ? awakenMaster.atk_bonus : 0;
  const defBonus = awakenMaster ? awakenMaster.def_bonus : 0;
  const spdBonus = awakenMaster ? awakenMaster.spd_bonus : 0;
  const lukBonus = awakenMaster ? awakenMaster.luk_bonus : 0;

  return {
    hp: Math.floor((pattern.base_hp + (level - 1) * pattern.hp_gain + hpBonus) * rarityMultiplier),
    atk: Math.floor((pattern.base_atk + (level - 1) * pattern.atk_gain + atkBonus) * rarityMultiplier),
    def: Math.floor((pattern.base_def + (level - 1) * pattern.def_gain + defBonus) * rarityMultiplier),
    spd: Math.floor((pattern.base_spd + Math.floor((level - 1) * pattern.spd_gain) + spdBonus) * rarityMultiplier),
    luk: Math.floor((pattern.base_luk + Math.floor((level - 1) * pattern.luk_gain) + lukBonus) * rarityMultiplier),
  };
}

export function getCharacterTotalStats(charRecord: any, equipsList: any[]) {
  if (!charRecord) return { hp: 0, atk: 0, def: 0, spd: 0, luk: 0 };
  const base = getCharacterBaseStats(charRecord.character_id, charRecord.level, charRecord.awakening_level);
  
  const charEquips = equipsList.filter(eq => eq.equipped_character_id === charRecord.id);
  
  let extraHp = 0;
  let extraAtk = 0;
  let extraDef = 0;
  let extraSpd = 0;
  let extraLuk = 0;

  charEquips.forEach(eq => {
    const master = EQUIPMENTS_MASTER_DATA.find(m => m.id === eq.equipment_id);
    if (master) {
      const scale = 1 + (eq.level - 1) * 0.05 + eq.plus_val * 0.10;
      extraHp += Math.floor(master.hp * scale);
      extraAtk += Math.floor(master.atk * scale);
      extraDef += Math.floor(master.def * scale);
      extraSpd += Math.floor(master.spd * scale);
      extraLuk += Math.floor(master.luk * scale);
    }
  });


  return {
    hp: base.hp + extraHp,
    atk: base.atk + extraAtk,
    def: base.def + extraDef,
    spd: base.spd + extraSpd,
    luk: base.luk + extraLuk
  };
}

export function getCharacterApBonus(charRecordId: string, equipsList: any[]) {
  if (!charRecordId) return 0;
  const charEquips = equipsList.filter(eq => eq.equipped_character_id === charRecordId);
  let apBonus = 0;
  charEquips.forEach(eq => {
    if (eq.random_options) {
      let options: any[] = [];
      try {
        options = typeof eq.random_options === "string" ? JSON.parse(eq.random_options) : eq.random_options;
      } catch (e) {
        options = [];
      }
      if (Array.isArray(options)) {
        options.forEach(opt => {
          if (opt && (opt.type === "ap_max_up" || opt.type === "ap_max")) {
            apBonus += Number(opt.value) || 0;
          }
        });
      }
    }
  });
  return apBonus;
}

