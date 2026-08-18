import { spawnSync } from "node:child_process";

const separator = process.argv.indexOf("--");
const environment = process.argv[2];
const command = separator >= 0 ? process.argv.slice(separator + 1) : [];
if (!environment || command.length === 0) {
  throw new Error("Usage: node scripts/run_project_e2e.mjs <development|preview> -- <command> [args...]");
}
if (!new Set(["development", "preview"]).has(environment)) throw new Error("Only Development and Preview are allowed.");
if (typeof process.loadEnvFile === "function") process.loadEnvFile(`.env.${environment}.local`);

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_EXPECTED_PROJECT_REF;
const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!token || !ref || new URL(configuredUrl).hostname.split(".")[0] !== ref) throw new Error("Target guard failed.");

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!response.ok) throw new Error(`Could not obtain ephemeral project keys: ${response.status}.`);
const keys = await response.json();
const anon = keys.find((key) => key.name === "anon")?.api_key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = keys.find((key) => key.name === "service_role")?.api_key;
if (!anon || !service) throw new Error("Required project API keys are unavailable.");

const executable = process.platform === "win32" && command[0] === "node" ? process.execPath : command[0];
const result = spawnSync(executable, command.slice(1), {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    SUPABASE_EXPECTED_PROJECT_REF: ref,
    SUPABASE_ENV_FILE: `.env.${environment}.local`,
  },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
