const { patrolSnapshotToParticipants, serverBattleEvents } = await import("../src/hooks/battle/patrolReplayAdapter.ts");

const participants = patrolSnapshotToParticipants([{
  id: "ally_char_reiji",
  name: "Reiji",
  team: "PLAYER",
  alignment: "ORDER",
  stats: { hp: 2100, atk: 240, def: 180, spd: 105, luk: 12 },
  equipment: [{ equipmentId: "WEAPON_001" }],
  equippedSkillRefs: [{ skillId: "SKILL_001", effectScale: 1.41 }],
  skills: [{ id: "basic_attack_owned_1", name: "Attack", kind: "ATTACK", target: "ENEMY_SINGLE", powerPercent: 100, cooldown: 0 }],
}], false);

if (participants.length !== 1
  || participants[0].characterId !== "char_reiji"
  || participants[0].maxHp !== 2100
  || participants[0].stats.atk !== 240
  || participants[0].skills[0].power !== 100) {
  throw new Error("Canonical patrol snapshot was not adapted to the existing battle presentation state");
}

const events = serverBattleEvents([
  { index: 0, round: 1, type: "ACTION", payload: { actorId: "ally_char_reiji", skillId: "basic_attack_owned_1" } },
  { index: 1, round: 1, type: "DAMAGE", payload: { actorId: "ally_char_reiji", targetId: "enemy_q1", amount: 123, remainingHp: 777 } },
  { index: 2, round: 1, type: "RESULT", payload: { winner: "PLAYER", rounds: 1 } },
]);

if (events.length !== 3
  || events[1].type !== "DAMAGE"
  || events[1].payload.remainingHp !== 777
  || events[2].payload.winner !== "PLAYER") {
  throw new Error("Server event sequence was not retained for authoritative playback");
}

console.log("Patrol replay adapter verification passed.");
