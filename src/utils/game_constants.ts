export { RAID_BOSS_ID, TEST_SKILL_ID, ENEMIES_MASTER } from "@/constants/enemies";
export { CHARACTER_GROWTH_PATTERNS, CHARACTER_AWAKENING_MASTER, CHARACTERS_MASTER } from "@/constants/characters";

export const DISPATCH_COURSES = [
  // 新宿
  { id: "q_shinjuku_easy", townId: "shinjuku", name: "新宿: 見回り (初級)", duration: 15, stamina: 10, rewardCash: 500, rewardItem: "CHAR_EXP_S", chance: 0.8, xpReward: 100 },
  { id: "q_shinjuku_normal", townId: "shinjuku", name: "新宿: 用心棒 (中級)", duration: 45, stamina: 25, rewardCash: 2500, rewardItem: "EQUIP_EXP_S", chance: 0.5, xpReward: 300 },
  { id: "q_shinjuku_hard", townId: "shinjuku", name: "新宿: 利権争い (上級)", duration: 120, stamina: 40, rewardCash: 6000, rewardItem: "LAW_OF_STRIFE", chance: 0.3, xpReward: 500 },
  // 渋谷
  { id: "q_shibuya_easy", townId: "shibuya", name: "渋谷: パトロール (初級)", duration: 15, stamina: 10, rewardCash: 500, rewardItem: "CHAR_EXP_S", chance: 0.8, xpReward: 100 },
  { id: "q_shibuya_normal", townId: "shibuya", name: "渋谷: 摘発支援 (中級)", duration: 45, stamina: 25, rewardCash: 2500, rewardItem: "EQUIP_EXP_S", chance: 0.5, xpReward: 300 },
  { id: "q_shibuya_hard", townId: "shibuya", name: "渋谷: 流通支配 (上級)", duration: 120, stamina: 40, rewardCash: 6000, rewardItem: "LAW_OF_STRIFE", chance: 0.3, xpReward: 500 },
  // 池袋
  { id: "q_ikebukuro_easy", townId: "ikebukuro", name: "池袋: 巡回 (初級)", duration: 15, stamina: 10, rewardCash: 500, rewardItem: "CHAR_EXP_S", chance: 0.8, xpReward: 100 },
  { id: "q_ikebukuro_normal", townId: "ikebukuro", name: "池袋: ショバ代徴収 (中級)", duration: 45, stamina: 25, rewardCash: 2500, rewardItem: "EQUIP_EXP_S", chance: 0.5, xpReward: 300 },
  { id: "q_ikebukuro_hard", townId: "ikebukuro", name: "池袋: 運営権強奪 (上級)", duration: 120, stamina: 40, rewardCash: 6000, rewardItem: "LAW_OF_STRIFE", chance: 0.3, xpReward: 500 },
  // 六本木
  { id: "q_roppongi_easy", townId: "roppongi", name: "六本木: 案内 (初級)", duration: 15, stamina: 10, rewardCash: 500, rewardItem: "CHAR_EXP_S", chance: 0.8, xpReward: 100 },
  { id: "q_roppongi_normal", townId: "roppongi", name: "六本木: カジノ警備 (中級)", duration: 45, stamina: 25, rewardCash: 2500, rewardItem: "EQUIP_EXP_S", chance: 0.5, xpReward: 300 },
  { id: "q_roppongi_hard", townId: "roppongi", name: "六本木: 現金輸送 (上級)", duration: 120, stamina: 40, rewardCash: 6000, rewardItem: "LAW_OF_STRIFE", chance: 0.3, xpReward: 500 },
  // 秋葉原
  { id: "q_akihabara_easy", townId: "akihabara", name: "秋葉原: ジャンク回収 (初級)", duration: 15, stamina: 10, rewardCash: 500, rewardItem: "CHAR_EXP_S", chance: 0.8, xpReward: 100 },
  { id: "q_akihabara_normal", townId: "akihabara", name: "秋葉原: 情報買収 (中級)", duration: 45, stamina: 25, rewardCash: 2500, rewardItem: "EQUIP_EXP_S", chance: 0.5, xpReward: 300 },
  { id: "q_akihabara_hard", townId: "akihabara", name: "秋葉原: チップ密売 (上級)", duration: 120, stamina: 40, rewardCash: 6000, rewardItem: "LAW_OF_STRIFE", chance: 0.3, xpReward: 500 },
  // 川崎
  { id: "q_kawasaki_easy", townId: "kawasaki", name: "川崎: 偵察任務 (初級)", duration: 15, stamina: 10, rewardCash: 500, rewardItem: "CHAR_EXP_S", chance: 0.8, xpReward: 100 },
  { id: "q_kawasaki_normal", townId: "kawasaki", name: "川崎: 闘技場対応 (中級)", duration: 45, stamina: 25, rewardCash: 2500, rewardItem: "EQUIP_EXP_S", chance: 0.5, xpReward: 300 },
  { id: "q_kawasaki_hard", townId: "kawasaki", name: "川崎: 密輸支援 (上級)", duration: 120, stamina: 40, rewardCash: 6000, rewardItem: "LAW_OF_STRIFE", chance: 0.3, xpReward: 500 },
  // 横浜
  { id: "q_yokohama_easy", townId: "yokohama", name: "横浜: 裏路地見回り (初級)", duration: 15, stamina: 10, rewardCash: 500, rewardItem: "CHAR_EXP_S", chance: 0.8, xpReward: 100 },
  { id: "q_yokohama_normal", townId: "yokohama", name: "横浜: 倉庫警護 (中級)", duration: 45, stamina: 25, rewardCash: 2500, rewardItem: "EQUIP_EXP_S", chance: 0.5, xpReward: 300 },
  { id: "q_yokohama_hard", townId: "yokohama", name: "横浜: 会談警備 (上級)", duration: 120, stamina: 40, rewardCash: 6000, rewardItem: "LAW_OF_STRIFE", chance: 0.3, xpReward: 500 }
];

export const BASE_MAP_MASTER = [
  { id: "neon_tower", name: "ネオンタワー", alignment: "ORDER", controlledBy: "黒曜会 (コクヨウカイ)", description: "高級キャバクラやホストクラブ、飲食店、違法IT取引、暗号資産の国際マネーロンダリングなどTOKYO of 夜の歓楽街のトップとして富裕層や犯罪者が街を見下ろしている。" },
  { id: "deep_dock", name: "ディープドック", alignment: "EVIL", controlledBy: "龍頭会 (リュウズカイ)", description: "重厚な港湾設備と薄暗い廃倉庫群。臨海地区のコンテナ密輸ルート、非合法地下格闘技（デスマッチ）、および武装ストリートギャング of たまり場。" },
  { id: "junk_bazar", name: "ジャンクバザール", alignment: "CHAOS", controlledBy: "裏情報屋グリッド", description: "雑多なネオン看板とジャンク電子パーツがひしめく闇市。違法ハッキングチップの売買、違法ジャンク武器の密売、コンカフェを介した情報売買などの闇情報ネットワークの巣窟。" },
  { id: "kitakura_gate", name: "キタクラゲート", alignment: "JUSTICE", controlledBy: "華興幇 (ファンシンバン)", description: "北倉地区の地下深くに広がるアングラ地下立体駐車場。暴走集団や裏取引が集う危険な地下アジト関門。" }
];

export const GEAR_SLOTS_MASTER = [
  { index: 0, label: "武器1", type: "WEAPON" },
  { index: 1, label: "武器2", type: "WEAPON" },
  { index: 2, label: "頭防具", type: "HEAD" },
  { index: 3, label: "胴防具", type: "BODY" },
  { index: 4, label: "脚防具", type: "LEGS" },
  { index: 5, label: "アクセ1", type: "ACCESSORY" },
  { index: 6, label: "アクセ2", type: "ACCESSORY" }
];

export const STORY_EPISODES_MASTER: { [key: string]: {
  title: string;
  intro: Array<{ speaker: string; img: string; expression: string; text: string }>;
  outro: Array<{ speaker: string; img: string; expression: string; text: string }>;
} } = {
  stage_tutorial_01: {
    title: "PvP模擬戦: 新宿南部連合との接触",
    intro: [
      { speaker: "レイジ", img: "/reiji_transparent_asset.png", expression: "通常", text: "キョウジ、PvP模擬戦の準備はいいか？俺たちの連携力を見せてやろう。" },
      { speaker: "ルイ", img: "/rui_transparent_asset.png", expression: "笑顔", text: "対戦相手のシミュレーションデータをグリッドに同期したよ！勝率は99.8%！" },
      { speaker: "チャン", img: "/chang_transparent_asset.png", expression: "真剣", text: "ふん、油断するな。敵も新宿南部連合の精鋭だ。牙を剥いてくるぞ。" }
    ],
    outro: [
      { speaker: "レイジ", img: "/reiji_transparent_asset.png", expression: "真剣", text: "フッ、模擬戦とはいえ上々の結果だ。やはりお前の指揮能力は本物だな。" },
      { speaker: "ルイ", img: "/rui_transparent_asset.png", expression: "通常", text: "うん！キャッシュとダイヤの報酬もしっかりプレゼントボックスに転送しといたよ！" },
      { speaker: "チャン", img: "/chang_transparent_asset.png", expression: "笑顔", text: "冷酷な毒蛇も, お前の指揮下なら悪くない...さあ、次は本番のシノギだ。" }
    ]
  },
  area_shibuya_liberation: {
    title: "渋谷制圧イベント: クラブ街の奪還",
    intro: [
      { speaker: "ルイ", img: "/rui_transparent_asset.png", expression: "笑顔", text: "やった！渋谷エリアの支配率で自組織が1位に躍り出たよ！渋谷ノイズを完全に制圧！" },
      { speaker: "レイジ", img: "/reiji_transparent_asset.png", expression: "通常", text: "渋谷のクラブ街もこれで俺たちのショバだ。組織の資金源が大きく潤うな。" },
      { speaker: "チャン", img: "/chang_transparent_asset.png", expression: "真剣", text: "だが、黒曜会が黙っていないはずだ。防衛部隊の再配備を急ぐべきだな。" }
    ],
    outro: []
  }
};

export const MASTER_AVATARS = [
  { url: "/reiji_transparent_asset.png", label: "レイジ" },
  { url: "/rui_transparent_asset.png", label: "ルイ" },
  { url: "/chang_transparent_asset.png", label: "チャン" }
];

export const PROFILE_BACKGROUNDS = [
  { id: "bg_default", name: "新宿アジト", img: "/shinjuku_neon_icon_1783765789862.png", desc: "初期解放" },
  { id: "bg_kabukicho", name: "新宿ネオン街", img: "/shinjuku_neon_icon_1783765789862.png", desc: "Lv.5以上で解放" },
  { id: "bg_wharf", name: "東京ドック埠頭", img: "/tokyo_map.png", desc: "ギルド加入で解放" },
  { id: "bg_bazar", name: "渋谷スクランブル", img: "/shibuya_scramble.png", desc: "20,000キャッシュ以上で解放" }
];

export const PROFILE_FRONT_EFFECTS = [
  { id: "effect_none", name: "エフェクトなし", desc: "初期解放" },
  { id: "effect_lightning", name: "紫電一閃 (稲妻)", desc: "PvP 1,050点以上で解放" },
  { id: "effect_sparks", name: "百花繚乱 (火の粉)", desc: "Lv.10以上で解放" },
  { id: "effect_smoke", name: "硝煙黙示録 (煙)", desc: "3名以上のキャラ解放で解放" }
];

export const PROFILE_TITLES = [
  { id: "title_none", name: "称号なし", desc: "初期解放" },
  { id: "title_kabukicho_emperor", name: "歌舞伎町の覇王", desc: "Lv.15以上で解放" },
  { id: "title_neon_overlord", name: "ネオンの支配者", desc: "300ダイヤ以上所持で解放" },
  { id: "title_gvg_champion", name: "制圧戦覇者", desc: "ギルド加入で解放" }
];

export function getCharacterStaticImg(name: string): string {
  const staticNames = ["reiji", "rui", "chang", "go", "kengo", "mio", "naoto", "rin", "serika", "shin", "tetsu", "yuji"];
  const cleanName = name.toLowerCase();
  if (staticNames.includes(cleanName)) {
    return `/${cleanName}_final_asset.png`;
  }
  return `/reiji_final_asset.png`;
}

export function getCharacterTransparentImg(name: string): string {
  if (!name) return `/characters/reiji_transparent_asset.png`;
  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return `/characters/${cleanName}_transparent_asset.png`;
}

export function getAlignmentShortJp(align: string): { label: string; colorClass: string } {
  switch (align) {
    case "ORDER":
    case "秩序":
      return { label: "秩", colorClass: "align-order" };
    case "JUSTICE":
    case "正義":
      return { label: "正", colorClass: "align-justice" };
    case "CHAOS":
    case "混沌":
      return { label: "混", colorClass: "align-chaos" };
    case "EVIL":
    case "悪":
      return { label: "悪", colorClass: "align-evil" };
    default:
      return { label: "他", colorClass: "align-none" };
  }
}

export const TOMODACHI_MAX_LIMIT = 30;

export const GACHA_PITY_MASTERS = [
  {
    id: "pity_gacha_standard_01",
    gacha_id: "gacha_standard",
    pity_threshold: 200,
    currency_name: "ガチャPt",
    start_at: "2026-01-01T00:00:00Z",
    end_at: "2027-12-31T23:59:59Z"
  }
];

export const GACHA_EXCHANGE_ITEMS_MASTER = [
  {
    id: "ex_c_reiji_01",
    pity_master_id: "pity_gacha_standard_01",
    reward_type: "CHARACTER",
    reward_id: "11111111-1111-1111-1111-111111111111",
    reward_name: "[SSR] 狂犬のレイジ",
    required_points: 200,
    limit_per_user: 1
  },
  {
    id: "ex_c_rui_01",
    pity_master_id: "pity_gacha_standard_01",
    reward_type: "CHARACTER",
    reward_id: "33333333-3333-3333-3333-333333333333",
    reward_name: "[SSR] 女王のルイ",
    required_points: 200,
    limit_per_user: 1
  },
  {
    id: "ex_c_chang_01",
    pity_master_id: "pity_gacha_standard_01",
    reward_type: "CHARACTER",
    reward_id: "22222222-2222-2222-2222-222222222222",
    reward_name: "[SSR] 毒蛇のチャン",
    required_points: 200,
    limit_per_user: 1
  },
  {
    id: "ex_eq_neon_blade_01",
    pity_master_id: "pity_gacha_standard_01",
    reward_type: "EQUIPMENT",
    reward_id: "eq_w_01",
    reward_name: "[SSR] ネオン・ドミネーター",
    required_points: 150,
    limit_per_user: 3
  }
];
