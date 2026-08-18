import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");

const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const owner = createClient(url, anonKey, clientOptions);
const attacker = createClient(url, anonKey, clientOptions);
const canonicalUsername = `N${Date.now().toString(36).slice(-6)}`.slice(0, 8).toUpperCase();

const { data: ownerAuth, error: ownerAuthError } = await owner.auth.signInAnonymously();
if (ownerAuthError || !ownerAuth.user) throw ownerAuthError || new Error("Owner session was not created.");
const { error: ownerInitError } = await owner.rpc("initialize_current_player", { p_username: canonicalUsername });
if (ownerInitError) throw ownerInitError;

const { data: attackerAuth, error: attackerAuthError } = await attacker.auth.signInAnonymously();
if (attackerAuthError || !attackerAuth.user) throw attackerAuthError || new Error("Attacker session was not created.");

const { error: duplicateError } = await attacker.rpc("initialize_current_player", {
  p_username: ` ${canonicalUsername.toLowerCase()} `,
});
if (!duplicateError || duplicateError.code !== "23505") {
  throw new Error(`Normalized duplicate username was not rejected: ${duplicateError?.message || "no error"}`);
}

const [{ data: foreignProfile, error: profileError }, { data: foreignCharacters, error: characterError }] = await Promise.all([
  attacker.from("users").select("id,username").eq("id", ownerAuth.user.id),
  attacker.from("user_characters").select("user_id,character_id").eq("user_id", ownerAuth.user.id),
]);
if (profileError) throw profileError;
if (characterError) throw characterError;
if (foreignProfile.length !== 0 || foreignCharacters.length !== 0) {
  throw new Error("Another anonymous user could read owner data through direct tables.");
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  ownerTestUserId: ownerAuth.user.id,
  attackerTestUserId: attackerAuth.user.id,
  username: canonicalUsername,
  checks: ["normalized duplicate rejected", "foreign profile hidden", "foreign characters hidden"],
}, null, 2));
