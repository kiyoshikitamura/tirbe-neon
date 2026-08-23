import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const expectedRef = "vosbyukxmskvisbgleug";
const migrationIndex = process.argv.indexOf("--migration");
const migrationName = migrationIndex >= 0 ? process.argv[migrationIndex + 1] : "20260823000190_tutorial_first_home_canonical_reconciliation.sql";
const allowedMigrations = new Set([
  "20260823000190_tutorial_first_home_canonical_reconciliation.sql",
  "20260823000191_remove_noncanonical_character_gacha_pool_rows.sql",
  "20260823000192_tutorial_canonical_growth_before_formation.sql",
  "20260823000193_tutorial_growth_milestone_authority.sql",
  "20260824000194_reconcile_character_ssr_candidate_pool.sql",
]);
if (!allowedMigrations.has(migrationName)) throw new Error(`Migration is not approved by this Development guard: ${migrationName}`);
const migration = resolve("supabase/migrations", migrationName);
const workspaceIndex = process.argv.indexOf("--linked-workspace");
const linkedWorkspace = resolve(workspaceIndex >= 0 ? process.argv[workspaceIndex + 1] : ".");
const linkedRef = (await readFile(resolve(linkedWorkspace, "supabase/.temp/project-ref"), "utf8")).trim();
const targets = JSON.parse(await readFile("config/supabase-targets.json", "utf8"));
if (linkedRef !== expectedRef || targets.development !== expectedRef || process.env.SUPABASE_EXPECTED_PROJECT_REF !== expectedRef) {
  throw new Error(`Refusing non-Development target: linked=${linkedRef}, configured=${targets.development}`);
}
if (!process.env.SUPABASE_DB_PASSWORD) throw new Error("SUPABASE_DB_PASSWORD is required");
const pooler = new URL((await readFile(resolve(linkedWorkspace, "supabase/.temp/pooler-url"), "utf8")).trim());
const executable = process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin/psql.exe" : "psql";
const result = spawnSync(executable, [
  "-X", "-v", "ON_ERROR_STOP=1",
  "--host", pooler.hostname, "--port", pooler.port || "5432",
  "--username", decodeURIComponent(pooler.username), "--dbname", pooler.pathname.slice(1) || "postgres",
  "--file", migration,
], { stdio: "inherit", env: { ...process.env, PGPASSWORD: process.env.SUPABASE_DB_PASSWORD } });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`00190 psql apply failed with status ${result.status}`);
console.log(`${migrationName} physically applied to Development ${expectedRef}; migration history was not modified.`);
