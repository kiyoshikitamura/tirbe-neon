-- M9-0: idempotent, server-authoritative bridge from tutorial formation to growth.
-- No client-provided user id, reward quantity, or tutorial destination is accepted.

begin;

create or replace function public.prepare_current_tutorial_growth()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_step text;
  v_before integer := 0;
  v_after integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select step_id into v_step
  from public.tutorial_progress
  where user_id = v_user_id
  for update;

  if v_step is null then
    raise exception 'tutorial progress not found' using errcode = 'P0002';
  end if;

  if v_step <> 'AUTO_FORMATION' then
    if v_step in ('DISPATCH', 'FREE_INSTANT', 'TUTORIAL_BATTLE', 'RULE_GUIDE', 'COMPLETE', 'AUTHENTICATION') then
      return jsonb_build_object(
        'status', 'already_advanced',
        'tutorial_step', v_step,
        'granted_quantity', 0
      );
    end if;
    raise exception 'tutorial formation is not active' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.pvp_defense_decks deck
    where deck.user_id = v_user_id
      and coalesce(
        deck.character_1_id,
        deck.character_2_id,
        deck.character_3_id,
        deck.character_4_id,
        deck.character_5_id
      ) is not null
  ) then
    raise exception 'saved formation is required' using errcode = '23514';
  end if;

  select coalesce(quantity, 0) into v_before
  from public.user_items
  where user_id = v_user_id and item_id = 'CHAR_EXP_S'
  for update;

  if not found then
    v_before := 0;
    insert into public.user_items(user_id, item_id, quantity)
    values(v_user_id, 'CHAR_EXP_S', 1)
    on conflict(user_id, item_id) do update
      set quantity = greatest(public.user_items.quantity, 1);
  elsif v_before < 1 then
    update public.user_items
    set quantity = 1
    where user_id = v_user_id and item_id = 'CHAR_EXP_S';
  end if;

  select coalesce(quantity, 0) into v_after
  from public.user_items
  where user_id = v_user_id and item_id = 'CHAR_EXP_S';

  return jsonb_build_object(
    'status', 'ready',
    'tutorial_step', v_step,
    'quantity', v_after,
    'granted_quantity', greatest(v_after - v_before, 0)
  );
end;
$$;

create or replace function public.advance_current_tutorial_after_growth()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_step text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select step_id into v_step
  from public.tutorial_progress
  where user_id = v_user_id
  for update;

  if v_step is null then
    raise exception 'tutorial progress not found' using errcode = 'P0002';
  end if;

  if v_step in ('DISPATCH', 'FREE_INSTANT', 'TUTORIAL_BATTLE', 'RULE_GUIDE', 'COMPLETE', 'AUTHENTICATION') then
    return jsonb_build_object('status', 'already_advanced', 'tutorial_step', v_step);
  end if;

  if v_step <> 'AUTO_FORMATION' then
    raise exception 'tutorial growth is not active' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.user_funnel_milestones milestone
    where milestone.user_id = v_user_id
      and milestone.milestone = 'first_growth'
  ) then
    raise exception 'character growth is required' using errcode = '23514';
  end if;

  update public.tutorial_progress
  set step_id = 'DISPATCH', updated_at = clock_timestamp()
  where user_id = v_user_id and step_id = 'AUTO_FORMATION';

  return jsonb_build_object('status', 'advanced', 'tutorial_step', 'DISPATCH');
end;
$$;

revoke all on function public.prepare_current_tutorial_growth() from public, anon;
revoke all on function public.advance_current_tutorial_after_growth() from public, anon;
grant execute on function public.prepare_current_tutorial_growth() to authenticated;
grant execute on function public.advance_current_tutorial_after_growth() to authenticated;

commit;
notify pgrst, 'reload schema';
