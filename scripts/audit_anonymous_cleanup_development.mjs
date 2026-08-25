import { readFile } from "node:fs/promises";

const environmentIndex = process.argv.indexOf("--environment");
const environment = environmentIndex >= 0 ? process.argv[environmentIndex + 1] : "development";
if (!new Set(["development", "preview"]).has(environment)) throw new Error("Only Development / Preview audit is allowed");
const targets = JSON.parse(await readFile(new URL("../config/supabase-targets.json", import.meta.url), "utf8"));
const expectedRef = targets[environment];
if (process.env.SUPABASE_EXPECTED_PROJECT_REF !== expectedRef) throw new Error(`${environment} target mismatch`);
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required");

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${expectedRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json();
}

const result = await query(`
  select jsonb_build_object(
    'cronInstalled', exists(select 1 from pg_extension where extname='pg_cron'),
    'sessionsColumns', (select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='auth' and table_name='sessions'),
    'refreshTokenColumns', (select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='auth' and table_name='refresh_tokens'),
    'publicUserReferences', (select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'constraint',conname,'deleteAction',confdeltype) order by conrelid::regclass::text) from pg_constraint where contype='f' and confrelid='public.users'::regclass),
    'sevenDayCandidates', (select count(*) from auth.users au join public.users u on u.id=au.id join public.tutorial_progress tp on tp.user_id=au.id where au.is_anonymous and au.created_at < now()-interval '7 days' and tp.step_id not in ('COMPLETE','AUTHENTICATION') and not exists(select 1 from public.user_account_auth_methods am where am.user_id=au.id) and not exists(select 1 from auth.sessions s where s.user_id=au.id and (s.not_after is null or s.not_after>now())))
  ) as audit;
`);
console.log(JSON.stringify({ environment, projectRef: expectedRef, result }, null, 2));
