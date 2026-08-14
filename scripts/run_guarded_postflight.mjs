import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

const environmentIndex = process.argv.indexOf("--environment");
const fileIndex = process.argv.indexOf("--file");
const environment = environmentIndex >= 0 ? process.argv[environmentIndex + 1]?.toLowerCase() : "";
const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : "";
const postflightRoot = resolve("supabase/postflight");
const sqlPath = resolve(file);
if (!environment || !file || relative(postflightRoot, sqlPath).startsWith("..")) {
  console.error("Only SQL files inside supabase/postflight may be executed.");
  process.exit(1);
}

loadEnvironmentFile(environment);
await verifySupabaseTarget({ environment, mutation: false });
const sql = await readFile(sqlPath, "utf8");
const withoutComments = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
if (/(^|;)\s*(insert|update|delete|alter|create|drop|grant|revoke|truncate|call|do)\b/im.test(withoutComments)) {
  console.error("Postflight contains a mutation keyword and was rejected.");
  process.exit(1);
}

const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32"
  ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe"
  : "psql";
const result = spawnSync(executable, [
  "-X", "-v", "ON_ERROR_STOP=1",
  "--host", connection.host,
  "--port", connection.port,
  "--username", connection.user,
  "--dbname", connection.database,
  "--file", sqlPath,
], {
  stdio: "inherit",
  env: {
    ...process.env,
    PGPASSWORD: connection.password,
    PGOPTIONS: `${process.env.PGOPTIONS || ""} -c default_transaction_read_only=on`.trim(),
  },
});
if (result.error) console.error(`psql could not be started: ${result.error.message}`);
process.exit(result.status ?? 1);
