import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

const environmentIndex = process.argv.indexOf("--environment");
const outputIndex = process.argv.indexOf("--output");
const environment = environmentIndex >= 0 ? process.argv[environmentIndex + 1]?.toLowerCase() : "";
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "";
if (!environment || !output) {
  console.error("Usage: node scripts/dump_guarded_schema.mjs --environment <environment> --output <path>");
  process.exit(1);
}

loadEnvironmentFile(environment);
await verifySupabaseTarget({ environment, mutation: false });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32"
  ? "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"
  : "pg_dump";
const result = spawnSync(executable, [
  "--schema-only",
  "--no-owner",
  "--no-privileges",
  "--schema=public",
  "--host", connection.host,
  "--port", connection.port,
  "--username", connection.user,
  "--dbname", connection.database,
  "--file", resolve(output),
], {
  stdio: "inherit",
  env: { ...process.env, PGPASSWORD: connection.password },
});
if (result.error) console.error(`pg_dump could not be started: ${result.error.message}`);
process.exit(result.status ?? 1);
