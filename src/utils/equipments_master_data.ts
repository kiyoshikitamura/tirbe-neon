import { CANONICAL_EQUIPMENTS } from "@/domain/gameplay/canonical/masters";

/** UI compatibility view generated exclusively from Equipment170 Canonical Master. */
export interface EquipmentMaster {
  id: string; name: string; rarity: "N" | "R" | "SR" | "SSR";
  slot_type: "WEAPON" | "HEAD" | "BODY" | "LEGS" | "ACCESSORY";
  atk: number; def: number; hp: number; spd: number; luk: number;
  is_exclusive: boolean; exclusive_character_id: string | null;
  effect_description: string | null; description: string;
}

export const CANONICAL_EQUIPMENT_VIEW: EquipmentMaster[] = CANONICAL_EQUIPMENTS.map((equipment) => ({
  id: equipment.equipment_id, name: equipment.display_name, rarity: equipment.rarity,
  slot_type: equipment.category, ...equipment.base_stats,
  is_exclusive: equipment.exclusive_character_id !== null,
  exclusive_character_id: equipment.exclusive_character_id,
  effect_description: equipment.fixed_effects.filter((effect) => effect !== "—").join(" / ") || null,
  description: equipment.fixed_effects.filter((effect) => effect !== "—").join(" / ") || equipment.display_name,
}));

/** @deprecated Canonical compatibility alias retained while old imports are retired. */
export const EQUIPMENTS_MASTER_DATA = CANONICAL_EQUIPMENT_VIEW;
