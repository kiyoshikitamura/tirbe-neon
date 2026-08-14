import { readFile } from "node:fs/promises";

export function loadEnvironmentFile(environment) {
  if (typeof process.loadEnvFile !== "function") return;
  try {
    process.loadEnvFile(`.env.${environment}.local`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function getLinkedPostgresConnection() {
  const poolerUrl = new URL((await readFile("supabase/.temp/pooler-url", "utf8")).trim());
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("SUPABASE_DB_PASSWORD is required.");
  return {
    host: poolerUrl.hostname,
    port: String(poolerUrl.port || 5432),
    user: decodeURIComponent(poolerUrl.username),
    database: poolerUrl.pathname.replace(/^\//, "") || "postgres",
    password,
  };
}
