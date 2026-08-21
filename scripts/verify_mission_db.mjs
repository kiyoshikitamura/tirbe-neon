import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { getLinkedPostgresConnection } from "./postgres_connection.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

async function createQaPlayer(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error || new Error("Anonymous QA user creation failed.");
  const username = `${prefix}${Date.now().toString(36).slice(-5)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  return { client, userId: data.user.id, username };
}

const player = await createQaPlayer("MS");
const observer = await createQaPlayer("MO");
await writeFile(".mission-e2e-state.json", JSON.stringify({
  projectRef: actualProjectRef,
  player: { userId: player.userId, username: player.username },
  observer: { userId: observer.userId, username: observer.username },
}, null, 2), { mode: 0o600 });

const { data: syncResult, error: syncError } = await player.client.rpc("sync_current_missions");
if (syncError || !syncResult?.cycle_date) throw syncError || new Error("Mission sync result mismatch.");

const { data: assigned, error: assignedError } = await player.client
  .from("user_missions")
  .select("mission_id,status,current_progress,cycle_date,missions!inner(category,display_order,is_enabled)")
  .eq("user_id", player.userId)
  .eq("missions.is_enabled", true);
if (assignedError) throw assignedError;
if (assigned.length !== 21) throw new Error(`Expected 21 root assignments, received ${assigned.length}.`);
const daily = assigned.filter((row) => row.missions.category === "DAILY");
const normalRoots = assigned.filter((row) => row.missions.category === "NORMAL");
const login = assigned.find((row) => row.mission_id === "ob_daily_login_01");
if (daily.length !== 4 || normalRoots.length !== 17 || login?.status !== "CLEAR" || login.current_progress !== 1) {
  throw new Error(`Root assignment state mismatch: ${JSON.stringify(assigned)}`);
}

const { error: directProgressError } = await player.client
  .from("user_missions").update({ current_progress: 999 }).eq("user_id", player.userId);
if (!directProgressError) throw new Error("Direct mission progress mutation unexpectedly succeeded.");

const { data: foreignRows, error: foreignError } = await observer.client
  .from("user_missions").select("id").eq("user_id", player.userId);
if (foreignError || foreignRows.length !== 0) throw foreignError || new Error("Observer read another user's missions.");

const { data: claimResult, error: claimError } = await player.client.rpc("claim_mission_reward", {
  p_mission_id: "ob_daily_login_01",
});
if (claimError || !claimResult?.claimed || claimResult.item_id !== "CHAR_EXP_S" || claimResult.quantity !== 5) {
  throw claimError || new Error(`Mission claim mismatch: ${JSON.stringify(claimResult)}`);
}
const { error: duplicateClaimError } = await player.client.rpc("claim_mission_reward", {
  p_mission_id: "ob_daily_login_01",
});
if (!duplicateClaimError) throw new Error("Duplicate mission claim unexpectedly succeeded.");

const { data: presents, error: presentsError } = await player.client
  .from("presents").select("id,item_id,quantity,status").eq("user_id", player.userId).eq("item_id", "CHAR_EXP_S");
if (presentsError || presents.length !== 1 || presents[0].quantity !== 5 || presents[0].status !== "UNCLAIMED") {
  throw presentsError || new Error(`Mission present mismatch: ${JSON.stringify(presents)}`);
}

const { error: presentClaimError } = await player.client.rpc("claim_present", { p_present_id: presents[0].id });
if (presentClaimError) throw presentClaimError;
const { data: item, error: itemError } = await player.client
  .from("user_items").select("quantity").eq("user_id", player.userId).eq("item_id", "CHAR_EXP_S").single();
if (itemError || item.quantity < 5) throw itemError || new Error("Mission item reward was not granted as an item.");

const connection = await getLinkedPostgresConnection();
const psql = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
const transactionalSmoke = `
begin;
select set_config('request.jwt.claims','{"sub":"${player.userId}","role":"authenticated"}',true);
select public.sync_current_missions();
do $$
declare v_equipment uuid:=gen_random_uuid(); v_skill uuid:=gen_random_uuid(); v_result jsonb; v_next text; v_present_count bigint;
begin
  perform public.evaluate_mission_progress('${player.userId}'::uuid,'PATROL_CLEAR',1);
  perform public.evaluate_mission_progress('${player.userId}'::uuid,'CHAR_LEVEL_UP',5);
  perform public.evaluate_mission_progress('${player.userId}'::uuid,'GEAR_UPGRADE',5);
  perform public.evaluate_mission_progress('${player.userId}'::uuid,'GUILD_JOIN',1);
  perform public.evaluate_mission_progress('${player.userId}'::uuid,'USER_INVITE',10);
  if (select count(*) from public.user_missions where user_id='${player.userId}' and status='CLEAR'
      and mission_id in ('ob_normal_patrol_01','ob_normal_char_level_01','ob_normal_gear_level_01','ob_normal_guild_join_01'))<>4 then
    raise exception 'Basic Mission progress smoke mismatch';
  end if;
  if (select count(*) from public.user_missions where user_id='${player.userId}' and status='CLEAR' and mission_id like 'ob_invite_%')<>10 then
    raise exception 'Invite Mission progress smoke mismatch';
  end if;

  insert into public.user_equipments(id,user_id,equipment_id,level,plus_val) values(v_equipment,'${player.userId}','WEAPON_001',50,0);
  insert into public.user_items(user_id,item_id,quantity) values('${player.userId}','EQUIP_LB_PART',10)
    on conflict(user_id,item_id) do update set quantity=excluded.quantity;
  v_result:=public.limit_break_equipment(v_equipment,true,null);
  if (v_result->>'plus_val')::integer<>1 or not exists(select 1 from public.user_missions where user_id='${player.userId}' and mission_id='ob_normal_gear_lb_01' and status='CLEAR') then
    raise exception 'Equipment LB Mission hook mismatch';
  end if;

  insert into public.user_skills(id,user_id,skill_card_id,plus_val) values(v_skill,'${player.userId}','SKILL_001',0);
  insert into public.user_items(user_id,item_id,quantity) values('${player.userId}','SKILL_MANUAL',100)
    on conflict(user_id,item_id) do update set quantity=excluded.quantity;
  update public.users set cash=greatest(cash,100000000) where id='${player.userId}';
  v_result:=public.limit_break_skill(v_skill,true,null);
  if v_result->>'material_id'<>'SKILL_MANUAL' or not exists(select 1 from public.user_missions where user_id='${player.userId}' and mission_id='ob_normal_skill_lb_01' and status='CLEAR') then
    raise exception 'Skill LB Mission hook mismatch';
  end if;

  perform public.record_funnel_milestone('${player.userId}','first_growth','{}');
  if exists(select 1 from public.user_missions where user_id='${player.userId}' and mission_id='ob_funnel_growth_01') then
    raise exception 'Locked funnel Mission was created early';
  end if;
  perform public.record_funnel_milestone('${player.userId}','first_gacha','{}');
  perform public.claim_mission_reward('ob_funnel_gacha_01');
  if not exists(select 1 from public.user_missions where user_id='${player.userId}' and mission_id='ob_funnel_growth_01' and status='CLEAR') then
    raise exception 'Pre-recorded Funnel milestone did not clear on unlock';
  end if;
  foreach v_next in array array['first_battle','first_pvp','first_raid','guild_detail_view','guild_joined','guild_activation','second_raid'] loop
    perform public.record_funnel_milestone('${player.userId}',v_next,'{}');
  end loop;
  foreach v_next in array array['ob_funnel_growth_01','ob_funnel_battle_01','ob_funnel_pvp_01','ob_funnel_raid_01','ob_funnel_guild_view_01','ob_funnel_guild_join_01','ob_funnel_guild_activation_01'] loop
    perform public.claim_mission_reward(v_next);
  end loop;
  if not exists(select 1 from public.user_missions where user_id='${player.userId}' and mission_id='ob_funnel_second_raid_01' and status='CLEAR') then
    raise exception 'Funnel chain smoke mismatch';
  end if;

  v_result:=public.claim_all_mission_rewards(array['ob_invite_01','ob_invite_01','ob_invite_02']);
  if (v_result->>'claimed_count')::integer<>2 then raise exception 'Claim-all duplicate filtering mismatch'; end if;

  select count(*) into v_present_count from public.presents where user_id='${player.userId}' and item_id='CASH' and quantity=1000;
  update public.user_missions set status='CLEAR',current_progress=1,progress_val=1,cycle_date=((clock_timestamp() at time zone 'Asia/Tokyo')::date-1)
  where user_id='${player.userId}' and mission_id='ob_daily_patrol_01';
  perform public.sync_current_missions();
  if (select count(*) from public.presents where user_id='${player.userId}' and item_id='CASH' and quantity=1000)<>v_present_count+1 then
    raise exception 'Daily rescue mismatch';
  end if;
end $$;
rollback;
`;
const smoke = spawnSync(psql, ["-X", "--set", "ON_ERROR_STOP=1", "--host", connection.host, "--port", connection.port,
  "--username", connection.user, "--dbname", connection.database, "--command", transactionalSmoke],
{ encoding: "utf8", env: { ...process.env, PGPASSWORD: connection.password } });
if (smoke.status !== 0) throw new Error(smoke.stderr || "Transactional Mission runtime smoke failed.");

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  player: { userId: player.userId, username: player.username },
  observer: { userId: observer.userId, username: observer.username },
  rootAssignments: { daily: daily.length, normal: normalRoots.length },
  dailyLoginAutoClear: true,
  directProgressDenied: true,
  otherUserReadDenied: true,
  atomicClaimAndDuplicateGuard: true,
  presentItemGrant: { itemId: "CHAR_EXP_S", quantity: item.quantity },
  transactionalRuntime: {
    basicProgress: true, equipmentLbHook: true, skillLbHook: true, invite1To10: true,
    funnelAll9AndPrerequisite: true, claimAllExactAndDeduplicated: true, dailyJstRescue: true,
  },
  cleanup: "Delete both QA auth users in Dashboard after verification.",
}, null, 2));
