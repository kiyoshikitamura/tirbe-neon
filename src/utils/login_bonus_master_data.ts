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

// 30日分フォールバック/表示用デフォルトマスタ
export const DEFAULT_LOGIN_BONUS_MASTERS: LoginBonusMaster[] = [
  { day_number: 1, item_id: 'CASH', quantity: 5000, is_featured: false, item_name: 'キャッシュ 5,000' },
  { day_number: 2, item_id: 'DIAMOND', quantity: 50, is_featured: false, item_name: 'ダイヤ 50個' },
  { day_number: 3, item_id: 'ITEM_STAMINA_01', quantity: 2, is_featured: false, item_name: 'スタミナドリンク 2個' },
  { day_number: 4, item_id: 'CASH', quantity: 10000, is_featured: false, item_name: 'キャッシュ 10,000' },
  { day_number: 5, item_id: 'NORMAL_GACHA_TICKET_CHARACTER', quantity: 1, is_featured: true, item_name: 'キャラクターガチャチケット 1枚' },
  { day_number: 6, item_id: 'DIAMOND', quantity: 100, is_featured: false, item_name: 'ダイヤ 100個' },
  { day_number: 7, item_id: 'ITEM_EXP_DRINK', quantity: 3, is_featured: false, item_name: '強化ドリンク 3個' },
  { day_number: 8, item_id: 'CASH', quantity: 15000, is_featured: false, item_name: 'キャッシュ 15,000' },
  { day_number: 9, item_id: 'DIAMOND', quantity: 100, is_featured: false, item_name: 'ダイヤ 100個' },
  { day_number: 10, item_id: 'NORMAL_GACHA_TICKET_CHARACTER', quantity: 2, is_featured: true, item_name: 'キャラクターガチャチケット 2枚' },
  { day_number: 11, item_id: 'CASH', quantity: 20000, is_featured: false, item_name: 'キャッシュ 20,000' },
  { day_number: 12, item_id: 'ITEM_STAMINA_01', quantity: 3, is_featured: false, item_name: 'スタミナドリンク 3個' },
  { day_number: 13, item_id: 'DIAMOND', quantity: 150, is_featured: false, item_name: 'ダイヤ 150個' },
  { day_number: 14, item_id: 'CASH', quantity: 25000, is_featured: false, item_name: 'キャッシュ 25,000' },
  { day_number: 15, item_id: 'NORMAL_GACHA_TICKET_CHARACTER', quantity: 3, is_featured: true, item_name: 'キャラクターガチャチケット 3枚' },
  { day_number: 16, item_id: 'ITEM_EXP_DRINK', quantity: 5, is_featured: false, item_name: '強化ドリンク 5個' },
  { day_number: 17, item_id: 'CASH', quantity: 30000, is_featured: false, item_name: 'キャッシュ 30,000' },
  { day_number: 18, item_id: 'DIAMOND', quantity: 200, is_featured: false, item_name: 'ダイヤ 200個' },
  { day_number: 19, item_id: 'ITEM_STAMINA_01', quantity: 5, is_featured: false, item_name: 'スタミナドリンク 5個' },
  { day_number: 20, item_id: 'NORMAL_GACHA_TICKET_CHARACTER', quantity: 5, is_featured: true, item_name: 'キャラクターガチャチケット 5枚' },
  { day_number: 21, item_id: 'CASH', quantity: 40000, is_featured: false, item_name: 'キャッシュ 40,000' },
  { day_number: 22, item_id: 'DIAMOND', quantity: 250, is_featured: false, item_name: 'ダイヤ 250個' },
  { day_number: 23, item_id: 'ITEM_EXP_DRINK', quantity: 10, is_featured: false, item_name: '強化ドリンク 10個' },
  { day_number: 24, item_id: 'CASH', quantity: 50000, is_featured: false, item_name: 'キャッシュ 50,000' },
  { day_number: 25, item_id: 'NORMAL_GACHA_TICKET_CHARACTER', quantity: 5, is_featured: true, item_name: 'キャラクターガチャチケット 5枚' },
  { day_number: 26, item_id: 'DIAMOND', quantity: 300, is_featured: false, item_name: 'ダイヤ 300個' },
  { day_number: 27, item_id: 'CASH', quantity: 60000, is_featured: false, item_name: 'キャッシュ 60,000' },
  { day_number: 28, item_id: 'ITEM_STAMINA_01', quantity: 10, is_featured: false, item_name: 'スタミナドリンク 10個' },
  { day_number: 29, item_id: 'DIAMOND', quantity: 500, is_featured: false, item_name: 'ダイヤ 500個' },
  { day_number: 30, item_id: 'NORMAL_GACHA_TICKET_CHARACTER', quantity: 10, is_featured: true, item_name: 'キャラクターガチャチケット 10枚' }
];
