import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceKey || expectedRef !== "sufvuqdnqohpfzkwxohq") throw new Error("Preview configuration required");
if (new URL(url).hostname.split(".")[0] !== expectedRef) throw new Error("Unexpected Supabase target");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];
const assert = (value, message) => { if (!value) throw new Error(message); };

async function player(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error } = await client.auth.signInAnonymously();
  if (error || !auth.user) throw error || new Error("Anonymous auth failed");
  users.push(auth.user.id);
  const init = await client.rpc("initialize_current_player", {
    p_username: `${prefix}${Date.now().toString(36).slice(-6)}`.slice(0, 8),
  });
  if (init.error) throw init.error;
  const { data: character, error: characterError } = await admin.from("user_characters").insert({
    user_id: auth.user.id, character_id: "char_reiji_01", level: 5, awakening_level: 0,
  }).select("id").single();
  if (characterError) throw characterError;
  return { client, id: auth.user.id, characterId: character.id };
}

try {
  const attacker = await player("CA");
  const defender = await player("CD");
  const defense = await defender.client.rpc("save_pvp_defense_deck", {
    p_character_ids: [defender.characterId], p_tactic: "BALANCED",
  });
  if (defense.error) throw defense.error;
  await admin.from("users").update({ pvp_points: 5, cash: 0 }).eq("id", attacker.id);
  await admin.from("user_characters").update({ level: 100 }).eq("id", attacker.characterId);

  const replayIds = [];
  for (let index = 0; index < 3; index += 1) {
    const started = await attacker.client.rpc("start_pvp_battle", {
      p_opponent_user_id: defender.id,
      p_character_ids: [attacker.characterId],
      p_tactic: "ATTACK_PRIORITY",
    });
    if (started.error) throw started.error;
    replayIds.push(started.data.replay_session_id);
    const resolved = await attacker.client.functions.invoke("resolve-battle", {
      body: { replaySessionId: started.data.replay_session_id },
    });
    if (resolved.error) throw resolved.error;
    assert(resolved.data.rewards?.cash === 0, "Individual PvP battle retained legacy CASH");
  }

  const retry = await attacker.client.functions.invoke("resolve-battle", {
    body: { replaySessionId: replayIds[2] },
  });
  if (retry.error) throw retry.error;
  const [{ data: claims }, { data: cash }, { data: individualCash }] = await Promise.all([
    admin.from("canonical_daily_activity_claims").select("source_key,reward_payload")
      .eq("user_id", attacker.id).eq("source_key", "PVP_DAILY_3"),
    admin.from("presents").select("quantity").eq("user_id", attacker.id)
      .eq("item_id", "CASH").eq("message", "PvPデイリー報酬"),
    admin.from("presents").select("quantity").eq("user_id", attacker.id)
      .eq("item_id", "CASH").neq("message", "PvPデイリー報酬"),
  ]);
  assert(claims.length === 1 && cash.length === 1 && cash[0].quantity === 40,
    "PvP daily three-battle CASH exactly-once mismatch");
  assert(individualCash.length === 0, "Legacy PvP CASH present remains active");

  console.log(JSON.stringify({
    projectRef: expectedRef,
    status: "PASS",
    checks: ["three finalized battles", "daily CASH 40", "retry exactly-once", "individual CASH zero"],
  }, null, 2));
} finally {
  for (const userId of users.reverse()) {
    await admin.from("pvp_defense_logs").delete().or(`user_id.eq.${userId},attacker_id.eq.${userId}`);
    await admin.from("pvp_ranking_reward_grants").delete().eq("user_id", userId);
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}
