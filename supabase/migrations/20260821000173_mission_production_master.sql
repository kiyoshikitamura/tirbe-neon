-- Mission Integration Phase 2: Production Mission Master and minimal runtime integration.
-- Generated from src/domain/gameplay/canonical/data/missions_20260821.json by
-- scripts/generate_canonical_mission_db_migration.mjs. Do not hand-edit seed rows.
begin;

do $$
declare v_legacy_users bigint; v_legacy_quantity bigint; v_legacy_presents bigint;
begin
  select count(*),coalesce(sum(quantity),0) into v_legacy_users,v_legacy_quantity
  from public.user_items where item_id='NORMAL_GACHA_TICKET' and quantity>0;
  select count(*) into v_legacy_presents from public.presents
  where item_id='NORMAL_GACHA_TICKET' and status='UNCLAIMED';
  if v_legacy_users>0 or v_legacy_presents>0 then
    raise exception 'LEGACY_NORMAL_GACHA_TICKET_BALANCE_FOUND users=% quantity=% unclaimed_presents=%',v_legacy_users,v_legacy_quantity,v_legacy_presents;
  end if;
end $$;

with canonical as (
  select * from jsonb_to_recordset($missions$[{"id":"ob_daily_login_01","category":"DAILY","trigger_type":"DAILY_LOGIN","title":"毎日の顔出し","description":"ゲームにログインする","target_value":1,"condition_params":{},"reward_item_id":"CHAR_EXP_S","reward_quantity":5,"prerequisite_mission_id":null,"display_order":10,"is_enabled":true,"is_repeatable":true,"is_provisional":false},{"id":"ob_daily_patrol_01","category":"DAILY","trigger_type":"PATROL_CLEAR","title":"本日のシノギ","description":"クエスト派遣を1回完了する","target_value":1,"condition_params":{"cta_tab":"patrol","cta_label":"クエストへ"},"reward_item_id":"CASH","reward_quantity":1000,"prerequisite_mission_id":null,"display_order":20,"is_enabled":true,"is_repeatable":true,"is_provisional":false},{"id":"ob_daily_char_level_01","category":"DAILY","trigger_type":"CHAR_LEVEL_UP","title":"仲間を鍛えろ","description":"キャラクターを合計1レベル強化する","target_value":1,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"CHAR_EXP_S","reward_quantity":3,"prerequisite_mission_id":null,"display_order":30,"is_enabled":true,"is_repeatable":true,"is_provisional":false},{"id":"ob_daily_gear_level_01","category":"DAILY","trigger_type":"GEAR_UPGRADE","title":"得物を磨け","description":"装備品を合計1レベル強化する","target_value":1,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"EQUIP_EXP_S","reward_quantity":3,"prerequisite_mission_id":null,"display_order":40,"is_enabled":true,"is_repeatable":true,"is_provisional":false},{"id":"ob_normal_patrol_01","category":"NORMAL","trigger_type":"PATROL_CLEAR","title":"街へ繰り出せ I","description":"クエスト派遣を1回完了する","target_value":1,"condition_params":{"cta_tab":"patrol","cta_label":"クエストへ"},"reward_item_id":"CHAR_EXP_S","reward_quantity":5,"prerequisite_mission_id":null,"display_order":110,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_patrol_02","category":"NORMAL","trigger_type":"PATROL_CLEAR","title":"街へ繰り出せ II","description":"さらにクエスト派遣を10回完了する","target_value":10,"condition_params":{"cta_tab":"patrol","cta_label":"クエストへ"},"reward_item_id":"CHAR_EXP_M","reward_quantity":3,"prerequisite_mission_id":"ob_normal_patrol_01","display_order":111,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_patrol_03","category":"NORMAL","trigger_type":"PATROL_CLEAR","title":"街へ繰り出せ III","description":"さらにクエスト派遣を30回完了する","target_value":30,"condition_params":{"cta_tab":"patrol","cta_label":"クエストへ"},"reward_item_id":"CHAR_EXP_M","reward_quantity":5,"prerequisite_mission_id":"ob_normal_patrol_02","display_order":112,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_char_level_01","category":"NORMAL","trigger_type":"CHAR_LEVEL_UP","title":"仲間を鍛えろ I","description":"キャラクターを合計5レベル強化する","target_value":5,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"CHAR_EXP_S","reward_quantity":10,"prerequisite_mission_id":null,"display_order":120,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_char_level_02","category":"NORMAL","trigger_type":"CHAR_LEVEL_UP","title":"仲間を鍛えろ II","description":"さらにキャラクターを合計20レベル強化する","target_value":20,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"CHAR_EXP_M","reward_quantity":5,"prerequisite_mission_id":"ob_normal_char_level_01","display_order":121,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_char_level_03","category":"NORMAL","trigger_type":"CHAR_LEVEL_UP","title":"仲間を鍛えろ III","description":"さらにキャラクターを合計50レベル強化する","target_value":50,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"CHAR_EXP_L","reward_quantity":2,"prerequisite_mission_id":"ob_normal_char_level_02","display_order":122,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_gear_level_01","category":"NORMAL","trigger_type":"GEAR_UPGRADE","title":"得物を磨け I","description":"装備品を合計5レベル強化する","target_value":5,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"EQUIP_EXP_S","reward_quantity":10,"prerequisite_mission_id":null,"display_order":130,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_gear_level_02","category":"NORMAL","trigger_type":"GEAR_UPGRADE","title":"得物を磨け II","description":"さらに装備品を合計20レベル強化する","target_value":20,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"EQUIP_EXP_M","reward_quantity":5,"prerequisite_mission_id":"ob_normal_gear_level_01","display_order":131,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_gear_level_03","category":"NORMAL","trigger_type":"GEAR_UPGRADE","title":"得物を磨け III","description":"さらに装備品を合計50レベル強化する","target_value":50,"condition_params":{"cta_tab":"character","cta_label":"強化へ"},"reward_item_id":"EQUIP_EXP_L","reward_quantity":2,"prerequisite_mission_id":"ob_normal_gear_level_02","display_order":132,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_gear_lb_01","category":"NORMAL","trigger_type":"GEAR_LIMIT_BREAK","title":"装備の壁を壊せ I","description":"装備品を1回限界突破する","target_value":1,"condition_params":{"cta_tab":"character","cta_label":"装備強化へ"},"reward_item_id":"CASH","reward_quantity":5000,"prerequisite_mission_id":null,"display_order":140,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_gear_lb_02","category":"NORMAL","trigger_type":"GEAR_LIMIT_BREAK","title":"装備の壁を壊せ II","description":"さらに装備品を3回限界突破する","target_value":3,"condition_params":{"cta_tab":"character","cta_label":"装備強化へ"},"reward_item_id":"EQUIP_LB_PART","reward_quantity":1,"prerequisite_mission_id":"ob_normal_gear_lb_01","display_order":141,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_skill_lb_01","category":"NORMAL","trigger_type":"SKILL_LIMIT_BREAK","title":"技を研ぎ澄ませ I","description":"スキルを1回限界突破する","target_value":1,"condition_params":{"cta_tab":"character","cta_label":"スキル強化へ"},"reward_item_id":"CASH","reward_quantity":5000,"prerequisite_mission_id":null,"display_order":150,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_skill_lb_02","category":"NORMAL","trigger_type":"SKILL_LIMIT_BREAK","title":"技を研ぎ澄ませ II","description":"さらにスキルを3回限界突破する","target_value":3,"condition_params":{"cta_tab":"character","cta_label":"スキル強化へ"},"reward_item_id":"SKILL_MANUAL","reward_quantity":1,"prerequisite_mission_id":"ob_normal_skill_lb_01","display_order":151,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_normal_guild_join_01","category":"NORMAL","trigger_type":"GUILD_JOIN","title":"仲間と旗を掲げろ","description":"ギルドに加入する","target_value":1,"condition_params":{"cta_tab":"guild","cta_label":"TRIBEを探す"},"reward_item_id":"NORMAL_GACHA_TICKET_CHARACTER","reward_quantity":3,"prerequisite_mission_id":null,"display_order":160,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_gacha_01","category":"NORMAL","trigger_type":"FUNNEL_FIRST_GACHA","title":"最初の仲間を迎えろ","description":"初回ガチャを引く","target_value":1,"condition_params":{"cta_tab":"gacha","cta_label":"ガチャへ","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CASH","reward_quantity":500,"prerequisite_mission_id":null,"display_order":81,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_growth_01","category":"NORMAL","trigger_type":"FUNNEL_FIRST_GROWTH","title":"力を引き出せ","description":"キャラクター・装備・スキルのいずれかを強化する","target_value":1,"condition_params":{"cta_tab":"character","cta_label":"強化へ","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CHAR_EXP_S","reward_quantity":3,"prerequisite_mission_id":"ob_funnel_gacha_01","display_order":82,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_battle_01","category":"NORMAL","trigger_type":"FUNNEL_FIRST_BATTLE","title":"街で力を試せ","description":"最初のバトルを完了する","target_value":1,"condition_params":{"cta_tab":"patrol","cta_label":"クエストへ","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CASH","reward_quantity":500,"prerequisite_mission_id":"ob_funnel_growth_01","display_order":83,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_pvp_01","category":"NORMAL","trigger_type":"FUNNEL_FIRST_PVP","title":"街の猛者と競え","description":"PvPを1回完了する","target_value":1,"condition_params":{"cta_tab":"pvp","cta_label":"PvPへ","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CASH","reward_quantity":800,"prerequisite_mission_id":"ob_funnel_battle_01","display_order":84,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_raid_01","category":"NORMAL","trigger_type":"FUNNEL_FIRST_RAID","title":"強敵へ挑め","description":"レイドに1回参加する","target_value":1,"condition_params":{"cta_tab":"raid","cta_label":"レイドへ","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CHAR_EXP_S","reward_quantity":3,"prerequisite_mission_id":"ob_funnel_pvp_01","display_order":85,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_guild_view_01","category":"NORMAL","trigger_type":"FUNNEL_GUILD_VIEW","title":"共に戦うTRIBEを探せ","description":"おすすめTRIBEの詳細を見る","target_value":1,"condition_params":{"cta_tab":"guild","cta_label":"TRIBEを見る","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CASH","reward_quantity":300,"prerequisite_mission_id":"ob_funnel_raid_01","display_order":86,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_guild_join_01","category":"NORMAL","trigger_type":"FUNNEL_GUILD_JOIN","title":"旗の下へ集え","description":"TRIBEへ加入または加入申請する","target_value":1,"condition_params":{"cta_tab":"guild","cta_label":"加入先を探す","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CASH","reward_quantity":500,"prerequisite_mission_id":"ob_funnel_guild_view_01","display_order":87,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_guild_activation_01","category":"NORMAL","trigger_type":"FUNNEL_GUILD_ACTIVATION","title":"仲間へ声を届けろ","description":"加入したTRIBEのChatへ投稿する","target_value":1,"condition_params":{"cta_action":"guild_chat","cta_label":"TRIBE Chatへ","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CHAR_EXP_S","reward_quantity":3,"prerequisite_mission_id":"ob_funnel_guild_join_01","display_order":88,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_funnel_second_raid_01","category":"NORMAL","trigger_type":"FUNNEL_SECOND_RAID","title":"TRIBEと再び強敵へ","description":"2回目のレイドに参加する","target_value":1,"condition_params":{"cta_tab":"raid","cta_label":"レイドへ戻る","balance_status":"PRODUCTION_FROZEN"},"reward_item_id":"CASH","reward_quantity":1000,"prerequisite_mission_id":"ob_funnel_guild_activation_01","display_order":89,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_01","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 1","description":"1人の新規プレイヤーを招待する","target_value":1,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":1},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":101,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_02","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 2","description":"2人の新規プレイヤーを招待する","target_value":2,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":2},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":102,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_03","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 3","description":"3人の新規プレイヤーを招待する","target_value":3,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":3},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":103,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_04","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 4","description":"4人の新規プレイヤーを招待する","target_value":4,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":4},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":104,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_05","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 5","description":"5人の新規プレイヤーを招待する","target_value":5,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":5},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":105,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_06","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 6","description":"6人の新規プレイヤーを招待する","target_value":6,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":6},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":106,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_07","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 7","description":"7人の新規プレイヤーを招待する","target_value":7,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":7},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":107,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_08","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 8","description":"8人の新規プレイヤーを招待する","target_value":8,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":8},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":108,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_09","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 9","description":"9人の新規プレイヤーを招待する","target_value":9,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":9},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":109,"is_enabled":true,"is_repeatable":false,"is_provisional":false},{"id":"ob_invite_10","category":"NORMAL","trigger_type":"USER_INVITE","title":"盟友の招聘 10","description":"10人の新規プレイヤーを招待する","target_value":10,"condition_params":{"balance_status":"PRODUCTION_FROZEN","invite_tier":10},"reward_item_id":"DIAMOND","reward_quantity":100,"prerequisite_mission_id":null,"display_order":110,"is_enabled":true,"is_repeatable":false,"is_provisional":false}]$missions$::jsonb) as row(
    id text,category text,trigger_type text,title text,description text,target_value integer,
    condition_params jsonb,reward_item_id text,reward_quantity integer,prerequisite_mission_id text,
    display_order integer,is_enabled boolean,is_repeatable boolean,is_provisional boolean
  )
)
insert into public.missions(
  id,category,trigger_type,title,desc_text,description,target_value,condition_params,
  reward_item_id,reward_qty,reward_quantity,prerequisite_mission_id,display_order,
  is_enabled,is_repeatable,is_provisional
)
select id,category,trigger_type,title,description,description,target_value,condition_params,
  reward_item_id,reward_quantity,reward_quantity,prerequisite_mission_id,display_order,
  is_enabled,is_repeatable,is_provisional
from canonical
on conflict(id) do update set
  category=excluded.category,trigger_type=excluded.trigger_type,title=excluded.title,
  desc_text=excluded.desc_text,description=excluded.description,target_value=excluded.target_value,
  condition_params=excluded.condition_params,reward_item_id=excluded.reward_item_id,
  reward_qty=excluded.reward_qty,reward_quantity=excluded.reward_quantity,
  prerequisite_mission_id=excluded.prerequisite_mission_id,display_order=excluded.display_order,
  is_enabled=excluded.is_enabled,is_repeatable=excluded.is_repeatable,is_provisional=excluded.is_provisional;

update public.missions set is_enabled=false
where id<>all(array['ob_daily_login_01','ob_daily_patrol_01','ob_daily_char_level_01','ob_daily_gear_level_01','ob_normal_patrol_01','ob_normal_patrol_02','ob_normal_patrol_03','ob_normal_char_level_01','ob_normal_char_level_02','ob_normal_char_level_03','ob_normal_gear_level_01','ob_normal_gear_level_02','ob_normal_gear_level_03','ob_normal_gear_lb_01','ob_normal_gear_lb_02','ob_normal_skill_lb_01','ob_normal_skill_lb_02','ob_normal_guild_join_01','ob_funnel_gacha_01','ob_funnel_growth_01','ob_funnel_battle_01','ob_funnel_pvp_01','ob_funnel_raid_01','ob_funnel_guild_view_01','ob_funnel_guild_join_01','ob_funnel_guild_activation_01','ob_funnel_second_raid_01','ob_invite_01','ob_invite_02','ob_invite_03','ob_invite_04','ob_invite_05','ob_invite_06','ob_invite_07','ob_invite_08','ob_invite_09','ob_invite_10']);

-- Stop future generic ticket grants. Quantities and the 30-day schedule are unchanged.
update public.login_bonus_master set item_id='NORMAL_GACHA_TICKET_CHARACTER',
  item_name=replace(item_name,'ノーマルガチャチケット','キャラクターガチャチケット')
where item_id='NORMAL_GACHA_TICKET';

create or replace function public.canonical_funnel_milestone_satisfied(p_user_id uuid,p_trigger_type text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.user_funnel_milestones milestone
    where milestone.user_id=p_user_id
      and public.funnel_mission_trigger_type(milestone.milestone)=p_trigger_type
  )
$$;

create or replace function public.on_funnel_mission_progress()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_trigger text:=public.funnel_mission_trigger_type(new.milestone);
begin
  if v_trigger is null then return new; end if;
  insert into public.user_missions(user_id,mission_id,current_progress,progress_val,status)
  select new.user_id,m.id,m.target_value,m.target_value,'CLEAR'
  from public.missions m
  where m.is_enabled and m.trigger_type=v_trigger
    and (m.prerequisite_mission_id is null or exists(
      select 1 from public.user_missions prerequisite
      where prerequisite.user_id=new.user_id and prerequisite.mission_id=m.prerequisite_mission_id
        and prerequisite.status='CLAIMED'))
  on conflict(user_id,mission_id) do update set
    current_progress=excluded.current_progress,progress_val=excluded.progress_val,
    status=case when public.user_missions.status='CLAIMED' then 'CLAIMED' else 'CLEAR' end,
    updated_at=clock_timestamp();
  return new;
end $$;

create or replace function public.enforce_mission_claim_prerequisite()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_prerequisite text;
begin
  if new.status='CLAIMED' and old.status is distinct from 'CLAIMED' then
    select prerequisite_mission_id into v_prerequisite from public.missions where id=new.mission_id;
    if v_prerequisite is not null and not exists(
      select 1 from public.user_missions prerequisite
      where prerequisite.user_id=new.user_id and prerequisite.mission_id=v_prerequisite
        and prerequisite.status='CLAIMED'
    ) then raise exception 'mission prerequisite is not claimed' using errcode='23514'; end if;
  end if;
  return new;
end $$;
drop trigger if exists enforce_mission_claim_prerequisite_trigger on public.user_missions;
create trigger enforce_mission_claim_prerequisite_trigger before update of status on public.user_missions
for each row execute function public.enforce_mission_claim_prerequisite();

create or replace function public.on_mission_claim_unlock()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status<>'CLAIMED' or old.status='CLAIMED' then return new; end if;
  insert into public.user_missions(user_id,mission_id,current_progress,progress_val,status,cycle_date)
  select new.user_id,child.id,0,0,'PROGRESS',null
  from public.missions child
  where child.is_enabled and child.category='NORMAL' and child.prerequisite_mission_id=new.mission_id
  on conflict(user_id,mission_id) do nothing;

  update public.user_missions unlocked set
    current_progress=child.target_value,progress_val=child.target_value,status='CLEAR',updated_at=clock_timestamp()
  from public.missions child
  where unlocked.user_id=new.user_id and unlocked.mission_id=child.id
    and child.prerequisite_mission_id=new.mission_id and unlocked.status='PROGRESS'
    and public.canonical_funnel_milestone_satisfied(new.user_id,child.trigger_type);
  return new;
end $$;
drop trigger if exists mission_claim_unlock_trigger on public.user_missions;
create trigger mission_claim_unlock_trigger after update of status on public.user_missions
for each row execute function public.on_mission_claim_unlock();

create or replace function public.limit_break_equipment(p_equipment_id uuid,p_use_wildcard boolean,p_dupe_id uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_master_id text; v_plus integer; v_next integer; v_required integer; v_dupe_master_id text; begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 select coalesce(nullif(equipment_id,''),equipment_master_id),coalesce(plus_val,0) into v_master_id,v_plus from public.user_equipments where id=p_equipment_id and user_id=v_user_id for update;
 if not found then raise exception 'owned equipment not found' using errcode='P0002'; end if;
 if v_plus>=10 then raise exception 'equipment limit break cap reached' using errcode='23514'; end if;
 v_next:=v_plus+1; select equivalent_cost into v_required from public.canonical_equipment_lb_steps where version='2026-08-21' and plus_val=v_next;
 if p_use_wildcard then update public.user_items set quantity=quantity-v_required where user_id=v_user_id and item_id='EQUIP_LB_PART' and quantity>=v_required; if not found then raise exception 'insufficient equipment limit break material' using errcode='23514'; end if;
 else if p_dupe_id is null or p_dupe_id=p_equipment_id then raise exception 'valid duplicate equipment is required' using errcode='22023'; end if; select coalesce(nullif(equipment_id,''),equipment_master_id) into v_dupe_master_id from public.user_equipments where id=p_dupe_id and user_id=v_user_id and equipped_character_id is null for update; if not found or v_dupe_master_id is distinct from v_master_id then raise exception 'matching unequipped duplicate is required' using errcode='23514'; end if; delete from public.user_equipments where id=p_dupe_id and user_id=v_user_id; end if;
 update public.user_equipments set plus_val=v_next where id=p_equipment_id and user_id=v_user_id;
 perform public.evaluate_mission_progress(v_user_id,'GEAR_LIMIT_BREAK',1);
 return jsonb_build_object('status','success','plus_val',v_next,'equivalent_cost',v_required); end $$;

create or replace function public.limit_break_skill(
  p_skill_id uuid,
  p_use_wildcard boolean,
  p_dupe_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_skill_card_id text; v_plus integer; v_next integer;
  v_cost bigint; v_required integer; v_cash bigint; v_quantity integer; v_dupe_skill_id text; v_material_id text;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select skill_card_id, coalesce(plus_val, 0) into v_skill_card_id, v_plus from public.user_skills
  where id=p_skill_id and user_id=v_user_id for update;
  if not found then raise exception 'owned skill not found' using errcode = 'P0002'; end if;
  if v_plus >= 10 then raise exception 'skill limit break cap reached' using errcode = '23514'; end if;
  v_next := v_plus + 1;
  select cost_cash, required_book into v_cost, v_required from public.skill_limit_break_master where plus_val=v_next;
  if not found then raise exception 'skill limit break master is incomplete' using errcode = 'P0002'; end if;
  select cash into v_cash from public.users where id=v_user_id for update;
  if coalesce(v_cash,0) < v_cost then raise exception 'insufficient cash' using errcode = '23514'; end if;
  v_material_id := 'SKILL_MANUAL';
  if p_use_wildcard then
    select quantity into v_quantity from public.user_items where user_id=v_user_id and item_id=v_material_id for update;
    if coalesce(v_quantity,0) < v_required then raise exception 'insufficient skill limit break material' using errcode = '23514'; end if;
  else
    if p_dupe_id is null or p_dupe_id=p_skill_id then raise exception 'valid duplicate skill is required' using errcode = '22023'; end if;
    select skill_card_id into v_dupe_skill_id from public.user_skills where id=p_dupe_id and user_id=v_user_id and equipped_character_id is null for update;
    if not found or v_dupe_skill_id is distinct from v_skill_card_id then raise exception 'matching unequipped duplicate is required' using errcode = '23514'; end if;
  end if;
  update public.users set cash=cash-v_cost where id=v_user_id;
  if p_use_wildcard then update public.user_items set quantity=quantity-v_required where user_id=v_user_id and item_id=v_material_id;
  else delete from public.user_skills where id=p_dupe_id and user_id=v_user_id; end if;
  update public.user_skills set plus_val=v_next where id=p_skill_id and user_id=v_user_id;
  perform public.evaluate_mission_progress(v_user_id,'SKILL_LIMIT_BREAK',1);
  return jsonb_build_object('status','success','plus_val',v_next,'cash_spent',v_cost,'remaining_cash',v_cash-v_cost,'material_id',v_material_id);
end; $$;

create or replace function public.execute_character_gacha(
  p_user_id uuid,
  p_gacha_id text,
  p_pull_count integer,
  p_currency_type text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gacha record;
  v_user record;
  v_existing record;
  v_history record;
  v_result jsonb := '[]'::jsonb;
  v_response jsonb;
  v_item_id text;
  v_rarity text;
  v_ticket_item_id text;
  v_cost integer := 0;
  v_pity_before integer := 0;
  v_pity_after integer := 0;
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_index integer;
  v_inserted integer;
  v_is_special boolean;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;
  if p_request_id is null then raise exception 'request_id is required'; end if;
  if p_pull_count is null or p_pull_count < 1 or p_pull_count > 10 then
    raise exception 'invalid pull count';
  end if;

  select id, gacha_type, cost_cash, cost_diamond into v_gacha
  from public.gacha_masters
  where id = p_gacha_id and gacha_type = 'CHARACTER';
  if not found then raise exception 'character gacha not found'; end if;

  v_is_special := p_gacha_id = 'CHAR_SPECIAL';
  if p_gacha_id not in ('CHAR_NORMAL', 'CHAR_SPECIAL') then
    raise exception 'unsupported character gacha';
  end if;
  if v_is_special and not exists (
    select 1 from public.feature_operating_states
    where feature_key = 'SPECIAL_GACHA' and state = 'OPEN'
  ) then
    raise exception 'special gacha is closed';
  end if;
  if p_currency_type = 'free' and (p_gacha_id <> 'CHAR_NORMAL' or p_pull_count <> 10) then
    raise exception 'daily free is only available as a normal ten-pull';
  end if;
  if p_currency_type not in ('free', 'cash', 'diamonds', 'ticket') then
    raise exception 'invalid currency type';
  end if;

  v_ticket_item_id := case when v_is_special then 'SPECIAL_TICKET_CHARACTER' else 'NORMAL_GACHA_TICKET_CHARACTER' end;
  v_cost := case p_currency_type
    when 'cash' then v_gacha.cost_cash * p_pull_count
    when 'diamonds' then v_gacha.cost_diamond * p_pull_count
    when 'ticket' then p_pull_count
    else 0 end;
  select coalesce(current_points, 0) into v_pity_before
  from public.user_gacha_pity_points
  where user_id = p_user_id and pity_master_id = 'pity_special_common';
  v_pity_before := coalesce(v_pity_before, 0);

  insert into public.gacha_execution_history (
    user_id, request_id, gacha_id, payment_source, pull_count,
    ticket_item_id, cost_amount, pity_before, pity_after
  ) values (
    p_user_id, p_request_id, p_gacha_id, p_currency_type, p_pull_count,
    case when p_currency_type = 'ticket' then v_ticket_item_id end,
    v_cost, v_pity_before, v_pity_before
  ) on conflict (user_id, request_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_history from public.gacha_execution_history
    where user_id = p_user_id and request_id = p_request_id for update;
    if v_history.gacha_id <> p_gacha_id
       or v_history.payment_source <> p_currency_type
       or v_history.pull_count <> p_pull_count then
      raise exception 'request_id was already used for a different gacha request';
    end if;
    if v_history.status = 'COMPLETED' and v_history.result_payload is not null then
      return v_history.result_payload;
    end if;
    raise exception 'gacha request is already in progress';
  end if;

  if p_currency_type = 'free' then
    insert into public.user_daily_gacha_claims (user_id, gacha_type, last_claimed_date)
    values (p_user_id, 'CHARACTER', v_today)
    on conflict (user_id, gacha_type) do update
      set last_claimed_date = excluded.last_claimed_date, updated_at = now()
      where public.user_daily_gacha_claims.last_claimed_date < v_today;
    if not found then raise exception 'daily free gacha already claimed'; end if;
  elsif p_currency_type = 'cash' then
    update public.users set cash = cash - v_cost where id = p_user_id and cash >= v_cost;
    if not found then raise exception 'insufficient gacha currency'; end if;
  elsif p_currency_type = 'diamonds' then
    update public.users set neon_diamonds = neon_diamonds - v_cost
    where id = p_user_id and neon_diamonds >= v_cost;
    if not found then raise exception 'insufficient gacha currency'; end if;
  else
    update public.user_items set quantity = quantity - v_cost, updated_at = now()
    where user_id = p_user_id and item_id = v_ticket_item_id and quantity >= v_cost;
    if not found then raise exception 'insufficient gacha tickets'; end if;
  end if;

  for v_index in 1..p_pull_count loop
    v_rarity := public.draw_gacha_rarity(p_gacha_id);
    v_item_id := public.draw_gacha_item(p_gacha_id, v_rarity);
    if v_rarity is null or v_item_id is null then raise exception 'gacha bucket is empty'; end if;

    select id, awakening_level into v_existing
    from public.user_characters
    where user_id = p_user_id and character_id = v_item_id
    for update;

    if found and coalesce(v_existing.awakening_level, 0) < 5 then
      update public.user_characters set awakening_level = coalesce(awakening_level, 0) + 1
      where id = v_existing.id;
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'rarity', v_rarity, 'outcome', 'awakening'));
    elsif found then
      insert into public.user_items (user_id, item_id, quantity)
      values (p_user_id, 'LAW_OF_STRIFE', 1)
      on conflict (user_id, item_id) do update
        set quantity = public.user_items.quantity + 1, updated_at = now();
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'rarity', v_rarity, 'outcome', 'converted'));
    else
      insert into public.user_characters (user_id, character_id, level, awakening_level)
      values (p_user_id, v_item_id, 1, 0);
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'rarity', v_rarity, 'outcome', 'new'));
    end if;
  end loop;

  if p_currency_type <> 'free' and v_is_special then
    insert into public.user_gacha_pity_points (user_id, pity_master_id, current_points)
    values (p_user_id, 'pity_special_common', p_pull_count)
    on conflict (user_id, pity_master_id) do update
      set current_points = public.user_gacha_pity_points.current_points + p_pull_count,
          updated_at = now();
    v_pity_after := v_pity_before + p_pull_count;
  else
    v_pity_after := v_pity_before;
  end if;

  perform public.record_funnel_milestone(p_user_id, 'first_gacha',
    jsonb_build_object('gachaId', p_gacha_id, 'pullCount', p_pull_count));
  select cash, neon_diamonds into v_user from public.users where id = p_user_id;
  v_response := jsonb_build_object(
    'status', 'success', 'request_id', p_request_id, 'results', v_result,
    'cash', v_user.cash, 'diamonds', v_user.neon_diamonds,
    'pity_before', v_pity_before, 'pity_after', v_pity_after);
  update public.gacha_execution_history
  set pity_after = v_pity_after, result_payload = v_response,
      status = 'COMPLETED', completed_at = now()
  where user_id = p_user_id and request_id = p_request_id;
  return v_response;
end;
$$;

create or replace function public.execute_asset_gacha(
  p_user_id uuid,
  p_gacha_id text,
  p_pull_count integer,
  p_currency_type text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gacha record;
  v_user record;
  v_existing record;
  v_history record;
  v_result jsonb := '[]'::jsonb;
  v_response jsonb;
  v_item_id text;
  v_rarity text;
  v_ticket_item_id text;
  v_cost integer := 0;
  v_pity_before integer := 0;
  v_pity_after integer := 0;
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_index integer;
  v_inserted integer;
  v_is_skill boolean;
  v_is_special boolean;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'not authorized'; end if;
  if p_request_id is null then raise exception 'request_id is required'; end if;
  if p_pull_count is null or p_pull_count < 1 or p_pull_count > 10 then raise exception 'invalid pull count'; end if;

  select id, gacha_type, cost_cash, cost_diamond into v_gacha
  from public.gacha_masters
  where id = p_gacha_id and gacha_type in ('SKILL', 'EQUIPMENT');
  if not found then raise exception 'asset gacha not found'; end if;
  if p_gacha_id not in ('SKILL_NORMAL', 'SKILL_SPECIAL', 'EQUIP_NORMAL', 'EQUIP_SPECIAL') then
    raise exception 'unsupported asset gacha';
  end if;
  v_is_skill := v_gacha.gacha_type = 'SKILL';
  v_is_special := p_gacha_id in ('SKILL_SPECIAL', 'EQUIP_SPECIAL');
  if v_is_special and not exists (
    select 1 from public.feature_operating_states
    where feature_key = 'SPECIAL_GACHA' and state = 'OPEN'
  ) then raise exception 'special gacha is closed'; end if;
  if p_currency_type = 'free' and (v_is_special or p_pull_count <> 10) then
    raise exception 'daily free is only available as a normal ten-pull';
  end if;
  if p_currency_type not in ('free', 'cash', 'diamonds', 'ticket') then raise exception 'invalid currency type'; end if;

  v_ticket_item_id := case
    when v_is_skill and v_is_special then 'SPECIAL_TICKET_SKILL'
    when v_is_skill then 'NORMAL_GACHA_TICKET_SKILL'
    when v_is_special then 'SPECIAL_TICKET_EQUIPMENT'
    else 'NORMAL_GACHA_TICKET_EQUIPMENT'
  end;
  v_cost := case p_currency_type
    when 'cash' then v_gacha.cost_cash * p_pull_count
    when 'diamonds' then v_gacha.cost_diamond * p_pull_count
    when 'ticket' then p_pull_count
    else 0 end;
  select coalesce(current_points, 0) into v_pity_before
  from public.user_gacha_pity_points
  where user_id = p_user_id and pity_master_id = 'pity_special_common';
  v_pity_before := coalesce(v_pity_before, 0);

  insert into public.gacha_execution_history (
    user_id, request_id, gacha_id, payment_source, pull_count,
    ticket_item_id, cost_amount, pity_before, pity_after
  ) values (
    p_user_id, p_request_id, p_gacha_id, p_currency_type, p_pull_count,
    case when p_currency_type = 'ticket' then v_ticket_item_id end,
    v_cost, v_pity_before, v_pity_before
  ) on conflict (user_id, request_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into v_history from public.gacha_execution_history
    where user_id = p_user_id and request_id = p_request_id for update;
    if v_history.gacha_id <> p_gacha_id
       or v_history.payment_source <> p_currency_type
       or v_history.pull_count <> p_pull_count then
      raise exception 'request_id was already used for a different gacha request';
    end if;
    if v_history.status = 'COMPLETED' and v_history.result_payload is not null then return v_history.result_payload; end if;
    raise exception 'gacha request is already in progress';
  end if;

  if p_currency_type = 'free' then
    insert into public.user_daily_gacha_claims (user_id, gacha_type, last_claimed_date)
    values (p_user_id, v_gacha.gacha_type, v_today)
    on conflict (user_id, gacha_type) do update
      set last_claimed_date = excluded.last_claimed_date, updated_at = now()
      where public.user_daily_gacha_claims.last_claimed_date < v_today;
    if not found then raise exception 'daily free gacha already claimed'; end if;
  elsif p_currency_type = 'cash' then
    update public.users set cash = cash - v_cost where id = p_user_id and cash >= v_cost;
    if not found then raise exception 'insufficient gacha currency'; end if;
  elsif p_currency_type = 'diamonds' then
    update public.users set neon_diamonds = neon_diamonds - v_cost
    where id = p_user_id and neon_diamonds >= v_cost;
    if not found then raise exception 'insufficient gacha currency'; end if;
  else
    update public.user_items set quantity = quantity - v_cost, updated_at = now()
    where user_id = p_user_id and item_id = v_ticket_item_id and quantity >= v_cost;
    if not found then raise exception 'insufficient gacha tickets'; end if;
  end if;

  for v_index in 1..p_pull_count loop
    v_rarity := public.draw_gacha_rarity(p_gacha_id);
    v_item_id := public.draw_gacha_item(p_gacha_id, v_rarity);
    if v_rarity is null or v_item_id is null then raise exception 'gacha bucket is empty'; end if;

    if v_is_skill then
      select id, plus_val into v_existing from public.user_skills
      where user_id = p_user_id and skill_card_id = v_item_id for update;
      if found and coalesce(v_existing.plus_val, 0) < 10 then
        update public.user_skills set plus_val = coalesce(plus_val, 0) + 1 where id = v_existing.id;
        v_result := v_result || jsonb_build_array(jsonb_build_object(
          'type', 'SKILL', 'item_id', v_item_id, 'rarity', v_rarity, 'outcome', 'limit_break'));
      elsif found then
        insert into public.user_items (user_id, item_id, quantity)
        values (p_user_id, 'TRAINING_MANUAL', 2)
        on conflict (user_id, item_id) do update
          set quantity = public.user_items.quantity + 2, updated_at = now();
        v_result := v_result || jsonb_build_array(jsonb_build_object(
          'type', 'SKILL', 'item_id', v_item_id, 'rarity', v_rarity, 'outcome', 'converted'));
      else
        insert into public.user_skills (user_id, skill_card_id, plus_val)
        values (p_user_id, v_item_id, 0);
        v_result := v_result || jsonb_build_array(jsonb_build_object(
          'type', 'SKILL', 'item_id', v_item_id, 'rarity', v_rarity, 'outcome', 'new'));
      end if;
    else
      insert into public.user_equipments (user_id, equipment_id, level, plus_val, random_options)
      values (p_user_id, v_item_id, 1, 0, '[]'::jsonb);
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'EQUIPMENT', 'item_id', v_item_id, 'rarity', v_rarity, 'outcome', 'new'));
    end if;
  end loop;

  if p_currency_type <> 'free' and v_is_special then
    insert into public.user_gacha_pity_points (user_id, pity_master_id, current_points)
    values (p_user_id, 'pity_special_common', p_pull_count)
    on conflict (user_id, pity_master_id) do update
      set current_points = public.user_gacha_pity_points.current_points + p_pull_count,
          updated_at = now();
    v_pity_after := v_pity_before + p_pull_count;
  else
    v_pity_after := v_pity_before;
  end if;

  perform public.record_funnel_milestone(p_user_id, 'first_gacha',
    jsonb_build_object('gachaId', p_gacha_id, 'pullCount', p_pull_count));
  select cash, neon_diamonds into v_user from public.users where id = p_user_id;
  v_response := jsonb_build_object(
    'status', 'success', 'request_id', p_request_id, 'results', v_result,
    'cash', v_user.cash, 'diamonds', v_user.neon_diamonds,
    'pity_before', v_pity_before, 'pity_after', v_pity_after);
  update public.gacha_execution_history
  set pity_after = v_pity_after, result_payload = v_response,
      status = 'COMPLETED', completed_at = now()
  where user_id = p_user_id and request_id = p_request_id;
  return v_response;
end;
$$;

do $$
begin
  if (select count(*) from public.missions where is_enabled)<>37 then raise exception 'Canonical Mission count mismatch'; end if;
  if (select count(*) from public.missions where is_enabled and category='DAILY')<>4 then raise exception 'Canonical DAILY count mismatch'; end if;
  if (select count(*) from public.missions where is_enabled and category='NORMAL')<>33 then raise exception 'Canonical NORMAL count mismatch'; end if;
  if exists(select 1 from public.missions where is_enabled and is_provisional) then raise exception 'Canonical Mission remains provisional'; end if;
  if exists(select 1 from public.missions where is_enabled and reward_item_id in ('NORMAL_CHARACTER_GACHA_TICKET','NORMAL_GACHA_TICKET','EQUIP_LB_HAMMER','SKILL_LB_BOOK')) then raise exception 'Legacy Mission reward remains'; end if;
end $$;

revoke all on function public.canonical_funnel_milestone_satisfied(uuid,text),public.on_funnel_mission_progress(),
  public.enforce_mission_claim_prerequisite(),public.on_mission_claim_unlock() from public,anon,authenticated;
revoke all on function public.execute_character_gacha(uuid,text,integer,text,uuid),
  public.execute_asset_gacha(uuid,text,integer,text,uuid) from public,anon;
grant execute on function public.execute_character_gacha(uuid,text,integer,text,uuid),
  public.execute_asset_gacha(uuid,text,integer,text,uuid) to authenticated,service_role;

notify pgrst,'reload schema';
commit;
