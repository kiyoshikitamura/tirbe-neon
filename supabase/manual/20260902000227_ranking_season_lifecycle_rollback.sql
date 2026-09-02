-- Emergency rollback: disable automatic writes while preserving all ranking history.
begin;
drop trigger if exists raid_damage_logs_ensure_season on public.raid_damage_logs;

create or replace function public.ensure_current_ranking_season(p_type text,p_at timestamptz default clock_timestamp())
returns uuid language sql stable security definer set search_path=public as $$
  select season.id from public.ranking_seasons season
  where season.ranking_type=upper(p_type) and season.status='ACTIVE'
    and p_at>=season.starts_at and p_at<season.ends_at
  order by season.starts_at desc limit 1
$$;

revoke all on function public.ensure_current_ranking_season(text,timestamptz) from public,anon,authenticated;
grant execute on function public.ensure_current_ranking_season(text,timestamptz) to service_role;
commit;
