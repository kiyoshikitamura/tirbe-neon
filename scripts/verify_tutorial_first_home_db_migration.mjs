import { readFile } from "node:fs/promises";

const path = "supabase/migrations/20260823000190_tutorial_first_home_canonical_reconciliation.sql";
const sql = await readFile(path, "utf8");
const followUpPath = "supabase/migrations/20260823000191_remove_noncanonical_character_gacha_pool_rows.sql";
const followUp = await readFile(followUpPath, "utf8");
const growthPath = "supabase/migrations/20260823000192_tutorial_canonical_growth_before_formation.sql";
const growth = await readFile(growthPath, "utf8");
const milestonePath = "supabase/migrations/20260823000193_tutorial_growth_milestone_authority.sql";
const milestone = await readFile(milestonePath, "utf8");

const checks = [
  ["direct transaction", sql.indexOf("begin;") >= 0 && sql.indexOf("begin;") < sql.indexOf("update public.gacha_items_master") && /commit;\s*notify pgrst,'reload schema';\s*$/i.test(sql)],
  ["Canonical pool reconciliation", /update public\.gacha_items_master[\s\S]*canonical_character_master[\s\S]*pool\.rarity is distinct from master\.rarity/i.test(sql)],
  ["Fresh shinjuku only", /insert into public\.users[\s\S]*'shinjuku'[\s\S]*null/i.test(sql)],
  ["No existing user backfill", !/update public\.users\s+set\s+current_base_id/i.test(sql)],
  ["Tutorial rarity from Canonical Master", /execute_tutorial_character_gacha[\s\S]*select rarity into v_rarity[\s\S]*canonical_character_master/i.test(sql)],
  ["Canonical guaranteed SSR assertion", /v_index=10 and v_rarity<>'SSR'/i.test(sql)],
  ["Formation selection uses Canonical rarity", /complete_current_tutorial_formation[\s\S]*join public\.canonical_character_master master/i.test(sql)],
  ["Slot 1 persisted as favorite", /update public\.users set favorite_character_id=v_party\[1\] where id=v_user_id/i.test(sql)],
  ["Favorite and tutorial step share function transaction", sql.indexOf("favorite_character_id=v_party[1]") < sql.indexOf("set step_id='DISPATCH'")],
  ["Chang R assertion", /character_id='char_chang_01'\)<>'R'/i.test(sql)],
  ["No migration history repair", !/schema_migrations|migration repair/i.test(sql)],
  ["Only approved legacy UUID rows are deleted", /gacha_id='CHAR_SPECIAL'[\s\S]*11111111-1111-1111-1111-111111111111[\s\S]*22222222-2222-2222-2222-222222222222[\s\S]*33333333-3333-3333-3333-333333333333/i.test(followUp)],
  ["All Character pool members asserted Canonical", /gacha_id in \('CHAR_NORMAL','CHAR_SPECIAL'\)[\s\S]*master\.character_id is null/i.test(followUp)],
  ["Follow-up preserves rates/economy", !/gacha_rarity_rates|cost_cash|cost_diamond|pity/i.test(followUp.replace(/^--.*$/gm, ""))],
  ["Follow-up does not touch user data", !/user_characters|gacha_execution_history|user_items|public\.users/i.test(followUp.replace(/^--.*$/gm, ""))],
  ["Visible Canonical Growth is required", /prepare_current_tutorial_growth[\s\S]*target_character_id[\s\S]*required_level',v_required_level/i.test(growth)],
  ["Leader Lv7 simulation result is enforced", /tutorial Character must reach level 7 before formation/i.test(growth)],
  ["FIRST_GROWTH is authoritative", /user_funnel_milestones[\s\S]*milestone='first_growth'/i.test(growth)],
  ["Growth precedes formation", /character growth is required before formation/i.test(growth)],
  ["No hidden combat modifier", !/damage multiplier|enemy stat|forced victory|timeout.*clear|apply_tutorial_.*snapshot/i.test(growth.replace(/^--.*$/gm, ""))],
  ["FREE_GACHA awakening-only suppresses FIRST_GROWTH", /awakening_level[\s\S]*level[\s\S]*tutorial_progress[\s\S]*FREE_GACHA[\s\S]*v_changed:=false/i.test(milestone)],
  ["Character Level Up still records FIRST_GROWTH", /coalesce\(new\.level,1\)>coalesce\(old\.level,1\)[\s\S]*record_funnel_milestone[\s\S]*first_growth/i.test(milestone)],
  ["Milestone remediation preserves ownership and economy", !/insert into public\.user_characters|delete from public\.user_characters|gacha_items_master|user_items|cash|reward/i.test(milestone.replace(/^--.*$/gm, ""))],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
if (failed.length) throw new Error(`00190 verification failed: ${failed.join(", ")}`);
console.log(JSON.stringify({ status: "PASS", migrations: [path, followUpPath, growthPath, milestonePath], checks: checks.map(([name]) => name) }, null, 2));
