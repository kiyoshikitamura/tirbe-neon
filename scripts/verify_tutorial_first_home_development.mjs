import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workspaceIndex = process.argv.indexOf("--linked-workspace");
const linkedWorkspace = resolve(workspaceIndex >= 0 ? process.argv[workspaceIndex + 1] : ".");
const expectedRef = "vosbyukxmskvisbgleug";
const linkedRef = (await readFile(resolve(linkedWorkspace, "supabase/.temp/project-ref"), "utf8")).trim();
if (linkedRef !== expectedRef || process.env.SUPABASE_EXPECTED_PROJECT_REF !== expectedRef) {
  throw new Error(`Development target mismatch: linked=${linkedRef}`);
}
const pooler = new URL((await readFile(resolve(linkedWorkspace, "supabase/.temp/pooler-url"), "utf8")).trim());
if (!process.env.SUPABASE_DB_PASSWORD) throw new Error("SUPABASE_DB_PASSWORD is required");

const sql = `
select json_build_object(
  'rarityMismatchCount',(select count(*) from public.gacha_items_master pool join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=pool.item_id where pool.item_type='CHARACTER' and pool.rarity<>master.rarity),
  'rarityMismatchSample',(select coalesce(json_agg(sample),'[]'::json) from (select pool.gacha_id,pool.item_id,pool.rarity as pool_rarity,master.rarity as canonical_rarity from public.gacha_items_master pool join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=pool.item_id where pool.item_type='CHARACTER' and pool.rarity<>master.rarity order by pool.gacha_id,pool.item_id limit 12) sample),
  'rarityMismatchByPool',(select coalesce(json_object_agg(grouped.gacha_id,grouped.count),'{}'::json) from (select pool.gacha_id,count(*) from public.gacha_items_master pool join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=pool.item_id where pool.item_type='CHARACTER' and pool.rarity<>master.rarity group by pool.gacha_id order by pool.gacha_id) grouped),
  'missingCanonicalPoolCount',(select count(*) from public.gacha_items_master pool left join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=pool.item_id where pool.item_type='CHARACTER' and master.character_id is null),
  'missingCanonicalPoolSample',(select coalesce(json_agg(sample),'[]'::json) from (select pool.gacha_id,pool.item_id,pool.rarity from public.gacha_items_master pool left join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=pool.item_id where pool.item_type='CHARACTER' and master.character_id is null order by pool.gacha_id,pool.item_id limit 20) sample),
  'legacyTownUsers',(select count(*) from public.users where current_base_id in ('neon_tower','neontower')),
  'usersWithoutLeader',(select count(*) from public.users where favorite_character_id is null),
  'usersWithLeader',(select count(*) from public.users where favorite_character_id is not null),
  'usersTotal',(select count(*) from public.users),
  'tutorialCompletedUsers',(select count(*) from public.tutorial_progress where step_id in ('COMPLETE','AUTHENTICATION')),
  'characterOwnershipCount',(select count(*) from public.user_characters),
  'formationCount',(select count(*) from public.user_main_formations),
  'inventoryCount',(select count(*) from public.user_items),
  'gachaHistoryCount',(select count(*) from public.gacha_execution_history),
  'townDistribution',(select coalesce(json_object_agg(grouped.current_base_id,grouped.count),'{}'::json) from (select current_base_id,count(*) from public.users group by current_base_id order by current_base_id) grouped),
  'changCanonicalRarity',(select rarity from public.canonical_character_master where version='2026-08-21' and character_id='char_chang_01'),
  'freshInitializerUsesShinjuku',(position('shinjuku' in pg_get_functiondef('public.initialize_current_player(text)'::regprocedure))>0),
  'tutorialGachaUsesCanonicalRarity',(position('canonical_character_master' in pg_get_functiondef('public.execute_tutorial_character_gacha(uuid)'::regprocedure))>0),
  'formationPersistsFavorite',(position('favorite_character_id' in pg_get_functiondef('public.complete_current_tutorial_formation()'::regprocedure))>0)
)::text;
`;
const executable = process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin/psql.exe" : "psql";
const result = spawnSync(executable, [
  "-X", "-v", "ON_ERROR_STOP=1", "--tuples-only", "--no-align",
  "--host", pooler.hostname, "--port", pooler.port || "5432",
  "--username", decodeURIComponent(pooler.username), "--dbname", pooler.pathname.slice(1) || "postgres",
  "--command", sql,
], { encoding: "utf8", env: { ...process.env, PGPASSWORD: process.env.SUPABASE_DB_PASSWORD } });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr || `psql exited ${result.status}`);
const audit = JSON.parse(result.stdout.trim());
const pass = audit.rarityMismatchCount === 0
  && audit.missingCanonicalPoolCount === 0
  && audit.changCanonicalRarity === "R"
  && audit.freshInitializerUsesShinjuku
  && audit.tutorialGachaUsesCanonicalRarity
  && audit.formationPersistsFavorite;
console.log(JSON.stringify({ status: pass ? "PASS" : "MISMATCH", projectRef: linkedRef, ...audit }, null, 2));
if (!pass) process.exitCode = 2;
