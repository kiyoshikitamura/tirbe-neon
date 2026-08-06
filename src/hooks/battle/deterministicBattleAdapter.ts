import type { BattleTactic, BattleUnitInput } from "@/lib/battle/deterministicBattle";
import type { CompatibleBattleTacticId, ParticipantState } from "./battleTypes";

/**
 * 旧画面の表示用 ParticipantState と、新しい確定戦闘入力の境界。
 * 戦闘用 AP / 防御カードはここで意図的に捨てる。画面移行中も、
 * 決定論的解決器には確定仕様だけが渡るようにするための互換層である。
 */
export function toDeterministicTactic(
  tactic: CompatibleBattleTacticId,
): BattleTactic {
  switch (tactic) {
    case "ATTACK_PRIORITY":
    case "HEAL_PRIORITY":
    case "SKILL_PRIORITY":
    case "WEAKNESS_FOCUS":
      return tactic;
    case "OFFENSIVE":
      return "ATTACK_PRIORITY";
    case "HEALING":
      return "HEAL_PRIORITY";
    case "TACTICAL":
      return "WEAKNESS_FOCUS";
    // 旧「防御優先」「AP温存」は新仕様に存在しないため、バランスへ収束させる。
    case "DEFENSIVE":
    case "AP_CONSERVING":
    case "BALANCED":
    default:
      return "BALANCED";
  }
}

function normalizedAlignment(value: string | undefined): BattleUnitInput["alignment"] {
  return value === "JUSTICE" || value === "EVIL" || value === "ORDER" || value === "CHAOS" ? value : "ORDER";
}

function normalizedTarget(value: unknown): "ENEMY_SINGLE" | "ENEMY_ALL" | "ALLY_SINGLE" | "ALLY_ALL" {
  return value === "ENEMY_ALL" || value === "ALLY_SINGLE" || value === "ALLY_ALL" ? value : "ENEMY_SINGLE";
}

function skillKind(value: unknown): "ATTACK" | "HEAL" | "BUFF" | "DEBUFF" {
  if (value === "HEAL") return "HEAL";
  if (value === "BUFF" || value === "DEFENSE" || value === "SUPPORT") return "BUFF";
  if (value === "DEBUFF" || value === "JAMMER") return "DEBUFF";
  return "ATTACK";
}

function normalizedStatus(value: unknown): BattleUnitInput["skills"][number]["status"] {
  return value === "POISON" || value === "BLIND" || value === "SILENCE" || value === "STUN" ? value : undefined;
}

type LegacySkill = Record<string, unknown>;

function numberValue(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultCooldown(skill: LegacySkill): number {
  if (typeof skill.cooldown_turns === "number") return Math.max(0, skill.cooldown_turns);
  const power = numberValue(skill.power, 100);
  if (power >= 240 || skill.rarity === "SSR") return 4;
  if (power >= 180 || skill.rarity === "SR") return 3;
  return 2;
}

export function participantsToBattleUnits(participants: ParticipantState[]): BattleUnitInput[] {
  return participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    team: participant.isEnemy ? "ENEMY" : "PLAYER",
    alignment: normalizedAlignment(participant.alignment),
    stats: {
      hp: Math.max(1, participant.maxHp),
      atk: Math.max(0, participant.stats.atk),
      def: Math.max(0, participant.stats.def),
      spd: Math.max(0, participant.stats.spd),
      luk: Math.max(0, participant.stats.luk),
    },
    skills: participant.skills.map((rawSkill): BattleUnitInput["skills"][number] => {
      const skill: LegacySkill = typeof rawSkill === "object" && rawSkill !== null ? rawSkill as LegacySkill : {};
      return {
      id: String(skill.id ?? skill.skill_id ?? skill.name),
      name: String(skill.name ?? skill.id ?? "スキル"),
      kind: skillKind(skill.effect_type),
      target: normalizedTarget(skill.target_type),
      powerPercent: Math.max(1, numberValue(skill.power, 100)),
      cooldown: defaultCooldown(skill),
      initialCooldown: Math.max(0, numberValue(skill.initial_cooldown, 0)),
      status: normalizedStatus(skill.status_id),
      statusChance: typeof skill.status_chance === "number" ? skill.status_chance : undefined,
      };
    }),
  }));
}
