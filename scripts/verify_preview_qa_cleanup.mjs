const environment = String(process.env.NEXT_PUBLIC_APP_ENV || "preview").toLowerCase();
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (environment !== "preview" || expectedRef !== "sufvuqdnqohpfzkwxohq" || !accessToken) {
  throw new Error("Preview target guard and Supabase access token are required.");
}

const response = await fetch(`https://api.supabase.com/v1/projects/${expectedRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `
      select
        (select count(*)::int from public.users where username like 'QA%') as qa_profiles,
        (select count(*)::int from auth.users auth_user join public.users profile on profile.id = auth_user.id where profile.username like 'QA%') as qa_auth_users,
        (select coalesce(json_agg(id order by id), '[]'::json) from public.users where username like 'QA%') as qa_profile_ids;
    `,
  }),
});
if (!response.ok) throw new Error(`Preview QA cleanup verification failed: ${response.status}`);
const result = (await response.json())[0];
if (process.argv.includes("--cleanup") && Array.isArray(result?.qa_profile_ids) && result.qa_profile_ids.length > 0) {
  const cleanup = spawnSync(process.execPath, ["scripts/cleanup_preview_qa_users.mjs", ...result.qa_profile_ids, "--environment", "preview"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (cleanup.status !== 0) throw new Error(`Existing Preview QA cleanup procedure failed: ${cleanup.stderr || cleanup.stdout}`);
  console.log(cleanup.stdout.trim());
  process.exit(0);
}
if (Number(result?.qa_profiles || 0) !== 0 || Number(result?.qa_auth_users || 0) !== 0) {
  throw new Error(`Disposable Preview QA users remain: ${JSON.stringify({ qa_profiles: result.qa_profiles, qa_auth_users: result.qa_auth_users })}`);
}
console.log(JSON.stringify({ environment, projectRef: expectedRef, qa_profiles: result.qa_profiles, qa_auth_users: result.qa_auth_users }, null, 2));
import { spawnSync } from "node:child_process";
