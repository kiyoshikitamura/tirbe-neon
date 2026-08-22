import assert from "node:assert/strict";
import fs from "node:fs";
const sql=fs.readFileSync("supabase/migrations/20260822000185_quest_gameplay_v2.sql","utf8");
for(const token of ["begin;","commit;","canonical_quest_is_unlocked","get_canonical_quest_progression","jsonb_array_length(encounter.members)","canonical_character_stats","canonical_skill_master","enemy_tactic_id","quest is locked","FIRST_CLEAR:"]) assert(sql.includes(token),token);
for(const forbidden of ["plus_val * 0.10","rarityMultiplier","npc_basic_attack","random_options","unlock_condition='NONE'"]) assert(!sql.includes(forbidden),forbidden);
assert.equal((sql.match(/update public\.canonical_quest_master/g)||[]).length,1);
console.log("Quest Gameplay v2 DB migration verification PASS");
