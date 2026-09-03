begin;

do $$
declare
  v_definition text;
begin
  if (select count(*) from public.ranking_guild_power_season_master
      where event_key='PREOPEN_GUILD_POWER_2026'
        and starts_at='2026-09-03 15:00:00+00'::timestamptz
        and ends_at='2026-09-08 15:00:00+00'::timestamptz)<>1 then
    raise exception '120-hour JST season master is missing';
  end if;

  select pg_get_functiondef('public.finalize_preopen_guild_power_season()'::regprocedure)
  into v_definition;
  if position('rank() over(order by totals.total_power desc)' in lower(v_definition))=0 then
    raise exception 'competition rank contract (1,1,3) is missing';
  end if;
  if position('calculate_user_total_power(member.user_id)' in lower(v_definition))=0 then
    raise exception 'main-deck Power authority is missing';
  end if;
  if position('ranking_guild_exclusions' in lower(v_definition))=0 then
    raise exception 'explicit QA/Operations exclusion authority is missing';
  end if;
  if position('guild_preopen_2026_participation' in lower(v_definition))=0
     or position('guild_preopen_2026_rank_1' in lower(v_definition))=0
     or position('guild_preopen_2026_rank_2' in lower(v_definition))=0
     or position('guild_preopen_2026_rank_3' in lower(v_definition))=0 then
    raise exception 'participation plus top-three grants are incomplete';
  end if;

  if not exists(
    select 1 from pg_constraint
    where conrelid='public.ranking_guild_power_reward_grants'::regclass
      and contype='p'
  ) then raise exception 'exactly-once guild reward key is missing'; end if;
  if has_table_privilege('authenticated','public.ranking_guild_power_season_snapshots','update')
     or has_table_privilege('authenticated','public.ranking_guild_power_season_snapshots','delete') then
    raise exception 'snapshot is mutable by authenticated users';
  end if;
end;
$$;

rollback;
