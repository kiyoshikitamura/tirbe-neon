-- M9-V0: authenticated, read-only display contracts for PvP candidates and owned skills.
-- Battle authority, replay data, rank mutation, rewards, and economy are intentionally untouched.

begin;

create or replace function public.get_pvp_opponents(p_user_id uuid, p_my_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  with ranked_players as (
    select
      player.id as user_id,
      dense_rank() over (order by coalesce(rank.rank_points, 1000) desc, player.id)::integer as rank_position
    from public.users player
    left join public.pvp_ranks rank on rank.user_id = player.id
  ), candidates as (
    select
      player.id,
      player.username,
      guild.id as guild_id,
      guild.name as guild_name,
      coalesce(rank.rank_points, 1000) as rank_points,
      coalesce(power.total_power, 0) as total_power,
      ranked.rank_position,
      coalesce(deck.tactic, 'BALANCED') as tactic,
      deck.character_1_id,
      deck.character_2_id,
      deck.character_3_id,
      deck.character_4_id,
      deck.character_5_id
    from public.users player
    join public.pvp_defense_decks deck on deck.user_id = player.id
    join ranked_players ranked on ranked.user_id = player.id
    left join public.pvp_ranks rank on rank.user_id = player.id
    left join public.user_power_rankings power on power.user_id = player.id
    left join public.guild_members member on member.user_id = player.id
    left join public.guilds guild on guild.id = member.guild_id
    where player.id <> p_user_id
      and (p_my_points is null or abs(coalesce(rank.rank_points, 1000) - p_my_points) <= 300)
    order by abs(coalesce(rank.rank_points, 1000) - coalesce(p_my_points, 1000)), player.id
    limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'opponent_user_id', candidate.id,
    'opponent_username', candidate.username,
    'opponent_power', candidate.total_power,
    'opponent_rank', candidate.rank_position,
    'opponent_guild_id', candidate.guild_id,
    'opponent_guild_name', coalesce(candidate.guild_name, '無所属'),
    'opponent_points', candidate.rank_points,
    'tactic', candidate.tactic,
    'opponent_guild_main_alignment', 'NEUTRAL',
    'opponent_guild_sub_alignment', 'NEUTRAL',
    -- Kept only for the existing official battle-start contract. UI must use defense_characters.
    'defense_character_ids', to_jsonb(array_remove(array[
      candidate.character_1_id, candidate.character_2_id, candidate.character_3_id,
      candidate.character_4_id, candidate.character_5_id
    ]::text[], null)),
    'defense_characters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot', slot_data.slot_no,
        'character_master_id', release.character_id,
        'display_name', release.display_name,
        'rarity', release.rarity,
        'level', coalesce(owned.level, 1),
        'asset_identifier', release.asset_path
      ) order by slot_data.slot_no)
      from (values
        (1, candidate.character_1_id), (2, candidate.character_2_id),
        (3, candidate.character_3_id), (4, candidate.character_4_id),
        (5, candidate.character_5_id)
      ) slot_data(slot_no, owned_or_master_id)
      left join public.user_characters owned
        on owned.user_id = candidate.id and owned.id::text = slot_data.owned_or_master_id
      join public.character_release_master release
        on release.character_id = coalesce(owned.character_id, slot_data.owned_or_master_id)
       and release.is_enabled
      where slot_data.owned_or_master_id is not null
    ), '[]'::jsonb)
  ) order by abs(candidate.rank_points - coalesce(p_my_points, 1000)), candidate.id), '[]'::jsonb)
  into v_result
  from candidates candidate;

  return v_result;
end;
$$;

create or replace function public.get_current_skill_display(p_skill_ids text[] default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_skill_ids is not null and cardinality(p_skill_ids) > 70 then
    raise exception 'too many skill ids' using errcode = '22023';
  end if;

  with owned as (
    select
      skill.skill_card_id,
      max(coalesce(skill.plus_val, 0))::integer as enhancement_level,
      bool_or(skill.equipped_character_id is not null) as is_equipped
    from public.user_skills skill
    where skill.user_id = v_user_id
      and (p_skill_ids is null or skill.skill_card_id = any(p_skill_ids))
    group by skill.skill_card_id
  ), display_rows as (
    select
      master.skill_id,
      master.display_name,
      case
        when substring(master.skill_id from '[0-9]+$')::integer between 1 and 10 then 'N'
        when substring(master.skill_id from '[0-9]+$')::integer between 11 and 20 then 'R'
        when substring(master.skill_id from '[0-9]+$')::integer between 21 and 35 then 'SR'
        else 'SSR'
      end as rarity,
      master.kind as effect_type,
      master.target as target_type,
      master.cooldown,
      master.status as status_effect,
      owned.enhancement_level,
      owned.is_equipped,
      case master.kind
        when 'ATTACK' then '対象へダメージを与える'
        when 'HEAL' then '対象のHPを回復する'
        when 'BUFF' then '対象の能力を一定ターン強化する'
        when 'DEBUFF' then '対象の能力を一定ターン低下させる'
      end || case when master.status is not null then '。追加効果: ' || master.status else '' end as display_effect
    from owned
    join public.skill_battle_master master on master.skill_id = owned.skill_card_id and master.enabled
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'skill_master_id', row.skill_id,
    'display_name', row.display_name,
    'rarity', row.rarity,
    'description', row.display_effect,
    'display_effect', row.display_effect,
    'effect_type', row.effect_type,
    'target_type', row.target_type,
    'cooldown', row.cooldown,
    'status_effect', row.status_effect,
    'enhancement_level', row.enhancement_level,
    'max_enhancement_level', 10,
    'is_equipped', row.is_equipped
  ) order by row.skill_id), '[]'::jsonb)
  into v_result
  from display_rows row;

  return v_result;
end;
$$;

revoke all on function public.get_pvp_opponents(uuid, integer) from public, anon;
revoke all on function public.get_current_skill_display(text[]) from public, anon;
grant execute on function public.get_pvp_opponents(uuid, integer) to authenticated;
grant execute on function public.get_current_skill_display(text[]) to authenticated;

comment on function public.get_current_skill_display(text[]) is
  'Returns display-safe battle metadata only for skills owned by auth.uid(); no engine coefficients or hidden probabilities.';

commit;
notify pgrst, 'reload schema';
