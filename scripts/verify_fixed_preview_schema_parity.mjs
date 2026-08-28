import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";

const PREVIEW_REF = "sufvuqdnqohpfzkwxohq";
const PRODUCTION_REF = "ktpolnkyyfkowxdmijww";
const envFile = process.argv.find((argument) => argument.startsWith("--env-file="))?.slice("--env-file=".length);
const deploymentUrl = process.argv.find((argument) => argument.startsWith("--deployment-url="))?.slice("--deployment-url=".length);

if (envFile && existsSync(envFile) && typeof process.loadEnvFile === "function") process.loadEnvFile(envFile);

function projectRefFromUrl(value) {
  return /^https:\/\/([^.]+)\.supabase\.co\/?$/.exec(String(value || "").trim())?.[1] || null;
}

async function verifyDatabase() {
  const configuredRef = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  assert.equal(configuredRef, PREVIEW_REF, "Fixed Preview schema verification refuses a non-Preview Supabase URL");
  assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, PREVIEW_REF, "Preview project guard is missing or mismatched");
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  assert.ok(token, "SUPABASE_ACCESS_TOKEN is required for the read-only parity audit");

  const response = await fetch(`https://api.supabase.com/v1/projects/${PREVIEW_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `
      select jsonb_build_object(
        'migrationVersions', (select coalesce(jsonb_agg(version order by version), '[]'::jsonb) from supabase_migrations.schema_migrations),
        'userTitles', to_regclass('public.user_titles') is not null,
        'onboardingRpc', to_regprocedure('public.get_current_onboarding_state()') is not null,
        'chatUnreadRpc', to_regprocedure('public.get_chat_unread_counts()') is not null,
        'dmUnreadRpc', to_regprocedure('public.get_direct_message_unread_counts()') is not null,
        'bbsUnreadRpc', to_regprocedure('public.get_bbs_unread_counts()') is not null,
        'cosmeticsRpc', to_regprocedure('public.sync_legacy_user_cosmetics()') is not null,
        'equippedFrontEffect', exists(
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'users' and column_name = 'equipped_front_effect'
        ),
        'cosmeticsFunctionUsesColumn', coalesce(position(
          'equipped_front_effect' in pg_get_functiondef(to_regprocedure('public.sync_legacy_user_cosmetics()'))
        ) > 0, false),
        'authenticatedSchemaUsage', has_schema_privilege('authenticated', 'public', 'USAGE'),
        'authenticatedOnboardingExecute', coalesce(has_function_privilege(
          'authenticated', to_regprocedure('public.get_current_onboarding_state()'), 'EXECUTE'
        ), false)
      ) result;
    ` }),
  });
  if (!response.ok) throw new Error(`Preview parity query failed: ${response.status} ${await response.text()}`);
  const [{ result }] = await response.json();

  const repositoryVersions = readdirSync("supabase/migrations")
    .map((name) => /^(\d{14})_.*\.sql$/.exec(name)?.[1])
    .filter(Boolean)
    .sort();
  const databaseVersions = (result.migrationVersions || []).map(String).sort();
  assert.deepEqual(databaseVersions, repositoryVersions, "Preview migration history differs from repository history");
  for (const [key, value] of Object.entries(result)) {
    if (key === "migrationVersions") continue;
    assert.equal(value, true, `Preview schema contract failed: ${key}`);
  }

  return {
    projectRef: configuredRef,
    migrationMax: databaseVersions.at(-1) || null,
    migrationCount: databaseVersions.length,
    missingMigrations: repositoryVersions.filter((version) => !databaseVersions.includes(version)),
    requiredSchemaObjects: "PASS",
  };
}

async function verifyDeployment(url) {
  const normalizedUrl = new URL(url).toString();
  const response = await fetch(normalizedUrl, { redirect: "follow" });
  assert.ok(response.ok, `Fixed Preview returned HTTP ${response.status}`);
  const html = await response.text();
  const scriptUrls = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], normalizedUrl).toString());
  assert.ok(scriptUrls.length > 0, "Fixed Preview did not expose application scripts");
  const scriptBodies = await Promise.all(scriptUrls.map(async (scriptUrl) => {
    const scriptResponse = await fetch(scriptUrl);
    return scriptResponse.ok ? scriptResponse.text() : "";
  }));
  const bundle = scriptBodies.join("\n");
  assert.ok(bundle.includes(PREVIEW_REF), "Fixed Preview client bundle does not contain the Preview Supabase project ref");
  assert.ok(!bundle.includes(PRODUCTION_REF), "Fixed Preview client bundle contains the Production Supabase project ref");
  return { url: normalizedUrl, clientProjectRef: PREVIEW_REF, productionRefPresent: false };
}

const database = await verifyDatabase();
const deployment = deploymentUrl ? await verifyDeployment(deploymentUrl) : null;
console.log(JSON.stringify({ status: "PASS", database, deployment }, null, 2));
