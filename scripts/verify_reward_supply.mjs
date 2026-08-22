import assert from "node:assert/strict";
import fs from "node:fs";

const supply = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/reward_supply_20260822.json", "utf8"));
const missions = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/missions_20260821.json", "utf8")).missions;
const sources = new Map(supply.sources.map((source) => [source.source, source]));

assert.deepEqual([...sources.keys()].sort(), ["GACHA", "ITEM_IDENTITY", "LOGIN_BONUS", "MISSION", "PVP", "QUEST", "RAID", "RANKING"].sort());
assert.equal(sources.get("MISSION").status, "FROZEN");
assert.equal(sources.get("LOGIN_BONUS").status, "FROZEN");
assert.equal(sources.get("QUEST").status, "FROZEN");
for (const source of ["PVP", "RAID", "RANKING"]) assert.equal(sources.get(source).status, "FROZEN");
assert.equal(missions.length, 37);
assert.equal(missions.filter((mission) => mission.category === "DAILY").length, 4);
assert.equal(missions.filter((mission) => mission.category === "NORMAL").length, 33);
assert.equal(missions.filter((mission) => mission.category === "WEEKLY").length, 0);
assert.equal(missions.filter((mission) => mission.isProvisional !== false || !mission.isEnabled).length, 0);
console.log("Reward Supply verification PASS: Mission, Login, Quest, PvP, Raid and Ranking frozen.");
