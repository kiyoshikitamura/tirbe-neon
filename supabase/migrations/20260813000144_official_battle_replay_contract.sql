-- Open Beta P0: shared server-authoritative replay contract.
-- Official PvP/Raid callers may only supply target IDs and a tactic. Character,
-- equipment and skill snapshots are built from canonical server state.

begin;

alter table public.battle_replay_sessions
  add column if not exists finalization_status text not null default 'NOT_REQUIRED',
  add column if not exists finalized_at timestamptz,
  add column if not exists finalization_result jsonb;

alter table public.battle_replay_sessions
  drop constraint if exists battle_replay_sessions_finalization_status_check;
alter table public.battle_replay_sessions
  add constraint battle_replay_sessions_finalization_status_check
  check (finalization_status in ('NOT_REQUIRED', 'PENDING', 'FINALIZED'));

alter table public.battle_replay_sessions
  drop constraint if exists battle_replay_sessions_finalization_shape_check;
alter table public.battle_replay_sessions
  add constraint battle_replay_sessions_finalization_shape_check
  check (
    (finalization_status = 'FINALIZED' and finalized_at is not null and finalization_result is not null)
    or finalization_status <> 'FINALIZED'
  );

create index if not exists battle_replay_sessions_pending_official_idx
  on public.battle_replay_sessions (resolution_authority, status, finalization_status, created_at)
  where finalization_status = 'PENDING';

create or replace function public.build_server_battle_snapshot(
  p_user_id uuid,
  p_character_ids text[],
  p_team text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested text[] := coalesce(array_remove(p_character_ids, null), array[]::text[]);
  v_snapshot jsonb;
begin
  if p_user_id is null then raise exception 'user is required' using errcode = '22023'; end if;
  if p_team not in ('PLAYER', 'ENEMY') then raise exception 'invalid battle team' using errcode = '22023'; end if;
  if cardinality(v_requested) not between 1 and 5 then
    raise exception 'battle formation must contain one to five characters' using errcode = '22023';
  end if;
  if cardinality(v_requested) <> (select count(distinct id) from unnest(v_requested) ids(id)) then
    raise exception 'battle formation contains duplicate characters' using errcode = '23505';
  end if;

  with requested(character_id, ordinality) as (
    select value, ordinality
    from unnest(v_requested) with ordinality picked(value, ordinality)
  ), canonical_base as (
    select owned.id, owned.character_id, owned.level, owned.awakening_level,
           requested.ordinality, master.display_name, master.alignment,
           floor((growth.base_hp + (owned.level - 1) * growth.hp_gain + coalesce(awake.hp_bonus, 0)) * master.rarity_multiplier)::integer as hp,
           floor((growth.base_atk + (owned.level - 1) * growth.atk_gain + coalesce(awake.atk_bonus, 0)) * master.rarity_multiplier)::integer as atk,
           floor((growth.base_def + (owned.level - 1) * growth.def_gain + coalesce(awake.def_bonus, 0)) * master.rarity_multiplier)::integer as def,
           floor((growth.base_spd + floor((owned.level - 1) * growth.spd_gain) + coalesce(awake.spd_bonus, 0)) * master.rarity_multiplier)::integer as spd,
           floor((growth.base_luk + floor((owned.level - 1) * growth.luk_gain) + coalesce(awake.luk_bonus, 0)) * master.rarity_multiplier)::integer as luk
    from requested
    join public.user_characters owned
      on owned.user_id = p_user_id
     and (owned.id::text = requested.character_id or owned.character_id = requested.character_id)
    join public.character_battle_master master on master.character_id = owned.character_id
    join public.character_growth_patterns growth on growth.pattern_id = master.growth_pattern_id
    left join public.character_awakening_master awake on awake.awakening_level = owned.awakening_level
  ), canonical as (
    select base.*,
      coalesce(equipment.hp, 0)::integer as equipment_hp,
      coalesce(equipment.atk, 0)::integer as equipment_atk,
      coalesce(equipment.def, 0)::integer as equipment_def,
      coalesce(equipment.spd, 0)::integer as equipment_spd,
      coalesce(equipment.luk, 0)::integer as equipment_luk,
      coalesce(equipment.loadout, '[]'::jsonb) as equipment_loadout,
      coalesce(skills.loadout, '[]'::jsonb) as equipped_skills
    from canonical_base base
    left join lateral (
      select
        sum(floor(master.hp * (public.equipment_level_battle_scale(coalesce(owned.level, 1)) + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as hp,
        sum(floor(master.atk * (public.equipment_level_battle_scale(coalesce(owned.level, 1)) + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as atk,
        sum(floor(master.def * (public.equipment_level_battle_scale(coalesce(owned.level, 1)) + greatest(coalesce(owned.plus_val, 0), 0) * 0.10))) as def,
        sum(master.spd) as spd,
        sum(master.luk) as luk,
        jsonb_agg(jsonb_build_object(
          'instanceId', owned.id, 'equipmentId', master.equipment_id,
          'slotIndex', owned.slot_index, 'level', greatest(coalesce(owned.level, 1), 1),
          'plusValue', greatest(coalesce(owned.plus_val, 0), 0)
        ) order by owned.slot_index, owned.id) as loadout
      from public.user_equipments owned
      join public.equipment_battle_master master
        on master.equipment_id = coalesce(nullif(owned.equipment_id, ''), owned.equipment_master_id)
      where owned.user_id = p_user_id
        and owned.equipped_character_id = base.id::text
        and (not master.is_exclusive or master.exclusive_character_id = base.character_id)
    ) equipment on true
    left join lateral (
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', master.skill_id,
        'name', master.display_name,
        'kind', master.kind,
        'target', master.target,
        'powerPercent', round(master.power_percent * scaled.effect_scale)::integer,
        'cooldown', master.cooldown,
        'initialCooldown', master.initial_cooldown,
        'status', master.status,
        'statusChance', case when master.status_chance is null then null else least(95, round(master.status_chance * scaled.effect_scale)::integer) end,
        'modifier', case when master.modifier_stat is null then null else jsonb_build_object(
          'stat', master.modifier_stat,
          'percent', least(25, round(master.modifier_percent * scaled.effect_scale)::integer),
          'duration', master.modifier_duration
        ) end,
        'skillId', master.skill_id,
        'slotIndex', owned.slot_index,
        'plusValue', scaled.plus_value,
        'effectScale', scaled.effect_scale
      )) order by owned.slot_index, master.skill_id) as loadout
      from public.user_skills owned
      join public.skill_battle_master master on master.skill_id = owned.skill_card_id and master.enabled
      cross join lateral (
        select greatest(least(coalesce(owned.plus_val, 0), 10), 0) as plus_value,
          case
            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 3 then 1 + greatest(least(coalesce(owned.plus_val, 0), 10), 0) * 0.05
            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 6 then 1.15 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 3) * 0.04
            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 9 then 1.27 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 6) * 0.03
            else 1.41
          end as effect_scale
      ) scaled
      where owned.user_id = p_user_id
        and owned.equipped_character_id = base.id::text
        and owned.slot_index between 0 and least(5, 2 + greatest(coalesce(base.awakening_level, 0), 0))
        and (master.exclusive_character_id is null or master.exclusive_character_id = base.character_id)
    ) skills on true
  )
  select jsonb_agg(jsonb_build_object(
    'id', lower(p_team) || '_' || canonical.id::text,
    'name', canonical.display_name,
    'team', p_team,
    'alignment', canonical.alignment,
    'stats', jsonb_build_object(
      'hp', greatest(canonical.hp + canonical.equipment_hp, 1),
      'atk', greatest(canonical.atk + canonical.equipment_atk, 0),
      'def', greatest(canonical.def + canonical.equipment_def, 0),
      'spd', greatest(canonical.spd + canonical.equipment_spd, 0),
      'luk', greatest(canonical.luk + canonical.equipment_luk, 0)
    ),
    'equipment', canonical.equipment_loadout,
    'equippedSkillRefs', canonical.equipped_skills,
    'skills', canonical.equipped_skills
  ) order by canonical.ordinality)
  into v_snapshot
  from canonical;

  if coalesce(jsonb_array_length(v_snapshot), 0) <> cardinality(v_requested) then
    raise exception 'battle formation contains an unsupported or unowned character' using errcode = '23503';
  end if;
  return v_snapshot;
end;
$$;

create or replace function public.validate_official_battle_result(p_result jsonb)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if jsonb_typeof(p_result) <> 'object'
     or p_result ->> 'winner' not in ('PLAYER', 'ENEMY')
     or coalesce((p_result ->> 'rounds')::integer, 0) < 1
     or jsonb_typeof(p_result -> 'events') <> 'array'
     or coalesce((p_result ->> 'playerRawDamage')::numeric, -1) < 0
     or coalesce((p_result ->> 'enemyRawDamage')::numeric, -1) < 0 then
    raise exception 'invalid official battle result' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.build_server_battle_snapshot(uuid, text[], text) from public, anon, authenticated;
revoke all on function public.validate_official_battle_result(jsonb) from public, anon, authenticated;
grant execute on function public.build_server_battle_snapshot(uuid, text[], text) to service_role;
grant execute on function public.validate_official_battle_result(jsonb) to service_role;

commit;

notify pgrst, 'reload schema';
