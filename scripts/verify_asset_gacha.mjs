import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_TEST_EMAIL;
const password = process.env.SUPABASE_TEST_PASSWORD;

if (!url || !anonKey || !email || !password) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD.");
}

const client = createClient(url, anonKey);
const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
if (authError || !auth.user) throw authError || new Error("Test user sign-in failed");

const { data, error } = await client.rpc("execute_asset_gacha", {
  p_user_id: auth.user.id,
  p_gacha_id: "SKILL_NORMAL",
  p_pull_count: 0,
  p_currency_type: "free"
});

if (!error && !data?.error) {
  throw new Error("Invalid pull-count smoke test unexpectedly succeeded");
}

console.log("Asset gacha auth/RPC smoke test passed: invalid pull count was rejected.");
await client.auth.signOut();
