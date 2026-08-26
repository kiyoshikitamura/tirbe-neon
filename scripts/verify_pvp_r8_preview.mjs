import { createClient } from "@supabase/supabase-js";

if (typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(".env.preview.local"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceKey || !expectedRef) throw new Error("Missing Preview Supabase configuration.");
const actualRef = new URL(url).hostname.split(".")[0];
if (actualRef !== expectedRef || actualRef !== "sufvuqdnqohpfzkwxohq") throw new Error(`Refusing non-Preview target ${actualRef}.`);

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let userId = "";

try {
  const { data: auth, error: authError } = await client.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous Preview auth failed.");
  userId = auth.user.id;
  const username = `R8${Date.now().toString(36).slice(-5)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  const { data: pages, error: firstPageError } = await client.rpc("get_pvp_opponents_page", { p_user_id: userId, p_my_points: 1000, p_offset: 0 });
  if (firstPageError) throw firstPageError;
  const beforeIds = (pages?.items || []).map((entry) => entry.opponent_user_id);
  const nextOffset = Number(pages?.next_offset || 0);
  const { data: refreshed, error: refreshError } = await client.rpc("get_pvp_opponents_page", { p_user_id: userId, p_my_points: 1000, p_offset: nextOffset });
  if (refreshError) throw refreshError;
  const afterIds = (refreshed?.items || []).map((entry) => entry.opponent_user_id);
  assert(Number(pages?.total_count || 0) >= 10, "Preview candidate population is below ten.");
  assert(beforeIds.length === 5 && afterIds.length === 5, "Pagination did not return two five-candidate pages.");
  assert(beforeIds.every((id) => !afterIds.includes(id)), "Opponent refresh did not replace the candidate IDs.");

  const { data: daily, error: rankError } = await client.rpc("get_public_pvp_rankings", { p_daily: true, p_limit: 100, p_offset: 0 });
  if (rankError) throw rankError;
  const dailyById = new Map((daily || []).map((entry) => [entry.user_id, Number(entry.rank_position)]));
  for (const opponent of [...(pages?.items || []), ...(refreshed?.items || [])]) {
    const expectedRank = dailyById.get(opponent.opponent_user_id);
    assert(expectedRank === undefined ? opponent.opponent_rank == null : Number(opponent.opponent_rank) === expectedRank, `Daily rank mismatch for ${opponent.opponent_user_id}`);
  }

  const [{ error: pointsError }, { error: ticketError }] = await Promise.all([
    admin.from("users").update({ pvp_points: 0 }).eq("id", userId),
    admin.from("user_items").upsert({ user_id: userId, item_id: "PVP_POINT_TICKET", quantity: 2 }),
  ]);
  if (pointsError || ticketError) throw pointsError || ticketError;
  const target = pages.items[0];
  const { error: blockedStartError } = await client.rpc("start_pvp_battle", { p_opponent_user_id: target.opponent_user_id, p_character_ids: [], p_tactic: "ATTACK_PRIORITY" });
  assert(blockedStartError, "Server accepted a PvP start with BP 0.");
  const { data: recovery, error: recoveryError } = await client.rpc("use_action_resource_ticket", { p_item_id: "PVP_POINT_TICKET" });
  if (recoveryError) throw recoveryError;
  assert(Number(recovery?.points) === 1 && Number(recovery?.quantity) === 1, "Ticket did not atomically recover one BP and consume one item.");

  console.log(JSON.stringify({
    projectRef: actualRef,
    status: "PASS",
    candidatePopulation: Number(pages.total_count),
    beforeIds,
    afterIds,
    nextOffset,
    rankParity: true,
    bpZeroServerRejected: true,
    ticketRecovery: { itemId: recovery.item_id, points: recovery.points, remainingQuantity: recovery.quantity },
  }, null, 2));
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`Preview R8 cleanup failed for ${userId}: ${error.message}`);
  }
}
