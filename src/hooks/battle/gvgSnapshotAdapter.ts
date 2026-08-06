import { CHARACTERS_MASTER } from "@/utils/game_constants";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import type { ParticipantState } from "./battleTypes";

type SnapshotRecord = Record<string, unknown>;

function asRecord(value: unknown): SnapshotRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as SnapshotRecord : null;
}

function asRecords(value: unknown): SnapshotRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry): entry is SnapshotRecord => entry !== null) : [];
}

function asNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

/** マッチ確定時に保存した防衛スナップショットを、画面・解決器共通の部隊状態へ復元する。 */
export function gvgDefenseSnapshotToParticipants(defenseDeck: unknown): ParticipantState[] {
  return asRecords(defenseDeck).map((character, index) => {
    const characterId = String(character.character_id ?? "");
    const master = CHARACTERS_MASTER.find((entry) => entry.id === characterId);
    const characterRecord = {
      id: String(character.id ?? `gvg_snapshot_${index}`),
      character_id: characterId,
      level: asNumber(character.level, 1),
      awakening_level: asNumber(character.awakening_level, 0),
    };
    const equipments = asRecords(character.equipments).map((equipment) => ({
      ...equipment,
      equipment_id: String(equipment.equipment_id ?? ""),
      level: asNumber(equipment.level, 1),
      plus_val: asNumber(equipment.plus_val, 0),
      equipped_character_id: characterRecord.id,
    }));
    const stats = getCharacterTotalStats(characterRecord, equipments);
    const skills = asRecords(character.skills).map((skill, skillIndex) => {
      const skillCardId = String(skill.skill_card_id ?? "");
      const skillMaster = SKILLS_MASTER_DATA.find((entry) => entry.id === skillCardId);
      return {
        id: String(skill.id ?? `gvg_snapshot_skill_${index}_${skillIndex}`),
        skill_card_id: skillCardId,
        name: skillMaster?.name ?? "防衛スキル",
        ap_cost: skillMaster?.ap_cost ?? 0,
        power: skillMaster?.power ?? 100,
        effect_type: skillMaster?.effect_type ?? "ATTACK",
        plus_val: asNumber(skill.plus_val, 0),
        ownerId: skillMaster?.exclusive_character_id ?? null,
      };
    });
    return {
      id: `gvg_enemy_${characterRecord.id}`,
      name: master?.jpName ?? "防衛メンバー",
      characterId,
      alignment: master?.alignment ?? "ORDER",
      level: characterRecord.level,
      hp: stats.hp,
      maxHp: stats.hp,
      shield: 0,
      isDead: false,
      isEnemy: true,
      tauntTurns: 0,
      stunTurns: 0,
      stats,
      skills,
    };
  });
}
