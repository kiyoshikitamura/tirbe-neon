import { CANONICAL_RANKING_REWARDS } from "../gameplay/canonical/combat_production.ts";

export type RankingRewardCategory = "power" | "guild_power" | "pvp" | "raid";
export type RankingRewardPeriod = "daily" | "season";
export type RankingRewardTier = { from: number; to: number; itemId: string; quantity: number };
export type RankingRewardCadence = "DAILY" | "WEEKLY" | "MONTHLY";
export type RankingRewardSection = { title: string; cadence: RankingRewardCadence; tiers: RankingRewardTier[] };
export type RankingRewardMasterPayload = {
  periods?: Record<string, unknown>;
  daily?: Record<string, unknown>;
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

function parseRewardTier(value: unknown): RankingRewardTier | null {
  if (isRewardTier(value)) return { from: Number(value[0]), to: Number(value[1]), itemId: value[2], quantity: Number(value[3]) };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const from = Number(row.rankMin ?? row.rank_min ?? row.from);
  const to = Number(row.rankMax ?? row.rank_max ?? row.to);
  const itemId = String(row.itemId ?? row.item_id ?? "");
  const quantity = Number(row.quantity);
  if (!Number.isInteger(from) || from <= 0 || !Number.isInteger(to) || to < from || !itemId || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { from, to, itemId, quantity };
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
    ? payload.daily ?? payload.progressionByPeriod?.DAILY
    : payload.progressionByPeriod?.SEASON ?? payload.progression;

  return CATEGORY_DEFINITIONS[category].flatMap(({ key, title }) => {
    const rows = progression?.[key];
    if (!Array.isArray(rows)) return [];
    const tiers = rows.flatMap((row) => {
      const tier = parseRewardTier(row);
      return tier ? [tier] : [];
    });
    return tiers.length > 0 ? [{ title, cadence: cadenceFor(payload, key, period), tiers }] : [];
  });
}

export function rankingRewardSections(category: RankingRewardCategory, period: RankingRewardPeriod): RankingRewardSection[] {
  return rankingRewardSectionsFromPayload(CANONICAL_RANKING_REWARDS, category, period);
}
