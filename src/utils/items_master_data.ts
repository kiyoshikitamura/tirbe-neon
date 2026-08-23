import { CANONICAL_ITEMS } from "@/domain/gameplay/canonical/items";

export interface ItemMaster {
  id: string;
  name: string;
  category: "CONSUMABLE" | "CHAR_EXP" | "EQUIP_EXP" | "AWAKEN" | "LIMIT_BREAK" | "TICKET";
  description: string;
  iconType: string;
  assetPath: string;
  effectValue?: number;
}

const CATEGORY_MAP: Readonly<Record<string, ItemMaster["category"]>> = Object.freeze({
  CHARACTER_EXP: "CHAR_EXP",
  EQUIPMENT_EXP: "EQUIP_EXP",
  CHARACTER_AWAKENING: "AWAKEN",
  SKILL_AWAKENING: "LIMIT_BREAK",
  EQUIPMENT_LIMIT_BREAK: "LIMIT_BREAK",
  RESOURCE_RECOVERY: "CONSUMABLE",
  GACHA_TICKET: "TICKET",
});

const ICON_TYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  ENERGY_DRINK: "ENERGY_DRINK",
  CHAR_EXP_S: "BOOK_S",
  CHAR_EXP_M: "BOOK_M",
  CHAR_EXP_L: "BOOK_L",
  EQUIP_EXP_S: "OIL_S",
  EQUIP_EXP_M: "OIL_M",
  EQUIP_EXP_L: "OIL_L",
  AWAKENING_BOOK: "AWAKEN_BOOK",
  SKILL_MANUAL: "SKILL_LB",
  EQUIP_LB_PART: "EQUIP_LB",
});

export const ITEMS_MASTER_DATA: readonly ItemMaster[] = CANONICAL_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  category: CATEGORY_MAP[item.category],
  description: item.description,
  iconType: ICON_TYPE_MAP[item.id] ?? (item.category === "GACHA_TICKET" ? "TICKET" : "RESOURCE"),
  assetPath: item.assetPath,
  effectValue: "effectValue" in item.runtimeUsage && typeof item.runtimeUsage.effectValue === "number"
    ? item.runtimeUsage.effectValue
    : undefined,
}));
