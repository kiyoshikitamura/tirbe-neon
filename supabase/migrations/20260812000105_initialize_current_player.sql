-- Open Beta M1-3: name-only, current-session player initialization.
-- The caller cannot select a user id, starter character, area, or reward.

do $$
begin
  if exists (
    select lower(btrim(username))
    from public.users
    group by lower(btrim(username))
    having count(*) > 1
  ) then
    raise exception 'Duplicate normalized usernames must be resolved before applying M1-3';
  end if;
end;
$$;

create unique index if not exists users_username_normalized_uidx
  on public.users (lower(btrim(username)));

create or replace function public.initialize_current_player(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := btrim(p_username);
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_starter_character_id text := '11111111-1111-1111-1111-111111111111';
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if not v_is_anonymous then
    raise exception 'Anonymous onboarding session is required';
  end if;
  if v_username is null or char_length(v_username) not between 1 and 8 then
    raise exception 'Username must contain 1 to 8 characters';
  end if;

  -- Serialize retries for the same anonymous account. A lost HTTP response can
  -- then be retried without duplicating starter data or tutorial rewards.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if exists (select 1 from public.users where id = v_user_id) then
    -- Compatibility for anonymous profiles created by the pre-M1 overload.
    -- This creates only the missing state row and never regrants starter data.
    insert into public.tutorial_progress (user_id, step_id)
    values (v_user_id, 'WORLD_INTRO')
    on conflict (user_id) do nothing;
    return jsonb_build_object(
      'status', 'already_initialized',
      'tutorial_step', (select step_id from public.tutorial_progress where user_id = v_user_id)
    );
  end if;

  if exists (
    select 1 from public.users
    where lower(btrim(username)) = lower(v_username)
  ) then
    raise exception 'Username is already in use' using errcode = '23505';
  end if;

  insert into public.users (
    id,
    username,
    current_base_id,
    favorite_character_id
  ) values (
    v_user_id,
    v_username,
    'neon_tower',
    v_starter_character_id
  );

  insert into public.user_characters (
    user_id,
    character_id,
    level,
    awakening_level
  ) values (
    v_user_id,
    v_starter_character_id,
    1,
    0
  ) on conflict (user_id, character_id) do nothing;

  insert into public.tutorial_progress (user_id, step_id)
  values (v_user_id, 'WORLD_INTRO')
  on conflict (user_id) do nothing;

  return jsonb_build_object(
    'status', 'success',
    'tutorial_step', 'WORLD_INTRO'
  );
end;
$$;

revoke all on function public.initialize_current_player(text) from public;
grant execute on function public.initialize_current_player(text) to authenticated;

-- Retire the client-callable overload that accepts arbitrary onboarding data.
revoke all on function public.initialize_new_user(uuid, text, text, text, text, text, text, text) from authenticated;
