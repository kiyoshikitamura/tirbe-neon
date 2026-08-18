import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  OPEN_BETA_PROVISIONAL_CHARACTERS,
  OPEN_BETA_PROVISIONAL_RARITIES,
} from "../src/constants/open_beta_provisional_characters.ts";

const coreCharacters = [
  ["11111111-1111-1111-1111-111111111111", "reiji"],
  ["33333333-3333-3333-3333-333333333333", "rui"],
  ["22222222-2222-2222-2222-222222222222", "chang"],
  ["char_go_01", "go"], ["char_kengo_01", "kengo"], ["char_mio_01", "mio"],
  ["char_naoto_01", "naoto"], ["char_rin_01", "rin"], ["char_serika_01", "serika"],
  ["char_shin_01", "shin"], ["char_tetsu_01", "tetsu"], ["char_yuji_01", "yuji"],
].map(([id, name]) => ({
  id,
  name,
  rarity: OPEN_BETA_PROVISIONAL_RARITIES[name],
  img: `/characters/${name === "yuji" ? "yuuji" : name}_transparent_asset.png`,
}));

const characters = [...coreCharacters, ...OPEN_BETA_PROVISIONAL_CHARACTERS];

const expectedRarityCounts = { SSR: 10, SR: 20, R: 20, N: 10 };
if (characters.length !== 60) throw new Error(`Expected 60 characters, received ${characters.length}`);

for (const field of ["id", "name"]) {
  const values = characters.map(character => character[field]);
  if (new Set(values).size !== values.length) throw new Error(`Duplicate character ${field}`);
}

for (const [rarity, expected] of Object.entries(expectedRarityCounts)) {
  const actual = characters.filter(character => character.rarity === rarity).length;
  if (actual !== expected) throw new Error(`${rarity}: expected ${expected}, received ${actual}`);
}

for (const character of characters) {
  const assetPath = resolve("public", character.img.replace(/^\//, ""));
  if (!existsSync(assetPath)) throw new Error(`Missing asset for ${character.id}: ${character.img}`);
}

console.log("Open Beta provisional character roster verification passed.");
