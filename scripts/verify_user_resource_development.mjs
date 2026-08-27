import { spawnSync } from "node:child_process";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
const preflightOnly = process.argv.includes("--preflight");
const target = await verifySupabaseTarget({ environment: "development", mutation: false });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
const preflightQuery = `select json_build_object(
 'canonicalLevelTableExists',to_regclass('public.canonical_user_level_master') is not null,
 'canonicalResourceTableExists',to_regclass('public.canonical_action_resource_master') is not null,
 'userRows',(select count(*) from public.users),
 'userLevelSum',(select coalesce(sum(level),0) from public.users),
 'userXpSum',(select coalesce(sum(xp),0) from public.users),
 'vitalitySum',(select coalesce(sum(vitality),0) from public.users),
 'pvpPointSum',(select coalesce(sum(pvp_points),0) from public.users),
 'userItemRows',(select count(*) from public.user_items),
 'migrationHead',(select max(version) from supabase_migrations.schema_migrations)
)::text;`;
const postflightQuery = `select json_build_object(
 'levelRows',(select count(*) from public.canonical_user_level_master where version='2026-08-22'),
 'level8Cumulative',(select cumulative_exp from public.canonical_user_level_master where version='2026-08-22' and level=8),
 'level10Cumulative',(select cumulative_exp from public.canonical_user_level_master where version='2026-08-22' and level=10),
 'level20Cumulative',(select cumulative_exp from public.canonical_user_level_master where version='2026-08-22' and level=20),
 'level30Cumulative',(select cumulative_exp from public.canonical_user_level_master where version='2026-08-22' and level=30),
 'level50Cumulative',(select cumulative_exp from public.canonical_user_level_master where version='2026-08-22' and level=50),
 'level75Cumulative',(select cumulative_exp from public.canonical_user_level_master where version='2026-08-22' and level=75),
 'level100',(select json_build_array(required_exp,cumulative_exp) from public.canonical_user_level_master where version='2026-08-22' and level=100),
 'resourceRows',(select count(*) from public.canonical_action_resource_master where version='2026-08-22'),
 'questCostRows',(select count(*) from public.canonical_quest_resource_cost where version='2026-08-22'),
 'vitalityRule',(select json_build_array(natural_max,hard_cap,recovery_interval_seconds) from public.canonical_action_resource_master where version='2026-08-22' and resource_type='VITALITY'),
 'pvpRule',(select json_build_array(natural_max,recovery_interval_seconds,entry_cost) from public.canonical_action_resource_master where version='2026-08-22' and resource_type='PVP_POINT'),
 'raidRule',(select json_build_array(natural_max,recovery_interval_seconds,entry_cost) from public.canonical_action_resource_master where version='2026-08-22' and resource_type='RAID_POINT'),
 'questCostMismatch',(select count(*) from public.quests where cost_vitality<>case level_type when 'EASY' then 5 when 'NORMAL' then 10 when 'HARD' then 15 else cost_vitality end),
 'userRows',(select count(*) from public.users),
 'migrationHead',(select max(version) from supabase_migrations.schema_migrations),
 'xpCanonical',position('canonical_user_level_master' in pg_get_functiondef('public.apply_user_xp(uuid,integer)'::regprocedure))>0,
 'ticketCanonical',position('v_points>=5' in pg_get_functiondef('public.use_action_resource_ticket(text)'::regprocedure))>0 and position('quantity=quantity-1' in pg_get_functiondef('public.use_action_resource_ticket(text)'::regprocedure))>0,
 'ticketItemParity',(select count(*) from public.canonical_item_master where version='2026-08-22' and item_id in ('PVP_POINT_TICKET','RAID_POINT_TICKET') and runtime_usage->>'effectValue'='1'),
 'overCapUsers',(select count(*) from public.users where level>100),
 'userLevelConstraint',pg_get_constraintdef((select oid from pg_constraint where conrelid='public.users'::regclass and conname='users_level_positive_check')),
 'raidCanonical',position('raid_points' in pg_get_functiondef('public.start_raid_battle(uuid,text[],text)'::regprocedure))>0,
 'pvpTwoHours',position('/ 7200' in pg_get_functiondef('public.start_pvp_battle(uuid,text[],text)'::regprocedure))>0,
 'recoveryProjection',position('vitality_next_recovery_at' in pg_get_functiondef('public.sync_and_recover_vitality_and_pvp_points(uuid)'::regprocedure))>0,
 'guildCreationCanonical',position('level < 5' in pg_get_functiondef('public.create_guild_v2(uuid,text,integer)'::regprocedure))>0 and position('p_creation_cost <> 5000' in pg_get_functiondef('public.create_guild_v2(uuid,text,integer)'::regprocedure))>0
)::text;`;
const query = preflightOnly ? preflightQuery : postflightQuery;
const result = spawnSync(executable,["-X","--tuples-only","--no-align","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--command",query],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
if(result.status!==0) throw new Error(result.stderr||"Development verification failed");
const metrics=JSON.parse(result.stdout.trim());
if (preflightOnly) {
  console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,phase:"preflight",...metrics},null,2));
  process.exit(0);
}
if(metrics.levelRows!==100||metrics.level8Cumulative!==1750||metrics.level10Cumulative!==3050||metrics.level20Cumulative!==28050||metrics.level30Cumulative!==120550||metrics.level50Cumulative!==708050||metrics.level75Cumulative!==2712750||JSON.stringify(metrics.level100)!==JSON.stringify([0,6858050])||metrics.resourceRows!==3||metrics.questCostRows!==3) throw new Error("Canonical DB count mismatch");
if(metrics.questCostMismatch!==0) throw new Error("Quest Vitality cost mismatch");
if(JSON.stringify(metrics.vitalityRule)!==JSON.stringify([100,500,360])||JSON.stringify(metrics.pvpRule)!==JSON.stringify([5,7200,1])||JSON.stringify(metrics.raidRule)!==JSON.stringify([5,7200,1])) throw new Error("Action resource DB parity mismatch");
if(!metrics.xpCanonical||!metrics.ticketCanonical||metrics.ticketItemParity!==2||!metrics.userLevelConstraint.includes("level <= 100")||!metrics.raidCanonical||!metrics.pvpTwoHours||!metrics.recoveryProjection||!metrics.guildCreationCanonical) throw new Error(`Canonical runtime function mismatch: ${JSON.stringify(metrics)}`);
console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,phase:"postflight",...metrics},null,2));
