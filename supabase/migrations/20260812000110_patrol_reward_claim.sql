-- Open Beta M1: server-authoritative, idempotent patrol reward claim.

alter table public.users
  add column if not exists level integer not null default 1,
  add column if not exists xp integer not null default 0;

create or replace function public.apply_user_xp(p_user_id uuid, p_xp_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level integer;
  v_xp integer;
  v_next_xp integer;
  v_leveled_up boolean := false;
begin
  if p_xp_amount < 0 then
    raise exception 'XP amount must not be negative' using errcode = '22023';
  end if;

  select level, xp into v_level, v_xp
  from public.users
  where id = p_user_id
  for update;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;

  if v_level < 99 then
    v_xp := v_xp + p_xp_amount;
    loop
      select next_xp into v_next_xp from public.user_level_master where level = v_level;
      exit when v_next_xp is null or v_next_xp = 0 or v_xp < v_next_xp or v_level >= 99;
      v_xp := v_xp - v_next_xp;
      v_level := v_level + 1;
      v_leveled_up := true;
    end loop;
    if v_level = 99 then v_xp := 0; end if;
    update public.users set level = v_level, xp = v_xp where id = p_user_id;
  end if;

  return jsonb_build_object('level', v_level, 'xp', v_xp, 'leveled_up', v_leveled_up);
end;
$$;

revoke all on function public.apply_user_xp(uuid, integer) from public;
revoke all on function public.apply_user_xp(uuid, integer) from anon;

create or replace function public.add_user_xp(p_user_id uuid, p_xp_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'you may only update your own XP' using errcode = '42501';
  end if;
  return public.apply_user_xp(p_user_id, p_xp_amount);
end;
$$;

revoke all on function public.add_user_xp(uuid, integer) from public;
revoke all on function public.add_user_xp(uuid, integer) from anon;
grant execute on function public.add_user_xp(uuid, integer) to authenticated;

create or replace function public.claim_patrol_rewards(p_patrol_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_patrol record;
  v_xp_result jsonb;
  v_reward jsonb;
  v_item_id text;
  v_item_quantity integer;
  v_item_chance numeric;
  v_awarded_items jsonb := '[]'::jsonb;
  v_reward_snapshot jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select patrol.id, patrol.status, patrol.expires_at,
         patrol.has_battle_event, patrol.battle_resolved, patrol.battle_result,
         coalesce(patrol.course_id, patrol.quest_id) as course_id,
         quest.name as course_name, quest.cash_reward, quest.exp_reward, quest.item_rewards
  into v_patrol
  from public.user_patrols patrol
  left join public.quests quest on quest.id = coalesce(patrol.course_id, patrol.quest_id)
  where patrol.id = p_patrol_id and patrol.user_id = v_user_id
  for update of patrol;

  if not found then raise exception 'patrol not found' using errcode = 'P0002'; end if;
  if v_patrol.course_name is null then raise exception 'quest master not found' using errcode = '23503'; end if;
  if v_patrol.status = 'COMPLETED' then raise exception 'patrol rewards already claimed' using errcode = '23505'; end if;
  if v_patrol.status <> 'CLAIMABLE' and v_patrol.expires_at > now() then
    raise exception 'patrol is not complete' using errcode = '23514';
  end if;
  if v_patrol.has_battle_event and not coalesce(v_patrol.battle_resolved, false) then
    raise exception 'patrol battle must be resolved before claiming rewards' using errcode = '23514';
  end if;

  insert into public.presents (user_id, item_id, quantity, message, status, expire_at)
  values (
    v_user_id, 'CASH', greatest(coalesce(v_patrol.cash_reward, 0), 0),
    'クエスト報酬: ' || v_patrol.course_name, 'UNCLAIMED', now() + interval '24 hours'
  );

  for v_reward in select value from jsonb_array_elements(coalesce(v_patrol.item_rewards, '[]'::jsonb))
  loop
    v_item_id := nullif(v_reward ->> 'item_id', '');
    v_item_quantity := greatest(coalesce(nullif(v_reward ->> 'quantity', '')::integer, 1), 1);
    v_item_chance := greatest(coalesce(nullif(v_reward ->> 'chance', '')::numeric, 1), 0);
    if v_item_chance > 1 then v_item_chance := v_item_chance / 100; end if;
    if v_item_id is not null and random() <= least(v_item_chance, 1) then
      insert into public.presents (user_id, item_id, quantity, message, status, expire_at)
      values (
        v_user_id, v_item_id, v_item_quantity,
        'クエストドロップ: ' || v_patrol.course_name, 'UNCLAIMED', now() + interval '24 hours'
      );
      v_awarded_items := v_awarded_items || jsonb_build_array(
        jsonb_build_object('item_id', v_item_id, 'quantity', v_item_quantity)
      );
    end if;
  end loop;

  v_xp_result := public.apply_user_xp(v_user_id, greatest(coalesce(v_patrol.exp_reward, 0), 0));
  v_reward_snapshot := jsonb_build_object(
    'course_name', v_patrol.course_name,
    'cash', greatest(coalesce(v_patrol.cash_reward, 0), 0),
    'xp', greatest(coalesce(v_patrol.exp_reward, 0), 0),
    'items', v_awarded_items
  );

  update public.user_patrols
  set status = 'COMPLETED', rewards_accrued = v_reward_snapshot
  where id = p_patrol_id and user_id = v_user_id;

  update public.user_missions mission_progress
  set current_progress = mission_progress.current_progress + 1,
      status = case
        when mission_progress.current_progress + 1 >= mission.target_value then 'CLEAR'
        else mission_progress.status
      end,
      updated_at = now()
  from public.missions mission
  where mission_progress.mission_id = mission.id
    and mission_progress.user_id = v_user_id
    and mission.trigger_type = 'PATROL_CLEAR'
    and mission_progress.status = 'PROGRESS';

  return jsonb_build_object(
    'status', 'success',
    'patrol_id', p_patrol_id,
    'course_name', v_patrol.course_name,
    'cash', greatest(coalesce(v_patrol.cash_reward, 0), 0),
    'xp', greatest(coalesce(v_patrol.exp_reward, 0), 0),
    'items', v_awarded_items,
    'level', v_xp_result -> 'level',
    'current_xp', v_xp_result -> 'xp',
    'leveled_up', v_xp_result -> 'leveled_up'
  );
end;
$$;

revoke all on function public.claim_patrol_rewards(uuid) from public;
revoke all on function public.claim_patrol_rewards(uuid) from anon;
grant execute on function public.claim_patrol_rewards(uuid) to authenticated;

notify pgrst, 'reload schema';
