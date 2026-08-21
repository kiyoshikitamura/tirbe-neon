import { CANONICAL_SKILLS } from "@/domain/gameplay/canonical/masters";
import type { BattleTactic, BattleUnitInput } from "@/lib/battle/deterministicBattle";
import type { CompatibleBattleTacticId, ParticipantState } from "./battleTypes";

export function toDeterministicTactic(tactic: CompatibleBattleTacticId): BattleTactic {
  if (tactic === "ATTACK_PRIORITY" || tactic === "HEAL_PRIORITY" || tactic === "SKILL_PRIORITY" || tactic === "WEAKNESS_FOCUS") return tactic;
  return "BALANCED";
}

const alignment = (value?: string): BattleUnitInput["alignment"] => value === "JUSTICE" || value === "EVIL" || value === "ORDER" || value === "CHAOS" ? value : "ORDER";

export function participantsToBattleUnits(participants: ParticipantState[]): BattleUnitInput[] {
  return participants.map((participant) => ({
    id: participant.id,
    characterId: participant.characterId,
    name: participant.name,
    team: participant.isEnemy ? "ENEMY" : "PLAYER",
    alignment: alignment(participant.alignment),
    stats: { hp: Math.max(1, participant.maxHp), atk: Math.max(0, participant.stats.atk), def: Math.max(0, participant.stats.def), spd: Math.max(0, participant.stats.spd), luk: Math.max(0, participant.stats.luk) },
    skills: participant.skills.flatMap((rawSkill) => {
      const record = typeof rawSkill === "object" && rawSkill !== null ? rawSkill as Record<string, unknown> : {};
      const skillId = String(record.skill_card_id ?? record.skillId ?? record.id ?? "");
      const master = CANONICAL_SKILLS.find((entry) => entry.skill_id === skillId);
      if (!master) return [];
      return [{
        id: master.skill_id, name: master.name, activationType: master.activation_type as "ACTIVE" | "BATTLE_START" | "ON_DAMAGE_TAKEN",
        cooldown: master.cooldown, availableFromRound: master.available_from_round,
        target: master.target as "ENEMY_SINGLE" | "ENEMY_ALL" | "ALLY_SINGLE" | "ALLY_ALL" | "SELF" | "ATTACKER_WHO_DAMAGED_SELF", effects: master.effects,
        exclusiveCharacterId: master.exclusive_character_id,
        skillPlusVal: Math.max(0, Math.min(10, Math.trunc(Number(record.plus_val ?? record.plusValue ?? 0)))),
      }];
    }),
  }));
}
