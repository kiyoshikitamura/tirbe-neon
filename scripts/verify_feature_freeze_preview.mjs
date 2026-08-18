import { createClient } from "@supabase/supabase-js";

if (typeof process.loadEnvFile === "function") process.loadEnvFile(process.env.SUPABASE_ENV_FILE || ".env.preview.local");
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const expected=process.env.SUPABASE_EXPECTED_PROJECT_REF;
if(!url||!anonKey||!serviceKey||!expected) throw new Error("Missing Preview configuration.");
const actual=new URL(url).hostname.split(".")[0]; if(actual!==expected) throw new Error(`Unexpected target ${actual}`);
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}); const ids=[];
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

async function anonymous(prefix, inviteCode=null){
 const client=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error}=await client.auth.signInAnonymously(); if(error||!auth.user||!auth.session)throw error||new Error("anonymous auth failed");
 ids.push(auth.user.id); const username=`${prefix}${Date.now().toString(36).slice(-6)}`.slice(0,8);
 const init=await client.rpc("initialize_current_player",{p_username:username,p_invite_code:inviteCode});
 if(init.error)throw init.error; return {client,id:auth.user.id,session:auth.session,username};
}

try{
 const inviter=await anonymous("IV");
 const codeResult=await inviter.client.rpc("generate_current_user_invite_code"); if(codeResult.error)throw codeResult.error;
 assert(/^[A-Z0-9]{8}$/.test(codeResult.data),"Invite code contract failed.");
 const invitee=await anonymous("IE",codeResult.data);
 const outsider=await anonymous("IO");

 const {data:links}=await admin.from("user_invitations").select("inviter_user_id,invitee_user_id,gift_code").eq("invitee_user_id",invitee.id);
 assert(links?.length===1&&links[0].inviter_user_id===inviter.id,"Inviter/invitee link failed.");
 const {data:inviteeRewards}=await admin.from("presents").select("item_id,quantity").eq("user_id",invitee.id).eq("message","友達招待コード入力報酬");
 assert(inviteeRewards?.length===1&&inviteeRewards[0].item_id==="DIAMOND"&&inviteeRewards[0].quantity===100,"Invitee reward was not granted exactly once.");
 const retry=await invitee.client.rpc("initialize_current_player",{p_username:invitee.username,p_invite_code:codeResult.data}); if(retry.error)throw retry.error;
 const {count:rewardCount}=await admin.from("presents").select("id",{count:"exact",head:true}).eq("user_id",invitee.id).eq("message","友達招待コード入力報酬");
 assert(rewardCount===1,"Invitation retry duplicated reward.");
 const {data:inviteMissions}=await admin.from("user_missions").select("mission_id,current_progress,status").eq("user_id",inviter.id).like("mission_id","ob_invite_%").order("mission_id");
 assert(inviteMissions?.length===10&&inviteMissions[0].status==="CLEAR"&&inviteMissions[9].current_progress===1,"Invitation mission progress failed.");

 const self=await inviter.client.rpc("send_friend_request",{p_receiver_id:inviter.id}); assert(self.error,"Self friend request was accepted.");
 const sent=await inviter.client.rpc("send_friend_request",{p_receiver_id:invitee.id}); if(sent.error)throw sent.error;
 const duplicate=await inviter.client.rpc("send_friend_request",{p_receiver_id:invitee.id}); assert(duplicate.error,"Duplicate friend request was accepted.");
 const requestId=sent.data.request_id;
 const foreignAccept=await outsider.client.rpc("accept_friend_request",{p_request_id:requestId}); assert(foreignAccept.error,"Foreign user accepted a request.");
 const accepted=await invitee.client.rpc("accept_friend_request",{p_request_id:requestId}); if(accepted.error)throw accepted.error;
 const {data:friendRows}=await admin.from("user_friends").select("user_id,friend_id,status").or(`user_id.eq.${inviter.id},user_id.eq.${invitee.id}`);
 assert(friendRows?.filter(row=>row.status==="ACCEPTED").length===2,"Symmetric friendship was not created.");
 const helper=await invitee.client.rpc("get_friend_helper_loadout",{p_friend_user_id:inviter.id}); if(helper.error)throw helper.error;
 assert(helper.data?.character,"Friend Leader Character helper is missing.");
 const foreignHelper=await outsider.client.rpc("get_friend_helper_loadout",{p_friend_user_id:inviter.id}); assert(foreignHelper.error,"Non-friend helper access was allowed.");
 const forged=await outsider.client.from("user_friends").insert({user_id:outsider.id,friend_id:inviter.id,status:"ACCEPTED"}); assert(forged.error,"Direct friendship forgery was allowed.");
 const removed=await inviter.client.rpc("remove_friend",{p_friend_id:invitee.id}); if(removed.error)throw removed.error;
 const {count:remainingFriendRows}=await admin.from("user_friends").select("id",{count:"exact",head:true}).or(`and(user_id.eq.${inviter.id},friend_id.eq.${invitee.id}),and(user_id.eq.${invitee.id},friend_id.eq.${inviter.id})`);
 assert(remainingFriendRows===0,"Friend removal did not remove both directions.");

 const restored=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const restoredSession=await restored.auth.setSession({access_token:invitee.session.access_token,refresh_token:invitee.session.refresh_token}); if(restoredSession.error)throw restoredSession.error;
 const restoredLinks=await restored.from("user_invitations").select("inviter_user_id").eq("invitee_user_id",invitee.id);
 assert(restoredLinks.data?.length===1,"Session restore lost invitation state.");

 const loginClaims=await Promise.all([
  invitee.client.rpc("process_login_bonus"),invitee.client.rpc("process_login_bonus")
 ]);
 if(loginClaims.some(result=>result.error))throw loginClaims.find(result=>result.error).error;
 assert(loginClaims.filter(result=>result.data?.claimed).length===1&&loginClaims.filter(result=>result.data?.already_claimed).length===1,"Concurrent Login Bonus was not idempotent.");
 await admin.from("user_login_bonuses").update({last_claimed_at:"2000-01-01T00:00:00Z"}).eq("user_id",invitee.id);
 const nextLogin=await invitee.client.rpc("process_login_bonus"); if(nextLogin.error)throw nextLogin.error;
 assert(nextLogin.data?.claimed&&nextLogin.data?.current_step===2,"Login Bonus did not advance after the server date boundary.");

 const missionSync=await invitee.client.rpc("sync_current_missions"); if(missionSync.error)throw missionSync.error;
 const {data:dailyMission}=await admin.from("user_missions").select("mission_id,missions!inner(category)").eq("user_id",invitee.id).eq("missions.category","DAILY").limit(1).single();
 assert(dailyMission?.mission_id,"Daily Mission assignment is missing.");
 await admin.from("user_missions").update({status:"CLEAR",current_progress:1,progress_val:1,cycle_date:"2000-01-01"}).eq("user_id",invitee.id).eq("mission_id",dailyMission.mission_id);
 const nextMissionCycle=await invitee.client.rpc("sync_current_missions"); if(nextMissionCycle.error)throw nextMissionCycle.error;
 assert(nextMissionCycle.data?.rescued_count===1,"Expired clear Daily Mission was not rescued exactly once.");

 await admin.from("users").update({level:5,cash:20000,neon_diamonds:500}).eq("id",invitee.id);
 const yesterday=new Date(Date.now()-86400000).toLocaleDateString("en-CA",{timeZone:"Asia/Tokyo"});
 await admin.from("user_raid_daily_attempts").upsert({user_id:invitee.id,attempt_date:yesterday,attempt_count:10},{onConflict:"user_id,attempt_date"});
 const state=await invitee.client.rpc("get_current_raid_attempt_state"); if(state.error)throw state.error;
 assert(state.data.attemptCount===0&&state.data.maxAttempts===10&&state.data.costs.length===10,"Raid daily restore/config contract failed.");
 const raids=await invitee.client.rpc("get_active_raids"); if(raids.error)throw raids.error;
 const {data:characters}=await invitee.client.from("user_characters").select("id").limit(1);
 const start=await invitee.client.rpc("start_raid_battle",{p_instance_id:raids.data[0].id,p_character_ids:[characters[0].id],p_tactic:"ATTACK_PRIORITY"}); if(start.error)throw start.error;
 assert(start.data.attempt_number===1&&start.data.cost_type==="FREE"&&start.data.cost===0,"Raid attempt master was not used.");
 const after=await invitee.client.rpc("get_current_raid_attempt_state"); assert(after.data?.attemptCount===1,"Raid attempt state did not survive reload query.");

 console.log(JSON.stringify({projectRef:actual,status:"PASS",checks:[
  "invite URL/code atomic link","self/duplicate invitation guard","single invitee reward","10-tier inviter missions",
  "Friend request/accept/remove","foreign mutation denial","Friend Leader helper authorization","session restore",
  "JST Login Bonus concurrency/date boundary","04:00 JST Mission rescue/reset",
  "JST Raid daily state","server-owned Raid cost master"
 ]},null,2));
}finally{
 for(const id of ids.reverse()){const {error}=await admin.auth.admin.deleteUser(id);if(error)console.warn(`cleanup ${id}: ${error.message}`)}
}
