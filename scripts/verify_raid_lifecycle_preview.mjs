import { createClient } from "@supabase/supabase-js";

if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.preview.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceRoleKey || !expectedRef) throw new Error("Missing Preview configuration.");
if (new URL(url).hostname.split(".")[0] !== expectedRef) throw new Error("Refusing unexpected Supabase target.");

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const player = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const instanceIds = [];
let userId = null;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function createInstance(currentHp, maxHp, baseId) {
  const { data, error } = await admin.from("raid_bosses").insert({
    boss_id: "BOSS_001",
    boss_master_id: "BOSS_001",
    current_hp: currentHp,
    max_hp: maxHp,
    base_id: baseId,
    status: "ACTIVE",
    spawned_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }).select("id").single();
  if (error) throw error;
  instanceIds.push(data.id);
  return data.id;
}

async function startAndResolve(instanceId, characterId) {
  const { data: started, error: startError } = await player.rpc("start_raid_battle", {
    p_instance_id: instanceId,
    p_character_ids: [characterId],
    p_tactic: "ATTACK_PRIORITY",
  });
  if (startError) throw startError;
  const { data: result, error: resolveError } = await player.functions.invoke("resolve-battle", {
    body: { replaySessionId: started.replay_session_id },
  });
  if (resolveError) throw resolveError;
  return { started, result };
}

try {
  const { data: auth, error: authError } = await player.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous sign-in failed.");
  userId = auth.user.id;
  const { error: initError } = await player.rpc("initialize_current_player", { p_username: `RL${Date.now().toString(36).slice(-6)}`.slice(0, 8) });
  if (initError) throw initError;
  const { error: levelError } = await admin.from("users").update({ level: 5 }).eq("id", userId);
  if (levelError) throw levelError;
  const { data: characters, error: characterError } = await player.from("user_characters").select("id").limit(1);
  if (characterError || !characters?.[0]) throw characterError || new Error("Starter character missing.");

  const defeatedId = await createInstance(1, 1, "p0_e2e_defeat");
  const defeated = await startAndResolve(defeatedId, characters[0].id);
  const { data: defeatedState } = await admin.from("raid_bosses").select("status,outcome,outcome_finalized_at").eq("id", defeatedId).single();
  assert(defeated.result?.remainingBossHp === 0, "Defeat fixture was not reduced to zero HP.");
  assert(defeatedState?.status === "DEFEATED" && defeatedState?.outcome === "DEFEAT_SUCCESS" && defeatedState.outcome_finalized_at, "Defeat lifecycle was not finalized.");
  const { count: defeatRewardCount } = await admin.from("raid_reward_grants").select("reward_id", { count: "exact", head: true })
    .eq("raid_boss_instance_id", defeatedId).eq("user_id", userId).eq("reward_reason", "DEFEAT");
  assert(Number(defeatRewardCount) > 0, "Defeat reward was not granted server-side.");

  const expiredId = await createInstance(999999999, 999999999, "p0_e2e_timeout");
  await startAndResolve(expiredId, characters[0].id);
  const { error: expireUpdateError } = await admin.from("raid_bosses").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", expiredId);
  if (expireUpdateError) throw expireUpdateError;
  const { error: expireError } = await admin.rpc("finalize_expired_raid_instance", { p_instance_id: expiredId });
  if (expireError) throw expireError;
  const { data: expiredState } = await admin.from("raid_bosses").select("status,outcome,outcome_finalized_at").eq("id", expiredId).single();
  assert(expiredState?.status === "EXPIRED" && expiredState?.outcome === "TIMEOUT_FAILURE" && expiredState.outcome_finalized_at, "Timeout lifecycle was not finalized.");
  const { count: failureRewardCountBefore } = await admin.from("raid_reward_grants").select("reward_id", { count: "exact", head: true })
    .eq("raid_boss_instance_id", expiredId).eq("user_id", userId).eq("reward_reason", "FAILURE");
  assert(Number(failureRewardCountBefore) > 0, "Timeout participation reward was not granted server-side.");
  await admin.rpc("finalize_expired_raid_instance", { p_instance_id: expiredId });
  const { count: failureRewardCountAfter } = await admin.from("raid_reward_grants").select("reward_id", { count: "exact", head: true })
    .eq("raid_boss_instance_id", expiredId).eq("user_id", userId).eq("reward_reason", "FAILURE");
  assert(failureRewardCountAfter === failureRewardCountBefore, "Timeout retry duplicated rewards.");

  console.log(JSON.stringify({
    projectRef: expectedRef,
    status: "PASS",
    checks: ["boss defeat finalization", "defeat reward", "24h timeout finalization", "failure reward", "timeout idempotency"],
  }, null, 2));
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (instanceIds.length > 0) await admin.from("raid_bosses").delete().in("id", instanceIds);
}
