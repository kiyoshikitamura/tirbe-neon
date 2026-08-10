-- UI-1 review foundation: production-schema-compatible PvP opponents,
-- official GvG read model, and a repeatable fixture restricted to the QA user.

alter table public.pvp_defense_decks
  add column if not exists tactic text not null default 'ATTACK_PRIORITY';

create table if not exists public.gvg_match_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  status text not null default 'MATCHING'
    check (status in ('MATCHING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  is_npc_match boolean not null default false,
  guild_a_id uuid not null references public.guilds(id) on delete restrict,
  guild_b_id uuid references public.guilds(id) on delete restrict,
  npc_guild_name text,
  guild_a_phase integer not null default 1,
  guild_b_phase integer not null default 1,
  guild_a_phase_max_hp bigint not null default 0,
  guild_b_phase_max_hp bigint not null default 0,
  guild_a_phase_hp bigint not null default 0,
  guild_b_phase_hp bigint not null default 0,
  guild_a_collapses integer not null default 0,
  guild_b_collapses integer not null default 0,
  created_at timestamptz not null default now(),
  check (scheduled_end_at > scheduled_start_at)
);

alter table public.gvg_match_sessions
  add column if not exists matched_at timestamptz,
  add column if not exists phases_required smallint not null default 2,
  add column if not exists guild_a_total_applied_damage bigint not null default 0,
  add column if not exists guild_b_total_applied_damage bigint not null default 0,
  add column if not exists winner_guild_id uuid references public.guilds(id) on delete set null,
  add column if not exists result_reason text,
  add column if not exists completed_at timestamptz;

create table if not exists public.gvg_match_member_snapshots (
  id uuid primary key default gen_random_uuid(),
  match_session_id uuid not null references public.gvg_match_sessions(id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  guild_id uuid references public.guilds(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  defense_deck jsonb not null default '[]'::jsonb,
  defense_is_npc boolean not null default false,
  npc_power bigint,
  created_at timestamptz not null default now(),
  unique (match_session_id, user_id)
);

create table if not exists public.gvg_attack_logs (
  id uuid primary key default gen_random_uuid(),
  match_session_id uuid not null references public.gvg_match_sessions(id) on delete cascade,
  attacker_user_id uuid not null references public.users(id) on delete restrict,
  attacker_guild_id uuid not null references public.guilds(id) on delete restrict,
  defender_snapshot_id uuid references public.gvg_match_member_snapshots(id) on delete set null,
  battle_session_id uuid,
  battle_result text not null default 'PENDING' check (battle_result in ('PENDING', 'VICTORY', 'DEFEAT')),
  raw_damage bigint not null default 0,
  applied_damage bigint not null default 0,
  win_damage_multiplier numeric(3,2) not null default 1.00,
  accepted_at timestamptz not null default now(),
  resolved_at timestamptz not null default now()
);

alter table public.gvg_match_sessions enable row level security;
alter table public.gvg_match_member_snapshots enable row level security;
alter table public.gvg_attack_logs enable row level security;
drop policy if exists "authenticated read gvg match sessions" on public.gvg_match_sessions;
create policy "authenticated read gvg match sessions"
on public.gvg_match_sessions for select to authenticated using (true);
drop policy if exists "authenticated read gvg snapshots" on public.gvg_match_member_snapshots;
create policy "authenticated read gvg snapshots"
on public.gvg_match_member_snapshots for select to authenticated using (true);
drop policy if exists "owner read gvg attack logs" on public.gvg_attack_logs;
create policy "owner read gvg attack logs"
on public.gvg_attack_logs for select to authenticated using (attacker_user_id = auth.uid());

create or replace function public.get_pvp_opponents(
  p_user_id uuid,
  p_my_points integer
)
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

  select coalesce(jsonb_agg(candidate.row_data), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'opponent_user_id', player.id,
      'opponent_username', player.username,
      'opponent_guild_name', coalesce(guild.name, '無所属'),
      'opponent_points', coalesce(rank.rank_points, 1000),
      'tactic', coalesce(deck.tactic, 'BALANCED'),
      'opponent_guild_main_alignment', 'NEUTRAL',
      'opponent_guild_sub_alignment', 'NEUTRAL',
      'defense_character_ids', to_jsonb(array_remove(array[
        deck.character_1_id,
        deck.character_2_id,
        deck.character_3_id,
        deck.character_4_id,
        deck.character_5_id
      ]::text[], null))
    ) as row_data
    from public.users player
    join public.pvp_defense_decks deck on deck.user_id = player.id
    left join public.pvp_ranks rank on rank.user_id = player.id
    left join public.guild_members member on member.user_id = player.id
    left join public.guilds guild on guild.id = member.guild_id
    where player.id <> p_user_id
      and (p_my_points is null or abs(coalesce(rank.rank_points, 1000) - p_my_points) <= 300)
    order by abs(coalesce(rank.rank_points, 1000) - coalesce(p_my_points, 1000)), player.id
    limit 5
  ) candidate;

  return v_result;
end;
$$;

revoke all on function public.get_pvp_opponents(uuid, integer) from public;
grant execute on function public.get_pvp_opponents(uuid, integer) to authenticated;

create or replace function public.apply_qa_ui1_fixture(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild_id uuid;
  v_boss_id uuid;
  v_opponent record;
begin
  select id into v_guild_id
  from public.guilds
  order by level desc, created_at, id
  limit 1;
  if v_guild_id is null then raise exception 'QA guild master is missing'; end if;

  update public.users
  set level = greatest(level, 8),
      vitality = greatest(vitality, 100),
      pvp_tickets = greatest(pvp_tickets, 5)
  where id = p_user_id;

  insert into public.guild_members (guild_id, user_id, role, joined_at, weekly_contribution)
  values (v_guild_id, p_user_id, 'MEMBER', now(), 420)
  on conflict (user_id) do update set
    guild_id = excluded.guild_id,
    role = 'MEMBER',
    weekly_contribution = greatest(public.guild_members.weekly_contribution, excluded.weekly_contribution);

  insert into public.pvp_ranks (user_id, rank_points, daily_wins, season_wins, updated_at)
  values (p_user_id, 1000, 3, 12, now())
  on conflict (user_id) do update set
    rank_points = greatest(public.pvp_ranks.rank_points, 1000),
    daily_wins = greatest(public.pvp_ranks.daily_wins, 3),
    season_wins = greatest(public.pvp_ranks.season_wins, 12),
    updated_at = now();

  insert into public.user_power_rankings (user_id, current_power, updated_at)
  values (p_user_id, 13670, now())
  on conflict (user_id) do update set
    current_power = greatest(public.user_power_rankings.current_power, 13670),
    updated_at = now();

  for v_opponent in
    select owned.user_id, array_agg(owned.id order by owned.level desc, owned.id) as character_ids
    from public.user_characters owned
    where owned.user_id <> p_user_id
    group by owned.user_id
    order by owned.user_id
    limit 5
  loop
    insert into public.pvp_defense_decks (
      user_id, character_1_id, character_2_id, character_3_id,
      character_4_id, character_5_id, tactic, updated_at
    ) values (
      v_opponent.user_id,
      v_opponent.character_ids[1], v_opponent.character_ids[2], v_opponent.character_ids[3],
      v_opponent.character_ids[4], v_opponent.character_ids[5], 'BALANCED', now()
    )
    on conflict (user_id) do update set
      character_1_id = excluded.character_1_id,
      character_2_id = excluded.character_2_id,
      character_3_id = excluded.character_3_id,
      character_4_id = excluded.character_4_id,
      character_5_id = excluded.character_5_id,
      tactic = excluded.tactic,
      updated_at = now();

    insert into public.pvp_ranks (user_id, rank_points, daily_wins, season_wins, updated_at)
    values (v_opponent.user_id, 1000, 2, 8, now())
    on conflict (user_id) do update set updated_at = now();
  end loop;

  insert into public.user_gvg_ranks (user_id, season_points, updated_at)
  values (p_user_id, 1250, now())
  on conflict (user_id) do update set
    season_points = greatest(public.user_gvg_ranks.season_points, 1250),
    updated_at = now();

  delete from public.gvg_match_sessions
  where session_key = 'qa-ui1-' || p_user_id::text;
  insert into public.gvg_match_sessions (
    session_key, scheduled_start_at, scheduled_end_at, status, is_npc_match,
    guild_a_id, guild_b_id, npc_guild_name,
    guild_a_phase_max_hp, guild_b_phase_max_hp,
    guild_a_phase_hp, guild_b_phase_hp
  ) values (
    'qa-ui1-' || p_user_id::text, now() - interval '5 minutes', now() + interval '24 hours',
    'ACTIVE', true, v_guild_id, null, '湾岸スカルズ',
    250000, 250000, 214000, 176000
  );

  select id into v_boss_id from public.raid_bosses order by spawned_at desc nulls last, id limit 1;
  if v_boss_id is not null then
    update public.raid_bosses
    set status = 'ACTIVE',
        current_hp = greatest(1, round(max_hp * 0.72)::bigint),
        spawned_at = now(),
        expires_at = now() + interval '24 hours'
    where id = v_boss_id;

    update public.raid_damage_logs
    set damage_dealt = greatest(damage_dealt, 125000), guild_id = v_guild_id
    where raid_boss_id = v_boss_id and user_id = p_user_id;
    if not found then
      insert into public.raid_damage_logs (raid_boss_id, user_id, guild_id, damage_dealt, created_at)
      values (v_boss_id, p_user_id, v_guild_id, 125000, now());
    end if;
  end if;

  return jsonb_build_object(
    'status', 'success', 'guild_id', v_guild_id,
    'pvp_opponents', (select count(*) from public.pvp_defense_decks where user_id <> p_user_id),
    'gvg_match', true, 'raid_boss_id', v_boss_id
  );
end;
$$;

revoke all on function public.apply_qa_ui1_fixture(uuid) from public;
revoke all on function public.apply_qa_ui1_fixture(uuid) from authenticated;

create or replace function public.provision_qa_ui1_fixture()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email_hash text := encode(extensions.digest(lower(coalesce(auth.jwt() ->> 'email', '')), 'sha256'), 'hex');
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if v_email_hash <> 'ec4caf39b8c3a960f9287ac282badc8fe2ab3f03326455d4274e8bfd2de53f42' then
    raise exception 'QA fixture is not available for this account' using errcode = '42501';
  end if;
  return public.apply_qa_ui1_fixture(v_user_id);
end;
$$;

revoke all on function public.provision_qa_ui1_fixture() from public;
grant execute on function public.provision_qa_ui1_fixture() to authenticated;

do $$
declare v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower('izasama39@gmail.com') limit 1;
  if v_user_id is not null then perform public.apply_qa_ui1_fixture(v_user_id); end if;
end;
$$;

notify pgrst, 'reload schema';
