import { createClient } from "@supabase/supabase-js";

if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.preview.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceRoleKey || !expectedRef) throw new Error("Missing Preview Supabase configuration.");
const actualRef = new URL(url).hostname.split(".")[0];
if (actualRef !== expectedRef) throw new Error(`Refusing unexpected Supabase target ${actualRef}.`);

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const createdUserIds = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function createPlayer(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await client.auth.signInAnonymously();
  if (authError || !auth.user || !auth.session) throw authError || new Error("Anonymous sign-in failed.");
  createdUserIds.push(auth.user.id);
  const username = `${prefix}${Date.now().toString(36).slice(-6)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  const { data: characters, error: characterError } = await client.from("user_characters").select("id,character_id");
  if (characterError || !characters?.[0]) throw characterError || new Error("Starter character missing.");
  return { client, userId: auth.user.id, username, character: characters[0] };
}

try {
  const attacker = await createPlayer("PA");
  const defender = await createPlayer("PD");
  const { error: deckError } = await defender.client.rpc("save_pvp_defense_deck", {
    p_character_ids: [defender.character.id],
    p_tactic: "BALANCED",
  });
  if (deckError) throw deckError;
  const [{ error: prepError }, { error: attackerLevelError }] = await Promise.all([
    admin.from("users").update({ pvp_points: 5, cash: 1000 }).eq("id", attacker.userId),
    admin.from("user_characters").update({ level: 100 }).eq("id", attacker.character.id),
  ]);
  if (prepError || attackerLevelError) throw prepError || attackerLevelError;

  const { data: started, error: startError } = await attacker.client.rpc("start_pvp_battle", {
    p_opponent_user_id: defender.userId,
    p_character_ids: [attacker.character.id],
    p_tactic: "ATTACK_PRIORITY",
  });
  if (startError) throw startError;
  assert(started?.replay_session_id, "Official PvP replay was not created.");
  assert(started.remaining_pvp_points === 4, "PvP point was not consumed atomically.");
  assert(started.player_snapshot?.[0]?.id?.includes(attacker.character.id), "Server player snapshot is not canonical.");
  assert(started.enemy_snapshot?.[0]?.id?.includes(defender.character.id), "Server enemy snapshot is not canonical.");

  const { data: resolved, error: resolveError } = await attacker.client.functions.invoke("resolve-battle", {
    body: { replaySessionId: started.replay_session_id },
  });
  if (resolveError) {
    const detail = await resolveError.context?.json?.().catch(() => null);
    throw new Error(`resolve-battle failed: ${JSON.stringify(detail)}`);
  }
  assert(["PLAYER", "ENEMY"].includes(resolved?.winner), "Server did not return a PvP winner.");
  assert(Number.isInteger(resolved?.rankDelta), "Server rank delta is missing.");
  assert(resolved?.rewards && Number.isInteger(resolved.rewards.cash), "Server reward snapshot is missing.");
  assert(resolved.winner === "PLAYER" && resolved.rewards.cash > 0, "Deterministic victory fixture did not grant the server PvP reward.");

  const [{ data: replay }, { data: rank }, { data: afterUser }] = await Promise.all([
    admin.from("battle_replay_sessions").select("status,finalization_status,result").eq("id", started.replay_session_id).single(),
    admin.from("pvp_ranks").select("rank_points,daily_wins,season_wins").eq("user_id", attacker.userId).single(),
    admin.from("users").select("cash,pvp_points,level,xp").eq("id", attacker.userId).single(),
  ]);
  assert(replay?.status === "RESOLVED" && replay?.finalization_status === "FINALIZED", "Replay was not atomically finalized.");
  assert(afterUser?.pvp_points === 4, "Finalization changed the already committed PvP cost.");
  assert(afterUser?.level === 5 && afterUser?.xp === 0, "First PvP did not grant exactly the XP needed for Lv5.");

  const beforeRetry = JSON.stringify({ rank, cash: afterUser.cash, points: afterUser.pvp_points });
  const { data: retried, error: retryError } = await attacker.client.functions.invoke("resolve-battle", {
    body: { replaySessionId: started.replay_session_id },
  });
  if (retryError) throw retryError;
  const [{ data: rankAfterRetry }, { data: userAfterRetry }] = await Promise.all([
    admin.from("pvp_ranks").select("rank_points,daily_wins,season_wins").eq("user_id", attacker.userId).single(),
    admin.from("users").select("cash,pvp_points,level,xp").eq("id", attacker.userId).single(),
  ]);
  assert(JSON.stringify({ rank: rankAfterRetry, cash: userAfterRetry.cash, points: userAfterRetry.pvp_points }) === beforeRetry,
    "Retry duplicated PvP rank, reward, or point consumption.");
  assert(JSON.stringify(retried) === JSON.stringify(resolved), "Retry did not return the stored authoritative result.");

  const { error: consumerFinalizeError } = await attacker.client.rpc("finalize_pvp_battle", {
    p_replay_id: started.replay_session_id,
    p_result: { winner: "PLAYER", rounds: 1, events: [], playerRawDamage: 999999, enemyRawDamage: 0 },
  });
  assert(consumerFinalizeError, "Authenticated consumer unexpectedly finalized a PvP result.");
  const { error: legacyError } = await attacker.client.rpc("process_pvp_match_result_v2", {
    p_user_id: attacker.userId, p_is_win: true, p_point_diff: 999999, p_cash_reward: 999999,
  });
  assert(legacyError, "Retired client-authored PvP result RPC unexpectedly executed.");

  const { data: beforeInvalid } = await admin.from("users").select("pvp_points").eq("id", attacker.userId).single();
  const { error: foreignCharacterError } = await attacker.client.rpc("start_pvp_battle", {
    p_opponent_user_id: defender.userId,
    p_character_ids: [defender.character.id],
    p_tactic: "ATTACK_PRIORITY",
  });
  assert(foreignCharacterError, "PvP accepted an unowned attack character.");
  const { error: selfBattleError } = await attacker.client.rpc("start_pvp_battle", {
    p_opponent_user_id: attacker.userId,
    p_character_ids: [attacker.character.id],
    p_tactic: "ATTACK_PRIORITY",
  });
  assert(selfBattleError, "PvP accepted a self battle.");
  const { data: afterInvalid } = await admin.from("users").select("pvp_points").eq("id", attacker.userId).single();
  assert(afterInvalid.pvp_points === beforeInvalid.pvp_points, "Rejected starts consumed PvP points.");

  console.log(JSON.stringify({
    projectRef: actualRef,
    status: "PASS",
    replayId: started.replay_session_id,
    winner: resolved.winner,
    rankDelta: resolved.rankDelta,
    reward: resolved.rewards,
    checks: [
      "server snapshots", "atomic point consumption", "service-only finalize", "stored retry result",
      "no duplicate rank/reward", "first PvP reaches Lv5 once", "foreign character denied", "self battle denied", "legacy result RPC denied",
    ],
  }, null, 2));
} finally {
  for (const userId of createdUserIds.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`Failed to delete Preview QA user ${userId}: ${error.message}`);
  }
}
