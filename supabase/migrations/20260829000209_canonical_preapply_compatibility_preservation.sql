begin;

-- Preserve unresolved patrol encounters and already-earned legacy mission
-- rewards before the 2026-08-30 canonical masters replace their authorities.
-- Every operation is transactional: a single unresolvable patrol or reward
-- mismatch aborts the migration without consuming any entitlement.

lock table public.user_patrols in access exclusive mode;
lock table public.user_missions in access exclusive mode;
lock table public.presents in access exclusive mode;

alter table public.user_patrols
  add column if not exists encounter_snapshot jsonb,
  add column if not exists encounter_party_signature text;

alter table public.presents
  add column if not exists source_kind text,
  add column if not exists source_key text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists presents_authoritative_source_once_uidx
  on public.presents(user_id, source_kind, source_key)
  where source_kind is not null and source_key is not null;

create table if not exists public.canonical_preapply_compatibility_audit (
  audit_key text primary key,
  patrol_rows_preserved integer not null,
  mission_entitlements_before integer not null,
  mission_entitlements_preserved integer not null,
  mission_entitlements_unmigrated integer not null,
  reward_quantity_before bigint not null,
  reward_quantity_preserved bigint not null,
  cash_before bigint not null,
  cash_preserved bigint not null,
  reward_breakdown_before jsonb not null,
  reward_breakdown_preserved jsonb not null,
  completed_at timestamptz not null default clock_timestamp()
);

alter table public.canonical_preapply_compatibility_audit enable row level security;
revoke all on public.canonical_preapply_compatibility_audit from public, anon, authenticated;

do $$
declare
  v_patrol record;
  v_members jsonb;
  v_signature text;
  v_replay_members jsonb;
  v_enemy_tactic text;
  v_patrol_count integer := 0;
  v_orphan_clear_count integer;
  v_before_count integer;
  v_after_count integer;
  v_unmigrated_count integer;
  v_before_quantity bigint;
  v_after_quantity bigint;
  v_before_cash bigint;
  v_after_cash bigint;
  v_before_breakdown jsonb;
  v_after_breakdown jsonb;
begin
  -- The old fixed encounter RPC is the existing Runtime Authority. Do not use
  -- the new random generator here and do not impose the new five-member rule.
  for v_patrol in
    select patrol.id,
           coalesce(patrol.course_id, patrol.quest_id) as quest_id,
           encounter.enemy_tactic
    from public.user_patrols patrol
    left join public.canonical_quest_master quest
      on quest.version = '2026-08-22'
     and quest.quest_id = coalesce(patrol.course_id, patrol.quest_id)
     and quest.is_production_enabled
    left join public.canonical_quest_encounter_master encounter
      on encounter.version = quest.version
     and encounter.encounter_id = quest.enemy_encounter_id
     and encounter.is_production_enabled
    where patrol.has_battle_event
      and not coalesce(patrol.battle_resolved, false)
      and patrol.encounter_snapshot is null
    order by patrol.id
    for update of patrol
  loop
    if v_patrol.quest_id is null or v_patrol.enemy_tactic is null then
      raise exception 'UNRESOLVABLE_LEGACY_PATROL patrol_id=% quest_id=%',
        v_patrol.id, v_patrol.quest_id;
    end if;

    -- An already-created authoritative Battle Replay is stronger evidence than
    -- regenerating the old fixed master snapshot (tutorial Patrols can share a
    -- legacy course ID while using a dedicated replay encounter).
    v_replay_members := null;
    v_enemy_tactic := v_patrol.enemy_tactic;
    select replay.enemy_snapshot,
           coalesce(replay.enemy_tactic_id, v_patrol.enemy_tactic)
      into v_replay_members, v_enemy_tactic
    from public.battle_replay_sessions replay
    where replay.battle_mode = 'QUEST'
      and replay.source_reference_id = v_patrol.id
      and replay.resolution_authority = 'PATROL_SERVER'
    order by replay.created_at desc
    limit 1;

    v_members := coalesce(
      v_replay_members,
      public.canonical_quest_enemy_snapshot(v_patrol.quest_id)
    );
    if v_members is null
       or jsonb_typeof(v_members) <> 'array'
       or jsonb_array_length(v_members) = 0 then
      raise exception 'UNRESOLVABLE_LEGACY_PATROL_SNAPSHOT patrol_id=% quest_id=%',
        v_patrol.id, v_patrol.quest_id;
    end if;

    select string_agg(
             coalesce(member.value->>'characterId', member.value->>'id'),
             '|' order by coalesce(member.value->>'characterId', member.value->>'id')
           )
      into v_signature
    from jsonb_array_elements(v_members) member(value);

    if v_signature is null then
      raise exception 'UNRESOLVABLE_LEGACY_PATROL_SIGNATURE patrol_id=% quest_id=%',
        v_patrol.id, v_patrol.quest_id;
    end if;

    update public.user_patrols
    set encounter_snapshot = jsonb_build_object(
          'members', v_members,
          'partySignature', v_signature,
          'enemyTactic', v_enemy_tactic
        ),
        encounter_party_signature = v_signature
    where id = v_patrol.id;

    v_patrol_count := v_patrol_count + 1;
  end loop;

  if exists (
    select 1
    from public.user_patrols
    where has_battle_event
      and not coalesce(battle_resolved, false)
      and encounter_snapshot is null
  ) then
    raise exception 'LEGACY_PATROL_SNAPSHOT_BACKFILL_INCOMPLETE';
  end if;

  select count(*) into v_orphan_clear_count
  from public.user_missions progress
  left join public.missions master on master.id = progress.mission_id
  where progress.status = 'CLEAR' and master.id is null;

  if v_orphan_clear_count <> 0 then
    raise exception 'ORPHAN_LEGACY_MISSION_ENTITLEMENT count=%', v_orphan_clear_count;
  end if;

  select count(*),
         coalesce(sum(master.reward_quantity), 0),
         coalesce(sum(master.reward_quantity) filter (where master.reward_item_id = 'CASH'), 0)
    into v_before_count, v_before_quantity, v_before_cash
  from public.user_missions progress
  join public.missions master on master.id = progress.mission_id
  where progress.status = 'CLEAR';

  select coalesce(jsonb_object_agg(reward_item_id, payload order by reward_item_id), '{}'::jsonb)
    into v_before_breakdown
  from (
    select master.reward_item_id,
           jsonb_build_object(
             'entitlements', count(*),
             'quantity', sum(master.reward_quantity)
           ) as payload
    from public.user_missions progress
    join public.missions master on master.id = progress.mission_id
    where progress.status = 'CLEAR'
    group by master.reward_item_id
  ) grouped;

  insert into public.presents(
    user_id, item_id, quantity, message, status, sent_at, expire_at,
    source_kind, source_key, source_metadata
  )
  select progress.user_id,
         master.reward_item_id,
         master.reward_quantity,
         '旧ミッション達成報酬: ' || master.title,
         'UNCLAIMED',
         clock_timestamp(),
         null,
         'LEGACY_MISSION_ENTITLEMENT',
         progress.id::text,
         jsonb_build_object(
           'sourceMissionId', progress.mission_id,
           'sourceUserMissionId', progress.id,
           'originalRewardItemId', master.reward_item_id,
           'originalRewardQuantity', master.reward_quantity
         )
  from public.user_missions progress
  join public.missions master on master.id = progress.mission_id
  where progress.status = 'CLEAR'
  on conflict (user_id, source_kind, source_key)
    where source_kind is not null and source_key is not null
  do nothing;

  select count(*),
         coalesce(sum(present.quantity), 0),
         coalesce(sum(present.quantity) filter (where present.item_id = 'CASH'), 0)
    into v_after_count, v_after_quantity, v_after_cash
  from public.presents present
  where present.source_kind = 'LEGACY_MISSION_ENTITLEMENT';

  select coalesce(jsonb_object_agg(item_id, payload order by item_id), '{}'::jsonb)
    into v_after_breakdown
  from (
    select present.item_id,
           jsonb_build_object(
             'entitlements', count(*),
             'quantity', sum(present.quantity)
           ) as payload
    from public.presents present
    where present.source_kind = 'LEGACY_MISSION_ENTITLEMENT'
    group by present.item_id
  ) grouped;

  select count(*) into v_unmigrated_count
  from public.user_missions progress
  where progress.status = 'CLEAR'
    and not exists (
      select 1
      from public.presents present
      where present.user_id = progress.user_id
        and present.source_kind = 'LEGACY_MISSION_ENTITLEMENT'
        and present.source_key = progress.id::text
    );

  if v_before_count <> v_after_count
     or v_before_quantity <> v_after_quantity
     or v_before_cash <> v_after_cash
     or v_before_breakdown <> v_after_breakdown
     or v_unmigrated_count <> 0 then
    raise exception
      'LEGACY_MISSION_ECONOMY_CONSERVATION_FAILED before_count=% after_count=% before_qty=% after_qty=% before_cash=% after_cash=% unmigrated=%',
      v_before_count, v_after_count, v_before_quantity, v_after_quantity,
      v_before_cash, v_after_cash, v_unmigrated_count;
  end if;

  -- Avoid legacy mission-chain side effects while retiring only the rows whose
  -- Presents have been durably created and verified in this transaction.
  alter table public.user_missions disable trigger user;
  update public.user_missions progress
  set status = 'CLAIMED',
      claimed_at = coalesce(progress.claimed_at, clock_timestamp()),
      updated_at = clock_timestamp()
  where progress.status = 'CLEAR'
    and exists (
      select 1
      from public.presents present
      where present.user_id = progress.user_id
        and present.source_kind = 'LEGACY_MISSION_ENTITLEMENT'
        and present.source_key = progress.id::text
    );
  alter table public.user_missions enable trigger user;

  insert into public.canonical_preapply_compatibility_audit(
    audit_key, patrol_rows_preserved,
    mission_entitlements_before, mission_entitlements_preserved,
    mission_entitlements_unmigrated,
    reward_quantity_before, reward_quantity_preserved,
    cash_before, cash_preserved,
    reward_breakdown_before, reward_breakdown_preserved
  ) values (
    '20260829_CANONICAL_PREAPPLY', v_patrol_count,
    v_before_count, v_after_count, v_unmigrated_count,
    v_before_quantity, v_after_quantity,
    v_before_cash, v_after_cash,
    v_before_breakdown, v_after_breakdown
  )
  on conflict (audit_key) do update set
    patrol_rows_preserved = excluded.patrol_rows_preserved,
    mission_entitlements_before = excluded.mission_entitlements_before,
    mission_entitlements_preserved = excluded.mission_entitlements_preserved,
    mission_entitlements_unmigrated = excluded.mission_entitlements_unmigrated,
    reward_quantity_before = excluded.reward_quantity_before,
    reward_quantity_preserved = excluded.reward_quantity_preserved,
    cash_before = excluded.cash_before,
    cash_preserved = excluded.cash_preserved,
    reward_breakdown_before = excluded.reward_breakdown_before,
    reward_breakdown_preserved = excluded.reward_breakdown_preserved,
    completed_at = clock_timestamp();
end
$$;

commit;
notify pgrst, 'reload schema';
