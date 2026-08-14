-- Open Beta M3-2b1: server-authoritative character awakening.

create or replace function public.awaken_character(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_level integer;
  v_next_level integer;
  v_required_cash bigint;
  v_cash bigint;
  v_material_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select awakening_level into v_current_level
  from public.user_characters
  where id = p_character_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'owned character not found' using errcode = 'P0002';
  end if;
  if v_current_level >= 5 then
    raise exception 'character awakening is already at maximum' using errcode = '23514';
  end if;

  v_next_level := v_current_level + 1;
  select required_cash into v_required_cash
  from public.character_awakening_master
  where awakening_level = v_next_level;
  if not found then
    raise exception 'character awakening master is incomplete' using errcode = 'P0002';
  end if;

  select cash into v_cash from public.users where id = v_user_id for update;
  select quantity into v_material_count
  from public.user_items
  where user_id = v_user_id and item_id = 'LAW_OF_STRIFE'
  for update;
  if coalesce(v_cash, 0) < v_required_cash then
    raise exception 'insufficient cash' using errcode = '23514';
  end if;
  if coalesce(v_material_count, 0) < 1 then
    raise exception 'insufficient awakening material' using errcode = '23514';
  end if;

  update public.users set cash = cash - v_required_cash where id = v_user_id;
  update public.user_items set quantity = quantity - 1
  where user_id = v_user_id and item_id = 'LAW_OF_STRIFE';
  update public.user_characters set awakening_level = v_next_level
  where id = p_character_id and user_id = v_user_id;

  return jsonb_build_object(
    'status', 'success',
    'awakening_level', v_next_level,
    'cash_spent', v_required_cash,
    'remaining_cash', v_cash - v_required_cash
  );
end;
$$;

revoke all on function public.awaken_character(uuid) from public, anon;
grant execute on function public.awaken_character(uuid) to authenticated;

do $$
begin
  if to_regprocedure('public.character_awaken(uuid,text,integer)') is not null then
    execute 'revoke all on function public.character_awaken(uuid,text,integer) from public, anon, authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';
