import assert from "node:assert/strict";
import fs from "node:fs";

const questData = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/quests_20260822.json", "utf8"));
const encounterData = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/quest_encounters_20260822.json", "utf8"));
const quests = questData.quests ?? questData;
const encounters = encounterData.encounters ?? encounterData;
const quest = quests.find((entry) => entry.questId === "q_shinjuku_1");
const encounter = encounters.find((entry) => entry.questId === "q_shinjuku_1");

assert.ok(quest, "Canonical Shinjuku EASY Quest is required");
assert.equal(quest.difficulty, "EASY");
assert.equal(quest.vitalityCost, 5);
assert.ok(encounter, "Canonical Shinjuku EASY encounter is required");
assert.equal(encounter.encounterId, "encounter_q_shinjuku_1");
assert.equal(encounter.enemyTactic, "BALANCED");
assert.equal(encounter.members.length, 3);
assert.deepEqual(encounter.members.map((member) => ({ characterId: member.characterId, level: member.level, awakening: member.awakening, skillLoadout: member.skillLoadout })), [
  { characterId: "char_tomoya_01", level: 5, awakening: 0, skillLoadout: ["SKILL_001"] },
  { characterId: "char_jihoon_01", level: 5, awakening: 0, skillLoadout: ["SKILL_004"] },
  { characterId: "char_shin_01", level: 5, awakening: 0, skillLoadout: ["SKILL_002", "SKILL_003"] },
]);
const activeReplayMigration = fs.readFileSync("supabase/migrations/20260822000185_quest_gameplay_v2.sql", "utf8");
assert.match(activeReplayMigration, /canonical_quest_enemy_snapshot\(coalesce\(v_patrol\.course_id,v_patrol\.quest_id\)\)/, "Tutorial/Quest replay must use the Canonical encounter snapshot");
assert.doesNotMatch(activeReplayMigration, /歌舞伎町のならず者|npc_basic_attack/, "Active Quest v2 replay must not use placeholder enemies");

console.log("Tutorial Encounter parity: PASS (q_shinjuku_1, 3 Canonical enemies, Vitality 5)");
