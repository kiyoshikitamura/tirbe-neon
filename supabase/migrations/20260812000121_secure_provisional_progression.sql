-- Open Beta M3-2b2: provisional, master-driven progression values.
-- Values are explicitly subject to the Open Beta release readiness review.

create table if not exists public.character_level_up_master (
  level integer primary key check (level between 2 and 100),
  cost_cash integer not null check (cost_cash >= 0),
  required_material_count integer not null default 1 check (required_material_count > 0)
);

insert into public.character_level_up_master(level, cost_cash, required_material_count)
select level, 100, 1 from generate_series(2, 100) level
on conflict (level) do update set cost_cash = excluded.cost_cash, required_material_count = excluded.required_material_count;

insert into public.equipment_level_up_master(level, cost_cash, required_exp)
select level, 50, 1 from generate_series(2, 100) level
on conflict (level) do update set cost_cash = excluded.cost_cash, required_exp = excluded.required_exp;

insert into public.equipment_limit_break_master(plus_val, success_rate, cost_cash, required_hammer)
select plus_val, 1, plus_val * 1000, 1 from generate_series(1, 10) plus_val
on conflict (plus_val) do update set success_rate = 1, cost_cash = excluded.cost_cash, required_hammer = excluded.required_hammer;

insert into public.skill_limit_break_master(plus_val, cost_cash, required_book)
select plus_val, plus_val * 1000, 1 from generate_series(1, 10) plus_val
on conflict (plus_val) do update set cost_cash = excluded.cost_cash, required_book = excluded.required_book;

create or replace function public.level_up_character(
  p_character_id uuid,
  p_exp_item_id text,
  p_count integer default 1
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_level integer; v_awakening integer; v_new_level integer; v_gain integer;
  v_level_cap integer; v_cost bigint; v_material_cost integer; v_cash bigint; v_quantity integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_exp_item_id not in ('CHAR_EXP_S','CHAR_EXP_M','CHAR_EXP_L') or p_count < 1 or p_count > 100 then
    raise exception 'invalid character training request' using errcode = '22023';
  end if;
  select coalesce(level, 1), coalesce(awakening_level, 0) into v_level, v_awakening from public.user_characters
  where id = p_character_id and user_id = v_user_id for update;
  if not found then raise exception 'owned character not found' using errcode = 'P0002'; end if;
  v_level_cap := least(100, 50 + least(greatest(v_awakening, 0), 5) * 10);
  v_new_level := least(v_level + p_count, v_level_cap);
  v_gain := v_new_level - v_level;
  if v_gain <= 0 then raise exception 'character level cap reached' using errcode = '23514'; end if;
  select sum(cost_cash), sum(required_material_count) into v_cost, v_material_cost
  from public.character_level_up_master where level between v_level + 1 and v_new_level;
  if v_cost is null or v_material_cost is null then raise exception 'character level master is incomplete' using errcode = 'P0002'; end if;
  select cash into v_cash from public.users where id = v_user_id for update;
  select quantity into v_quantity from public.user_items where user_id = v_user_id and item_id = p_exp_item_id for update;
  if coalesce(v_cash,0) < v_cost then raise exception 'insufficient cash' using errcode = '23514'; end if;
  if coalesce(v_quantity,0) < v_material_cost then raise exception 'insufficient character training material' using errcode = '23514'; end if;
  update public.users set cash = cash - v_cost where id = v_user_id;
  update public.user_items set quantity = quantity - v_material_cost where user_id = v_user_id and item_id = p_exp_item_id;
  update public.user_characters set level = v_new_level where id = p_character_id and user_id = v_user_id;
  perform public.evaluate_mission_progress(v_user_id, 'CHAR_LEVEL_UP', v_gain);
  return jsonb_build_object('status','success','level',v_new_level,'levels_gained',v_gain,'cash_spent',v_cost,'remaining_cash',v_cash-v_cost);
end; $$;

create or replace function public.level_up_equipment(
  p_equipment_id uuid,
  p_exp_item_id text,
  p_count integer default 1
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_level integer; v_plus integer; v_new_level integer; v_gain integer; v_level_cap integer;
  v_cost bigint; v_material_cost integer; v_cash bigint; v_quantity integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_exp_item_id not in ('EQUIP_EXP_S','EQUIP_EXP_M','EQUIP_EXP_L') or p_count < 1 or p_count > 100 then
    raise exception 'invalid equipment training request' using errcode = '22023';
  end if;
  select coalesce(level, 1), coalesce(plus_val, 0) into v_level, v_plus from public.user_equipments
  where id = p_equipment_id and user_id = v_user_id for update;
  if not found then raise exception 'owned equipment not found' using errcode = 'P0002'; end if;
  v_level_cap := least(100, 50 + least(greatest(v_plus,0),5) * 10);
  v_new_level := least(v_level + p_count, v_level_cap); v_gain := v_new_level - v_level;
  if v_gain <= 0 then raise exception 'equipment level cap reached' using errcode = '23514'; end if;
  select sum(cost_cash), sum(required_exp) into v_cost, v_material_cost
  from public.equipment_level_up_master where level between v_level + 1 and v_new_level;
  if v_cost is null or v_material_cost is null then raise exception 'equipment level master is incomplete' using errcode = 'P0002'; end if;
  select cash into v_cash from public.users where id = v_user_id for update;
  select quantity into v_quantity from public.user_items where user_id = v_user_id and item_id = p_exp_item_id for update;
  if coalesce(v_cash,0) < v_cost then raise exception 'insufficient cash' using errcode = '23514'; end if;
  if coalesce(v_quantity,0) < v_material_cost then raise exception 'insufficient equipment training material' using errcode = '23514'; end if;
  update public.users set cash = cash - v_cost where id = v_user_id;
  update public.user_items set quantity = quantity - v_material_cost where user_id = v_user_id and item_id = p_exp_item_id;
  update public.user_equipments set level = v_new_level where id = p_equipment_id and user_id = v_user_id;
  perform public.evaluate_mission_progress(v_user_id, 'GEAR_UPGRADE', v_gain);
  return jsonb_build_object('status','success','level',v_new_level,'levels_gained',v_gain,'level_cap',v_level_cap,'cash_spent',v_cost,'remaining_cash',v_cash-v_cost);
end; $$;

create or replace function public.limit_break_equipment(
  p_equipment_id uuid,
  p_use_wildcard boolean,
  p_dupe_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_equipment_master_id text; v_plus integer; v_next integer;
  v_cost bigint; v_required integer; v_cash bigint; v_quantity integer; v_dupe_master_id text;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select coalesce(nullif(equipment_id,''),equipment_master_id), coalesce(plus_val, 0) into v_equipment_master_id, v_plus
  from public.user_equipments where id = p_equipment_id and user_id = v_user_id for update;
  if not found then raise exception 'owned equipment not found' using errcode = 'P0002'; end if;
  if v_plus >= 10 then raise exception 'equipment limit break cap reached' using errcode = '23514'; end if;
  v_next := v_plus + 1;
  select cost_cash, required_hammer into v_cost, v_required from public.equipment_limit_break_master where plus_val = v_next;
  if not found then raise exception 'equipment limit break master is incomplete' using errcode = 'P0002'; end if;
  select cash into v_cash from public.users where id = v_user_id for update;
  if coalesce(v_cash,0) < v_cost then raise exception 'insufficient cash' using errcode = '23514'; end if;
  if p_use_wildcard then
    select quantity into v_quantity from public.user_items where user_id=v_user_id and item_id='EQUIP_LB_HAMMER' for update;
    if coalesce(v_quantity,0) < v_required then raise exception 'insufficient equipment limit break material' using errcode = '23514'; end if;
  else
    if p_dupe_id is null or p_dupe_id = p_equipment_id then raise exception 'valid duplicate equipment is required' using errcode = '22023'; end if;
    select coalesce(nullif(equipment_id,''),equipment_master_id) into v_dupe_master_id from public.user_equipments
    where id=p_dupe_id and user_id=v_user_id and equipped_character_id is null for update;
    if not found or v_dupe_master_id is distinct from v_equipment_master_id then raise exception 'matching unequipped duplicate is required' using errcode = '23514'; end if;
  end if;
  update public.users set cash=cash-v_cost where id=v_user_id;
  if p_use_wildcard then
    update public.user_items set quantity=quantity-v_required where user_id=v_user_id and item_id='EQUIP_LB_HAMMER';
  else delete from public.user_equipments where id=p_dupe_id and user_id=v_user_id; end if;
  update public.user_equipments set plus_val=v_next where id=p_equipment_id and user_id=v_user_id;
  perform public.evaluate_mission_progress(v_user_id,'GEAR_LIMIT_BREAK',1);
  return jsonb_build_object('status','success','plus_val',v_next,'cash_spent',v_cost,'remaining_cash',v_cash-v_cost);
end; $$;

create or replace function public.limit_break_skill(
  p_skill_id uuid,
  p_use_wildcard boolean,
  p_dupe_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_skill_card_id text; v_plus integer; v_next integer;
  v_cost bigint; v_required integer; v_cash bigint; v_quantity integer; v_dupe_skill_id text; v_material_id text;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select skill_card_id, coalesce(plus_val, 0) into v_skill_card_id, v_plus from public.user_skills
  where id=p_skill_id and user_id=v_user_id for update;
  if not found then raise exception 'owned skill not found' using errcode = 'P0002'; end if;
  if v_plus >= 10 then raise exception 'skill limit break cap reached' using errcode = '23514'; end if;
  v_next := v_plus + 1;
  select cost_cash, required_book into v_cost, v_required from public.skill_limit_break_master where plus_val=v_next;
  if not found then raise exception 'skill limit break master is incomplete' using errcode = 'P0002'; end if;
  select cash into v_cash from public.users where id=v_user_id for update;
  if coalesce(v_cash,0) < v_cost then raise exception 'insufficient cash' using errcode = '23514'; end if;
  v_material_id := case
    when v_skill_card_id ~ '[0-9]+$'
      and substring(v_skill_card_id from '[0-9]+$')::integer between 51 and 70
    then 'EXCLUSIVE_CONTRACT'
    else 'SKILL_LB_BOOK'
  end;
  if p_use_wildcard then
    select quantity into v_quantity from public.user_items where user_id=v_user_id and item_id=v_material_id for update;
    if coalesce(v_quantity,0) < v_required then raise exception 'insufficient skill limit break material' using errcode = '23514'; end if;
  else
    if p_dupe_id is null or p_dupe_id=p_skill_id then raise exception 'valid duplicate skill is required' using errcode = '22023'; end if;
    select skill_card_id into v_dupe_skill_id from public.user_skills where id=p_dupe_id and user_id=v_user_id and equipped_character_id is null for update;
    if not found or v_dupe_skill_id is distinct from v_skill_card_id then raise exception 'matching unequipped duplicate is required' using errcode = '23514'; end if;
  end if;
  update public.users set cash=cash-v_cost where id=v_user_id;
  if p_use_wildcard then update public.user_items set quantity=quantity-v_required where user_id=v_user_id and item_id=v_material_id;
  else delete from public.user_skills where id=p_dupe_id and user_id=v_user_id; end if;
  update public.user_skills set plus_val=v_next where id=p_skill_id and user_id=v_user_id;
  perform public.evaluate_mission_progress(v_user_id,'SKILL_LIMIT_BREAK',1);
  return jsonb_build_object('status','success','plus_val',v_next,'cash_spent',v_cost,'remaining_cash',v_cash-v_cost,'material_id',v_material_id);
end; $$;

revoke all on table public.character_level_up_master from public, anon;
grant select on table public.character_level_up_master to authenticated;

revoke all on function public.level_up_character(uuid,text,integer) from public,anon;
revoke all on function public.level_up_equipment(uuid,text,integer) from public,anon;
revoke all on function public.limit_break_equipment(uuid,boolean,uuid) from public,anon;
revoke all on function public.limit_break_skill(uuid,boolean,uuid) from public,anon;
grant execute on function public.level_up_character(uuid,text,integer) to authenticated;
grant execute on function public.level_up_equipment(uuid,text,integer) to authenticated;
grant execute on function public.limit_break_equipment(uuid,boolean,uuid) to authenticated;
grant execute on function public.limit_break_skill(uuid,boolean,uuid) to authenticated;

-- Prevent direct changes to economic progression columns. Skill loadout columns
-- remain temporarily writable until M3-2c replaces the legacy equip RPC.
revoke insert, update, delete on table public.user_characters from authenticated;
revoke update on table public.user_skills from authenticated;
grant update (equipped_character_id, slot_index) on table public.user_skills to authenticated;
revoke insert, delete on table public.user_equipments from authenticated;

do $$ begin
  if to_regprocedure('public.character_level_up(uuid,text,text,integer,integer)') is not null then execute 'revoke all on function public.character_level_up(uuid,text,text,integer,integer) from public,anon,authenticated'; end if;
  if to_regprocedure('public.upgrade_gear(uuid,uuid,text,integer,integer)') is not null then execute 'revoke all on function public.upgrade_gear(uuid,uuid,text,integer,integer) from public,anon,authenticated'; end if;
  if to_regprocedure('public.limit_break_gear_v2(uuid,uuid,integer,boolean,uuid,jsonb)') is not null then execute 'revoke all on function public.limit_break_gear_v2(uuid,uuid,integer,boolean,uuid,jsonb) from public,anon,authenticated'; end if;
  if to_regprocedure('public.limit_break_skill_v2(uuid,uuid,integer,boolean,uuid,text)') is not null then execute 'revoke all on function public.limit_break_skill_v2(uuid,uuid,integer,boolean,uuid,text) from public,anon,authenticated'; end if;
end $$;

notify pgrst, 'reload schema';
