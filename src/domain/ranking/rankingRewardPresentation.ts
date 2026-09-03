import { CANONICAL_RANKING_REWARDS } from "../gameplay/canonical/combat_production.ts";

export type RankingRewardCategory = "power" | "guild_power" | "pvp" | "raid";
export type RankingRewardPeriod = "daily" | "season";
export type RankingRewardTier = { from: number; to: number; itemId: string; quantity: number };
export type RankingRewardCadence = "DAILY" | "WEEKLY" | "MONTHLY";
export type RankingRewardSection = { title: string; cadence: RankingRewardCadence; tiers: RankingRewardTier[] };
export type RankingRewardMasterPayload = {
  periods?: Record<string, unknown>;
  progression?: Record<string, unknown>;
  progressionByPeriod?: Record<string, Record<string, unknown>>;
};

type RewardCategoryDefinition = { key: string; title: string };

const CATEGORY_DEFINITIONS: Record<RankingRewardCategory, RewardCategoryDefinition[]> = {
  power: [{ key: "POWER", title: "個人ランキング" }],
  guild_power: [{ key: "GUILD_POWER", title: "ギルドランキング" }],
  pvp: [{ key: "PVP", title: "個人ランキング" }],
  raid: [
    { key: "RAID_PERSONAL", title: "個人ランキング" },
    { key: "RAID_GUILD", title: "ギルドランキング" },
  ],
};

function isRewardTier(value: unknown): value is [number, number, string, number] {
  if (!Array.isArray(value) || value.length < 4) return false;
  const [from, to, itemId, quantity] = value;
  return Number.isInteger(Number(from))
    && Number(from) > 0
    && Number.isInteger(Number(to))
    && Number(to) >= Number(from)
    && typeof itemId === "string"
    && itemId.length > 0
    && Number.isFinite(Number(quantity))
    && Number(quantity) > 0;
}

function cadenceFor(payload: RankingRewardMasterPayload, key: string, period: RankingRewardPeriod): RankingRewardCadence {
  if (period === "daily") return "DAILY";
  const cadence = payload.periods?.[key];
  return cadence === "MONTHLY" ? "MONTHLY" : "WEEKLY";
}

export function rankingRewardSectionsFromPayload(
  payload: RankingRewardMasterPayload | null | undefined,
  category: RankingRewardCategory,
  period: RankingRewardPeriod,
): RankingRewardSection[] {
  if (!payload) return [];
  const progression = period === "daily"
    ? payload.progressionByPeriod?.DAILY
    : payload.progressionByPeriod?.SEASON ?? payload.progression;

  return CATEGORY_DEFINITIONS[category].flatMap(({ key, title }) => {
    const rows = progression?.[key];
    if (!Array.isArray(rows)) return [];
    const tiers = rows.filter(isRewardTier).map(([from, to, itemId, quantity]) => ({
      from: Number(from),
      to: Number(to),
      itemId,
      quantity: Number(quantity),
    }));
    return tiers.length > 0 ? [{ title, cadence: cadenceFor(payload, key, period), tiers }] : [];
  });
}

export function rankingRewardSections(category: RankingRewardCategory, period: RankingRewardPeriod): RankingRewardSection[] {
  return rankingRewardSectionsFromPayload(CANONICAL_RANKING_REWARDS, category, period);
}
