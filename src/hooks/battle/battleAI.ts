"use client";

import { CompatibleBattleTacticId, ParticipantState } from "./battleTypes";

/**
 * 作戦AIに基づき、手番キャラクターのスキルおよびターゲットを選択
 * Canonical active skills are selected without the retired battle AP contract.
 */
export function selectCharacterSkillByTactic(
  actor: ParticipantState,
  tactic: CompatibleBattleTacticId,
  playerPartyStates: ParticipantState[],
  enemyPartyStates: ParticipantState[]
): { chosenSkill: any; target: ParticipantState; actualCost: 0 } | null {
  // 旧の実行器を段階移行する間だけの互換変換。AP温存・防御優先は確定仕様から除外済み。
  const legacyTactic = tactic === "ATTACK_PRIORITY" ? "OFFENSIVE"
    : tactic === "HEAL_PRIORITY" ? "HEALING"
    : tactic === "SKILL_PRIORITY" ? "SKILL_PRIORITY"
    : tactic === "WEAKNESS_FOCUS" ? "WEAKNESS_FOCUS"
    : tactic;
  const basicAttack = { id: "basic_attack", name: "通常攻撃", power: 80, effect_type: "ATTACK", ownerId: "BASIC", activationType: "ACTIVE", cooldown: 0, availableFromRound: 1, target: "ENEMY_SINGLE", effects: ["DAMAGE 80% ATK"] };
  // 確定仕様では戦闘内AP・通常防御・得意スキルAP軽減を使用しない。
  const availableSkills = [...(actor.skills || []), basicAttack];

  let chosenSkill: any = basicAttack;
  let target: ParticipantState | null = null;

  const aliveEnemies = enemyPartyStates.filter(e => !e.isDead);
  if (aliveEnemies.length === 0) return null;

  // 基本ターゲットはHP割合が最も低い敵
  const attributeAdvantage: Record<string, string> = { JUSTICE: "EVIL", EVIL: "ORDER", ORDER: "CHAOS", CHAOS: "JUSTICE" };
  const defaultEnemyTarget = aliveEnemies.slice().sort((a, b) => {
    if (legacyTactic === "WEAKNESS_FOCUS") {
      const aAdvantage = attributeAdvantage[actor.alignment || "ORDER"] === a.alignment ? 1 : 0;
      const bAdvantage = attributeAdvantage[actor.alignment || "ORDER"] === b.alignment ? 1 : 0;
      if (aAdvantage !== bAdvantage) return bAdvantage - aAdvantage;
    }
    return (a.hp / a.maxHp) - (b.hp / b.maxHp);
  })[0];

  if (legacyTactic === "SKILL_PRIORITY") {
    const skills = availableSkills.filter((skill) => skill.id !== basicAttack.id);
    if (skills.length > 0) chosenSkill = skills.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
    target = defaultEnemyTarget;
  } else if (legacyTactic === "OFFENSIVE" || legacyTactic === "WEAKNESS_FOCUS") {
    const attackSkills = availableSkills.filter(s => s.effect_type === "ATTACK");
    if (attackSkills.length > 0) {
      chosenSkill = attackSkills.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
    }
    target = defaultEnemyTarget;
  } else if (legacyTactic === "DEFENSIVE") {
    const defenseSkills = availableSkills.filter(s => s.effect_type === "DEFENSE" || s.effect_type === "SUPPORT");
    if (defenseSkills.length > 0) {
      chosenSkill = defenseSkills.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
    } else {
      const attackSkills = availableSkills.filter(s => s.effect_type === "ATTACK");
      if (attackSkills.length > 0) chosenSkill = attackSkills[0];
    }
    target = actor;
  } else if (legacyTactic === "HEALING") {
    const alivePlayers = playerPartyStates.filter(p => !p.isDead);
    const damagedPlayer = alivePlayers.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    const needsHeal = damagedPlayer && (damagedPlayer.hp / damagedPlayer.maxHp) < 0.7;

    if (needsHeal) {
      const healSkills = availableSkills.filter(s => s.effect_type === "HEAL" || s.effect_type === "SUPPORT");
      if (healSkills.length > 0) {
        chosenSkill = healSkills.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
        target = damagedPlayer;
      } else {
        const attackSkills = availableSkills.filter(s => s.effect_type === "ATTACK");
        if (attackSkills.length > 0) chosenSkill = attackSkills[0];
        target = defaultEnemyTarget;
      }
    } else {
      const attackSkills = availableSkills.filter(s => s.effect_type === "ATTACK");
      if (attackSkills.length > 0) chosenSkill = attackSkills[0];
      target = defaultEnemyTarget;
    }
  } else {
    // BALANCED / TACTICAL
    if (availableSkills.length > 0) {
      const randIdx = Math.floor(Math.random() * availableSkills.length);
      chosenSkill = availableSkills[randIdx];
    }
    target = defaultEnemyTarget;
  }

  if (!target) target = defaultEnemyTarget;
  return { chosenSkill, target, actualCost: 0 };
}
