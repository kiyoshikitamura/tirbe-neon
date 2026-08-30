export type BattlePresentationTier = "NORMAL" | "STANDARD" | "SR" | "SSR";
export type BattlePresentationBeat = "ACTOR" | "IMPACT" | "RETURN";

export type BattlePresentationReplayEvent = {
  index: number;
  round: number;
  type: string;
  payload: Record<string, unknown>;
};

export type BattleTargetResolutionGroup = {
  targetId: string;
  events: BattlePresentationReplayEvent[];
};

export type BattlePresentationUnit = {
  actorId: string;
  skillId: string;
  round: number;
  replayStartCursor: number;
  nextReplayCursor: number;
  targets: BattleTargetResolutionGroup[];
};

export type BattleActionPresentation = {
  unit: BattlePresentationUnit;
  beat: BattlePresentationBeat;
  tier: BattlePresentationTier;
  skillName: string;
};

const TARGET_RESULT_TYPES = new Set(["DAMAGE", "HEAL", "STATUS", "EFFECT", "DEFEAT"]);

/**
 * Presentation-only projection of one immutable authoritative ACTION.
 * It preserves replay order and only groups already-resolved target results.
 * Targets, values, statuses, active effects and RNG are never derived here.
 */
export function buildBattlePresentationUnit(
  replay: readonly BattlePresentationReplayEvent[],
  actionCursor: number,
): BattlePresentationUnit | null {
  const action = replay[actionCursor];
  if (!action || action.type !== "ACTION") return null;

  const targetGroups = new Map<string, BattleTargetResolutionGroup>();
  let cursor = actionCursor + 1;
  while (cursor < replay.length) {
    const event = replay[cursor];
    if (event.type === "ACTION" || event.type === "RESULT") break;
    if (TARGET_RESULT_TYPES.has(event.type)) {
      const targetId = String(event.payload.targetId ?? "");
      if (targetId) {
        const group = targetGroups.get(targetId) ?? { targetId, events: [] };
        group.events.push(event);
        targetGroups.set(targetId, group);
      }
    }
    cursor += 1;
  }

  return {
    actorId: String(action.payload.actorId ?? ""),
    skillId: String(action.payload.skillId ?? "BASIC_ATTACK"),
    round: action.round,
    replayStartCursor: actionCursor,
    nextReplayCursor: cursor,
    targets: [...targetGroups.values()],
  };
}

export function battlePresentationTier(isSkill: boolean, actorRarity: unknown): BattlePresentationTier {
  if (!isSkill) return "NORMAL";
  const rarity = String(actorRarity ?? "").toUpperCase();
  return rarity === "SSR" ? "SSR" : rarity === "SR" ? "SR" : "STANDARD";
}

export function battlePresentationBudget(tier: BattlePresentationTier, speed: number): number {
  if (speed > 1) return tier === "NORMAL" ? 420 : tier === "STANDARD" ? 650 : 780;
  return tier === "NORMAL" ? 720 : tier === "STANDARD" ? 950 : 1200;
}

export function battlePresentationImpactAt(speed: number): number {
  return speed > 1 ? 82 : 120;
}

export function isActiveEffectSync(event: BattlePresentationReplayEvent): boolean {
  return event.type === "EFFECT" && event.payload.kind === "ACTIVE_EFFECT_SYNC";
}
