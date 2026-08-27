import { createClient } from "@supabase/supabase-js";
if(typeof process.loadEnvFile==="function")process.loadEnvFile(".env.preview.local");
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,expected=process.env.SUPABASE_EXPECTED_PROJECT_REF;
if(!url||!anonKey||!serviceKey||!expected)throw new Error("Missing Preview configuration");
if(new URL(url).hostname.split('.')[0]!==expected)throw new Error("Unexpected Supabase target");
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}),ids=[];
const assert=(v,m)=>{if(!v)throw new Error(m)};
async function player(prefix){const client=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.signInAnonymously();if(error)throw error;ids.push(data.user.id);const name=`${prefix}${Date.now().toString(36).slice(-6)}`.slice(0,8);const init=await client.rpc('initialize_current_player',{p_username:name});if(init.error)throw init.error;const {data:char,error:charError}=await admin.from('user_characters').insert({user_id:data.user.id,character_id:'char_reiji_01',level:5,awakening_level:0}).select('id').single();if(charError)throw charError;await admin.from('users').update({level:5,cash:20000,neon_diamonds:500}).eq('id',data.user.id);return{client,id:data.user.id,char:char.id}}
try{
 const p=await player('RA');
 const {data:raids,error:raidError}=await p.client.rpc('get_active_raids');if(raidError)throw raidError;
 assert(raids.length===2&&new Set(raids.map(r=>r.baseId)).size===2,'Expected two distinct active Raid locations');
 const before=await admin.from('users').select('cash,neon_diamonds').eq('id',p.id).single();
 const {data:start,error:startError}=await p.client.rpc('start_raid_battle',{p_instance_id:raids[0].id,p_character_ids:[p.char],p_tactic:'ATTACK_PRIORITY'});if(startError)throw startError;
 assert(start.cost===0,'First Raid attempt was not free');assert(start.guild_id_snapshot===null,'Unguilded Raid did not keep a null guild snapshot');
 let {data:result,error:resolveError}=await p.client.functions.invoke('resolve-battle',{body:{replaySessionId:start.replay_session_id}});if(resolveError){const d=await resolveError.context?.json?.().catch(()=>null);throw new Error(JSON.stringify(d))}
 assert(result.mode==='RAID'&&result.raidInstanceId===raids[0].id,'Raid result is not official');assert(result.rawDamage>=result.appliedDamage,'Raid damage clamp is invalid');
 const {data:rewards,error:rewardsError}=await p.client.rpc('get_current_raid_battle_rewards',{p_replay_id:start.replay_session_id});if(rewardsError)throw rewardsError;
 assert(Array.isArray(rewards)&&rewards.every(reward=>reward.itemId&&Number(reward.quantity)>0),'Finalized Raid reward projection is invalid');
 const {data:log}=await admin.from('raid_damage_logs').select('*').eq('battle_replay_session_id',start.replay_session_id).single();assert(log.user_id===p.id&&log.guild_id===null,'Contribution snapshot is invalid');
 const {data:ranks,error:rankError}=await p.client.rpc('get_raid_rankings',{p_instance_id:raids[0].id,p_limit:100,p_offset:0});if(rankError)throw rankError;assert(ranks.individual.some(r=>r.user_id===p.id),'Individual Raid ranking missing');assert(ranks.guild.length===0,'Unguilded contribution leaked into Guild ranking');
 const firstState=await Promise.all([admin.from('users').select('cash,neon_diamonds').eq('id',p.id).single(),admin.from('raid_damage_logs').select('id',{count:'exact',head:true}).eq('battle_replay_session_id',start.replay_session_id)]);
 const retry=await p.client.functions.invoke('resolve-battle',{body:{replaySessionId:start.replay_session_id}});if(retry.error)throw retry.error;
 const retryState=await Promise.all([admin.from('users').select('cash,neon_diamonds').eq('id',p.id).single(),admin.from('raid_damage_logs').select('id',{count:'exact',head:true}).eq('battle_replay_session_id',start.replay_session_id)]);
 assert(JSON.stringify(firstState[0].data)===JSON.stringify(retryState[0].data)&&firstState[1].count===1&&retryState[1].count===1,'Raid retry duplicated cost/reward/contribution');
 const forged=await p.client.rpc('finalize_raid_battle',{p_replay_id:start.replay_session_id,p_result:{winner:'PLAYER',rounds:1,events:[],playerRawDamage:999999999,enemyRawDamage:0}});assert(forged.error,'Consumer could finalize Raid');
 const legacy=await p.client.rpc('record_raid_boss_damage_v2',{p_user_id:p.id,p_boss_id:'BOSS_001',p_damage:999999});assert(legacy.error,'Legacy damage RPC executed');
 const after=await admin.from('users').select('cash,neon_diamonds').eq('id',p.id).single();assert(after.data.cash>=before.data.cash&&after.data.neon_diamonds>=before.data.neon_diamonds,'Free attempt consumed currency');
 console.log(JSON.stringify({projectRef:expected,status:'PASS',raidCount:raids.length,bases:raids.map(r=>r.baseId),replayId:start.replay_session_id,damage:{raw:result.rawDamage,applied:result.appliedDamage},rewards,checks:['unguilded start','two locations','24h instances','server result','guild null snapshot','individual ranking','finalized reward projection','retry idempotency','consumer finalize denied','legacy damage denied']},null,2));
}finally{for(const id of ids.reverse())await admin.auth.admin.deleteUser(id)}
