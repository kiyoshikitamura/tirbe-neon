import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const PREVIEW_REF = "sufvuqdnqohpfzkwxohq";
assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, PREVIEW_REF, "Preview project guard failed");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
assert.equal(new URL(url).hostname, `${PREVIEW_REF}.supabase.co`, "Preview URL mismatch");
assert.ok(anonKey && serviceKey, "Preview anon and service keys are required");

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: anonymous, error: anonymousError } = await client.auth.signInAnonymously();
assert.ifError(anonymousError);
const userId = anonymous.user?.id;
assert.ok(userId && anonymous.user?.is_anonymous, "Fresh Preview anonymous session was not created");

try {
  const username = `SW${Date.now().toString(36).slice(-6)}`;
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  assert.ifError(initializeError);
  const { data: before } = await admin.from("users").select("id,username").eq("id", userId).maybeSingle();
  assert.equal(before?.username, username);
  const { error: characterFixtureError } = await admin.from("user_characters").insert({
    user_id: userId,
    character_id: "char_reiji_01",
    level: 1,
    awakening_level: 0,
  });
  assert.ifError(characterFixtureError);
  const { data: ownedCharacters, error: ownedCharactersError } = await admin
    .from("user_characters")
    .select("id")
    .eq("user_id", userId);
  assert.ifError(ownedCharactersError);
  assert.ok((ownedCharacters || []).length > 0, "Fixture must exercise owned-character delete triggers");
  const { data: powerProjection, error: powerProjectionError } = await admin
    .from("user_power_rankings")
    .select("user_id,total_power")
    .eq("user_id", userId)
    .maybeSingle();
  assert.ifError(powerProjectionError);
  assert.equal(powerProjection?.user_id, userId, "Fixture must exercise ranking projection cleanup");

  const { data: discarded, error: discardError } = await client.rpc("discard_current_anonymous_account_for_switch");
  assert.ifError(discardError);
  assert.deepEqual(discarded, { status: "DISCARDED", discardedUserId: userId, gameplayMerged: false });

  const { data: afterProfile } = await admin.from("users").select("id").eq("id", userId).maybeSingle();
  assert.equal(afterProfile, null, "Anonymous gameplay data was not deleted");
  const { data: afterAuth } = await admin.auth.admin.getUserById(userId);
  assert.equal(afterAuth.user, null, "Anonymous Auth user was not deleted");

  console.log(JSON.stringify({
    status: "PASS",
    projectRef: PREVIEW_REF,
    discardedAnonymousUserId: userId,
    profileDeleted: true,
    authDeleted: true,
    gameplayMerged: false,
    ownedCharacterDeleteTriggerCovered: true,
    powerProjectionDeleteCovered: true,
  }, null, 2));
} finally {
  // Idempotent cleanup only for the test identity created in this process.
  await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}
