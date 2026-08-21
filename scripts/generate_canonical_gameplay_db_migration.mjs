import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseCanonicalEffect } from "../src/domain/battle/canonical_effects.ts";

const root = resolve(import.meta.dirname, "..");
const data = (name) => JSON.parse(readFileSync(resolve(root, "src/domain/gameplay/canonical/data", name), "utf8"));
const characters = data("characters_20260821.json");
const skills = data("skills_20260821.json");
const equipments = data("equipment_20260821.json");
const equipmentLimitBreak = data("equipment_limit_break_20260821.json");
const equipmentLbSlotOptions = Object.entries(equipmentLimitBreak.slot_options).flatMap(([category, options]) => Object.entries(options).map(([unlock_level, values]) => ({ category, unlock_level: Number(unlock_level), values })));
const expectedCostCurve = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4];
if (!Array.isArray(equipmentLimitBreak.cost_curve) || equipmentLimitBreak.cost_curve.length !== 10) throw new Error("Canonical equipment LB cost_curve must be an array of 10 values.");
if (equipmentLimitBreak.max_level !== 10) throw new Error("Canonical equipment LB max_level must be 10.");
if (JSON.stringify(equipmentLimitBreak.cost_curve) !== JSON.stringify(expectedCostCurve)) throw new Error("Canonical equipment LB cost_curve does not match the frozen contract.");
if (equipmentLimitBreak.cost_curve.reduce((total, cost) => total + cost, 0) !== 25) throw new Error("Canonical equipment LB cost_curve total must be 25.");
const equipmentLbSteps = Array.from({ length: 11 }, (_, plus_val) => ({
  plus_val,
  flat_stat_multiplier: Number((1 + plus_val * 0.04).toFixed(2)),
  equivalent_cost: plus_val === 0 ? 0 : equipmentLimitBreak.cost_curve[plus_val - 1],
}));
if (equipmentLbSteps.some((step) => step.equivalent_cost == null)) throw new Error("Canonical equipment LB steps must not contain null equivalent_cost values.");
if (JSON.stringify(equipmentLbSteps.map((step) => step.plus_val)) !== JSON.stringify([0,1,2,3,4,5,6,7,8,9,10])) throw new Error("Canonical equipment LB levels are invalid.");
if (JSON.stringify(equipmentLbSteps.map((step) => step.equivalent_cost)) !== JSON.stringify([0,1,1,2,2,2,3,3,3,4,4])) throw new Error("Canonical equipment LB equivalent costs are invalid.");
const structuredSkills = skills.skills.map((skill) => ({
  ...skill,
  effects: skill.effects.map(parseCanonicalEffect),
}));
const destination = resolve(root, "supabase/migrations/20260821000168_gameplay_foundation_canonical.sql");
const literal = (value, tag) => `$${tag}$${JSON.stringify(value)}$${tag}$`;

for (const [label, values, expected] of [["characters", characters.characters, 60], ["skills", skills.skills, 70], ["equipments", equipments.equipments, 170]]) {
  if (values.length !== expected) throw new Error(`Canonical ${label} must contain ${expected} records.`);
}

const sql = `-- GAME03 Phase 2B: Canonical Gameplay Foundation DB/RPC integration.
-- Generated from src/domain/gameplay/canonical/data/*.json by
-- scripts/generate_canonical_gameplay_db_migration.mjs. Do not hand-edit seed rows.
begin;

create table if not exists public.canonical_gameplay_master_versions (
  version text primary key,
  status text not null check (status in ('PRODUCTION_FROZEN')),
  created_at timestamptz not null default now()
);
create table if not exists public.canonical_character_master (
  version text not null references public.canonical_gameplay_master_versions(version),
  character_id text not null,
  display_name text not null,
  rarity text not null check (rarity in ('N','R','SR','SSR')),
  attribute text not null,
  hometown text not null,
  lv1_hp integer not null, lv1_atk integer not null, lv1_def integer not null, lv1_spd integer not null, lv1_luk integer not null,
  lv100_hp integer not null, lv100_atk integer not null, lv100_def integer not null, lv100_spd integer not null, lv100_luk integer not null,
  primary key (version, character_id)
);
create table if not exists public.canonical_skill_master (
  version text not null references public.canonical_gameplay_master_versions(version),
  skill_id text not null,
  display_name text not null,
  rarity text not null check (rarity in ('N','R','SR','SSR')),
  kind text not null check (kind in ('NORMAL','EXCLUSIVE')),
  activation_type text not null check (activation_type in ('ACTIVE','BATTLE_START','ON_DAMAGE_TAKEN')),
  cooldown integer check (cooldown between 0 and 10),
  available_from_round integer not null check (available_from_round between 1 and 99),
  target text not null,
  effects jsonb not null check (jsonb_typeof(effects) = 'array'),
  exclusive_character_id text,
  primary key (version, skill_id),
  check ((kind = 'EXCLUSIVE' and exclusive_character_id is not null) or (kind = 'NORMAL' and exclusive_character_id is null)),
  check ((activation_type = 'ACTIVE' and cooldown is not null) or (activation_type <> 'ACTIVE' and cooldown is null))
);
create table if not exists public.canonical_equipment_master (
  version text not null references public.canonical_gameplay_master_versions(version),
  equipment_id text not null,
  display_name text not null,
  rarity text not null check (rarity in ('N','R','SR','SSR')),
  category text not null check (category in ('WEAPON','HEAD','BODY','LEGS','ACCESSORY')),
  base_stats jsonb not null check (jsonb_typeof(base_stats) = 'object'),
  fixed_effects jsonb not null check (jsonb_typeof(fixed_effects) = 'array'),
  exclusive_character_id text,
  random_options boolean not null default false check (random_options = false),
  primary key (version, equipment_id)
);
create table if not exists public.canonical_equipment_lb_steps (
  version text not null references public.canonical_gameplay_master_versions(version),
  plus_val integer not null check (plus_val between 0 and 10),
  flat_stat_multiplier numeric(5,4) not null,
  equivalent_cost integer not null check (equivalent_cost >= 0),
  fixed_options jsonb not null default '[]'::jsonb check (jsonb_typeof(fixed_options) = 'array'),
  primary key (version, plus_val)
);
create table if not exists public.canonical_equipment_lb_slot_options (
  version text not null references public.canonical_gameplay_master_versions(version),
  category text not null check (category in ('WEAPON','HEAD','BODY','LEGS','ACCESSORY')),
  unlock_level integer not null check (unlock_level in (3,5,10)),
  options jsonb not null check (jsonb_typeof(options) = 'object'),
  primary key (version, category, unlock_level)
);

insert into public.canonical_gameplay_master_versions(version, status) values ('2026-08-21','PRODUCTION_FROZEN')
on conflict (version) do update set status=excluded.status;

insert into public.canonical_character_master(version, character_id, display_name, rarity, attribute, hometown, lv1_hp, lv1_atk, lv1_def, lv1_spd, lv1_luk, lv100_hp, lv100_atk, lv100_def, lv100_spd, lv100_luk)
select '2026-08-21', character_id, name, rarity, attribute, hometown, lv1_hp, lv1_atk, lv1_def, lv1_spd, lv1_luk, lv100_hp, lv100_atk, lv100_def, lv100_spd, lv100_luk
from jsonb_to_recordset(${literal(characters.characters, "characters") }::jsonb) as row(character_id text, name text, rarity text, attribute text, hometown text, growth_pattern text, lv1_hp integer, lv1_atk integer, lv1_def integer, lv1_spd integer, lv1_luk integer, lv100_hp integer, lv100_atk integer, lv100_def integer, lv100_spd integer, lv100_luk integer)
on conflict (version, character_id) do update set display_name=excluded.display_name, rarity=excluded.rarity, attribute=excluded.attribute, hometown=excluded.hometown, lv1_hp=excluded.lv1_hp, lv1_atk=excluded.lv1_atk, lv1_def=excluded.lv1_def, lv1_spd=excluded.lv1_spd, lv1_luk=excluded.lv1_luk, lv100_hp=excluded.lv100_hp, lv100_atk=excluded.lv100_atk, lv100_def=excluded.lv100_def, lv100_spd=excluded.lv100_spd, lv100_luk=excluded.lv100_luk;

insert into public.canonical_skill_master(version, skill_id, display_name, rarity, kind, activation_type, cooldown, available_from_round, target, effects, exclusive_character_id)
select '2026-08-21', skill_id, name, rarity, kind, activation_type, cooldown, available_from_round, target, effects, exclusive_character_id
from jsonb_to_recordset(${literal(structuredSkills, "skills")}::jsonb) as row(skill_id text, name text, rarity text, kind text, exclusive_character_id text, activation_type text, cooldown integer, available_from_round integer, target text, effects jsonb)
on conflict (version, skill_id) do update set display_name=excluded.display_name, rarity=excluded.rarity, kind=excluded.kind, activation_type=excluded.activation_type, cooldown=excluded.cooldown, available_from_round=excluded.available_from_round, target=excluded.target, effects=excluded.effects, exclusive_character_id=excluded.exclusive_character_id;

insert into public.canonical_equipment_master(version, equipment_id, display_name, rarity, category, base_stats, fixed_effects, exclusive_character_id, random_options)
select '2026-08-21', equipment_id, display_name, rarity, category, base_stats, fixed_effects, exclusive_character_id, random_options
from jsonb_to_recordset(${literal(equipments.equipments, "equipments")}::jsonb) as row(equipment_id text, display_name text, rarity text, category text, base_stats jsonb, fixed_effects jsonb, exclusive_character_id text, random_options boolean)
on conflict (version, equipment_id) do update set display_name=excluded.display_name, rarity=excluded.rarity, category=excluded.category, base_stats=excluded.base_stats, fixed_effects=excluded.fixed_effects, exclusive_character_id=excluded.exclusive_character_id, random_options=false;

-- One row per LB level is slot-neutral; the fixed slot options are projected by canonical_equipment_lb_options below.
insert into public.canonical_equipment_lb_steps(version, plus_val, flat_stat_multiplier, equivalent_cost, fixed_options)
select '2026-08-21', plus_val, flat_stat_multiplier, equivalent_cost, '[]'::jsonb
from jsonb_to_recordset(${literal(equipmentLbSteps, "lb_steps")}::jsonb) as row(plus_val integer, flat_stat_multiplier numeric, equivalent_cost integer)
on conflict (version, plus_val) do update set flat_stat_multiplier=excluded.flat_stat_multiplier, equivalent_cost=excluded.equivalent_cost, fixed_options=excluded.fixed_options;
insert into public.canonical_equipment_lb_slot_options(version, category, unlock_level, options)
select '2026-08-21', category, unlock_level, values
from jsonb_to_recordset(${literal(equipmentLbSlotOptions, "lb_slot_options")}::jsonb) as row(category text, unlock_level integer, values jsonb)
on conflict (version, category, unlock_level) do update set options=excluded.options;

create or replace function public.canonical_skill_slot_count(p_awakening integer)
returns integer language sql immutable as $$ select (array[3,4,5,5,5,6])[greatest(least(coalesce(p_awakening,0),5),0)+1] $$;
create or replace function public.canonical_equipment_lb_multiplier(p_plus_val integer)
returns numeric language sql immutable as $$ select 1 + greatest(least(coalesce(p_plus_val,0),10),0) * 0.04 $$;
create or replace function public.canonical_equipment_lb_options(p_category text, p_plus_val integer)
returns jsonb language sql stable set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('unlock_level', unlock_level, 'slot_options', options) order by unlock_level), '[]'::jsonb)
  from public.canonical_equipment_lb_slot_options
  where version='2026-08-21' and category=upper(p_category) and unlock_level<=greatest(least(coalesce(p_plus_val,0),10),0)
$$;
create or replace function public.canonical_character_stats(p_character_id text, p_level integer, p_awakening integer)
returns table(hp integer, atk integer, def integer, spd integer, luk integer)
language sql stable set search_path=public as $$
  with source as (select *, greatest(least(p_level,100),1) level, greatest(least(p_awakening,5),0) awakening from public.canonical_character_master where version='2026-08-21' and character_id=p_character_id), base as (
    select floor(lv1_hp + (lv100_hp-lv1_hp)*(level-1)/99.0)::integer hp, floor(lv1_atk + (lv100_atk-lv1_atk)*(level-1)/99.0)::integer atk, floor(lv1_def + (lv100_def-lv1_def)*(level-1)/99.0)::integer def, floor(lv1_spd + (lv100_spd-lv1_spd)*(level-1)/99.0)::integer spd, floor(lv1_luk + (lv100_luk-lv1_luk)*(level-1)/99.0)::integer luk, awakening from source)
  select floor(hp * (array[10000,10800,11500,13200,15000,17500])[awakening+1] / 10000.0)::integer, floor(atk * (array[10000,10800,11500,13200,15000,17500])[awakening+1] / 10000.0)::integer, floor(def * (array[10000,10800,11500,13200,15000,17500])[awakening+1] / 10000.0)::integer, floor(spd * (array[10000,10300,10600,11000,11500,12000])[awakening+1] / 10000.0)::integer, floor(luk * (array[10000,10300,10600,11000,11500,12000])[awakening+1] / 10000.0)::integer from base
$$;

create or replace function public.awaken_character(p_character_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_current integer; v_next integer; v_cost bigint; v_cash bigint; begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 select coalesce(awakening_level,0) into v_current from public.user_characters where id=p_character_id and user_id=v_user_id for update;
 if not found then raise exception 'owned character not found' using errcode='P0002'; end if;
 if v_current >= 5 then raise exception 'awakening level cap reached' using errcode='23514'; end if;
 v_next:=v_current+1;
 -- The canonical Foundation fixes stat multipliers, while the existing economy master remains the cost authority.
 select required_cash into v_cost from public.character_awakening_master where awakening_level=v_next;
 select cash into v_cash from public.users where id=v_user_id for update;
 if coalesce(v_cost,0)>coalesce(v_cash,0) then raise exception 'insufficient cash' using errcode='23514'; end if;
 update public.users set cash=cash-coalesce(v_cost,0) where id=v_user_id;
 update public.user_characters set awakening_level=v_next where id=p_character_id and user_id=v_user_id;
 return jsonb_build_object('status','success','awakening_level',v_next,'cash_spent',coalesce(v_cost,0)); end $$;

create or replace function public.limit_break_equipment(p_equipment_id uuid,p_use_wildcard boolean,p_dupe_id uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_master_id text; v_plus integer; v_next integer; v_required integer; v_dupe_master_id text; begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 select coalesce(nullif(equipment_id,''),equipment_master_id),coalesce(plus_val,0) into v_master_id,v_plus from public.user_equipments where id=p_equipment_id and user_id=v_user_id for update;
 if not found then raise exception 'owned equipment not found' using errcode='P0002'; end if;
 if v_plus>=10 then raise exception 'equipment limit break cap reached' using errcode='23514'; end if;
 v_next:=v_plus+1; select equivalent_cost into v_required from public.canonical_equipment_lb_steps where version='2026-08-21' and plus_val=v_next;
 if p_use_wildcard then update public.user_items set quantity=quantity-v_required where user_id=v_user_id and item_id='EQUIP_LB_HAMMER' and quantity>=v_required; if not found then raise exception 'insufficient equipment limit break material' using errcode='23514'; end if;
 else if p_dupe_id is null or p_dupe_id=p_equipment_id then raise exception 'valid duplicate equipment is required' using errcode='22023'; end if; select coalesce(nullif(equipment_id,''),equipment_master_id) into v_dupe_master_id from public.user_equipments where id=p_dupe_id and user_id=v_user_id and equipped_character_id is null for update; if not found or v_dupe_master_id is distinct from v_master_id then raise exception 'matching unequipped duplicate is required' using errcode='23514'; end if; delete from public.user_equipments where id=p_dupe_id and user_id=v_user_id; end if;
 update public.user_equipments set plus_val=v_next where id=p_equipment_id and user_id=v_user_id;
 return jsonb_build_object('status','success','plus_val',v_next,'equivalent_cost',v_required); end $$;

create or replace function public.set_character_skill(p_character_id uuid, p_skill_id uuid, p_slot_index integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_awakening integer; v_character_id text; v_skill_id text; v_exclusive text; begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 select character_id,coalesce(awakening_level,0) into v_character_id,v_awakening from public.user_characters where id=p_character_id and user_id=v_user_id for update;
 if not found then raise exception 'owned character not found' using errcode='P0002'; end if;
 if p_slot_index < 0 or p_slot_index >= public.canonical_skill_slot_count(v_awakening) then raise exception 'skill slot is locked' using errcode='23514'; end if;
 select owned.skill_card_id,master.exclusive_character_id into v_skill_id,v_exclusive from public.user_skills owned join public.canonical_skill_master master on master.version='2026-08-21' and master.skill_id=owned.skill_card_id where owned.id=p_skill_id and owned.user_id=v_user_id for update;
 if not found then raise exception 'owned canonical skill not found' using errcode='P0002'; end if;
 if v_exclusive is not null and v_exclusive <> v_character_id then raise exception 'exclusive skill character mismatch' using errcode='23514'; end if;
 if v_exclusive is not null and exists (select 1 from public.user_skills owned join public.canonical_skill_master master on master.version='2026-08-21' and master.skill_id=owned.skill_card_id where owned.user_id=v_user_id and owned.equipped_character_id=p_character_id::text and owned.id<>p_skill_id and master.exclusive_character_id is not null) then raise exception 'only one exclusive skill may be equipped' using errcode='23514'; end if;
 update public.user_skills set equipped_character_id=null,slot_index=null where user_id=v_user_id and (id=p_skill_id or (equipped_character_id=p_character_id::text and slot_index=p_slot_index));
 update public.user_skills set equipped_character_id=p_character_id::text,slot_index=p_slot_index where id=p_skill_id and user_id=v_user_id;
 return jsonb_build_object('status','success','skill_id',v_skill_id,'slot_index',p_slot_index); end $$;

create or replace function public.set_character_skill_loadout(p_character_id uuid, p_skill_ids uuid[], p_slot_indexes integer[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_awakening integer; v_character_id text; v_count integer:=coalesce(cardinality(p_skill_ids),0); begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_skill_ids is null or p_slot_indexes is null or v_count<>coalesce(cardinality(p_slot_indexes),0) or v_count>6 then raise exception 'invalid skill loadout arrays' using errcode='22023'; end if;
 if v_count<>(select count(distinct value) from unnest(p_skill_ids) value) or v_count<>(select count(distinct value) from unnest(p_slot_indexes) value) then raise exception 'duplicate skill or slot' using errcode='23514'; end if;
 select character_id,coalesce(awakening_level,0) into v_character_id,v_awakening from public.user_characters where id=p_character_id and user_id=v_user_id for update; if not found then raise exception 'owned character not found' using errcode='P0002'; end if;
 if exists(select 1 from unnest(p_slot_indexes) slot where slot<0 or slot>=public.canonical_skill_slot_count(v_awakening)) then raise exception 'skill slot is locked' using errcode='23514'; end if;
 if v_count<>(select count(*) from public.user_skills owned join public.canonical_skill_master master on master.version='2026-08-21' and master.skill_id=owned.skill_card_id where owned.user_id=v_user_id and owned.id=any(p_skill_ids) and (master.exclusive_character_id is null or master.exclusive_character_id=v_character_id)) then raise exception 'invalid owned canonical skill loadout' using errcode='23514'; end if;
 if (select count(*) from public.user_skills owned join public.canonical_skill_master master on master.version='2026-08-21' and master.skill_id=owned.skill_card_id where owned.user_id=v_user_id and owned.id=any(p_skill_ids) and master.exclusive_character_id is not null)>1 then raise exception 'only one exclusive skill may be equipped' using errcode='23514'; end if;
 update public.user_skills set equipped_character_id=null,slot_index=null where user_id=v_user_id and (equipped_character_id=p_character_id::text or id=any(p_skill_ids));
 update public.user_skills owned set equipped_character_id=p_character_id::text,slot_index=selected.slot_index from unnest(p_skill_ids,p_slot_indexes) selected(skill_id,slot_index) where owned.id=selected.skill_id and owned.user_id=v_user_id;
 return jsonb_build_object('status','success','equipped_count',v_count); end $$;

create or replace function public.build_server_battle_snapshot(p_user_id uuid,p_character_ids text[],p_team text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_requested text[]:=coalesce(array_remove(p_character_ids,null),array[]::text[]); v_snapshot jsonb; begin
 if p_user_id is null or p_team not in ('PLAYER','ENEMY') then raise exception 'invalid battle snapshot request' using errcode='22023'; end if;
 if cardinality(v_requested) not between 1 and 5 or cardinality(v_requested)<>(select count(distinct value) from unnest(v_requested) value) then raise exception 'invalid battle formation' using errcode='22023'; end if;
 with requested(character_ref,ordinality) as (select value,ordinality from unnest(v_requested) with ordinality picked(value,ordinality)), base as (select owned.id,owned.character_id,requested.ordinality,master.display_name,master.attribute,stats.* from requested join public.user_characters owned on owned.user_id=p_user_id and (owned.id::text=requested.character_ref or owned.character_id=requested.character_ref) join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=owned.character_id cross join lateral public.canonical_character_stats(owned.character_id,owned.level,owned.awakening_level) stats), resolved as (select base.*,coalesce(eq.stats,'{"hp":0,"atk":0,"def":0,"spd":0,"luk":0}'::jsonb) equipment_stats,coalesce(eq.loadout,'[]'::jsonb) equipment,coalesce(sk.loadout,'[]'::jsonb) skills from base left join lateral (select jsonb_build_object('hp',coalesce(sum(floor((master.base_stats->>'hp')::numeric*public.equipment_level_battle_scale(coalesce(owned.level,1))*public.canonical_equipment_lb_multiplier(owned.plus_val))),0),'atk',coalesce(sum(floor((master.base_stats->>'atk')::numeric*public.equipment_level_battle_scale(coalesce(owned.level,1))*public.canonical_equipment_lb_multiplier(owned.plus_val))),0),'def',coalesce(sum(floor((master.base_stats->>'def')::numeric*public.equipment_level_battle_scale(coalesce(owned.level,1))*public.canonical_equipment_lb_multiplier(owned.plus_val))),0),'spd',coalesce(sum((master.base_stats->>'spd')::integer),0),'luk',coalesce(sum((master.base_stats->>'luk')::integer),0)) stats,jsonb_agg(jsonb_build_object('instanceId',owned.id,'equipmentId',master.equipment_id,'level',owned.level,'plusValue',greatest(least(coalesce(owned.plus_val,0),10),0),'fixedOptions',public.canonical_equipment_lb_options(master.category,owned.plus_val))) loadout from public.user_equipments owned join public.canonical_equipment_master master on master.version='2026-08-21' and master.equipment_id=coalesce(nullif(owned.equipment_id,''),owned.equipment_master_id) where owned.user_id=p_user_id and owned.equipped_character_id=base.id::text and (master.exclusive_character_id is null or master.exclusive_character_id=base.character_id)) eq on true left join lateral (select jsonb_agg(jsonb_build_object('id',master.skill_id,'name',master.display_name,'skillId',master.skill_id,'activationType',master.activation_type,'cooldown',master.cooldown,'availableFromRound',master.available_from_round,'target',master.target,'effects',master.effects,'exclusiveCharacterId',master.exclusive_character_id,'slotIndex',owned.slot_index,'plusValue',greatest(least(coalesce(owned.plus_val,0),10),0)) order by owned.slot_index) loadout from public.user_skills owned join public.canonical_skill_master master on master.version='2026-08-21' and master.skill_id=owned.skill_card_id where owned.user_id=p_user_id and owned.equipped_character_id=base.id::text and owned.slot_index between 0 and public.canonical_skill_slot_count((select awakening_level from public.user_characters where id=base.id))-1 and (master.exclusive_character_id is null or master.exclusive_character_id=base.character_id)) sk on true) select jsonb_agg(jsonb_build_object('id',lower(p_team)||'_'||id::text,'name',display_name,'team',p_team,'alignment',attribute,'stats',jsonb_build_object('hp',greatest(hp+(equipment_stats->>'hp')::integer,1),'atk',greatest(atk+(equipment_stats->>'atk')::integer,0),'def',greatest(def+(equipment_stats->>'def')::integer,0),'spd',greatest(spd+(equipment_stats->>'spd')::integer,0),'luk',greatest(luk+(equipment_stats->>'luk')::integer,0)),'equipment',equipment,'equippedSkillRefs',skills,'skills',skills) order by ordinality) into v_snapshot from resolved; if coalesce(jsonb_array_length(v_snapshot),0)<>cardinality(v_requested) then raise exception 'battle formation contains an unsupported or unowned character' using errcode='23503'; end if; return v_snapshot; end $$;

create or replace function public.calculate_user_character_power(p_user_id uuid,p_user_character_id uuid) returns bigint language sql stable security definer set search_path=public as $$
 with base as (select owned.id,owned.character_id,stats.hp,stats.atk,stats.def from public.user_characters owned cross join lateral public.canonical_character_stats(owned.character_id,owned.level,owned.awakening_level) stats where owned.user_id=p_user_id and owned.id=p_user_character_id), equipment as (select coalesce(sum(floor(((master.base_stats->>'hp')::numeric+(master.base_stats->>'atk')::numeric+(master.base_stats->>'def')::numeric)*public.equipment_level_battle_scale(coalesce(owned.level,1))*public.canonical_equipment_lb_multiplier(owned.plus_val))),0)::bigint value from base join public.user_equipments owned on owned.user_id=p_user_id and owned.equipped_character_id=base.id::text join public.canonical_equipment_master master on master.version='2026-08-21' and master.equipment_id=coalesce(nullif(owned.equipment_id,''),owned.equipment_master_id) and (master.exclusive_character_id is null or master.exclusive_character_id=base.character_id)) select coalesce((select hp+atk+def+equipment.value from base cross join equipment),0) $$;

revoke all on table public.canonical_character_master,public.canonical_skill_master,public.canonical_equipment_master,public.canonical_equipment_lb_steps,public.canonical_equipment_lb_slot_options from public,anon;
grant select on table public.canonical_character_master,public.canonical_skill_master,public.canonical_equipment_master,public.canonical_equipment_lb_steps,public.canonical_equipment_lb_slot_options to authenticated;
revoke all on function public.set_character_skill(uuid,uuid,integer),public.set_character_skill_loadout(uuid,uuid[],integer[]),public.build_server_battle_snapshot(uuid,text[],text) from public,anon;
grant execute on function public.set_character_skill(uuid,uuid,integer),public.set_character_skill_loadout(uuid,uuid[],integer[]) to authenticated;
grant execute on function public.build_server_battle_snapshot(uuid,text[],text) to service_role;
commit;
notify pgrst,'reload schema';
`;

mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, sql);
console.log(`Generated ${destination}`);
