import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");

const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const username = `M1${Date.now().toString(36).slice(-6)}`.slice(0, 8);

const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();
if (anonymousError || !anonymousData.user || !anonymousData.session) {
  throw anonymousError || new Error("Anonymous session was not created.");
}
const userId = anonymousData.user.id;
if (!anonymousData.user.is_anonymous) throw new Error("Created user is not anonymous.");

const { data: initialState, error: initialStateError } = await supabase.rpc("get_current_onboarding_state");
if (initialStateError) throw initialStateError;
if (initialState.user_id !== userId || initialState.has_profile || initialState.gameplay_authorized) {
  throw new Error(`Unexpected initial onboarding state: ${JSON.stringify(initialState)}`);
}

const { data: initialization, error: initializationError } = await supabase.rpc("initialize_current_player", {
  p_username: username,
});
if (initializationError) throw initializationError;
if (initialization.status !== "success" || initialization.tutorial_step !== "WORLD_INTRO") {
  throw new Error(`Unexpected initialization result: ${JSON.stringify(initialization)}`);
}

const { data: retry, error: retryError } = await supabase.rpc("initialize_current_player", { p_username: username });
if (retryError) throw retryError;
if (retry.status !== "already_initialized" || retry.tutorial_step !== "WORLD_INTRO") {
  throw new Error(`Initialization retry is not idempotent: ${JSON.stringify(retry)}`);
}

const [{ data: state, error: stateError }, { data: characters, error: charactersError }] = await Promise.all([
  supabase.rpc("get_current_onboarding_state"),
  supabase.from("user_characters").select("user_id,character_id,level,awakening_level").eq("user_id", userId),
]);
if (stateError) throw stateError;
if (charactersError) throw charactersError;
if (!state.has_profile || state.tutorial_step !== "WORLD_INTRO" || state.gameplay_authorized) {
  throw new Error(`Unexpected initialized onboarding state: ${JSON.stringify(state)}`);
}
if (!Array.isArray(characters) || characters.length !== 1 || characters[0].character_id !== "11111111-1111-1111-1111-111111111111") {
  throw new Error(`Unexpected starter characters: ${JSON.stringify(characters)}`);
}

const { error: prematureCompletionError } = await supabase.rpc("complete_tutorial_authentication", {
  p_auth_method: "EMAIL",
});
if (!prematureCompletionError || !/Verified authentication identity is required/i.test(prematureCompletionError.message)) {
  throw new Error(`Anonymous completion was not rejected: ${prematureCompletionError?.message || "no error"}`);
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  testUserId: userId,
  username,
  checks: [
    "anonymous session",
    "initial state",
    "name-only initialization",
    "idempotent retry",
    "single starter character",
    "anonymous auth completion rejected",
  ],
}, null, 2));
