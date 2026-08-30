import assert from "node:assert/strict";
import { MockSupabaseClient } from "../src/utils/mock/MockSupabaseClient.ts";
import { CANONICAL_MISSIONS } from "../src/domain/gameplay/canonical/masters.ts";
import { canonicalQuestById, generateCanonicalQuestEncounter } from "../src/domain/gameplay/canonical/quests.ts";

const storage = new Map();
globalThis.window = globalThis;
globalThis.localStorage = { getItem:(k)=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:(k)=>storage.delete(k),clear:()=>storage.clear() };
const userId="00000000-0000-4000-8000-000000000830"; localStorage.setItem("tribe_demo_uuid",userId);
const client=new MockSupabaseClient();
client.setStorage("users",[{id:userId,username:"freeze-user",level:5,cash:499,guild_id:null}]); client.setStorage("guilds",[]); client.setStorage("guild_members",[]); client.setStorage("guild_join_requests",[]);
let result=await client.rpc("create_guild_v2",{p_user_id:userId,p_guild_name:"Freeze",p_creation_cost:500}); assert.ok(result.error); assert.equal(client.getStorage("users")[0].cash,499);
client.setStorage("users",[{id:userId,username:"freeze-user",level:5,cash:500,guild_id:null}]);
result=await client.rpc("create_guild_v2",{p_user_id:userId,p_guild_name:"Freeze",p_creation_cost:500}); assert.equal(result.error,null); assert.equal(client.getStorage("users")[0].cash,0);
const retry=await client.rpc("create_guild_v2",{p_user_id:userId,p_guild_name:"Freeze2",p_creation_cost:500}); assert.ok(retry.error); assert.equal(client.getStorage("users")[0].cash,0);

assert.equal(CANONICAL_MISSIONS.length,47); assert.equal(CANONICAL_MISSIONS.filter((m)=>m.category==="DAILY").length,9);
const quest=canonicalQuestById("q_shinjuku_1"); assert.equal(quest?.durationSec,300); assert.equal(quest?.vitalityCost,3);
let n=0; const rolls=[0.01,0.21,0.41,0.61,0.81,0.11,0.31,0.51,0.71,0.91];
const encounter=generateCanonicalQuestEncounter("q_shinjuku_1",()=>rolls[n++%rolls.length]);
assert.equal(encounter.members.length,3); assert.equal(new Set(encounter.members.map((m)=>m.characterId)).size,3); assert.deepEqual(encounter.members.map((m)=>m.rarity).sort(),["N","N","R"]);
assert.ok(encounter.members.every((m)=>m.skillLoadout.length===1&&m.equipmentLoadout.length===0));
console.log(JSON.stringify({status:"PASS",guildCreationCost:500,missions:47,questEnemyMembers:3},null,2));
