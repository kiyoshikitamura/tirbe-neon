import { spawnSync } from "node:child_process";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
await verifySupabaseTarget({ environment: "development", mutation: true });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
const sql = `do $$ declare v_user_id uuid; v_count integer; r record; begin
  select count(*),min(progress.user_id::text)::uuid into v_count,v_user_id
  from public.user_login_bonuses progress
  left join auth.users account on account.id=progress.user_id
  where account.id is null and progress.current_day=1 and progress.total_logins=31;
  if v_count<>1 then raise exception 'Expected exactly one Phase B1 orphan QA fixture, found %',v_count; end if;
  if (select count(*) from public.user_items where user_id=v_user_id and item_id='AWAKENING_BOOK' and quantity=1)<>1 then raise exception 'QA fixture signature mismatch'; end if;
  for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop
    execute format('delete from public.%I where user_id=$1',r.table_name) using v_user_id;
  end loop;
  delete from public.users where id=v_user_id;
end $$;`;
const result = spawnSync(executable, ["-X", "--set", "ON_ERROR_STOP=1", "--host", connection.host, "--port", connection.port, "--username", connection.user, "--dbname", connection.database, "--command", sql], { encoding: "utf8", env: { ...process.env, PGPASSWORD: connection.password } });
if (result.status !== 0) throw new Error(result.stderr || "QA fixture cleanup failed.");
console.log("Phase B1 Development orphan QA fixture cleanup PASS.");
