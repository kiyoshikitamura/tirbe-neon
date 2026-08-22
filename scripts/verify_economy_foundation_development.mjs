import { spawnSync } from "node:child_process";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

const environment = "development";
const preflightOnly = process.argv.includes("--preflight");
loadEnvironmentFile(environment);
const target = await verifySupabaseTarget({ environment, mutation: false });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
const legacyIds = ["LAW_OF_STRIFE", "ITEM_STAMINA_01", "ITEM_EXP_DRINK", "TRAINING_MANUAL", "EXCLUSIVE_CONTRACT", "EQUIP_LB_HAMMER", "SKILL_LB_BOOK", "NORMAL_GACHA_TICKET"];
const quotedLegacy = legacyIds.map((id) => `'${id}'`).join(",");
const canonicalItemCountSql = preflightOnly ? "0" : "(select count(*) from public.canonical_item_master where version='2026-08-22')";
const awakeningProgressSql = preflightOnly ? "0" : "(select coalesce(sum(awakening_progress),0) from public.user_characters)";
const query = `select json_build_object(
  'canonicalTableExists', to_regclass('public.canonical_item_master') is not null,
  'canonicalItemRows', ${canonicalItemCountSql},
  'loginRows', (select count(*) from public.login_bonus_master where day_number between 1 and 30),
  'loginCash', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='CASH'),
  'loginDiamond', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='DIAMOND'),
  'loginCharacterExp', (select coalesce(sum(case item_id when 'CHAR_EXP_S' then quantity*100 when 'CHAR_EXP_M' then quantity*500 when 'CHAR_EXP_L' then quantity*2000 else 0 end),0) from public.login_bonus_master),
  'loginEquipmentExp', (select coalesce(sum(case item_id when 'EQUIP_EXP_S' then quantity*100 when 'EQUIP_EXP_M' then quantity*500 when 'EQUIP_EXP_L' then quantity*2500 else 0 end),0) from public.login_bonus_master),
  'loginSkillManual', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='SKILL_MANUAL'),
  'loginEquipmentLbPart', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='EQUIP_LB_PART'),
  'loginSpecialTicket', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id like 'SPECIAL_TICKET_%'),
  'loginSpecialTicketCharacter', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='SPECIAL_TICKET_CHARACTER'),
  'loginSpecialTicketSkill', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='SPECIAL_TICKET_SKILL'),
  'loginSpecialTicketEquipment', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='SPECIAL_TICKET_EQUIPMENT'),
  'loginEnergyDrink', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='ENERGY_DRINK'),
  'loginAwakeningBook', (select coalesce(sum(quantity),0) from public.login_bonus_master where item_id='AWAKENING_BOOK'),
  'legacyLoginRows', (select count(*) from public.login_bonus_master where item_id in (${quotedLegacy})),
  'legacyBalanceRows', (select count(*) from public.user_items where item_id in (${quotedLegacy}) and quantity>0),
  'legacyBalanceQuantity', (select coalesce(sum(quantity),0) from public.user_items where item_id in (${quotedLegacy}) and quantity>0),
  'legacyPresentRows', (select count(*) from public.presents where item_id in (${quotedLegacy}) and status='UNCLAIMED'),
  'userItemRows', (select count(*) from public.user_items),
  'userItemQuantity', (select coalesce(sum(quantity),0) from public.user_items),
  'presentRows', (select count(*) from public.presents),
  'loginProgressRows', (select count(*) from public.user_login_bonuses),
  'userCharacterRows', (select count(*) from public.user_characters),
  'awakeningSum', (select coalesce(sum(awakening_level),0) from public.user_characters),
  'awakeningProgressSum', ${awakeningProgressSql},
  'migrationHead', (select max(version) from supabase_migrations.schema_migrations),
  'characterGachaCanonical', position('AWAKENING_BOOK' in pg_get_functiondef('public.execute_character_gacha(uuid,text,integer,text,uuid)'::regprocedure))>0,
  'tutorialGachaCanonical', position('AWAKENING_BOOK' in pg_get_functiondef('public.execute_tutorial_character_gacha(uuid)'::regprocedure))>0,
  'pityCanonical', position('apply_character_awakening_equivalent' in pg_get_functiondef('public.exchange_pity_reward(uuid,text,text)'::regprocedure))>0,
  'bookAwakeningCanonical', position('AWAKENING_BOOK' in pg_get_functiondef('public.awaken_character(uuid)'::regprocedure))>0 and position('cash' in lower(pg_get_functiondef('public.awaken_character(uuid)'::regprocedure)))=0
)::text;`;
const result = spawnSync(executable, ["-X", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--host", connection.host, "--port", connection.port, "--username", connection.user, "--dbname", connection.database, "--command", query], { encoding: "utf8", env: { ...process.env, PGPASSWORD: connection.password } });
if (result.status !== 0) throw new Error(result.stderr || "Development economy verification query failed.");
const metrics = JSON.parse(result.stdout.trim());
console.log(JSON.stringify({ environment: target.environment, projectRef: target.projectRef, phase: preflightOnly ? "preflight" : "postflight", ...metrics }, null, 2));
if (preflightOnly) process.exit(0);
if (metrics.canonicalItemRows !== 18 || metrics.loginRows !== 30 || metrics.legacyLoginRows !== 0) throw new Error("Canonical Item/Login Bonus DB parity mismatch.");
if (metrics.loginCash !== 35000 || metrics.loginDiamond !== 100 || metrics.loginCharacterExp !== 28000 || metrics.loginEquipmentExp !== 45000 || metrics.loginSkillManual !== 4 || metrics.loginEquipmentLbPart !== 8 || metrics.loginSpecialTicket !== 4 || metrics.loginSpecialTicketCharacter !== 2 || metrics.loginSpecialTicketSkill !== 1 || metrics.loginSpecialTicketEquipment !== 1 || metrics.loginEnergyDrink !== 4 || metrics.loginAwakeningBook !== 1) throw new Error("Development Login Bonus aggregate mismatch.");
if (!metrics.characterGachaCanonical || !metrics.tutorialGachaCanonical || !metrics.pityCanonical || !metrics.bookAwakeningCanonical) throw new Error("Canonical duplicate/runtime Awakening function mismatch.");
