-- M9-X P0: one canonical replay per official patrol encounter.
-- Concurrent/retried starts are serialized by patrol id and return the
-- existing server snapshot instead of creating a second replay.

begin;

do $migration$
declare
  v_definition text;
  v_updated text;
  v_needle text := $needle$  if p_tactic_id not in ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') then
    raise exception 'invalid tactic' using errcode = '22023';
  end if;

  select patrol.*, npc.id as npc_id, npc.npc_name, npc.enemy_data$needle$;
  v_replacement text := $replacement$  if p_tactic_id not in ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') then
    raise exception 'invalid tactic' using errcode = '22023';
  end if;

  -- The browser can retry after a lost response and a remount can race a
  -- second start. Serialize by encounter before checking/creating the replay.
  perform pg_advisory_xact_lock(hashtextextended(p_patrol_id::text, 0));

  select replay.id, replay.player_snapshot, replay.enemy_snapshot
  into v_replay_id, v_player_snapshot, v_enemy_snapshot
  from public.battle_replay_sessions replay
  where replay.requester_user_id = v_user_id
    and replay.battle_mode = 'QUEST'
    and replay.resolution_authority = 'PATROL_SERVER'
    and replay.source_reference_id = p_patrol_id
    and replay.status in ('PENDING', 'RESOLVED')
  order by replay.created_at, replay.id
  limit 1;

  if found then
    return jsonb_build_object(
      'replay_session_id', v_replay_id,
      'player_snapshot', v_player_snapshot,
      'enemy_snapshot', v_enemy_snapshot
    );
  end if;

  select patrol.*, npc.id as npc_id, npc.npc_name, npc.enemy_data$replacement$;
begin
  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)'))
  into v_definition;
  if v_definition is null then
    raise exception 'create_patrol_battle_replay(uuid,text) is required' using errcode = 'P0002';
  end if;
  -- Functions created from Windows migration files can retain CRLF inside
  -- their quoted PL/pgSQL body. Normalize both the stored function and this
  -- migration's dollar-quoted literals before applying the audited patch.
  v_definition := replace(v_definition, chr(13), '');
  v_needle := replace(v_needle, chr(13), '');
  v_replacement := replace(v_replacement, chr(13), '');
  if position(v_needle in v_definition) = 0 then
    raise exception 'patrol replay function does not match the expected canonical definition';
  end if;
  v_updated := replace(v_definition, v_needle, v_replacement);
  execute v_updated;
end;
$migration$;

revoke all on function public.create_patrol_battle_replay(uuid, text) from public, anon;
grant execute on function public.create_patrol_battle_replay(uuid, text) to authenticated;

commit;

notify pgrst, 'reload schema';
