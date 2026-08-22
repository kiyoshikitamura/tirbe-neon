import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile("supabase/migrations/20260822000176_user_level_action_resource_foundation.sql", "utf8");
const accessSql = await readFile("supabase/migrations/20260822000177_user_level_rpc_access.sql", "utf8");
const projectionSql = await readFile("supabase/migrations/20260822000178_action_resource_recovery_projection.sql", "utf8");
const finalSql = await readFile("supabase/migrations/20260822000179_user_level_recovery_ticket_final.sql", "utf8");
const capConstraintSql = await readFile("supabase/migrations/20260822000180_user_level_cap_constraint.sql", "utf8");
const pvpRuntime = await readFile("src/hooks/useBattle.ts", "utf8");
const pvpUi = await readFile("src/app/components/PvpTab.tsx", "utf8");
const raidUi = await readFile("src/app/components/RaidTab.tsx", "utf8");
for (const required of [
  "canonical_user_level_master", "canonical_action_resource_master", "canonical_quest_resource_cost",
  "raid_points", "raid_free_entry_consumed", "/360)", "/7200)",
  "v_user.level<5", "remaining_raid_points", "v_vitality+50>500",
  "where version='2026-08-22' and level=v_level", "p_creation_cost <> 5000",
]) assert(sql.includes(required) || (required === "p_creation_cost <> 5000" && (await readFile("supabase/migrations/20260805000060_guild_creation_and_join_security.sql", "utf8")).includes(required)), `Missing ${required}`);
for (const forbidden of ["/ 3600)", "least(vitality + 50, 200)", "attempt_count+1", "v_cost_type='CASH'", "v_cost_type='DIAMOND'"]) {
  assert(!sql.toLowerCase().includes(forbidden.toLowerCase()), `Legacy action-resource contract remains: ${forbidden}`);
}
assert.equal((sql.match(/\('2026-08-22',\d+,/g) || []).length, 8);
assert(sql.includes("(1,100),(2,150),(3,200),(4,250),(5,300),(6,350),(7,400)"));
assert(accessSql.includes("grant execute on function public.add_user_xp(uuid, integer) to authenticated"));
assert(projectionSql.includes("vitality_next_recovery_at"));
assert(pvpRuntime.includes('mode !== "PVP_PRACTICE"'));
assert(pvpUi.includes("2時間ごとに1回復・模擬戦は消費なし"));
assert(raidUi.includes("レイドポイント: {raidPoints}/5"));
assert(!raidUi.includes("本日挑戦"));
for (const required of ["canonical_user_level_master", "v_level=100", "v_level>100", "use_action_resource_ticket", "PVP_POINT_TICKET", "RAID_POINT_TICKET", "v_points>=5", "quantity=quantity-1", "level=100"]){
  assert(finalSql.includes(required), `Final migration missing ${required}`);
}
// The single generated master array is consumed by both canonical and compatibility seeds.
assert.equal((finalSql.match(/\"level\":/g) || []).length, 200);
assert(finalSql.includes('"level":100,"requiredExp":0,"cumulativeExp":6858050'));
assert(!finalSql.includes("least(pvp_points+1,5)"));
assert(capConstraintSql.includes("drop constraint if exists users_level_positive_check"));
assert(capConstraintSql.includes("check (level between 1 and 100) not valid"));
assert(!capConstraintSql.includes("level between 1 and 99"));
console.log("Canonical User Level / Action Resource migration static validation: PASS");
