export type CanonicalStats = Readonly<{ hp: number; atk: number; def: number; spd: number; luk: number }>;

export type CanonicalCharacter = Readonly<{
  character_id: string;
  name: string;
  rarity: "N" | "R" | "SR" | "SSR";
  attribute: "JUSTICE" | "ORDER" | "EVIL" | "CHAOS";
  hometown: string;
  lv1: CanonicalStats;
  lv100: CanonicalStats;
}>;

export type CanonicalEquipment = Readonly<{
  equipment_id: string;
  display_name: string;
  rarity: "N" | "R" | "SR" | "SSR";
  category: "WEAPON" | "HEAD" | "BODY" | "LEGS" | "ACCESSORY";
  base_stats: CanonicalStats;
  fixed_effects: readonly string[];
  exclusive_character_id: string | null;
  random_options: false;
}>;
