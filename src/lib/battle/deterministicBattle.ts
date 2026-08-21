export {
  CanonicalRng, DAMAGE_CONTRACT, criticalChanceBp, effectiveStat, finalStatusChanceBp,
  getAttributeMultiplierBp, productionDamage, resolveCanonicalBattle,
  type Alignment, type BattleCombatModifiers, type BattleReplayEvent, type BattleSkill,
  type BattleStats, type BattleStatusModifiers, type BattleTactic, type BattleTeam,
  type BattleUnit, type BattleUnitInput, type DeterministicBattleInput,
  type DeterministicBattleResult, type StatusId, type TargetType,
} from "../../domain/battle/canonical_runtime.ts";

import { resolveCanonicalBattle, type DeterministicBattleInput, type DeterministicBattleResult } from "../../domain/battle/canonical_runtime.ts";

/** Client preview uses the exact shared semantics used by the authoritative server resolver. */
export function resolveDeterministicBattle(input: DeterministicBattleInput): DeterministicBattleResult {
  return resolveCanonicalBattle(input);
}
