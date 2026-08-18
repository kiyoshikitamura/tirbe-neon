import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
const state = JSON.parse(await readFile(".login-bonus-e2e-state.json", "utf8"));
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (!url || !anonKey || actualProjectRef !== expectedProjectRef || state.projectRef !== expectedProjectRef) throw new Error("Refusing mismatched Supabase target.");

const player = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: sessionError } = await player.auth.setSession({
  access_token: state.player.accessToken,
  refresh_token: state.player.refreshToken,
});
if (sessionError) throw sessionError;

const { data: claim, error: claimError } = await player.rpc("process_login_bonus");
if (claimError || !claim?.claimed || claim.current_step !== 1 || claim.total_logins !== 31 || claim.reward?.day_number !== 1) {
  throw claimError || new Error(`30-to-1 loop mismatch: ${JSON.stringify(claim)}`);
}

const { data: presents, error: presentsError } = await player
  .from("presents").select("id,item_id,quantity,status").eq("user_id", state.player.userId);
if (presentsError || presents?.length !== 2) throw presentsError || new Error(`Expected two login presents: ${JSON.stringify(presents)}`);

const { data: retry, error: retryError } = await player.rpc("process_login_bonus");
if (retryError || retry?.claimed || !retry?.already_claimed || retry.current_step !== 1 || retry.total_logins !== 31) {
  throw retryError || new Error("Post-loop retry was not idempotent.");
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  playerUserId: state.player.userId,
  loop30To1: true,
  totalLogins31: true,
  secondPresentCreated: true,
  postLoopRetryIdempotent: true,
}, null, 2));

process.exit(0);
