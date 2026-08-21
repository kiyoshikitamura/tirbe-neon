import { spawnSync } from "node:child_process";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";

loadEnvironmentFile("development");
const target = await verifySupabaseTarget({ environment: "development", mutation: false });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
const canonicalGate = process.argv.includes("--canonical-gate");
const schema = process.argv.includes("--fixture-schema");
const userConstraints = process.argv.includes("--user-constraints");
const canonicalStatsDefinition = process.argv.includes("--canonical-stats-definition");
const query = canonicalStatsDefinition ? String.raw`
select jsonb_build_object(
  'function_definition', pg_get_functiondef('public.canonical_character_stats(text,integer,integer)'::regprocedure),
  'schema_present', to_regprocedure('public.canonical_character_stats(text,integer,integer)') is not null,
  'migration_00168_registered', exists(select 1 from supabase_migrations.schema_migrations where version='20260821000168'),
  'migration_00169_registered', exists(select 1 from supabase_migrations.schema_migrations where version='20260821000169'),
  'migration_00167_registered', exists(select 1 from supabase_migrations.schema_migrations where version='20260820000167'),
  'migration_00167_schema_present', position('pg_advisory_xact_lock(hashtextextended(p_patrol_id::text, 0))' in coalesce(pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')), '')) > 0
) result;
` : userConstraints ? String.raw`
select jsonb_agg(jsonb_build_object('name', conname, 'definition', pg_get_constraintdef(oid))) result
from pg_constraint where conrelid='public.users'::regclass;
` : schema ? String.raw`
select jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'type', data_type, 'nullable', is_nullable) order by table_name, ordinal_position) result
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users', 'user_characters', 'user_skills', 'user_equipments', 'user_items');
` : canonicalGate ? String.raw`
select jsonb_build_object(
  'canonical_character_master', (select count(*) from public.canonical_character_master),
  'canonical_skill_master', (select count(*) from public.canonical_skill_master),
  'canonical_equipment_master', (select count(*) from public.canonical_equipment_master),
  'canonical_equipment_lb_steps', (select count(*) from public.canonical_equipment_lb_steps),
  'lb_equivalent_costs', (select jsonb_agg(equivalent_cost order by plus_val) from public.canonical_equipment_lb_steps),
  'lb_total_cost', (select coalesce(sum(equivalent_cost), 0) from public.canonical_equipment_lb_steps where plus_val between 1 and 10),
  'lb_plus_ten_multiplier', (select flat_stat_multiplier from public.canonical_equipment_lb_steps where plus_val = 10),
  'lb_null_equivalent_costs', (select count(*) from public.canonical_equipment_lb_steps where equivalent_cost is null)
) result;
` : String.raw`
with inventory as (
  select jsonb_build_object(
    'user_characters', (select count(*) from public.user_characters),
    'user_skills', (select count(*) from public.user_skills),
    'user_equipments', (select count(*) from public.user_equipments),
    'canonical_tables', coalesce((select jsonb_agg(relname order by relname) from pg_class where relnamespace='public'::regnamespace and relname like 'canonical_%'), '[]'::jsonb),
    'migration_head', (select version from supabase_migrations.schema_migrations order by version desc limit 1)
  ) result
)
select result from inventory;
`;
const result = spawnSync(executable, ["-X", "-v", "ON_ERROR_STOP=1", "-At", "--host", connection.host, "--port", connection.port, "--username", connection.user, "--dbname", connection.database, "--command", query], {
  encoding: "utf8",
  env: { ...process.env, PGPASSWORD: connection.password },
});
if (result.status !== 0) throw new Error(result.stderr || "Development DB preflight failed");
console.log(JSON.stringify({
  environment: target.environment,
  project_ref: target.projectRef,
  [canonicalStatsDefinition ? "canonical_stats_definition" : userConstraints ? "user_constraints" : schema ? "fixture_schema" : canonicalGate ? "canonical_gate" : "preflight"]: JSON.parse(result.stdout.trim()),
}, null, 2));
