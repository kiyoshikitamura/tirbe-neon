/** Finalized Open Beta equipment-level contribution curve. */
export function getEquipmentLevelScale(level: number): number {
  const normalizedLevel = Math.min(100, Math.max(1, Math.trunc(Number(level) || 1)));
  if (normalizedLevel <= 50) {
    return 0.1 + ((normalizedLevel - 1) * 0.5) / 49;
  }
  return 0.6 + ((normalizedLevel - 50) * 0.4) / 50;
}
