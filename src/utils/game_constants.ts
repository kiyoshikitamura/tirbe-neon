export const RAID_BOSS_ID = "88888888-8888-8888-8888-888888888888";
export const TEST_SKILL_ID = "55555555-5555-5555-5555-555555555555";

export const CHARACTER_GROWTH_PATTERNS = [
  { pattern_id: "BALANCED", base_hp: 1500, base_atk: 100, base_def: 80, base_spd: 100, base_luk: 10, hp_gain: 50, atk_gain: 5, def_gain: 4, spd_gain: 0.2, luk_gain: 0.1 },
  { pattern_id: "HP_TANK", base_hp: 2000, base_atk: 80, base_def: 100, base_spd: 90, base_luk: 8, hp_gain: 70, atk_gain: 4, def_gain: 5, spd_gain: 0.15, luk_gain: 0.08 },
  { pattern_id: "ATTACKER", base_hp: 1200, base_atk: 130, base_def: 60, base_spd: 110, base_luk: 12, hp_gain: 40, atk_gain: 7, def_gain: 3, spd_gain: 0.25, luk_gain: 0.12 },
  { pattern_id: "DEFENDER", base_hp: 1600, base_atk: 75, base_def: 110, base_spd: 85, base_luk: 10, hp_gain: 55, atk_gain: 3.5, def_gain: 6, spd_gain: 0.1, luk_gain: 0.1 },
  { pattern_id: "SPEEDSTER", base_hp: 1100, base_atk: 90, base_def: 70, base_spd: 130, base_luk: 15, hp_gain: 35, atk_gain: 4.5, def_gain: 3.5, spd_gain: 0.4, luk_gain: 0.15 },
  { pattern_id: "LUCKY_STAR", base_hp: 1300, base_atk: 85, base_def: 75, base_spd: 105, base_luk: 25, hp_gain: 45, atk_gain: 4, def_gain: 4, spd_gain: 0.2, luk_gain: 0.3 }
];

export const CHARACTER_AWAKENING_MASTER = [
  { awakening_level: 1, required_cash: 3000, hp_bonus: 200, atk_bonus: 20, def_bonus: 15, spd_bonus: 2, luk_bonus: 1 },
  { awakening_level: 2, required_cash: 6000, hp_bonus: 400, atk_bonus: 40, def_bonus: 30, spd_bonus: 4, luk_bonus: 2 },
  { awakening_level: 3, required_cash: 9000, hp_bonus: 600, atk_bonus: 60, def_bonus: 45, spd_bonus: 6, luk_bonus: 3 },
  { awakening_level: 4, required_cash: 12000, hp_bonus: 800, atk_bonus: 80, def_bonus: 60, spd_bonus: 8, luk_bonus: 4 },
  { awakening_level: 5, required_cash: 15000, hp_bonus: 1000, atk_bonus: 100, def_bonus: 75, spd_bonus: 10, luk_bonus: 5 }
];

export const ENEMIES_MASTER = [
  { id: "pvp_dummy_0", name: "リュウ", level: 70, hp: 1200, atk: 90, def: 80, spd: 95, luk: 10, skills: [{ id: "e_skill_0_1", name: "通常攻撃", ap_cost: 1, power: 40, effect_type: "ATTACK" }, { id: "e_skill_0_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "PVP_DUMMY" },
  { id: "pvp_dummy_1", name: "カイ", level: 70, hp: 1200, atk: 90, def: 80, spd: 97, luk: 10, skills: [{ id: "e_skill_1_1", name: "通常攻撃", ap_cost: 1, power: 40, effect_type: "ATTACK" }, { id: "e_skill_1_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "PVP_DUMMY" },
  { id: "pvp_dummy_2", name: "シン", level: 70, hp: 1200, atk: 90, def: 80, spd: 99, luk: 10, skills: [{ id: "e_skill_2_1", name: "通常攻撃", ap_cost: 1, power: 40, effect_type: "ATTACK" }, { id: "e_skill_2_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "PVP_DUMMY" },
  { id: "pvp_dummy_3", name: "ハヤト", level: 70, hp: 1200, atk: 90, def: 80, spd: 101, luk: 10, skills: [{ id: "e_skill_3_1", name: "通常攻撃", ap_cost: 1, power: 40, effect_type: "ATTACK" }, { id: "e_skill_3_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "PVP_DUMMY" },
  { id: "pvp_dummy_4", name: "ユキ", level: 70, hp: 1200, atk: 90, def: 80, spd: 103, luk: 10, skills: [{ id: "e_skill_4_1", name: "通常攻撃", ap_cost: 1, power: 40, effect_type: "ATTACK" }, { id: "e_skill_4_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "PVP_DUMMY" },
  { id: "gvg_defense_0", name: "レイジ", level: 70, hp: 1400, atk: 90, def: 80, spd: 95, luk: 10, skills: [{ id: "e_skill_0_1", name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK" }, { id: "e_skill_0_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "GVG_NPC_DEFENSE" },
  { id: "gvg_defense_1", name: "ルイ", level: 70, hp: 1400, atk: 90, def: 80, spd: 97, luk: 10, skills: [{ id: "e_skill_1_1", name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK" }, { id: "e_skill_1_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "GVG_NPC_DEFENSE" },
  { id: "gvg_defense_2", name: "チャン", level: 70, hp: 1400, atk: 90, def: 80, spd: 99, luk: 10, skills: [{ id: "e_skill_2_1", name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK" }, { id: "e_skill_2_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "GVG_NPC_DEFENSE" },
  { id: "gvg_defense_3", name: "ユウキ", level: 70, hp: 1400, atk: 90, def: 80, spd: 101, luk: 10, skills: [{ id: "e_skill_3_1", name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK" }, { id: "e_skill_3_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "GVG_NPC_DEFENSE" },
  { id: "gvg_defense_4", name: "レオン", level: 70, hp: 1400, atk: 90, def: 80, spd: 103, luk: 10, skills: [{ id: "e_skill_4_1", name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK" }, { id: "e_skill_4_2", name: "通常防御", ap_cost: 1, power: 30, effect_type: "DEFENSE" }], enemy_type: "GVG_NPC_DEFENSE" }
];

export const CHARACTERS_MASTER = [
  { id: "11111111-1111-1111-1111-111111111111", name: "reiji", jpName: "レイジ", title: "歌舞伎町の覇王", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "ORDER", growthPatternId: "BALANCED", rarity: "SSR" },
  { id: "33333333-3333-3333-3333-333333333333", name: "rui", jpName: "ルイ", title: "電気街 of 女王", img: "/rui_transparent_asset.png", homeTown: "akihabara", alignment: "CHAOS", growthPatternId: "SPEEDSTER", rarity: "SSR" },
  { id: "22222222-2222-2222-2222-222222222222", name: "chang", jpName: "チャン", title: "冷徹な毒蛇", img: "/chang_transparent_asset.png", homeTown: "ikebukuro", alignment: "EVIL", growthPatternId: "LUCKY_STAR", rarity: "SSR" },
  { id: "44444444-4444-4444-4444-444444444444", name: "leon", jpName: "レオン", title: "牙", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "EVIL", growthPatternId: "ATTACKER", rarity: "SR" },
  { id: "55555555-5555-5555-5555-555555555555", name: "yuki", jpName: "ユウキ", title: "漆黒 of 執行者", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "ORDER", growthPatternId: "DEFENDER", rarity: "SR" },
  { id: "66666666-6666-6666-6666-666666666666", name: "kaito", jpName: "カイト", title: "夜 of 支配者", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "CHAOS", growthPatternId: "BALANCED", rarity: "SR" },
  { id: "77777777-7777-7777-7777-777777777777", name: "koharu", jpName: "コハル", title: "スピードスター", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "JUSTICE", growthPatternId: "SPEEDSTER", rarity: "SR" },
  { id: "99999999-9999-9999-9999-999999999999", name: "sakura", jpName: "サクラ", title: "紅い暗殺者", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "EVIL", growthPatternId: "ATTACKER", rarity: "SR" },
  { id: "a0000000-0000-0000-0000-000000000009", name: "member_009", jpName: "構成員_009", title: "歌舞伎町のスカウト", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "JUSTICE", growthPatternId: "BALANCED", rarity: "SR" },
  { id: "a0000000-0000-0000-0000-000000000010", name: "member_010", jpName: "構成員_010", title: "渋谷のディーラー", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "EVIL", growthPatternId: "HP_TANK", rarity: "SR" },
  { id: "a0000000-0000-0000-0000-000000000011", name: "member_011", jpName: "構成員_011", title: "池袋のヒットマン", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "ORDER", growthPatternId: "ATTACKER", rarity: "SR" },
  { id: "a0000000-0000-0000-0000-000000000012", name: "member_012", jpName: "構成員_012", title: "六本木の用心棒", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "CHAOS", growthPatternId: "DEFENDER", rarity: "SR" },
  { id: "a0000000-0000-0000-0000-000000000013", name: "member_013", jpName: "構成員_013", title: "秋葉原のハッカー", img: "/reiji_transparent_asset.png", homeTown: "akihabara", alignment: "JUSTICE", growthPatternId: "SPEEDSTER", rarity: "SR" },
  { id: "a0000000-0000-0000-0000-000000000014", name: "member_014", jpName: "構成員_014", title: "川崎の拳闘士", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "EVIL", growthPatternId: "LUCKY_STAR", rarity: "SR" },
  { id: "a0000000-0000-0000-0000-000000000015", name: "member_015", jpName: "構成員_015", title: "横浜の密輸人", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "ORDER", growthPatternId: "BALANCED", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000016", name: "member_016", jpName: "構成員_016", title: "新宿の回収屋", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "CHAOS", growthPatternId: "HP_TANK", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000017", name: "member_017", jpName: "構成員_017", title: "渋谷のスケーター", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "JUSTICE", growthPatternId: "ATTACKER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000018", name: "member_018", jpName: "構成員_018", title: "池袋の用心棒", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "EVIL", growthPatternId: "DEFENDER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000019", name: "member_019", jpName: "構成員_019", title: "六本木のDJ", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "ORDER", growthPatternId: "SPEEDSTER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000020", name: "member_020", jpName: "構成員_020", title: "秋葉原のジャンク屋", img: "/reiji_transparent_asset.png", homeTown: "akihabara", alignment: "CHAOS", growthPatternId: "LUCKY_STAR", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000021", name: "member_021", jpName: "構成員_021", title: "川崎の切り込み隊長", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "JUSTICE", growthPatternId: "BALANCED", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000022", name: "member_022", jpName: "構成員_022", title: "横浜の銃使い", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "EVIL", growthPatternId: "HP_TANK", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000023", name: "member_023", jpName: "構成員_023", title: "新宿の金貸し", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "ORDER", growthPatternId: "ATTACKER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000024", name: "member_024", jpName: "構成員_024", title: "渋谷のダンサー", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "CHAOS", growthPatternId: "DEFENDER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000025", name: "member_025", jpName: "構成員_025", title: "池袋の裏ハッカー", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "JUSTICE", growthPatternId: "SPEEDSTER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000026", name: "member_026", jpName: "構成員_026", title: "六本木のホスト", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "EVIL", growthPatternId: "LUCKY_STAR", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000027", name: "member_027", jpName: "構成員_027", title: "秋葉原のバイヤー", img: "/reiji_transparent_asset.png", homeTown: "akihabara", alignment: "ORDER", growthPatternId: "BALANCED", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000028", name: "member_028", jpName: "構成員_028", title: "川崎のラッパー", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "CHAOS", growthPatternId: "HP_TANK", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000029", name: "member_029", jpName: "構成員_029", title: "横浜の拳銃使い", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "JUSTICE", growthPatternId: "ATTACKER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000030", name: "member_030", jpName: "構成員_030", title: "新宿の運び屋", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "EVIL", growthPatternId: "DEFENDER", rarity: "R" },
  { id: "a0000000-0000-0000-0000-000000000031", name: "member_031", jpName: "構成員_031", title: "渋谷のDJ", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "ORDER", growthPatternId: "SPEEDSTER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000032", name: "member_032", jpName: "構成員_032", title: "池袋の拳闘家", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "CHAOS", growthPatternId: "LUCKY_STAR", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000033", name: "member_033", jpName: "構成員_033", title: "六本木の闇医者", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "JUSTICE", growthPatternId: "BALANCED", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000034", name: "member_034", jpName: "構成員_034", title: "秋葉原のコレクター", img: "/reiji_transparent_asset.png", homeTown: "akihabara", alignment: "EVIL", growthPatternId: "HP_TANK", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000035", name: "member_035", jpName: "構成員_035", title: "川崎の用心棒", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "ORDER", growthPatternId: "ATTACKER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000036", name: "member_036", jpName: "構成員_036", title: "横浜の刀使い", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "CHAOS", growthPatternId: "DEFENDER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000037", name: "member_037", jpName: "構成員_037", title: "新宿の刺青師", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "JUSTICE", growthPatternId: "SPEEDSTER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000038", name: "member_038", jpName: "構成員_038", title: "渋谷のグラフィティアーティスト", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "EVIL", growthPatternId: "LUCKY_STAR", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000039", name: "member_039", jpName: "構成員_039", title: "池袋の狂犬", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "ORDER", growthPatternId: "BALANCED", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000040", name: "member_040", jpName: "構成員_040", title: "六本木のキャバ嬢", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "CHAOS", growthPatternId: "HP_TANK", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000041", name: "member_041", jpName: "構成員_041", title: "秋葉原のディーラー", img: "/reiji_transparent_asset.png", homeTown: "akihabara", alignment: "JUSTICE", growthPatternId: "ATTACKER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000042", name: "member_042", jpName: "構成員_042", title: "川崎の仕切屋", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "EVIL", growthPatternId: "DEFENDER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000043", name: "member_043", jpName: "構成員_043", title: "横浜の香港マフィア", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "ORDER", growthPatternId: "SPEEDSTER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000044", name: "member_044", jpName: "構成員_044", title: "新宿の拳銃密売人", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "CHAOS", growthPatternId: "LUCKY_STAR", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000045", name: "member_045", jpName: "構成員_045", title: "渋谷のバーテンダー", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "JUSTICE", growthPatternId: "BALANCED", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000046", name: "member_046", jpName: "構成員_046", title: "池袋のギャンブラー", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "EVIL", growthPatternId: "HP_TANK", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000047", name: "member_047", jpName: "構成員_047", title: "六本木のIT起業家", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "ORDER", growthPatternId: "ATTACKER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000048", name: "member_048", jpName: "構成員_048", title: "秋葉原のアイドル", img: "/reiji_transparent_asset.png", homeTown: "akihabara", alignment: "CHAOS", growthPatternId: "DEFENDER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000049", name: "member_049", jpName: "構成員_049", title: "川崎のメカニック", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "JUSTICE", growthPatternId: "SPEEDSTER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000050", name: "member_050", jpName: "構成員_050", title: "横浜のボディーガード", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "EVIL", growthPatternId: "LUCKY_STAR", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000051", name: "member_051", jpName: "構成員_051", title: "新宿のストリートギャング", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "ORDER", growthPatternId: "BALANCED", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000052", name: "member_052", jpName: "構成員_052", title: "渋谷のストリートレーサー", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "CHAOS", growthPatternId: "HP_TANK", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000053", name: "member_053", jpName: "構成員_053", title: "池袋のスカウトマン", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "JUSTICE", growthPatternId: "ATTACKER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000054", name: "member_054", jpName: "構成員_054", title: "六本木のイベントオーガナイザー", img: "/reiji_transparent_asset.png", homeTown: "roppongi", alignment: "EVIL", growthPatternId: "DEFENDER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000055", name: "member_055", jpName: "構成員_055", title: "秋葉原のコスプレイヤー", img: "/reiji_transparent_asset.png", homeTown: "akihabara", alignment: "ORDER", growthPatternId: "SPEEDSTER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000056", name: "member_056", jpName: "構成員_056", title: "川崎のラッパー部下", img: "/reiji_transparent_asset.png", homeTown: "kawasaki", alignment: "CHAOS", growthPatternId: "LUCKY_STAR", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000057", name: "member_057", jpName: "構成員_057", title: "横浜の香港系用心棒", img: "/reiji_transparent_asset.png", homeTown: "yokohama", alignment: "JUSTICE", growthPatternId: "BALANCED", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000058", name: "member_058", jpName: "構成員_058", title: "新宿のヤクザ構成員", img: "/reiji_transparent_asset.png", homeTown: "shinjuku", alignment: "EVIL", growthPatternId: "HP_TANK", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000059", name: "member_059", jpName: "構成員_059", title: "渋谷のヒップホップMC", img: "/reiji_transparent_asset.png", homeTown: "shibuya", alignment: "ORDER", growthPatternId: "ATTACKER", rarity: "N" },
  { id: "a0000000-0000-0000-0000-000000000060", name: "member_060", jpName: "構成員_060", title: "池袋のマフィア構成員", img: "/reiji_transparent_asset.png", homeTown: "ikebukuro", alignment: "CHAOS", growthPatternId: "DEFENDER", rarity: "N" }
];

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
  { id: "kitakura_gate", name: "キタクラゲート", alignment: "JUSTICE", controlledBy: "華興幇 (ファンシンバン)", description: "伝統的な和風ネオン看板と鉄骨が入り乱れる歓楽街の入口。伝統的暴力団『黒曜会』の牙城。風俗街 of ショバ代徴収や、闇スロット店・裏バカラの運営権を握る武闘派組織の総本山。" }
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
  const transNames = ["reiji", "rui", "chang", "go", "kengo", "mio", "naoto", "rin", "serika", "shin", "tetsu", "yuji"];
  const cleanName = name.toLowerCase();
  if (transNames.includes(cleanName)) {
    return `/${cleanName}_transparent_asset.png`;
  }
  return `/reiji_transparent_asset.png`;
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

// 友達（Tomodachi）最大登録上限
export const TOMODACHI_MAX_LIMIT = 30;

// ガチャ天井マスタ
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

// ガチャ天井Pt確定交換所マスタ
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


