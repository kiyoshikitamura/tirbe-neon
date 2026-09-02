begin;
do $$
declare
  v_before_grants integer;
  v_before_presents integer;
  v_result jsonb;
begin
  select count(*) into v_before_grants from public.ranking_season_reward_grants;
  select count(*) into v_before_presents from public.presents;
  v_result:=public.converge_ranking_lifecycle_safety(clock_timestamp());
  if v_result<>jsonb_build_object('orphanSeasons',0,'raidCutovers',0) then
    raise exception 'safety convergence is not idempotent: %',v_result;
  end if;
  if (select count(*) from public.ranking_season_reward_grants)<>v_before_grants
     or (select count(*) from public.presents)<>v_before_presents then
    raise exception 'idempotent convergence duplicated a reward';
  end if;
end;
$$;
rollback;
