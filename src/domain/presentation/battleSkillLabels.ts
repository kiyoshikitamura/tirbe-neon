import { CANONICAL_SKILLS } from "../gameplay/canonical/masters.ts";

const INTERNAL_ID = /^(?:SKILL(?:_CARD)?_|skill(?:_card)?_|player_|enemy_|participant_|user_)/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInternalBattleLabel(value: unknown): boolean {
  const label = typeof value === "string" ? value.trim() : "";
  return !label || INTERNAL_ID.test(label) || UUID.test(label);
}

export function safeBattleCharacterName(value: unknown): string {
  return isInternalBattleLabel(value) ? "キャラクター" : String(value).trim();
}

export function resolveBattleSkillLabel(
  skillIdValue: unknown,
  participantSkills: Array<Record<string, unknown>> = [],
): string {
  const skillId = typeof skillIdValue === "string" ? skillIdValue.trim() : "";
  if (!skillId || /^(?:BASIC|NORMAL)_ATTACK$/i.test(skillId)) return "通常攻撃";

  const canonical = CANONICAL_SKILLS.find((skill) => skill.skill_id === skillId);
  if (canonical?.name && !isInternalBattleLabel(canonical.name)) return canonical.name;

  const projected = participantSkills.find((skill) => [skill.id, skill.skill_card_id, skill.skill_id]
    .some((candidate) => String(candidate ?? "") === skillId));
  const projectedMasterId = String(projected?.skill_card_id ?? projected?.skill_id ?? projected?.id ?? "");
  const projectedCanonical = CANONICAL_SKILLS.find((skill) => skill.skill_id === projectedMasterId);
  if (projectedCanonical?.name && !isInternalBattleLabel(projectedCanonical.name)) return projectedCanonical.name;
  if (!isInternalBattleLabel(projected?.name)) return String(projected?.name).trim();

  return "スキル発動";
}
