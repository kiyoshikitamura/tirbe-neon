import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const source = JSON.parse(read("src/domain/gameplay/canonical/data/missions_20260821.json"));
const missions = source.missions;
if (missions.length !== 37) throw new Error("Canonical Mission Master must contain 37 rows.");

const literal = (value, tag) => `$${tag}$${JSON.stringify(value)}$${tag}$`;
const dbRows = missions.map((mission) => ({
  id: mission.id,
  category: mission.category,
  trigger_type: mission.triggerType,
  title: mission.title,
  description: mission.description,
  target_value: mission.targetValue,
  condition_params: mission.conditionParams,
  reward_item_id: mission.rewardItemId,
  reward_quantity: mission.rewardQuantity,
  prerequisite_mission_id: mission.prerequisiteMissionId,
  display_order: mission.displayOrder,
  is_enabled: mission.isEnabled,
  is_repeatable: mission.isRepeatable,
  is_provisional: mission.isProvisional,
}));

const migration168 = read("supabase/migrations/20260821000168_gameplay_foundation_canonical.sql");
const equipmentStart = migration168.indexOf("create or replace function public.limit_break_equipment");
const equipmentEnd = migration168.indexOf("create or replace function public.set_character_skill", equipmentStart);
if (equipmentStart < 0 || equipmentEnd < 0) throw new Error("Unable to extract canonical equipment LB function.");
let equipmentFunction = migration168.slice(equipmentStart, equipmentEnd).trim();
equipmentFunction = equipmentFunction.replaceAll("EQUIP_LB_HAMMER", "EQUIP_LB_PART");
equipmentFunction = equipmentFunction.replace(
  " update public.user_equipments set plus_val=v_next where id=p_equipment_id and user_id=v_user_id;\n return jsonb_build_object",
  " update public.user_equipments set plus_val=v_next where id=p_equipment_id and user_id=v_user_id;\n perform public.evaluate_mission_progress(v_user_id,'GEAR_LIMIT_BREAK',1);\n return jsonb_build_object",
);
if (!equipmentFunction.includes("'GEAR_LIMIT_BREAK',1")) throw new Error("Equipment LB Mission hook was not generated.");

const migration121 = read("supabase/migrations/20260812000121_secure_provisional_progression.sql");
const skillStart = migration121.indexOf("create or replace function public.limit_break_skill(");
const skillEnd = migration121.indexOf("revoke all on table public.character_level_up_master", skillStart);
if (skillStart < 0 || skillEnd < 0) throw new Error("Unable to extract Skill LB function.");
let skillFunction = migration121.slice(skillStart, skillEnd).trim();
skillFunction = skillFunction.replace(
  /v_material_id := case[\s\S]*?end;/,
  "v_material_id := 'SKILL_MANUAL';",
);
if (!skillFunction.includes("v_material_id := 'SKILL_MANUAL';")) throw new Error("Skill Manual integration was not generated.");

const migration160 = read("supabase/migrations/20260817000160_gacha_launch_control_rpcs.sql");
const gachaStart = migration160.indexOf("create function public.execute_character_gacha(");
const gachaEnd = migration160.indexOf("revoke all on function public.execute_character_gacha", gachaStart);
if (gachaStart < 0 || gachaEnd < 0) throw new Error("Unable to extract canonical Gacha functions.");
let gachaFunctions = migration160.slice(gachaStart, gachaEnd).trim().replaceAll("create function public.execute_", "create or replace function public.execute_");
gachaFunctions = gachaFunctions.replace(
  "v_ticket_item_id := case when v_is_special then 'SPECIAL_GACHA_TICKET' else 'NORMAL_GACHA_TICKET' end;",
  "v_ticket_item_id := case when v_is_special then 'SPECIAL_TICKET_CHARACTER' else 'NORMAL_GACHA_TICKET_CHARACTER' end;",
);
gachaFunctions = gachaFunctions.replace(
  "v_ticket_item_id := case when v_is_special then 'SPECIAL_GACHA_TICKET' else 'NORMAL_GACHA_TICKET' end;",
  "v_ticket_item_id := case\n    when v_is_skill and v_is_special then 'SPECIAL_TICKET_SKILL'\n    when v_is_skill then 'NORMAL_GACHA_TICKET_SKILL'\n    when v_is_special then 'SPECIAL_TICKET_EQUIPMENT'\n    else 'NORMAL_GACHA_TICKET_EQUIPMENT'\n  end;",
);
if (gachaFunctions.includes("'NORMAL_GACHA_TICKET'")) throw new Error("Generic Normal Gacha ticket remains active in generated Gacha functions.");

const sql = `-- Mission Integration Phase 2: Production Mission Master and minimal runtime integration.
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
  select * from jsonb_to_recordset(${literal(dbRows, "missions") }::jsonb) as row(
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
where id<>all(array[${missions.map((mission) => `'${mission.id}'`).join(",")}]);

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

${equipmentFunction}

${skillFunction}

${gachaFunctions}

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
`;

const destination = resolve(root, "supabase/migrations/20260821000173_mission_production_master.sql");
writeFileSync(destination, sql);
console.log(`Generated ${destination}`);
