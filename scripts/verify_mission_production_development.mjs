import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

const environment = "development";
const preflightOnly = process.argv.includes("--preflight");
loadEnvironmentFile(environment);
const target = await verifySupabaseTarget({ environment, mutation: false });
const connection = await getLinkedPostgresConnection();
const canonical = JSON.parse(readFileSync(new URL("../src/domain/gameplay/canonical/data/missions_20260821.json", import.meta.url), "utf8"));
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";

const query = `
select json_build_object(
  'enabled', (select count(*) from public.missions where is_enabled),
  'daily', (select count(*) from public.missions where is_enabled and category='DAILY'),
  'normal', (select count(*) from public.missions where is_enabled and category='NORMAL'),
  'weekly', (select count(*) from public.missions where is_enabled and category='WEEKLY'),
  'provisional', (select count(*) from public.missions where is_enabled and is_provisional),
  'legacyMissionRewards', (select count(*) from public.missions where is_enabled and reward_item_id in ('NORMAL_CHARACTER_GACHA_TICKET','NORMAL_GACHA_TICKET','EQUIP_LB_HAMMER','SKILL_LB_BOOK')),
  'legacyTicketUsers', (select count(*) from public.user_items where item_id='NORMAL_GACHA_TICKET' and quantity>0),
  'legacyTicketQuantity', (select coalesce(sum(quantity),0) from public.user_items where item_id='NORMAL_GACHA_TICKET' and quantity>0),
  'legacyTicketPresents', (select count(*) from public.presents where item_id='NORMAL_GACHA_TICKET' and status='UNCLAIMED'),
  'guildJoinReward', (select json_build_object('itemId',reward_item_id,'quantity',reward_quantity) from public.missions where id='ob_normal_guild_join_01'),
  'equipmentLbReward', (select json_build_object('itemId',reward_item_id,'quantity',reward_quantity) from public.missions where id='ob_normal_gear_lb_02'),
  'skillLbReward', (select json_build_object('itemId',reward_item_id,'quantity',reward_quantity) from public.missions where id='ob_normal_skill_lb_02'),
  'inviteDiamondTotal', (select coalesce(sum(reward_quantity),0) from public.missions where is_enabled and id like 'ob_invite_%'),
  'genericLoginBonusRows', (select count(*) from public.login_bonus_master where item_id='NORMAL_GACHA_TICKET'),
  'characterLoginBonusRows', (select count(*) from public.login_bonus_master where item_id='NORMAL_GACHA_TICKET_CHARACTER')
  ,'userMissionRows', (select count(*) from public.user_missions)
  ,'migrationHead', (select max(version) from supabase_migrations.schema_migrations)
  ,'equipmentLbHook', position('GEAR_LIMIT_BREAK' in pg_get_functiondef('public.limit_break_equipment(uuid,boolean,uuid)'::regprocedure))>0
  ,'funnelPrerequisiteTrigger', exists(select 1 from pg_trigger where tgname='enforce_mission_claim_prerequisite_trigger' and not tgisinternal)
  ,'funnelUnlockTrigger', exists(select 1 from pg_trigger where tgname='mission_claim_unlock_trigger' and not tgisinternal)
  ,'missionRows', (select json_agg(json_build_object(
    'id',id,'category',category,'triggerType',trigger_type,'targetValue',target_value,
    'rewardItemId',reward_item_id,'rewardQuantity',reward_quantity,
    'prerequisiteMissionId',prerequisite_mission_id,'displayOrder',display_order,
    'isEnabled',is_enabled,'isRepeatable',is_repeatable,'isProvisional',is_provisional
  ) order by id) from public.missions where is_enabled)
)::text;
`;

const result = spawnSync(executable, [
  "-X", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1",
  "--host", connection.host, "--port", connection.port, "--username", connection.user,
  "--dbname", connection.database, "--command", query,
], { encoding: "utf8", env: { ...process.env, PGPASSWORD: connection.password } });
if (result.status !== 0) throw new Error(result.stderr || "Development Mission verification query failed.");
const metrics = JSON.parse(result.stdout.trim());
const { missionRows, ...summaryMetrics } = metrics;
if (preflightOnly) {
  console.log(JSON.stringify({ environment: target.environment, projectRef: target.projectRef, phase: "preflight", ...summaryMetrics }, null, 2));
  if (metrics.legacyTicketUsers !== 0 || metrics.legacyTicketQuantity !== 0 || metrics.legacyTicketPresents !== 0) {
    throw new Error(`LEGACY_NORMAL_GACHA_TICKET_BALANCE_FOUND: ${JSON.stringify(metrics)}`);
  }
  process.exit(0);
}
if (metrics.enabled !== 37 || metrics.daily !== 4 || metrics.normal !== 33 || metrics.weekly !== 0 || metrics.provisional !== 0) {
  throw new Error(`Mission count/Production flags mismatch: ${JSON.stringify(metrics)}`);
}
if (metrics.legacyMissionRewards !== 0 || metrics.legacyTicketUsers !== 0 || metrics.legacyTicketQuantity !== 0 || metrics.legacyTicketPresents !== 0) {
  throw new Error(`Legacy Mission/Ticket state remains: ${JSON.stringify(metrics)}`);
}
if (metrics.guildJoinReward?.itemId !== "NORMAL_GACHA_TICKET_CHARACTER" || metrics.guildJoinReward?.quantity !== 3) throw new Error("Guild Join reward mismatch.");
if (metrics.equipmentLbReward?.itemId !== "EQUIP_LB_PART" || metrics.equipmentLbReward?.quantity !== 1) throw new Error("Equipment LB reward mismatch.");
if (metrics.skillLbReward?.itemId !== "SKILL_MANUAL" || metrics.skillLbReward?.quantity !== 1) throw new Error("Skill LB reward mismatch.");
if (metrics.inviteDiamondTotal !== 1000 || metrics.genericLoginBonusRows !== 0) throw new Error("Invite or Login Bonus ticket canonicalization mismatch.");
if (!metrics.equipmentLbHook || !metrics.funnelPrerequisiteTrigger || !metrics.funnelUnlockTrigger) throw new Error("Mission runtime DB hook/trigger mismatch.");
if (missionRows.length !== canonical.missions.length) throw new Error("DB/Repository Mission row count mismatch.");
for (const mission of canonical.missions) {
  const row = missionRows.find((entry) => entry.id === mission.id);
  for (const field of ["category", "triggerType", "targetValue", "rewardItemId", "rewardQuantity", "prerequisiteMissionId", "displayOrder", "isEnabled", "isRepeatable", "isProvisional"]) {
    if (row?.[field] !== mission[field]) throw new Error(`DB/Repository Mission parity mismatch: ${mission.id}.${field}`);
  }
}
console.log(JSON.stringify({ environment: target.environment, projectRef: target.projectRef, missionParityRows: missionRows.length, ...summaryMetrics }, null, 2));
