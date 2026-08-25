import assert from "node:assert/strict";

const PREVIEW_REF = "sufvuqdnqohpfzkwxohq";
assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, PREVIEW_REF, "Preview project guard failed");
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
assert.ok(token, "SUPABASE_ACCESS_TOKEN is required");

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PREVIEW_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json();
}

const [row] = await query(`
  select jsonb_build_object(
    'projectRef', '${PREVIEW_REF}',
    'migrationVersion', (select max(version) from supabase_migrations.schema_migrations),
    'functionExists', to_regprocedure('public.discard_current_anonymous_account_for_switch()') is not null,
    'missingGuardTables', (
      select coalesce(jsonb_agg(name), '[]'::jsonb)
      from unnest(array['user_account_auth_methods','payment_transactions','user_monthly_passes','user_invitations','user_friends','guild_members','guilds','guild_exp_daily_ledger','guild_exp_daily_progress','raid_damage_logs','raid_reward_grants','raid_production_reward_grants','raid_completion_xp_grants','raid_instance_user_progress','user_raid_daily_attempts','pvp_defense_logs','pvp_ranking_reward_grants','pvp_daily_wins','gvg_attack_logs','gvg_individual_season_rankings']) name
      where to_regclass('public.' || name) is null
    ),
    'publicUserRestrictiveReferences', (
      select coalesce(jsonb_agg(jsonb_build_object('table', conrelid::regclass::text, 'constraint', conname)), '[]'::jsonb)
      from pg_constraint
      where contype = 'f' and confrelid = 'public.users'::regclass and confdeltype in ('a', 'r')
    )
  ) as audit;
`);

if (process.argv.includes("--post-apply")) {
  assert.deepEqual(row.audit.missingGuardTables, [], "Preview schema is missing a protected-history table");
  assert.equal(row.audit.functionExists, true, "00196 RPC is missing");
  const [contract] = await query(`
    select
      prosecdef as security_definer,
      proargnames is null as no_arguments,
      has_function_privilege('authenticated', 'public.discard_current_anonymous_account_for_switch()', 'EXECUTE') as authenticated_execute,
      not has_function_privilege('anon', 'public.discard_current_anonymous_account_for_switch()', 'EXECUTE') as anon_rejected,
      position('auth.uid()' in pg_get_functiondef(p.oid)) > 0 as caller_only,
      position('payment_transactions' in pg_get_functiondef(p.oid)) > 0 as payment_guard,
      position('gvg_attack_logs' in pg_get_functiondef(p.oid)) > 0 as gvg_guard,
      position('delete from auth.users' in lower(pg_get_functiondef(p.oid))) > 0 as auth_delete
    from pg_proc p
    where p.oid = 'public.discard_current_anonymous_account_for_switch()'::regprocedure;
  `);
  for (const [key, value] of Object.entries(contract)) assert.equal(value, true, `${key} contract failed`);
  console.log(JSON.stringify({ status: "PASS", ...row.audit, contract }, null, 2));
} else {
  console.log(JSON.stringify({ status: "AUDIT", ...row.audit }, null, 2));
}
