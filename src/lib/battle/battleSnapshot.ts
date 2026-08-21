import { CANONICAL_CHARACTERS, CANONICAL_SKILLS } from "@/domain/gameplay/canonical/masters";
import { canonicalSkillSlotCount } from "@/domain/gameplay/canonical/calculations";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import type { BattleTeam, BattleUnitInput } from "./deterministicBattle";

type OwnedCharacter = { id: string; character_id: string; level: number; awakening_level: number };
type OwnedSkill = { skill_card_id: string; equipped_character_id?: string | null; slot_index?: number | null; plus_val?: number };

export function buildBattleRosterSnapshot(args: { team: BattleTeam; characters: OwnedCharacter[]; characterInstanceIds: string[]; equipments: unknown[]; ownedSkills: OwnedSkill[]; skillsMaster?: Array<Record<string, unknown>> }): BattleUnitInput[] {
  return args.characterInstanceIds.map((id) => args.characters.find((character) => character.id === id)).filter((character): character is OwnedCharacter => Boolean(character)).slice(0, 5).map((character) => {
    const master = CANONICAL_CHARACTERS.find((entry) => entry.character_id === character.character_id);
    const skills = args.ownedSkills.filter((owned) => owned.equipped_character_id === character.id && (owned.slot_index ?? -1) >= 0 && (owned.slot_index ?? -1) < canonicalSkillSlotCount(character.awakening_level)).sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0)).flatMap((owned) => {
      const canonical = CANONICAL_SKILLS.find((entry) => entry.skill_id === owned.skill_card_id && (!entry.exclusive_character_id || entry.exclusive_character_id === character.character_id));
      if (!canonical) return [];
      return [{ id: canonical.skill_id, name: canonical.name, activationType: canonical.activation_type as "ACTIVE" | "BATTLE_START" | "ON_DAMAGE_TAKEN", cooldown: canonical.cooldown, availableFromRound: canonical.available_from_round, target: canonical.target as "ENEMY_SINGLE" | "ENEMY_ALL" | "ALLY_SINGLE" | "ALLY_ALL" | "SELF" | "ATTACKER_WHO_DAMAGED_SELF", effects: canonical.effects, exclusiveCharacterId: canonical.exclusive_character_id, skillPlusVal: Math.max(0, Math.min(10, owned.plus_val ?? 0)) }];
    });
    return { id: character.id, characterId: character.character_id, name: master?.name ?? character.character_id, team: args.team, alignment: master?.attribute ?? "ORDER", stats: getCharacterTotalStats(character, args.equipments as never[]), skills };
  });
}
