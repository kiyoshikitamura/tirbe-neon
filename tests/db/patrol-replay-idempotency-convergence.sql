\set ON_ERROR_STOP on
begin;

insert into public.users(id,username)
values('11000000-0000-4000-8000-000000000001','patrol');

insert into public.user_characters(id,user_id,character_id,level) values
 ('12000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','char_ageha_01',7),
 ('12000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','char_gou_01',1),
 ('12000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001','char_kenji_01',1),
 ('12000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000001','char_masato_01',1),
 ('12000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000001','char_naoto_01',1);

insert into public.pvp_defense_decks(
  user_id,character_1_id,character_2_id,character_3_id,character_4_id,character_5_id
) values(
  '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002',
  '12000000-0000-4000-8000-000000000003',
  '12000000-0000-4000-8000-000000000004',
  '12000000-0000-4000-8000-000000000005'
);

insert into public.user_patrols(
  id,user_id,course_id,quest_id,character_id,status,has_battle_event,battle_resolved,expires_at
) values(
  '13000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  'q_shinjuku_1','q_shinjuku_1','char_ageha_01','CLAIMABLE',true,false,now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);

do $$
declare
  v_first jsonb;
  v_retry jsonb;
  v_resolved_retry jsonb;
  v_count integer;
begin
  v_first:=public.create_patrol_battle_replay(
    '13000000-0000-4000-8000-000000000001','ATTACK_PRIORITY'
  );
  v_retry:=public.create_patrol_battle_replay(
    '13000000-0000-4000-8000-000000000001','ATTACK_PRIORITY'
  );
  if v_first->>'replay_session_id' is distinct from v_retry->>'replay_session_id' then
    raise exception 'duplicate retry created a second replay';
  end if;

  update public.battle_replay_sessions set status='RESOLVED'
  where id=(v_first->>'replay_session_id')::uuid;
  v_resolved_retry:=public.create_patrol_battle_replay(
    '13000000-0000-4000-8000-000000000001','ATTACK_PRIORITY'
  );
  if v_first->>'replay_session_id' is distinct from v_resolved_retry->>'replay_session_id' then
    raise exception 'resolved retry created a second replay';
  end if;

  select count(*) into v_count
  from public.battle_replay_sessions
  where requester_user_id='11000000-0000-4000-8000-000000000001'
    and battle_mode='QUEST'
    and source_reference_id='13000000-0000-4000-8000-000000000001';
  if v_count<>1 then
    raise exception 'expected one patrol replay, got %',v_count;
  end if;
end $$;

reset role;
rollback;
