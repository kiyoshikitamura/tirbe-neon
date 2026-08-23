import assert from "node:assert/strict";
import fs from "node:fs";

const skills = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/skills_20260821.json", "utf8")).skills;
const starter = skills.find((skill) => skill.skill_id === "SKILL_001");
const characterUi = fs.readFileSync("src/app/components/CharacterTab.tsx", "utf8");

assert.ok(starter, "SKILL_001 is required");
assert.equal(starter.name, "ストリートパンチ");
assert.equal(starter.activation_type, "ACTIVE");
assert.equal(starter.target, "ENEMY_SINGLE");
assert.equal(starter.cooldown, 3);
assert.equal(starter.available_from_round, 1);
assert.deepEqual(starter.effects, ["DAMAGE 90% ATK"]);
assert.equal(starter.exclusive_character_id, null);
assert.ok(fs.existsSync("public/skills/skill_001_street_punch.png"), "Starter Skill icon is required");
for (const field of ["TYPE", "TARGET", "POWER", "COOLDOWN", "AVAILABLE", "tutorialSkillMaster.description"]) {
  assert.ok(characterUi.includes(field), `Tutorial Skill projection is missing ${field}`);
}
assert.match(characterUi, /CANONICAL_SKILL_VIEW\.find/, "Tutorial Skill must resolve the shared Canonical projection");

console.log("Tutorial Skill parity: PASS (SKILL_001 metadata, icon, slot-safe Canonical projection)");
