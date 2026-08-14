-- Open Beta M3-3a: finalized equipment-level battle contribution curve.
-- Lv1=10%, Lv50=60%, Lv100=100%. Limit-break contribution remains unchanged
-- until its fixed per-equipment bonus master is approved.

create or replace function public.equipment_level_battle_scale(p_level integer)
returns numeric
language sql
immutable
strict
set search_path = public
as $$
  select case
    when greatest(least(p_level, 100), 1) <= 50
      then 0.1 + (greatest(least(p_level, 100), 1) - 1) * 0.5 / 49
    else 0.6 + (greatest(least(p_level, 100), 1) - 50) * 0.4 / 50
  end;
$$;

do $migration$
declare
  v_definition text;
  v_updated text;
  v_old_hp text := 'sum(floor(master.hp * (1 + (greatest(coalesce(owned.level, 1), 1) - 1) * 0.05 + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as hp';
  v_old_atk text := 'sum(floor(master.atk * (1 + (greatest(coalesce(owned.level, 1), 1) - 1) * 0.05 + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as atk';
  v_old_def text := 'sum(floor(master.def * (1 + (greatest(coalesce(owned.level, 1), 1) - 1) * 0.05 + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as def';
begin
  if to_regprocedure('public.create_patrol_battle_replay(uuid,text)') is null then
    raise exception 'create_patrol_battle_replay(uuid,text) is required' using errcode = 'P0002';
  end if;

  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)'))
  into v_definition;
  v_updated := replace(v_definition, v_old_hp,
    'sum(floor(master.hp * (public.equipment_level_battle_scale(coalesce(owned.level, 1)) + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as hp');
  v_updated := replace(v_updated, v_old_atk,
    'sum(floor(master.atk * (public.equipment_level_battle_scale(coalesce(owned.level, 1)) + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as atk');
  v_updated := replace(v_updated, v_old_def,
    'sum(floor(master.def * (public.equipment_level_battle_scale(coalesce(owned.level, 1)) + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as def');

  if v_updated = v_definition
     or position(v_old_hp in v_updated) > 0
     or position(v_old_atk in v_updated) > 0
     or position(v_old_def in v_updated) > 0 then
    raise exception 'existing patrol equipment formula did not match the expected M2-4a definition';
  end if;
  execute v_updated;
end;
$migration$;

revoke all on function public.equipment_level_battle_scale(integer) from public, anon, authenticated;
revoke all on function public.create_patrol_battle_replay(uuid,text) from public, anon;
grant execute on function public.create_patrol_battle_replay(uuid,text) to authenticated;

notify pgrst, 'reload schema';
