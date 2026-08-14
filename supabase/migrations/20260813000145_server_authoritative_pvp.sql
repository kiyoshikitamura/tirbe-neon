-- Open Beta P0-A: official PvP start and atomic result finalization.

begin;

alter table public.battle_replay_sessions
  add column if not exists official_context jsonb not null default '{}'::jsonb;

insert into public.pvp_match_rewards_master(result, diamond_reward, cash_reward, exp_reward)
values
  ('VICTORY', 0, 400, 0),
  ('DEFEAT', 0, 0, 0)
on conflict (result) do nothing;

create or replace function public.start_pvp_battle(
  p_opponent_user_id uuid,
  p_character_ids text[],
  p_tactic text default 'ATTACK_PRIORITY'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user public.users%rowtype;
  v_now timestamptz := now();
  v_recovered integer;
  v_remaining integer;
  v_my_rank integer;
  v_opponent_rank integer;
  v_opponent_name text;
  v_opponent_guild_id uuid;
  v_opponent_guild_name text;
  v_deck public.pvp_defense_decks%rowtype;
  v_player_snapshot jsonb;
  v_enemy_snapshot jsonb;
  v_replay_id uuid;
  v_seed bigint;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_opponent_user_id is null or p_opponent_user_id = v_user_id then
    raise exception 'invalid PvP opponent' using errcode = '22023';
  end if;
  if p_tactic not in ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') then
    raise exception 'invalid tactic' using errcode = '22023';
  end if;

  select * into v_user from public.users where id = v_user_id for update;
  if not found then raise exception 'player not found' using errcode = 'P0002'; end if;
  v_recovered := floor(extract(epoch from (v_now - coalesce(v_user.pvp_points_last_recovered_at, v_now))) / 3600);
  v_remaining := least(5, coalesce(v_user.pvp_points, 0) + greatest(v_recovered, 0));
  if v_remaining < 1 then raise exception 'insufficient PvP points' using errcode = '23514'; end if;
  v_remaining := v_remaining - 1;
  update public.users
  set pvp_points = v_remaining,
      pvp_points_last_recovered_at = case
        when v_recovered > 0 or coalesce(v_user.pvp_points, 0) = 5 then v_now
        else v_user.pvp_points_last_recovered_at
      end
  where id = v_user_id;

  select deck.* into v_deck
  from public.pvp_defense_decks deck
  where deck.user_id = p_opponent_user_id;
  if not found then raise exception 'opponent defense deck not found' using errcode = 'P0002'; end if;

  select player.username, coalesce(rank.rank_points, 1000), member.guild_id, guild.name
  into v_opponent_name, v_opponent_rank, v_opponent_guild_id, v_opponent_guild_name
  from public.users player
  left join public.pvp_ranks rank on rank.user_id = player.id
  left join public.guild_members member on member.user_id = player.id
  left join public.guilds guild on guild.id = member.guild_id
  where player.id = p_opponent_user_id;
  if not found then raise exception 'opponent not found' using errcode = 'P0002'; end if;

  select coalesce(rank.rank_points, 1000) into v_my_rank
  from public.users player left join public.pvp_ranks rank on rank.user_id = player.id
  where player.id = v_user_id;

  v_player_snapshot := public.build_server_battle_snapshot(v_user_id, p_character_ids, 'PLAYER');
  v_enemy_snapshot := public.build_server_battle_snapshot(p_opponent_user_id, array_remove(array[
    v_deck.character_1_id, v_deck.character_2_id, v_deck.character_3_id,
    v_deck.character_4_id, v_deck.character_5_id
  ]::text[], null), 'ENEMY');
  v_seed := floor(random() * 2147483646)::bigint + 1;

  insert into public.battle_replay_sessions(
    requester_user_id, battle_mode, source_reference_id, tactic_id,
    random_seed, player_snapshot, enemy_snapshot, resolution_authority,
    finalization_status, official_context
  ) values (
    v_user_id, 'PVP', p_opponent_user_id, p_tactic,
    v_seed, v_player_snapshot, v_enemy_snapshot, 'PVP_SERVER',
    'PENDING', jsonb_build_object(
      'opponentUserId', p_opponent_user_id,
      'opponentName', v_opponent_name,
      'opponentGuildId', v_opponent_guild_id,
      'opponentGuildName', v_opponent_guild_name,
      'playerRankPointsAtStart', v_my_rank,
      'opponentRankPointsAtStart', v_opponent_rank,
      'remainingPvpPoints', v_remaining,
      'rewardRevision', 'OPEN_BETA_P0_V1'
    )
  ) returning id into v_replay_id;

  return jsonb_build_object(
    'replay_session_id', v_replay_id,
    'player_snapshot', v_player_snapshot,
    'enemy_snapshot', v_enemy_snapshot,
    'opponent_name', v_opponent_name,
    'opponent_guild_id', v_opponent_guild_id,
    'opponent_guild_name', v_opponent_guild_name,
    'opponent_rank_points', v_opponent_rank,
    'remaining_pvp_points', v_remaining
  );
end;
$$;

create or replace function public.finalize_pvp_battle(
  p_replay_id uuid,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replay public.battle_replay_sessions%rowtype;
  v_is_win boolean;
  v_rank_gap integer;
  v_rank_delta integer;
  v_cash integer;
  v_diamond integer;
  v_exp integer;
  v_new_rank integer;
  v_reward record;
  v_final jsonb;
  v_attacker_name text;
begin
  select * into v_replay from public.battle_replay_sessions where id = p_replay_id for update;
  if not found then raise exception 'PvP replay not found' using errcode = 'P0002'; end if;
  if v_replay.battle_mode <> 'PVP' or v_replay.resolution_authority <> 'PVP_SERVER' then
    raise exception 'replay is not an official PvP battle' using errcode = '42501';
  end if;
  if v_replay.finalization_status = 'FINALIZED' then return v_replay.finalization_result; end if;
  if v_replay.status <> 'PENDING' or v_replay.finalization_status <> 'PENDING' then
    raise exception 'PvP replay is not finalizable' using errcode = '23514';
  end if;
  perform public.validate_official_battle_result(p_result);

  v_is_win := p_result ->> 'winner' = 'PLAYER';
  v_rank_gap := coalesce((v_replay.official_context ->> 'opponentRankPointsAtStart')::integer, 1000)
              - coalesce((v_replay.official_context ->> 'playerRankPointsAtStart')::integer, 1000);
  if v_is_win then
    v_rank_delta := least(30, greatest(5, 15 + floor(v_rank_gap / 50.0)::integer));
  else
    v_rank_delta := least(-2, greatest(-15, -5 + floor(v_rank_gap / 50.0)::integer));
  end if;

  select * into v_reward from public.pvp_match_rewards_master
  where result = case when v_is_win then 'VICTORY' else 'DEFEAT' end;
  v_cash := greatest(coalesce(v_reward.cash_reward, 0), 0);
  if v_is_win then v_cash := least(1000, greatest(100, v_cash + floor(v_rank_gap * 1.5)::integer));
  else v_cash := 0;
  end if;
  v_diamond := greatest(coalesce(v_reward.diamond_reward, 0), 0);
  v_exp := greatest(coalesce(v_reward.exp_reward, 0), 0);

  insert into public.pvp_ranks(user_id, rank_points, daily_wins, season_wins, updated_at)
  values (v_replay.requester_user_id, greatest(1000 + v_rank_delta, 0), case when v_is_win then 1 else 0 end, case when v_is_win then 1 else 0 end, now())
  on conflict (user_id) do update set
    rank_points = greatest(public.pvp_ranks.rank_points + v_rank_delta, 0),
    daily_wins = public.pvp_ranks.daily_wins + case when v_is_win then 1 else 0 end,
    season_wins = public.pvp_ranks.season_wins + case when v_is_win then 1 else 0 end,
    updated_at = now()
  returning rank_points into v_new_rank;

  update public.users set cash = cash + v_cash, neon_diamonds = neon_diamonds + v_diamond
  where id = v_replay.requester_user_id;
  if v_exp > 0 then perform public.apply_user_xp(v_replay.requester_user_id, v_exp); end if;

  select username into v_attacker_name from public.users where id = v_replay.requester_user_id;
  insert into public.pvp_defense_logs(user_id, attacker_id, attacker_name, result, points_change)
  values (
    v_replay.source_reference_id, v_replay.requester_user_id, v_attacker_name,
    case when v_is_win then 'DEFEAT' else 'VICTORY' end, -v_rank_delta
  );

  v_final := p_result || jsonb_build_object(
    'mode', 'PVP',
    'rankDelta', v_rank_delta,
    'newRankPoints', v_new_rank,
    'remainingPvpPoints', coalesce((v_replay.official_context ->> 'remainingPvpPoints')::integer, 0),
    'opponentUserId', v_replay.source_reference_id,
    'opponentName', v_replay.official_context ->> 'opponentName',
    'opponentGuildId', v_replay.official_context ->> 'opponentGuildId',
    'opponentGuildName', v_replay.official_context ->> 'opponentGuildName',
    'rewards', jsonb_build_object('cash', v_cash, 'diamonds', v_diamond, 'xp', v_exp)
  );

  insert into public.battle_replay_events(
    battle_replay_session_id, event_index, round_number, event_type, payload
  )
  select p_replay_id,
         greatest(coalesce((event.value ->> 'index')::integer, event.ordinality::integer - 1), 0),
         greatest(coalesce((event.value ->> 'round')::integer, 1), 1),
         coalesce(nullif(event.value ->> 'type', ''), 'UNKNOWN'),
         coalesce(event.value -> 'payload', '{}'::jsonb)
  from jsonb_array_elements(p_result -> 'events') with ordinality event(value, ordinality)
  on conflict (battle_replay_session_id, event_index) do nothing;

  update public.battle_replay_sessions
  set status = 'RESOLVED', result = v_final, resolved_at = now(),
      finalization_status = 'FINALIZED', finalized_at = now(), finalization_result = v_final
  where id = p_replay_id;
  return v_final;
end;
$$;

revoke all on function public.start_pvp_battle(uuid, text[], text) from public, anon;
grant execute on function public.start_pvp_battle(uuid, text[], text) to authenticated;
revoke all on function public.finalize_pvp_battle(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_pvp_battle(uuid, jsonb) to service_role;

commit;

notify pgrst, 'reload schema';
