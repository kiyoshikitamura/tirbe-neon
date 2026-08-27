import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/20260823000186_guild_production_social_core.sql", import.meta.url), "utf8");
const compatibilitySql = readFileSync(new URL("../supabase/migrations/20260823000187_guild_production_compatibility_guards.sql", import.meta.url), "utf8");
const activationSql = readFileSync(new URL("../supabase/migrations/20260827000203_guild_activation_identity_projection.sql", import.meta.url), "utf8");
const remediationSql = readFileSync(new URL("../supabase/migrations/20260828000204_guild_human_acceptance_projection.sql", import.meta.url), "utf8");
const round2Sql = readFileSync(new URL("../supabase/migrations/20260828000205_guild_attribute_submaster_authority.sql", import.meta.url), "utf8");
const creationSql = readFileSync(new URL("../supabase/migrations/20260828000206_guild_creation_level5_authority.sql", import.meta.url), "utf8");
const required = [
  "canonical_guild_progression_master", "guild_exp_daily_ledger", "unique(guild_id,user_id,source,jst_date)",
  "LOGIN',10", "FIRST_GUILD_CHAT',10", "QUEST_3_CLEAR',10", "PVP_FINALIZED',10", "RAID_FINALIZED',15", "DONATION',20",
  "OPEN_JOIN", "APPLICATION_REQUIRED", "CLOSED", "canonical_guild_member_cap", "apply_canonical_guild_exp",
  "record_current_guild_login", "canonical_guild_chat_exp_trigger", "canonical_guild_quest_exp_trigger",
  "canonical_guild_official_battle_exp_trigger", "update_guild_recruitment", "Guild donation already completed today",
  "is_disbanded=true", "record_guild_activity(text,uuid)", "is_provisional=false"
];
for (const token of required) assert.ok(sql.includes(token), `migration is missing ${token}`);
assert.ok(!/WHEN\s+1000\s+THEN\s+'DONATE_SMALL'/i.test(sql));
assert.ok(!/member_buff_(?:atk|hp)\s*=\s*[1-9]/i.test(sql));
assert.ok(compatibilitySql.includes("canonical_guild_member_level_trigger"));
assert.ok(compatibilitySql.includes("canonical_guild_application_level_trigger"));
assert.ok(compatibilitySql.includes("Guild joining requires user level 3"));
assert.ok(compatibilitySql.includes("return public.update_guild_recruitment"));
assert.ok(activationSql.includes("'leader_user_id', leader.id"));
assert.ok(activationSql.includes("'leader_favorite_character_id', leader.favorite_character_id"));
assert.ok(activationSql.includes("and not g.is_disbanded"));
assert.ok(activationSql.includes("grant execute on function public.get_public_guild_detail(uuid) to authenticated"));
assert.ok(remediationSql.includes("'members'"));
assert.ok(remediationSql.includes("member_profile.favorite_character_id"));
assert.ok(remediationSql.includes("case gm.role when 'MASTER' then 0"));
assert.ok(remediationSql.includes("g.main_alignment, g.sub_alignment, g.logo_icon"));
assert.ok(remediationSql.includes("grant execute on function public.search_guilds(text) to authenticated"));
assert.ok(round2Sql.includes("role in ('MASTER', 'SUB_MASTER', 'SUBMASTER')"));
assert.ok(round2Sql.includes("p_main not in ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')"));
assert.ok(round2Sql.includes("grant execute on function public.update_guild_alignment(uuid, text, text) to authenticated"));
assert.ok(creationSql.includes("v_user.level < 5"));
assert.ok(creationSql.includes("p_creation_cost <> 5000"));
assert.ok(creationSql.includes("pg_advisory_xact_lock"));
assert.ok(!creationSql.includes("Guild rejoin cooldown is active"));
assert.ok(creationSql.includes("level = 5 then '[\"GUILD_CREATION\"]'::jsonb"));
for (const key of ["active_member_7d", "raid_participant_7d", "chat_member_7d", "activity_contributor_7d", "target_fill_bonus", "instant_join_bonus", "raid_contribution_scale", "guild_power_scale", "inactive_14d_penalty", "stale_request_penalty", "rotation_range"]) {
  assert.ok(sql.includes(key), `recommendation weight is missing ${key}`);
}
console.log("Guild DB migration verification PASS");
