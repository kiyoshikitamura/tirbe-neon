begin;

-- Username reservations are owned by the anonymous public user created during
-- onboarding. Release abandoned reservations after 24 hours of inactivity,
-- while retaining every durable identity and gameplay ownership guard from the
-- original cleanup contract.
create or replace function public.cleanup_expired_anonymous_onboarding()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_run_id bigint;
  v_candidate_count integer := 0;
  v_deleted_count integer := 0;
  v_skipped_count integer := 0;
  v_skipped_user_ids uuid[] := '{}'::uuid[];
  v_candidate record;
begin
  insert into public.anonymous_onboarding_cleanup_runs default values
  returning id into v_run_id;

  for v_candidate in
    select au.id
    from auth.users au
    join public.users u on u.id = au.id
    join public.tutorial_progress tp on tp.user_id = au.id
    where au.is_anonymous is true
      and tp.step_id not in ('COMPLETE', 'AUTHENTICATION')
      and greatest(
        au.created_at,
        coalesce(au.last_sign_in_at, au.created_at),
        tp.updated_at
      ) < now() - interval '24 hours'
      -- A linked method or non-anonymous identity makes the account persistent.
      and not exists (
        select 1 from public.user_account_auth_methods method
        where method.user_id = au.id
      )
      and not exists (
        select 1 from auth.identities identity_row
        where identity_row.user_id = au.id
          and identity_row.provider <> 'anonymous'
      )
      -- A recently active anonymous browser is not abandoned.
      and not exists (
        select 1
        from auth.sessions session_row
        where session_row.user_id = au.id
          and session_row.refreshed_at >= now() - interval '24 hours'
          and (session_row.not_after is null or session_row.not_after > now())
      )
      -- Durable social, competitive, payment, or reward ownership is never
      -- removed automatically. Operations must review those anomalous rows.
      and not exists (select 1 from public.user_invitations row where row.inviter_user_id=au.id or row.invitee_user_id=au.id)
      and not exists (select 1 from public.guild_members row where row.user_id=au.id)
      and not exists (select 1 from public.guilds row where row.leader_id=au.id)
      and not exists (select 1 from public.raid_damage_logs row where row.user_id=au.id)
      and not exists (select 1 from public.raid_reward_grants row where row.user_id=au.id)
      and not exists (select 1 from public.raid_production_reward_grants row where row.user_id=au.id)
      and not exists (select 1 from public.pvp_defense_logs row where row.user_id=au.id)
      and not exists (select 1 from public.pvp_ranking_reward_grants row where row.user_id=au.id)
      and not exists (select 1 from public.gvg_attack_logs row where row.attacker_user_id=au.id)
      and not exists (select 1 from public.payment_transactions row where row.user_id=au.id)
    order by au.created_at
    for update of au skip locked
  loop
    v_candidate_count := v_candidate_count + 1;
    begin
      delete from public.users where id = v_candidate.id;
      delete from auth.users where id = v_candidate.id;
      v_deleted_count := v_deleted_count + 1;
    exception when foreign_key_violation then
      v_skipped_count := v_skipped_count + 1;
      v_skipped_user_ids := array_append(v_skipped_user_ids, v_candidate.id);
    end;
  end loop;

  update public.anonymous_onboarding_cleanup_runs
  set finished_at = now(),
      candidate_count = v_candidate_count,
      deleted_count = v_deleted_count,
      skipped_count = v_skipped_count,
      skipped_user_ids = v_skipped_user_ids
  where id = v_run_id;

  return jsonb_build_object(
    'runId', v_run_id,
    'candidates', v_candidate_count,
    'deleted', v_deleted_count,
    'skipped', v_skipped_count
  );
end;
$$;

revoke all on function public.cleanup_expired_anonymous_onboarding()
  from public, anon, authenticated;

commit;
notify pgrst, 'reload schema';
