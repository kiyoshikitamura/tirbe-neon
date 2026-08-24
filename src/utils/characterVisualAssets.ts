const CHARACTER_LOCATION_BACKGROUNDS: Record<string, string> = {
  shinjuku: "/bg/bg_street_shinjuku.png",
  shibuya: "/bg/bg_street_shibuya.png",
  ikebukuro: "/bg/bg_street_ikebukuro.png",
  roppongi: "/bg/bg_street_roppongi.png",
  akihabara: "/bg/bg_street_akihabara.png",
  kawasaki: "/bg/bg_street_kawasaki.png",
  yokohama: "/bg/bg_street_yokohama.png",
};

const CHARACTER_LOCATION_KEYS: Record<string, keyof typeof CHARACTER_LOCATION_BACKGROUNDS> = {
  shinjuku: "shinjuku", "新宿": "shinjuku",
  shibuya: "shibuya", "渋谷": "shibuya",
  ikebukuro: "ikebukuro", "池袋": "ikebukuro",
  roppongi: "roppongi", "六本木": "roppongi",
  akihabara: "akihabara", "秋葉原": "akihabara",
  kawasaki: "kawasaki", "川崎": "kawasaki",
  yokohama: "yokohama", "横浜": "yokohama",
};

export function resolveCharacterLocationKey(homeTown: unknown): string | null {
  return CHARACTER_LOCATION_KEYS[String(homeTown || "").trim().toLowerCase()] || null;
}

export function getCharacterLocationBackground(homeTown: unknown): string {
  const locationKey = resolveCharacterLocationKey(homeTown);
  return CHARACTER_LOCATION_BACKGROUNDS[locationKey || "shinjuku"];
}
