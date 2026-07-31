"use client";

import { ParticipantState } from "./battleTypes";

/**
 * 作戦AIに基づき、手番キャラクターのスキルおよびターゲットを選択
 * (Rule 1: 得意スキル(ownerId === actor.characterId)は消費APが-1軽減、最低消費APは1)
 */
export function selectCharacterSkillByTactic(
  actor: ParticipantState,
  ap: number,
  tactic: "OFFENSIVE" | "DEFENSIVE" | "HEALING" | "BALANCED" | "AP_CONSERVING" | "TACTICAL",
  playerPartyStates: ParticipantState[],
  enemyPartyStates: ParticipantState[]
): { chosenSkill: any; target: ParticipantState; actualCost: number } | null {
  const basicAttack = { id: "basic_attack", name: "通常攻撃", ap_cost: 0, power: 30, effect_type: "ATTACK", ownerId: "BASIC" };
  const basicDefense = { id: "basic_defense", name: "通常防御", ap_cost: 0, power: 25, effect_type: "DEFENSE", ownerId: "BASIC" };

  const pool = [...(actor.skills || []), basicAttack, basicDefense];

  // 消費AP軽減（得意スキルボーナス）の適用
  const costEvaluatedPool = pool.map(s => {
    const isSynergy = s.ownerId === actor.characterId;
    const actualCost = isSynergy ? Math.max((s.ap_cost || 0) - 1, 1) : (s.ap_cost || 0);
    return { ...s, actualCost };
  });

  // 部隊AP以下のスキルを抽出
  const availableSkills = costEvaluatedPool.filter(s => s.actualCost <= ap);

  let chosenSkill: any = basicAttack;
  let target: ParticipantState | null = null;

  const aliveEnemies = enemyPartyStates.filter(e => !e.isDead);
  if (aliveEnemies.length === 0) return null;

  // 基本ターゲットはHP割合が最も低い敵
  const defaultEnemyTarget = aliveEnemies.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

  if (tactic === "OFFENSIVE") {
    const attackSkills = availableSkills.filter(s => s.effect_type === "ATTACK");
    if (attackSkills.length > 0) {
      chosenSkill = attackSkills.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
    }
    target = defaultEnemyTarget;
  } else if (tactic === "DEFENSIVE") {
    const defenseSkills = availableSkills.filter(s => s.effect_type === "DEFENSE" || s.effect_type === "SUPPORT");
    if (defenseSkills.length > 0) {
      chosenSkill = defenseSkills.slice().sort((a, b) => (b.power || 0) - (a.power || 0))[0];
    } else {
      const attackSkills = availableSkills.filter(s => s.effect_type === "ATTACK");
      if (attackSkills.length > 0) chosenSkill = attackSkills[0];
    }
    target = actor;
  } else if (tactic === "HEALING") {
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
  } else if (tactic === "AP_CONSERVING") {
    // 0 AP スキル優先
    const freeSkills = availableSkills.filter(s => s.actualCost === 0);
    if (freeSkills.length > 0) {
      chosenSkill = freeSkills[0];
    } else {
      const lowCostSkills = availableSkills.slice().sort((a, b) => a.actualCost - b.actualCost);
      if (lowCostSkills.length > 0) chosenSkill = lowCostSkills[0];
    }
    target = defaultEnemyTarget;
  } else {
    // BALANCED / TACTICAL
    if (availableSkills.length > 0) {
      const randIdx = Math.floor(Math.random() * availableSkills.length);
      chosenSkill = availableSkills[randIdx];
    }
    target = defaultEnemyTarget;
  }

  if (!target) target = defaultEnemyTarget;
  return { chosenSkill, target, actualCost: chosenSkill.actualCost || 0 };
}
