import { resolveCanonicalBattle, type BattleTactic, type BattleUnitInput } from "../../../src/domain/battle/canonical_runtime.ts";

export type Tactic = BattleTactic;

/** Authoritative Edge Function entry point backed by the shared canonical runtime. */
export function resolveBattle(seed: number, tactic: Tactic, maxRounds: number, player: BattleUnitInput[], enemy: BattleUnitInput[]) {
  return resolveCanonicalBattle({ seed, tactic, maxRounds, player, enemy });
}
