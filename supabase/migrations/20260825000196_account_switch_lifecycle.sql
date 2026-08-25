begin;

-- Discard only the caller's unregistered anonymous onboarding account before
-- an explicit switch to an already registered identity. No target user id is
-- accepted and no data is copied to the destination account.
create or replace function public.discard_current_anonymous_account_for_switch()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_user auth.users%rowtype;
  v_deleted_public integer := 0;
  v_deleted_auth integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  select * into v_auth_user
  from auth.users
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Authenticated user was not found' using errcode = 'P0002';
  end if;
  if v_auth_user.is_anonymous is not true
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'Only the current anonymous account can be discarded' using errcode = '42501';
  end if;

  perform 1 from public.users where id = v_user_id for update;
  if not found then
    raise exception 'Anonymous gameplay profile was not found' using errcode = 'P0002';
  end if;

  if exists(select 1 from public.user_account_auth_methods row where row.user_id = v_user_id)
     or exists(select 1 from auth.identities row where row.user_id = v_user_id and row.provider <> 'anonymous') then
    raise exception 'A formally connected identity cannot be discarded' using errcode = '42501';
  end if;

  -- External, competitive, guild, invite and financial attribution must never
  -- be cascaded by account switching. Operations review is required instead.
  if exists(select 1 from public.payment_transactions row where row.user_id = v_user_id)
     or exists(select 1 from public.user_monthly_passes row where row.user_id = v_user_id)
     or exists(select 1 from public.user_invitations row where row.inviter_user_id = v_user_id or row.invitee_user_id = v_user_id)
     or exists(select 1 from public.user_friends row where row.user_id = v_user_id or row.friend_id = v_user_id)
     or exists(select 1 from public.guild_members row where row.user_id = v_user_id)
     or exists(select 1 from public.guilds row where row.leader_id = v_user_id)
     or exists(select 1 from public.guild_exp_daily_ledger row where row.user_id = v_user_id)
     or exists(select 1 from public.guild_exp_daily_progress row where row.user_id = v_user_id)
     or exists(select 1 from public.raid_damage_logs row where row.user_id = v_user_id)
     or exists(select 1 from public.raid_reward_grants row where row.user_id = v_user_id)
     or exists(select 1 from public.raid_production_reward_grants row where row.user_id = v_user_id)
     or exists(select 1 from public.raid_completion_xp_grants row where row.user_id = v_user_id)
     or exists(select 1 from public.raid_instance_user_progress row where row.user_id = v_user_id)
     or exists(select 1 from public.user_raid_daily_attempts row where row.user_id = v_user_id)
     or exists(select 1 from public.pvp_defense_logs row where row.user_id = v_user_id)
     or exists(select 1 from public.pvp_ranking_reward_grants row where row.user_id = v_user_id)
     or exists(select 1 from public.pvp_daily_wins row where row.user_id = v_user_id)
     or exists(select 1 from public.gvg_attack_logs row where row.attacker_user_id = v_user_id)
     or exists(select 1 from public.gvg_individual_season_rankings row where row.user_id = v_user_id) then
    raise exception 'Anonymous account has protected history and cannot be discarded' using errcode = '55000';
  end if;

  delete from public.users where id = v_user_id;
  get diagnostics v_deleted_public = row_count;
  if v_deleted_public <> 1 then
    raise exception 'Anonymous gameplay profile discard did not complete' using errcode = 'P0001';
  end if;

  delete from auth.users where id = v_user_id;
  get diagnostics v_deleted_auth = row_count;
  if v_deleted_auth <> 1 then
    raise exception 'Anonymous auth account discard did not complete' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'status', 'DISCARDED',
    'discardedUserId', v_user_id,
    'gameplayMerged', false
  );
end;
$$;

revoke all on function public.discard_current_anonymous_account_for_switch()
  from public, anon;
grant execute on function public.discard_current_anonymous_account_for_switch()
  to authenticated;

commit;
notify pgrst, 'reload schema';
