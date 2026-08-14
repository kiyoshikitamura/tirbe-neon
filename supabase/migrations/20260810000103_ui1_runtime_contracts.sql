-- UI-1 runtime contracts for the production schema, which still stores
-- PvP stamina as pvp_tickets. Keep the client-facing RPC names stable while
-- the physical schema is migrated separately.

create or replace function public.sync_and_recover_vitality_and_pvp_points(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_now timestamptz := now();
  v_vitality_recovery integer;
  v_ticket_recovery integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into v_user from public.users where id = p_user_id for update;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;

  v_vitality_recovery := floor(extract(epoch from (v_now - v_user.vitality_last_recovered_at)) / 300);
  v_ticket_recovery := floor(extract(epoch from (v_now - v_user.pvp_tickets_last_recovered_at)) / 3600);

  update public.users
  set vitality = least(vitality_max, vitality + greatest(v_vitality_recovery, 0)),
      vitality_last_recovered_at = case when v_vitality_recovery > 0 then v_now else vitality_last_recovered_at end,
      pvp_tickets = least(pvp_tickets_max, pvp_tickets + greatest(v_ticket_recovery, 0)),
      pvp_tickets_last_recovered_at = case when v_ticket_recovery > 0 then v_now else pvp_tickets_last_recovered_at end
  where id = p_user_id
  returning * into v_user;

  return jsonb_build_object(
    'out_vitality', v_user.vitality,
    'out_pvp_points', v_user.pvp_tickets,
    'out_cash', v_user.cash,
    'out_diamonds', v_user.neon_diamonds
  );
end;
$$;

create or replace function public.consume_pvp_point(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_remaining integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.users
  set pvp_tickets = pvp_tickets - 1,
      pvp_tickets_last_recovered_at = case when pvp_tickets = pvp_tickets_max then now() else pvp_tickets_last_recovered_at end
  where id = p_user_id and pvp_tickets > 0
  returning pvp_tickets into v_remaining;

  if v_remaining is null then
    return jsonb_build_object('error', 'insufficient_pvp_points');
  end if;
  return jsonb_build_object('success', true, 'remaining_points', v_remaining);
end;
$$;

create or replace function public.save_pvp_defense_deck(
  p_character_ids uuid[],
  p_tactic text default 'BALANCED'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := coalesce(cardinality(p_character_ids), 0);
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if v_count < 1 or v_count > 5 then raise exception 'defense deck must contain 1 to 5 members' using errcode = '22023'; end if;
  if (select count(*) from public.user_characters where user_id = v_user_id and id = any(p_character_ids)) <> v_count then
    raise exception 'deck contains an unowned character' using errcode = '42501';
  end if;

  insert into public.pvp_defense_decks (
    user_id, character_1_id, character_2_id, character_3_id,
    character_4_id, character_5_id, tactic, updated_at
  ) values (
    v_user_id, p_character_ids[1], p_character_ids[2], p_character_ids[3],
    p_character_ids[4], p_character_ids[5], coalesce(nullif(p_tactic, ''), 'BALANCED'), now()
  )
  on conflict (user_id) do update set
    character_1_id = excluded.character_1_id,
    character_2_id = excluded.character_2_id,
    character_3_id = excluded.character_3_id,
    character_4_id = excluded.character_4_id,
    character_5_id = excluded.character_5_id,
    tactic = excluded.tactic,
    updated_at = now();

  return jsonb_build_object('success', true, 'member_count', v_count);
end;
$$;

create or replace function public.save_gvg_defense_deck(p_character_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := coalesce(cardinality(p_character_ids), 0);
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.guild_members where user_id = v_user_id) then
    raise exception 'guild membership required' using errcode = '42501';
  end if;
  if v_count > 5 then raise exception 'defense deck must contain at most 5 members' using errcode = '22023'; end if;
  if v_count > 0 and (select count(*) from public.user_characters where user_id = v_user_id and id = any(p_character_ids)) <> v_count then
    raise exception 'deck contains an unowned character' using errcode = '42501';
  end if;

  if v_count = 0 then
    delete from public.gvg_defense_decks where user_id = v_user_id;
  else
    insert into public.gvg_defense_decks (
      user_id, character_1_id, character_2_id, character_3_id,
      character_4_id, character_5_id, updated_at
    ) values (
      v_user_id, p_character_ids[1]::text, p_character_ids[2]::text, p_character_ids[3]::text,
      p_character_ids[4]::text, p_character_ids[5]::text, now()
    )
    on conflict (user_id) do update set
      character_1_id = excluded.character_1_id,
      character_2_id = excluded.character_2_id,
      character_3_id = excluded.character_3_id,
      character_4_id = excluded.character_4_id,
      character_5_id = excluded.character_5_id,
      updated_at = now();
  end if;

  return jsonb_build_object('success', true, 'member_count', v_count);
end;
$$;

-- PostgreSQL cannot change an existing function from jsonb to TABLE through
-- CREATE OR REPLACE. Drop the zero-argument legacy signature explicitly so a
-- clean migration replay has the same final contract as Development.
drop function if exists public.get_public_power_rankings();

create function public.get_public_power_rankings()
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  current_power integer,
  updated_at timestamptz,
  guild_id uuid,
  guild_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select ranking.user_id, player.username, player.avatar_url,
         ranking.total_power as current_power, ranking.updated_at,
         member.guild_id, guild.name
  from public.user_power_rankings ranking
  join public.users player on player.id = ranking.user_id
  left join public.guild_members member on member.user_id = ranking.user_id
  left join public.guilds guild on guild.id = member.guild_id
  order by ranking.total_power desc, ranking.updated_at asc
  limit 100;
$$;

revoke all on function public.sync_and_recover_vitality_and_pvp_points(uuid) from public;
revoke all on function public.consume_pvp_point(uuid) from public;
revoke all on function public.save_pvp_defense_deck(uuid[], text) from public;
revoke all on function public.save_gvg_defense_deck(uuid[]) from public;
revoke all on function public.get_public_power_rankings() from public;
grant execute on function public.sync_and_recover_vitality_and_pvp_points(uuid) to authenticated;
grant execute on function public.consume_pvp_point(uuid) to authenticated;
grant execute on function public.save_pvp_defense_deck(uuid[], text) to authenticated;
grant execute on function public.save_gvg_defense_deck(uuid[]) to authenticated;
grant execute on function public.get_public_power_rankings() to authenticated;

-- Keep the QA account immediately reviewable without adding automatic
-- provisioning to page reloads.
do $$
declare
  v_user_id uuid;
  v_character_ids uuid[];
begin
  select id into v_user_id from auth.users where lower(email) = lower('izasama39@gmail.com') limit 1;
  if v_user_id is null then return; end if;

  update public.users
  set level = greatest(level, 8),
      vitality = greatest(vitality, 100),
      pvp_tickets = pvp_tickets_max,
      pvp_tickets_last_recovered_at = now()
  where id = v_user_id;

  select array_agg(id order by level desc, id) into v_character_ids
  from (select id, level from public.user_characters where user_id = v_user_id order by level desc, id limit 5) owned;

  if coalesce(cardinality(v_character_ids), 0) > 0 then
    insert into public.pvp_defense_decks (
      user_id, character_1_id, character_2_id, character_3_id,
      character_4_id, character_5_id, tactic, updated_at
    ) values (
      v_user_id, v_character_ids[1], v_character_ids[2], v_character_ids[3],
      v_character_ids[4], v_character_ids[5], 'BALANCED', now()
    )
    on conflict (user_id) do update set
      character_1_id = excluded.character_1_id,
      character_2_id = excluded.character_2_id,
      character_3_id = excluded.character_3_id,
      character_4_id = excluded.character_4_id,
      character_5_id = excluded.character_5_id,
      tactic = excluded.tactic,
      updated_at = now();
  end if;
end;
$$;

notify pgrst, 'reload schema';
