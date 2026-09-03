do $$
declare v_season public.ranking_seasons%rowtype;
begin
  select season.* into strict v_season from public.ranking_seasons season
  join public.ranking_guild_power_season_master master on master.season_id=season.id
  where master.event_key='PREOPEN_GUILD_POWER_2026';
  if v_season.ranking_type<>'GUILD_POWER'
     or v_season.starts_at<>'2026-09-03 15:00:00+00'::timestamptz
     or v_season.ends_at<>'2026-09-08 15:00:00+00'::timestamptz then
    raise exception 'pre-open guild Power JST boundary mismatch';
  end if;
  if (select count(*) from public.cosmetic_master
      where id like 'guild_preopen_2026_%' and owner_scope='GUILD' and active)<>4 then
    raise exception 'pre-open guild cosmetic master mismatch';
  end if;
  if (select count(*) from public.ranking_guild_exclusions)<>0 then
    raise exception 'guild exclusions must remain explicit; unexpected seed rows found';
  end if;
  if has_function_privilege('authenticated','public.finalize_preopen_guild_power_season()','execute') then
    raise exception 'authenticated role can execute the season finalizer';
  end if;
  if not has_function_privilege('authenticated','public.get_preopen_guild_power_ranking(integer,integer)','execute') then
    raise exception 'authenticated role cannot read the pre-open guild ranking';
  end if;
  if not exists(select 1 from cron.job
    where jobname='preopen-guild-power-finalize-20260909-jst'
      and schedule='0 15 8 9 *') then
    raise exception 'pre-open guild finalizer cron mismatch';
  end if;
  if not exists(select 1 from pg_trigger
    where tgrelid='public.ranking_guild_power_season_snapshots'::regclass
      and tgname='ranking_guild_power_snapshot_immutable' and not tgisinternal) then
    raise exception 'immutable final snapshot trigger is missing';
  end if;
end;
$$;
