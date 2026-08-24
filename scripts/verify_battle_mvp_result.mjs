import assert from "node:assert/strict";
import { analyzeBattleResult, MVP_SCORE_MAX } from "../src/domain/presentation/battleResultScoring.ts";

const players = [
  { id: "p_damage", characterId: "char_go_01", name: "Damage", isEnemy: false },
  { id: "p_heal", characterId: "char_mio_01", name: "Heal", isEnemy: false },
  { id: "p_shield", characterId: "char_koharu_01", name: "Shield", isEnemy: false },
];
const enemies = [
  { id: "e_1", characterId: "enemy_1", name: "Enemy 1", isEnemy: true },
  { id: "e_2", characterId: "enemy_2", name: "Enemy 2", isEnemy: true },
];
const event = (type, payload) => ({ type, payload });

const highDamage = analyzeBattleResult([
  event("DAMAGE", { actorId: "p_damage", targetId: "e_1", hpDamage: 200 }),
  event("DAMAGE", { actorId: "p_heal", targetId: "e_1", hpDamage: 50 }),
], [...players, ...enemies]);
assert.equal(highDamage.mvp?.participant.id, "p_damage", "High Damage Character must be eligible for MVP");

const highKill = analyzeBattleResult([
  event("DAMAGE", { actorId: "p_damage", targetId: "e_1", hpDamage: 100 }),
  event("DAMAGE", { actorId: "p_heal", targetId: "e_1", hpDamage: 35 }),
  event("DEFEAT", { targetId: "e_1" }),
  event("DAMAGE", { actorId: "p_heal", targetId: "e_2", hpDamage: 35 }),
  event("DEFEAT", { targetId: "e_2" }),
], [...players, ...enemies]);
assert.equal(highKill.mvp?.participant.id, "p_heal", "High Kill Character must be able to win MVP");

const mixed = analyzeBattleResult([
  event("DAMAGE", { actorId: "p_damage", targetId: "e_1", hpDamage: 100 }),
  event("DAMAGE", { actorId: "p_heal", targetId: "e_1", hpDamage: 80 }),
  event("HEAL", { actorId: "p_heal", targetId: "p_damage", amount: 300 }),
  event("EFFECT", { actorId: "p_shield", targetId: "p_damage", kind: "SHIELD", amount: 500 }),
  event("DAMAGE", { actorId: "e_1", targetId: "p_damage", hpDamage: 20 }),
  event("DEFEAT", { targetId: "p_damage" }),
  event("DAMAGE", { actorId: "p_heal", targetId: "e_1", hpDamage: 20 }),
  event("DEFEAT", { targetId: "e_1" }),
], [...players, ...enemies]);
assert.equal(mixed.mvp?.participant.id, "p_heal", "Role-aware Heal contribution must be able to win MVP");
assert.equal(mixed.mvp?.raw.kills, 1);
assert.equal(mixed.player.kills, 1);
assert.equal(mixed.enemy.kills, 1);

const shieldMvp = analyzeBattleResult([
  event("DAMAGE", { actorId: "p_damage", targetId: "e_1", hpDamage: 100 }),
  event("DAMAGE", { actorId: "p_shield", targetId: "e_1", hpDamage: 90 }),
  event("EFFECT", { actorId: "p_shield", targetId: "p_shield", kind: "SHIELD", amount: 800 }),
  event("DAMAGE", { actorId: "p_shield", targetId: "e_1", hpDamage: 10 }),
  event("DEFEAT", { targetId: "e_1" }),
], [...players, ...enemies]);
assert.equal(shieldMvp.mvp?.participant.id, "p_shield", "Role-aware Shield contribution must be able to win MVP");

const tie = analyzeBattleResult([
  event("DAMAGE", { actorId: "p_damage", targetId: "e_1", hpDamage: 100 }),
  event("DAMAGE", { actorId: "p_heal", targetId: "e_2", hpDamage: 100 }),
], [...players, ...enemies]);
assert.equal(tie.mvp?.participant.id, "p_damage", "Same score/damage/kill must use Character ID ASC");

const zero = analyzeBattleResult([], [...players, ...enemies]);
assert.equal(zero.mvp?.score.total, 5, "Survival-only result must remain finite and capped");
for (const analysis of [highDamage, highKill, mixed, shieldMvp, tie, zero]) {
  for (const candidate of analysis.candidates) {
    assert.ok(Number.isInteger(candidate.score.total));
    assert.ok(candidate.score.damage >= 0 && candidate.score.damage <= MVP_SCORE_MAX.damage);
    assert.ok(candidate.score.kills >= 0 && candidate.score.kills <= MVP_SCORE_MAX.kills);
    assert.ok(candidate.score.heal >= 0 && candidate.score.heal <= MVP_SCORE_MAX.heal);
    assert.ok(candidate.score.shield >= 0 && candidate.score.shield <= MVP_SCORE_MAX.shield);
    assert.ok(candidate.score.survival >= 0 && candidate.score.survival <= MVP_SCORE_MAX.survival);
    assert.equal(candidate.score.total, candidate.score.damage + candidate.score.kills + candidate.score.heal + candidate.score.shield + candidate.score.survival);
    assert.ok(candidate.score.total >= 0 && candidate.score.total <= 100);
  }
}

assert.deepEqual(analyzeBattleResult(mixed.candidates.length ? [
  event("DAMAGE", { actorId: "p_damage", targetId: "e_1", hpDamage: 100 }),
] : [], [...players, ...enemies]), analyzeBattleResult(mixed.candidates.length ? [
  event("DAMAGE", { actorId: "p_damage", targetId: "e_1", hpDamage: 100 }),
] : [], [...players, ...enemies]), "Same Replay must produce the same MVP result");

console.log(JSON.stringify({ status: "PASS", formula: "team-category-maximum ratio", caps: MVP_SCORE_MAX, healerMvp: true, shieldMvp: true, deterministic: true }, null, 2));
