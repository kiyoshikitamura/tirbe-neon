import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");

const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);
}

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const username = `TP${Date.now().toString(36).slice(-6)}`.slice(0, 8);

const { data: auth, error: authError } = await client.auth.signInAnonymously();
if (authError || !auth.user) throw authError || new Error("Anonymous session was not created.");

const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
if (initializeError) throw initializeError;

for (const [expected, next] of [
  ["WORLD_INTRO", "FREE_GACHA"],
  ["FREE_GACHA", "AUTO_FORMATION"],
  ["AUTO_FORMATION", "DISPATCH"],
]) {
  const { error } = await client.rpc("advance_tutorial_progress", {
    p_expected_step: expected,
    p_next_step: next,
  });
  if (error) throw error;
}

const [{ data: quest, error: questError }, { data: owned, error: ownedError }, { data: beforeUser, error: beforeUserError }] = await Promise.all([
  client.from("quests").select("id").order("duration_seconds").limit(1).single(),
  client.from("user_characters").select("character_id").eq("user_id", auth.user.id).limit(1).single(),
  client.from("users").select("cash").eq("id", auth.user.id).single(),
]);
if (questError) throw questError;
if (ownedError) throw ownedError;
if (beforeUserError) throw beforeUserError;

const { data: started, error: startError } = await client.rpc("start_patrol", {
  p_course_id: quest.id,
  p_character_id: owned.character_id,
});
if (startError || started?.status !== "success") throw startError || new Error(`Unexpected start result: ${JSON.stringify(started)}`);

if (started.tutorial_step !== "FREE_INSTANT") {
  const { error: advanceError } = await client.rpc("advance_tutorial_progress", {
    p_expected_step: "DISPATCH",
    p_next_step: "FREE_INSTANT",
  });
  if (advanceError) throw advanceError;
}

const { data: completed, error: completeError } = await client.rpc("complete_patrol_instantly", {
  p_user_id: auth.user.id,
  p_patrol_id: started.patrol_id,
  p_use_currency: "FREE_TUTORIAL",
});
if (completeError || completed?.status !== "success" || completed?.tutorial_step !== "TUTORIAL_BATTLE") {
  throw completeError || new Error(`Unexpected completion result: ${JSON.stringify(completed)}`);
}

const [{ data: state, error: stateError }, { data: patrol, error: patrolError }, { data: afterUser, error: afterUserError }] = await Promise.all([
  client.rpc("get_current_onboarding_state"),
  client.from("user_patrols").select("status,has_battle_event,battle_resolved").eq("id", started.patrol_id).single(),
  client.from("users").select("cash").eq("id", auth.user.id).single(),
]);
if (stateError) throw stateError;
if (patrolError) throw patrolError;
if (afterUserError) throw afterUserError;
if (state.tutorial_step !== "TUTORIAL_BATTLE") throw new Error(`Unexpected tutorial state: ${JSON.stringify(state)}`);
if (patrol.status !== "CLAIMABLE") throw new Error(`Unexpected patrol state: ${JSON.stringify(patrol)}`);
if (!patrol.has_battle_event) throw new Error("Tutorial patrol did not guarantee a battle event.");
if (Number(afterUser.cash) !== Number(beforeUser.cash)) throw new Error("Tutorial instant completion changed cash.");

const { error: prematureRewardError } = await client.rpc("claim_patrol_rewards", {
  p_patrol_id: started.patrol_id,
});
if (!prematureRewardError || !/battle must be resolved/i.test(prematureRewardError.message)) {
  throw new Error(`Unresolved battle reward was not rejected: ${prematureRewardError?.message || "no error"}`);
}

const { error: duplicateError } = await client.rpc("complete_patrol_instantly", {
  p_user_id: auth.user.id,
  p_patrol_id: started.patrol_id,
  p_use_currency: "FREE_TUTORIAL",
});
if (!duplicateError || !/not eligible/i.test(duplicateError.message)) {
  throw new Error(`Duplicate completion was not rejected: ${duplicateError?.message || "no error"}`);
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  testUserId: auth.user.id,
  username,
  patrolId: started.patrol_id,
  patrolStatus: patrol.status,
  battleGuaranteed: patrol.has_battle_event,
  tutorialStep: state.tutorial_step,
  cashBefore: beforeUser.cash,
  cashAfter: afterUser.cash,
  unresolvedBattleRewardRejected: true,
  duplicateCompletionRejected: true,
}, null, 2));
