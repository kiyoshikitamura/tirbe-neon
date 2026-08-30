import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceKey || expectedRef !== "sufvuqdnqohpfzkwxohq") throw new Error("Preview configuration required");
if (new URL(url).hostname.split(".")[0] !== expectedRef) throw new Error("Unexpected Supabase target");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const player = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const raidIds = [];
let userId = null;
const assert = (value, message) => { if (!value) throw new Error(message); };

async function resolve(instanceId, characterId) {
  const { data: started, error: startError } = await player.rpc("start_raid_battle", {
    p_instance_id: instanceId,
    p_character_ids: [characterId],
    p_tactic: "ATTACK_PRIORITY",
  });
  if (startError) throw startError;
  const { data: result, error } = await player.functions.invoke("resolve-battle", {
    body: { replaySessionId: started.replay_session_id },
  });
  if (error) throw error;
  return { started, result };
}

try {
  const { data: auth, error: authError } = await player.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous auth failed");
  userId = auth.user.id;
  const { error: initError } = await player.rpc("initialize_current_player", {
    p_username: `RL${Date.now().toString(36).slice(-6)}`.slice(0, 8),
  });
  if (initError) throw initError;
  await admin.from("users").update({ level: 20, raid_points: 5 }).eq("id", userId);
  const { data: character, error: characterError } = await admin.from("user_characters").insert({
    user_id: userId, character_id: "char_reiji_01", level: 20, awakening_level: 0,
  }).select("id").single();
  if (characterError) throw characterError;

  await admin.rpc("rotate_daily_raids");
  const { data: canonical, error: canonicalError } = await admin.from("raid_bosses")
    .select("*").eq("status", "ACTIVE").not("raid_variant_id", "is", null).limit(1).single();
  if (canonicalError) throw canonicalError;
  const firstId = crypto.randomUUID();
  const first = {
    id: firstId,
    boss_id: canonical.boss_id,
    boss_master_id: canonical.boss_master_id,
    current_hp: 1,
    max_hp: canonical.max_hp,
    base_id: `accept_${Date.now().toString(36)}`,
    status: "ACTIVE",
    spawned_at: new Date().toISOString(),
    expires_at: canonical.expires_at,
    cycle_id: crypto.randomUUID(),
    rotation_date: canonical.rotation_date,
    raid_variant_id: canonical.raid_variant_id,
    raid_day_key: canonical.raid_day_key,
  };
  const { error: insertError } = await admin.from("raid_bosses").insert(first);
  if (insertError) throw insertError;
  raidIds.push(firstId);

  const firstBattle = await resolve(firstId, character.id);
  assert(firstBattle.result.remainingBossHp === 0, "First Raid was not defeated");
  const { data: firstState } = await admin.from("raid_bosses")
    .select("status,raid_day_key,raid_variant_id,respawn_after").eq("id", firstId).single();
  assert(firstState.status === "CLEARED" && firstState.respawn_after, "Raid ACTIVE -> CLEARED failed");
  const { data: firstClaims } = await admin.from("raid_clear_reward_claims").select("*")
    .eq("raid_day_key", firstState.raid_day_key).eq("user_id", userId).eq("reward_type", "CLEAR_REWARD");
  assert(firstClaims.length === 1 && firstClaims[0].source_instance_id === firstId
    && firstClaims[0].delivery_status === "DELIVERED", "First clear claim was not persisted");
  const rollSnapshot = {
    ticket: firstClaims[0].ticket_roll,
    ticketItem: firstClaims[0].ticket_item_id,
    awakening: firstClaims[0].awakening_roll,
  };
  const { data: deliveriesBefore } = await admin.from("raid_clear_reward_deliveries").select("item_id,quantity")
    .eq("raid_day_key", firstState.raid_day_key).eq("user_id", userId);
  assert(deliveriesBefore.some((row) => row.item_id === "SKILL_MANUAL" && row.quantity === 1),
    "Guaranteed clear reward missing");

  await Promise.all([
    admin.rpc("grant_canonical_raid_day_clear_reward", { p_instance_id: firstId, p_user_id: userId }),
    admin.rpc("grant_canonical_raid_day_clear_reward", { p_instance_id: firstId, p_user_id: userId }),
  ]);
  const { data: retryClaims } = await admin.from("raid_clear_reward_claims").select("*")
    .eq("raid_day_key", firstState.raid_day_key).eq("user_id", userId);
  const { data: deliveriesAfterRetry } = await admin.from("raid_clear_reward_deliveries").select("item_id,quantity")
    .eq("raid_day_key", firstState.raid_day_key).eq("user_id", userId);
  assert(retryClaims.length === 1
    && retryClaims[0].ticket_roll === rollSnapshot.ticket
    && retryClaims[0].ticket_item_id === rollSnapshot.ticketItem
    && retryClaims[0].awakening_roll === rollSnapshot.awakening
    && deliveriesAfterRetry.length === deliveriesBefore.length, "Clear retry changed roll or delivery");

  await admin.from("raid_bosses").update({ respawn_after: new Date(Date.now() - 1000).toISOString() }).eq("id", firstId);
  const { data: secondId, error: respawnError } = await admin.rpc("respawn_cleared_raid_slot", {
    p_cleared_instance_id: firstId,
  });
  if (respawnError || !secondId) throw respawnError || new Error("Raid respawn failed");
  raidIds.push(secondId);
  const { data: second } = await admin.from("raid_bosses").select("*").eq("id", secondId).single();
  assert(second.id !== firstId
    && second.raid_day_key === firstState.raid_day_key
    && second.raid_variant_id === firstState.raid_variant_id
    && second.max_hp === first.max_hp
    && second.current_hp === first.max_hp, "Same-day respawn inheritance mismatch");

  await admin.from("raid_bosses").update({ current_hp: 1 }).eq("id", secondId);
  const secondBattle = await resolve(secondId, character.id);
  assert(secondBattle.result.remainingBossHp === 0, "Second Raid was not defeated");
  const [{ data: claimsAfterSecond }, { data: deliveriesAfterSecond }] = await Promise.all([
    admin.from("raid_clear_reward_claims").select("*").eq("raid_day_key", firstState.raid_day_key).eq("user_id", userId),
    admin.from("raid_clear_reward_deliveries").select("item_id,quantity").eq("raid_day_key", firstState.raid_day_key).eq("user_id", userId),
  ]);
  assert(claimsAfterSecond.length === 1 && deliveriesAfterSecond.length === deliveriesBefore.length,
    "Respawn clear duplicated daily clear reward");

  await admin.from("raid_bosses").update({ respawn_after: new Date(Date.now() - 1000).toISOString() }).eq("id", secondId);
  const { data: thirdId, error: thirdRespawnError } = await admin.rpc("respawn_cleared_raid_slot", {
    p_cleared_instance_id: secondId,
  });
  if (thirdRespawnError || !thirdId) throw thirdRespawnError || new Error("Second Raid respawn failed");
  raidIds.push(thirdId);
  await admin.from("raid_bosses").update({ current_hp: 1 }).eq("id", thirdId);
  const thirdBattle = await resolve(thirdId, character.id);
  assert(thirdBattle.result.remainingBossHp === 0, "Third Raid was not defeated");
  const [{ data: dailyClaims }, { data: dailyCash }] = await Promise.all([
    admin.from("canonical_daily_activity_claims").select("source_key,reward_payload")
      .eq("user_id", userId).eq("source_key", "RAID_DAILY_3"),
    admin.from("presents").select("quantity").eq("user_id", userId)
      .eq("item_id", "CASH").eq("message", "レイドデイリー報酬"),
  ]);
  assert(dailyClaims.length === 1 && dailyCash.length === 1 && dailyCash[0].quantity === 40,
    "Raid daily three-battle CASH exactly-once mismatch");

  const { data: ranks, error: rankError } = await player.rpc("get_raid_rankings", {
    p_instance_id: thirdId, p_limit: 100, p_offset: 0,
  });
  if (rankError) throw rankError;
  const self = ranks.individual.find((row) => row.user_id === userId);
  assert(self && Number(self.contribution) === Number(firstBattle.result.rawDamage)
    + Number(secondBattle.result.rawDamage) + Number(thirdBattle.result.rawDamage),
    "Daily contribution did not carry across respawn");

  console.log(JSON.stringify({
    projectRef: expectedRef,
    status: "PASS",
    checks: [
      "ACTIVE -> CLEARED", "same-day five-minute respawn contract", "variant/day inheritance",
      "daily clear exactly-once", "roll retry stability", "contribution carryover", "Raid daily CASH 40 exactly-once",
    ],
  }, null, 2));
} finally {
  if (userId) {
    await admin.from("raid_production_reward_grants").delete().eq("user_id", userId);
    await admin.from("raid_damage_logs").delete().eq("user_id", userId);
    await admin.from("raid_instance_user_progress").delete().eq("user_id", userId);
    await admin.from("raid_clear_reward_deliveries").delete().eq("user_id", userId);
    await admin.from("raid_clear_reward_claims").delete().eq("user_id", userId);
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  for (const raidId of raidIds.reverse()) await admin.from("raid_bosses").delete().eq("id", raidId);
}
