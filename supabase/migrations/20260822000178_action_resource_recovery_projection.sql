-- Phase B2 follow-up: expose authoritative next-recovery timestamps to functional UI.

begin;

create or replace function public.sync_and_recover_vitality_and_pvp_points(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user public.users%rowtype; v_now timestamptz:=now(); v_vit_steps integer; v_pvp_steps integer; v_raid_steps integer;
 v_vit integer; v_pvp integer; v_raid integer; v_vit_at timestamptz; v_pvp_at timestamptz; v_raid_at timestamptz;
begin
 if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'not authorized' using errcode='42501'; end if;
 select * into v_user from public.users where id=p_user_id for update;
 if not found then raise exception 'user not found' using errcode='P0002'; end if;
 v_vit:=least(500,greatest(0,v_user.vitality)); v_pvp:=least(5,greatest(0,v_user.pvp_points)); v_raid:=least(5,greatest(0,v_user.raid_points));
 v_vit_at:=v_user.vitality_last_recovered_at; v_pvp_at:=v_user.pvp_points_last_recovered_at; v_raid_at:=v_user.raid_points_last_recovered_at;
 if v_vit<100 then
  v_vit_steps:=greatest(0,floor(extract(epoch from(v_now-coalesce(v_vit_at,v_now)))/360));
  v_vit:=least(100,v_vit+v_vit_steps);
  if v_vit_steps>0 then v_vit_at:=case when v_vit=100 then v_now else v_vit_at+(v_vit_steps*interval '360 seconds') end; end if;
 end if;
 if v_pvp<5 then
  v_pvp_steps:=greatest(0,floor(extract(epoch from(v_now-coalesce(v_pvp_at,v_now)))/7200));
  v_pvp:=least(5,v_pvp+v_pvp_steps);
  if v_pvp_steps>0 then v_pvp_at:=case when v_pvp=5 then v_now else v_pvp_at+(v_pvp_steps*interval '7200 seconds') end; end if;
 end if;
 if v_raid<5 then
  v_raid_steps:=greatest(0,floor(extract(epoch from(v_now-coalesce(v_raid_at,v_now)))/7200));
  v_raid:=least(5,v_raid+v_raid_steps);
  if v_raid_steps>0 then v_raid_at:=case when v_raid=5 then v_now else v_raid_at+(v_raid_steps*interval '7200 seconds') end; end if;
 end if;
 update public.users set vitality=v_vit,vitality_last_recovered_at=v_vit_at,pvp_points=v_pvp,pvp_points_last_recovered_at=v_pvp_at,
  raid_points=v_raid,raid_points_last_recovered_at=v_raid_at where id=p_user_id;
 return jsonb_build_object('out_vitality',v_vit,'out_pvp_points',v_pvp,'out_raid_points',v_raid,
  'out_cash',v_user.cash,'out_diamonds',v_user.neon_diamonds,'raid_first_entry_free',not v_user.raid_free_entry_consumed,
  'vitality_next_recovery_at',case when v_vit<100 then v_vit_at+interval '360 seconds' else null end,
  'pvp_next_recovery_at',case when v_pvp<5 then v_pvp_at+interval '7200 seconds' else null end,
  'raid_next_recovery_at',case when v_raid<5 then v_raid_at+interval '7200 seconds' else null end);
end $$;

revoke all on function public.sync_and_recover_vitality_and_pvp_points(uuid) from public,anon;
grant execute on function public.sync_and_recover_vitality_and_pvp_points(uuid) to authenticated;

commit;
notify pgrst,'reload schema';
