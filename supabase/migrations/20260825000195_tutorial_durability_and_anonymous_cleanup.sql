begin;

-- Tutorial-only durability shaping. Canonical q_shinjuku_1 and the player
-- snapshot remain unchanged; only the three replay enemy units are projected.
create or replace function public.apply_tutorial_enemy_snapshot(
  p_user_id uuid,
  p_player_snapshot jsonb,
  p_enemy_snapshot jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists(
      select 1
      from public.tutorial_progress
      where user_id = p_user_id
        and step_id = 'TUTORIAL_BATTLE'
    )
    then coalesce((
      select jsonb_agg(
        jsonb_set(
          jsonb_set(
            unit,
            '{stats,hp}',
            to_jsonb(greatest(1, round(coalesce((unit #>> '{stats,hp}')::numeric, 1) * 0.35)::integer)),
            true
          ),
          '{stats,def}',
          to_jsonb(greatest(0, round(coalesce((unit #>> '{stats,def}')::numeric, 0) * 0.35)::integer)),
          true
        )
        order by unit_ordinality
      )
      from jsonb_array_elements(coalesce(p_enemy_snapshot, '[]'::jsonb))
        with ordinality enemies(unit, unit_ordinality)
    ), '[]'::jsonb)
    else p_enemy_snapshot
  end;
$$;

revoke all on function public.apply_tutorial_enemy_snapshot(uuid,jsonb,jsonb)
  from public, anon, authenticated;

-- Quest Gameplay v2 replaced create_patrol_battle_replay after the original
-- tutorial hook was introduced. Reattach the projection to the latest function
-- without copying or redesigning its authoritative quest/replay contract.
do $reconcile_replay$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)'))
  into v_definition;
  if v_definition is null then
    raise exception 'create_patrol_battle_replay(uuid,text) is required';
  end if;
  if position('apply_tutorial_enemy_snapshot' in v_definition) > 0 then
    return;
  end if;

  v_updated := regexp_replace(
    v_definition,
    '(v_enemy\s*:=\s*public\.canonical_quest_enemy_snapshot\([^;]+;)',
    E'\\1\n v_enemy := public.apply_tutorial_enemy_snapshot(v_uid, v_player, v_enemy);',
    'i'
  );
  if v_updated = v_definition then
    raise exception 'latest patrol replay enemy snapshot insertion point did not match';
  end if;
  execute v_updated;
end;
$reconcile_replay$;

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.anonymous_onboarding_cleanup_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  candidate_count integer not null default 0,
  deleted_count integer not null default 0,
  skipped_count integer not null default 0,
  skipped_user_ids uuid[] not null default '{}'::uuid[]
);

alter table public.anonymous_onboarding_cleanup_runs enable row level security;
revoke all on public.anonymous_onboarding_cleanup_runs from public, anon, authenticated;

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
      ) < now() - interval '7 days'
      and not exists (
        select 1 from public.user_account_auth_methods method
        where method.user_id = au.id
      )
      and not exists (
        select 1 from auth.identities identity_row
        where identity_row.user_id = au.id
          and identity_row.provider <> 'anonymous'
      )
      and not exists (
        select 1
        from auth.sessions session_row
        where session_row.user_id = au.id
          and session_row.refreshed_at >= now() - interval '7 days'
          and (session_row.not_after is null or session_row.not_after > now())
      )
      -- Never cascade or detach externally attributable social, competitive,
      -- invite, payment, or historical reward state. Such anomalous accounts
      -- require Operations review instead of automated username release.
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
      -- public.users owns gameplay, ownership, gacha, reward and onboarding rows.
      -- Restrictive historical references cause this candidate to be skipped.
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

do $schedule$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'anonymous-onboarding-cleanup-daily';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  -- pg_cron uses UTC. 18:00 UTC is 03:00 JST on the following calendar day.
  perform cron.schedule(
    'anonymous-onboarding-cleanup-daily',
    '0 18 * * *',
    'select public.cleanup_expired_anonymous_onboarding();'
  );
end;
$schedule$;

commit;
notify pgrst, 'reload schema';
