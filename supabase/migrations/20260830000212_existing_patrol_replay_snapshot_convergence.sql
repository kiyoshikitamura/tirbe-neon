begin;

-- Compatibility migration 209 initially backfilled every unresolved Patrol
-- from the old fixed encounter RPC. A Patrol with an already-created official
-- replay has a stronger, immutable authority (notably the tutorial encounter).
-- Converge only those existing rows to their recorded replay without rerolling.
with authoritative_replay as (
  select distinct on (replay.source_reference_id)
         replay.source_reference_id as patrol_id,
         replay.enemy_snapshot,
         replay.enemy_tactic_id
  from public.battle_replay_sessions replay
  join public.user_patrols patrol on patrol.id = replay.source_reference_id
  where replay.battle_mode = 'QUEST'
    and replay.resolution_authority = 'PATROL_SERVER'
    and patrol.has_battle_event
    and not coalesce(patrol.battle_resolved, false)
  order by replay.source_reference_id, replay.created_at desc
), normalized as (
  select authority.patrol_id,
         authority.enemy_snapshot,
         coalesce(
           (
             select string_agg(
               coalesce(member.value->>'characterId', member.value->>'id'),
               '|' order by coalesce(member.value->>'characterId', member.value->>'id')
             )
             from jsonb_array_elements(authority.enemy_snapshot) member(value)
           ),
           ''
         ) as party_signature,
         coalesce(authority.enemy_tactic_id, 'BALANCED') as enemy_tactic
  from authoritative_replay authority
  where authority.enemy_snapshot is not null
    and jsonb_typeof(authority.enemy_snapshot) = 'array'
    and jsonb_array_length(authority.enemy_snapshot) > 0
)
update public.user_patrols patrol
set encounter_snapshot = jsonb_build_object(
      'members', normalized.enemy_snapshot,
      'partySignature', normalized.party_signature,
      'enemyTactic', normalized.enemy_tactic
    ),
    encounter_party_signature = normalized.party_signature
from normalized
where patrol.id = normalized.patrol_id
  and patrol.encounter_snapshot->'members' is distinct from normalized.enemy_snapshot;

do $$
begin
  if exists (
    select 1
    from public.user_patrols patrol
    join public.battle_replay_sessions replay
      on replay.source_reference_id = patrol.id
     and replay.battle_mode = 'QUEST'
     and replay.resolution_authority = 'PATROL_SERVER'
    where patrol.has_battle_event
      and not coalesce(patrol.battle_resolved, false)
      and patrol.encounter_snapshot->'members' is distinct from replay.enemy_snapshot
  ) then
    raise exception 'EXISTING_PATROL_REPLAY_SNAPSHOT_PARITY_FAILED';
  end if;
end
$$;

commit;
notify pgrst, 'reload schema';
