-- Open Beta M3-2a: atomic, owner-checked character equipment loadouts.

create or replace function public.set_character_equipment(
  p_character_id uuid,
  p_equipment_id uuid,
  p_slot_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_master_id text;
  v_equipment_master public.equipment_battle_master%rowtype;
  v_expected_slot_type text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select character_id into v_character_master_id
  from public.user_characters
  where id = p_character_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'owned character not found' using errcode = 'P0002';
  end if;

  v_expected_slot_type := case p_slot_index
    when 0 then 'WEAPON' when 1 then 'WEAPON'
    when 2 then 'HEAD' when 3 then 'BODY' when 4 then 'LEGS'
    when 5 then 'ACCESSORY' when 6 then 'ACCESSORY'
    else null
  end;
  if v_expected_slot_type is null then
    raise exception 'invalid equipment slot' using errcode = '22023';
  end if;

  select master.* into v_equipment_master
  from public.user_equipments owned
  join public.equipment_battle_master master
    on master.equipment_id = coalesce(nullif(owned.equipment_id, ''), owned.equipment_master_id)
  where owned.id = p_equipment_id and owned.user_id = v_user_id
  for update of owned;
  if not found then
    raise exception 'owned equipment not found' using errcode = 'P0002';
  end if;
  if v_equipment_master.slot_type <> v_expected_slot_type then
    raise exception 'equipment type does not match slot' using errcode = '23514';
  end if;
  if v_equipment_master.is_exclusive
     and v_equipment_master.exclusive_character_id is distinct from v_character_master_id then
    raise exception 'exclusive equipment cannot be equipped by this character' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.user_equipments
    where id = p_equipment_id and equipped_character_id is not null
      and equipped_character_id <> p_character_id::text
  ) then
    raise exception 'equipment is already equipped by another character' using errcode = '23505';
  end if;

  update public.user_equipments
  set equipped_character_id = null, slot_index = null
  where user_id = v_user_id
    and equipped_character_id = p_character_id::text
    and slot_index = p_slot_index
    and id <> p_equipment_id;

  update public.user_equipments
  set equipped_character_id = p_character_id::text, slot_index = p_slot_index
  where id = p_equipment_id and user_id = v_user_id;

  return jsonb_build_object('status', 'success', 'equipment_id', p_equipment_id, 'slot_index', p_slot_index);
end;
$$;

create or replace function public.unequip_character_equipment(p_equipment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.user_equipments
  set equipped_character_id = null, slot_index = null
  where id = p_equipment_id and user_id = v_user_id;
  if not found then
    raise exception 'owned equipment not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('status', 'success', 'equipment_id', p_equipment_id);
end;
$$;

create or replace function public.set_character_equipment_bulk(
  p_character_id uuid,
  p_equipment_ids uuid[],
  p_slot_indexes integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_master_id text;
  v_requested_count integer := coalesce(array_length(p_equipment_ids, 1), 0);
  v_index integer;
  v_equipment_id uuid;
  v_slot_index integer;
  v_expected_slot_type text;
  v_equipment_master public.equipment_battle_master%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_requested_count <> coalesce(array_length(p_slot_indexes, 1), 0) or v_requested_count > 7 then
    raise exception 'equipment and slot arrays must have the same length up to 7' using errcode = '22023';
  end if;
  if v_requested_count <> (select count(distinct value) from unnest(coalesce(p_equipment_ids, '{}'::uuid[])) value)
     or v_requested_count <> (select count(distinct value) from unnest(coalesce(p_slot_indexes, '{}'::integer[])) value) then
    raise exception 'duplicate equipment or slot' using errcode = '23505';
  end if;

  select character_id into v_character_master_id
  from public.user_characters
  where id = p_character_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'owned character not found' using errcode = 'P0002';
  end if;

  for v_index in 1..v_requested_count loop
    v_equipment_id := p_equipment_ids[v_index];
    v_slot_index := p_slot_indexes[v_index];
    v_expected_slot_type := case v_slot_index
      when 0 then 'WEAPON' when 1 then 'WEAPON'
      when 2 then 'HEAD' when 3 then 'BODY' when 4 then 'LEGS'
      when 5 then 'ACCESSORY' when 6 then 'ACCESSORY'
      else null
    end;
    if v_expected_slot_type is null then
      raise exception 'invalid equipment slot' using errcode = '22023';
    end if;
    select master.* into v_equipment_master
    from public.user_equipments owned
    join public.equipment_battle_master master
      on master.equipment_id = coalesce(nullif(owned.equipment_id, ''), owned.equipment_master_id)
    where owned.id = v_equipment_id and owned.user_id = v_user_id
    for update of owned;
    if not found then
      raise exception 'owned equipment not found' using errcode = 'P0002';
    end if;
    if v_equipment_master.slot_type <> v_expected_slot_type then
      raise exception 'equipment type does not match slot' using errcode = '23514';
    end if;
    if v_equipment_master.is_exclusive
       and v_equipment_master.exclusive_character_id is distinct from v_character_master_id then
      raise exception 'exclusive equipment cannot be equipped by this character' using errcode = '42501';
    end if;
    if exists (
      select 1 from public.user_equipments
      where id = v_equipment_id and equipped_character_id is not null
        and equipped_character_id <> p_character_id::text
    ) then
      raise exception 'equipment is already equipped by another character' using errcode = '23505';
    end if;
  end loop;

  update public.user_equipments
  set equipped_character_id = null, slot_index = null
  where user_id = v_user_id and equipped_character_id = p_character_id::text;

  for v_index in 1..v_requested_count loop
    update public.user_equipments
    set equipped_character_id = p_character_id::text, slot_index = p_slot_indexes[v_index]
    where id = p_equipment_ids[v_index] and user_id = v_user_id;
  end loop;

  return jsonb_build_object('status', 'success', 'equipped_count', v_requested_count);
end;
$$;

create or replace function public.unequip_character_equipment_bulk(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.user_characters where id = p_character_id and user_id = v_user_id) then
    raise exception 'owned character not found' using errcode = 'P0002';
  end if;
  update public.user_equipments
  set equipped_character_id = null, slot_index = null
  where user_id = v_user_id and equipped_character_id = p_character_id::text;
  get diagnostics v_count = row_count;
  return jsonb_build_object('status', 'success', 'unequipped_count', v_count);
end;
$$;

revoke all on function public.set_character_equipment(uuid, uuid, integer) from public, anon;
revoke all on function public.unequip_character_equipment(uuid) from public, anon;
revoke all on function public.set_character_equipment_bulk(uuid, uuid[], integer[]) from public, anon;
revoke all on function public.unequip_character_equipment_bulk(uuid) from public, anon;
grant execute on function public.set_character_equipment(uuid, uuid, integer) to authenticated;
grant execute on function public.unequip_character_equipment(uuid) to authenticated;
grant execute on function public.set_character_equipment_bulk(uuid, uuid[], integer[]) to authenticated;
grant execute on function public.unequip_character_equipment_bulk(uuid) to authenticated;

-- Equipment level, + value, and loadout placement are RPC-only mutations.
revoke update on table public.user_equipments from authenticated;

-- Legacy functions trust caller-supplied user IDs and must not remain callable.
do $$
begin
  if to_regprocedure('public.unequip_gear_bulk(text,uuid)') is not null then
    execute 'revoke all on function public.unequip_gear_bulk(text,uuid) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.equip_gear_bulk(text,uuid,jsonb)') is not null then
    execute 'revoke all on function public.equip_gear_bulk(text,uuid,jsonb) from public, anon, authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';
