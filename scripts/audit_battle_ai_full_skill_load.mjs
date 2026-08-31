import assert from "node:assert/strict";
import { parseCanonicalEffects } from "../src/domain/battle/canonical_effects.ts";
import { resolveBattleFullSkillLoadFixture } from "../src/domain/battle/fullSkillLoadFixture.ts";

const BEFORE_ATTACK_PRIORITY = {
  PLAYER: { totalActions: 75, normalAttacks: 0, attackSkills: 18, buffActions: 27, debuffActions: 19, healActions: 0, shieldDefenseActions: 24, damageProducingActions: 17, supportOnlyActions: 58, redundantSupportCast: 30 },
  ENEMY: { totalActions: 63, normalAttacks: 3, attackSkills: 3, buffActions: 21, debuffActions: 10, healActions: 0, shieldDefenseActions: 29, damageProducingActions: 6, supportOnlyActions: 57, redundantSupportCast: 23 },
  finalRound: 15, winner: "ENEMY", defeats: ["ソラ", "タイガ"],
};

const effectKey = (effect) => effect.type === "BUFF" || effect.type === "DEBUFF"
  ? `${effect.type}_${effect.stat}`
  : ["SHIELD", "REGEN", "POISON", "BLEED", "STUN", "BLIND", "SILENCE", "TAUNT"].includes(effect.type) ? effect.type : null;
const eventEffectKey = (event) => {
  const kind = String(event.payload.kind ?? event.payload.status ?? "").toUpperCase();
  return kind === "BUFF" || kind === "DEBUFF"
    ? `${kind}_${String(event.payload.stat ?? "").toUpperCase()}`
    : ["SHIELD", "REGEN", "POISON", "BLEED", "STUN", "BLIND", "SILENCE", "TAUNT"].includes(kind) ? kind : null;
};
const emptyMetrics = () => ({ totalActions: 0, normalAttacks: 0, attackSkills: 0, buffActions: 0, debuffActions: 0, healActions: 0, shieldDefenseActions: 0, damageProducingActions: 0, supportOnlyActions: 0, redundantSupportCast: 0 });

function analyze(options) {
  const { fixture, replay } = resolveBattleFullSkillLoadFixture(options);
  const units = [...fixture.player, ...fixture.enemy];
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const skillById = new Map(units.flatMap((unit) => unit.skills.map((skill) => [skill.id, skill])));
  const hpByTarget = new Map(units.map((unit) => [unit.id, unit.stats.hp]));
  const activeEffectsByTarget = new Map(units.map((unit) => [unit.id, []]));
  const metrics = { PLAYER: emptyMetrics(), ENEMY: emptyMetrics() };
  const focus = {
    PLAYER: { singleTargetActions: 0, lowestEligible: 0, persistenceOpportunities: 0, persisted: 0, nearLethalSwitches: 0 },
    ENEMY: { singleTargetActions: 0, lowestEligible: 0, persistenceOpportunities: 0, persisted: 0, nearLethalSwitches: 0 },
  };
  const previousTarget = { PLAYER: null, ENEMY: null };
  const actionIndexes = replay.events.flatMap((event, index) => event.type === "ACTION" && event.round > 0 ? [index] : []);
  const resultIndex = replay.events.findIndex((event) => event.type === "RESULT");

  for (const [position, start] of actionIndexes.entries()) {
    const action = replay.events[start];
    const end = actionIndexes[position + 1] ?? resultIndex;
    const segment = replay.events.slice(start + 1, end < 0 ? replay.events.length : end);
    const actorId = String(action.payload.actorId ?? "");
    const team = unitById.get(actorId)?.team;
    if (!team) continue;
    const opponent = team === "PLAYER" ? "ENEMY" : "PLAYER";
    const beforeHp = new Map(hpByTarget);
    const beforeEffects = new Map([...activeEffectsByTarget].map(([id, effects]) => [id, structuredClone(effects)]));
    const skillId = String(action.payload.skillId ?? "BASIC_ATTACK");
    const skill = skillById.get(skillId);
    const effects = skill ? parseCanonicalEffects(skill.effects ?? []) : [];
    const types = new Set(effects.map((effect) => effect.type));
    const hasDamageSkill = skillId === "BASIC_ATTACK" || types.has("DAMAGE");
    const hasBuff = types.has("BUFF") || types.has("REGEN");
    const hasDebuff = [...types].some((type) => ["DEBUFF", "POISON", "BLEED", "STUN", "BLIND", "SILENCE", "TAUNT"].includes(type));
    const hasHeal = types.has("HEAL");
    const hasDefense = types.has("SHIELD") || types.has("COUNTER");
    const directDamage = segment.filter((event) => event.type === "DAMAGE" && event.payload.actorId === actorId && !event.payload.source && !event.payload.counter);
    const positiveDirectDamage = directDamage.filter((event) => Number(event.payload.amount ?? 0) > 0);
    const targetIds = [...new Set(directDamage.map((event) => String(event.payload.targetId ?? "")).filter(Boolean))];
    const value = metrics[team];
    value.totalActions += 1;
    if (skillId === "BASIC_ATTACK") value.normalAttacks += 1;
    else if (hasDamageSkill) value.attackSkills += 1;
    if (hasBuff) value.buffActions += 1;
    if (hasDebuff) value.debuffActions += 1;
    if (hasHeal) value.healActions += 1;
    if (hasDefense) value.shieldDefenseActions += 1;
    if (positiveDirectDamage.length) value.damageProducingActions += 1;
    if (!positiveDirectDamage.length && (hasBuff || hasDebuff || hasHeal || hasDefense)) value.supportOnlyActions += 1;

    let redundant = false;
    for (const effect of effects) {
      const key = effectKey(effect);
      if (!key) continue;
      const appliedTargets = [...new Set(segment.filter((event) => eventEffectKey(event) === key).map((event) => String(event.payload.targetId ?? "")).filter(Boolean))];
      if (appliedTargets.some((targetId) => (beforeEffects.get(targetId) ?? []).some((entry) => entry.id === key && Number(entry.remainingDuration ?? 0) > 1))) redundant = true;
    }
    if (hasHeal) {
      const heals = segment.filter((event) => event.type === "HEAL");
      if (heals.length && heals.every((event) => Number(event.payload.effectiveAmount ?? event.payload.amount ?? 0) <= 0)) redundant = true;
    }
    if (redundant && !positiveDirectDamage.length) value.redundantSupportCast += 1;

    if (targetIds.length === 1) {
      const selected = targetIds[0];
      const aliveOpponents = units.filter((unit) => unit.team === opponent && Number(beforeHp.get(unit.id) ?? 0) > 0);
      const taunts = aliveOpponents.filter((unit) => (beforeEffects.get(unit.id) ?? []).some((entry) => entry.id === "TAUNT"));
      const eligible = taunts.length ? taunts : aliveOpponents;
      const lowest = eligible.slice().sort((a, b) => Number(beforeHp.get(a.id)) / a.stats.hp - Number(beforeHp.get(b.id)) / b.stats.hp || a.id.localeCompare(b.id))[0];
      const focusValue = focus[team];
      focusValue.singleTargetActions += 1;
      if (selected === lowest?.id) focusValue.lowestEligible += 1;
      const previous = previousTarget[team];
      if (previous && Number(beforeHp.get(previous.id) ?? 0) > 0 && previous.id === lowest?.id) {
        focusValue.persistenceOpportunities += 1;
        if (selected === previous.id) focusValue.persisted += 1;
        if (previous.remainingHpRatio <= .1 && selected !== previous.id) focusValue.nearLethalSwitches += 1;
      }
      previousTarget[team] = { id: selected, remainingHpRatio: 0 };
    }

    for (const event of segment) {
      const targetId = String(event.payload.targetId ?? "");
      if (targetId && Array.isArray(event.payload.activeEffectsAfter)) activeEffectsByTarget.set(targetId, event.payload.activeEffectsAfter);
      if (targetId && (event.type === "DAMAGE" || event.type === "HEAL")) hpByTarget.set(targetId, Number(event.payload.remainingHp ?? event.payload.hpAfter ?? hpByTarget.get(targetId) ?? 0));
      if (targetId && event.type === "DEFEAT") hpByTarget.set(targetId, 0);
    }
    if (targetIds.length === 1 && previousTarget[team]?.id === targetIds[0]) {
      const target = unitById.get(targetIds[0]);
      previousTarget[team].remainingHpRatio = target ? Number(hpByTarget.get(target.id) ?? 0) / target.stats.hp : 0;
    }
  }

  for (const team of ["PLAYER", "ENEMY"]) {
    const value = metrics[team];
    value.damageProducingRate = value.damageProducingActions / Math.max(1, value.totalActions);
    value.supportOnlyRate = value.supportOnlyActions / Math.max(1, value.totalActions);
    value.redundantSupportRate = value.redundantSupportCast / Math.max(1, value.totalActions);
    focus[team].lowestEligibleRate = focus[team].lowestEligible / Math.max(1, focus[team].singleTargetActions);
    focus[team].persistenceRate = focus[team].persisted / Math.max(1, focus[team].persistenceOpportunities);
  }
  const combined = {
    totalActions: metrics.PLAYER.totalActions + metrics.ENEMY.totalActions,
    damageProducingActions: metrics.PLAYER.damageProducingActions + metrics.ENEMY.damageProducingActions,
    supportOnlyActions: metrics.PLAYER.supportOnlyActions + metrics.ENEMY.supportOnlyActions,
    redundantSupportCast: metrics.PLAYER.redundantSupportCast + metrics.ENEMY.redundantSupportCast,
  };
  combined.damageProducingRate = combined.damageProducingActions / combined.totalActions;
  combined.supportOnlyRate = combined.supportOnlyActions / combined.totalActions;
  combined.redundantSupportRate = combined.redundantSupportCast / combined.totalActions;
  const result = replay.events.find((event) => event.type === "RESULT");
  const defeats = replay.events.filter((event) => event.type === "DEFEAT").map((event) => ({ eventIndex: event.index, round: event.round, target: unitById.get(String(event.payload.targetId))?.name ?? event.payload.targetId }));
  return {
    config: { seed: fixture.seed, playerTactic: fixture.tactic, enemyTactic: fixture.enemyTactic, maxRounds: fixture.maxRounds },
    metrics, combined, focus, defeats,
    result: { finalRound: replay.rounds, winner: replay.winner, explicitReason: result?.payload.reason ?? null, inferredReason: replay.rounds >= fixture.maxRounds ? "ROUND_LIMIT" : "DEFEAT" },
    finalHp: Object.fromEntries([...replay.player, ...replay.enemy].map((unit) => [unit.name, unit.hp])),
  };
}

const after = analyze({ maxRounds: 15, tactic: "ATTACK_PRIORITY", enemyTactic: "ATTACK_PRIORITY" });
const skillPriority = analyze({ maxRounds: 8, tactic: "SKILL_PRIORITY", enemyTactic: "SKILL_PRIORITY" });

assert.ok(after.combined.damageProducingRate >= skillPriority.combined.damageProducingRate, "ATTACK_PRIORITY must not be less offensive than SKILL_PRIORITY");
assert.ok(after.combined.supportOnlyActions < after.combined.damageProducingActions, "ATTACK_PRIORITY support loop must not dominate damage actions");
assert.ok(after.combined.redundantSupportRate < .1, "ATTACK_PRIORITY redundant Support must stay below 10%");
assert.ok(after.defeats.length > 0, "ATTACK_PRIORITY must show clear Defeat progression in the stress fixture");
for (const team of ["PLAYER", "ENEMY"]) {
  assert.equal(after.focus[team].lowestEligibleRate, 1, `${team} eligible lowest-HP targeting regressed`);
  assert.equal(after.focus[team].persistenceRate, 1, `${team} focus persistence regressed`);
  assert.equal(after.focus[team].nearLethalSwitches, 0, `${team} near-lethal focus regressed`);
}

console.log(JSON.stringify({ before: BEFORE_ATTACK_PRIORITY, after, skillPriorityComparison: skillPriority }, null, 2));
