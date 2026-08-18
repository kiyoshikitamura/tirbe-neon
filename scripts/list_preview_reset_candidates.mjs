if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.preview.local");

const previewRef = "sufvuqdnqohpfzkwxohq";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required.");
if (process.env.SUPABASE_EXPECTED_PROJECT_REF?.trim() !== previewRef) {
  throw new Error("Ref guard rejected Preview user inspection.");
}

const response = await fetch(`https://api.supabase.com/v1/projects/${previewRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `
      select
        au.id as auth_user_id,
        au.email,
        au.is_anonymous,
        coalesce(au.raw_app_meta_data ->> 'provider', 'anonymous') as primary_provider,
        u.username,
        tp.step_id as tutorial_step,
        am.auth_method,
        au.created_at,
        au.last_sign_in_at
      from auth.users au
      left join public.users u on u.id = au.id
      left join public.tutorial_progress tp on tp.user_id = au.id
      left join public.user_account_auth_methods am on am.user_id = au.id
      order by au.last_sign_in_at desc nulls last
      limit 15
    `,
  }),
});
if (!response.ok) throw new Error(`Preview user inspection failed: ${response.status} ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));
