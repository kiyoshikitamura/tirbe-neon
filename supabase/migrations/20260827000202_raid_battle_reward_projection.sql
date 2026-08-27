begin;

create or replace function public.get_current_raid_battle_rewards(p_replay_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_replay public.battle_replay_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_replay
  from public.battle_replay_sessions
  where id = p_replay_id
    and requester_user_id = v_user_id
    and battle_mode = 'RAID'
    and finalization_status = 'FINALIZED';

  if not found then
    raise exception 'finalized Raid replay not found' using errcode = 'P0002';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'itemId', grant_row.item_id,
      'quantity', grant_row.quantity
    ) order by grant_row.item_id)
    from public.raid_production_reward_grants grant_row
    where grant_row.raid_boss_instance_id = v_replay.source_reference_id
      and grant_row.user_id = v_user_id
      and grant_row.granted_at = v_replay.finalized_at
  ), '[]'::jsonb);
end
$$;

revoke all on function public.get_current_raid_battle_rewards(uuid) from public, anon;
grant execute on function public.get_current_raid_battle_rewards(uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
