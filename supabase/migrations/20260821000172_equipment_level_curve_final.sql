-- Equipment Level Curve Final Fix / Master Production Freeze Close.
-- Development validation first; no ownership rows are rewritten.
begin;

create or replace function public.equipment_level_battle_scale(p_level integer)
returns numeric language sql immutable strict parallel safe as $$
  select case
    when p_level not between 1 and 100 then null
    when p_level <= 50 then (p_level + 97)::numeric / 196
    else (p_level + 100)::numeric / 200
  end
$$;

create or replace function public.canonical_equipment_level_cap(p_plus_val integer)
returns integer language sql immutable strict parallel safe as $$
  select case greatest(least(p_plus_val,10),0)
    when 0 then 50 when 1 then 60 when 2 then 70 when 3 then 80 when 4 then 90 else 100
  end
$$;

create or replace function public.canonical_equipment_flat_stat(
  p_master_flat integer,
  p_level integer,
  p_plus_val integer
) returns integer language sql immutable strict parallel safe as $$
  select floor(
    p_master_flat::numeric
    * public.equipment_level_battle_scale(p_level)
    * (100 + greatest(least(p_plus_val,10),0) * 4)::numeric / 100
  )::integer
$$;

create or replace function public.level_up_equipment(
  p_equipment_id uuid,
  p_exp_item_id text,
  p_count integer default 1
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid := auth.uid();
  v_level integer; v_plus integer; v_new_level integer; v_gain integer; v_level_cap integer;
  v_cost bigint; v_material_cost integer; v_cash bigint; v_quantity integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_exp_item_id not in ('EQUIP_EXP_S','EQUIP_EXP_M','EQUIP_EXP_L') or p_count < 1 or p_count > 100 then
    raise exception 'invalid equipment training request' using errcode='22023';
  end if;
  select coalesce(level,1),coalesce(plus_val,0) into v_level,v_plus
  from public.user_equipments where id=p_equipment_id and user_id=v_user_id for update;
  if not found then raise exception 'owned equipment not found' using errcode='P0002'; end if;
  v_level_cap := public.canonical_equipment_level_cap(v_plus);
  v_new_level := least(v_level+p_count,v_level_cap); v_gain := v_new_level-v_level;
  if v_gain <= 0 then raise exception 'equipment level cap reached' using errcode='23514'; end if;
  select sum(cost_cash),sum(required_exp) into v_cost,v_material_cost
  from public.equipment_level_up_master where level between v_level+1 and v_new_level;
  if v_cost is null or v_material_cost is null then raise exception 'equipment level master is incomplete' using errcode='P0002'; end if;
  select cash into v_cash from public.users where id=v_user_id for update;
  select quantity into v_quantity from public.user_items where user_id=v_user_id and item_id=p_exp_item_id for update;
  if coalesce(v_cash,0)<v_cost then raise exception 'insufficient cash' using errcode='23514'; end if;
  if coalesce(v_quantity,0)<v_material_cost then raise exception 'insufficient equipment training material' using errcode='23514'; end if;
  update public.users set cash=cash-v_cost where id=v_user_id;
  update public.user_items set quantity=quantity-v_material_cost where user_id=v_user_id and item_id=p_exp_item_id;
  update public.user_equipments set level=v_new_level where id=p_equipment_id and user_id=v_user_id;
  perform public.evaluate_mission_progress(v_user_id,'GEAR_UPGRADE',v_gain);
  return jsonb_build_object('status','success','level',v_new_level,'levels_gained',v_gain,'level_cap',v_level_cap,'cash_spent',v_cost,'remaining_cash',v_cash-v_cost);
end $$;

do $converge_projection$
declare
  v_current text;
  v_backup text;
begin
  if to_regprocedure('public.canonical_equipment_runtime_projection_00171(uuid,uuid)') is null then
    if to_regprocedure('public.canonical_equipment_runtime_projection(uuid,uuid)') is null then
      raise exception 'canonical_equipment_runtime_projection(uuid,uuid) is required' using errcode='P0002';
    end if;
    alter function public.canonical_equipment_runtime_projection(uuid,uuid)
      rename to canonical_equipment_runtime_projection_00171;
    return;
  end if;

  select pg_get_functiondef(to_regprocedure('public.canonical_equipment_runtime_projection(uuid,uuid)')),
         pg_get_functiondef(to_regprocedure('public.canonical_equipment_runtime_projection_00171(uuid,uuid)'))
  into v_current,v_backup;
  if v_current is not null
     and position('canonical_equipment_runtime_projection_00171' in v_current)>0
     and position('_equipmentUtilityCorrection' in v_current)>0 then
    return;
  end if;
  if v_current is not null and v_backup is not null
     and position('canonical_equipment_runtime_projection_00170' in v_current)>0
     and position('characterId' in v_current)>0
     and position('canonical_equipment_runtime_projection_00170' in v_backup)>0
     and position('characterId' in v_backup)>0 then
    return;
  end if;
  raise exception 'equipment runtime projections do not match a known 00172 canonical state';
end;
$converge_projection$;

create or replace function public.canonical_equipment_runtime_projection(p_user_id uuid,p_user_character_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select public.canonical_equipment_runtime_projection_00171(p_user_id,p_user_character_id)
    || jsonb_build_object('_equipmentUtilityCorrection',jsonb_build_object(
      'spd',coalesce(sum(public.canonical_equipment_flat_stat((master.base_stats->>'spd')::integer,coalesce(owned.level,1),coalesce(owned.plus_val,0))-(master.base_stats->>'spd')::integer),0),
      'luk',coalesce(sum(public.canonical_equipment_flat_stat((master.base_stats->>'luk')::integer,coalesce(owned.level,1),coalesce(owned.plus_val,0))-(master.base_stats->>'luk')::integer),0)
    ))
  from public.user_characters character
  left join public.user_equipments owned on owned.user_id=p_user_id and owned.equipped_character_id=p_user_character_id::text
  left join public.canonical_equipment_master master on master.version='2026-08-21'
    and master.equipment_id=coalesce(nullif(owned.equipment_id,''),owned.equipment_master_id)
    and (master.exclusive_character_id is null or master.exclusive_character_id=character.character_id)
  where character.id=p_user_character_id and character.user_id=p_user_id
  group by character.character_id
$$;

create or replace function public.build_server_battle_snapshot(p_user_id uuid,p_character_ids text[],p_team text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_base jsonb; v_result jsonb;
begin
  v_base := public.build_server_battle_snapshot_00168(p_user_id,p_character_ids,p_team);
  select jsonb_agg(
    jsonb_set(
      jsonb_set(unit.value || (projection.value-'_equipmentUtilityCorrection'),'{stats,spd}',
        to_jsonb((unit.value#>>'{stats,spd}')::integer+coalesce((projection.value#>>'{_equipmentUtilityCorrection,spd}')::integer,0))),
      '{stats,luk}',to_jsonb((unit.value#>>'{stats,luk}')::integer+coalesce((projection.value#>>'{_equipmentUtilityCorrection,luk}')::integer,0))
    ) order by unit.ordinality)
  into v_result
  from jsonb_array_elements(v_base) with ordinality unit(value,ordinality)
  cross join lateral (select public.canonical_equipment_runtime_projection(
    p_user_id,regexp_replace(unit.value->>'id','^[^_]+_','')::uuid
  ) value) projection;
  return coalesce(v_result,'[]'::jsonb);
end $$;

create or replace function public.calculate_user_character_power(p_user_id uuid,p_user_character_id uuid)
returns bigint language sql stable security definer set search_path=public as $$
  with base as (
    select owned.id,owned.character_id,stats.hp,stats.atk,stats.def
    from public.user_characters owned
    cross join lateral public.canonical_character_stats(owned.character_id,owned.level,owned.awakening_level) stats
    where owned.user_id=p_user_id and owned.id=p_user_character_id
  ), equipment as (
    select coalesce(sum(
      public.canonical_equipment_flat_stat((master.base_stats->>'hp')::integer,coalesce(owned.level,1),coalesce(owned.plus_val,0))
      +public.canonical_equipment_flat_stat((master.base_stats->>'atk')::integer,coalesce(owned.level,1),coalesce(owned.plus_val,0))
      +public.canonical_equipment_flat_stat((master.base_stats->>'def')::integer,coalesce(owned.level,1),coalesce(owned.plus_val,0))
    ),0)::bigint value
    from base join public.user_equipments owned on owned.user_id=p_user_id and owned.equipped_character_id=base.id::text
    join public.canonical_equipment_master master on master.version='2026-08-21'
      and master.equipment_id=coalesce(nullif(owned.equipment_id,''),owned.equipment_master_id)
      and (master.exclusive_character_id is null or master.exclusive_character_id=base.character_id)
  ) select coalesce((select hp+atk+def+equipment.value from base cross join equipment),0)
$$;

revoke all on function public.equipment_level_battle_scale(integer),public.canonical_equipment_level_cap(integer),public.canonical_equipment_flat_stat(integer,integer,integer) from public,anon;
revoke all on function public.canonical_equipment_runtime_projection_00171(uuid,uuid),public.canonical_equipment_runtime_projection(uuid,uuid),public.build_server_battle_snapshot(uuid,text[],text) from public,anon;
grant execute on function public.level_up_equipment(uuid,text,integer) to authenticated;
grant execute on function public.build_server_battle_snapshot(uuid,text[],text) to service_role;

commit;
notify pgrst,'reload schema';
