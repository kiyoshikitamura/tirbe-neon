import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { getLinkedPostgresConnection } from "./postgres_connection.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);

const player = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const unauthenticated = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId;

try {
  const { data: auth, error: authError } = await player.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous session was not created.");
  userId = auth.user.id;
  const username = `M9${Date.now().toString(36).slice(-6)}`.slice(0, 8);

  const { error: initializeError } = await player.rpc("initialize_current_player", { p_username: username, p_invite_code: null });
  if (initializeError) throw initializeError;
  const { error: introAdvanceError } = await player.rpc("advance_tutorial_progress", {
    p_expected_step: "WORLD_INTRO",
    p_next_step: "FREE_GACHA",
  });
  if (introAdvanceError) throw introAdvanceError;

  const { data: draw, error: drawError } = await player.rpc("execute_character_gacha", {
    p_user_id: userId,
    p_gacha_id: "CHAR_NORMAL",
    p_pull_count: 10,
    p_currency_type: "free",
    p_request_id: crypto.randomUUID(),
  });
  if (drawError || draw?.status !== "success" || draw.results?.length !== 10) {
    throw drawError || new Error(`Unexpected tutorial draw: ${JSON.stringify(draw)}`);
  }
  const { data: formationStep, error: formationAdvanceError } = await player.rpc("advance_tutorial_progress", {
    p_expected_step: "FREE_GACHA",
    p_next_step: "AUTO_FORMATION",
  });
  if (formationAdvanceError || formationStep !== "AUTO_FORMATION") {
    throw formationAdvanceError || new Error(`Tutorial did not reach formation: ${formationStep}`);
  }

  const { data: characters, error: charactersError } = await player.from("user_characters").select("id,character_id,level").eq("user_id", userId);
  if (charactersError || !characters?.[0]) throw charactersError || new Error("Starter character was not created.");
  const character = characters[0];
  const { error: deckError } = await player.rpc("save_pvp_defense_deck", {
    p_character_ids: [character.id],
    p_tactic: "ATTACK_PRIORITY",
  });
  if (deckError) throw deckError;

  const firstPrepare = await player.rpc("prepare_current_tutorial_growth");
  if (firstPrepare.error || firstPrepare.data?.quantity !== 1 || firstPrepare.data?.granted_quantity !== 1) {
    throw firstPrepare.error || new Error(`Unexpected first preparation: ${JSON.stringify(firstPrepare.data)}`);
  }
  const retryPrepare = await player.rpc("prepare_current_tutorial_growth");
  if (retryPrepare.error || retryPrepare.data?.quantity !== 1 || retryPrepare.data?.granted_quantity !== 0) {
    throw retryPrepare.error || new Error(`Preparation retry is not idempotent: ${JSON.stringify(retryPrepare.data)}`);
  }

  const growth = await player.rpc("level_up_character", { p_character_id: character.id, p_exp_item_id: "CHAR_EXP_S", p_count: 1 });
  if (growth.error || growth.data?.status !== "success") throw growth.error || new Error(`Growth failed: ${JSON.stringify(growth.data)}`);

  const firstAdvance = await player.rpc("advance_current_tutorial_after_growth");
  if (firstAdvance.error || firstAdvance.data?.status !== "advanced" || firstAdvance.data?.tutorial_step !== "DISPATCH") {
    throw firstAdvance.error || new Error(`Unexpected growth advance: ${JSON.stringify(firstAdvance.data)}`);
  }
  const retryAdvance = await player.rpc("advance_current_tutorial_after_growth");
  if (retryAdvance.error || retryAdvance.data?.status !== "already_advanced" || retryAdvance.data?.tutorial_step !== "DISPATCH") {
    throw retryAdvance.error || new Error(`Growth advance retry is not idempotent: ${JSON.stringify(retryAdvance.data)}`);
  }
  const latePrepare = await player.rpc("prepare_current_tutorial_growth");
  if (latePrepare.error || latePrepare.data?.status !== "already_advanced" || latePrepare.data?.granted_quantity !== 0) {
    throw latePrepare.error || new Error(`Late preparation is not a no-op: ${JSON.stringify(latePrepare.data)}`);
  }

  const unauthorized = await unauthenticated.rpc("prepare_current_tutorial_growth");
  if (!unauthorized.error) throw new Error("Unauthenticated preparation was unexpectedly allowed.");

  console.log(JSON.stringify({
    projectRef: actualProjectRef,
    checks: [
      "formation required",
      "free character gacha to AUTO_FORMATION",
      "CHAR_EXP_S floor-to-one grant",
      "preparation retry idempotency",
      "server first_growth milestone",
      "AUTO_FORMATION to DISPATCH",
      "advance retry no-op",
      "late preparation no-op",
      "unauthenticated execution denied",
    ],
  }, null, 2));
} finally {
  if (userId) {
    const connection = await getLinkedPostgresConnection();
    const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
    const cleanup = spawnSync(executable, [
      "-X", "-v", "ON_ERROR_STOP=1",
      "--host", connection.host,
      "--port", connection.port,
      "--username", connection.user,
      "--dbname", connection.database,
      "--command", `delete from auth.users where id = '${userId}'::uuid;`,
    ], { env: { ...process.env, PGPASSWORD: connection.password }, encoding: "utf8" });
    if (cleanup.status !== 0) console.warn(`QA cleanup failed for ${userId}: ${cleanup.stderr || cleanup.stdout}`);
  }
}
