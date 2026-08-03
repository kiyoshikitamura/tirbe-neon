import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_TEST_EMAIL",
  "SUPABASE_TEST_PASSWORD",
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const { error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.SUPABASE_TEST_EMAIL,
  password: process.env.SUPABASE_TEST_PASSWORD,
});
if (authError) throw authError;

const { data: userData, error: userError } = await supabase.auth.getUser();
if (userError || !userData.user) throw userError || new Error("No authenticated user");

const tables = [
  "user_avatar_parts",
  "user_avatars",
  "user_login_bonuses",
  "user_missions",
  "user_patrols",
  "payment_transactions",
  "presents",
];
const foreignUserId = "00000000-0000-0000-0000-000000000000";
for (const table of tables) {
  const { error } = await supabase.from(table).select("user_id").eq("user_id", foreignUserId).limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
}

const { data: rankings, error: rankingError } = await supabase.rpc("get_public_power_rankings");
if (rankingError || !Array.isArray(rankings)) {
  throw rankingError || new Error("Public ranking RPC did not return an array");
}

console.log(`Owner RLS smoke test passed for ${tables.length} tables.`);
