import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const username = `NP${Date.now().toString(36).slice(-6)}`.slice(0, 8);
const { data: auth, error: authError } = await client.auth.signInAnonymously();
if (authError || !auth.user || !auth.session) throw authError || new Error("Anonymous sign-in failed.");
const userId = auth.user.id;
const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
if (initializeError) throw initializeError;

const { data: owned, error: ownedError } = await client.from("user_characters")
  .select("id,character_id").eq("user_id", userId).limit(1).single();
if (ownedError || !owned) throw ownedError || new Error("Starter character was not created.");
const { error: deckError } = await client.rpc("save_pvp_defense_deck", {
  p_character_ids: [owned.id],
  p_tactic: "ATTACK_PRIORITY",
});
if (deckError) throw deckError;

const questId = "q_shibuya_2";
const { data: started, error: startError } = await client.rpc("start_patrol", {
  p_course_id: questId,
  p_character_id: owned.id,
});
if (startError || !started?.patrol_id || started.has_battle !== true) {
  throw startError || new Error(`Normal patrol was not assigned a mandatory battle: ${JSON.stringify(started)}`);
}
const { error: instantError } = await client.rpc("complete_patrol_instantly", {
  p_user_id: userId,
  p_patrol_id: started.patrol_id,
  p_use_currency: "FREE_PREOPEN",
});
if (instantError) throw instantError;

const { error: prematureRewardError } = await client.rpc("claim_patrol_rewards", { p_patrol_id: started.patrol_id });
if (!prematureRewardError || !/battle must be resolved/i.test(prematureRewardError.message)) {
  throw new Error(`Unresolved normal battle did not block rewards: ${prematureRewardError?.message || "no error"}`);
}

const { data: replay, error: replayError } = await client.rpc("create_patrol_battle_replay", {
  p_patrol_id: started.patrol_id,
  p_tactic_id: "ATTACK_PRIORITY",
});
if (replayError || !replay?.replay_session_id) throw replayError || new Error("Normal patrol replay was not created.");
const { data: result, error: resolveError } = await client.functions.invoke("resolve-battle", {
  body: { replaySessionId: replay.replay_session_id },
});
if (resolveError || !["PLAYER", "ENEMY"].includes(result?.winner)) {
  throw resolveError || new Error(`Normal patrol result was invalid: ${JSON.stringify(result)}`);
}

const { data: patrol, error: patrolError } = await client.from("user_patrols")
  .select("status,has_battle_event,battle_resolved,battle_result")
  .eq("id", started.patrol_id).single();
if (patrolError) throw patrolError;
const expectedBattleResult = result.winner === "PLAYER" ? "VICTORY" : "DEFEAT";
if (!patrol.battle_resolved || patrol.battle_result !== expectedBattleResult) {
  throw new Error(`Server result was not committed to patrol: ${JSON.stringify(patrol)}`);
}

const { data: reward, error: rewardError } = await client.rpc("claim_patrol_rewards", { p_patrol_id: started.patrol_id });
if (rewardError || reward?.status !== "success") throw rewardError || new Error(`Reward claim failed: ${JSON.stringify(reward)}`);
const { data: completed, error: completedError } = await client.from("user_patrols")
  .select("status").eq("id", started.patrol_id).single();
if (completedError || completed?.status !== "COMPLETED") throw completedError || new Error("Resolved normal patrol was not completed.");

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  userId,
  patrolId: started.patrol_id,
  questId,
  replaySessionId: replay.replay_session_id,
  winner: result.winner,
  rounds: result.rounds,
  battleResult: patrol.battle_result,
  rewardStatus: reward.status,
}, null, 2));
