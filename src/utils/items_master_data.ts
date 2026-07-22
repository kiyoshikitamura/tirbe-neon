export interface ItemMaster {
  id: string;
  name: string;
  category: "CONSUMABLE" | "CHAR_EXP" | "EQUIP_EXP" | "AWAKEN" | "LIMIT_BREAK";
  description: string;
  iconType: string;
  effectValue?: number;
}

export const ITEMS_MASTER_DATA: ItemMaster[] = [
  // --- 回復・消耗品 ---
  {
    id: "ENERGY_DRINK",
    name: "エナジードリンク",
    category: "CONSUMABLE",
    description: "歓楽街で出回る極限カフェイン炭酸。スタミナを 50 回復 (現在値100未満で使用可)。",
    iconType: "ENERGY_DRINK",
    effectValue: 50
  },

  // --- キャラクター強化素材 (EXP) ---
  {
    id: "CHAR_EXP_S",
    name: "経験の書 [小]",
    category: "CHAR_EXP",
    description: "喧嘩のコツや路地裏の噂が記されたメモ。キャラEXP +500。",
    iconType: "BOOK_S",
    effectValue: 500
  },
  {
    id: "CHAR_EXP_M",
    name: "経験の書 [中]",
    category: "CHAR_EXP",
    description: "組織戦の駆け引きと交渉術が記されたノート。キャラEXP +2,000。",
    iconType: "BOOK_M",
    effectValue: 2000
  },
  {
    id: "CHAR_EXP_L",
    name: "経験の書 [大]",
    category: "CHAR_EXP",
    description: "裏社会の生き残りと統率の極意が記された秘伝書。キャラEXP +10,000。",
    iconType: "BOOK_L",
    effectValue: 10000
  },

  // --- 装備品強化素材 (EXP) ---
  {
    id: "EQUIP_EXP_S",
    name: "カスタムオイル [小]",
    category: "EQUIP_EXP",
    description: "標準的な装備手入れ用オイル。装備EXP +100。",
    iconType: "OIL_S",
    effectValue: 100
  },
  {
    id: "EQUIP_EXP_M",
    name: "カスタムオイル [中]",
    category: "EQUIP_EXP",
    description: "金属の耐摩耗性と切れ味を高める高純度オイル。装備EXP +500。",
    iconType: "OIL_M",
    effectValue: 500
  },
  {
    id: "EQUIP_EXP_L",
    name: "カスタムオイル [大]",
    category: "EQUIP_EXP",
    description: "軍用規格の最高級金属コーティング材。装備EXP +2,500。",
    iconType: "OIL_L",
    effectValue: 2500
  },

  // --- 覚醒・限界突破素材 ---
  {
    id: "LAW_OF_STRIFE",
    name: "覚醒の書",
    category: "AWAKEN",
    description: "組織への絶対の忠誠と誓約が刻まれた書物。キャラクターの「覚醒」（レベル上限解放）に使用。",
    iconType: "AWAKEN_BOOK"
  },
  {
    id: "SKILL_LB_BOOK",
    name: "限界突破の書 [スキル]",
    category: "LIMIT_BREAK",
    description: "同名カードがない場合に、通常スキルカードを限界突破できる代用書物。",
    iconType: "SKILL_LB"
  },
  {
    id: "EXCLUSIVE_CONTRACT",
    name: "限界突破の書 [専用スキル]",
    category: "LIMIT_BREAK",
    description: "同名カードがない場合に、専用スキルカードを限界突破できる代用書物。",
    iconType: "EXCLUSIVE_LB"
  },
  {
    id: "EQUIP_LB_HAMMER",
    name: "万能カスタムツール [装備]",
    category: "LIMIT_BREAK",
    description: "同名予備装備がない場合に、あらゆる装備品を限界突破できる代用万能工具。",
    iconType: "EQUIP_LB"
  }
];
