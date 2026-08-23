import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const master = JSON.parse(await readFile(resolve(root, "src/domain/gameplay/canonical/data/characters_20260821.json"), "utf8"));
const ssr = master.characters.filter((character) => character.rarity === "SSR").map((character) => character.character_id).sort();
const expected = ["char_ageha_01","char_go_01","char_kaede_01","char_karen_01","char_kengo_01","char_koharu_01","char_leo_01","char_mio_01","char_miyabi_01","char_reiji_01"].sort();
assert.equal(master.characters.length, 60);
assert.equal(ssr.length, 10, "Production SSR Character count must remain 10");
assert.deepEqual(ssr, expected, "Canonical Production SSR set drifted");
const tutorialSql = await readFile(resolve(root, "supabase/migrations/20260823000190_tutorial_first_home_canonical_reconciliation.sql"), "utf8");
assert.match(tutorialSql, /draw_gacha_item\('CHAR_SPECIAL','SSR'\)/, "Tutorial guaranteed SSR must draw from the Production SSR pool");
assert.match(tutorialSql, /canonical_character_master/, "Tutorial rarity must resolve from Canonical Character Master");
console.log(JSON.stringify({ status: "PASS", canonicalProductionSsr: ssr, tutorialPool: "CHAR_SPECIAL/SSR", count: 10 }, null, 2));
