import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");

const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);
}

const createAnonymousPlayer = async (prefix) => {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const username = `${prefix}${Date.now().toString(36).slice(-6)}`.slice(0, 8);
  const { data: auth, error: authError } = await client.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous session was not created.");
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  return { client, userId: auth.user.id, username };
};

const owner = await createAnonymousPlayer("PR");
const [{ data: quests, error: questError }, { data: owned, error: ownedError }] = await Promise.all([
  owner.client.from("quests").select("id,cash_reward,exp_reward,duration_seconds").order("duration_seconds"),
  owner.client.from("user_characters").select("id,character_id").eq("user_id", owner.userId).limit(1).single(),
]);
if (questError) throw questError;
if (ownedError) throw ownedError;

const quest = quests[0];
if (!quest) throw new Error("No released quest is available for reward verification.");

const { data: started, error: startError } = await owner.client.rpc("start_patrol", {
  p_course_id: quest.id,
  p_character_id: owned.id,
});
if (startError || started?.status !== "success" || started?.has_battle !== true) {
  throw startError || new Error(`Unexpected patrol start: ${JSON.stringify(started)}`);
}

const { data: completed, error: completeError } = await owner.client.rpc("complete_patrol_instantly", {
  p_user_id: owner.userId,
  p_patrol_id: started.patrol_id,
  p_use_currency: "CASH",
});
if (completeError || completed?.status !== "success") throw completeError || new Error("Instant completion failed.");

const { error: prematureRewardError } = await owner.client.rpc("claim_patrol_rewards", {
  p_patrol_id: started.patrol_id,
});
if (!prematureRewardError || !/battle must be resolved/i.test(prematureRewardError.message)) {
  throw new Error(`Unresolved battle did not block rewards: ${prematureRewardError?.message || "no error"}`);
}

const { data: replay, error: replayError } = await owner.client.rpc("create_patrol_battle_replay", {
  p_patrol_id: started.patrol_id,
  p_tactic_id: "ATTACK_PRIORITY",
});
if (replayError || !replay?.replay_session_id) throw replayError || new Error("Patrol replay was not created.");
const { data: battleResult, error: resolveError } = await owner.client.functions.invoke("resolve-battle", {
  body: { replaySessionId: replay.replay_session_id },
});
if (resolveError || !["PLAYER", "ENEMY"].includes(battleResult?.winner)) {
  throw resolveError || new Error(`Patrol battle was not resolved: ${JSON.stringify(battleResult)}`);
}

const { data: reward, error: rewardError } = await owner.client.rpc("claim_patrol_rewards", {
  p_patrol_id: started.patrol_id,
});
if (rewardError || reward?.status !== "success") throw rewardError || new Error(`Unexpected reward: ${JSON.stringify(reward)}`);

const [{ data: patrol, error: patrolError }, { data: presents, error: presentsError }] = await Promise.all([
  owner.client.from("user_patrols").select("status,rewards_accrued").eq("id", started.patrol_id).single(),
  owner.client.from("presents").select("item_id,quantity,message").eq("user_id", owner.userId).eq("status", "UNCLAIMED"),
]);
if (patrolError) throw patrolError;
if (presentsError) throw presentsError;
if (patrol.status !== "COMPLETED") throw new Error(`Patrol was not completed: ${JSON.stringify(patrol)}`);
const cashPresent = presents.find((present) => present.item_id === "CASH" && present.message?.startsWith("クエスト報酬:"));
if (!cashPresent || Number(cashPresent.quantity) !== Number(reward.cash)) {
  throw new Error(`Cash present mismatch: ${JSON.stringify({ cashPresent, reward })}`);
}

const presentCount = presents.length;
const { error: duplicateError } = await owner.client.rpc("claim_patrol_rewards", { p_patrol_id: started.patrol_id });
if (!duplicateError || !/already claimed/i.test(duplicateError.message)) {
  throw new Error(`Duplicate claim was not rejected: ${duplicateError?.message || "no error"}`);
}
const { count: countAfterDuplicate, error: countError } = await owner.client
  .from("presents")
  .select("id", { count: "exact", head: true })
  .eq("user_id", owner.userId)
  .eq("status", "UNCLAIMED");
if (countError) throw countError;
if (countAfterDuplicate !== presentCount) throw new Error("Duplicate claim changed the present count.");

const foreign = await createAnonymousPlayer("PF");
const { error: foreignError } = await foreign.client.rpc("claim_patrol_rewards", { p_patrol_id: started.patrol_id });
if (!foreignError || !/patrol not found/i.test(foreignError.message)) {
  throw new Error(`Foreign claim was not rejected: ${foreignError?.message || "no error"}`);
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  ownerUserId: owner.userId,
  foreignUserId: foreign.userId,
  patrolId: started.patrol_id,
  questId: quest.id,
  patrolStatus: patrol.status,
  rewardCash: reward.cash,
  rewardXp: reward.xp,
  battleWinner: battleResult.winner,
  presentCount,
  duplicateClaimRejected: true,
  foreignClaimRejected: true,
}, null, 2));
