import { strict as assert } from "node:assert";
const {
  canonicalEquipmentFlatStat,
  canonicalEquipmentLevelAllowed,
  canonicalEquipmentLevelCap,
  canonicalEquipmentLevelScale,
} = await import("../src/domain/gameplay/canonical/calculations.ts");
const { CANONICAL_EQUIPMENTS } = await import("../src/domain/gameplay/canonical/masters.ts");

const expected = new Map([
  [1, 0.5], [2, 0.5 + 0.25 / 49], [25, 0.5 + 24 * 0.25 / 49],
  [49, 0.5 + 48 * 0.25 / 49], [50, 0.75], [51, 0.755],
  [75, 0.875], [99, 0.995], [100, 1],
]);
for (const [level, value] of expected) {
  assert.ok(Math.abs(canonicalEquipmentLevelScale(level) - value) < 1e-12, `Unexpected equipment scale at Lv${level}`);
}
for (let level = 2; level <= 100; level++) {
  assert.ok(canonicalEquipmentLevelScale(level) > canonicalEquipmentLevelScale(level - 1), `Curve not increasing at Lv${level}`);
}
assert.deepEqual([...Array(11).keys()].map(canonicalEquipmentLevelCap), [50,60,70,80,90,100,100,100,100,100,100]);
for (const [plusValue, cap] of [50,60,70,80,90,100,100,100,100,100,100].entries()) {
  assert.equal(canonicalEquipmentLevelAllowed(cap, plusValue), true);
  if (cap < 100) assert.equal(canonicalEquipmentLevelAllowed(cap + 1, plusValue), false);
  assert.throws(() => canonicalEquipmentLevelAllowed(101, plusValue), RangeError);
}

const scenarios = [[1,0],[50,0],[60,1],[80,3],[90,4],[100,5],[100,10]];
for (const category of ["WEAPON","HEAD","BODY","LEGS","ACCESSORY"]) {
  const equipment = CANONICAL_EQUIPMENTS.find((entry) => entry.category === category);
  assert.ok(equipment, `Missing ${category}`);
  for (const [level, plusValue] of scenarios) {
    for (const stat of ["hp","atk","def","spd","luk"]) {
      const flat = equipment.base_stats[stat];
      const expectedFlat = Math.floor(flat * canonicalEquipmentLevelScale(level) * (1 + plusValue * 0.04) + 1e-10);
      assert.equal(canonicalEquipmentFlatStat(flat, level, plusValue), expectedFlat, `${equipment.equipment_id} ${stat} Lv${level} +${plusValue}`);
    }
  }
}

console.log("Canonical equipment progression verification passed.");
