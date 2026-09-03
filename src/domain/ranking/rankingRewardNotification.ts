export type RankingRewardGrant = {
  periodKind: "DAILY" | "SEASON";
  periodKey: string;
  rankingCategory: string;
  rankPosition: number;
  itemId: string;
  quantity: number;
  grantedAt: string;
};

export type PendingRankingRewardNotification = {
  notificationIds: string[];
  grants: RankingRewardGrant[];
};

const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export function parsePendingRankingRewardNotification(value: unknown): PendingRankingRewardNotification | null {
  if (value == null) return null;
  if (typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.notification_ids) || !Array.isArray(payload.grants)) return null;
  const notificationIds = payload.notification_ids.filter(nonEmptyString);
  const grants = payload.grants.flatMap((entry): RankingRewardGrant[] => {
    if (!entry || typeof entry !== "object") return [];
    const grant = entry as Record<string, unknown>;
    const periodKind = grant.period_kind;
    const rankPosition = Number(grant.rank_position);
    const quantity = Number(grant.quantity);
    if ((periodKind !== "DAILY" && periodKind !== "SEASON")
      || !nonEmptyString(grant.period_key)
      || !nonEmptyString(grant.ranking_category)
      || !Number.isInteger(rankPosition)
      || rankPosition <= 0
      || !nonEmptyString(grant.item_id)
      || !Number.isFinite(quantity)
      || quantity <= 0
      || !nonEmptyString(grant.granted_at)) return [];
    return [{
      periodKind,
      periodKey: grant.period_key,
      rankingCategory: grant.ranking_category,
      rankPosition,
      itemId: grant.item_id,
      quantity,
      grantedAt: grant.granted_at,
    }];
  });
  return notificationIds.length > 0 && grants.length > 0 ? { notificationIds, grants } : null;
}

export function aggregateRankingRewardItems(grants: RankingRewardGrant[]): Array<{ id: string; quantity: number }> {
  const totals = new Map<string, number>();
  for (const grant of grants) totals.set(grant.itemId, (totals.get(grant.itemId) || 0) + grant.quantity);
  return [...totals].map(([id, quantity]) => ({ id, quantity }));
}
