const { getEquipmentLevelScale } = await import("../src/utils/equipment_progression.ts");

const expected = new Map([[1, 0.1], [50, 0.6], [100, 1.0]]);
for (const [level, value] of expected) {
  const actual = getEquipmentLevelScale(level);
  if (Math.abs(actual - value) > Number.EPSILON * 10) {
    throw new Error(`Unexpected equipment scale at Lv${level}: ${actual}`);
  }
}
for (let level = 2; level <= 100; level++) {
  if (getEquipmentLevelScale(level) <= getEquipmentLevelScale(level - 1)) {
    throw new Error(`Equipment curve is not increasing at Lv${level}`);
  }
}
if (getEquipmentLevelScale(0) !== 0.1 || getEquipmentLevelScale(101) !== 1) {
  throw new Error("Equipment curve clamp failed");
}

console.log("Equipment level battle curve verification passed.");
