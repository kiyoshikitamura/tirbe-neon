import assert from "node:assert/strict";

const expectedRef = "vosbyukxmskvisbgleug";
assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, expectedRef);
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
assert.ok(token, "SUPABASE_ACCESS_TOKEN is required");

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${expectedRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json();
}

const rows = await query(`
  select
    position('0.35' in pg_get_functiondef('public.apply_tutorial_enemy_snapshot(uuid,jsonb,jsonb)'::regprocedure)) > 0 as durability_35,
    position('apply_tutorial_enemy_snapshot' in pg_get_functiondef('public.create_patrol_battle_replay(uuid,text)'::regprocedure)) > 0 as replay_hook,
    (select schedule from cron.job where jobname='anonymous-onboarding-cleanup-daily') as cleanup_schedule,
    public.cleanup_expired_anonymous_onboarding() as cleanup_result;
`);
const row = rows[0];
assert.equal(row.durability_35, true);
assert.equal(row.replay_hook, true);
assert.equal(row.cleanup_schedule, "0 18 * * *");
assert.deepEqual(row.cleanup_result, { runId: row.cleanup_result.runId, candidates: 0, deleted: 0, skipped: 0 });
console.log(JSON.stringify({ status: "PASS", projectRef: expectedRef, ...row }, null, 2));
