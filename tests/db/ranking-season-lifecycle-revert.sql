begin;
do $$
begin
  if to_regprocedure('public.ensure_current_ranking_season(text,timestamp with time zone)') is not null then raise exception 'automatic ensure still exists'; end if;
  if public.current_ranking_season_id('PVP','2026-08-15 00:00:00+00')<>'90106a5f-ec9b-415f-98d0-754a525c1eb7'::uuid then raise exception 'PVP pre-state lookup differs'; end if;
  if public.current_ranking_season_id('RAID','2026-08-15 00:00:00+00')<>'2828d27e-ebfd-4005-ba3b-0d618618c286'::uuid then raise exception 'RAID pre-state lookup differs'; end if;
end;
$$;
rollback;
