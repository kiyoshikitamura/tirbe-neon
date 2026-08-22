import assert from "node:assert/strict";
import fs from "node:fs";
const sql = fs.readFileSync("supabase/migrations/20260822000184_pvp_raid_ranking_production.sql", "utf8");
for (const table of ["canonical_pvp_production_master", "canonical_pvp_ranking_rewards", "canonical_raid_production_master", "canonical_raid_boss_master", "canonical_raid_reward_master", "raid_instance_user_progress"]) assert(sql.includes(table), table);
for (const fn of ["canonical_pvp_expected_score", "canonical_pvp_rating_delta", "canonical_pvp_soft_reset", "get_pvp_opponents", "finalize_pvp_battle", "canonical_raid_rotation_pair", "rotate_daily_raids", "start_raid_battle", "finalize_raid_battle", "get_raid_rankings"]) assert(sql.includes(`function public.${fn}`), fn);
assert(!sql.includes("order by random()"));
assert(sql.includes("set enabled=false where id='BOSS_001'"));
assert.equal((sql.match(/RAID_BOSS_00[1-5]/g) ?? []).length >= 5, true);
console.log("PvP / Raid DB migration static verification PASS");
