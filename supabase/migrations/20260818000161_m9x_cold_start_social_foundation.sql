-- M9-X cold-start/social foundation. Production is intentionally untouched;
-- this migration is promoted Development -> Preview through the target guard.
begin;

-- The tutorial ten-pull is a one-time onboarding contract, not the daily free
-- normal-gacha claim. Its result remains request-idempotent in the canonical
-- execution history and the guaranteed slot resolves from the live SSR pool.
create or replace function public.execute_tutorial_character_gacha(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_history record;
  v_existing record;
  v_results jsonb := '[]'::jsonb;
  v_response jsonb;
  v_item_id text;
  v_rarity text;
  v_index integer;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'request_id is required' using errcode='22023'; end if;
  if not exists(select 1 from public.tutorial_progress where user_id=v_user_id and step_id='FREE_GACHA') then
    raise exception 'tutorial gacha is unavailable' using errcode='42501';
  end if;

  insert into public.gacha_execution_history(
    user_id,request_id,gacha_id,payment_source,pull_count,cost_amount,pity_before,pity_after
  ) values(v_user_id,p_request_id,'CHAR_NORMAL','free',10,0,0,0)
  on conflict(user_id,request_id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_history from public.gacha_execution_history
    where user_id=v_user_id and request_id=p_request_id for update;
    if v_history.gacha_id<>'CHAR_NORMAL' or v_history.pull_count<>10 then
      raise exception 'request_id was already used for a different request';
    end if;
    if v_history.status='COMPLETED' and v_history.result_payload is not null then
      return v_history.result_payload;
    end if;
    raise exception 'tutorial gacha request is already in progress';
  end if;

  for v_index in 1..10 loop
    if v_index=10 then
      v_rarity := 'SSR';
      v_item_id := public.draw_gacha_item('CHAR_SPECIAL','SSR');
    else
      v_rarity := public.draw_gacha_rarity('CHAR_NORMAL');
      v_item_id := public.draw_gacha_item('CHAR_NORMAL',v_rarity);
    end if;
    if v_item_id is null then raise exception 'canonical tutorial gacha bucket is empty'; end if;

    select id,awakening_level into v_existing from public.user_characters
    where user_id=v_user_id and character_id=v_item_id for update;
    if found and coalesce(v_existing.awakening_level,0)<5 then
      update public.user_characters set awakening_level=coalesce(awakening_level,0)+1 where id=v_existing.id;
      v_results:=v_results||jsonb_build_array(jsonb_build_object('type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome','awakening','tutorial_slot',v_index));
    elsif found then
      insert into public.user_items(user_id,item_id,quantity) values(v_user_id,'LAW_OF_STRIFE',1)
      on conflict(user_id,item_id) do update set quantity=public.user_items.quantity+1,updated_at=now();
      v_results:=v_results||jsonb_build_array(jsonb_build_object('type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome','converted','tutorial_slot',v_index));
    else
      insert into public.user_characters(user_id,character_id,level,awakening_level) values(v_user_id,v_item_id,1,0);
      v_results:=v_results||jsonb_build_array(jsonb_build_object('type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome','new','tutorial_slot',v_index));
    end if;
  end loop;

  perform public.record_funnel_milestone(v_user_id,'first_gacha',jsonb_build_object('source','tutorial_guaranteed_ssr','pullCount',10));
  v_response:=jsonb_build_object('status','success','request_id',p_request_id,'results',v_results,'tutorial',true,'guaranteed_ssr_slot',10);
  update public.gacha_execution_history set result_payload=v_response,status='COMPLETED',completed_at=now()
  where user_id=v_user_id and request_id=p_request_id;
  return v_response;
end;
$$;

-- Formation is the final character-management operation in the tutorial.
-- Growth remains available from the post-tutorial POWER hub, but is no longer
-- a mandatory tutorial state. Retry after a committed formation is a no-op.
create or replace function public.complete_current_tutorial_formation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_step text;
  v_party text[];
  v_leader_owned uuid;
  v_skill uuid;
  v_save jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial formation is unavailable'; end if;

  select array_agg(character_id order by is_ssr desc,created_at desc)
  into v_party
  from (
    select owned.character_id,owned.created_at,(release.rarity='SSR') is_ssr
    from public.user_characters owned
    join public.character_release_master release on release.character_id=owned.character_id and release.enabled
    where owned.user_id=v_user_id
    order by (release.rarity='SSR') desc,owned.created_at desc
    limit 5
  ) picked;
  if coalesce(cardinality(v_party),0)=0 then raise exception 'owned character required'; end if;
  v_save:=public.save_main_formation(v_party);

  select owned.id into v_leader_owned from public.user_characters owned
  where owned.user_id=v_user_id and owned.character_id=v_party[1] limit 1;
  select skill.id into v_skill from public.user_skills skill
  join public.skill_battle_master master on master.skill_id=skill.skill_card_id and master.enabled
  where skill.user_id=v_user_id
    and (master.exclusive_character_id is null or master.exclusive_character_id=v_party[1])
  order by coalesce(master.power_percent,0) desc,skill.created_at asc limit 1;
  if v_skill is not null then perform public.set_character_skill(v_leader_owned,v_skill,0); end if;

  update public.tutorial_progress set step_id='DISPATCH',updated_at=now()
  where user_id=v_user_id and step_id='AUTO_FORMATION';
  return jsonb_build_object('status','advanced','tutorial_step','DISPATCH','formation',v_save,'leader_character_id',v_party[1],'skill_equipped',v_skill is not null);
end;
$$;

-- Safe migration of interrupted Growth sessions: no item grant, no economy
-- mutation. The next reload resumes directly at the tutorial quest.
update public.tutorial_progress set step_id='DISPATCH',updated_at=now()
where step_id='AUTO_FORMATION'
  and exists(select 1 from public.user_main_formations f where f.user_id=tutorial_progress.user_id);

alter table public.feature_operating_states drop constraint if exists feature_operating_states_feature_key_check;
alter table public.feature_operating_states add constraint feature_operating_states_feature_key_check
  check(feature_key in ('SPECIAL_GACHA','GVG','PAYMENT','PRE_OPEN'));
insert into public.feature_operating_states(feature_key,state)
values('PRE_OPEN','OPEN')
on conflict(feature_key) do update set state=excluded.state,updated_at=now();

-- Public activity projection contains display-safe immutable snapshots only.
create table if not exists public.social_activity_feed(
  id uuid primary key default gen_random_uuid(),
  activity_type text not null check(activity_type in ('SSR_CHARACTER','SSR_SKILL','SSR_EQUIPMENT','POWER_RANK_1','GUILD_CREATED')),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_display_name text not null,
  guild_id uuid references public.guilds(id) on delete set null,
  object_master_id text,
  display_payload jsonb not null default '{}'::jsonb,
  permanent boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists social_activity_feed_created_idx on public.social_activity_feed(created_at desc);
alter table public.social_activity_feed enable row level security;
drop policy if exists social_activity_feed_authenticated_read on public.social_activity_feed;
create policy social_activity_feed_authenticated_read on public.social_activity_feed for select to authenticated using(true);
revoke all on public.social_activity_feed from public,anon,authenticated;
grant select on public.social_activity_feed to authenticated;

alter table public.guilds add column if not exists welcome_message text;
alter table public.board_posts add column if not exists reply_to_message_id uuid references public.board_posts(id) on delete set null;
create index if not exists board_posts_reply_to_idx on public.board_posts(reply_to_message_id) where reply_to_message_id is not null;

create table if not exists public.guild_human_response_metrics(
  join_request_id uuid primary key references public.guild_join_requests(id) on delete cascade,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  joined_user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null,
  first_human_response_message_id uuid references public.board_posts(id) on delete set null,
  first_human_response_at timestamptz,
  response_seconds integer,
  updated_at timestamptz not null default now()
);
alter table public.guild_human_response_metrics enable row level security;
revoke all on public.guild_human_response_metrics from public,anon,authenticated;
grant all on public.guild_human_response_metrics to service_role;

create or replace function public.send_chat_message(p_target_type text,p_content text,p_reply_to_message_id uuid)
returns public.board_posts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid(); v_guild uuid; v_name text; v_avatar text; v_reply public.board_posts; v_message public.board_posts;
  v_cooldown interval; v_last timestamptz;
begin
  if v_user is null or p_target_type not in('GLOBAL','GUILD') or char_length(trim(coalesce(p_content,''))) not between 1 and 140 then
    raise exception 'invalid chat message';
  end if;
  if p_target_type='GUILD' then
    select guild_id into v_guild from public.guild_members where user_id=v_user;
    if v_guild is null then raise exception 'guild membership required'; end if;
    v_cooldown:=interval '3 seconds';
  else v_cooldown:=interval '10 seconds'; end if;
  if p_reply_to_message_id is not null then
    select * into v_reply from public.board_posts where id=p_reply_to_message_id;
    if not found or v_reply.target_type<>p_target_type or v_reply.target_id is distinct from v_guild then
      raise exception 'reply target is unavailable';
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select max(created_at) into v_last from public.board_posts where coalesce(user_id,author_id)=v_user and target_type=p_target_type and (p_target_type='GLOBAL' or target_id=v_guild);
  if v_last is not null and clock_timestamp()<v_last+v_cooldown then raise exception 'chat cooldown is active'; end if;
  select username,avatar_url into v_name,v_avatar from public.users where id=v_user;
  insert into public.board_posts(title,content,author_id,user_id,author_name,author_avatar_url,target_type,target_id,is_system,reply_to_message_id)
  values('',trim(p_content),v_user,v_user,v_name,v_avatar,p_target_type,v_guild,false,p_reply_to_message_id) returning * into v_message;
  return v_message;
end;
$$;

create or replace function public.send_chat_message(p_target_type text,p_content text)
returns public.board_posts
language sql
security definer
set search_path=public
as $$ select public.send_chat_message(p_target_type,p_content,null::uuid) $$;

revoke all on function public.execute_tutorial_character_gacha(uuid),public.complete_current_tutorial_formation(),
  public.send_chat_message(text,text,uuid) from public,anon;
grant execute on function public.execute_tutorial_character_gacha(uuid),public.complete_current_tutorial_formation(),
  public.send_chat_message(text,text,uuid) to authenticated;
revoke all on function public.send_chat_message(text,text) from public,anon;
grant execute on function public.send_chat_message(text,text) to authenticated;

commit;
notify pgrst,'reload schema';
