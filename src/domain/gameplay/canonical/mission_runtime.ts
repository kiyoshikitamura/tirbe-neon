export type MissionServerStatus = "PROGRESS" | "CLEAR" | "CLAIMED";

export type MissionMasterRow = {
  id: string;
  category: "DAILY" | "NORMAL";
  trigger_type: string;
  target_value: number;
  prerequisite_mission_id: string | null;
  is_enabled: boolean;
  reward_item_id: string;
  reward_quantity: number;
};

export type UserMissionRow = {
  id: string;
  user_id: string;
  mission_id: string;
  current_progress: number;
  status: MissionServerStatus;
  cycle_date: string | null;
  claimed_at?: string | null;
};

export const FUNNEL_TRIGGER_BY_MILESTONE: Readonly<Record<string, string>> = {
  first_gacha: "FUNNEL_FIRST_GACHA",
  first_growth: "FUNNEL_FIRST_GROWTH",
  first_battle: "FUNNEL_FIRST_BATTLE",
  first_pvp: "FUNNEL_FIRST_PVP",
  first_raid: "FUNNEL_FIRST_RAID",
  guild_detail_view: "FUNNEL_GUILD_VIEW",
  guild_join_applied: "FUNNEL_GUILD_JOIN",
  guild_joined: "FUNNEL_GUILD_JOIN",
  guild_activation: "FUNNEL_GUILD_ACTIVATION",
  second_raid: "FUNNEL_SECOND_RAID",
};

export const jstCycleDate = (now = new Date()): string => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(now);

const prerequisiteClaimed = (mission: MissionMasterRow, rows: UserMissionRow[], userId: string): boolean =>
  !mission.prerequisite_mission_id || rows.some((row) =>
    row.user_id === userId && row.mission_id === mission.prerequisite_mission_id && row.status === "CLAIMED"
  );

export function syncCanonicalMissions(
  master: MissionMasterRow[],
  rows: UserMissionRow[],
  userId: string,
  cycleDate = jstCycleDate(),
): { rows: UserMissionRow[]; rescued: UserMissionRow[] } {
  const rescued: UserMissionRow[] = [];
  for (const mission of master.filter((entry) => entry.is_enabled)) {
    const current = rows.find((row) => row.user_id === userId && row.mission_id === mission.id);
    if (mission.category === "DAILY" && current?.cycle_date !== cycleDate) {
      if (current?.status === "CLEAR") rescued.push({ ...current });
      if (current) {
        current.current_progress = 0;
        current.status = "PROGRESS";
        current.claimed_at = null;
        current.cycle_date = cycleDate;
      }
    }
    if (!current && prerequisiteClaimed(mission, rows, userId)) {
      rows.push({
        id: `um_${userId}_${mission.id}`,
        user_id: userId,
        mission_id: mission.id,
        current_progress: 0,
        status: "PROGRESS",
        cycle_date: mission.category === "DAILY" ? cycleDate : null,
        claimed_at: null,
      });
    }
  }
  const login = master.find((entry) => entry.is_enabled && entry.trigger_type === "DAILY_LOGIN");
  const loginRow = login && rows.find((row) => row.user_id === userId && row.mission_id === login.id);
  if (login && loginRow && loginRow.cycle_date === cycleDate && loginRow.status === "PROGRESS") {
    loginRow.current_progress = login.target_value;
    loginRow.status = "CLEAR";
  }
  return { rows, rescued };
}

export function evaluateCanonicalMissionProgress(
  master: MissionMasterRow[],
  rows: UserMissionRow[],
  userId: string,
  triggerType: string,
  increment: number,
): UserMissionRow[] {
  for (const mission of master.filter((entry) => entry.is_enabled && entry.trigger_type === triggerType)) {
    if (!prerequisiteClaimed(mission, rows, userId)) continue;
    const row = rows.find((entry) => entry.user_id === userId && entry.mission_id === mission.id);
    if (!row || row.status !== "PROGRESS") continue;
    row.current_progress = Math.min(mission.target_value, row.current_progress + Math.max(0, increment));
    if (row.current_progress >= mission.target_value) row.status = "CLEAR";
  }
  return rows;
}

export function unlockClaimedMissionChildren(
  master: MissionMasterRow[],
  rows: UserMissionRow[],
  userId: string,
  claimedMissionId: string,
  achievedFunnelTriggers: ReadonlySet<string>,
): UserMissionRow[] {
  for (const mission of master.filter((entry) => entry.is_enabled && entry.prerequisite_mission_id === claimedMissionId)) {
    let row = rows.find((entry) => entry.user_id === userId && entry.mission_id === mission.id);
    if (!row) {
      row = {
        id: `um_${userId}_${mission.id}`,
        user_id: userId,
        mission_id: mission.id,
        current_progress: 0,
        status: "PROGRESS",
        cycle_date: null,
        claimed_at: null,
      };
      rows.push(row);
    }
    if (row.status === "PROGRESS" && achievedFunnelTriggers.has(mission.trigger_type)) {
      row.current_progress = mission.target_value;
      row.status = "CLEAR";
    }
  }
  return rows;
}
