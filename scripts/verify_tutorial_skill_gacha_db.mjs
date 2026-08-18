import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) {
  throw new Error("Missing Supabase Development configuration.");
}

const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const username = `TG${Date.now().toString(36).slice(-6)}`.slice(0, 8);

const { data: auth, error: authError } = await supabase.auth.signInAnonymously();
if (authError || !auth.user) throw authError || new Error("Anonymous session was not created.");

const { error: initializeError } = await supabase.rpc("initialize_current_player", {
  p_username: username,
});
if (initializeError) throw initializeError;

const { error: introError } = await supabase.rpc("advance_tutorial_progress", {
  p_expected_step: "WORLD_INTRO",
  p_next_step: "FREE_GACHA",
});
if (introError) throw introError;

const { data: draw, error: drawError } = await supabase.rpc("execute_asset_gacha", {
  p_user_id: auth.user.id,
  p_gacha_id: "SKILL_NORMAL",
  p_pull_count: 10,
  p_currency_type: "free",
  p_request_id: crypto.randomUUID(),
});
if (drawError || draw?.status !== "success" || draw.results?.length !== 10) {
  throw drawError || new Error(`Unexpected draw result: ${JSON.stringify(draw)}`);
}

const { error: advanceError } = await supabase.rpc("advance_tutorial_progress", {
  p_expected_step: "FREE_GACHA",
  p_next_step: "AUTO_FORMATION",
});
if (advanceError) throw advanceError;

const [{ data: state, error: stateError }, { data: claim, error: claimError }] = await Promise.all([
  supabase.rpc("get_current_onboarding_state"),
  supabase.from("user_daily_gacha_claims")
    .select("gacha_type,last_claimed_date")
    .eq("user_id", auth.user.id)
    .eq("gacha_type", "SKILL")
    .single(),
]);
if (stateError) throw stateError;
if (claimError) throw claimError;
if (state.tutorial_step !== "AUTO_FORMATION") {
  throw new Error(`Tutorial did not advance: ${JSON.stringify(state)}`);
}

const { error: duplicateError } = await supabase.rpc("execute_asset_gacha", {
  p_user_id: auth.user.id,
  p_gacha_id: "SKILL_NORMAL",
  p_pull_count: 10,
  p_currency_type: "free",
  p_request_id: crypto.randomUUID(),
});
if (!duplicateError || !/already claimed/i.test(duplicateError.message)) {
  throw new Error(`Duplicate free draw was not rejected: ${duplicateError?.message || "no error"}`);
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  testUserId: auth.user.id,
  username,
  resultCount: draw.results.length,
  tutorialStep: state.tutorial_step,
  dailyClaim: claim,
  duplicateDrawRejected: true,
}, null, 2));
