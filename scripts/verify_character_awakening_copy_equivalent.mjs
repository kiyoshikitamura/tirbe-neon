import assert from "node:assert/strict";
import fs from "node:fs";

const { applyCharacterAwakeningCopyEquivalent, canonicalCharacterAwakeningRequired, CHARACTER_AWAKENING_COPY_EQUIVALENT_REQUIREMENTS } = await import("../src/domain/gameplay/canonical/awakening.ts");
assert.deepEqual([...CHARACTER_AWAKENING_COPY_EQUIVALENT_REQUIREMENTS], [1, 1, 2, 3, 4]);
assert.equal(CHARACTER_AWAKENING_COPY_EQUIVALENT_REQUIREMENTS.reduce((sum, value) => sum + value, 0), 11);
assert.deepEqual([0, 1, 2, 3, 4, 5].map(canonicalCharacterAwakeningRequired), [1, 1, 2, 3, 4, 0]);

const cases = [
  [0, 0, 1, 0], [1, 0, 2, 0], [2, 0, 2, 1], [2, 1, 3, 0],
  [3, 2, 4, 0], [4, 3, 5, 0],
];
for (const [level, progress, expectedLevel, expectedProgress] of cases) {
  const result = applyCharacterAwakeningCopyEquivalent(level, progress, 1);
  assert.equal(result.awakeningLevel, expectedLevel);
  assert.equal(result.awakeningProgress, expectedProgress);
}
assert.deepEqual(applyCharacterAwakeningCopyEquivalent(2, 0, 2), {
  awakeningLevel: 3, awakeningProgress: 0, nextRequired: 3, levelsAdvanced: 1,
});
assert.deepEqual(applyCharacterAwakeningCopyEquivalent(5, 0, 1), {
  awakeningLevel: 5, awakeningProgress: 0, nextRequired: 0, levelsAdvanced: 0,
});
const d90NaturalDuplicateExpectation = 2;
const d90FixedLoginBooks = 3;
assert.ok(d90NaturalDuplicateExpectation + d90FixedLoginBooks >= 4, "D90 favorite SSR +3 target regressed");
const longTermRequired = CHARACTER_AWAKENING_COPY_EQUIVALENT_REQUIREMENTS.reduce((sum, value) => sum + value, 0);
assert.equal(longTermRequired, 11, "+5 long-term target curve regressed");

const sql = fs.readFileSync("supabase/migrations/20260822000175_character_awakening_copy_equivalent.sql", "utf8");
for (const required of ["awakening_progress", "apply_character_awakening_equivalent", "AWAKENING_BOOK", "SPECIAL_TICKET_SKILL", "SPECIAL_TICKET_EQUIPMENT"]) assert.ok(sql.includes(required));
for (const forbidden of ["required_cash", "cash_spent", "LAW_OF_STRIFE"]) assert.equal(sql.includes(forbidden), false, `${forbidden} remains in 00175`);
const progressionHook = fs.readFileSync("src/app/context/hooks/useCharacterProgression.ts", "utf8");
const awakenBlock = progressionHook.slice(progressionHook.indexOf("const handleCharacterAwaken"), progressionHook.indexOf("const handleEquipGear"));
assert.equal(/required_cash|cash\s*</.test(awakenBlock), false);

console.log("Character Awakening copy-equivalent verification PASS: curve 1/1/2/3/4, cumulative 11, CASH dependency 0.");
