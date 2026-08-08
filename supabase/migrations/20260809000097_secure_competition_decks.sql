-- UI Stage 1: competition deck mutations cross a server-side trust boundary.

create or replace function public.save_pvp_defense_deck(
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
  v_requested text[] := coalesce(array_remove(p_character_ids, null), array[]::text[]);
  v_character_ids text[];
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if cardinality(v_requested) > 5 then raise exception 'party supports at most five characters' using errcode = '22023'; end if;
  if p_tactic not in ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') then
    raise exception 'invalid tactic' using errcode = '22023';
  end if;

  select coalesce(array_agg(character_row.id::text order by requested.ordinality), array[]::text[])
  into v_character_ids
  from unnest(v_requested) with ordinality as requested(character_id, ordinality)
  join lateral (
    select owned.id
    from public.user_characters owned
    where owned.user_id = v_user_id
      and (owned.id::text = requested.character_id or owned.character_id = requested.character_id)
    order by (owned.id::text = requested.character_id) desc, owned.id
    limit 1
  ) character_row on true;

  if cardinality(v_character_ids) <> cardinality(v_requested) then
    raise exception 'party contains a character that is not owned' using errcode = '23503';
  end if;
  if cardinality(v_character_ids) <> (select count(distinct character_id) from unnest(v_character_ids) as ids(character_id)) then
    raise exception 'party contains duplicate characters' using errcode = '23505';
  end if;

  insert into public.pvp_defense_decks (
    user_id, character_1_id, character_2_id, character_3_id, character_4_id, character_5_id, tactic, updated_at
  ) values (
    v_user_id,
    v_character_ids[1], v_character_ids[2], v_character_ids[3], v_character_ids[4], v_character_ids[5],
    p_tactic, now()
  )
  on conflict (user_id) do update set
    character_1_id = excluded.character_1_id,
    character_2_id = excluded.character_2_id,
    character_3_id = excluded.character_3_id,
    character_4_id = excluded.character_4_id,
    character_5_id = excluded.character_5_id,
    tactic = excluded.tactic,
    updated_at = excluded.updated_at;

  return jsonb_build_object('status', 'success', 'character_ids', to_jsonb(v_character_ids), 'tactic', p_tactic);
end;
$$;

create or replace function public.save_gvg_defense_deck(p_character_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_requested text[] := coalesce(array_remove(p_character_ids, null), array[]::text[]);
  v_character_ids text[];
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select member.guild_id into v_guild_id from public.guild_members member where member.user_id = v_user_id;
  if v_guild_id is null then raise exception 'guild membership required' using errcode = '42501'; end if;
  if cardinality(v_requested) > 5 then raise exception 'defense supports at most five characters' using errcode = '22023'; end if;

  if cardinality(v_requested) = 0 then
    delete from public.gvg_defense_decks where user_id = v_user_id;
    return jsonb_build_object('status', 'success', 'removed', true);
  end if;

  select coalesce(array_agg(character_row.id::text order by requested.ordinality), array[]::text[])
  into v_character_ids
  from unnest(v_requested) with ordinality as requested(character_id, ordinality)
  join lateral (
    select owned.id
    from public.user_characters owned
    where owned.user_id = v_user_id
      and (owned.id::text = requested.character_id or owned.character_id = requested.character_id)
    order by (owned.id::text = requested.character_id) desc, owned.id
    limit 1
  ) character_row on true;

  if cardinality(v_character_ids) <> cardinality(v_requested) then
    raise exception 'defense contains a character that is not owned' using errcode = '23503';
  end if;
  if cardinality(v_character_ids) <> (select count(distinct character_id) from unnest(v_character_ids) as ids(character_id)) then
    raise exception 'defense contains duplicate characters' using errcode = '23505';
  end if;

  insert into public.gvg_defense_decks (
    user_id, guild_id, character_1_id, character_2_id, character_3_id, character_4_id, character_5_id, updated_at
  ) values (
    v_user_id, v_guild_id,
    v_character_ids[1], v_character_ids[2], v_character_ids[3], v_character_ids[4], v_character_ids[5], now()
  )
  on conflict (user_id) do update set
    guild_id = excluded.guild_id,
    character_1_id = excluded.character_1_id,
    character_2_id = excluded.character_2_id,
    character_3_id = excluded.character_3_id,
    character_4_id = excluded.character_4_id,
    character_5_id = excluded.character_5_id,
    updated_at = excluded.updated_at;

  return jsonb_build_object('status', 'success', 'removed', false, 'character_ids', to_jsonb(v_character_ids));
end;
$$;

revoke all on function public.save_pvp_defense_deck(text[], text) from public;
revoke all on function public.save_gvg_defense_deck(text[]) from public;
grant execute on function public.save_pvp_defense_deck(text[], text) to authenticated;
grant execute on function public.save_gvg_defense_deck(text[]) to authenticated;

-- Debug reset stubs must never be callable from the consumer application.
revoke all on function public.reset_daily_power_rankings() from public;
revoke all on function public.reset_daily_power_rankings() from authenticated;
revoke all on function public.reset_seasonal_power_rankings() from public;
revoke all on function public.reset_seasonal_power_rankings() from authenticated;
grant execute on function public.reset_daily_power_rankings() to service_role;
grant execute on function public.reset_seasonal_power_rankings() to service_role;

drop policy if exists "Allow all access to pvp_defense_decks" on public.pvp_defense_decks;
drop policy if exists "authenticated read pvp defense decks" on public.pvp_defense_decks;
create policy "authenticated read pvp defense decks"
on public.pvp_defense_decks for select to authenticated using (true);

drop policy if exists "Allow all access to gvg_defense_decks" on public.gvg_defense_decks;
drop policy if exists "authenticated read gvg defense decks" on public.gvg_defense_decks;
create policy "authenticated read gvg defense decks"
on public.gvg_defense_decks for select to authenticated using (true);

drop policy if exists "Allow all access to pvp_ranks" on public.pvp_ranks;
drop policy if exists "authenticated read pvp ranks" on public.pvp_ranks;
create policy "authenticated read pvp ranks"
on public.pvp_ranks for select to authenticated using (true);

drop policy if exists "Allow all access to user_gvg_ranks" on public.user_gvg_ranks;
drop policy if exists "authenticated read user gvg ranks" on public.user_gvg_ranks;
create policy "authenticated read user gvg ranks"
on public.user_gvg_ranks for select to authenticated using (true);
