"use client";

export const RAID_BOSS_ID = "88888888-8888-8888-8888-888888888888";
export const TEST_SKILL_ID = "55555555-5555-5555-5555-555555555555";

const canonicalNormalAttack = (id: string) => ({
  id,
  name: "通常攻撃",
  power: 80,
  effect_type: "ATTACK",
  activationType: "ACTIVE",
  cooldown: 0,
  availableFromRound: 1,
  target: "ENEMY_SINGLE",
  effects: ["DAMAGE 80% ATK"],
});

/** Compatibility NPC roster. Its only gameplay action follows the canonical normal-attack contract. */
export const ENEMIES_MASTER = [
  ...["リュウ", "カイ", "シン", "ハヤト", "ユキ"].map((name, index) => ({
    id: `pvp_dummy_${index}`, name, level: 70, hp: 1200, atk: 90, def: 80,
    spd: 95 + index * 2, luk: 10, skills: [canonicalNormalAttack(`pvp_basic_${index}`)], enemy_type: "PVP_DUMMY",
  })),
  ...["レイジ", "ルイ", "チャン", "ユウキ", "レオン"].map((name, index) => ({
    id: `gvg_defense_${index}`, name, level: 70, hp: 1400, atk: 90, def: 80,
    spd: 95 + index * 2, luk: 10, skills: [canonicalNormalAttack(`gvg_basic_${index}`)], enemy_type: "GVG_NPC_DEFENSE",
  })),
];
