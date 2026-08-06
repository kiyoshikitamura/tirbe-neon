export interface ShopProductItem {
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface ShopProduct {
  id: string;
  shopType: "LIMITED" | "NORMAL";
  category: "BEGINNER" | "VIP" | "LIMITED_N" | "DIAMOND" | "NORMAL_ITEM";
  title: string;
  description: string;
  priceJpy?: number;        // 日本円（Stripe決済時）
  priceCash?: number;       // キャッシュ価格
  priceDiamond?: number;    // ダイヤ価格
  purchaseLimit?: number;   // 最大購入可能回数（0または未定義は無制限）
  timeLimitHours?: number;  // アカウント作成からの制限時間（時間単位）
  bannerUrl?: string;       // 販促バナー画像パス（差替可能）
  iconUrl?: string;         // アイコン画像パス（差替可能）
  items: ShopProductItem[];
  sortOrder: number;
}

export const SHOP_PRODUCTS_MASTER: ShopProduct[] = [
  // ==========================================
  // ■ 限定ショップ商品 (Stripe課金)
  // ==========================================
  
  // 1. 初心者限定商材 (24時間限定 / 1回限り)
  {
    id: "beginner_pack_01",
    shopType: "LIMITED",
    category: "BEGINNER",
    title: "初心者限定スタートダッシュパック",
    description: "ゲーム開始24時間限定！爆速スタートを決める超お得コンテンツ詰め合わせパック！",
    priceJpy: 100,
    purchaseLimit: 1,
    timeLimitHours: 72,
    bannerUrl: "/banner_beginner_pack.png",
    items: [
      { itemId: "CASH", itemName: "キャッシュ", quantity: 10000 },
      { itemId: "DIAMOND", itemName: "ダイヤ", quantity: 300 },
      { itemId: "CHAR_EXP_M", itemName: "経験の書 [中]", quantity: 5 },
      { itemId: "EQUIP_EXP_M", itemName: "カスタムオイル [中]", quantity: 5 }
    ],
    sortOrder: 1
  },
  {
    id: "vip_pass_01",
    shopType: "LIMITED",
    category: "VIP",
    title: "VIP PASS",
    description: "VIP pass benefits are provisional. Includes 3x battle playback while the pass is active.",
    priceJpy: 980,
    purchaseLimit: 1,
    items: [],
    sortOrder: 2
  },

  // 2. 限定N回販売 (リリース時商品なし / 枠組み拡張用)
  // ※新イベントやキャンペーン時に追加可能

  // 3. 通常ダイヤ商品 (Stripe)
  {
    id: "diamond_100",
    shopType: "LIMITED",
    category: "DIAMOND",
    title: "ダイヤ 100個",
    description: "有償ダイヤ 100個 をチャージします。",
    priceJpy: 100,
    items: [
      { itemId: "DIAMOND", itemName: "ダイヤ", quantity: 100 }
    ],
    sortOrder: 10
  },
  {
    id: "diamond_500",
    shopType: "LIMITED",
    category: "DIAMOND",
    title: "ダイヤ 500個",
    description: "有償ダイヤ 500個 をチャージします。",
    priceJpy: 500,
    items: [
      { itemId: "DIAMOND", itemName: "ダイヤ", quantity: 500 }
    ],
    sortOrder: 11
  },
  {
    id: "diamond_1000",
    shopType: "LIMITED",
    category: "DIAMOND",
    title: "ダイヤ 1,000個 ＋ オマケ50個",
    description: "有償ダイヤ 1,000個 に無償ダイヤ 50個 のボーナス！",
    priceJpy: 1000,
    items: [
      { itemId: "DIAMOND", itemName: "ダイヤ", quantity: 1050 }
    ],
    sortOrder: 12
  },
  {
    id: "diamond_3000",
    shopType: "LIMITED",
    category: "DIAMOND",
    title: "ダイヤ 3,000個 ＋ オマケ160個",
    description: "有償ダイヤ 3,000個 に無償ダイヤ 160個 のボーナス！",
    priceJpy: 3000,
    items: [
      { itemId: "DIAMOND", itemName: "ダイヤ", quantity: 3160 }
    ],
    sortOrder: 13
  },
  {
    id: "diamond_5000",
    shopType: "LIMITED",
    category: "DIAMOND",
    title: "ダイヤ 5,000個 ＋ オマケ280個",
    description: "有償ダイヤ 5,000個 に無償ダイヤ 280個 のボーナス！",
    priceJpy: 5000,
    items: [
      { itemId: "DIAMOND", itemName: "ダイヤ", quantity: 5280 }
    ],
    sortOrder: 14
  },
  {
    id: "diamond_10000",
    shopType: "LIMITED",
    category: "DIAMOND",
    title: "ダイヤ 10,000個 ＋ オマケ580個",
    description: "有償ダイヤ 10,000個 に無償ダイヤ 580個 の大盛りボーナス！",
    priceJpy: 10000,
    items: [
      { itemId: "DIAMOND", itemName: "ダイヤ", quantity: 10580 }
    ],
    sortOrder: 15
  },


  // ==========================================
  // ■ 通常ショップ商品 (キャッシュ or ダイヤ消費)
  // ==========================================

  {
    id: "normal_energy_10",
    shopType: "NORMAL",
    category: "NORMAL_ITEM",
    title: "エナジードリンク x10",
    description: "スタミナ回復アイテム。路地裏抗争に備える極限カフェイン炭酸10本セット。",
    priceCash: 500,
    priceDiamond: 50,
    items: [
      { itemId: "ENERGY_DRINK", itemName: "エナジードリンク", quantity: 10 }
    ],
    sortOrder: 101
  },
  {
    id: "normal_energy_50",
    shopType: "NORMAL",
    category: "NORMAL_ITEM",
    title: "エナジードリンク x50",
    description: "スタミナ回復アイテム。組織での集中行動を支援する50本セット。",
    priceCash: 2000,
    priceDiamond: 200,
    items: [
      { itemId: "ENERGY_DRINK", itemName: "エナジードリンク", quantity: 50 }
    ],
    sortOrder: 102
  },
  {
    id: "normal_energy_100",
    shopType: "NORMAL",
    category: "NORMAL_ITEM",
    title: "エナジードリンク x100",
    description: "スタミナ回復アイテム。抗争を有利に勝ち抜くお得な100本ケース詰め。",
    priceCash: 3500,
    priceDiamond: 350,
    items: [
      { itemId: "ENERGY_DRINK", itemName: "エナジードリンク", quantity: 100 }
    ],
    sortOrder: 103
  }
];
