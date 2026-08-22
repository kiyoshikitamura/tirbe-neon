import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
const target = await verifySupabaseTarget({ environment: "development", mutation: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Development Supabase credentials are incomplete");
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
const levelMaster = JSON.parse(await readFile("src/domain/gameplay/canonical/data/user_level_progression_20260822.json", "utf8"));
function runSql(sql, label) {
  const result = spawnSync(executable,["-X","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--command",sql],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
  if(result.status!==0) throw new Error(result.stderr||`${label} failed`);
  return result.stdout;
}

const player=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
let userId=null;
try {
  const {data:signedIn,error:signInError}=await player.auth.signInAnonymously();
  if(signInError||!signedIn.user) throw signInError||new Error("Anonymous fixture creation failed");
  userId=signedIn.user.id;
  const username=`UR${Date.now().toString(36).slice(-6)}`.slice(0,8);
  const {error:initializeError}=await player.rpc("initialize_current_player",{p_username:username});
  if(initializeError) throw initializeError;

  runSql(`update public.users set level=1,xp=0,vitality=99,vitality_last_recovered_at=now()-interval '6 minutes',pvp_points=4,pvp_points_last_recovered_at=now()-interval '2 hours',raid_points=4,raid_points_last_recovered_at=now()-interval '2 hours',raid_free_entry_consumed=false where id='${userId}'::uuid;
    insert into public.user_items(user_id,item_id,quantity) values
      ('${userId}'::uuid,'ENERGY_DRINK',2),
      ('${userId}'::uuid,'PVP_POINT_TICKET',2),
      ('${userId}'::uuid,'RAID_POINT_TICKET',2)
    on conflict(user_id,item_id) do update set quantity=excluded.quantity;`,"fixture setup");
  const {data:sync,error:syncError}=await player.rpc("sync_and_recover_vitality_and_pvp_points",{p_user_id:userId});
  if(syncError||sync.out_vitality!==100||sync.out_pvp_points!==5||sync.out_raid_points!==5) throw syncError||new Error(`Recovery mismatch ${JSON.stringify(sync)}`);
  const {data:xp,error:xpError}=await player.rpc("add_user_xp",{p_user_id:userId,p_xp_amount:1750});
  if(xpError||xp.level!==8||xp.xp!==0) throw xpError||new Error(`Lv1-8 mismatch ${JSON.stringify(xp)}`);
  runSql(`update public.users set level=99,xp=0 where id='${userId}'::uuid;`,"Lv99 fixture");
  const {data:cap,error:capError}=await player.rpc("add_user_xp",{p_user_id:userId,p_xp_amount:levelMaster.levels[98].requiredExp});
  if(capError||cap.level!==100||cap.xp!==0) throw capError||new Error(`Lv99-100 mismatch ${JSON.stringify(cap)}`);
  const {data:extra,error:extraError}=await player.rpc("add_user_xp",{p_user_id:userId,p_xp_amount:999999});
  if(extraError||extra.level!==100||extra.xp!==0||extra.leveled_up!==false) throw extraError||new Error(`Lv100 cap mismatch ${JSON.stringify(extra)}`);

  runSql(`update public.users set pvp_points=4,pvp_points_last_recovered_at=now(),raid_points=4,raid_points_last_recovered_at=now() where id='${userId}'::uuid;`,"Ticket boundary fixture");
  for (const itemId of ["PVP_POINT_TICKET","RAID_POINT_TICKET"]) {
    const {data:used,error:useError}=await player.rpc("use_action_resource_ticket",{p_item_id:itemId});
    if(useError||used.points!==5||used.quantity!==1) throw useError||new Error(`Ticket +1 mismatch ${itemId}: ${JSON.stringify(used)}`);
    const {error:maxError}=await player.rpc("use_action_resource_ticket",{p_item_id:itemId});
    if(!maxError) throw new Error(`Max-state ticket use was not rejected: ${itemId}`);
    const {data:held,error:heldError}=await player.from("user_items").select("quantity").eq("user_id",userId).eq("item_id",itemId).single();
    if(heldError||held.quantity!==1) throw heldError||new Error(`Rejected ticket consumed inventory: ${itemId}`);
  }

  runSql(`insert into public.user_characters(user_id,character_id,level,awakening_level) values('${userId}'::uuid,'char_reiji_01',1,0) on conflict(user_id,character_id) do nothing;`,"Raid character fixture");
  const {data:raids,error:raidsError}=await player.rpc("get_active_raids");
  if(raidsError||!Array.isArray(raids)||!raids[0]?.id) throw raidsError||new Error("Active Raid fixture was unavailable");
  const {data:firstRaid,error:firstRaidError}=await player.rpc("start_raid_battle",{p_instance_id:raids[0].id,p_character_ids:["char_reiji_01"],p_tactic:"ATTACK_PRIORITY"});
  if(firstRaidError||firstRaid.cost_type!=="FREE_FIRST"||firstRaid.cost!==0||firstRaid.remaining_raid_points!==5) throw firstRaidError||new Error(`First Raid entry mismatch ${JSON.stringify(firstRaid)}`);
  const {data:secondRaid,error:secondRaidError}=await player.rpc("start_raid_battle",{p_instance_id:raids[0].id,p_character_ids:["char_reiji_01"],p_tactic:"ATTACK_PRIORITY"});
  if(secondRaidError||secondRaid.cost_type!=="RAID_POINT"||secondRaid.cost!==1||secondRaid.remaining_raid_points!==4) throw secondRaidError||new Error(`Raid Point consumption mismatch ${JSON.stringify(secondRaid)}`);

  runSql(`update public.users set vitality=450 where id='${userId}'::uuid;`,"Energy Drink boundary setup");
  const {data:drink,error:drinkError}=await player.rpc("use_energy_drink");
  if(drinkError||drink.vitality!==500||drink.quantity!==1) throw drinkError||new Error(`Energy Drink boundary mismatch ${JSON.stringify(drink)}`);
  runSql(`update public.users set vitality=451 where id='${userId}'::uuid;`,"Energy Drink rejection setup");
  const {error:overcapError}=await player.rpc("use_energy_drink");
  if(!overcapError) throw new Error("Energy Drink over-cap use was not rejected");
  const {data:itemAfter,error:itemAfterError}=await player.from("user_items").select("quantity").eq("user_id",userId).eq("item_id","ENERGY_DRINK").single();
  if(itemAfterError||itemAfter.quantity!==1) throw itemAfterError||new Error("Rejected Energy Drink consumed inventory");
  const {data:raidState,error:raidError}=await player.rpc("get_current_raid_attempt_state");
  if(raidError||raidState.raidPoints!==4||raidState.firstEntryFree!==false) throw raidError||new Error(`Raid state mismatch ${JSON.stringify(raidState)}`);
  console.log(JSON.stringify({environment:target.environment,projectRef:target.projectRef,naturalRecovery:"PASS",level1To8:"PASS",level99To100:"PASS",level100Cap:"PASS",recoveryTickets:"PASS",ticketMaxNoConsume:"PASS",energyDrinkBoundary:"PASS",overcapNoConsume:"PASS",firstRaidFree:"PASS",raidPointConsumption:"PASS"},null,2));
} finally {
  if(userId) runSql(`do $$ declare r record; begin
    for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop
      execute format('delete from public.%I where user_id=$1',r.table_name) using '${userId}'::uuid;
    end loop;
    delete from public.users where id='${userId}'::uuid;
    delete from auth.users where id='${userId}'::uuid;
  end $$;`,"fixture cleanup");
}
