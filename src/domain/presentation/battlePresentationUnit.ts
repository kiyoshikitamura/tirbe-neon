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
  // 2x now tracks the former 1x recognition budget. 1x deliberately has
  // roughly twice that room so a human can read the whole fixed field.
  if (speed > 1) return tier === "NORMAL" ? 720 : tier === "STANDARD" ? 950 : 1200;
  return tier === "NORMAL" ? 1440 : tier === "STANDARD" ? 1900 : 2400;
}

export function battlePresentationImpactAt(speed: number): number {
  return speed > 1 ? 82 : 120;
}

export function isActiveEffectSync(event: BattlePresentationReplayEvent): boolean {
  return event.type === "EFFECT" && event.payload.kind === "ACTIVE_EFFECT_SYNC";
}

export type BattleHpParityParticipant = {
  id: string;
  hp: number;
  maxHp: number;
  isDead?: boolean;
};

export type BattleHpParityUnit = {
  targetId: string;
  canonicalHp: number;
  renderedHp: number | null;
  canonicalPercent: number;
  renderedPercent: number | null;
  stateParity: boolean;
  visualParity: boolean;
};

export type BattleHpParityTrace = {
  kind: "RESULT_HP_PARITY";
  parity: boolean;
  timedOut: boolean;
  forcedSettle: boolean;
  sampledAt: number;
  units: BattleHpParityUnit[];
};

/**
 * Re-project only HP values explicitly recorded by canonical replay events.
 * This is a result-boundary safety projection, never an HP calculation.
 */
export function reconcileBattleHpFromReplay<T extends BattleHpParityParticipant>(
  participants: readonly T[],
  replay: readonly BattlePresentationReplayEvent[],
  resultCursor = replay.length,
): T[] {
  const canonicalHp = new Map<string, number>();
  for (let cursor = 0; cursor < Math.min(resultCursor, replay.length); cursor += 1) {
    const event = replay[cursor];
    const targetId = String(event.payload.targetId ?? "");
    if (!targetId) continue;
    if (event.type === "DEFEAT") canonicalHp.set(targetId, 0);
    else if ((event.type === "DAMAGE" || event.type === "HEAL") && Number.isFinite(Number(event.payload.remainingHp))) {
      canonicalHp.set(targetId, Math.max(0, Number(event.payload.remainingHp)));
    }
  }
  return participants.map((participant) => {
    const hp = canonicalHp.get(participant.id);
    return hp == null ? participant : { ...participant, hp, isDead: hp <= 0 };
  });
}

function captureRenderedBattleHp(participants: readonly BattleHpParityParticipant[]): BattleHpParityUnit[] {
  return participants.map((participant) => {
    const unit = document.getElementById(participant.id);
    const track = unit?.querySelector<HTMLElement>(".battle-unit-hp");
    const fill = unit?.querySelector<HTMLElement>("[data-hp-fill]");
    const canonicalHp = Math.max(0, Number(participant.hp) || 0);
    const maxHp = Math.max(1, Number(participant.maxHp) || 1);
    const canonicalPercent = Math.min(100, (canonicalHp / maxHp) * 100);
    const renderedValue = unit?.dataset.hp;
    const renderedHp = renderedValue == null ? null : Number(renderedValue);
    const trackWidth = track?.getBoundingClientRect().width ?? 0;
    const fillWidth = fill?.getBoundingClientRect().width ?? 0;
    const renderedPercent = trackWidth > 0 ? Math.min(100, (fillWidth / trackWidth) * 100) : null;
    return {
      targetId: participant.id,
      canonicalHp,
      renderedHp: Number.isFinite(renderedHp) ? renderedHp : null,
      canonicalPercent: Number(canonicalPercent.toFixed(2)),
      renderedPercent: renderedPercent == null ? null : Number(renderedPercent.toFixed(2)),
      stateParity: renderedHp === canonicalHp,
      visualParity: renderedPercent != null && Math.abs(renderedPercent - canonicalPercent) <= 1,
    };
  });
}

/** Waits only for React/CSS to visually settle to canonical replay HP. */
export async function waitForRenderedBattleHpParity(
  participants: readonly BattleHpParityParticipant[],
  timeoutMs = 620,
): Promise<BattleHpParityTrace | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const startedAt = performance.now();
  let units = captureRenderedBattleHp(participants);
  let stableFrames = 0;
  while (performance.now() - startedAt < timeoutMs) {
    const parity = units.every((unit) => unit.stateParity && unit.visualParity);
    stableFrames = parity ? stableFrames + 1 : 0;
    if (stableFrames >= 2) break;
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    units = captureRenderedBattleHp(participants);
  }
  let parity = units.every((unit) => unit.stateParity && unit.visualParity);
  let forcedSettle = false;
  if (!parity) {
    // A throttled/background browser can delay CSS transitions beyond the
    // normal budget. Settle only the rendered bar to its canonical replay HP;
    // never leave the battle field while a stale width is still visible.
    forcedSettle = true;
    for (const participant of participants) {
      const unit = document.getElementById(participant.id);
      const fill = unit?.querySelector<HTMLElement>("[data-hp-fill]");
      if (!fill) continue;
      const percent = Math.min(100, (Math.max(0, Number(participant.hp) || 0) / Math.max(1, Number(participant.maxHp) || 1)) * 100);
      fill.style.transition = "none";
      fill.style.width = `${percent}%`;
    }
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    units = captureRenderedBattleHp(participants);
    parity = units.every((unit) => unit.stateParity && unit.visualParity);
  }
  const trace: BattleHpParityTrace = {
    kind: "RESULT_HP_PARITY",
    parity,
    timedOut: !parity,
    forcedSettle,
    sampledAt: performance.now(),
    units,
  };
  const battleWindow = window as typeof window & { __TRIBE_BATTLE_HP_TRACE__?: unknown[] };
  (battleWindow.__TRIBE_BATTLE_HP_TRACE__ ||= []).push(trace);
  document.documentElement.dataset.battleHpParity = parity ? "pass" : "fail";
  document.documentElement.dataset.battleHpParityTimedOut = trace.timedOut ? "true" : "false";
  document.documentElement.dataset.battleHpCanonicalZero = String(units.filter((unit) => unit.canonicalHp === 0).length);
  document.documentElement.dataset.battleHpParityZero = String(
    units.filter((unit) => unit.canonicalHp === 0 && unit.stateParity && unit.visualParity).length,
  );
  return trace;
}
