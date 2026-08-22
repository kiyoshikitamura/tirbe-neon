import assert from "node:assert/strict";
import fs from "node:fs";

const master = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/quests_20260822.json", "utf8"));
const pools = new Map(master.rewardPools.map((pool) => [pool.rewardPoolId, pool.items]));
const row = (poolId, itemId, quantity, probabilityBp) => {
  assert(pools.get(poolId)?.some((item) => item.itemId === itemId && item.quantity === quantity && item.probabilityBp === probabilityBp), `${poolId} ${itemId}`);
};

for (const expected of [
  ["QUEST_EASY", "CHAR_EXP_S", 5, 10000], ["QUEST_EASY", "CHAR_EXP_S", 3, 3000],
  ["QUEST_EASY", "EQUIP_EXP_S", 6, 10000], ["QUEST_EASY", "EQUIP_EXP_S", 4, 3000],
  ["QUEST_NORMAL", "CHAR_EXP_M", 2, 10000], ["QUEST_NORMAL", "CHAR_EXP_M", 1, 4000],
  ["QUEST_NORMAL", "EQUIP_EXP_M", 3, 10000], ["QUEST_NORMAL", "EQUIP_EXP_M", 2, 4000],
  ["QUEST_NORMAL", "SKILL_MANUAL", 1, 100], ["QUEST_NORMAL", "EQUIP_LB_PART", 1, 200],
  ["QUEST_HARD", "CHAR_EXP_L", 1, 10000], ["QUEST_HARD", "CHAR_EXP_L", 1, 5000],
  ["QUEST_HARD", "EQUIP_EXP_L", 1, 10000], ["QUEST_HARD", "EQUIP_EXP_L", 1, 5000],
  ["QUEST_HARD", "SKILL_MANUAL", 1, 300], ["QUEST_HARD", "EQUIP_LB_PART", 1, 500],
  ["QUEST_FIRST_EASY", "CHAR_EXP_M", 1, 10000], ["QUEST_FIRST_EASY", "EQUIP_EXP_M", 1, 10000],
  ["QUEST_FIRST_NORMAL", "CHAR_EXP_L", 1, 10000], ["QUEST_FIRST_NORMAL", "EQUIP_EXP_L", 1, 10000],
  ["QUEST_FIRST_HARD", "CHAR_EXP_L", 2, 10000], ["QUEST_FIRST_HARD", "EQUIP_EXP_L", 2, 10000],
  ["QUEST_FIRST_HARD", "EQUIP_LB_PART", 1, 10000],
]) row(...expected);
assert.equal(master.rewardPools.flatMap((pool) => pool.items).some((item) => item.itemId === "AWAKENING_BOOK"), false);
console.log("Quest reward pool verification passed: expected EXP, Rare Drop and First Clear contracts match.");
