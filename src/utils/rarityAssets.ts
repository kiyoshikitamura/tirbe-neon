export type ProductionRarity = "N" | "R" | "SR" | "SSR";
export type RarityFrameKind = "reveal" | "character" | "skill" | "equipment";

const RARITY_ROOT = "/ui/rarity";

export function normalizeProductionRarity(value: unknown): ProductionRarity {
  const rarity = String(value || "N").toUpperCase();
  return rarity === "SSR" || rarity === "SR" || rarity === "R" ? rarity : "N";
}

export function getRarityFrameAsset(kind: RarityFrameKind, rarityValue: unknown): string {
  const rarity = normalizeProductionRarity(rarityValue).toLowerCase();
  if (kind === "reveal") return `${RARITY_ROOT}/${rarity}.png`;
  if (kind === "character") return `${RARITY_ROOT}/character-card-${rarity}.png`;
  return `${RARITY_ROOT}/${kind}-frame-${rarity}.png`;
}

export function getRarityBadgeAsset(rarityValue: unknown): string {
  return `${RARITY_ROOT}/rarity-badge-${normalizeProductionRarity(rarityValue).toLowerCase()}.png`;
}

export function getAwakeningBadgeAsset(levelValue: unknown): string | null {
  const level = Math.trunc(Number(levelValue));
  return Number.isFinite(level) && level >= 1 && level <= 5
    ? `${RARITY_ROOT}/badge-awakening-plus-${level}.png`
    : null;
}

export function getAcquisitionBadgeAsset(state: "NEW" | "AWAKENING", awakeningLevel?: unknown): string | null {
  return state === "NEW" ? `${RARITY_ROOT}/badge-new.png` : getAwakeningBadgeAsset(awakeningLevel);
}
