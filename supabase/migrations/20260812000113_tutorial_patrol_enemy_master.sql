-- Open Beta M1: guarantee that the specified tutorial patrol has an enemy.
-- No visual asset is coupled to this row; the battle UI keeps using its
-- existing placeholder presentation until the art asset is supplied.

insert into public.patrol_npcs (
  id,
  quest_id,
  npc_name,
  npc_level,
  encounter_rate,
  enemy_data
)
values (
  'tutorial_shinjuku_outlaw',
  'q_shinjuku_1',
  '歌舞伎町のならず者',
  1,
  0.2,
  jsonb_build_object(
    'hp', 300,
    'atk', 20,
    'def', 10,
    'spd', 50,
    'luk', 0,
    'skills', jsonb_build_array(
      jsonb_build_object(
        'id', 'tutorial_npc_attack',
        'name', '攻撃',
        'ap_cost', 1,
        'power', 30,
        'effect_type', 'ATTACK'
      )
    )
  )
)
on conflict (id) do update
set quest_id = excluded.quest_id,
    npc_name = excluded.npc_name,
    npc_level = excluded.npc_level,
    encounter_rate = excluded.encounter_rate,
    enemy_data = excluded.enemy_data;

-- Recover users who reached the battle step while the enemy master was absent.
update public.user_patrols patrol
set has_battle_event = true,
    battle_resolved = false
from public.tutorial_progress progress
where progress.user_id = patrol.user_id
  and progress.step_id = 'TUTORIAL_BATTLE'
  and coalesce(patrol.course_id, patrol.quest_id) = 'q_shinjuku_1'
  and patrol.status = 'CLAIMABLE'
  and not coalesce(patrol.battle_resolved, false);

notify pgrst, 'reload schema';
