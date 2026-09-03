-- PREVIEW ONLY / READ-ONLY PREFLIGHT.
-- Case: the gameplay profile "ててててて" remained on an anonymous UID while
-- Google OAuth created a separate, empty authenticated UID.
-- This script makes no persistent change. Review every result before applying
-- preview_tetetetete_uid_recovery_apply.sql.
-- In the same session first run:
--   select set_config('tribe.target_project_ref','sufvuqdnqohpfzkwxohq',false);

begin transaction read only;

do $$
declare
  v_source constant uuid := '0d77f162-c15f-45c5-a7de-eb82fc9fa8c6';
  v_target constant uuid := '5ae66150-068e-4001-9018-3ba3e904f62e';
begin
  if current_setting('tribe.target_project_ref', true) is distinct from 'sufvuqdnqohpfzkwxohq' then
    raise exception 'PREVIEW ONLY: expected project ref was not asserted';
  end if;
  if not exists (
    select 1 from public.users
    where id = v_source and username = 'ててててて'
  ) then raise exception 'source profile/username mismatch'; end if;
  if not exists (
    select 1 from auth.users where id = v_source and is_anonymous is true
  ) then raise exception 'source auth user is not anonymous'; end if;
  if exists (
    select 1 from auth.identities
    where user_id = v_source and provider in ('google', 'email')
  ) then raise exception 'source already has a supported identity'; end if;
  if not exists (
    select 1 from public.tutorial_progress
    where user_id = v_source and step_id = 'COMPLETE'
      and authentication_pending is true
  ) then raise exception 'source tutorial state mismatch'; end if;
  if exists (
    select 1 from public.user_account_auth_methods where user_id = v_source
  ) then raise exception 'source already has an auth method'; end if;
  if not exists (
    select 1 from auth.users where id = v_target and is_anonymous is false
  ) then raise exception 'target Google auth user mismatch'; end if;
  if (select count(*) from auth.identities where user_id = v_target) <> 1
     or (select count(*) from auth.identities where user_id = v_target and provider = 'google') <> 1 then
    raise exception 'target must have exactly one Google identity';
  end if;
  if exists (select 1 from public.users where id = v_target) then
    raise exception 'target already has a public profile';
  end if;
end;
$$;

create temporary table recovery_reference_inventory (
  relation_name text not null,
  column_name text not null,
  reference_kind text not null,
  source_rows bigint not null,
  target_rows bigint not null,
  primary key (relation_name, column_name)
) on commit drop;

do $$
declare
  v_source constant uuid := '0d77f162-c15f-45c5-a7de-eb82fc9fa8c6';
  v_target constant uuid := '5ae66150-068e-4001-9018-3ba3e904f62e';
  r record;
  v_source_count bigint;
  v_target_count bigint;
  v_kind text;
begin
  -- Every non-primary-key UUID column containing either UID is inventoried.
  -- FK columns explicitly identify whether they reference public.users or
  -- auth.users; other UUID columns are classified NON_FK_UUID for review.
  for r in
    select n.nspname schema_name, c.relname table_name, a.attname column_name,
           exists (
             select 1 from pg_constraint pk
             where pk.conrelid = c.oid and pk.contype = 'p'
               and a.attnum = any(pk.conkey)
           ) as is_primary_key,
           coalesce((
             select rn.nspname || '.' || rc.relname
             from pg_constraint fk
             join pg_class rc on rc.oid = fk.confrelid
             join pg_namespace rn on rn.oid = rc.relnamespace
             where fk.conrelid = c.oid and fk.contype = 'f'
               and a.attnum = any(fk.conkey)
               and rn.nspname in ('public', 'auth') and rc.relname = 'users'
             limit 1
           ), '') as referenced_users
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid and c.relkind in ('r', 'p')
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and a.atttypid = 'uuid'::regtype
      and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
      and not (c.relname = 'users' and a.attname = 'id')
    order by n.nspname, c.relname, a.attnum
  loop
    execute format('select count(*) from %I.%I where %I = $1',
                   r.schema_name, r.table_name, r.column_name)
      into v_source_count using v_source;
    execute format('select count(*) from %I.%I where %I = $1',
                   r.schema_name, r.table_name, r.column_name)
      into v_target_count using v_target;
    if v_source_count > 0 or v_target_count > 0 then
      if r.referenced_users = 'public.users' then v_kind := 'FK_PUBLIC_USERS';
      elsif r.referenced_users = 'auth.users' then v_kind := 'FK_AUTH_USERS';
      elsif r.is_primary_key then v_kind := 'PRIMARY_KEY_REVIEW_ONLY';
      else v_kind := 'NON_FK_UUID'; end if;
      insert into recovery_reference_inventory values (
        format('%I.%I', r.schema_name, r.table_name), r.column_name,
        v_kind, v_source_count, v_target_count
      );
    end if;
  end loop;
end;
$$;

select 'AUTH_SUMMARY' as section, jsonb_build_object(
  'source', (select jsonb_build_object('id', id, 'is_anonymous', is_anonymous)
             from auth.users where id = '0d77f162-c15f-45c5-a7de-eb82fc9fa8c6'),
  'target', (select jsonb_build_object('id', id, 'is_anonymous', is_anonymous)
             from auth.users where id = '5ae66150-068e-4001-9018-3ba3e904f62e')
) as detail;

select 'PROFILE_AND_CRITICAL_STATE' as section, jsonb_build_object(
  'profile', to_jsonb(u),
  'tutorial', (select to_jsonb(t) from public.tutorial_progress t where t.user_id = u.id),
  'items', (select jsonb_build_object('rows', count(*), 'quantity', coalesce(sum(quantity), 0))
            from public.user_items where user_id = u.id),
  'characters', (select jsonb_build_object('rows', count(*), 'levels', coalesce(sum(level), 0))
                 from public.user_characters where user_id = u.id),
  'equipment', (select jsonb_build_object('rows', count(*), 'levels', coalesce(sum(level), 0))
                from public.user_equipments where user_id = u.id),
  'skills', (select jsonb_build_object('rows', count(*), 'plus', coalesce(sum(plus_val), 0))
             from public.user_skills where user_id = u.id)
) as detail
from public.users u
where u.id = '0d77f162-c15f-45c5-a7de-eb82fc9fa8c6';

select * from recovery_reference_inventory
order by reference_kind, relation_name, column_name;

-- Apply must not proceed if any target_rows is non-zero, or if any
-- PRIMARY_KEY_REVIEW_ONLY row is present. NON_FK_UUID rows are intentionally
-- included in the reviewed transfer plan.
select jsonb_build_object(
  'source_reference_rows', coalesce(sum(source_rows), 0),
  'target_reference_rows', coalesce(sum(target_rows), 0),
  'primary_key_conflicts', count(*) filter (where reference_kind = 'PRIMARY_KEY_REVIEW_ONLY'),
  'transfer_columns', count(*) filter (where source_rows > 0 and reference_kind <> 'PRIMARY_KEY_REVIEW_ONLY')
) as preflight_totals
from recovery_reference_inventory;

rollback;
