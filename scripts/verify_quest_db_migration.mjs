import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("supabase/migrations/20260822000181_quest_production_foundation.sql", "utf8");
const policySql = fs.readFileSync("supabase/migrations/20260822000182_quest_master_read_policies.sql", "utf8");
const retirementSql = fs.readFileSync("supabase/migrations/20260822000183_retire_legacy_quest_speedup_rpc.sql", "utf8");
for (const required of [
  "canonical_quest_master", "canonical_quest_reward_pool_items", "canonical_quest_encounter_master",
  "user_quest_first_clears", "canonical_quest_enemy_snapshot", "build_server_battle_snapshot",
  "DAMAGE 80% ATK", "normal_attack_power_bp", "unlock_condition='NONE'",
  "quest_free_skips_count", "quest_paid_skips_count", "daily free instant completion limit reached",
  "daily paid instant completion limit reached", "neon_diamonds=neon_diamonds-30",
]) assert(sql.includes(required), `Migration missing ${required}`);
for (const forbidden of [
  "npc_basic_attack", "character_growth_patterns", "rarity_multiplier", "character_awakening_master",
  "plus_val * 0.10", "LAW_OF_STRIFE", "AWAKENING_BOOK'",
]) assert(!sql.includes(forbidden), `Legacy Quest runtime reference found: ${forbidden}`);
assert.equal((sql.match(/"encounterId":"encounter_q_/g) || []).length, 21);
assert.equal((sql.match(/"unlockCondition":"NONE"/g) || []).length, 21);
for (const policy of ["canonical_quest_master_read", "canonical_quest_reward_pool_items_read", "canonical_quest_encounter_master_read"]) assert(policySql.includes(policy));
assert(retirementSql.includes("revoke all on function public.complete_patrol_preopen(uuid) from public, anon, authenticated"));
console.log("Quest DB migration static verification passed.");
