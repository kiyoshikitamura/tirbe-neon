import { canonicalEquipmentLevelCap, canonicalEquipmentLevelScale } from "@/domain/gameplay/canonical/calculations";

export function getEquipmentLevelScale(level: number): number {
  return canonicalEquipmentLevelScale(Math.min(100, Math.max(1, Math.trunc(Number(level) || 1))));
}

export function getEquipmentLevelCap(plusValue: number): number {
  return canonicalEquipmentLevelCap(Math.min(10, Math.max(0, Math.trunc(Number(plusValue) || 0))));
}
