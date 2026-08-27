import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const frozenEarlyRequirements = [100, 150, 200, 250, 300, 350, 400];
const referenceCumulative = new Map([[8, 1750], [10, 3050], [20, 28050], [30, 120550], [50, 708050], [75, 2712750], [100, 6858050]]);
const round50 = (value) => Math.floor((value + 24) / 50) * 50;
const levels = [];
let cumulativeExp = 0;
for (let level = 1; level <= 100; level += 1) {
  const requiredExp = level === 100
    ? 0
    : level <= 7
      ? frozenEarlyRequirements[level - 1]
      : round50(600 + 100 * (level - 8) + 25 * (level - 8) ** 2);
  levels.push({ level, requiredExp, cumulativeExp, unlockKeys: level === 5 ? ["GUILD_CREATION"] : [] });
  cumulativeExp += requiredExp;
}
for (const [level, expected] of referenceCumulative) {
  assert.equal(levels[level - 1].cumulativeExp, expected, `Lv${level} cumulative EXP mismatch`);
}
assert.equal(levels.at(-1).requiredExp, 0);

const output = {
  version: "2026-08-22",
  status: "PRODUCTION_FROZEN",
  frozenThroughLevel: 100,
  maxUserLevel: 100,
  round50Contract: "floor((value + 24) / 50) * 50 (exact 25 tie rounds down)",
  levels,
  authorityGaps: [],
};
await writeFile("src/domain/gameplay/canonical/data/user_level_progression_20260822.json", `${JSON.stringify(output, null, 2)}\n`);
console.log("Generated canonical User Level Lv1-100 Machine Master");
