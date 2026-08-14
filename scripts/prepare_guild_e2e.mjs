import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceRoleKey || !expectedProjectRef) throw new Error("Missing Supabase Preview QA configuration.");
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
    userId: data.user.id,
    username,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

const leader = await createQaPlayer("GL");
const applicant = await createQaPlayer("GA");
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const [{ error: leaderPreparationError }, { error: applicantPreparationError }] = await Promise.all([
  admin.from("users").update({ level: 8 }).eq("id", leader.userId),
  admin.from("users").update({ level: 3 }).eq("id", applicant.userId),
]);
if (leaderPreparationError || applicantPreparationError) {
  throw leaderPreparationError || applicantPreparationError;
}
await writeFile(".guild-e2e-state.json", JSON.stringify({ projectRef: actualProjectRef, leader, applicant }, null, 2), { mode: 0o600 });

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  leader: { userId: leader.userId, username: leader.username },
  applicant: { userId: applicant.userId, username: applicant.username },
  preparation: "Preview-only service role raised the two disposable players to the minimum guild levels.",
  next: "Run verify_guild_membership_db.mjs or verify_guild_chat_db.mjs",
}, null, 2));
