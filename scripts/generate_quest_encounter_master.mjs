import fs from "node:fs";

const questPath = "src/domain/gameplay/canonical/data/quests_20260822.json";
const characterPath = "src/domain/gameplay/canonical/data/characters_20260821.json";
const encounterPath = "src/domain/gameplay/canonical/data/quest_encounters_20260822.json";
const quests = JSON.parse(fs.readFileSync(questPath, "utf8"));
const characters = JSON.parse(fs.readFileSync(characterPath, "utf8")).characters;
const levelByDifficulty = { EASY: 5, NORMAL: 10, HARD: 15 };

const hometownToTownId = new Map(quests.towns.map((town) => [town.name, town.townId]));
const membersByTown = new Map();
for (const [hometown, townId] of hometownToTownId) {
  const matching = characters
    .filter((character) => character.hometown === hometown)
    .sort((left, right) => left.character_id.localeCompare(right.character_id, "en"));
  if (matching.length < 5) throw new Error(`${townId} has fewer than five Canonical Characters`);
  membersByTown.set(townId, matching.slice(0, 5).map((character) => character.character_id));
}

const encounters = quests.quests.map((quest) => ({
  encounterId: `encounter_${quest.questId}`,
  questId: quest.questId,
  townId: quest.townId,
  difficulty: quest.difficulty,
  members: membersByTown.get(quest.townId).map((characterId, index) => ({
    slot: index + 1,
    characterId,
    level: levelByDifficulty[quest.difficulty],
    awakening: 0,
    skillLoadout: [],
    equipmentLoadout: [],
  })),
  normalAttackPowerBp: 8000,
  tuningStatus: "P0_TUNABLE",
  isProductionEnabled: true,
}));

quests.quests = quests.quests.map((quest) => ({
  ...quest,
  durationSec: quests.difficultyContracts[quest.difficulty].durationSec,
  vitalityCost: quests.difficultyContracts[quest.difficulty].vitalityCost,
  userExp: quests.difficultyContracts[quest.difficulty].userExp,
  cashReward: quests.difficultyContracts[quest.difficulty].cashReward,
  firstClearUserExp: quests.difficultyContracts[quest.difficulty].firstClearUserExp,
  firstClearRewards: quests.rewardPools.find((pool) => pool.rewardPoolId === quests.difficultyContracts[quest.difficulty].firstClearRewardPoolId).items,
  rewardPoolId: quests.difficultyContracts[quest.difficulty].rewardPoolId,
  enemyEncounterId: `encounter_${quest.questId}`,
  unlockCondition: "NONE",
  isProductionEnabled: true,
}));
quests.unresolvedContracts = [];

fs.writeFileSync(questPath, `${JSON.stringify(quests, null, 2)}\n`);
fs.writeFileSync(encounterPath, `${JSON.stringify({
  version: "2026-08-22",
  authority: "Phase B3 Final Authority Resolution",
  selectionContract: "hometown match, Canonical Character ID stable ascending, first five",
  difficultyLevels: levelByDifficulty,
  awakening: 0,
  equipment: "NONE",
  skillLoadout: "NORMAL_ATTACK_ONLY",
  normalAttackPowerBp: 8000,
  encounters,
}, null, 2)}\n`);
console.log(`Generated ${encounters.length} Canonical Quest encounters.`);
