import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceKey || !expectedRef) throw new Error("Missing Preview Supabase configuration.");
const actualRef = new URL(url).hostname.split(".")[0];
if (actualRef !== expectedRef) throw new Error(`Refusing Supabase target: expected=${expectedRef}, actual=${actualRef}`);

const player = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const metrics = [];
let userId;

async function measure(action, task) {
  const startedAt = performance.now();
  const result = await task();
  metrics.push({ action, tapToResponseMs: Math.round(performance.now() - startedAt) });
  return result;
}

try {
  const { data: auth, error: authError } = await player.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous session was not created.");
  userId = auth.user.id;
  const username = `PF${Date.now().toString(36).slice(-6)}`.slice(0, 8);

  const initialized = await measure("game_initialization", () => player.rpc("initialize_current_player", { p_username: username, p_invite_code: null }));
  if (initialized.error) throw initialized.error;
  const intro = await player.rpc("advance_tutorial_progress", { p_expected_step: "WORLD_INTRO", p_next_step: "FREE_GACHA" });
  if (intro.error) throw intro.error;

  const draw = await measure("gacha", () => player.rpc("execute_character_gacha", {
    p_user_id: userId, p_gacha_id: "CHAR_NORMAL", p_pull_count: 10, p_currency_type: "free", p_request_id: crypto.randomUUID(),
  }));
  if (draw.error || draw.data?.results?.length !== 10) throw draw.error || new Error("Tutorial gacha failed.");
  const formationStep = await player.rpc("advance_tutorial_progress", { p_expected_step: "FREE_GACHA", p_next_step: "AUTO_FORMATION" });
  if (formationStep.error) throw formationStep.error;

  const owned = await player.from("user_characters").select("id,character_id").eq("user_id", userId).limit(5);
  if (owned.error || !owned.data?.length) throw owned.error || new Error("No owned character.");
  const formation = await measure("formation_save", async () => {
    const saved = await player.rpc("save_pvp_defense_deck", { p_character_ids: owned.data.map((row) => row.id), p_tactic: "ATTACK_PRIORITY" });
    if (saved.error) throw saved.error;
    return player.rpc("prepare_current_tutorial_growth");
  });
  if (formation.error) throw formation.error;

  const growth = await measure("growth", () => player.rpc("level_up_character", {
    p_character_id: owned.data[0].id, p_exp_item_id: "CHAR_EXP_S", p_count: 1,
  }));
  if (growth.error) throw growth.error;
  const growthAdvance = await player.rpc("advance_current_tutorial_after_growth");
  if (growthAdvance.error) throw growthAdvance.error;

  const quest = await player.from("quests").select("id,duration_seconds").order("duration_seconds").limit(1).single();
  if (quest.error) throw quest.error;
  const patrol = await measure("quest_start", () => player.rpc("start_patrol", {
    p_course_id: quest.data.id, p_character_id: owned.data[0].character_id,
  }));
  if (patrol.error || !patrol.data?.patrol_id) throw patrol.error || new Error("Quest start failed.");
  if (patrol.data?.tutorial_step !== "FREE_INSTANT") {
    const dispatchAdvance = await player.rpc("advance_tutorial_progress", { p_expected_step: "DISPATCH", p_next_step: "FREE_INSTANT" });
    if (dispatchAdvance.error) throw dispatchAdvance.error;
  }
  const instant = await player.rpc("complete_patrol_instantly", {
    p_user_id: userId, p_patrol_id: patrol.data.patrol_id, p_use_currency: "FREE_TUTORIAL",
  });
  if (instant.error) throw instant.error;

  const battle = await measure("battle_start", async () => {
    const replay = await player.rpc("create_patrol_battle_replay", {
      p_patrol_id: patrol.data.patrol_id, p_tactic_id: "ATTACK_PRIORITY",
    });
    if (replay.error || !replay.data?.replay_session_id) throw replay.error || new Error("Replay creation failed.");
    const resolved = await player.functions.invoke("resolve-battle", { body: { replaySessionId: replay.data.replay_session_id } });
    if (resolved.error || !["PLAYER", "ENEMY"].includes(resolved.data?.winner)) throw resolved.error || new Error(`Battle resolve failed: ${JSON.stringify(resolved.data)}`);
    return resolved;
  });
  if (battle.error) throw battle.error;

  console.log(JSON.stringify({ projectRef: actualRef, metrics }, null, 2));
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`Performance QA cleanup failed for ${userId}: ${error.message}`);
  }
}
