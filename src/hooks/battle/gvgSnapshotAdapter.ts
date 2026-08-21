import { CANONICAL_CHARACTERS, CANONICAL_SKILLS } from "@/domain/gameplay/canonical/masters";
import { canonicalSkillSlotCount } from "@/domain/gameplay/canonical/calculations";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import type { ParticipantState } from "./battleTypes";

type SnapshotRecord = Record<string, unknown>;
const records = (value: unknown): SnapshotRecord[] => Array.isArray(value) ? value.filter((entry): entry is SnapshotRecord => typeof entry === "object" && entry !== null && !Array.isArray(entry)) : [];
const number = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function gvgDefenseSnapshotToParticipants(defenseDeck: unknown): ParticipantState[] {
  return records(defenseDeck).map((character, index) => {
    const characterId = String(character.character_id ?? ""); const master = CANONICAL_CHARACTERS.find((entry) => entry.character_id === characterId);
    const characterRecord = { id: String(character.id ?? `gvg_snapshot_${index}`), character_id: characterId, level: number(character.level, 1), awakening_level: number(character.awakening_level, 0) };
    const equipments = records(character.equipments).map((equipment) => ({ ...equipment, equipment_id: String(equipment.equipment_id ?? ""), level: number(equipment.level, 1), plus_val: number(equipment.plus_val, 0), equipped_character_id: characterRecord.id }));
    const skills = records(character.skills).filter((entry) => number(entry.slot_index, 0) < canonicalSkillSlotCount(characterRecord.awakening_level)).flatMap((owned) => {
      const skillId = String(owned.skill_card_id ?? ""); const skill = CANONICAL_SKILLS.find((entry) => entry.skill_id === skillId && (!entry.exclusive_character_id || entry.exclusive_character_id === characterId));
      return skill ? [{ id: String(owned.id ?? skillId), skill_card_id: skillId, name: skill.name, plus_val: number(owned.plus_val, 0), ownerId: skill.exclusive_character_id, activationType: skill.activation_type, cooldown: skill.cooldown, availableFromRound: skill.available_from_round, target: skill.target, effects: skill.effects }] : [];
    });
    const stats = getCharacterTotalStats(characterRecord, equipments);
    return { id: `gvg_enemy_${characterRecord.id}`, name: master?.name ?? "防衛メンバー", characterId, alignment: master?.attribute ?? "ORDER", level: characterRecord.level, hp: stats.hp, maxHp: stats.hp, shield: 0, isDead: false, isEnemy: true, tauntTurns: 0, stunTurns: 0, stats, skills };
  });
}
