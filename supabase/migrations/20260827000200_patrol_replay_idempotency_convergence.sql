-- Forward-only convergence for the Quest Gameplay v2 patrol replay function.
-- Migration 00185 replaced the function after 00167, and 00195 subsequently
-- reattached tutorial enemy shaping. Preserve that latest gameplay contract
-- while restoring the already-approved one-replay-per-patrol semantic.

begin;

do $migration$
declare
  v_definition text;
  v_updated text;
  v_needle text := $needle$ if p_tactic_id not in ('ATTACK_PRIORITY','HEAL_PRIORITY','SKILL_PRIORITY','BALANCED','WEAKNESS_FOCUS') then raise exception 'invalid tactic' using errcode='22023'; end if;
 select patrol.*,encounter.enemy_tactic,jsonb_array_length(encounter.members) expected_members into v_patrol$needle$;
  v_replacement text := $replacement$ if p_tactic_id not in ('ATTACK_PRIORITY','HEAL_PRIORITY','SKILL_PRIORITY','BALANCED','WEAKNESS_FOCUS') then raise exception 'invalid tactic' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_patrol_id::text,0));
 select replay.id,replay.player_snapshot,replay.enemy_snapshot into v_replay,v_player,v_enemy
 from public.battle_replay_sessions replay
 where replay.requester_user_id=v_uid and replay.battle_mode='QUEST'
   and replay.resolution_authority='PATROL_SERVER' and replay.source_reference_id=p_patrol_id
   and replay.status in ('PENDING','RESOLVED')
 order by replay.created_at,replay.id limit 1;
 if found then return jsonb_build_object('replay_session_id',v_replay,'player_snapshot',v_player,'enemy_snapshot',v_enemy); end if;
 select patrol.*,encounter.enemy_tactic,jsonb_array_length(encounter.members) expected_members into v_patrol$replacement$;
begin
  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)'))
  into v_definition;
  if v_definition is null then
    raise exception 'create_patrol_battle_replay(uuid,text) is required' using errcode='P0002';
  end if;

  v_definition := replace(v_definition,chr(13),'');
  v_needle := replace(v_needle,chr(13),'');
  v_replacement := replace(v_replacement,chr(13),'');

  if position(v_replacement in v_definition)>0 then
    return;
  end if;
  if position(v_needle in v_definition)=0
     or position('public.canonical_quest_enemy_snapshot' in v_definition)=0
     or position('apply_tutorial_enemy_snapshot' in v_definition)=0
     or position('enemy_tactic_id,random_seed,player_snapshot,enemy_snapshot,resolution_authority)' in v_definition)=0 then
    raise exception 'latest patrol replay function does not match the known canonical definition';
  end if;

  v_updated:=replace(v_definition,v_needle,v_replacement);
  execute v_updated;
end;
$migration$;

revoke all on function public.create_patrol_battle_replay(uuid,text) from public,anon;
grant execute on function public.create_patrol_battle_replay(uuid,text) to authenticated;

commit;
notify pgrst,'reload schema';
