import fs from "node:fs";
import characterSource from "../src/domain/gameplay/canonical/data/characters_20260821.json" with { type: "json" };
import raidSource from "../src/domain/gameplay/canonical/data/raid_production_20260822.json" with { type: "json" };
import { canonicalCharacterStats } from "../src/domain/gameplay/canonical/calculations.ts";
import { resolveCanonicalBattle } from "../src/domain/battle/canonical_runtime.ts";

const level = raidSource.referenceLevel;
const stats = characterSource.characters.map((entry) => canonicalCharacterStats(
  { hp: entry.lv1_hp, atk: entry.lv1_atk, def: entry.lv1_def, spd: entry.lv1_spd, luk: entry.lv1_luk },
  { hp: entry.lv100_hp, atk: entry.lv100_atk, def: entry.lv100_def, spd: entry.lv100_spd, luk: entry.lv100_luk },
  level, 0,
));
const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  return Math.floor((ordered[ordered.length / 2 - 1] + ordered[ordered.length / 2]) / 2);
};
const populationMedian = Object.fromEntries(["hp", "atk", "def", "spd", "luk"].map((key) => [key, median(stats.map((value) => value[key]))]));
const referenceCharacters = [0, 12, 24, 36, 48].map((index) => characterSource.characters[index]);
const normalAttack = { id: "BASIC_ATTACK", name: "通常攻撃", target: "ENEMY_SINGLE", cooldown: 0, availableFromRound: 1, effects: ["DAMAGE 80% ATK"] };
const players = referenceCharacters.map((entry, index) => ({
  id: `reference_${index + 1}`, characterId: entry.character_id, name: entry.name, team: "PLAYER", alignment: entry.attribute,
  stats: canonicalCharacterStats(
    { hp: entry.lv1_hp, atk: entry.lv1_atk, def: entry.lv1_def, spd: entry.lv1_spd, luk: entry.lv1_luk },
    { hp: entry.lv100_hp, atk: entry.lv100_atk, def: entry.lv100_def, spd: entry.lv100_spd, luk: entry.lv100_luk },
    level, 0,
  ),
  skills: [normalAttack],
}));
const profileSkills = {
  HIGH_ATK: [{ id: "RAID_SKILL_HIGH_ATK", name: "強襲", activationType: "ACTIVE", target: "ENEMY_SINGLE", cooldown: 3, availableFromRound: 1, effects: ["DAMAGE 180% ATK"] }],
  HIGH_DEF: [{ id: "RAID_SKILL_HIGH_DEF", name: "鉄壁", activationType: "ACTIVE", target: "SELF", cooldown: 3, availableFromRound: 1, effects: ["DEF +30% / 2T"] }],
  HIGH_SPD: [{ id: "RAID_SKILL_HIGH_SPD", name: "迅撃", activationType: "ACTIVE", target: "ENEMY_SINGLE", cooldown: 3, availableFromRound: 1, effects: ["DAMAGE 145% ATK"] }],
  DEBUFF: [{ id: "RAID_SKILL_DEBUFF", name: "威圧", activationType: "ACTIVE", target: "ENEMY_ALL", cooldown: 4, availableFromRound: 2, effects: ["DAMAGE 110% ATK", "ATK -20% / 2T"] }],
  AOE: [{ id: "RAID_SKILL_AOE", name: "一斉制圧", activationType: "ACTIVE", target: "ENEMY_ALL", cooldown: 4, availableFromRound: 2, effects: ["DAMAGE 135% ATK"] }],
};
const displayNames = { shinjuku: "新宿・剛腕頭領", shibuya: "渋谷・鉄壁頭領", ikebukuro: "池袋・疾風頭領", roppongi: "六本木・幻惑頭領", akihabara: "秋葉原・殲滅頭領" };
const applyBp = (value, bp) => Math.floor(value * bp / 10000);
const bosses = raidSource.raidTowns.map((town, townIndex) => {
  const multipliers = raidSource.profileMultipliersBp[town.profile];
  const bossStats = Object.fromEntries(Object.entries(populationMedian).map(([key, value]) => [key, applyBp(value, multipliers[key])]));
  const enemy = [{ id: `boss_${town.townId}`, name: displayNames[town.townId], team: "ENEMY", alignment: ["EVIL", "ORDER", "CHAOS", "JUSTICE", "EVIL"][townIndex], stats: { ...bossStats, hp: 2_000_000_000 }, skills: [normalAttack, ...profileSkills[town.profile]] }];
  const damages = Array.from({ length: 20 }, (_, index) => resolveCanonicalBattle({ seed: 20260822 + townIndex * 100 + index, tactic: "BALANCED", maxRounds: 30, player: players, enemy }).playerRawDamage);
  const averageBattleDamage = Math.round(damages.reduce((total, value) => total + value, 0) / damages.length);
  const maxHp = Math.max(100_000, Math.round(averageBattleDamage * raidSource.bossHpBattleMultiplier / 100_000) * 100_000);
  return {
    bossId: `RAID_BOSS_${String(townIndex + 1).padStart(3, "0")}`, townId: town.townId, displayName: displayNames[town.townId], profileType: town.profile,
    attribute: enemy[0].alignment, referenceLevel: level, maxHp, atk: bossStats.atk, def: bossStats.def, spd: bossStats.spd, luk: bossStats.luk,
    skillLoadout: [normalAttack, ...profileSkills[town.profile]], averageReferenceBattleDamage: averageBattleDamage,
    referenceSeeds: 20, targetFinalizedBattles: raidSource.bossHpBattleMultiplier, tuningStatus: raidSource.tuningStatus, isProductionEnabled: true,
  };
});
const output = { version: "2026-08-22", status: "PRODUCTION_FROZEN", derivation: { referenceLevel: level, awakening: 0, equipment: "NONE", populationMedian, referenceCharacterIds: referenceCharacters.map((entry) => entry.character_id), simulationSeeds: 20, targetFinalizedBattles: 40, roundingUnit: 100000 }, bosses };
fs.writeFileSync("src/domain/gameplay/canonical/data/raid_bosses_20260822.json", `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.derivation));
for (const boss of bosses) console.log(`${boss.bossId} ${boss.profileType}: avg=${boss.averageReferenceBattleDamage} hp=${boss.maxHp}`);
