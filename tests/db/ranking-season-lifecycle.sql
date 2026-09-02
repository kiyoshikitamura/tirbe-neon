begin;
do $$
declare v_first uuid; v_repeat uuid; v_next uuid; v_window record;
begin
  v_first:=public.ensure_current_ranking_season('RAID','2026-09-02 00:00:00+00');
  v_repeat:=public.ensure_current_ranking_season('RAID','2026-09-02 00:00:00+00');
  if v_first<>v_repeat then raise exception 'RAID ensure is not idempotent'; end if;
  select * into v_window from public.ranking_period_bounds('RAID','2026-09-06 14:59:59+00');
  if v_window.starts_at<>'2026-08-30 15:00:00+00'::timestamptz or v_window.ends_at<>'2026-09-06 15:00:00+00'::timestamptz then raise exception 'RAID JST boundary invalid'; end if;
  v_next:=public.ensure_current_ranking_season('RAID','2026-09-06 15:00:00+00');
  if v_next=v_first then raise exception 'RAID weekly rollover failed'; end if;
  if exists(select 1 from public.ranking_seasons where id=v_first and status='ACTIVE') then raise exception 'expired RAID season remained active'; end if;
  select * into v_window from public.ranking_period_bounds('PVP','2026-09-02 00:00:00+00');
  if v_window.starts_at<>'2026-08-31 15:00:00+00'::timestamptz or v_window.ends_at<>'2026-09-30 15:00:00+00'::timestamptz then raise exception 'PVP JST boundary invalid'; end if;
end;
$$;
rollback;
