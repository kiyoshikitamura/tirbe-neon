export const RECENT_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RecentActivityRecord = Readonly<{
  id: string;
  created_at?: string | null;
}>;

export function normalizeRecentActivities<T extends RecentActivityRecord>(
  activities: readonly T[],
  nowMs = Date.now(),
): T[] {
  const oldestVisibleAt = nowMs - RECENT_ACTIVITY_WINDOW_MS;

  return activities
    .filter((activity) => {
      const createdAt = Date.parse(activity.created_at || "");
      return Number.isFinite(createdAt) && createdAt >= oldestVisibleAt && createdAt <= nowMs;
    })
    .sort((left, right) => {
      const createdAtDifference = Date.parse(right.created_at!) - Date.parse(left.created_at!);
      if (createdAtDifference !== 0) return createdAtDifference;
      if (left.id === right.id) return 0;
      return left.id < right.id ? 1 : -1;
    });
}
