import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const userIds = process.argv.slice(2);

if (!url || !serviceRoleKey || !expectedProjectRef || !accessToken || userIds.length === 0) {
  throw new Error("Preview configuration and at least one disposable QA user id are required.");
}
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing mismatched Supabase target: ${actualProjectRef}`);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const removed = [];
for (const userId of userIds) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error(`Invalid user id: ${userId}`);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) throw error;
  removed.push(userId);
}

// Supabase Auth user deletion does not guarantee that the public game profile
// and every restrictive FK dependency are removed. Clean only the explicitly
// requested, now-authless QA profiles so usernames are reusable on the next run.
const targetSql = userIds.map((id) => `'${id}'::uuid`).join(", ");
const cleanupResponse = await fetch(`https://api.supabase.com/v1/projects/${actualProjectRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `
      do $$
      declare
        v_target_ids uuid[] := array[${targetSql}];
        v_guild_ids uuid[];
        v_dependency record;
      begin
        if exists (select 1 from auth.users where id = any(v_target_ids)) then
          raise exception 'Auth deletion must complete before game profile cleanup';
        end if;

        select coalesce(array_agg(id), array[]::uuid[]) into v_guild_ids
        from public.guilds where leader_id = any(v_target_ids);

        if exists (
          select 1 from public.guild_members member
          where member.guild_id = any(v_guild_ids)
            and not (member.user_id = any(v_target_ids))
        ) then
          raise exception 'Refusing to remove a QA-led guild containing another user';
        end if;

        for v_dependency in
          select namespace.nspname as schema_name, relation.relname as table_name, attribute.attname as column_name
          from pg_constraint constraint_row
          join pg_class relation on relation.oid = constraint_row.conrelid
          join pg_namespace namespace on namespace.oid = relation.relnamespace
          join pg_attribute attribute on attribute.attrelid = constraint_row.conrelid and attribute.attnum = constraint_row.conkey[1]
          where constraint_row.contype = 'f'
            and constraint_row.confrelid = 'public.guilds'::regclass
            and constraint_row.confdeltype in ('a', 'r', 'd')
            and cardinality(constraint_row.conkey) = 1
        loop
          execute format('delete from %I.%I where %I = any($1)', v_dependency.schema_name, v_dependency.table_name, v_dependency.column_name)
          using v_guild_ids;
        end loop;
        delete from public.guilds where id = any(v_guild_ids);

        for v_dependency in
          select namespace.nspname as schema_name, relation.relname as table_name, attribute.attname as column_name
          from pg_constraint constraint_row
          join pg_class relation on relation.oid = constraint_row.conrelid
          join pg_namespace namespace on namespace.oid = relation.relnamespace
          join pg_attribute attribute on attribute.attrelid = constraint_row.conrelid and attribute.attnum = constraint_row.conkey[1]
          where constraint_row.contype = 'f'
            and constraint_row.confrelid = 'public.users'::regclass
            and constraint_row.confdeltype in ('a', 'r', 'd')
            and cardinality(constraint_row.conkey) = 1
        loop
          execute format('delete from %I.%I where %I = any($1)', v_dependency.schema_name, v_dependency.table_name, v_dependency.column_name)
          using v_target_ids;
        end loop;
        delete from public.users where id = any(v_target_ids);
      end;
      $$;
    `,
  }),
});
if (!cleanupResponse.ok) throw new Error(`Preview game profile cleanup failed: ${cleanupResponse.status} ${await cleanupResponse.text()}`);

const verifyResponse = await fetch(`https://api.supabase.com/v1/projects/${actualProjectRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `select count(*)::int as remaining_profiles from public.users where id = any(array[${targetSql}]);`,
  }),
});
if (!verifyResponse.ok) throw new Error(`Preview cleanup verification failed: ${verifyResponse.status} ${await verifyResponse.text()}`);
const verification = await verifyResponse.json();
if (Number(verification?.[0]?.remaining_profiles || 0) !== 0) throw new Error("Preview game profile remains after cleanup.");

console.log(JSON.stringify({ projectRef: actualProjectRef, removedCount: removed.length, remainingProfiles: 0 }, null, 2));
