import { spawnSync } from "node:child_process";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("preview");
await verifySupabaseTarget({ environment: "preview", mutation: false });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32"
  ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe"
  : "psql";

const sql = String.raw`
begin;
do $test$
declare
  v_user_id uuid;
  v_row_count integer;
  v_occurrence_count integer;
begin
  select member.user_id into v_user_id
  from public.guild_members member
  order by member.joined_at nulls last, member.user_id
  limit 1;

  if v_user_id is null then
    raise exception 'Preview has no Guild member available for the transactional authority proof';
  end if;

  delete from public.user_funnel_milestones
  where user_id = v_user_id and milestone = 'activation_mission_handoff';

  insert into public.user_funnel_milestones(user_id, milestone, metadata)
  values (v_user_id, 'guild_activation', '{}'::jsonb)
  on conflict (user_id, milestone) do nothing;

  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform public.complete_activation_mission_handoff();
  perform public.complete_activation_mission_handoff();

  select count(*), max(occurrence_count)
  into v_row_count, v_occurrence_count
  from public.user_funnel_milestones
  where user_id = v_user_id and milestone = 'activation_mission_handoff';

  if v_row_count <> 1 or v_occurrence_count <> 1 then
    raise exception 'Activation handoff is not idempotent: rows=%, occurrences=%', v_row_count, v_occurrence_count;
  end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    perform public.complete_activation_mission_handoff();
    raise exception 'Prerequisite guard unexpectedly allowed an unaffiliated user';
  exception
    when sqlstate '55000' then null;
  end;
end;
$test$;
rollback;
`;

const result = spawnSync(executable, [
  "-X", "-v", "ON_ERROR_STOP=1",
  "--host", connection.host,
  "--port", connection.port,
  "--username", connection.user,
  "--dbname", connection.database,
  "--command", sql,
], {
  encoding: "utf8",
  env: { ...process.env, PGPASSWORD: connection.password },
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Phase 5 activation handoff Preview authority: PASS (idempotency, prerequisite guard, rollback).");
