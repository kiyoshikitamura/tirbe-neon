-- Ranking / Power P0: one canonical daily boundary at 00:00 JST.
-- Content instance windows (Raid expiry etc.) remain independent.

begin;

create or replace function public.sync_current_missions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cycle_date date := (clock_timestamp() at time zone 'Asia/Tokyo')::date;
  v_rescue record;
  v_rescued integer := 0;
begin
  if v_user_id is null or not exists (select 1 from public.users where id = v_user_id) then
    raise exception 'Player authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':missions', 0));

  for v_rescue in
    select um.mission_id, m.title, m.reward_item_id, m.reward_quantity
    from public.user_missions um
    join public.missions m on m.id = um.mission_id
    where um.user_id = v_user_id
      and m.category = 'DAILY'
      and um.cycle_date is distinct from v_cycle_date
      and um.status = 'CLEAR'
    for update of um
  loop
    insert into public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
    values (
      v_user_id, v_rescue.reward_item_id, v_rescue.reward_quantity,
      'デイリーミッション未受取補填: ' || v_rescue.title,
      'UNCLAIMED', clock_timestamp(), clock_timestamp() + interval '24 hours'
    );
    v_rescued := v_rescued + 1;
  end loop;

  update public.user_missions um
  set current_progress = 0,
      progress_val = 0,
      status = 'PROGRESS',
      claimed_at = null,
      cycle_date = v_cycle_date,
      updated_at = clock_timestamp()
  from public.missions m
  where um.user_id = v_user_id
    and um.mission_id = m.id
    and m.category = 'DAILY'
    and um.cycle_date is distinct from v_cycle_date;

  insert into public.user_missions (user_id, mission_id, current_progress, progress_val, status, cycle_date)
  select v_user_id, m.id, 0, 0, 'PROGRESS',
    case when m.category = 'DAILY' then v_cycle_date else null end
  from public.missions m
  where m.is_enabled
    and (
      m.category = 'DAILY'
      or (
        m.category = 'NORMAL'
        and (
          m.prerequisite_mission_id is null
          or exists (
            select 1 from public.user_missions prerequisite
            where prerequisite.user_id = v_user_id
              and prerequisite.mission_id = m.prerequisite_mission_id
              and prerequisite.status = 'CLAIMED'
          )
        )
      )
    )
  on conflict (user_id, mission_id) do nothing;

  update public.user_missions um
  set current_progress = m.target_value,
      progress_val = m.target_value,
      status = 'CLEAR',
      updated_at = clock_timestamp()
  from public.missions m
  where um.user_id = v_user_id
    and um.mission_id = m.id
    and m.category = 'DAILY'
    and m.trigger_type = 'DAILY_LOGIN'
    and um.cycle_date = v_cycle_date
    and um.status = 'PROGRESS';

  return jsonb_build_object('cycle_date', v_cycle_date, 'rescued_count', v_rescued);
end;
$$;

revoke all on function public.sync_current_missions() from public, anon;
grant execute on function public.sync_current_missions() to authenticated, service_role;

notify pgrst, 'reload schema';
commit;
