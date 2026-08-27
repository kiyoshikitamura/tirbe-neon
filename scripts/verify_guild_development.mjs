import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
const target = await verifySupabaseTarget({ environment: "development", mutation: true });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
function sql(statement) {
  const result = spawnSync(executable,["-X","-qAt","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--command",statement],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
  if (result.status !== 0) throw new Error(result.stderr || "Development SQL failed");
  return result.stdout.trim();
}
const scalar = (statement) => Number(sql(statement));
if (process.argv.includes("--preflight")) {
  console.log(JSON.stringify({ environment:target.environment,projectRef:target.projectRef,
    guilds:scalar("select count(*) from public.guilds"),members:scalar("select count(*) from public.guild_members"),
    pendingApplications:scalar("select count(*) from public.guild_join_requests where status='PENDING'"),
    currentXp:scalar("select coalesce(sum(xp),0) from public.guilds"),
    capViolations:scalar("select count(*) from public.guilds g where (select count(*) from public.guild_members m where m.guild_id=g.id)>case g.level when 1 then 10 when 2 then 12 when 3 then 14 when 4 then 17 else 20 end"),
    roles:sql("select coalesce(string_agg(role||':'||n,',' order by role),'none') from(select role,count(*) n from public.guild_members group by role)s"),
    canonicalGuildLevels:scalar("select count(*) from public.canonical_guild_progression_master"),
    migrationHistoryHead:sql("select coalesce(max(version),'none') from supabase_migrations.schema_migrations")
  },null,2));
  process.exit(0);
}

if (scalar("select count(*) from public.canonical_guild_progression_master where is_production_enabled") !== 5) throw new Error("Guild progression count mismatch");
if (sql("select string_agg(member_cap::text,',' order by level) from public.canonical_guild_progression_master") !== "10,12,14,17,20") throw new Error("Guild member cap mismatch");
if (sql("select string_agg(required_exp::text,',' order by level) from public.canonical_guild_progression_master") !== "1000,2500,6000,12000,0") throw new Error("Guild EXP curve mismatch");
if (scalar("select sum(exp_grant) from public.canonical_guild_exp_source_master where enabled") !== 75) throw new Error("Guild EXP daily source total mismatch");
if (scalar("select count(*) from public.guild_recommendation_weights where is_provisional") !== 0) throw new Error("Recommendation weights remain provisional");
if (scalar("select count(*) from public.guild_level_master where coalesce(member_buff_atk,0)<>0 or coalesce(member_buff_hp,0)<>0") !== 0) throw new Error("Guild combat buff remains active");

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!anonKey)throw new Error("Development client configuration missing");
const clients=Array.from({length:4},()=>createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}}));
const users=[];let guildId=null;
try {
 for(let i=0;i<clients.length;i++){
  const {data:auth,error}=await clients[i].auth.signInAnonymously();if(error||!auth.user)throw error||new Error("Guild fixture auth failed");users.push(auth.user.id);
  const {error:init}=await clients[i].rpc("initialize_current_player",{p_username:`G5${i}${Date.now().toString(36).slice(-4)}`.slice(0,8)});if(init)throw init;
  sql(`update public.users set level=5,cash=20000,last_guild_left_at=null where id='${auth.user.id}'::uuid`);
 }
 const created=await clients[0].rpc("create_guild_v2",{p_user_id:users[0],p_guild_name:`G5${Date.now().toString(36).slice(-7)}`.slice(0,12),p_creation_cost:5000});if(created.error)throw created.error;guildId=created.data.guild_id;
 if(sql(`select role from public.guild_members where guild_id='${guildId}' and user_id='${users[0]}'`)!=="MASTER")throw new Error("Creator MASTER mismatch");
 let changed=await clients[0].rpc("update_guild_recruitment",{p_guild_id:guildId,p_mode:"APPLICATION_REQUIRED",p_description:"Production Social Core"});if(changed.error)throw changed.error;
 sql(`update public.users set level=2 where id='${users[3]}'::uuid`);
 const lowLevelRequest=await clients[3].rpc("request_guild_join",{p_guild_id:guildId});if(!lowLevelRequest.error)throw new Error("Lv2 Guild application was accepted");
 sql(`update public.users set level=5 where id='${users[3]}'::uuid`);
 let request=await clients[1].rpc("request_guild_join",{p_guild_id:guildId});if(request.error)throw request.error;
 let review=await clients[0].rpc("review_guild_join_request",{p_request_id:request.data.request_id,p_approve:true});if(review.error)throw review.error;
 let promoted=await clients[0].rpc("set_guild_member_role",{p_guild_id:guildId,p_target_user_id:users[1],p_new_role:"SUB_MASTER"});if(promoted.error)throw promoted.error;
 request=await clients[2].rpc("request_guild_join",{p_guild_id:guildId});if(request.error)throw request.error;
 changed=await clients[0].rpc("update_guild_recruitment",{p_guild_id:guildId,p_mode:"CLOSED",p_description:"Production Social Core"});if(changed.error)throw changed.error;
 review=await clients[1].rpc("review_guild_join_request",{p_request_id:request.data.request_id,p_approve:true});if(review.error)throw review.error;
 changed=await clients[1].rpc("update_guild_recruitment",{p_guild_id:guildId,p_mode:"OPEN_JOIN",p_description:"Production Social Core"});if(changed.error)throw changed.error;
 const invalidName=await clients[3].rpc("create_guild_v2",{p_user_id:users[3],p_guild_name:"1234567890123",p_creation_cost:5000});if(!invalidName.error)throw new Error("13 character Guild name was accepted");
 const direct=await clients[3].rpc("join_guild",{p_guild_id:guildId});if(direct.error)throw direct.error;
 const welcome=await clients[1].rpc("set_current_guild_welcome_message",{p_message:"TRIBEへようこそ"});if(welcome.error)throw welcome.error;
 const donation=await clients[2].rpc("donate_to_guild",{p_user_id:users[2],p_guild_id:guildId,p_amount:5000});if(donation.error||donation.data.xp_gained!==20)throw donation.error||new Error("Donation contract mismatch");
 const duplicate=await clients[2].rpc("donate_to_guild",{p_user_id:users[2],p_guild_id:guildId,p_amount:5000});if(!duplicate.error)throw new Error("Duplicate donation was accepted");
 const subRole=await clients[1].rpc("set_guild_member_role",{p_guild_id:guildId,p_target_user_id:users[2],p_new_role:"SUB_MASTER"});if(!subRole.error)throw new Error("SUB_MASTER role escalation was accepted");
 const login=await clients[2].rpc("record_current_guild_login");if(login.error)throw login.error;
 const chat=await clients[2].rpc("send_chat_message",{p_target_type:"GUILD",p_content:"Production social activation",p_reply_to_message_id:null});if(chat.error)throw chat.error;
 for(let n=0;n<3;n++){const patrol=sql(`insert into public.user_patrols(user_id,course_id,quest_id,character_id,status,expires_at) values('${users[2]}','q_shinjuku_1','q_shinjuku_1','char_go_01','ONGOING',now()) returning id`);sql(`update public.user_patrols set status='COMPLETED' where id='${patrol}'::uuid`);}
 for(const mode of ["PVP","RAID"]){const authority=mode==="PVP"?"PVP_SERVER":"RAID_SERVER";const replay=sql(`insert into public.battle_replay_sessions(requester_user_id,battle_mode,tactic_id,random_seed,player_snapshot,enemy_snapshot,resolution_authority,finalization_status) values('${users[2]}','${mode}','BALANCED',1,'[{}]'::jsonb,'[{}]'::jsonb,'${authority}','PENDING') returning id`);sql(`update public.battle_replay_sessions set finalization_status='FINALIZED',finalized_at=now(),finalization_result='{}'::jsonb where id='${replay}'::uuid`);}
 if(sql(`select string_agg(source,',' order by source) from public.guild_exp_daily_ledger where guild_id='${guildId}' and user_id='${users[2]}'`)!=="DONATION,FIRST_GUILD_CHAT,LOGIN,PVP_FINALIZED,QUEST_3_CLEAR,RAID_FINALIZED")throw new Error("Guild EXP source ledger mismatch");
 if(scalar(`select sum(exp_granted) from public.guild_exp_daily_ledger where guild_id='${guildId}' and user_id='${users[2]}'`)!==75)throw new Error("Guild EXP daily total mismatch");
 const toSub=await clients[0].rpc("transfer_guild_leader",{p_guild_id:guildId,p_old_id:users[0],p_new_id:users[1]});if(toSub.error)throw toSub.error;
 const toOriginal=await clients[1].rpc("transfer_guild_leader",{p_guild_id:guildId,p_old_id:users[1],p_new_id:users[0]});if(toOriginal.error)throw toOriginal.error;
 sql(`select public.apply_canonical_guild_exp('${guildId}'::uuid,21500)`);
 if(sql(`select level||','||xp from public.guilds where id='${guildId}'`)!=="5,75")throw new Error("Multi-level/overflow Guild EXP mismatch");
 const recommended=await clients[3].rpc("get_recommended_guilds",{p_limit:5});if(recommended.error||!recommended.data.some((row)=>row.guild_id===guildId))throw recommended.error||new Error("Recommendation eligibility mismatch");
 if(scalar(`select count(*) from public.user_funnel_milestones where user_id='${users[2]}' and milestone='guild_activation'`)!==1)throw new Error("Guild activation funnel mismatch");
 console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,masters:"PASS",creationAndName:"PASS",level3EntryGate:"PASS",applicationAndClosedPending:"PASS",openJoin:"PASS",subMasterReviewWelcome:"PASS",subMasterEscalationReject:"PASS",donationOncePerJstDay:"PASS",allSixExpSources:"PASS",dailyExp75:"PASS",leaderTransfer:"PASS",multiLevelOverflow:"PASS",recommendation:"PASS",missionFunnel:"PASS",combatBuffAbsent:"PASS"},null,2));
} finally {
 if(guildId)sql(`delete from public.guild_exp_daily_ledger where guild_id='${guildId}'::uuid;delete from public.guild_exp_daily_progress where guild_id='${guildId}'::uuid;delete from public.guild_join_requests where guild_id='${guildId}'::uuid;delete from public.guild_members where guild_id='${guildId}'::uuid;update public.users set guild_id=null where guild_id='${guildId}'::uuid;delete from public.guilds where id='${guildId}'::uuid`);
 for(const user of users.reverse())sql(`do $$ declare r record;begin for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop begin execute format('delete from public.%I where user_id=$1',r.table_name) using '${user}'::uuid;exception when foreign_key_violation then null;end;end loop;delete from public.users where id='${user}'::uuid;delete from auth.users where id='${user}'::uuid;end $$;`);
}
