-- Open Beta M2: recover and consume quest AP in the same transaction.

create or replace function public.start_patrol(
  p_course_id text,
  p_character_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_master_id text;
  v_duration_seconds integer;
  v_cost_vitality integer;
  v_vitality integer;
  v_active_count integer;
  v_has_battle boolean;
  v_battle_chance numeric;
  v_new_id uuid;
  v_is_tutorial_dispatch boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select quest.duration_seconds, quest.cost_vitality
  into v_duration_seconds, v_cost_vitality
  from public.quests quest
  where quest.id = p_course_id;

  if v_duration_seconds is null then
    raise exception 'quest master not found' using errcode = '23503';
  end if;

  select owned.character_id::text
  into v_character_master_id
  from public.user_characters owned
  where owned.user_id = v_user_id
    and (owned.id::text = p_character_id or owned.character_id::text = p_character_id)
  order by (owned.id::text = p_character_id) desc
  limit 1;

  if v_character_master_id is null then
    raise exception 'character is not owned' using errcode = '23503';
  end if;

  select count(*) into v_active_count
  from public.user_patrols patrol
  where patrol.user_id = v_user_id and patrol.status <> 'COMPLETED';

  if v_active_count >= 5 then
    raise exception 'all dispatch slots are occupied' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.user_patrols patrol
    where patrol.user_id = v_user_id
      and patrol.character_id = v_character_master_id
      and patrol.status <> 'COMPLETED'
  ) then
    raise exception 'character is already dispatched' using errcode = '23505';
  end if;

  -- This function locks the same user row, settles elapsed recovery and resets
  -- a stale full-AP timestamp before this transaction consumes quest AP.
  perform public.sync_and_recover_vitality_and_pvp_points(v_user_id);

  select player.vitality into v_vitality
  from public.users player
  where player.id = v_user_id
  for update;

  if coalesce(v_vitality, 0) < v_cost_vitality then
    raise exception 'insufficient vitality' using errcode = '23514';
  end if;

  if to_regclass('public.tutorial_progress') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'tutorial_progress' and column_name = 'user_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'tutorial_progress' and column_name = 'step_id'
    ) then
    execute 'select progress.step_id = ''DISPATCH'' from public.tutorial_progress progress where progress.user_id = $1'
      into v_is_tutorial_dispatch
      using v_user_id;
  end if;

  select max(npc.encounter_rate)
  into v_battle_chance
  from public.patrol_npcs npc
  where npc.quest_id = p_course_id;

  v_has_battle := v_battle_chance is not null
    and (coalesce(v_is_tutorial_dispatch, false) or random() <= v_battle_chance);

  insert into public.user_patrols (
    user_id, course_id, character_id, started_at, expires_at,
    status, has_battle_event, battle_resolved
  ) values (
    v_user_id, p_course_id, v_character_master_id, now(),
    now() + (v_duration_seconds * interval '1 second'),
    'ONGOING', v_has_battle, false
  ) returning id into v_new_id;

  update public.users as player
  set vitality = player.vitality - v_cost_vitality
  where player.id = v_user_id;

  v_vitality := v_vitality - v_cost_vitality;

  return jsonb_build_object(
    'status', 'success',
    'patrol_id', v_new_id,
    'has_battle', v_has_battle,
    'duration_seconds', v_duration_seconds,
    'cost_vitality', v_cost_vitality,
    'remaining_vitality', v_vitality
  );
end;
$$;

revoke all on function public.start_patrol(text, text) from public;
revoke all on function public.start_patrol(text, text) from anon;
grant execute on function public.start_patrol(text, text) to authenticated;

notify pgrst, 'reload schema';
