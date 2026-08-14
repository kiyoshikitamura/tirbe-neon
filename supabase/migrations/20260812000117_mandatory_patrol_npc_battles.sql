-- Open Beta M2: every normal patrol ends in a server-authoritative NPC battle.

create table if not exists public.character_battle_master (
  character_id text primary key,
  display_name text not null,
  alignment text not null check (alignment in ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')),
  growth_pattern_id text not null references public.character_growth_patterns(pattern_id),
  rarity_multiplier numeric not null check (rarity_multiplier > 0)
);

-- HP_TANK did not exist in the original DB seed, but is used by Go in the
-- approved client master.
insert into public.character_growth_patterns (
  pattern_id, name, base_hp, base_atk, base_def, base_spd, base_luk,
  hp_gain, atk_gain, def_gain, spd_gain, luk_gain
)
values ('HP_TANK', 'HP Tank', 2000, 80, 100, 90, 8, 70, 4, 5, 0.15, 0.08)
on conflict (pattern_id) do nothing;

insert into public.character_battle_master (
  character_id, display_name, alignment, growth_pattern_id, rarity_multiplier
)
values
  ('11111111-1111-1111-1111-111111111111', 'Reiji', 'ORDER', 'BALANCED', 1.25),
  ('33333333-3333-3333-3333-333333333333', 'Rui', 'CHAOS', 'SPEEDSTER', 1.25),
  ('22222222-2222-2222-2222-222222222222', 'Chang', 'EVIL', 'ATTACKER', 1.25),
  ('char_go_01', 'Go', 'ORDER', 'HP_TANK', 1.10),
  ('char_kengo_01', 'Kengo', 'CHAOS', 'SPEEDSTER', 1.10),
  ('char_mio_01', 'Mio', 'CHAOS', 'ATTACKER', 1.10),
  ('char_naoto_01', 'Naoto', 'JUSTICE', 'ATTACKER', 1.10),
  ('char_rin_01', 'Rin', 'ORDER', 'BALANCED', 1.10),
  ('char_serika_01', 'Serika', 'EVIL', 'LUCKY_STAR', 1.10),
  ('char_shin_01', 'Shin', 'EVIL', 'SPEEDSTER', 1.10),
  ('char_tetsu_01', 'Tetsu', 'JUSTICE', 'DEFENDER', 1.10),
  ('char_yuji_01', 'Yuji', 'CHAOS', 'BALANCED', 0.95)
on conflict (character_id) do update set
  display_name = excluded.display_name,
  alignment = excluded.alignment,
  growth_pattern_id = excluded.growth_pattern_id,
  rarity_multiplier = excluded.rarity_multiplier;

-- The client battle calculator is the currently approved Open Beta tuning.
-- Reconcile the DB copy so server snapshots use the same base values.
insert into public.character_growth_patterns (
  pattern_id, name, base_hp, base_atk, base_def, base_spd, base_luk,
  hp_gain, atk_gain, def_gain, spd_gain, luk_gain
)
values
  ('BALANCED', 'Balanced', 1500, 100, 80, 100, 10, 50, 5, 4, 0.2, 0.1),
  ('HP_TANK', 'HP Tank', 2000, 80, 100, 90, 8, 70, 4, 5, 0.15, 0.08),
  ('ATTACKER', 'Attacker', 1200, 130, 60, 110, 12, 40, 7, 3, 0.25, 0.12),
  ('DEFENDER', 'Defender', 1600, 75, 110, 85, 10, 55, 3.5, 6, 0.1, 0.1),
  ('SPEEDSTER', 'Speedster', 1100, 90, 70, 130, 15, 35, 4.5, 3.5, 0.4, 0.15),
  ('LUCKY_STAR', 'Lucky Star', 1300, 85, 75, 105, 25, 45, 4, 4, 0.2, 0.3)
on conflict (pattern_id) do update set
  base_hp = excluded.base_hp, base_atk = excluded.base_atk,
  base_def = excluded.base_def, base_spd = excluded.base_spd,
  base_luk = excluded.base_luk, hp_gain = excluded.hp_gain,
  atk_gain = excluded.atk_gain, def_gain = excluded.def_gain,
  spd_gain = excluded.spd_gain, luk_gain = excluded.luk_gain;

-- One deterministic enemy is assigned to every released quest. Art remains a
-- UI placeholder; no image or sound asset is introduced by this migration.
insert into public.patrol_npcs (
  id, quest_id, npc_name, npc_level, encounter_rate, enemy_data
)
select
  'patrol_npc_' || quest.id,
  quest.id,
  case quest.level_type
    when 'HARD' then 'Area Enforcer'
    when 'NORMAL' then 'Rival Crew'
    else 'Street Outlaw'
  end,
  case quest.level_type when 'HARD' then 20 when 'NORMAL' then 10 else 3 end,
  1,
  jsonb_build_object(
    'hp', case quest.level_type when 'HARD' then 6500 when 'NORMAL' then 2800 else 900 end,
    'atk', case quest.level_type when 'HARD' then 230 when 'NORMAL' then 130 else 55 end,
    'def', case quest.level_type when 'HARD' then 180 when 'NORMAL' then 100 else 35 end,
    'spd', case quest.level_type when 'HARD' then 125 when 'NORMAL' then 105 else 75 end,
    'luk', case quest.level_type when 'HARD' then 18 when 'NORMAL' then 10 else 3 end,
    'skills', jsonb_build_array(jsonb_build_object(
      'id', 'npc_basic_attack', 'name', 'Attack', 'power', 100,
      'effect_type', 'ATTACK', 'target_type', 'ENEMY_SINGLE'
    ))
  )
from public.quests quest
where quest.id <> 'q_shinjuku_1'
on conflict (id) do update set
  quest_id = excluded.quest_id,
  npc_name = excluded.npc_name,
  npc_level = excluded.npc_level,
  encounter_rate = 1,
  enemy_data = excluded.enemy_data;

update public.patrol_npcs set encounter_rate = 1;

-- Preserve already-dispatched Open Beta test patrols and route them through
-- the new mandatory encounter instead of requiring testers to discard them.
update public.user_patrols patrol
set has_battle_event = true,
    battle_resolved = false,
    battle_result = null
where patrol.status in ('ONGOING', 'CLAIMABLE')
  and exists (
    select 1 from public.patrol_npcs npc
    where npc.quest_id = coalesce(patrol.course_id, patrol.quest_id)
  );

alter table public.battle_replay_sessions
  add column if not exists resolution_authority text not null default 'CLIENT_SNAPSHOT';

create or replace function public.create_patrol_battle_replay(
  p_patrol_id uuid,
  p_tactic_id text default 'ATTACK_PRIORITY'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_patrol record;
  v_deck record;
  v_player_snapshot jsonb;
  v_enemy_snapshot jsonb;
  v_replay_id uuid;
  v_server_seed bigint;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_tactic_id not in ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') then
    raise exception 'invalid tactic' using errcode = '22023';
  end if;

  select patrol.*, npc.id as npc_id, npc.npc_name, npc.enemy_data
  into v_patrol
  from public.user_patrols patrol
  join public.patrol_npcs npc on npc.quest_id = coalesce(patrol.course_id, patrol.quest_id)
  where patrol.id = p_patrol_id
    and patrol.user_id = v_user_id
    and (
      patrol.status = 'CLAIMABLE'
      or (patrol.status = 'ONGOING' and patrol.expires_at <= now())
    )
    and patrol.has_battle_event = true
    and coalesce(patrol.battle_resolved, false) = false
  order by npc.id
  limit 1
  for update of patrol;

  if not found then
    raise exception 'eligible patrol encounter not found' using errcode = 'P0002';
  end if;

  update public.user_patrols
  set status = 'CLAIMABLE'
  where id = p_patrol_id and status = 'ONGOING';

  select deck.* into v_deck
  from public.pvp_defense_decks deck
  where deck.user_id = v_user_id;

  with deck_requested(character_id, ordinality) as (
    select value, ordinality
    from unnest(array[
      v_deck.character_1_id, v_deck.character_2_id, v_deck.character_3_id,
      v_deck.character_4_id, v_deck.character_5_id
    ]) with ordinality as picked(value, ordinality)
    where value is not null
  ), requested(character_id, ordinality) as (
    select character_id, ordinality from deck_requested
    union all
    select owned.id::text, 1
    from public.user_characters owned
    where owned.user_id = v_user_id
      and owned.character_id = v_patrol.character_id
      and not exists (select 1 from deck_requested)
      and owned.id = (
        select fallback.id from public.user_characters fallback
        where fallback.user_id = v_user_id
          and fallback.character_id = v_patrol.character_id
        order by fallback.created_at
        limit 1
      )
  ), canonical as (
    select owned.id, owned.character_id, owned.level, owned.awakening_level,
           requested.ordinality, master.display_name, master.alignment,
           floor((growth.base_hp + (owned.level - 1) * growth.hp_gain + coalesce(awake.hp_bonus, 0)) * master.rarity_multiplier)::integer as hp,
           floor((growth.base_atk + (owned.level - 1) * growth.atk_gain + coalesce(awake.atk_bonus, 0)) * master.rarity_multiplier)::integer as atk,
           floor((growth.base_def + (owned.level - 1) * growth.def_gain + coalesce(awake.def_bonus, 0)) * master.rarity_multiplier)::integer as def,
           floor((growth.base_spd + floor((owned.level - 1) * growth.spd_gain) + coalesce(awake.spd_bonus, 0)) * master.rarity_multiplier)::integer as spd,
           floor((growth.base_luk + floor((owned.level - 1) * growth.luk_gain) + coalesce(awake.luk_bonus, 0)) * master.rarity_multiplier)::integer as luk
    from requested
    join public.user_characters owned
      on owned.user_id = v_user_id and owned.id::text = requested.character_id
    join public.character_battle_master master on master.character_id = owned.character_id
    join public.character_growth_patterns growth on growth.pattern_id = master.growth_pattern_id
    left join public.character_awakening_master awake on awake.awakening_level = owned.awakening_level
  )
  select jsonb_agg(jsonb_build_object(
    'id', 'ally_' || canonical.character_id,
    'name', canonical.display_name,
    'team', 'PLAYER',
    'alignment', canonical.alignment,
    'stats', jsonb_build_object('hp', canonical.hp, 'atk', canonical.atk, 'def', canonical.def, 'spd', canonical.spd, 'luk', canonical.luk),
    'skills', jsonb_build_array(jsonb_build_object(
      'id', 'basic_attack_' || canonical.id::text, 'name', 'Attack',
      'kind', 'ATTACK', 'target', 'ENEMY_SINGLE', 'powerPercent', 100, 'cooldown', 0
    ))
  ) order by canonical.ordinality)
  into v_player_snapshot
  from canonical;

  if coalesce(jsonb_array_length(v_player_snapshot), 0) = 0 then
    raise exception 'battle formation has no supported owned character' using errcode = '23514';
  end if;

  v_enemy_snapshot := jsonb_build_array(jsonb_build_object(
    'id', 'enemy_' || v_patrol.npc_id,
    'name', v_patrol.npc_name,
    'team', 'ENEMY',
    'alignment', 'CHAOS',
    'stats', jsonb_build_object(
      'hp', greatest(coalesce((v_patrol.enemy_data ->> 'hp')::integer, 1), 1),
      'atk', greatest(coalesce((v_patrol.enemy_data ->> 'atk')::integer, 1), 0),
      'def', greatest(coalesce((v_patrol.enemy_data ->> 'def')::integer, 0), 0),
      'spd', greatest(coalesce((v_patrol.enemy_data ->> 'spd')::integer, 1), 0),
      'luk', greatest(coalesce((v_patrol.enemy_data ->> 'luk')::integer, 0), 0)
    ),
    'skills', jsonb_build_array(jsonb_build_object(
      'id', 'npc_basic_attack', 'name', 'Attack', 'kind', 'ATTACK',
      'target', 'ENEMY_SINGLE', 'powerPercent', 100, 'cooldown', 0
    ))
  ));

  v_server_seed := floor(random() * 2147483646)::bigint + 1;
  insert into public.battle_replay_sessions (
    requester_user_id, battle_mode, source_reference_id, tactic_id,
    random_seed, player_snapshot, enemy_snapshot, resolution_authority
  ) values (
    v_user_id, 'QUEST', p_patrol_id, p_tactic_id,
    v_server_seed, v_player_snapshot, v_enemy_snapshot, 'PATROL_SERVER'
  ) returning id into v_replay_id;

  return jsonb_build_object(
    'replay_session_id', v_replay_id,
    'player_snapshot', v_player_snapshot,
    'enemy_snapshot', v_enemy_snapshot
  );
end;
$$;

revoke all on table public.character_battle_master from public, anon, authenticated;
revoke all on function public.create_patrol_battle_replay(uuid, text) from public, anon;
grant execute on function public.create_patrol_battle_replay(uuid, text) to authenticated;

notify pgrst, 'reload schema';
