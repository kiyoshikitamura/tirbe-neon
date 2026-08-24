import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCharacterLocationBackground, resolveCharacterLocationKey } from "../src/utils/characterVisualAssets.ts";

const root = resolve(import.meta.dirname, "..");
const canonical = JSON.parse(await readFile(resolve(root, "src/domain/gameplay/canonical/data/characters_20260821.json"), "utf8"));
const characters = canonical.characters;

assert.equal(characters.length, 60, "Canonical Character count must remain 60");
const locationKeys = new Set();
const paths = new Set();

for (const character of characters) {
  const locationKey = resolveCharacterLocationKey(character.hometown);
  assert.ok(locationKey, `Unknown Canonical hometown: ${character.character_id} / ${character.hometown}`);
  const backgroundPath = getCharacterLocationBackground(character.hometown);
  assert.ok(backgroundPath.includes(`_${locationKey}.png`), `Wrong Town background: ${character.character_id} / ${character.hometown} -> ${backgroundPath}`);
  await access(resolve(root, "public", backgroundPath.replace(/^\//, "")));
  locationKeys.add(locationKey);
  paths.add(backgroundPath);
}

assert.equal(locationKeys.size, 7, "All seven Canonical Towns must be represented");
assert.equal(paths.size, 7, "All seven Town backgrounds must resolve distinctly");

const modal = await readFile(resolve(root, "src/app/components/CommonModals.tsx"), "utf8");
assert.match(modal, /CHARACTERS_MASTER\.find\(\(character: any\) => character\.id === result\?\.characterId\)/, "Gacha result must resolve Canonical Character Master by ID");
assert.match(modal, /getCharacterLocationBackground\(master\?\.homeTown\)/, "Gacha result background must use Canonical hometown");

console.log(JSON.stringify({ status: "PASS", characters: characters.length, towns: locationKeys.size, backgrounds: paths.size, missing: 0, wrongMapping: 0 }, null, 2));
