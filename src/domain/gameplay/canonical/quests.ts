import questData from "./data/quests_20260822.json" with { type: "json" };
import encounterData from "./data/quest_encounters_20260822.json" with { type: "json" };

export type CanonicalQuestDifficulty = "EASY" | "NORMAL" | "HARD";

type DifficultyContract = {
  durationSec: number;
  vitalityCost: number;
  userExp: number;
  cashReward: number;
  firstClearUserExp: number;
  rewardPoolId: string;
  firstClearRewardPoolId: string;
};

const difficultyContracts = questData.difficultyContracts as Record<CanonicalQuestDifficulty, DifficultyContract>;

export const CANONICAL_QUEST_TOWNS = questData.towns;
export const CANONICAL_QUEST_REWARD_POOLS = questData.rewardPools;
export const CANONICAL_QUEST_AUTHORITY_GAPS = questData.unresolvedContracts;
export const CANONICAL_QUEST_ENCOUNTERS = encounterData.encounters;

export const CANONICAL_QUESTS = questData.quests.map((quest) => {
  const contract = difficultyContracts[quest.difficulty as CanonicalQuestDifficulty];
  return {
    ...quest,
    difficulty: quest.difficulty as CanonicalQuestDifficulty,
    ...contract,
    enemyEncounterId: quest.enemyEncounterId,
    unlockCondition: quest.unlockCondition,
    isProductionEnabled: quest.isProductionEnabled,
  };
});

export function canonicalQuestById(questId: string) {
  return CANONICAL_QUESTS.find((quest) => quest.questId === questId);
}

export function canonicalQuestRewardPool(rewardPoolId: string) {
  return CANONICAL_QUEST_REWARD_POOLS.find((pool) => pool.rewardPoolId === rewardPoolId);
}

export function rollCanonicalQuestItems(rewardPoolId: string, roll: () => number = Math.random) {
  const pool = canonicalQuestRewardPool(rewardPoolId);
  if (!pool) throw new Error(`Unknown Canonical Quest reward pool: ${rewardPoolId}`);
  return pool.items
    .filter((item) => Math.floor(roll() * 10000) < item.probabilityBp)
    .map((item) => ({ item_id: item.itemId, quantity: item.quantity }));
}
