import { CANONICAL_RANKING_REWARDS } from "../gameplay/canonical/combat_production.ts";

export type RankingRewardCategory = "power" | "guild_power" | "pvp" | "raid";
export type RankingRewardPeriod = "daily" | "season";
export type RankingRewardTier = { from: number; to: number; itemId: string; quantity: number };
export type RankingRewardSection = { title: string; cadence: "MONTHLY" | "WEEKLY"; tiers: RankingRewardTier[] };
type ProgressionKey = keyof typeof CANONICAL_RANKING_REWARDS.progression;

function section(title: string, key: ProgressionKey): RankingRewardSection {
  return { title, cadence: CANONICAL_RANKING_REWARDS.periods[key] as "MONTHLY" | "WEEKLY", tiers: CANONICAL_RANKING_REWARDS.progression[key].map(([from, to, itemId, quantity]) => ({ from: Number(from), to: Number(to), itemId: String(itemId), quantity: Number(quantity) })) };
}

export function rankingRewardSections(category: RankingRewardCategory, period: RankingRewardPeriod): RankingRewardSection[] {
  if (period !== "season") return [];
  if (category === "pvp") return [section("個人ランキング", "PVP")];
  if (category === "raid") return [section("個人ランキング", "RAID_PERSONAL"), section("ギルドランキング", "RAID_GUILD")];
  return [];
}
