import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
const target = await verifySupabaseTarget({ environment: "development", mutation: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Development configuration missing");
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
function sql(statement, label = "SQL") {
  const result = spawnSync(executable,["-X","-qAt","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--command",statement],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
  if (result.status !== 0) throw new Error(result.stderr || `${label} failed`);
  return result.stdout.trim();
}
const scalar = (statement) => Number(sql(statement));
if (scalar("select count(*) from public.canonical_raid_boss_master where is_production_enabled") !== 5) throw new Error("Canonical Raid boss count mismatch");
if (scalar("select count(*) from public.canonical_pvp_ranking_rewards") !== 7) throw new Error("PvP ranking reward row mismatch");
if (scalar("select count(*) from public.canonical_raid_reward_master") !== 12) throw new Error("Raid reward row mismatch");
const formula = sql("select public.canonical_pvp_rating_delta(1000,1000,'WIN')||','||public.canonical_pvp_rating_delta(1000,1000,'LOSS')||','||public.canonical_pvp_soft_reset(1600)");
if (formula !== "16,-8,1300") throw new Error(`PvP formula mismatch: ${formula}`);
if (scalar("select count(distinct public.canonical_raid_rotation_pair(date '2026-08-22'+n)::text) from generate_series(0,9)n") !== 10) throw new Error("Raid rotation is not a ten-pair cycle");

const clients = [createClient(url, anonKey, { auth: { persistSession:false,autoRefreshToken:false } }),createClient(url, anonKey, { auth: { persistSession:false,autoRefreshToken:false } })];
const users = [];
let raidInstance = null;
try {
  for (let index=0; index<clients.length; index++) {
    const { data: auth, error } = await clients[index].auth.signInAnonymously(); if (error || !auth.user) throw error || new Error("Auth fixture failed");
    users.push(auth.user.id);
    const { error:init }=await clients[index].rpc("initialize_current_player",{p_username:`B4${index}${Date.now().toString(36).slice(-4)}`.slice(0,8)});if(init)throw init;
    sql(`update public.users set level=30,pvp_points=5,raid_points=5,raid_free_entry_consumed=false where id='${auth.user.id}'::uuid`);
    sql(`insert into public.user_characters(user_id,character_id,level,awakening_level) values ('${auth.user.id}','char_go_01',30,0),('${auth.user.id}','char_lucas_01',30,0),('${auth.user.id}','char_maya_01',30,0),('${auth.user.id}','char_shin_01',30,0),('${auth.user.id}','char_rin_01',30,0) on conflict(user_id,character_id) do update set level=30,awakening_level=0`);
    const owned=JSON.parse(sql(`select coalesce(json_agg(id::text order by character_id),'[]') from public.user_characters where user_id='${auth.user.id}'::uuid and character_id in('char_go_01','char_lucas_01','char_maya_01','char_shin_01','char_rin_01')`));
    const {error:deck}=await clients[index].rpc("save_pvp_defense_deck",{p_character_ids:owned,p_tactic:"ATTACK_PRIORITY"});if(deck)throw deck;
  }
  sql(`insert into public.pvp_ranks(user_id,rank_points,daily_wins,season_wins) values('${users[0]}',1000,0,0),('${users[1]}',1300,0,0) on conflict(user_id) do update set rank_points=excluded.rank_points`);
  const {data:opponents,error:opponentError}=await clients[0].rpc("get_pvp_opponents",{p_user_id:users[0],p_my_points:1000});if(opponentError)throw opponentError;
  const opponent=opponents.find((row)=>row.opponent_user_id===users[1]);if(!opponent || opponent.opponent_class!=="STRONGER" || opponent.win_rating_delta<=16 || opponent.loss_rating_delta>=0) throw new Error(`PvP matchmaking projection mismatch: ${JSON.stringify(opponent)}`);
  const owned=JSON.parse(sql(`select coalesce(json_agg(id::text order by character_id),'[]') from public.user_characters where user_id='${users[0]}'::uuid and character_id in('char_go_01','char_lucas_01','char_maya_01','char_shin_01','char_rin_01')`));
  const cashBefore=scalar(`select cash from public.users where id='${users[0]}'`);
  const {data:pvpStart,error:pvpStartError}=await clients[0].rpc("start_pvp_battle",{p_opponent_user_id:users[1],p_character_ids:owned,p_tactic:"ATTACK_PRIORITY"});if(pvpStartError)throw pvpStartError;
  const {data:pvpResult,error:pvpResolveError}=await clients[0].functions.invoke("resolve-battle",{body:{replaySessionId:pvpStart.replay_session_id}});if(pvpResolveError)throw pvpResolveError;
  const expectedCash=pvpResult.winner==="PLAYER"?500:250;if(scalar(`select cash from public.users where id='${users[0]}'`)!==cashBefore+expectedCash)throw new Error("Official PvP cash reward mismatch");
  const {data:pvpReplay}=await clients[0].from("battle_replay_sessions").select("finalization_result").eq("id",pvpStart.replay_session_id).single();if(!pvpReplay?.finalization_result || pvpReplay.finalization_result.rankDelta!==publicResultDelta(pvpReplay.finalization_result.oldRating,pvpReplay.finalization_result.opponentRating,pvpResult.winner))throw new Error("Official PvP Elo finalization mismatch");

  raidInstance=sql("insert into public.raid_bosses(boss_id,boss_master_id,current_hp,max_hp,base_id,status,spawned_at,expires_at,cycle_id,rotation_date) select boss_id,boss_id,max_hp,max_hp,town_id,'ACTIVE',now(),now()+interval '1 hour',gen_random_uuid(),(now() at time zone 'Asia/Tokyo')::date from public.canonical_raid_boss_master where boss_id='RAID_BOSS_001' returning id");
  for(let attempt=0;attempt<6;attempt++){
    if(attempt>0)sql(`update public.users set raid_points=greatest(raid_points,1) where id='${users[0]}'`);
    const {data:start,error:startError}=await clients[0].rpc("start_raid_battle",{p_instance_id:raidInstance,p_character_ids:owned,p_tactic:"BALANCED"});if(startError)throw startError;
    if(attempt===0&&start.cost_type!=="FREE_FIRST")throw new Error("First Raid was not free");if(attempt>0&&(start.cost_type!=="RAID_POINT"||start.cost!==1))throw new Error("Raid point cost mismatch");
    const {error:resolveError}=await clients[0].functions.invoke("resolve-battle",{body:{replaySessionId:start.replay_session_id}});if(resolveError)throw resolveError;
  }
  const progress=sql(`select finalized_battles||','||raid_points_consumed from public.raid_instance_user_progress where raid_boss_instance_id='${raidInstance}' and user_id='${users[0]}'`);if(progress!=="6,5")throw new Error(`Raid progress mismatch: ${progress}`);
  if(scalar(`select count(distinct reward_key) from public.raid_production_reward_grants where raid_boss_instance_id='${raidInstance}' and user_id='${users[0]}' and reward_type='PROGRESS'`)!==3)throw new Error("Raid participation rewards mismatch");
  const ranks=await clients[0].rpc("get_raid_rankings",{p_instance_id:raidInstance,p_limit:50,p_offset:0});if(ranks.error||ranks.data.individual[0].rank_position!==1||!ranks.data.selfRank)throw ranks.error||new Error("Raid ranking pagination/selfRank mismatch");
  console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,pvpElo:"PASS",matchmaking:"PASS",officialReward:"PASS",raidBossSnapshot:"PASS",raidFirstFree:"PASS",raidPointCost:"PASS",raidProgressRewards:"PASS",rankingPagination:"PASS",rotationPairs:10},null,2));
} finally {
  if(raidInstance)sql(`delete from public.raid_production_reward_grants where raid_boss_instance_id='${raidInstance}'::uuid;delete from public.raid_instance_user_progress where raid_boss_instance_id='${raidInstance}'::uuid;delete from public.raid_bosses where id='${raidInstance}'::uuid`);
  for(const user of users.reverse())sql(`do $$ declare r record; begin for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop begin execute format('delete from public.%I where user_id=$1',r.table_name) using '${user}'::uuid; exception when foreign_key_violation then null; end; end loop; delete from public.users where id='${user}'::uuid; delete from auth.users where id='${user}'::uuid; end $$;`);
}

function publicResultDelta(player,opponent,winner){const expected=1/(1+10**((opponent-player)/400));return Math.round((winner==="PLAYER"?32:16)*((winner==="PLAYER"?1:0)-expected));}
