-- Pre-Phase 1: current-generation gameplay reset authority.
-- Account identity, social, payment, claim, competitive, and audit history are
-- intentionally outside the reset set.

begin;

-- Current-schema convergence. These definitions are reproduced from the
-- development baseline and hardened to the current server-authoritative
-- purchase contract.
create table if not exists public.user_shop_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id text not null,
  purchase_count integer not null default 1 check (purchase_count > 0),
  last_purchased_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, product_id)
);
create index if not exists user_shop_purchases_user_idx
  on public.user_shop_purchases(user_id);
alter table public.user_shop_purchases enable row level security;
drop policy if exists "Users can view their own shop purchases" on public.user_shop_purchases;
create policy "Users can view their own shop purchases"
  on public.user_shop_purchases for select to authenticated
  using (user_id = auth.uid());
revoke all on public.user_shop_purchases from public, anon, authenticated;
grant select on public.user_shop_purchases to authenticated;
grant all on public.user_shop_purchases to service_role;

create table if not exists public.user_profile_decorations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  decoration_type varchar(32) not null,
  decoration_id varchar(64) not null,
  unlocked_at timestamptz default now(),
  constraint unique_user_decoration unique (user_id, decoration_type, decoration_id)
);
create index if not exists user_profile_decorations_user_idx
  on public.user_profile_decorations(user_id);
alter table public.user_profile_decorations enable row level security;
drop policy if exists "Users can view all user decorations" on public.user_profile_decorations;
drop policy if exists "Users can insert their own decorations" on public.user_profile_decorations;
create policy "Users can view all user decorations"
  on public.user_profile_decorations for select to authenticated using (true);
create policy "Users can insert their own decorations"
  on public.user_profile_decorations for insert to authenticated
  with check (user_id = auth.uid());
revoke all on public.user_profile_decorations from public, anon, authenticated;
grant select, insert on public.user_profile_decorations to authenticated;
grant all on public.user_profile_decorations to service_role;

-- initialize_current_player already writes shinjuku explicitly. Align the
-- column default so SET DEFAULT is the same current-generation authority.
alter table public.users alter column current_base_id set default 'shinjuku';

create table if not exists public.user_lifetime_onboarding_grants (
  user_id uuid primary key references public.users(id) on delete cascade,
  canonical_payload jsonb not null,
  source text not null,
  source_reference uuid,
  canonical_master_version text not null,
  first_granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint lifetime_onboarding_payload_object check (jsonb_typeof(canonical_payload) = 'object')
);
alter table public.user_lifetime_onboarding_grants enable row level security;
create policy "Read own lifetime onboarding grant"
  on public.user_lifetime_onboarding_grants for select to authenticated
  using (user_id = auth.uid());
revoke all on public.user_lifetime_onboarding_grants from public, anon, authenticated;
grant select on public.user_lifetime_onboarding_grants to authenticated;
grant all on public.user_lifetime_onboarding_grants to service_role;

create table if not exists public.gameplay_reset_requests (
  request_id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','COMPLETED')),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint gameplay_reset_completed_result check (
    (status = 'COMPLETED' and result is not null and completed_at is not null)
    or status = 'PENDING'
  )
);
create index if not exists gameplay_reset_requests_user_idx
  on public.gameplay_reset_requests(user_id, created_at desc);
alter table public.gameplay_reset_requests enable row level security;
create policy "Read own gameplay reset requests"
  on public.gameplay_reset_requests for select to authenticated
  using (user_id = auth.uid());
revoke all on public.gameplay_reset_requests from public, anon, authenticated;
grant select on public.gameplay_reset_requests to authenticated;
grant all on public.gameplay_reset_requests to service_role;

-- Captures the completed canonical tutorial once. It deliberately refuses
-- ambiguous legacy histories instead of inventing a grant.
create or replace function public.capture_current_lifetime_onboarding_grant(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_history public.gacha_execution_history%rowtype;
  v_history_count integer;
  v_results jsonb;
  v_guaranteed text;
  v_growth_level integer;
  v_formation jsonb;
  v_formation_count integer;
  v_leader text;
  v_leader_owned uuid;
  v_skill text;
begin
  if p_user_id is null or not exists(select 1 from public.users where id=p_user_id) then return false; end if;
  if exists(select 1 from public.user_lifetime_onboarding_grants where user_id=p_user_id) then return true; end if;

  select count(*) into v_history_count
  from public.gacha_execution_history h
  where h.user_id=p_user_id and h.status='COMPLETED'
    and coalesce((h.result_payload->>'tutorial')::boolean,false)
    and jsonb_array_length(coalesce(h.result_payload->'results','[]'::jsonb))=10;
  if v_history_count<>1 then return false; end if;

  select * into v_history from public.gacha_execution_history h
  where h.user_id=p_user_id and h.status='COMPLETED'
    and coalesce((h.result_payload->>'tutorial')::boolean,false)
    and jsonb_array_length(coalesce(h.result_payload->'results','[]'::jsonb))=10
  limit 1;
  v_results:=v_history.result_payload->'results';
  select result->>'character_id' into v_guaranteed
  from jsonb_array_elements(v_results) result
  where coalesce((result->>'tutorial_slot')::integer,0)=10
    and result->>'rarity'='SSR';
  if v_guaranteed is null then return false; end if;

  select id,level into v_leader_owned,v_growth_level
  from public.user_characters
  where user_id=p_user_id and character_id=v_guaranteed
  order by created_at,id limit 1;
  if v_leader_owned is null or coalesce(v_growth_level,0)<7 then return false; end if;

  select jsonb_agg(owned.character_id order by formation.slot),count(*)
    into v_formation,v_formation_count
  from public.user_main_formations formation
  join public.user_characters owned on owned.id=formation.user_character_id and owned.user_id=formation.user_id
  where formation.user_id=p_user_id;
  if v_formation_count<>5 then return false; end if;

  select favorite_character_id into v_leader from public.users where id=p_user_id;
  if v_leader is null or v_leader<>v_formation->>0 then return false; end if;
  select skill_card_id into v_skill from public.user_skills
  where user_id=p_user_id
    and (equipped_character_id=v_leader_owned::text or equipped_character_id=v_leader)
  order by slot_index nulls last,created_at,id limit 1;
  if v_skill is null then return false; end if;

  insert into public.user_lifetime_onboarding_grants(
    user_id,canonical_payload,source,source_reference,canonical_master_version,first_granted_at
  ) values (
    p_user_id,
    jsonb_build_object(
      'gacha_results',v_results,
      'guaranteed_ssr',v_guaranteed,
      'growth_target_character',v_guaranteed,
      'growth_target_level',7,
      'starter_skill',v_skill,
      'formation_character_ids',v_formation,
      'formation_order',jsonb_build_array(1,2,3,4,5),
      'leader_character',v_leader
    ),
    'TUTORIAL_CANONICAL_HISTORY',v_history.id,'2026-08-21',v_history.created_at
  ) on conflict(user_id) do nothing;
  return exists(select 1 from public.user_lifetime_onboarding_grants where user_id=p_user_id);
end;
$$;

create or replace function public.capture_lifetime_onboarding_grant_after_formation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.step_id='DISPATCH' and old.step_id is distinct from 'DISPATCH' then
    perform public.capture_current_lifetime_onboarding_grant(new.user_id);
  end if;
  return new;
end;
$$;
drop trigger if exists capture_lifetime_onboarding_grant_trigger on public.tutorial_progress;
create trigger capture_lifetime_onboarding_grant_trigger
after update of step_id on public.tutorial_progress
for each row execute function public.capture_lifetime_onboarding_grant_after_formation();

-- Only uniquely reconstructable current-generation users are backfilled.
do $$ declare v_user uuid;
begin
  for v_user in
    select progress.user_id from public.tutorial_progress progress
    where progress.step_id in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION')
  loop
    perform public.capture_current_lifetime_onboarding_grant(v_user);
  end loop;
end $$;

create or replace function public.current_gameplay_reset_eligibility(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_user_id is null or not exists(select 1 from public.users where id=p_user_id) then
    return jsonb_build_object('eligible',false,'reason','UNSUPPORTED');
  end if;
  if exists(select 1 from public.payment_transactions where user_id=p_user_id)
    or exists(select 1 from public.user_shop_purchases where user_id=p_user_id)
    or exists(select 1 from public.user_monthly_passes where user_id=p_user_id) then
    return jsonb_build_object('eligible',false,'reason','PAYMENT');
  end if;
  if exists(select 1 from public.guild_members where user_id=p_user_id)
    or exists(select 1 from public.guilds where leader_id=p_user_id) then
    return jsonb_build_object('eligible',false,'reason','GUILD');
  end if;
  if exists(select 1 from public.user_patrols where user_id=p_user_id and status<>'COMPLETED')
    or exists(select 1 from public.battle_replay_sessions where requester_user_id=p_user_id
      and (status='PENDING' or finalization_status='PENDING')) then
    return jsonb_build_object('eligible',false,'reason','ACTIVE_GAMEPLAY');
  end if;
  if not exists(select 1 from public.user_lifetime_onboarding_grants where user_id=p_user_id) then
    return jsonb_build_object('eligible',false,'reason','UNSUPPORTED');
  end if;
  return jsonb_build_object('eligible',true,'reason',null);
end;
$$;

create or replace function public.check_current_gameplay_reset_eligibility()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();
begin
  if v_user_id is null then return jsonb_build_object('eligible',false,'reason','AUTHENTICATION'); end if;
  return public.current_gameplay_reset_eligibility(v_user_id);
end;
$$;

create or replace function public.reset_current_gameplay(p_request_id uuid,p_acknowledged boolean)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_request public.gameplay_reset_requests%rowtype;
  v_eligibility jsonb;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'request_id is required' using errcode='22023'; end if;
  if p_acknowledged is distinct from true then raise exception 'reset acknowledgement is required' using errcode='22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended('gameplay-reset:'||v_user_id::text,0));
  perform 1 from public.users where id=v_user_id for update;
  if not found then raise exception 'player profile is required' using errcode='P0002'; end if;

  select * into v_request from public.gameplay_reset_requests where request_id=p_request_id for update;
  if found then
    if v_request.user_id<>v_user_id then raise exception 'request_id belongs to another user' using errcode='42501'; end if;
    if v_request.status='COMPLETED' then return v_request.result; end if;
    raise exception 'reset request is already in progress' using errcode='55000';
  end if;

  v_eligibility:=public.current_gameplay_reset_eligibility(v_user_id);
  if not coalesce((v_eligibility->>'eligible')::boolean,false) then
    return jsonb_build_object('status','not_resettable','reason',v_eligibility->>'reason');
  end if;

  insert into public.gameplay_reset_requests(request_id,user_id) values(p_request_id,v_user_id);

  delete from public.user_main_formations where user_id=v_user_id;
  delete from public.pvp_defense_decks where user_id=v_user_id;
  delete from public.gvg_defense_decks where user_id=v_user_id;
  update public.user_skills set equipped_character_id=null,slot_index=null where user_id=v_user_id;
  update public.user_equipments set equipped_character_id=null,slot_index=null where user_id=v_user_id;
  update public.users set favorite_character_id=null where id=v_user_id;
  delete from public.user_skills where user_id=v_user_id;
  delete from public.user_equipments where user_id=v_user_id;
  delete from public.user_characters where user_id=v_user_id;
  delete from public.user_items where user_id=v_user_id;
  update public.user_missions set current_progress=0,updated_at=now()
    where user_id=v_user_id and status='PROGRESS';
  delete from public.user_power_rankings where user_id=v_user_id;

  update public.users set
    level=default,xp=default,cash=default,neon_diamonds=default,diamonds=default,
    vitality=default,vitality_last_recovered_at=default,
    pvp_points=default,pvp_points_last_recovered_at=default,
    raid_points=default,raid_points_last_recovered_at=default,raid_free_entry_consumed=default,
    daily_cash_skips_count=default,daily_cash_skips_reset_date=default,
    quest_free_skips_count=default,quest_paid_skips_count=default,quest_skips_reset_date=default,
    current_base_id=default,favorite_character_id=null
  where id=v_user_id;

  insert into public.tutorial_progress(user_id,step_id,updated_at,completed_at)
  values(v_user_id,'WORLD_INTRO',now(),null)
  on conflict(user_id) do update set step_id='WORLD_INTRO',updated_at=now(),completed_at=null;

  v_result:=jsonb_build_object('status','success','tutorial_step','WORLD_INTRO','request_id',p_request_id);
  update public.gameplay_reset_requests
    set status='COMPLETED',result=v_result,completed_at=now()
    where request_id=p_request_id and user_id=v_user_id;
  return v_result;
end;
$$;

-- Replay the immutable tutorial draw after a reset. For a first-ever tutorial,
-- the existing canonical draw path is unchanged.
create or replace function public.execute_tutorial_character_gacha(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_history record; v_existing record; v_grant jsonb;
  v_results jsonb:='[]'::jsonb; v_response jsonb; v_item_id text; v_rarity text;
  v_index integer; v_inserted integer; v_progress jsonb; v_saved_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'request_id is required' using errcode='22023'; end if;
  if not exists(select 1 from public.tutorial_progress where user_id=v_user_id and step_id='FREE_GACHA') then
    raise exception 'tutorial gacha is unavailable' using errcode='42501';
  end if;
  select canonical_payload into v_grant from public.user_lifetime_onboarding_grants where user_id=v_user_id;
  if v_grant is not null and jsonb_array_length(coalesce(v_grant->'gacha_results','[]'::jsonb))<>10 then
    raise exception 'lifetime tutorial grant is invalid' using errcode='23514';
  end if;

  insert into public.gacha_execution_history(user_id,request_id,gacha_id,payment_source,pull_count,cost_amount,pity_before,pity_after)
  values(v_user_id,p_request_id,'CHAR_NORMAL','free',10,0,0,0) on conflict(user_id,request_id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_history from public.gacha_execution_history where user_id=v_user_id and request_id=p_request_id for update;
    if v_history.gacha_id<>'CHAR_NORMAL' or v_history.pull_count<>10 then raise exception 'request_id was already used for a different request'; end if;
    if v_history.status='COMPLETED' and v_history.result_payload is not null then return v_history.result_payload; end if;
    raise exception 'tutorial gacha request is already in progress';
  end if;

  for v_index in 1..10 loop
    if v_grant is not null then
      select value into v_saved_result from jsonb_array_elements(v_grant->'gacha_results') value
      where coalesce((value->>'tutorial_slot')::integer,0)=v_index;
      v_item_id:=v_saved_result->>'character_id';
      v_rarity:=v_saved_result->>'rarity';
    elsif v_index=10 then
      v_item_id:=public.draw_gacha_item('CHAR_SPECIAL','SSR');
    else
      v_rarity:=public.draw_gacha_rarity('CHAR_NORMAL');
      v_item_id:=public.draw_gacha_item('CHAR_NORMAL',v_rarity);
    end if;
    if v_item_id is null then raise exception 'canonical tutorial gacha bucket is empty'; end if;
    select rarity into v_rarity from public.canonical_character_master
      where version='2026-08-21' and character_id=v_item_id;
    if v_rarity is null then raise exception 'tutorial gacha Character is absent from Canonical Master' using errcode='P0002'; end if;
    if v_index=10 and v_rarity<>'SSR' then raise exception 'tutorial guaranteed slot is not Canonical SSR' using errcode='23514'; end if;

    select id,awakening_level into v_existing from public.user_characters
      where user_id=v_user_id and character_id=v_item_id for update;
    if found and coalesce(v_existing.awakening_level,0)<5 then
      v_progress:=public.apply_character_awakening_equivalent(v_user_id,v_existing.id,1);
      v_results:=v_results||jsonb_build_array(jsonb_build_object('type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,
        'outcome',v_progress->>'outcome','awakening_progress_added',1,'awakening_level',(v_progress->>'awakening_level')::integer,
        'awakening_progress',(v_progress->>'awakening_progress')::integer,'awakening_required',(v_progress->>'awakening_required')::integer,'tutorial_slot',v_index));
    elsif found then
      insert into public.user_items(user_id,item_id,quantity) values(v_user_id,'AWAKENING_BOOK',1)
      on conflict(user_id,item_id) do update set quantity=public.user_items.quantity+1,updated_at=now();
      v_results:=v_results||jsonb_build_array(jsonb_build_object('type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,
        'outcome','converted','converted_item_id','AWAKENING_BOOK','converted_quantity',1,'tutorial_slot',v_index));
    else
      insert into public.user_characters(user_id,character_id,level,awakening_level) values(v_user_id,v_item_id,1,0);
      v_results:=v_results||jsonb_build_array(jsonb_build_object('type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome','new','tutorial_slot',v_index));
    end if;
  end loop;
  perform public.record_funnel_milestone(v_user_id,'first_gacha',jsonb_build_object('source','tutorial_guaranteed_ssr','pullCount',10,'lifetimeReplay',v_grant is not null));
  v_response:=jsonb_build_object('status','success','request_id',p_request_id,'results',v_results,'tutorial',true,'guaranteed_ssr_slot',10,'lifetime_replay',v_grant is not null);
  update public.gacha_execution_history set result_payload=v_response,status='COMPLETED',completed_at=now()
    where user_id=v_user_id and request_id=p_request_id;
  return v_response;
end;
$$;

-- Formation, leader, and starter skill are also replayed from the lifetime
-- authority. The first-ever tutorial keeps the existing canonical selection.
create or replace function public.complete_current_tutorial_formation()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_step text; v_party text[]; v_guaranteed_master text; v_leader_owned uuid; v_leader_level integer;
  v_skill uuid; v_skill_master text; v_skill_name text; v_starter_granted boolean:=false; v_save jsonb; v_defense jsonb; v_grant jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial formation is unavailable'; end if;
  if not exists(select 1 from public.user_funnel_milestones where user_id=v_user_id and milestone='first_growth') then
    raise exception 'character growth is required before formation' using errcode='23514';
  end if;
  select canonical_payload into v_grant from public.user_lifetime_onboarding_grants where user_id=v_user_id;
  if v_grant is not null then
    v_guaranteed_master:=v_grant->>'guaranteed_ssr';
  else
    select result->>'character_id' into v_guaranteed_master
    from public.gacha_execution_history history
    cross join lateral jsonb_array_elements(coalesce(history.result_payload->'results','[]'::jsonb)) result
    where history.user_id=v_user_id and history.status='COMPLETED'
      and coalesce((history.result_payload->>'tutorial')::boolean,false)
      and coalesce((result->>'tutorial_slot')::integer,0)=10
    order by history.created_at desc limit 1;
  end if;
  if v_guaranteed_master is null then raise exception 'guaranteed tutorial gacha result is required' using errcode='23514'; end if;
  select owned.id,owned.level into v_leader_owned,v_leader_level from public.user_characters owned
    where owned.user_id=v_user_id and owned.character_id=v_guaranteed_master limit 1;
  if v_leader_owned is null then raise exception 'guaranteed tutorial character is not owned' using errcode='23514'; end if;
  if coalesce(v_leader_level,0)<7 then raise exception 'tutorial Character must reach level 7 before formation' using errcode='23514'; end if;

  if v_grant is not null then
    select array_agg(value order by ordinality) into v_party
    from jsonb_array_elements_text(v_grant->'formation_character_ids') with ordinality selected(value,ordinality);
    if cardinality(v_party)<>5 or (select count(*) from public.user_characters where user_id=v_user_id and character_id=any(v_party))<>5 then
      raise exception 'lifetime tutorial formation cannot be restored' using errcode='23514';
    end if;
    if v_party[1] is distinct from v_grant->>'leader_character' then
      raise exception 'lifetime tutorial leader is invalid' using errcode='23514';
    end if;
  else
    select array_agg(character_id order by is_guaranteed desc,is_ssr desc,created_at desc) into v_party from (
      select owned.character_id,owned.created_at,(owned.id=v_leader_owned) is_guaranteed,(master.rarity='SSR') is_ssr
      from public.user_characters owned join public.canonical_character_master master
        on master.version='2026-08-21' and master.character_id=owned.character_id
      where owned.user_id=v_user_id
      order by (owned.id=v_leader_owned) desc,(master.rarity='SSR') desc,owned.created_at desc limit 5
    ) picked;
  end if;
  if coalesce(cardinality(v_party),0)=0 then raise exception 'owned character required'; end if;
  v_save:=public.save_main_formation(v_party);
  v_defense:=public.save_pvp_defense_deck(v_party,'ATTACK_PRIORITY');

  if v_grant is not null then
    v_skill_master:=v_grant->>'starter_skill';
    select display_name into v_skill_name from public.skill_battle_master where skill_id=v_skill_master and enabled;
    if v_skill_name is null then raise exception 'lifetime tutorial starter skill is unavailable' using errcode='P0002'; end if;
    select id into v_skill from public.user_skills where user_id=v_user_id and skill_card_id=v_skill_master order by created_at,id limit 1;
    if v_skill is null then
      insert into public.user_skills(user_id,skill_card_id,plus_val) values(v_user_id,v_skill_master,0) returning id into v_skill;
      v_starter_granted:=true;
    end if;
  else
    select skill.id,master.skill_id,master.display_name into v_skill,v_skill_master,v_skill_name
    from public.user_skills skill join public.skill_battle_master master on master.skill_id=skill.skill_card_id and master.enabled
    where skill.user_id=v_user_id and (master.exclusive_character_id is null or master.exclusive_character_id=v_party[1])
    order by coalesce(master.power_percent,0) desc,skill.created_at asc limit 1;
    if v_skill is null then
      select master.skill_id,master.display_name into v_skill_master,v_skill_name
      from public.skill_battle_master master where master.skill_id='SKILL_001' and master.enabled and master.exclusive_character_id is null;
      if v_skill_master is null then raise exception 'tutorial starter skill is unavailable' using errcode='P0002'; end if;
      select id into v_skill from public.user_skills where user_id=v_user_id and skill_card_id=v_skill_master order by created_at,id limit 1;
      if v_skill is null then
        insert into public.user_skills(user_id,skill_card_id,plus_val) values(v_user_id,v_skill_master,0) returning id into v_skill;
        v_starter_granted:=true;
      end if;
    end if;
  end if;
  select id into v_leader_owned from public.user_characters where user_id=v_user_id and character_id=v_party[1] limit 1;
  perform public.set_character_skill(v_leader_owned,v_skill,0);
  update public.users set favorite_character_id=v_party[1] where id=v_user_id;
  update public.tutorial_progress set step_id='DISPATCH',updated_at=now() where user_id=v_user_id and step_id='AUTO_FORMATION';
  return jsonb_build_object('status','advanced','tutorial_step','DISPATCH','formation',v_save,'defense',v_defense,
    'leader_character_id',v_party[1],'leader_user_character_id',v_leader_owned,'leader_level',v_leader_level,
    'skill_equipped',true,'skill_id',v_skill_master,'skill_name',v_skill_name,'starter_skill_granted',v_starter_granted,
    'lifetime_replay',v_grant is not null);
end;
$$;

revoke all on function public.capture_current_lifetime_onboarding_grant(uuid) from public,anon,authenticated;
revoke all on function public.current_gameplay_reset_eligibility(uuid) from public,anon,authenticated;
revoke all on function public.check_current_gameplay_reset_eligibility() from public,anon;
revoke all on function public.reset_current_gameplay(uuid,boolean) from public,anon;
revoke all on function public.execute_tutorial_character_gacha(uuid) from public,anon;
revoke all on function public.complete_current_tutorial_formation() from public,anon;
grant execute on function public.check_current_gameplay_reset_eligibility() to authenticated;
grant execute on function public.reset_current_gameplay(uuid,boolean) to authenticated;
grant execute on function public.execute_tutorial_character_gacha(uuid) to authenticated;
grant execute on function public.complete_current_tutorial_formation() to authenticated;

commit;
notify pgrst,'reload schema';
