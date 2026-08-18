import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

async function createQaPlayer(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error || new Error("Anonymous QA user creation failed.");
  const username = `${prefix}${Date.now().toString(36).slice(-5)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  return { client, userId: data.user.id, username };
}

const player = await createQaPlayer("MS");
const observer = await createQaPlayer("MO");
await writeFile(".mission-e2e-state.json", JSON.stringify({
  projectRef: actualProjectRef,
  player: { userId: player.userId, username: player.username },
  observer: { userId: observer.userId, username: observer.username },
}, null, 2), { mode: 0o600 });

const { data: syncResult, error: syncError } = await player.client.rpc("sync_current_missions");
if (syncError || !syncResult?.cycle_date) throw syncError || new Error("Mission sync result mismatch.");

const { data: assigned, error: assignedError } = await player.client
  .from("user_missions")
  .select("mission_id,status,current_progress,cycle_date,missions!inner(category,display_order,is_enabled)")
  .eq("user_id", player.userId)
  .eq("missions.is_enabled", true);
if (assignedError) throw assignedError;
if (assigned.length !== 10) throw new Error(`Expected 10 root assignments, received ${assigned.length}.`);
const daily = assigned.filter((row) => row.missions.category === "DAILY");
const normalRoots = assigned.filter((row) => row.missions.category === "NORMAL");
const login = assigned.find((row) => row.mission_id === "ob_daily_login_01");
if (daily.length !== 4 || normalRoots.length !== 6 || login?.status !== "CLEAR" || login.current_progress !== 1) {
  throw new Error(`Root assignment state mismatch: ${JSON.stringify(assigned)}`);
}

const { error: directProgressError } = await player.client
  .from("user_missions").update({ current_progress: 999 }).eq("user_id", player.userId);
if (!directProgressError) throw new Error("Direct mission progress mutation unexpectedly succeeded.");

const { data: foreignRows, error: foreignError } = await observer.client
  .from("user_missions").select("id").eq("user_id", player.userId);
if (foreignError || foreignRows.length !== 0) throw foreignError || new Error("Observer read another user's missions.");

const { data: claimResult, error: claimError } = await player.client.rpc("claim_mission_reward", {
  p_mission_id: "ob_daily_login_01",
});
if (claimError || !claimResult?.claimed || claimResult.item_id !== "CHAR_EXP_S" || claimResult.quantity !== 5) {
  throw claimError || new Error(`Mission claim mismatch: ${JSON.stringify(claimResult)}`);
}
const { error: duplicateClaimError } = await player.client.rpc("claim_mission_reward", {
  p_mission_id: "ob_daily_login_01",
});
if (!duplicateClaimError) throw new Error("Duplicate mission claim unexpectedly succeeded.");

const { data: presents, error: presentsError } = await player.client
  .from("presents").select("id,item_id,quantity,status").eq("user_id", player.userId).eq("item_id", "CHAR_EXP_S");
if (presentsError || presents.length !== 1 || presents[0].quantity !== 5 || presents[0].status !== "UNCLAIMED") {
  throw presentsError || new Error(`Mission present mismatch: ${JSON.stringify(presents)}`);
}

const { error: presentClaimError } = await player.client.rpc("claim_present", { p_present_id: presents[0].id });
if (presentClaimError) throw presentClaimError;
const { data: item, error: itemError } = await player.client
  .from("user_items").select("quantity").eq("user_id", player.userId).eq("item_id", "CHAR_EXP_S").single();
if (itemError || item.quantity < 5) throw itemError || new Error("Mission item reward was not granted as an item.");

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  player: { userId: player.userId, username: player.username },
  observer: { userId: observer.userId, username: observer.username },
  rootAssignments: { daily: daily.length, normal: normalRoots.length },
  dailyLoginAutoClear: true,
  directProgressDenied: true,
  otherUserReadDenied: true,
  atomicClaimAndDuplicateGuard: true,
  presentItemGrant: { itemId: "CHAR_EXP_S", quantity: item.quantity },
  cleanup: "Delete both QA auth users in Dashboard after verification.",
}, null, 2));
