-- PREVIEW ONLY / ONE-TIME / MANUAL APPROVAL REQUIRED.
-- Do not add this file to db push or the migration history.
-- Do not run until the preflight output has been reviewed and a Preview PITR
-- restore point has been recorded. This never changes auth.identities and it
-- deliberately retains the source anonymous auth.users row for rollback.
--
-- The operator must execute this in the SAME SESSION immediately before this
-- file (replace the placeholder with the approved value):
--   select set_config('tribe.target_project_ref','sufvuqdnqohpfzkwxohq',false);
--   select set_config(
--     'tribe.preview_uid_recovery_approval',
--     'APPROVE:ててててて:0d77f162->5ae66150', false
--   );

begin;

do $$
declare
  v_case constant text := 'PREVIEW_TETETETETE_20260903';
  v_source constant uuid := '0d77f162-c15f-45c5-a7de-eb82fc9fa8c6';
  v_target constant uuid := '5ae66150-068e-4001-9018-3ba3e904f62e';
  v_approval constant text := 'APPROVE:ててててて:0d77f162->5ae66150';
  v_source_profile jsonb;
  v_expected_profile jsonb;
  v_username text;
  v_gift_code text;
  v_placeholder text := '~0d77f';
  v_items_rows bigint; v_items_quantity bigint;
  v_char_rows bigint; v_char_levels bigint;
  v_equipment_rows bigint; v_equipment_levels bigint;
  v_skill_rows bigint; v_skill_plus bigint;
  v_before bigint; v_after bigint; v_changed bigint;
  r record;
begin
  if current_setting('tribe.target_project_ref', true) is distinct from 'sufvuqdnqohpfzkwxohq' then
    raise exception 'PREVIEW ONLY: expected project ref was not asserted';
  end if;
  if current_setting('tribe.preview_uid_recovery_approval', true) is distinct from v_approval then
    raise exception 'explicit recovery approval key is missing';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_case, 0));
  perform 1 from auth.users where id in (v_source, v_target) order by id for update;

  if not exists (select 1 from auth.users where id=v_source and is_anonymous is true)
     or exists (select 1 from auth.identities where user_id=v_source and provider in ('google','email')) then
    raise exception 'source auth state changed';
  end if;
  if not exists (select 1 from auth.users where id=v_target and is_anonymous is false)
     or (select count(*) from auth.identities where user_id=v_target) <> 1
     or (select count(*) from auth.identities where user_id=v_target and provider='google') <> 1 then
    raise exception 'target Google identity state changed';
  end if;
  if exists (select 1 from public.users where id=v_target) then
    raise exception 'target profile is no longer empty';
  end if;
  select to_jsonb(u), username, gift_code into v_source_profile, v_username, v_gift_code
  from public.users u where id=v_source for update;
  if not found or v_username <> 'ててててて' then raise exception 'source profile mismatch'; end if;
  if not exists (select 1 from public.tutorial_progress where user_id=v_source and step_id='COMPLETE' and authentication_pending)
     or exists (select 1 from public.user_account_auth_methods where user_id=v_source) then
    raise exception 'source onboarding state changed';
  end if;

  -- Refuse an unreviewed target reference or an unrelated primary-key match.
  for r in
    select n.nspname schema_name, c.relname table_name, a.attname column_name,
           exists(select 1 from pg_constraint pk where pk.conrelid=c.oid and pk.contype='p' and a.attnum=any(pk.conkey)) is_pk,
           exists(select 1 from pg_constraint fk join pg_class rc on rc.oid=fk.confrelid
             join pg_namespace rn on rn.oid=rc.relnamespace
             where fk.conrelid=c.oid and fk.contype='f' and a.attnum=any(fk.conkey)
               and rn.nspname in ('public','auth') and rc.relname='users') references_users
    from pg_attribute a join pg_class c on c.oid=a.attrelid and c.relkind in ('r','p')
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and a.atttypid='uuid'::regtype and a.attnum>0
      and not a.attisdropped and a.attgenerated=''
      and not (c.relname='users' and a.attname='id')
  loop
    execute format('select count(*) from %I.%I where %I=$1',r.schema_name,r.table_name,r.column_name)
      into v_after using v_target;
    if v_after <> 0 then raise exception 'target gameplay/reference exists: %.%',r.table_name,r.column_name; end if;
    if r.is_pk and not r.references_users then
      execute format('select count(*) from %I.%I where %I=$1',r.schema_name,r.table_name,r.column_name)
        into v_before using v_source;
      if v_before <> 0 then raise exception 'source UID occurs in unrelated primary key: %.%',r.table_name,r.column_name; end if;
    end if;
  end loop;

  -- UUIDs embedded inside text or JSON cannot be safely reassigned by the
  -- catalog-driven UUID transfer. Stop for review instead of guessing.
  for r in
    select n.nspname schema_name,c.relname table_name,a.attname column_name
    from pg_attribute a join pg_class c on c.oid=a.attrelid and c.relkind in ('r','p')
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and a.attnum>0 and not a.attisdropped and a.attgenerated=''
      and a.atttypid in ('text'::regtype,'json'::regtype,'jsonb'::regtype)
  loop
    execute format('select count(*) from %I.%I where %I::text like $1',r.schema_name,r.table_name,r.column_name)
      into v_before using '%'||v_source::text||'%';
    if v_before<>0 then
      raise exception 'source UID embedded in %.% (% rows); manual review required',r.table_name,r.column_name,v_before;
    end if;
  end loop;

  select count(*),coalesce(sum(quantity),0) into v_items_rows,v_items_quantity from public.user_items where user_id=v_source;
  select count(*),coalesce(sum(level),0) into v_char_rows,v_char_levels from public.user_characters where user_id=v_source;
  select count(*),coalesce(sum(level),0) into v_equipment_rows,v_equipment_levels from public.user_equipments where user_id=v_source;
  select count(*),coalesce(sum(plus_val),0) into v_skill_rows,v_skill_plus from public.user_skills where user_id=v_source;

  create schema if not exists ops_account_recovery;
  create table if not exists ops_account_recovery.cases (
    case_id text primary key, source_uid uuid not null, target_uid uuid not null,
    source_profile jsonb not null, critical_state jsonb not null,
    status text not null check(status in ('APPLIED','ROLLED_BACK')),
    applied_at timestamptz not null default now(), rolled_back_at timestamptz
  );
  create table if not exists ops_account_recovery.row_snapshots (
    snapshot_id bigint generated always as identity primary key,
    case_id text not null, relation_name text not null, column_name text not null,
    row_data jsonb not null, captured_at timestamptz not null default now()
  );
  create table if not exists ops_account_recovery.transfer_counts (
    case_id text not null, relation_name text not null, column_name text not null,
    reference_kind text not null, before_rows bigint not null, changed_rows bigint not null,
    primary key(case_id, relation_name, column_name)
  );
  revoke all on schema ops_account_recovery from public;
  revoke all on all tables in schema ops_account_recovery from public, anon, authenticated;
  if exists(select 1 from ops_account_recovery.cases where case_id=v_case) then
    raise exception 'recovery case was already executed';
  end if;
  insert into ops_account_recovery.cases(case_id,source_uid,target_uid,source_profile,critical_state,status)
  values(v_case,v_source,v_target,v_source_profile,jsonb_build_object(
    'items_rows',v_items_rows,'items_quantity',v_items_quantity,
    'character_rows',v_char_rows,'character_levels',v_char_levels,
    'equipment_rows',v_equipment_rows,'equipment_levels',v_equipment_levels,
    'skill_rows',v_skill_rows,'skill_plus',v_skill_plus
  ),'APPLIED');

  -- Temporarily free normalized username and gift-code uniqueness, then clone
  -- every live public.users column from the captured row with only id changed.
  update public.users set username=v_placeholder, gift_code=null where id=v_source;
  insert into public.users
  select (jsonb_populate_record(null::public.users,
           v_source_profile || jsonb_build_object('id',v_target))).*;

  -- Transfer every public UUID reference discovered at execution time. User
  -- FKs and non-FK UUID ownership fields are both included. Primary keys were
  -- rejected above. Snapshots and exact changed counts make this reversible.
  for r in
    select n.nspname schema_name,c.relname table_name,a.attname column_name,
      coalesce((select rn.nspname||'.'||rc.relname from pg_constraint fk
        join pg_class rc on rc.oid=fk.confrelid join pg_namespace rn on rn.oid=rc.relnamespace
        where fk.conrelid=c.oid and fk.contype='f' and a.attnum=any(fk.conkey)
          and rn.nspname in ('public','auth') and rc.relname='users' limit 1),'NON_FK_UUID') ref_kind
    from pg_attribute a join pg_class c on c.oid=a.attrelid and c.relkind in ('r','p')
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and a.atttypid='uuid'::regtype and a.attnum>0
      and not a.attisdropped and a.attgenerated=''
      and not (c.relname='users' and a.attname='id')
      and not (
        exists(select 1 from pg_constraint pk where pk.conrelid=c.oid and pk.contype='p' and a.attnum=any(pk.conkey))
        and not exists(
          select 1 from pg_constraint fk join pg_class rc on rc.oid=fk.confrelid
          join pg_namespace rn on rn.oid=rc.relnamespace
          where fk.conrelid=c.oid and fk.contype='f' and a.attnum=any(fk.conkey)
            and rn.nspname in ('public','auth') and rc.relname='users'
        )
      )
    order by c.relname,a.attnum
  loop
    execute format('select count(*) from %I.%I where %I=$1',r.schema_name,r.table_name,r.column_name)
      into v_before using v_source;
    if v_before > 0 then
      execute format('insert into ops_account_recovery.row_snapshots(case_id,relation_name,column_name,row_data) select $1,$2,$3,to_jsonb(t) from %I.%I t where %I=$4',r.schema_name,r.table_name,r.column_name)
        using v_case,format('%I.%I',r.schema_name,r.table_name),r.column_name,v_source;
      execute format('update %I.%I set %I=$1 where %I=$2',r.schema_name,r.table_name,r.column_name,r.column_name)
        using v_target,v_source;
      get diagnostics v_changed = row_count;
      if v_changed <> v_before then raise exception 'transfer count mismatch: %.%',r.table_name,r.column_name; end if;
      insert into ops_account_recovery.transfer_counts values(v_case,format('%I.%I',r.schema_name,r.table_name),r.column_name,r.ref_kind,v_before,v_changed);
    end if;
  end loop;

  -- Canonical final authentication state. auth.identities remains untouched.
  insert into public.user_account_auth_methods(user_id,auth_method)
  values(v_target,'GOOGLE');
  update public.tutorial_progress set step_id='AUTHENTICATION',authentication_pending=false,updated_at=now()
  where user_id=v_target;
  if not found then raise exception 'transferred tutorial row missing'; end if;

  delete from public.users where id=v_source;
  if not found then raise exception 'source public profile was not removed'; end if;

  -- Generic and critical postconditions. Any mismatch aborts the transaction.
  for r in select * from ops_account_recovery.transfer_counts where case_id=v_case loop
    execute format('select count(*) from %s where %I=$1',r.relation_name,r.column_name) into v_after using v_source;
    if v_after <> 0 then raise exception 'source reference remains: %.%',r.relation_name,r.column_name; end if;
  end loop;
  if (select count(*) from public.user_items where user_id=v_target)<>v_items_rows
     or (select coalesce(sum(quantity),0) from public.user_items where user_id=v_target)<>v_items_quantity
     or (select count(*) from public.user_characters where user_id=v_target)<>v_char_rows
     or (select coalesce(sum(level),0) from public.user_characters where user_id=v_target)<>v_char_levels
     or (select count(*) from public.user_equipments where user_id=v_target)<>v_equipment_rows
     or (select coalesce(sum(level),0) from public.user_equipments where user_id=v_target)<>v_equipment_levels
     or (select count(*) from public.user_skills where user_id=v_target)<>v_skill_rows
     or (select coalesce(sum(plus_val),0) from public.user_skills where user_id=v_target)<>v_skill_plus then
    raise exception 'critical gameplay totals changed';
  end if;
  select to_jsonb(u)-'id'-'updated_at'-'last_active_at' into v_expected_profile from public.users u where id=v_target;
  if v_expected_profile is distinct from (v_source_profile-'id'-'updated_at'-'last_active_at') then
    raise exception 'profile values changed during transfer';
  end if;
  if not exists(select 1 from auth.users where id=v_source and is_anonymous) then
    raise exception 'rollback auth user was not retained';
  end if;
end;
$$;

commit;
