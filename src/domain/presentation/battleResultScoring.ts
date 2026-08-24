export const MVP_SCORE_MAX = Object.freeze({
  damage: 40,
  kills: 20,
  heal: 20,
  shield: 15,
  survival: 5,
});

export type BattleResultReplayEvent = Readonly<{
  type: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export type BattleResultParticipant = Readonly<{
  id: string;
  characterId: string;
  name: string;
  isEnemy: boolean;
}>;

export type MvpRawStats = Readonly<{
  damage: number;
  kills: number;
  heal: number;
  shield: number;
  survived: boolean;
}>;

export type MvpScoreBreakdown = Readonly<{
  damage: number;
  kills: number;
  heal: number;
  shield: number;
  survival: number;
  total: number;
}>;

export type MvpCandidate = Readonly<{
  participant: BattleResultParticipant;
  raw: MvpRawStats;
  score: MvpScoreBreakdown;
}>;

export type BattleTeamComparison = Readonly<{
  damage: number;
  kills: number;
  survivors: number;
}>;

export type BattleResultAnalysis = Readonly<{
  mvp: MvpCandidate | null;
  candidates: readonly MvpCandidate[];
  player: BattleTeamComparison;
  enemy: BattleTeamComparison;
}>;

const numeric = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const relativeScore = (raw: number, teamMaximum: number, maximumScore: number) => {
  if (raw <= 0 || teamMaximum <= 0) return 0;
  return Math.max(0, Math.min(maximumScore, Math.round(maximumScore * raw / teamMaximum)));
};

export function analyzeBattleResult(
  events: readonly BattleResultReplayEvent[],
  participants: readonly BattleResultParticipant[],
): BattleResultAnalysis {
  const participantById = new Map(participants.map((entry) => [entry.id, entry]));
  const rawById = new Map(participants.map((entry) => [entry.id, { damage: 0, kills: 0, heal: 0, shield: 0 }]));
  const defeated = new Set<string>();
  const lastDamageActorByTarget = new Map<string, string>();

  for (const event of events) {
    const actorId = String(event.payload.actorId ?? "");
    const targetId = String(event.payload.targetId ?? "");
    if (event.type === "DAMAGE" && participantById.has(actorId)) {
      const raw = rawById.get(actorId)!;
      raw.damage += numeric(event.payload.hpDamage ?? event.payload.amount);
      if (targetId && numeric(event.payload.hpDamage ?? event.payload.amount) > 0) lastDamageActorByTarget.set(targetId, actorId);
    } else if (event.type === "HEAL" && participantById.has(actorId)) {
      rawById.get(actorId)!.heal += numeric(event.payload.effectiveAmount ?? event.payload.amount);
    } else if (event.type === "EFFECT" && event.payload.kind === "SHIELD" && participantById.has(actorId)) {
      rawById.get(actorId)!.shield += numeric(event.payload.amount);
    } else if (event.type === "DEFEAT" && targetId) {
      defeated.add(targetId);
      const defeatingActorId = lastDamageActorByTarget.get(targetId);
      if (defeatingActorId && participantById.has(defeatingActorId)) rawById.get(defeatingActorId)!.kills += 1;
    }
  }

  const players = participants.filter((entry) => !entry.isEnemy);
  const playerRaw = players.map((entry) => rawById.get(entry.id)!);
  const maxima = {
    damage: Math.max(0, ...playerRaw.map((entry) => entry.damage)),
    kills: Math.max(0, ...playerRaw.map((entry) => entry.kills)),
    heal: Math.max(0, ...playerRaw.map((entry) => entry.heal)),
    shield: Math.max(0, ...playerRaw.map((entry) => entry.shield)),
  };

  const candidates = players.map((participant): MvpCandidate => {
    const accumulated = rawById.get(participant.id)!;
    const raw: MvpRawStats = { ...accumulated, survived: !defeated.has(participant.id) };
    const scoreWithoutTotal = {
      damage: relativeScore(raw.damage, maxima.damage, MVP_SCORE_MAX.damage),
      kills: relativeScore(raw.kills, maxima.kills, MVP_SCORE_MAX.kills),
      heal: relativeScore(raw.heal, maxima.heal, MVP_SCORE_MAX.heal),
      shield: relativeScore(raw.shield, maxima.shield, MVP_SCORE_MAX.shield),
      survival: raw.survived ? MVP_SCORE_MAX.survival : 0,
    };
    const score: MvpScoreBreakdown = {
      ...scoreWithoutTotal,
      total: Object.values(scoreWithoutTotal).reduce((sum, value) => sum + value, 0),
    };
    return { participant, raw, score };
  }).sort((a, b) => b.score.total - a.score.total
    || b.raw.damage - a.raw.damage
    || b.raw.kills - a.raw.kills
    || a.participant.characterId.localeCompare(b.participant.characterId));

  const comparison = (isEnemy: boolean): BattleTeamComparison => {
    const members = participants.filter((entry) => entry.isEnemy === isEnemy);
    return {
      damage: members.reduce((sum, entry) => sum + rawById.get(entry.id)!.damage, 0),
      kills: members.reduce((sum, entry) => sum + rawById.get(entry.id)!.kills, 0),
      survivors: members.filter((entry) => !defeated.has(entry.id)).length,
    };
  };

  return { mvp: candidates[0] ?? null, candidates, player: comparison(false), enemy: comparison(true) };
}
