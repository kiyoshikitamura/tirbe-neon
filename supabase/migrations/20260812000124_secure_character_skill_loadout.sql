-- Open Beta M3-2c: atomic, owner-scoped character skill loadouts.

create or replace function public.set_character_skill(
  p_character_id uuid,
  p_skill_id uuid,
  p_slot_index integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_awakening integer;
  v_character_master_id text;
  v_skill_master_id text;
  v_exclusive_character_id text;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select coalesce(awakening_level, 0), character_id
    into v_awakening, v_character_master_id
  from public.user_characters
  where id = p_character_id and user_id = v_user_id
  for update;
  if not found then raise exception 'owned character not found' using errcode = 'P0002'; end if;
  if p_slot_index < 0 or p_slot_index > least(5, 2 + greatest(v_awakening, 0)) then
    raise exception 'skill slot is locked' using errcode = '23514';
  end if;

  select owned.skill_card_id, master.exclusive_character_id
    into v_skill_master_id, v_exclusive_character_id
  from public.user_skills owned
  join public.skill_battle_master master on master.skill_id = owned.skill_card_id and master.enabled
  where owned.id = p_skill_id and owned.user_id = v_user_id
  for update of owned;
  if not found then raise exception 'owned executable skill not found' using errcode = 'P0002'; end if;
  if v_exclusive_character_id is not null and v_exclusive_character_id <> v_character_master_id then
    raise exception 'exclusive skill character mismatch' using errcode = '23514';
  end if;

  update public.user_skills set equipped_character_id = null, slot_index = null
  where user_id = v_user_id and equipped_character_id = p_character_id::text and slot_index = p_slot_index;
  update public.user_skills set equipped_character_id = null, slot_index = null
  where id = p_skill_id and user_id = v_user_id;
  update public.user_skills set equipped_character_id = p_character_id::text, slot_index = p_slot_index
  where id = p_skill_id and user_id = v_user_id;
  return jsonb_build_object('status','success','skill_id',v_skill_master_id,'slot_index',p_slot_index);
end; $$;

create or replace function public.unequip_character_skill(p_skill_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.user_skills set equipped_character_id = null, slot_index = null
  where id = p_skill_id and user_id = v_user_id;
  if not found then raise exception 'owned skill not found' using errcode = 'P0002'; end if;
  return jsonb_build_object('status','success');
end; $$;

create or replace function public.set_character_skill_loadout(
  p_character_id uuid,
  p_skill_ids uuid[],
  p_slot_indexes integer[]
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_awakening integer;
  v_character_master_id text;
  v_count integer := coalesce(cardinality(p_skill_ids), 0);
  v_valid_count integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_skill_ids is null or p_slot_indexes is null or v_count <> coalesce(cardinality(p_slot_indexes), 0) or v_count > 6 then
    raise exception 'invalid skill loadout arrays' using errcode = '22023';
  end if;
  if v_count <> (select count(distinct value) from unnest(p_skill_ids) value)
    or v_count <> (select count(distinct value) from unnest(p_slot_indexes) value) then
    raise exception 'duplicate skill or slot' using errcode = '23514';
  end if;

  select coalesce(awakening_level, 0), character_id
    into v_awakening, v_character_master_id
  from public.user_characters
  where id = p_character_id and user_id = v_user_id
  for update;
  if not found then raise exception 'owned character not found' using errcode = 'P0002'; end if;
  if exists (
    select 1 from unnest(p_slot_indexes) slot_index
    where slot_index < 0 or slot_index > least(5, 2 + greatest(v_awakening, 0))
  ) then raise exception 'skill slot is locked' using errcode = '23514'; end if;

  select count(*) into v_valid_count
  from public.user_skills owned
  join public.skill_battle_master master on master.skill_id = owned.skill_card_id and master.enabled
  where owned.user_id = v_user_id
    and owned.id = any(p_skill_ids)
    and (master.exclusive_character_id is null or master.exclusive_character_id = v_character_master_id);
  if v_valid_count <> v_count then raise exception 'invalid owned executable skill loadout' using errcode = '23514'; end if;

  perform 1 from public.user_skills where user_id = v_user_id and id = any(p_skill_ids) for update;
  update public.user_skills set equipped_character_id = null, slot_index = null
  where user_id = v_user_id and (equipped_character_id = p_character_id::text or id = any(p_skill_ids));
  update public.user_skills owned
  set equipped_character_id = p_character_id::text, slot_index = selected.slot_index
  from unnest(p_skill_ids, p_slot_indexes) selected(skill_id, slot_index)
  where owned.id = selected.skill_id and owned.user_id = v_user_id;
  return jsonb_build_object('status','success','equipped_count',v_count);
end; $$;

revoke all on function public.set_character_skill(uuid,uuid,integer) from public, anon;
revoke all on function public.unequip_character_skill(uuid) from public, anon;
revoke all on function public.set_character_skill_loadout(uuid,uuid[],integer[]) from public, anon;
grant execute on function public.set_character_skill(uuid,uuid,integer) to authenticated;
grant execute on function public.unequip_character_skill(uuid) to authenticated;
grant execute on function public.set_character_skill_loadout(uuid,uuid[],integer[]) to authenticated;

revoke update on table public.user_skills from authenticated;
revoke update (equipped_character_id, slot_index) on table public.user_skills from authenticated;

do $$ begin
  if to_regprocedure('public.equip_skill_bulk(text,uuid,jsonb)') is not null then
    execute 'revoke all on function public.equip_skill_bulk(text,uuid,jsonb) from public,anon,authenticated';
  end if;
  if to_regprocedure('public.unequip_skill_bulk(text,uuid)') is not null then
    execute 'revoke all on function public.unequip_skill_bulk(text,uuid) from public,anon,authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';
