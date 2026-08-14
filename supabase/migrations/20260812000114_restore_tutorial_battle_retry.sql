-- Open Beta M1: recover tutorial patrols incorrectly finalized by a defeat.
-- Future defeats remain unresolved in the client so they can be retried free.

update public.user_patrols patrol
set has_battle_event = true,
    battle_resolved = false,
    battle_result = null
from public.tutorial_progress progress
where progress.user_id = patrol.user_id
  and progress.step_id = 'TUTORIAL_BATTLE'
  and coalesce(patrol.course_id, patrol.quest_id) = 'q_shinjuku_1'
  and patrol.status = 'CLAIMABLE';

notify pgrst, 'reload schema';
