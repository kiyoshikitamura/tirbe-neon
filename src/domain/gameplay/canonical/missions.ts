import { CANONICAL_MISSIONS } from "./masters.ts";
import type { CanonicalMissionUiStatus } from "./types.ts";

export const CANONICAL_MISSION_REWARD_NAMES: Readonly<Record<string, string>> = Object.freeze({
  CASH: "CASH",
  DIAMOND: "ダイヤ",
  CHAR_EXP_S: "経験の書 [小]",
  CHAR_EXP_M: "経験の書 [中]",
  CHAR_EXP_L: "経験の書 [大]",
  EQUIP_EXP_S: "カスタムオイル [小]",
  EQUIP_EXP_M: "カスタムオイル [中]",
  EQUIP_EXP_L: "カスタムオイル [大]",
  EQUIP_LB_PART: "装備改造パーツ",
  SKILL_MANUAL: "スキル指南書",
  NORMAL_GACHA_TICKET_CHARACTER: "キャラクターガチャチケット",
});

export const CANONICAL_MISSION_REWARD_IDS = Object.freeze(Object.keys(CANONICAL_MISSION_REWARD_NAMES));
export const CANONICAL_MISSION_BY_ID = new Map(CANONICAL_MISSIONS.map((mission) => [mission.id, mission]));

export function canonicalMissionRewardName(rewardItemId: string): string {
  return CANONICAL_MISSION_REWARD_NAMES[rewardItemId] ?? rewardItemId;
}

export function canonicalMissionUiStatus(
  serverStatus: unknown,
  prerequisiteClaimed: boolean,
): CanonicalMissionUiStatus {
  if (!prerequisiteClaimed) return "LOCKED";
  if (serverStatus === "CLEAR" || serverStatus === "CLAIMED") return serverStatus;
  return "IN_PROGRESS";
}
