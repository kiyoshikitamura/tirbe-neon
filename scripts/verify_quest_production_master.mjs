import assert from "node:assert/strict";
import fs from "node:fs";

const master = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/quests_20260822.json", "utf8"));
const encounterMaster = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/quest_encounters_20260822.json", "utf8"));
const characters = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/characters_20260821.json", "utf8")).characters;
const items = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/items_20260822.json", "utf8"));
const canonicalItemIds = new Set(items.items.map((item) => item.id));

assert.equal(master.towns.length, 7, "Quest town count");
assert.equal(master.quests.length, 21, "Quest count");
assert.equal(new Set(master.quests.map((quest) => quest.questId)).size, 21, "Quest IDs unique");
for (const town of master.towns) {
  const townQuests = master.quests.filter((quest) => quest.townId === town.townId);
  assert.deepEqual(townQuests.map((quest) => quest.difficulty), ["EASY", "NORMAL", "HARD"], `${town.townId} difficulties`);
}

const expectedContracts = {
  EASY: [60, 5, 100, 300, 100],
  NORMAL: [180, 10, 180, 700, 120],
  HARD: [300, 15, 300, 1300, 200],
};
for (const [difficulty, expected] of Object.entries(expectedContracts)) {
  const contract = master.difficultyContracts[difficulty];
  assert.deepEqual(
    [contract.durationSec, contract.vitalityCost, contract.userExp, contract.cashReward, contract.firstClearUserExp],
    expected,
    `${difficulty} contract`,
  );
}

const poolMap = new Map(master.rewardPools.map((pool) => [pool.rewardPoolId, pool.items]));
for (const pool of master.rewardPools) {
  for (const item of pool.items) {
    assert(canonicalItemIds.has(item.itemId), `Unknown item ${item.itemId}`);
    assert(Number.isInteger(item.quantity) && item.quantity > 0, `${pool.rewardPoolId} quantity`);
    assert(Number.isInteger(item.probabilityBp) && item.probabilityBp >= 0 && item.probabilityBp <= 10000, `${pool.rewardPoolId} probability`);
  }
}

const itemExp = new Map(items.items.map((item) => [item.id, Number(item.runtimeUsage?.effectValue ?? 0)]));
function expectedExp(poolId, prefix) {
  return poolMap.get(poolId)
    .filter((item) => item.itemId.startsWith(prefix))
    .reduce((sum, item) => sum + itemExp.get(item.itemId) * item.quantity * item.probabilityBp / 10000, 0);
}
assert.deepEqual(
  [expectedExp("QUEST_EASY", "CHAR_EXP_"), expectedExp("QUEST_NORMAL", "CHAR_EXP_"), expectedExp("QUEST_HARD", "CHAR_EXP_")],
  [590, 1200, 3000],
  "Character EXP expected values",
);
assert.deepEqual(
  [expectedExp("QUEST_EASY", "EQUIP_EXP_"), expectedExp("QUEST_NORMAL", "EQUIP_EXP_"), expectedExp("QUEST_HARD", "EQUIP_EXP_")],
  [720, 1900, 3750],
  "Equipment EXP expected values",
);

const rare = (poolId, itemId) => poolMap.get(poolId).find((item) => item.itemId === itemId)?.probabilityBp ?? 0;
assert.deepEqual([rare("QUEST_EASY", "SKILL_MANUAL"), rare("QUEST_NORMAL", "SKILL_MANUAL"), rare("QUEST_HARD", "SKILL_MANUAL")], [0, 100, 300]);
assert.deepEqual([rare("QUEST_EASY", "EQUIP_LB_PART"), rare("QUEST_NORMAL", "EQUIP_LB_PART"), rare("QUEST_HARD", "EQUIP_LB_PART")], [0, 200, 500]);
assert.equal(master.rewardPools.flatMap((pool) => pool.items).filter((item) => item.itemId === "AWAKENING_BOOK").length, 0);

assert.deepEqual(master.unresolvedContracts, []);
assert.equal(master.quests.filter((quest) => !quest.isProductionEnabled || quest.unlockCondition !== "NONE" || !quest.enemyEncounterId).length, 0);
assert.equal(encounterMaster.encounters.length, 21);
const characterIds = new Set(characters.map((character) => character.character_id));
const hometownById = new Map(characters.map((character) => [character.character_id, character.hometown]));
const townNameById = new Map(master.towns.map((town) => [town.townId, town.name]));
for (const encounter of encounterMaster.encounters) {
  assert.equal(encounter.members.length, 5, `${encounter.encounterId} member count`);
  assert.equal(encounter.normalAttackPowerBp, 8000);
  assert.equal(encounter.isProductionEnabled, true);
  assert.equal(new Set(encounter.members.map((member) => member.characterId)).size, 5);
  for (const member of encounter.members) {
    assert(characterIds.has(member.characterId), `${encounter.encounterId} Character ref`);
    assert.equal(hometownById.get(member.characterId), townNameById.get(encounter.townId), `${member.characterId} hometown`);
    assert.equal(member.level, { EASY: 5, NORMAL: 10, HARD: 15 }[encounter.difficulty]);
    assert.equal(member.awakening, 0);
    assert.deepEqual(member.skillLoadout, []);
    assert.deepEqual(member.equipmentLoadout, []);
  }
}
console.log("Quest Production Machine Master verification passed: 21 Quests, 21 Canonical encounters, Authority Gap 0.")
