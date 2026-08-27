import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [guildMasterText, levelMasterText, guildUi, guildHook, mockRpc, migration, dbTest] = await Promise.all([
  read("src/domain/gameplay/canonical/data/guild_production_20260823.json"),
  read("src/domain/gameplay/canonical/data/user_level_progression_20260822.json"),
  read("src/app/components/GuildTab.tsx"),
  read("src/app/context/hooks/useGuild.ts"),
  read("src/utils/mock/mockRpc.ts"),
  read("supabase/migrations/20260828000206_guild_creation_level5_authority.sql"),
  read("supabase/tests/guild-creation-level5.sql"),
]);

const guildMaster = JSON.parse(guildMasterText);
const levelMaster = JSON.parse(levelMasterText);
assert.deepEqual(guildMaster.creation, { userLevel: 5, cashCost: 5000, nameMin: 1, nameMax: 12 });
assert.deepEqual(levelMaster.levels.find((row) => row.level === 5)?.unlockKeys, ["GUILD_CREATION"]);
assert.deepEqual(levelMaster.levels.find((row) => row.level === 8)?.unlockKeys, []);
assert.ok(guildUi.indexOf("guild-lobby-create") < guildUi.indexOf("おすすめギルド"));
assert.ok(guildUi.includes("GUILD_PRODUCTION.creation.userLevel"));
assert.ok(!guildUi.includes("Lv.8で解放"));
assert.ok(guildHook.includes("userLevel < GUILD_PRODUCTION.creation.userLevel"));
assert.ok(!guildHook.includes("プレイヤーレベル8以上"));
assert.ok(mockRpc.includes("Number(user.level || 1) < 5"));
for (const token of [
  "v_user.level < 5",
  "p_creation_cost <> 5000",
  "pg_advisory_xact_lock",
  "role, weekly_contribution, total_contribution",
  "cash = cash - 5000",
  "level = 5 then '[\"GUILD_CREATION\"]'::jsonb",
]) assert.ok(migration.includes(token), `Migration missing: ${token}`);
assert.ok(!migration.includes("Guild rejoin cooldown is active"));
for (const fixture of ["LV4 DENY", "LOW CASH", "LV5 SUCCESS", "LV5 RETRY", "MEMBER DENY", "ROLLBACK"]) {
  assert.ok(dbTest.includes(fixture), `DB test missing: ${fixture}`);
}

console.log(JSON.stringify({ status: "PASS", contract: "GUILD_CREATION_LV5", cashCost: 5000 }, null, 2));
