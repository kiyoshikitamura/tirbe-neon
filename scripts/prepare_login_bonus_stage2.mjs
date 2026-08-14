import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
const state = JSON.parse(await readFile(".login-bonus-e2e-state.json", "utf8"));
if (!url || !serviceRoleKey || !expectedProjectRef) throw new Error("Missing Supabase Preview QA configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef || state.projectRef !== expectedProjectRef) {
  throw new Error("Refusing mismatched Supabase target.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { error } = await admin
  .from("user_login_bonuses")
  .update({ current_day: 30, total_logins: 30, last_claimed_at: yesterday })
  .eq("user_id", state.player.userId);
if (error) throw error;

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  playerUserId: state.player.userId,
  preparation: "Preview-only service role advanced the disposable player to the day-30 rollover boundary.",
}, null, 2));
