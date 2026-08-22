import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection,loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
const target=await verifySupabaseTarget({environment:"development",mutation:true});
const connection=await getLinkedPostgresConnection();
const executable=process.platform==="win32"?"C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe":"psql";
const sql=(statement)=>{const result=spawnSync(executable,["-X","-qAt","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--command",statement],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});if(result.status!==0)throw new Error(result.stderr||"Development SQL failed");return result.stdout.trim();};
const scalar=(statement)=>Number(sql(statement));
if(process.argv.includes("--preflight")){
 console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,featureStates:scalar("select count(*) from public.feature_operating_states"),friendRelations:scalar("select count(*) from public.user_friends"),shopItems:scalar("select count(*) from public.user_items"),guilds:scalar("select count(*) from public.guilds"),migrationHistoryHead:sql("select coalesce(max(version),'none') from supabase_migrations.schema_migrations")},null,2));
 process.exit(0);
}
if(process.argv.includes("--apply")){
 const migration=new URL("../supabase/migrations/20260823000188_operations_preopen_exposure.sql",import.meta.url);
 const applied=spawnSync(executable,["-X","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--file",migration.pathname.replace(/^\/(?:[A-Za-z]:)/,(value)=>value.slice(1))],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
 if(applied.status!==0)throw new Error(applied.stderr||"Operations migration apply failed");
 console.log("00188 physical apply PASS (history intentionally unchanged)");
}
if(process.argv.includes("--apply-postflight")){
 const migration=new URL("../supabase/migrations/20260823000189_operations_closed_rpc_grants.sql",import.meta.url);
 const applied=spawnSync(executable,["-X","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--file",migration.pathname.replace(/^\/(?:[A-Za-z]:)/,(value)=>value.slice(1))],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
 if(applied.status!==0)throw new Error(applied.stderr||"Operations postflight migration apply failed");
 console.log("00189 physical apply PASS (history intentionally unchanged)");
}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!key)throw new Error("Development Supabase client configuration missing");
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const signedIn=await client.auth.signInAnonymously();
if(signedIn.error||!signedIn.data.user)throw signedIn.error||new Error("Development anonymous auth failed");
try {
const before={friends:scalar("select count(*) from public.user_friends"),items:scalar("select count(*) from public.user_items"),guilds:scalar("select count(*) from public.guilds")};
if(scalar("select count(*) from public.feature_operating_states")!==26)throw new Error("Operations feature state count mismatch");
if(scalar("select count(*) from public.feature_operating_states where state='OPEN'")!==18)throw new Error("OPEN feature state count mismatch");
if(scalar("select count(*) from public.feature_operating_states where state='CLOSED'")!==8)throw new Error("CLOSED feature state count mismatch");
if(scalar("select count(*) from public.feature_operating_states where feature_key in ('FRIEND','FRIEND_HELPER','SHOP','PAYMENT','SPECIAL_GACHA','GVG','GUILD_COMBAT_BUFF') and not visibility and not mutation_allowed and not navigation_allowed and not deep_link_allowed")!==7)throw new Error("Closed exposure projection mismatch");

const closedCalls=[
 ["search_user_by_name",{p_username:"nobody"},"FRIEND"],
 ["get_friend_helper_loadout",{p_friend_user_id:"00000000-0000-0000-0000-000000000000"},"FRIEND_HELPER"],
 ["buy_normal_shop_product",{p_user_id:"00000000-0000-0000-0000-000000000000",p_product_id:"none"},"SHOP"],
 ["purchase_monthly_pass",{p_user_id:"00000000-0000-0000-0000-000000000000"},"PAYMENT"],
];
for(const [name,args,feature] of closedCalls){const result=await client.rpc(name,args);if(!result.error||!String(result.error.message).includes("FEATURE_CLOSED"))throw new Error(`${feature} mutation did not reject at operations gate`);}
for(const feature of ["SPECIAL_GACHA","GVG","GUILD_COMBAT_BUFF"]){const result=await client.rpc("assert_feature_mutation_allowed",{p_feature_key:feature});if(!result.error||!String(result.error.message).includes("FEATURE_CLOSED"))throw new Error(`${feature} mutation gate mismatch`);}

sql("update public.feature_operating_states set state='MAINTENANCE',message='Development smoke' where feature_key='MAINTENANCE'");
try{
 const blocked=await client.rpc("assert_feature_mutation_allowed",{p_feature_key:"GUILD"});
 if(!blocked.error||!String(blocked.error.message).includes("MAINTENANCE"))throw new Error("Maintenance mutation did not reject");
 const read=await client.from("feature_operating_states").select("feature_key,state");
 if(read.error||read.data.length!==26)throw read.error||new Error("Maintenance safe read failed");
}finally{sql("update public.feature_operating_states set state='CLOSED',message=null,started_at=null,ends_at=null where feature_key='MAINTENANCE'");}

const after={friends:scalar("select count(*) from public.user_friends"),items:scalar("select count(*) from public.user_items"),guilds:scalar("select count(*) from public.guilds")};
if(JSON.stringify(before)!==JSON.stringify(after))throw new Error("Existing user data changed during Operations verification");
console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,featureStates:26,closedMutationGates:"PASS",maintenance:"PASS",safeBootstrap:"PASS",existingDataIntegrity:"PASS",migrationHistoryHead:sql("select coalesce(max(version),'none') from supabase_migrations.schema_migrations")},null,2));
} finally {
 sql("update public.feature_operating_states set state='CLOSED',message=null,started_at=null,ends_at=null where feature_key='MAINTENANCE'");
 sql(`delete from auth.users where id='${signedIn.data.user.id}'::uuid`);
}
