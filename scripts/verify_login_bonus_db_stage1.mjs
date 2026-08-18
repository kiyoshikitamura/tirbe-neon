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
  if (error || !data.user || !data.session) throw error || new Error("Anonymous QA user creation failed.");
  const username = `${prefix}${Date.now().toString(36).slice(-5)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  return {
    client, userId: data.user.id, username,
    accessToken: data.session.access_token, refreshToken: data.session.refresh_token,
  };
}

const player = await createQaPlayer("LB");
const observer = await createQaPlayer("LO");
await writeFile(".login-bonus-e2e-state.json", JSON.stringify({
  projectRef: actualProjectRef,
  player: { userId: player.userId, username: player.username, accessToken: player.accessToken, refreshToken: player.refreshToken },
  observer: { userId: observer.userId, username: observer.username },
}, null, 2), { mode: 0o600 });

const { data: firstClaim, error: firstClaimError } = await player.client.rpc("process_login_bonus");
if (firstClaimError || !firstClaim?.claimed || firstClaim.current_step !== 1 || firstClaim.total_logins !== 1 || !firstClaim.reward) {
  throw firstClaimError || new Error(`Initial login claim mismatch: ${JSON.stringify(firstClaim)}`);
}

const [{ data: retryOne, error: retryOneError }, { data: retryTwo, error: retryTwoError }] = await Promise.all([
  player.client.rpc("process_login_bonus"),
  player.client.rpc("process_login_bonus"),
]);
if (retryOneError || retryTwoError || retryOne?.claimed || retryTwo?.claimed || !retryOne?.already_claimed || !retryTwo?.already_claimed) {
  throw retryOneError || retryTwoError || new Error("Same-day login bonus retry was not idempotent.");
}

const { data: presents, error: presentsError } = await player.client
  .from("presents").select("id,item_id,quantity,status,message").eq("user_id", player.userId);
if (presentsError || presents?.length !== 1 || presents[0].status !== "UNCLAIMED") {
  throw presentsError || new Error(`Login present count mismatch: ${JSON.stringify(presents)}`);
}

const { data: ownState, error: ownStateError } = await player.client
  .from("user_login_bonuses").select("current_day,total_logins,last_claimed_at").eq("user_id", player.userId).single();
if (ownStateError || ownState.current_day !== 1 || ownState.total_logins !== 1) throw ownStateError || new Error("Login state mismatch.");

const { error: directStateUpdateError } = await player.client
  .from("user_login_bonuses").update({ current_day: 30 }).eq("user_id", player.userId);
const { error: directPresentInsertError } = await player.client.from("presents").insert({
  user_id: player.userId, item_id: "DIAMOND", quantity: 999999, status: "UNCLAIMED",
});
if (!directStateUpdateError || !directPresentInsertError) throw new Error("Direct login state or present mutation unexpectedly succeeded.");

const { data: foreignState, error: foreignStateError } = await observer.client
  .from("user_login_bonuses").select("user_id").eq("user_id", player.userId);
const { data: foreignPresents, error: foreignPresentsError } = await observer.client
  .from("presents").select("id").eq("user_id", player.userId);
if (foreignStateError || foreignPresentsError || foreignState?.length !== 0 || foreignPresents?.length !== 0) {
  throw foreignStateError || foreignPresentsError || new Error("Observer could read another user's login rewards.");
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  player: { userId: player.userId, username: player.username },
  observer: { userId: observer.userId, username: observer.username },
  initialClaim: true,
  sameDayIdempotency: true,
  exactlyOnePresent: true,
  directMutationDenied: true,
  otherUserReadDenied: true,
  next: "Set only the QA player to day 30 / previous JST date, then run stage 2.",
}, null, 2));

process.exit(0);
