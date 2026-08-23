import assert from "node:assert/strict";
import fs from "node:fs";

const characters = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/characters_20260821.json", "utf8")).characters;
const byId = new Map(characters.map((character) => [character.character_id, character]));
const context = fs.readFileSync("src/app/context/GameContext.tsx", "utf8");
const mock = fs.readFileSync("src/utils/mock/mockRpc.ts", "utf8");

assert.equal(characters.length, 60, "Canonical Character count must remain 60");
assert.notEqual(byId.get("char_chang_01")?.rarity, "SSR", "Chang must not be projected as SSR");
assert.match(context, /rarity:\s*character\.rarity/, "Tutorial reveal must use Character Master rarity");
assert.doesNotMatch(context, /rarity:\s*result\.rarity\s*\|\|\s*character\?\.rarity/, "RPC rarity must not drive Character presentation");
assert.match(mock, /canonicalById\.get\(row\.item_id\)\?\.rarity === "SSR"/, "Mock guaranteed pool must use Canonical rarity");
assert.doesNotMatch(mock, /row\.rarity === "SSR"/, "Tutorial mock must not trust pool-local rarity");

console.log("Tutorial Character parity: PASS (60 Canonical characters; reveal and Mock rarity are master-driven)");
