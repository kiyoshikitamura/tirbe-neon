-- PREVIEW ONLY. Read-only verification after the one-time UID recovery.
-- In the same session first run:
--   select set_config('tribe.target_project_ref','sufvuqdnqohpfzkwxohq',false);
begin transaction read only;

do $$
declare
  v_case constant text := 'PREVIEW_TETETETETE_20260903';
  v_source constant uuid := '0d77f162-c15f-45c5-a7de-eb82fc9fa8c6';
  v_target constant uuid := '5ae66150-068e-4001-9018-3ba3e904f62e';
  r record; v_count bigint; v_critical jsonb;
begin
  if current_setting('tribe.target_project_ref',true) is distinct from 'sufvuqdnqohpfzkwxohq' then raise exception 'PREVIEW ONLY'; end if;
  if not exists(select 1 from ops_account_recovery.cases where case_id=v_case and status='APPLIED') then raise exception 'applied audit case missing'; end if;
  if exists(select 1 from public.users where id=v_source) then raise exception 'source profile remains'; end if;
  if not exists(select 1 from auth.users where id=v_source and is_anonymous) then raise exception 'source rollback auth user missing'; end if;
  if not exists(select 1 from public.users where id=v_target and username='ててててて') then raise exception 'target profile mismatch'; end if;
  if (select count(*) from auth.identities where user_id=v_target)<>1
     or not exists(select 1 from auth.identities where user_id=v_target and provider='google') then raise exception 'target Google identity mismatch'; end if;
  if not exists(select 1 from public.tutorial_progress where user_id=v_target and step_id='AUTHENTICATION' and not authentication_pending) then raise exception 'tutorial final state mismatch'; end if;
  if not exists(select 1 from public.user_account_auth_methods where user_id=v_target and auth_method='GOOGLE') then raise exception 'auth method mismatch'; end if;
  select critical_state into v_critical from ops_account_recovery.cases where case_id=v_case;
  if exists(select 1 from public.battle_replay_sessions where result::text like '%'||v_source::text||'%')
     or exists(select 1 from public.battle_replay_sessions where finalization_result::text like '%'||v_source::text||'%')
     or (select count(*) from public.battle_replay_sessions where result #>> '{participationProgress,user_id}'=v_target::text)<>(v_critical->>'battle_replay_result_rows')::bigint
     or (select count(*) from public.battle_replay_sessions where finalization_result #>> '{participationProgress,user_id}'=v_target::text)<>(v_critical->>'battle_replay_finalization_result_rows')::bigint
     or exists(select 1 from public.battle_replay_sessions where requester_user_id=v_target and battle_mode='RAID' and result #>> '{participationProgress,user_id}'=v_target::text and result is distinct from finalization_result) then
    raise exception 'battle replay participation UID mismatch';
  end if;
  if (select count(*) from public.user_items where user_id=v_target) <> (v_critical->>'items_rows')::bigint
     or (select coalesce(sum(quantity),0) from public.user_items where user_id=v_target) <> (v_critical->>'items_quantity')::bigint
     or (select count(*) from public.user_characters where user_id=v_target) <> (v_critical->>'character_rows')::bigint
     or (select coalesce(sum(level),0) from public.user_characters where user_id=v_target) <> (v_critical->>'character_levels')::bigint
     or (select count(*) from public.user_equipments where user_id=v_target) <> (v_critical->>'equipment_rows')::bigint
     or (select coalesce(sum(level),0) from public.user_equipments where user_id=v_target) <> (v_critical->>'equipment_levels')::bigint
     or (select count(*) from public.user_skills where user_id=v_target) <> (v_critical->>'skill_rows')::bigint
     or (select coalesce(sum(plus_val),0) from public.user_skills where user_id=v_target) <> (v_critical->>'skill_plus')::bigint then
    raise exception 'critical gameplay totals differ from the recovery snapshot';
  end if;
  for r in select * from ops_account_recovery.transfer_counts where case_id=v_case loop
    execute format('select count(*) from %s where %I=$1',r.relation_name,r.column_name) into v_count using v_source;
    if v_count<>0 then raise exception 'source reference remains: %.%',r.relation_name,r.column_name; end if;
    execute format('select count(*) from %s where %I=$1',r.relation_name,r.column_name) into v_count using v_target;
    if v_count<r.changed_rows then raise exception 'target reference count regressed: %.%',r.relation_name,r.column_name; end if;
  end loop;
end;
$$;

select c.case_id,c.source_uid,c.target_uid,c.status,c.applied_at,
       u.username,u.cash,u.neon_diamonds,u.vitality,u.level,
       tp.step_id,tp.authentication_pending,m.auth_method,
       (select count(*) from public.user_characters where user_id=c.target_uid) character_rows,
       (select count(*) from public.user_equipments where user_id=c.target_uid) equipment_rows,
       (select count(*) from public.user_skills where user_id=c.target_uid) skill_rows,
       (select count(*) from public.user_items where user_id=c.target_uid) item_rows
from ops_account_recovery.cases c
join public.users u on u.id=c.target_uid
join public.tutorial_progress tp on tp.user_id=c.target_uid
join public.user_account_auth_methods m on m.user_id=c.target_uid
where c.case_id='PREVIEW_TETETETETE_20260903';

select reference_kind,count(*) columns,sum(before_rows) source_rows,sum(changed_rows) changed_rows
from ops_account_recovery.transfer_counts
where case_id='PREVIEW_TETETETETE_20260903'
group by reference_kind order by reference_kind;

rollback;
