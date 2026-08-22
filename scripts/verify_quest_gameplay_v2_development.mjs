import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
const target=await verifySupabaseTarget({environment:"development",mutation:true});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!anonKey) throw new Error("Development configuration missing");
const connection=await getLinkedPostgresConnection();
const executable=process.platform==="win32"?"C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe":"psql";
function sql(statement){const result=spawnSync(executable,["-X","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--tuples-only","--no-align","--command",statement],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});if(result.status!==0)throw new Error(result.stderr||"SQL failed");return result.stdout.trim();}
const client=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});let userId=null;
try{
 const {data:auth,error:authError}=await client.auth.signInAnonymously(); if(authError||!auth.user)throw authError||new Error("Auth failed"); userId=auth.user.id;
 const {error:initError}=await client.rpc("initialize_current_player",{p_username:`QV${Date.now().toString(36).slice(-6)}`.slice(0,8)});if(initError)throw initError;
 sql(`insert into public.user_characters(user_id,character_id,level,awakening_level) values ('${userId}'::uuid,'char_reiji_01',21,1),('${userId}'::uuid,'char_mio_01',21,1),('${userId}'::uuid,'char_go_01',21,1),('${userId}'::uuid,'char_koharu_01',21,1),('${userId}'::uuid,'char_ageha_01',21,1) on conflict(user_id,character_id) do update set level=excluded.level,awakening_level=excluded.awakening_level`);
 const {data:owned,error:ownedError}=await client.from("user_characters").select("id,character_id").eq("user_id",userId);if(ownedError)throw ownedError;
 const byCharacter=new Map(owned.map((row)=>[row.character_id,row.id]));
 const {error:deckError}=await client.rpc("save_pvp_defense_deck",{p_character_ids:["char_reiji_01","char_mio_01","char_go_01","char_koharu_01","char_ageha_01"].map((id)=>byCharacter.get(id)),p_tactic:"BALANCED"});if(deckError)throw deckError;
 const progression=async()=>{const {data,error}=await client.rpc("get_canonical_quest_progression");if(error)throw error;return data;};
 let rows=await progression();if(rows.filter((q)=>q.is_unlocked).length!==7)throw new Error("Fresh unlock count mismatch");
 if(rows.some((q)=>!Number.isInteger(Number(q.recommended_power))||Number(q.recommended_power)<=0||!Array.isArray(q.enemy_attributes)||q.enemy_attributes.length===0))throw new Error("Enemy Power/Attribute projection mismatch");
 const locked=await client.rpc("start_patrol",{p_course_id:"q_shinjuku_2",p_character_id:byCharacter.get("char_reiji_01")});if(!locked.error)throw new Error("Locked NORMAL start accepted");
 const results=[];
 for(const [questId,count,tactic] of [["q_shinjuku_1",3,"BALANCED"],["q_shinjuku_2",5,"BALANCED"],["q_shinjuku_3",5,"BALANCED"]]){
  sql(`update public.users set vitality=100 where id='${userId}'::uuid`);
  const {data:start,error:startError}=await client.rpc("start_patrol",{p_course_id:questId,p_character_id:byCharacter.get("char_reiji_01")});if(startError)throw startError;
  const {error:instantError}=await client.rpc("complete_patrol_instantly",{p_user_id:userId,p_patrol_id:start.patrol_id,p_use_currency:"FREE_PREOPEN"});if(instantError)throw instantError;
  const {data:replay,error:replayError}=await client.rpc("create_patrol_battle_replay",{p_patrol_id:start.patrol_id,p_tactic_id:"BALANCED"});if(replayError)throw replayError;
  if(replay.enemy_snapshot.length!==count||replay.enemy_tactic!==tactic)throw new Error(`${questId} replay projection mismatch`);
  if(replay.enemy_snapshot.some((unit)=>unit.equipment.length||!unit.skills.length||unit.skills.some((skill)=>!String(skill.id).startsWith("SKILL_"))))throw new Error(`${questId} Canonical snapshot mismatch`);
  const {data:battle,error:battleError}=await client.functions.invoke("resolve-battle",{body:{replaySessionId:replay.replay_session_id}});if(battleError||!["PLAYER","ENEMY"].includes(battle?.winner))throw battleError||new Error("Development authoritative resolve failed");
  const {data:reward,error:rewardError}=await client.rpc("claim_patrol_rewards",{p_patrol_id:start.patrol_id});if(rewardError||!reward.first_clear)throw rewardError||new Error("First clear missing");
  results.push({questId,members:count,winner:battle.winner,rounds:battle.rounds});
  rows=await progression();
  if(questId.endsWith("_1")&&!rows.find((q)=>q.quest_id==="q_shinjuku_2")?.is_unlocked)throw new Error("NORMAL did not unlock");
  if(questId.endsWith("_2")&&!rows.find((q)=>q.quest_id==="q_shinjuku_3")?.is_unlocked)throw new Error("HARD did not unlock");
 }
 if(sql(`select count(*) from public.user_quest_first_clears where user_id='${userId}'::uuid`)!=="3")throw new Error("First clear ledger mismatch");
 console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,initialOpen:7,unlockChain:"PASS",memberCounts:"3/5/5",canonicalSkills:"PASS",enemyTactic:"PASS",firstClearExactlyOnce:"PASS",results},null,2));
}finally{if(userId)sql(`do $$ declare r record; begin for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop execute format('delete from public.%I where user_id=$1',r.table_name) using '${userId}'::uuid; end loop; delete from public.users where id='${userId}'::uuid; delete from auth.users where id='${userId}'::uuid; end $$;`);}
