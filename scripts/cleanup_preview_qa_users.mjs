import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const requestedUserIds = process.argv.slice(2);

if (!url || !serviceRoleKey || !expectedProjectRef || !accessToken || requestedUserIds.length === 0) {
  throw new Error("Preview configuration and at least one disposable QA user id (or --all) are required.");
}
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef || actualProjectRef !== "sufvuqdnqohpfzkwxohq") {
  throw new Error(`Refusing mismatched Supabase target: ${actualProjectRef}`);
}

let userIds = requestedUserIds;
const cleanupAll = requestedUserIds.length === 1 && requestedUserIds[0] === "--all";
if (cleanupAll) {
  const targetResponse = await fetch(`https://api.supabase.com/v1/projects/${actualProjectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        select id from auth.users
        union
        select id from public.users
        order by id;
      `,
    }),
  });
  if (!targetResponse.ok) throw new Error(`Preview cleanup target query failed: ${targetResponse.status} ${await targetResponse.text()}`);
  userIds = (await targetResponse.json()).map((row) => row.id);
}

if (userIds.length === 0) {
  console.log(JSON.stringify({ projectRef: actualProjectRef, removedCount: 0, remainingAuthUsers: 0, remainingProfiles: 0 }, null, 2));
  process.exit(0);
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
        v_trigger_table record;
      begin
        if exists (select 1 from auth.users where id = any(v_target_ids)) then
          raise exception 'Auth deletion must complete before game profile cleanup';
        end if;

        select coalesce(array_agg(id), array[]::uuid[]) into v_guild_ids
        from public.guilds where leader_id = any(v_target_ids);

        -- Account cleanup cascades through progression tables whose normal
        -- mutation triggers refresh derived power rows. During deletion those
        -- refreshes are both unnecessary and can race the parent users row.
        -- Disable only non-constraint triggers for this transaction; FK
        -- cascades remain active and all ALTERs roll back on any failure.
        for v_trigger_table in
          select distinct namespace.nspname as schema_name, relation.relname as table_name
          from pg_trigger trigger_row
          join pg_class relation on relation.oid = trigger_row.tgrelid
          join pg_namespace namespace on namespace.oid = relation.relnamespace
          join pg_proc procedure on procedure.oid = trigger_row.tgfoid
          where namespace.nspname = 'public'
            and not trigger_row.tgisinternal
            and procedure.proname like 'power_projection_%'
        loop
          execute format('alter table %I.%I disable trigger user', v_trigger_table.schema_name, v_trigger_table.table_name);
        end loop;

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

        for v_trigger_table in
          select distinct namespace.nspname as schema_name, relation.relname as table_name
          from pg_trigger trigger_row
          join pg_class relation on relation.oid = trigger_row.tgrelid
          join pg_namespace namespace on namespace.oid = relation.relnamespace
          join pg_proc procedure on procedure.oid = trigger_row.tgfoid
          where namespace.nspname = 'public'
            and not trigger_row.tgisinternal
            and procedure.proname like 'power_projection_%'
        loop
          execute format('alter table %I.%I enable trigger user', v_trigger_table.schema_name, v_trigger_table.table_name);
        end loop;
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
    query: cleanupAll
      ? `select (select count(*)::int from auth.users) as remaining_auth_users, (select count(*)::int from public.users) as remaining_profiles;`
      : `select (select count(*)::int from auth.users where id = any(array[${targetSql}])) as remaining_auth_users, (select count(*)::int from public.users where id = any(array[${targetSql}])) as remaining_profiles;`,
  }),
});
if (!verifyResponse.ok) throw new Error(`Preview cleanup verification failed: ${verifyResponse.status} ${await verifyResponse.text()}`);
const verification = await verifyResponse.json();
if (Number(verification?.[0]?.remaining_auth_users || 0) !== 0 || Number(verification?.[0]?.remaining_profiles || 0) !== 0) {
  throw new Error("Preview account data remains after cleanup.");
}

console.log(JSON.stringify({ projectRef: actualProjectRef, removedCount: removed.length, remainingAuthUsers: 0, remainingProfiles: 0 }, null, 2));
