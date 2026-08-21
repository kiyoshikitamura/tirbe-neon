import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260821000168_gameplay_foundation_canonical.sql"), "utf8");
const bigintRepair = readFileSync(resolve(root, "supabase/migrations/20260821000169_canonical_character_stats_bigint.sql"), "utf8");
const equipmentProgression = readFileSync(resolve(root, "supabase/migrations/20260821000172_equipment_level_curve_final.sql"), "utf8");
const data = (file) => JSON.parse(readFileSync(resolve(root, "src/domain/gameplay/canonical/data", file), "utf8"));
const characters = data("characters_20260821.json").characters;
const skills = data("skills_20260821.json").skills;
const equipments = data("equipment_20260821.json").equipments;
const equipmentLb = data("equipment_limit_break_20260821.json");

assert.equal(characters.length, 60); assert.equal(skills.length, 70); assert.equal(equipments.length, 170);
for (const marker of [
  "canonical_character_master", "canonical_skill_master", "canonical_equipment_master",
  "canonical_equipment_lb_steps", "canonical_equipment_lb_slot_options",
  "canonical_character_stats", "canonical_skill_slot_count", "canonical_equipment_lb_multiplier",
  "build_server_battle_snapshot", "calculate_user_character_power",
]) assert.ok(migration.includes(marker), `Missing ${marker}`);
assert.ok(!migration.includes("plus_val * 0.10"));
assert.ok(!migration.includes("rarity_multiplier"));
assert.ok(!migration.includes("character_growth_patterns"));
assert.ok(!/random_options\s*(->|\+|@>|#>)/.test(migration));
assert.ok(!/ap_max|ap_cost/.test(migration));
assert.ok(migration.includes("floor(lv1_hp + (lv100_hp-lv1_hp)*(level-1)/99.0)::integer"));
assert.ok(migration.includes("(array[10000,10800,11500,13200,15000,17500])"));
assert.ok(migration.includes("(array[3,4,5,5,5,6])"));
assert.ok(migration.includes('"rate":0.55'));
assert.ok(migration.includes("'exclusiveCharacterId',master.exclusive_character_id"));
assert.equal(equipmentLb.cost_curve.reduce((total, cost) => total + cost, 0), 25);
const lbStepsMatch = migration.match(/\$lb_steps\$(.*?)\$lb_steps\$/s);
assert.ok(lbStepsMatch, "Generated migration must embed canonical LB step rows");
const lbSteps = JSON.parse(lbStepsMatch[1]);
assert.deepEqual(lbSteps.map((step) => step.plus_val), [0,1,2,3,4,5,6,7,8,9,10]);
assert.deepEqual(lbSteps.map((step) => step.equivalent_cost), [0,1,1,2,2,2,3,3,3,4,4]);
assert.ok(lbSteps.every((step) => step.equivalent_cost != null));
assert.equal(lbSteps.reduce((total, step) => total + step.equivalent_cost, 0), 25);
assert.equal(lbSteps.find((step) => step.plus_val === 10)?.flat_stat_multiplier, 1.4);
assert.equal(skills.find((skill) => skill.skill_id === "SKILL_051")?.effects.includes("IGNORE_DEF 55%"), true);
assert.ok(bigintRepair.includes("lv100_hp::bigint - lv1_hp::bigint"));
assert.ok(bigintRepair.includes("character_level - 1"));
assert.ok(bigintRepair.includes("::bigint[]"));
assert.ok(!bigintRepair.includes("growth_pattern"));
assert.ok(!bigintRepair.includes("rarity_multiplier"));
for (const marker of [
  "equipment_level_battle_scale", "canonical_equipment_level_cap", "canonical_equipment_flat_stat",
  "level_up_equipment", "build_server_battle_snapshot", "calculate_user_character_power",
]) assert.ok(equipmentProgression.includes(marker), `00172 missing ${marker}`);
assert.ok(equipmentProgression.includes("(p_level + 97)::numeric / 196"));
assert.ok(equipmentProgression.includes("(p_level + 100)::numeric / 200"));
assert.ok(equipmentProgression.includes("when 0 then 50 when 1 then 60 when 2 then 70 when 3 then 80 when 4 then 90 else 100"));
assert.ok(!equipmentProgression.includes("plus_val * 0.10"));
assert.ok(!equipmentProgression.includes("random_options"));
assert.ok(!/ap_max|ap_cost/.test(equipmentProgression));
console.log("Canonical gameplay DB migration static validation passed.");
