"use client";

import {
  OPEN_BETA_PROVISIONAL_CHARACTERS,
  OPEN_BETA_PROVISIONAL_RARITIES,
} from "./open_beta_provisional_characters";

export const CHARACTER_GROWTH_PATTERNS = [
  { pattern_id: "BALANCED", base_hp: 1500, base_atk: 100, base_def: 80, base_spd: 100, base_luk: 10, hp_gain: 50, atk_gain: 5, def_gain: 4, spd_gain: 0.2, luk_gain: 0.1 },
  { pattern_id: "HP_TANK", base_hp: 2000, base_atk: 80, base_def: 100, base_spd: 90, base_luk: 8, hp_gain: 70, atk_gain: 4, def_gain: 5, spd_gain: 0.15, luk_gain: 0.08 },
  { pattern_id: "ATTACKER", base_hp: 1200, base_atk: 130, base_def: 60, base_spd: 110, base_luk: 12, hp_gain: 40, atk_gain: 7, def_gain: 3, spd_gain: 0.25, luk_gain: 0.12 },
  { pattern_id: "DEFENDER", base_hp: 1600, base_atk: 75, base_def: 110, base_spd: 85, base_luk: 10, hp_gain: 55, atk_gain: 3.5, def_gain: 6, spd_gain: 0.1, luk_gain: 0.1 },
  { pattern_id: "SPEEDSTER", base_hp: 1100, base_atk: 90, base_def: 70, base_spd: 130, base_luk: 15, hp_gain: 35, atk_gain: 4.5, def_gain: 3.5, spd_gain: 0.4, luk_gain: 0.15 },
  { pattern_id: "LUCKY_STAR", base_hp: 1300, base_atk: 85, base_def: 75, base_spd: 105, base_luk: 25, hp_gain: 45, atk_gain: 4, def_gain: 4, spd_gain: 0.2, luk_gain: 0.3 }
];

export const CHARACTER_AWAKENING_MASTER = [
    { awakening_level: 1, required_cash: 5000, hp_bonus: 100, atk_bonus: 10, def_bonus: 10, spd_bonus: 2, luk_bonus: 2 },
    { awakening_level: 2, required_cash: 15000, hp_bonus: 250, atk_bonus: 25, def_bonus: 25, spd_bonus: 5, luk_bonus: 5 },
    { awakening_level: 3, required_cash: 35000, hp_bonus: 500, atk_bonus: 50, def_bonus: 50, spd_bonus: 10, luk_bonus: 10 },
    { awakening_level: 4, required_cash: 75000, hp_bonus: 850, atk_bonus: 85, def_bonus: 85, spd_bonus: 15, luk_bonus: 15 },
    { awakening_level: 5, required_cash: 150000, hp_bonus: 1300, atk_bonus: 130, def_bonus: 130, spd_bonus: 25, luk_bonus: 25 }
  ];

const CORE_CHARACTERS_MASTER = [
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "reiji",
    "jpName": "レイジ",
    "title": "歌舞伎町の覇王",
    "homeTown": "shinjuku",
    "alignment": "ORDER",
    "growthPatternId": "BALANCED",
    "rarity": "SSR",
    "img": "/reiji_transparent_asset.png",
    "visualPrompt": "japanese male outlaw leader, sleek matte black tactical suit, sharp gaze, neon background"
  },
  {
    "id": "33333333-3333-3333-3333-333333333333",
    "name": "rui",
    "jpName": "ルイ",
    "title": "電気街の女王",
    "homeTown": "akihabara",
    "alignment": "CHAOS",
    "growthPatternId": "SPEEDSTER",
    "rarity": "SSR",
    "img": "/rui_transparent_asset.png",
    "visualPrompt": "japanese female hacker leader, stylish streetwear, bob hair, confident smirk"
  },
  {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "chang",
    "jpName": "チャン",
    "title": "冷酷なる毒蛇",
    "homeTown": "ikebukuro",
    "alignment": "EVIL",
    "growthPatternId": "ATTACKER",
    "rarity": "SSR",
    "img": "/chang_transparent_asset.png",
    "visualPrompt": "japanese male outlaw assassin, long coat, cold calculating posture, crimson accents"
  },
  {
    "id": "char_go_01",
    "name": "go",
    "jpName": "ゴウ",
    "title": "剛鉄の拳",
    "homeTown": "shinjuku",
    "alignment": "ORDER",
    "growthPatternId": "HP_TANK",
    "rarity": "SR",
    "img": "/characters/go_transparent_asset.png",
    "visualPrompt": "muscular male brawler, scar on cheek, leather jacket"
  },
  {
    "id": "char_kengo_01",
    "name": "kengo",
    "jpName": "ケンゴ",
    "title": "疾風のナイフ",
    "homeTown": "shibuya",
    "alignment": "CHAOS",
    "growthPatternId": "SPEEDSTER",
    "rarity": "SR",
    "img": "/characters/kengo_transparent_asset.png",
    "visualPrompt": "agile male rogue, hood up, metallic knives"
  },
  {
    "id": "char_mio_01",
    "name": "mio",
    "jpName": "ミオ",
    "title": "爆破の魔女",
    "homeTown": "akihabara",
    "alignment": "CHAOS",
    "growthPatternId": "ATTACKER",
    "rarity": "SR",
    "img": "/characters/mio_transparent_asset.png",
    "visualPrompt": "female demolitions expert, goggles on head, cyber explosives"
  },
  {
    "id": "char_naoto_01",
    "name": "naoto",
    "jpName": "ナオト",
    "title": "銀髪のスナイパー",
    "homeTown": "roppongi",
    "alignment": "JUSTICE",
    "growthPatternId": "ATTACKER",
    "rarity": "SR",
    "img": "/characters/naoto_transparent_asset.png",
    "visualPrompt": "silver-haired male sniper, long trenchcoat, scope"
  },
  {
    "id": "char_rin_01",
    "name": "rin",
    "jpName": "リン",
    "title": "氷の医術師",
    "homeTown": "ikebukuro",
    "alignment": "ORDER",
    "growthPatternId": "BALANCED",
    "rarity": "SR",
    "img": "/characters/rin_transparent_asset.png",
    "visualPrompt": "cool female medic, glasses, syringe and medical kit"
  },
  {
    "id": "char_serika_01",
    "name": "serika",
    "jpName": "セリカ",
    "title": "魅惑のディーラー",
    "homeTown": "ginza",
    "alignment": "EVIL",
    "growthPatternId": "LUCKY_STAR",
    "rarity": "SR",
    "img": "/characters/serika_transparent_asset.png",
    "visualPrompt": "glamorous female casino dealer, playing cards, dark dress"
  },
  {
    "id": "char_shin_01",
    "name": "shin",
    "jpName": "シン",
    "title": "影の 情報屋",
    "homeTown": "shinjuku",
    "alignment": "EVIL",
    "growthPatternId": "SPEEDSTER",
    "rarity": "SR",
    "img": "/characters/shin_transparent_asset.png",
    "visualPrompt": "shadowy male informant, dark suit, earpiece"
  },
  {
    "id": "char_tetsu_01",
    "name": "tetsu",
    "jpName": "テツ",
    "title": "鉄壁の重甲士",
    "homeTown": "ueno",
    "alignment": "JUSTICE",
    "growthPatternId": "DEFENDER",
    "rarity": "SR",
    "img": "/characters/tetsu_transparent_asset.png",
    "visualPrompt": "armored male enforcer, heavy shield, stern face"
  },
  {
    "id": "char_yuji_01",
    "name": "yuji",
    "jpName": "ユウジ",
    "title": "街角の喧嘩屋",
    "homeTown": "shibuya",
    "alignment": "CHAOS",
    "growthPatternId": "BALANCED",
    "rarity": "N",
    "img": "/characters/yuji_transparent_asset.png",
    "visualPrompt": "streetpunk young male, dyed hair, denim vest"
  }
];

export const CHARACTERS_MASTER = [
  ...CORE_CHARACTERS_MASTER.map(character => ({
    ...character,
    rarity: OPEN_BETA_PROVISIONAL_RARITIES[character.name] || character.rarity,
    img: `/characters/${character.name === "yuji" ? "yuuji" : character.name}_transparent_asset.png`,
  })),
  ...OPEN_BETA_PROVISIONAL_CHARACTERS,
];
