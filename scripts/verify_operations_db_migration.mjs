import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql=readFileSync(new URL("../supabase/migrations/20260823000188_operations_preopen_exposure.sql",import.meta.url),"utf8");
const postflight=readFileSync(new URL("../supabase/migrations/20260823000189_operations_closed_rpc_grants.sql",import.meta.url),"utf8");
for(const token of ["FRIEND_PREOPEN_OMIT","DEFERRED_BY_RELEASE_PLAN","assert_feature_mutation_allowed","FRIEND_HELPER","GUILD_COMBAT_BUFF","operations_feature_state_audit","reject_mutation_during_maintenance","FEATURE_CLOSED","MAINTENANCE"]){assert.ok(sql.includes(token),`migration missing ${token}`);}
for(const name of ["search_user_by_name","send_friend_request","accept_friend_request","reject_friend_request","remove_friend","get_friend_helper_loadout","buy_normal_shop_product","purchase_monthly_pass","claim_daily_pass_reward"]){assert.ok(sql.includes(`${name}_core_20260823`),`${name} compatibility core missing`);}
assert.ok(!/drop\s+(?:table|column)\b/i.test(sql),"destructive schema change found");
assert.ok(!/delete\s+from\s+public\.(?:user_friends|users|guilds)/i.test(sql),"destructive user data change found");
assert.ok(postflight.includes("from public,anon,authenticated")&&postflight.includes("to authenticated"),"closed RPC grants are not least privilege");
console.log("Operations DB migration verification PASS");
