-- Phase B6: canonical pre-open operations state and server mutation gates.
-- Closed feature data/functions remain intact behind compatibility wrappers.
begin;

alter table public.feature_operating_states drop constraint if exists feature_operating_states_feature_key_check;
alter table public.feature_operating_states drop constraint if exists feature_operating_states_state_check;
alter table public.feature_operating_states add constraint feature_operating_states_feature_key_check check(feature_key in (
  'PRE_OPEN','HOME','TUTORIAL','CHARACTER','SKILL','EQUIPMENT','FORMATION','BAG','QUEST','PVP','RAID','RANKING',
  'MISSION','GUILD','GUILD_CHAT','INVITE','PRESENT','NORMAL_GACHA','FRIEND','FRIEND_HELPER','SHOP','PAYMENT',
  'SPECIAL_GACHA','GVG','GUILD_COMBAT_BUFF','MAINTENANCE'
));
alter table public.feature_operating_states add constraint feature_operating_states_state_check
  check(state in ('OPEN','CLOSED','MAINTENANCE'));
alter table public.feature_operating_states add column if not exists visibility boolean not null default false;
alter table public.feature_operating_states add column if not exists mutation_allowed boolean not null default false;
alter table public.feature_operating_states add column if not exists navigation_allowed boolean not null default false;
alter table public.feature_operating_states add column if not exists deep_link_allowed boolean not null default false;
alter table public.feature_operating_states add column if not exists reason_code text not null default 'OPERATIONS_CONFIG';
alter table public.feature_operating_states add column if not exists message text;
alter table public.feature_operating_states add column if not exists started_at timestamptz;
alter table public.feature_operating_states add column if not exists ends_at timestamptz;

insert into public.feature_operating_states(feature_key,state,visibility,mutation_allowed,navigation_allowed,deep_link_allowed,reason_code)
values
 ('PRE_OPEN','OPEN',false,true,false,false,'PREOPEN_RUNTIME_COMPATIBILITY'),
 ('HOME','OPEN',true,true,true,true,'PREOPEN_OPEN'),('TUTORIAL','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('CHARACTER','OPEN',true,true,true,true,'PREOPEN_OPEN'),('SKILL','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('EQUIPMENT','OPEN',true,true,true,true,'PREOPEN_OPEN'),('FORMATION','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('BAG','OPEN',true,true,true,true,'PREOPEN_OPEN'),('QUEST','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('PVP','OPEN',true,true,true,true,'PREOPEN_OPEN'),('RAID','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('RANKING','OPEN',true,true,true,true,'PREOPEN_OPEN'),('MISSION','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('GUILD','OPEN',true,true,true,true,'PREOPEN_OPEN'),('GUILD_CHAT','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('INVITE','OPEN',true,true,true,true,'PREOPEN_OPEN'),('PRESENT','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('NORMAL_GACHA','OPEN',true,true,true,true,'PREOPEN_OPEN'),
 ('FRIEND','CLOSED',false,false,false,false,'FRIEND_PREOPEN_OMIT'),
 ('FRIEND_HELPER','CLOSED',false,false,false,false,'FRIEND_PREOPEN_OMIT'),
 ('SHOP','CLOSED',false,false,false,false,'DEFERRED_BY_RELEASE_PLAN'),
 ('PAYMENT','CLOSED',false,false,false,false,'DEFERRED_BY_RELEASE_PLAN'),
 ('SPECIAL_GACHA','CLOSED',false,false,false,false,'DEFERRED_BY_RELEASE_PLAN'),
 ('GVG','CLOSED',false,false,false,false,'DEFERRED_BY_RELEASE_PLAN'),
 ('GUILD_COMBAT_BUFF','CLOSED',false,false,false,false,'DEFERRED_BY_RELEASE_PLAN'),
 ('MAINTENANCE','CLOSED',false,false,false,false,'MANUAL_OPERATIONS_CONTROL')
on conflict(feature_key) do update set
 state=excluded.state,visibility=excluded.visibility,mutation_allowed=excluded.mutation_allowed,
 navigation_allowed=excluded.navigation_allowed,deep_link_allowed=excluded.deep_link_allowed,
 reason_code=excluded.reason_code,updated_at=clock_timestamp();

create table if not exists public.operations_feature_state_audit(
 id bigint generated always as identity primary key,
 feature_key text not null,
 old_state text,
 new_state text not null,
 actor uuid,
 changed_at timestamptz not null default clock_timestamp()
);
alter table public.operations_feature_state_audit enable row level security;
revoke all on table public.operations_feature_state_audit from public,anon,authenticated;
grant all on table public.operations_feature_state_audit to service_role;

create or replace function public.audit_feature_operating_state_change() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if old.state is distinct from new.state then
  insert into public.operations_feature_state_audit(feature_key,old_state,new_state,actor)
  values(new.feature_key,old.state,new.state,auth.uid());
 end if;
 new.updated_at:=clock_timestamp();
 return new;
end $$;
drop trigger if exists feature_operating_states_audit on public.feature_operating_states;
create trigger feature_operating_states_audit before update on public.feature_operating_states
for each row execute function public.audit_feature_operating_state_change();

create or replace function public.operations_feature_state(p_feature_key text) returns text
language sql stable security definer set search_path=public as $$
 select coalesce((select state from public.feature_operating_states where feature_key=upper(p_feature_key)),'CLOSED')
$$;

create or replace function public.assert_feature_mutation_allowed(p_feature_key text) returns void
language plpgsql stable security definer set search_path=public as $$
begin
 if public.operations_feature_state('MAINTENANCE')='MAINTENANCE' then
  raise exception 'MAINTENANCE: operations are temporarily unavailable' using errcode='55000';
 end if;
 if not exists(select 1 from public.feature_operating_states where feature_key=upper(p_feature_key) and state='OPEN' and mutation_allowed) then
  raise exception 'FEATURE_CLOSED: %',upper(p_feature_key) using errcode='55000';
 end if;
end $$;

-- Preserve the pre-freeze implementations under service-only core names.
do $converge_feature_wrappers$
declare
  v_signatures text[]:=array[
    'search_user_by_name(text)','send_friend_request(uuid)','accept_friend_request(uuid)',
    'reject_friend_request(uuid)','remove_friend(uuid)','get_friend_helper_loadout(uuid)',
    'buy_normal_shop_product(uuid,text)','purchase_monthly_pass(uuid)','claim_daily_pass_reward(uuid)'
  ];
  v_core_names text[]:=array[
    'search_user_by_name_core_20260823','send_friend_request_core_20260823','accept_friend_request_core_20260823',
    'reject_friend_request_core_20260823','remove_friend_core_20260823','get_friend_helper_loadout_core_20260823',
    'buy_normal_shop_product_core_20260823','purchase_monthly_pass_core_20260823','claim_daily_pass_reward_core_20260823'
  ];
  v_index integer;
  v_current text;
  v_core_signature text;
begin
  for v_index in 1..array_length(v_signatures,1) loop
    v_core_signature:=v_core_names[v_index]||substring(v_signatures[v_index] from position('(' in v_signatures[v_index]));
    if to_regprocedure('public.'||v_core_signature) is null then
      if to_regprocedure('public.'||v_signatures[v_index]) is null then
        raise exception 'required feature function is missing: %',v_signatures[v_index] using errcode='P0002';
      end if;
      execute format('alter function public.%s rename to %I',v_signatures[v_index],v_core_names[v_index]);
    else
      select pg_get_functiondef(to_regprocedure('public.'||v_signatures[v_index])) into v_current;
      if v_current is null
         or position(v_core_names[v_index] in v_current)=0
         or position('assert_feature_mutation_allowed' in v_current)=0 then
        raise exception 'feature wrapper does not match known 00188 state: %',v_signatures[v_index];
      end if;
    end if;
  end loop;
end;
$converge_feature_wrappers$;

create or replace function public.search_user_by_name(p_username text)
returns table(id uuid,username text,avatar_url text,level integer)
language plpgsql security definer set search_path=public as $$ begin
 perform public.assert_feature_mutation_allowed('FRIEND');
 return query select * from public.search_user_by_name_core_20260823(p_username);
end $$;
create or replace function public.send_friend_request(p_receiver_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('FRIEND'); return public.send_friend_request_core_20260823(p_receiver_id); end $$;
create or replace function public.accept_friend_request(p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('FRIEND'); return public.accept_friend_request_core_20260823(p_request_id); end $$;
create or replace function public.reject_friend_request(p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('FRIEND'); return public.reject_friend_request_core_20260823(p_request_id); end $$;
create or replace function public.remove_friend(p_friend_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('FRIEND'); return public.remove_friend_core_20260823(p_friend_id); end $$;
create or replace function public.get_friend_helper_loadout(p_friend_user_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('FRIEND_HELPER'); return public.get_friend_helper_loadout_core_20260823(p_friend_user_id); end $$;

create or replace function public.buy_normal_shop_product(p_user_id uuid,p_product_id text) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('SHOP'); return public.buy_normal_shop_product_core_20260823(p_user_id,p_product_id); end $$;
create or replace function public.purchase_monthly_pass(p_user_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('PAYMENT'); return public.purchase_monthly_pass_core_20260823(p_user_id); end $$;
create or replace function public.claim_daily_pass_reward(p_user_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ begin perform public.assert_feature_mutation_allowed('PAYMENT'); return public.claim_daily_pass_reward_core_20260823(p_user_id); end $$;

revoke all on function public.search_user_by_name_core_20260823(text),public.send_friend_request_core_20260823(uuid),
 public.accept_friend_request_core_20260823(uuid),public.reject_friend_request_core_20260823(uuid),public.remove_friend_core_20260823(uuid),
 public.get_friend_helper_loadout_core_20260823(uuid),public.buy_normal_shop_product_core_20260823(uuid,text),
 public.purchase_monthly_pass_core_20260823(uuid),public.claim_daily_pass_reward_core_20260823(uuid) from public,anon,authenticated;
grant execute on function public.search_user_by_name(text),public.send_friend_request(uuid),public.accept_friend_request(uuid),
 public.reject_friend_request(uuid),public.remove_friend(uuid),public.get_friend_helper_loadout(uuid) to authenticated;
grant execute on function public.buy_normal_shop_product(uuid,text),public.purchase_monthly_pass(uuid),public.claim_daily_pass_reward(uuid) to authenticated;

-- Maintenance is a global authenticated mutation barrier. Operations/service tasks remain available.
create or replace function public.reject_mutation_during_maintenance() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if public.operations_feature_state('MAINTENANCE')='MAINTENANCE' and coalesce(auth.role(),'authenticated')<>'service_role' then
  raise exception 'MAINTENANCE: operations are temporarily unavailable' using errcode='55000';
 end if;
 return coalesce(new,old);
end $$;
do $$ declare v_table text; begin
 foreach v_table in array array['users','user_items','user_characters','user_skills','user_equipments','user_missions','guilds','guild_members','guild_join_requests','guild_chats','chat_messages','patrols','battle_sessions','raid_battles','pvp_battles'] loop
  if to_regclass('public.'||v_table) is not null then
   execute format('drop trigger if exists operations_maintenance_gate on public.%I',v_table);
   execute format('create trigger operations_maintenance_gate before insert or update or delete on public.%I for each row execute function public.reject_mutation_during_maintenance()',v_table);
  end if;
 end loop;
end $$;

commit;
