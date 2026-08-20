export type ProductionAttribute = "JUSTICE" | "ORDER" | "EVIL" | "CHAOS";

const ATTRIBUTE_ALIASES: Record<string, ProductionAttribute> = {
  JUSTICE: "JUSTICE", "正": "JUSTICE",
  ORDER: "ORDER", "秩": "ORDER",
  EVIL: "EVIL", "悪": "EVIL",
  CHAOS: "CHAOS", "混": "CHAOS",
};

const ATTRIBUTE_LABELS: Record<ProductionAttribute, string> = {
  JUSTICE: "正", ORDER: "秩", EVIL: "悪", CHAOS: "混",
};

export function normalizeProductionAttribute(value: unknown): ProductionAttribute | null {
  return ATTRIBUTE_ALIASES[String(value || "").trim().toUpperCase()] || null;
}

export function getAttributeBadgeAsset(value: unknown): string | null {
  const attribute = normalizeProductionAttribute(value);
  return attribute ? `/ui/rarity/attribute-badge-${attribute.toLowerCase()}.png` : null;
}

export function getAttributeLabel(value: unknown): string {
  const attribute = normalizeProductionAttribute(value);
  return attribute ? ATTRIBUTE_LABELS[attribute] : "無所属";
}
