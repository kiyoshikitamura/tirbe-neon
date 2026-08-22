import master from "./data/guild_production_20260823.json" with { type: "json" };

export type GuildRecruitmentMode = "OPEN_JOIN" | "APPLICATION_REQUIRED" | "CLOSED";
export type GuildRole = "MASTER" | "SUB_MASTER" | "MEMBER";
export type GuildExpSource = "LOGIN" | "FIRST_GUILD_CHAT" | "QUEST_3_CLEAR" | "PVP_FINALIZED" | "RAID_FINALIZED" | "DONATION";

export const GUILD_PRODUCTION = master;

export function guildMemberCap(level: number): number {
  return master.levels.find((entry) => entry.level === level)?.memberCap ?? master.levels[0].memberCap;
}

export function guildRecruitmentMode(value: unknown, approvalRequired = false): GuildRecruitmentMode {
  if (master.recruitmentModes.includes(value as GuildRecruitmentMode)) return value as GuildRecruitmentMode;
  return approvalRequired ? "APPLICATION_REQUIRED" : "OPEN_JOIN";
}

export function canManageGuildApplications(role: unknown): boolean {
  return role === "MASTER" || role === "SUB_MASTER";
}

export function canEditGuildSettings(role: unknown): boolean {
  return role === "MASTER" || role === "SUB_MASTER";
}

export function projectGuildProgress(level: number, exp: number) {
  const row = master.levels.find((entry) => entry.level === level) ?? master.levels[0];
  return { level: row.level, exp: Math.max(0, Math.floor(exp)), requiredExp: row.requiredExp, memberCap: row.memberCap };
}
