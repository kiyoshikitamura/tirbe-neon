-- PREVIEW ONLY / INVERSE DATA MOVE.
-- Run only before the retained source auth.users row is deleted. This restores
-- gameplay ownership to the anonymous UID; it does not move the Google identity.
-- Explicit approval in the SAME SESSION is required:
--   select set_config('tribe.target_project_ref','sufvuqdnqohpfzkwxohq',false);
--   select set_config(
--     'tribe.preview_uid_recovery_rollback_approval',
--     'ROLLBACK:ててててて:5ae66150->0d77f162', false
--   );

begin;

do $$
declare
  v_case constant text := 'PREVIEW_TETETETETE_20260903';
  v_source constant uuid := '0d77f162-c15f-45c5-a7de-eb82fc9fa8c6';
  v_target constant uuid := '5ae66150-068e-4001-9018-3ba3e904f62e';
  v_approval constant text := 'ROLLBACK:ててててて:5ae66150->0d77f162';
  v_target_profile jsonb; v_changed bigint; v_expected bigint; r record;
begin
  if current_setting('tribe.target_project_ref',true) is distinct from 'sufvuqdnqohpfzkwxohq' then raise exception 'PREVIEW ONLY'; end if;
  if current_setting('tribe.preview_uid_recovery_rollback_approval',true) is distinct from v_approval then raise exception 'explicit rollback approval key is missing'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_case,0));
  perform 1 from auth.users where id in(v_source,v_target) order by id for update;
  if not exists(select 1 from auth.users where id=v_source and is_anonymous) then raise exception 'retained source auth user missing'; end if;
  if exists(select 1 from public.users where id=v_source) then raise exception 'source public profile already exists'; end if;
  if not exists(select 1 from ops_account_recovery.cases where case_id=v_case and status='APPLIED') then raise exception 'applied recovery case missing'; end if;
  select to_jsonb(u) into v_target_profile from public.users u where id=v_target for update;
  if not found or v_target_profile->>'username'<>'ててててて' then raise exception 'target profile mismatch'; end if;

  -- Free unique normalized username and gift code, then clone the current
  -- target profile back to the retained source UID.
  update public.users set username='~5ae661',gift_code=null where id=v_target;
  insert into public.users
  select (jsonb_populate_record(null::public.users,
           v_target_profile || jsonb_build_object('id',v_source))).*;

  -- Re-discover the same reviewed class of UUID ownership columns so rows
  -- created after recovery are moved back rather than cascaded away. Original
  -- manifest columns must still contain at least their transferred row count.
  for r in
    select n.nspname schema_name,c.relname table_name,a.attname column_name,
           format('%I.%I',n.nspname,c.relname) relation_name,
           coalesce((select changed_rows from ops_account_recovery.transfer_counts tc
                     where tc.case_id=v_case and tc.relation_name=format('%I.%I',n.nspname,c.relname)
                       and tc.column_name=a.attname),0) original_rows
    from pg_attribute a join pg_class c on c.oid=a.attrelid and c.relkind in ('r','p')
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and a.atttypid='uuid'::regtype and a.attnum>0 and not a.attisdropped
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
      into v_expected using v_target;
    if v_expected < r.original_rows then raise exception 'target rows below original transfer count: %.%',r.relation_name,r.column_name; end if;
    execute format('update %I.%I set %I=$1 where %I=$2',r.schema_name,r.table_name,r.column_name,r.column_name)
      using v_source,v_target;
    get diagnostics v_changed=row_count;
    if v_changed<>v_expected then raise exception 'rollback count mismatch: %.%',r.relation_name,r.column_name; end if;
  end loop;

  -- Return onboarding state to the exact confirmed pre-recovery authority.
  delete from public.user_account_auth_methods where user_id=v_source;
  update public.tutorial_progress set step_id='COMPLETE',authentication_pending=true,updated_at=now() where user_id=v_source;
  if not found then raise exception 'restored tutorial row missing'; end if;
  delete from public.users where id=v_target;
  if not found then raise exception 'target public profile not removed'; end if;
  update ops_account_recovery.cases set status='ROLLED_BACK',rolled_back_at=now() where case_id=v_case and status='APPLIED';
  if not found then raise exception 'audit status update failed'; end if;
  if not exists(select 1 from public.users where id=v_source and username='ててててて') then raise exception 'restored source profile mismatch'; end if;
  if exists(select 1 from public.users where id=v_target) then raise exception 'target profile remains'; end if;
end;
$$;

commit;
