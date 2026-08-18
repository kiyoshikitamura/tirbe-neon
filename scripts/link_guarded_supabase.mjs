import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";

const environmentIndex = process.argv.indexOf("--environment");
const environment = environmentIndex >= 0 ? process.argv[environmentIndex + 1]?.toLowerCase() : "";
if (!new Set(["development", "preview", "production"]).has(environment)) {
  console.error("Usage: node scripts/link_guarded_supabase.mjs --environment <development|preview|production>");
  process.exit(1);
}

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(`.env.${environment}.local`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const targets = JSON.parse(await readFile("config/supabase-targets.json", "utf8"));
const projectRef = targets[environment];
const explicitRef = process.env.SUPABASE_EXPECTED_PROJECT_REF?.trim();

if (!projectRef || projectRef !== explicitRef) {
  console.error(`Ref mismatch before link: environment=${environment}.`);
  process.exit(1);
}
if (new Set(Object.values(targets)).size !== Object.values(targets).length) {
  console.error("Development, Preview, and Production project refs must all differ.");
  process.exit(1);
}
if (environment === "preview" && process.env.SUPABASE_PREVIEW_PROJECT_REF?.trim() !== projectRef) {
  console.error("SUPABASE_PREVIEW_PROJECT_REF must match the canonical Preview ref.");
  process.exit(1);
}
if (!process.env.SUPABASE_ACCESS_TOKEN || !process.env.SUPABASE_DB_PASSWORD) {
  console.error("SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD are required to link safely.");
  process.exit(1);
}
if (environment === "production") {
  const required = `TRIBE_NEON_PRODUCTION_${projectRef}`;
  if (process.env.SUPABASE_PRODUCTION_CHANGE_CONFIRMATION !== required) {
    console.error(`Production link requires SUPABASE_PRODUCTION_CHANGE_CONFIRMATION=${required}.`);
    process.exit(1);
  }
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, [
  "--no-install",
  "supabase",
  "link",
  "--project-ref",
  projectRef,
  "--password",
  process.env.SUPABASE_DB_PASSWORD,
], {
  stdio: "inherit",
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(`Supabase CLI could not be started: ${result.error.message}`);
}
if (result.status !== 0) {
  console.error(`Supabase link failed: status=${result.status ?? "none"}, signal=${result.signal ?? "none"}.`);
  process.exit(result.status ?? 1);
}

try {
  const verified = await verifySupabaseTarget({ environment, mutation: false });
  console.log(`Supabase link verified: environment=${verified.environment}, projectRef=${verified.projectRef}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
