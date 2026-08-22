import loginBonusSource from "@/domain/gameplay/canonical/data/login_bonus_20260822.json";
import { canonicalItemName } from "@/domain/gameplay/canonical/items";

export interface LoginBonusMaster {
  day_number: number;
  item_id: string;
  quantity: number;
  is_featured: boolean;
  item_name: string;
}

export interface UserLoginBonus {
  user_id: string;
  current_step: number;
  total_logins: number;
  last_claimed_date: string | null;
  updated_at?: string;
}

export interface LoginBonusReward {
  day_number: number;
  item_id: string;
  item_name: string;
  quantity: number;
  is_featured: boolean;
}

export interface LoginBonusClaimResult {
  claimed: boolean;
  reason?: string;
  current_step: number;
  total_logins?: number;
  last_claimed_date?: string;
  reward?: LoginBonusReward;
}

const FEATURED_DAYS = new Set([5, 12, 15, 20, 26, 29, 30]);

export const DEFAULT_LOGIN_BONUS_MASTERS: LoginBonusMaster[] = loginBonusSource.rewards.map((reward) => ({
  day_number: reward.day,
  item_id: reward.rewardItemId,
  quantity: reward.rewardQty,
  is_featured: FEATURED_DAYS.has(reward.day),
  item_name: `${canonicalItemName(reward.rewardItemId)} ${reward.rewardQty.toLocaleString("ja-JP")}`,
}));
