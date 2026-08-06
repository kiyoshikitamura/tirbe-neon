import { CHARACTERS_MASTER } from "@/utils/game_constants";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import type { BattleSkill, BattleTeam, BattleUnitInput, TargetType } from "./deterministicBattle";

type OwnedCharacter = { id: string; character_id: string; level: number; awakening_level: number };
type OwnedSkill = { skill_card_id: string; equipped_character_id?: string | null; slot_index?: number | null; plus_val?: number };

function targetType(value: unknown): TargetType {
  switch (value) {
    case "ENEMY_ALL":
    case "ALLY_SINGLE":
    case "ALLY_ALL":
      return value;
    default:
      return "ENEMY_SINGLE";
  }
}

function skillKind(value: unknown): BattleSkill["kind"] {
  if (value === "HEAL") return "HEAL";
  if (value === "BUFF" || value === "DEFENSE" || value === "SUPPORT") return "BUFF";
  if (value === "DEBUFF") return "DEBUFF";
  return "ATTACK";
}

function defaultCooldown(rarity: unknown, power: number): number {
  if (power >= 240 || rarity === "SSR") return 4;
  if (power >= 180 || rarity === "SR") return 3;
  return 2;
}

export function buildBattleRosterSnapshot(args: {
  team: BattleTeam;
  characters: OwnedCharacter[];
  characterInstanceIds: string[];
  equipments: unknown[];
  ownedSkills: OwnedSkill[];
  skillsMaster: Array<Record<string, unknown>>;
}): BattleUnitInput[] {
  const selected = args.characterInstanceIds
    .map((id) => args.characters.find((character) => character.id === id))
    .filter((character): character is OwnedCharacter => Boolean(character))
    .slice(0, 5);

  return selected.map((character) => {
    const master = CHARACTERS_MASTER.find((candidate) => candidate.id === character.character_id);
    const stats = getCharacterTotalStats(character, args.equipments);
    const skills: BattleSkill[] = args.ownedSkills
      .filter((skill) => skill.equipped_character_id === character.id)
      .sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0))
      .map((owned) => {
        const masterSkill = args.skillsMaster.find((skill) => skill.id === owned.skill_card_id);
        const power = Number(masterSkill?.power ?? 100);
        return {
          id: owned.skill_card_id,
          name: String(masterSkill?.name ?? owned.skill_card_id),
          kind: skillKind(masterSkill?.effect_type),
          target: targetType(masterSkill?.target_type),
          powerPercent: power,
          cooldown: Number(masterSkill?.cooldown_turns ?? defaultCooldown(masterSkill?.rarity, power)),
          initialCooldown: Number(masterSkill?.initial_cooldown ?? 0),
          status: masterSkill?.status_id as BattleSkill["status"],
          statusChance: Number(masterSkill?.status_chance ?? 0) || undefined,
          modifier: masterSkill?.modifier_stat ? {
            stat: masterSkill.modifier_stat as "ATK" | "DEF" | "SPD",
            percent: Number(masterSkill.modifier_percent ?? 0),
            duration: Number(masterSkill.modifier_duration ?? 1),
          } : undefined,
        };
      });

    return {
      id: character.id,
      name: master?.jpName ?? master?.name ?? character.character_id,
      team: args.team,
      alignment: (master?.alignment ?? "ORDER") as BattleUnitInput["alignment"],
      stats,
      skills,
    };
  });
}
