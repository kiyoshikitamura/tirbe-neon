import { createClient } from "@supabase/supabase-js";

if (typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(".env.preview.local"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceKey || expectedRef !== "sufvuqdnqohpfzkwxohq" || !url.includes(expectedRef)) throw new Error("Refusing non-Preview target.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);
const owner = createClient(url, anonKey, options);
const viewer = createClient(url, anonKey, options);
const ids = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  for (const [client, prefix] of [[owner, "R9O"], [viewer, "R9V"]]) {
    const { data, error } = await client.auth.signInAnonymously();
    if (error || !data.user) throw error || new Error("Preview anonymous auth failed.");
    ids.push(data.user.id);
    const { error: initError } = await client.rpc("initialize_current_player", { p_username: `${prefix}${Date.now().toString(36).slice(-4)}`.slice(0, 8) });
    if (initError) throw initError;
  }
  const bio = "<script>alert(1)</script>\nNEON PROFILE";
  const { data: ownRows, error: ownError } = await owner.from("users").update({ bio }).eq("id", ids[0]).select("id,bio");
  if (ownError) throw ownError;
  assert(ownRows?.length === 1 && ownRows[0].bio === bio, "Owner bio update failed.");

  const { data: forbiddenRows, error: forbiddenError } = await viewer.from("users").update({ bio: "TAKEOVER" }).eq("id", ids[0]).select("id");
  assert(!forbiddenError && (forbiddenRows || []).length === 0, "Other user could update the profile bio.");
  const { data: publicProfile, error: publicError } = await viewer.rpc("get_public_player_detail", { p_user_id: ids[0] });
  if (publicError) throw publicError;
  assert(publicProfile?.bio === bio, "Public profile bio projection mismatch.");
  const forbiddenKeys = ["email", "cash", "neon_diamonds", "auth_provider", "last_sign_in_at", "payment"];
  assert(forbiddenKeys.every((key) => !(key in publicProfile)), "Private field leaked into public profile.");
  console.log(JSON.stringify({ status: "PASS", projectRef: expectedRef, ownerUpdate: true, otherUserUpdateRejected: true, publicProjection: true, plainTextRoundTrip: publicProfile.bio === bio, privateFields: 0 }, null, 2));
} finally {
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.warn(`Preview R9 cleanup failed for ${id}: ${error.message}`);
  }
}
