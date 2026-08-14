-- Open Beta M1: expose only the encounter assigned to the caller's patrol.
-- This avoids granting clients unrestricted access to the full NPC master.

create or replace function public.get_patrol_battle_enemy(p_patrol_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_enemy record;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select npc.id, npc.quest_id, npc.npc_name, npc.npc_level,
         npc.encounter_rate, npc.enemy_data
  into v_enemy
  from public.user_patrols patrol
  join public.patrol_npcs npc
    on npc.quest_id = coalesce(patrol.course_id, patrol.quest_id)
  where patrol.id = p_patrol_id
    and patrol.user_id = v_user_id
    and patrol.status = 'CLAIMABLE'
    and patrol.has_battle_event = true
    and coalesce(patrol.battle_resolved, false) = false
  order by npc.id
  limit 1;

  if not found then
    raise exception 'eligible patrol encounter not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_enemy.id,
    'quest_id', v_enemy.quest_id,
    'npc_name', v_enemy.npc_name,
    'npc_level', v_enemy.npc_level,
    'encounter_rate', v_enemy.encounter_rate,
    'enemy_data', coalesce(v_enemy.enemy_data, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_patrol_battle_enemy(uuid) from public;
revoke all on function public.get_patrol_battle_enemy(uuid) from anon;
grant execute on function public.get_patrol_battle_enemy(uuid) to authenticated;

notify pgrst, 'reload schema';
