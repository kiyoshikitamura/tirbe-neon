import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  KPI_PRODUCTION_STANDARD_ORIGIN,
  validateProductionKpiRuntime,
} from "../src/utils/kpiRuntime.ts";

const nextConfig = await readFile("next.config.ts", "utf8");
const page = await readFile("src/app/admin/kpi/page.tsx", "utf8");
const refreshRoute = await readFile("src/app/api/admin/kpi/refresh/route.ts", "utf8");
const envExample = await readFile(".env.example", "utf8");

for (const host of ["kpi.tribe-neon.com", "kpi-preview.tribe-neon.com"]) {
  assert.ok(nextConfig.includes(`"${host}"`), `${host} root routing is missing`);
}
assert.match(nextConfig, /source:\s*"\/"/);
assert.match(nextConfig, /destination:\s*"\/admin\/kpi"/);
assert.match(nextConfig, /permanent:\s*false/);

assert.match(page, /validateProductionKpiRuntime/);
assert.match(refreshRoute, /validateProductionKpiRuntime/);
assert.match(envExample, /NEXT_PUBLIC_KPI_DATA_ENV=/);
assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY=/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);

const valid = validateProductionKpiRuntime({
  appEnvironment: "preview",
  dataEnvironment: "production",
  supabaseUrl: KPI_PRODUCTION_STANDARD_ORIGIN,
});
assert.deepEqual(valid, { enabled: true, origin: KPI_PRODUCTION_STANDARD_ORIGIN });

for (const [reason, config] of [
  ["app_environment", { appEnvironment: "production", dataEnvironment: "production", supabaseUrl: KPI_PRODUCTION_STANDARD_ORIGIN }],
  ["data_environment", { appEnvironment: "preview", dataEnvironment: "preview", supabaseUrl: KPI_PRODUCTION_STANDARD_ORIGIN }],
  ["missing_supabase_url", { appEnvironment: "preview", dataEnvironment: "production" }],
  ["production_custom_domain_forbidden", { appEnvironment: "preview", dataEnvironment: "production", supabaseUrl: "https://api.tribe-neon.com" }],
  ["production_project_mismatch", { appEnvironment: "preview", dataEnvironment: "production", supabaseUrl: "https://sufvuqdnqohpfzkwxohq.supabase.co" }],
]) {
  assert.deepEqual(validateProductionKpiRuntime(config), { enabled: false, reason });
}

console.log("KPI fixed-domain runtime contract verification PASS");
