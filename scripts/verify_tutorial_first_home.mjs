import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync("src/app/components/HomeTab.tsx", "utf8");
const header = fs.readFileSync("src/app/components/Header.tsx", "utf8");
const context = fs.readFileSync("src/app/context/GameContext.tsx", "utf8");
const raid = fs.readFileSync("src/app/context/hooks/useRaid.ts", "utf8");
const mock = fs.readFileSync("src/utils/mock/mockRpc.ts", "utf8");
const manifest = fs.readFileSync("src/app/lib/screenManifests.ts", "utf8");
const character = fs.readFileSync("src/app/components/CharacterTab.tsx", "utf8");

assert.match(mock, /current_base_id:\s*"shinjuku"/, "Fresh Mock town must be Shinjuku");
assert.match(mock, /user\.favorite_character_id = owned\[0\]\.character_id/, "Mock tutorial leader must persist");
for (const town of ["shinjuku", "shibuya", "ikebukuro", "roppongi", "akihabara", "kawasaki", "yokohama"]) {
  assert.ok(home.includes(`file: "${town}"`), `Home background is missing ${town}`);
  assert.ok(fs.existsSync(`public/bg/bg_street_${town}.png`), `Canonical town background is missing ${town}`);
}
assert.doesNotMatch(home, /bg_base_|ネオンタワー|ディープドック|ジャンクバザール|キタクラゲート/, "Legacy Home town projection remains active");
assert.match(context, /setSelectedLeader\(String\(tutorialFormation\.leader_character_id\)\)/, "Tutorial leader must update client state immediately");
assert.match(context, /supabase\.rpc\("get_active_raids"\)/, "Home Raid state must use the server projection");
assert.match(raid, /useState<number>\(0\)/, "Raid activity must start inactive");
assert.doesNotMatch(header, /AP \(Action Point\)|>VIT</, "Header must not expose AP/VIT legacy labels");
assert.match(header, />Vitality</, "Header must expose the canonical resource name");
assert.match(header, /自然回復停止/);
assert.doesNotMatch(header, /userTitle \|\| "半グレの首領"/, "Header must not invent a default title");
assert.doesNotMatch(manifest, /icon_friends/, "Friend must not be preloaded by the active shell");
assert.match(character, /TUTORIAL_SKILL_STEP[\s\S]*育成へ進む[\s\S]*TUTORIAL_GROWTH_STEP[\s\S]*Lv\.7まで強化/, "Tutorial must present Skill then visible Growth");
assert.ok(character.indexOf('advance_current_tutorial_after_growth') < character.indexOf('setFormationEditMode(true)'), "Formation must unlock only after authoritative Growth");
assert.match(mock, /requiredLevel = 7[\s\S]*requiredQuantity[\s\S]*cash_cost: requiredQuantity \* 100/, "Mock must share Lv7 Canonical Growth supply semantics");
assert.doesNotMatch(character, /tutorial.*(?:damage|atk|def|hp).*multiplier/i, "Client must not add hidden tutorial combat modifiers");

console.log("Tutorial -> First Home projection: PASS (Mock state, leader, town, Vitality, Raid, Friend, title)");
