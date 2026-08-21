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

export type CanonicalMissionCategory = "DAILY" | "NORMAL";
export type CanonicalMissionUiStatus = "IN_PROGRESS" | "CLEAR" | "CLAIMED" | "LOCKED";

export type CanonicalMission = Readonly<{
  id: string;
  category: CanonicalMissionCategory;
  triggerType: string;
  title: string;
  description: string;
  targetValue: number;
  conditionParams: Readonly<Record<string, unknown>>;
  rewardItemId: string;
  rewardQuantity: number;
  prerequisiteMissionId: string | null;
  displayOrder: number;
  isEnabled: boolean;
  isRepeatable: boolean;
  isProvisional: false;
  cta: Readonly<{ tab: string | null; action: string | null; label: string }> | null;
}>;
