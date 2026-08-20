const CHARACTER_LOCATION_BACKGROUNDS: Record<string, string> = {
  shinjuku: "/bg/bg_street_shinjuku.png",
  shibuya: "/bg/bg_street_shibuya.png",
  ikebukuro: "/bg/bg_street_ikebukuro.png",
  roppongi: "/bg/bg_street_roppongi.png",
  akihabara: "/bg/bg_street_akihabara.png",
  kawasaki: "/bg/bg_street_kawasaki.png",
  yokohama: "/bg/bg_street_yokohama.png",
};

export function getCharacterLocationBackground(homeTown: unknown): string {
  return CHARACTER_LOCATION_BACKGROUNDS[String(homeTown || "shinjuku").toLowerCase()]
    || CHARACTER_LOCATION_BACKGROUNDS.shinjuku;
}
