import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const username = `TB${Date.now().toString(36).slice(-6)}`.slice(0, 8);
const { data: auth, error: authError } = await client.auth.signInAnonymously();
if (authError || !auth.user || !auth.session) throw authError || new Error("Anonymous sign-in failed.");
const userId = auth.user.id;
const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
if (initializeError) throw initializeError;
for (const [expected, next] of [["WORLD_INTRO", "FREE_GACHA"], ["FREE_GACHA", "AUTO_FORMATION"], ["AUTO_FORMATION", "DISPATCH"]]) {
  const { error } = await client.rpc("advance_tutorial_progress", { p_expected_step: expected, p_next_step: next });
  if (error) throw error;
}
const [questResult, ownedResult] = await Promise.all([
  client.from("quests").select("id,duration_seconds").order("duration_seconds"),
  client.from("user_characters").select("character_id").eq("user_id", userId).limit(1).single(),
]);
if (questResult.error) throw questResult.error;
if (ownedResult.error) throw ownedResult.error;
const quests = questResult.data;
const owned = ownedResult.data;
const quest = (quests || []).find((candidate) => candidate.id === "q_shinjuku_1") || quests?.[0];
if (!quest || !owned) throw new Error(`Tutorial quest master is unavailable: quests=${quests?.length || 0}, owned=${Boolean(owned)}`);
const { data: started, error: startError } = await client.rpc("start_patrol", { p_course_id: quest.id, p_character_id: owned.character_id });
if (startError) throw startError;
const { error: dispatchAdvanceError } = await client.rpc("advance_tutorial_progress", { p_expected_step: "DISPATCH", p_next_step: "FREE_INSTANT" });
if (dispatchAdvanceError) throw dispatchAdvanceError;
const { error: instantError } = await client.rpc("complete_patrol_instantly", {
  p_user_id: userId,
  p_patrol_id: started.patrol_id,
  p_use_currency: "FREE_TUTORIAL",
});
if (instantError) throw instantError;
const { data: enemy, error: enemyError } = await client.rpc("get_patrol_battle_enemy", { p_patrol_id: started.patrol_id });
if (enemyError || !enemy?.id) throw enemyError || new Error(`Unexpected patrol enemy: ${JSON.stringify(enemy)}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
  key: `sb-${actualProjectRef}-auth-token`,
  session: auth.session,
});
const page = await context.newPage();
const events = [];
page.on("console", (message) => events.push(`console:${message.type()}:${message.text()}`));
page.on("pageerror", (error) => events.push(`pageerror:${error.message}`));
page.on("requestfailed", (request) => events.push(`requestfailed:${request.url()}:${request.failure()?.errorText}`));
await page.goto(process.env.BROWSER_BASE_URL || "http://127.0.0.1:3100", { waitUntil: "domcontentloaded" });
await page.getByText("TAP TO START").click();
const tutorialBattleLabel = "\u30c1\u30e5\u30fc\u30c8\u30ea\u30a2\u30eb\u30d0\u30c8\u30eb\u958b\u59cb";
const setupLabel = "\u6297\u4e89\u6e96\u5099\u30d5\u30a7\u30fc\u30ba (SETUP)";
const preparingLabel = "\u30d0\u30c8\u30eb\u6e96\u5099\u4e2d...";
const startButton = page.getByRole("button", { name: tutorialBattleLabel });
await startButton.waitFor({ timeout: 20_000 });
await startButton.click();
let outcome = "UNKNOWN";
let authoritativeDamageObserved = false;
try {
  await page.getByText(setupLabel).waitFor({ timeout: 20_000 });
  outcome = "SETUP_VISIBLE";
  const blockingModals = await page.locator(".modal-overlay:visible").allInnerTexts();
  if (blockingModals.length > 0) events.push(`blocking-modals:${JSON.stringify(blockingModals)}`);
  for (const overlay of await page.locator(".modal-overlay:visible").all()) {
    const dismissButton = overlay.locator("button").last();
    if (await dismissButton.count()) await dismissButton.click();
  }
  await page.locator(".start-battle-btn").click();
  const speedButton = page.locator(".speed-toggle-btn");
  await speedButton.waitFor({ timeout: 10_000 });
  await speedButton.click();
  const { data: replaySession, error: replayError } = await client
    .from("battle_replay_sessions")
    .select("result")
    .eq("source_reference_id", started.patrol_id)
    .eq("battle_mode", "QUEST")
    .single();
  if (replayError) throw replayError;
  const firstDamage = replaySession?.result?.events?.find((event) => event.type === "DAMAGE" && event.payload?.hit !== false);
  if (!firstDamage) throw new Error("Resolved QUEST replay has no damage event");
  const authoritativeDamageText = Number(firstDamage.payload.amount).toLocaleString();
  await page.locator(".battle-log-box").filter({ hasText: authoritativeDamageText }).waitFor({ timeout: 20_000 });
  authoritativeDamageObserved = true;
  const victoryDeadline = Date.now() + 45_000;
  while (Date.now() < victoryDeadline) {
    const { data: state, error: stateError } = await client.rpc("get_current_onboarding_state");
    if (stateError) throw stateError;
    if (state?.tutorial_step === "RULE_GUIDE") {
      outcome = "TUTORIAL_VICTORY_RULE_GUIDE";
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (outcome !== "TUTORIAL_VICTORY_RULE_GUIDE") {
    const { data: state } = await client.rpc("get_current_onboarding_state");
    outcome = `BATTLE_DID_NOT_WIN tutorialStep=${state?.tutorial_step || "unknown"}`;
  }
} catch (error) {
  const preparing = await page.getByRole("button", { name: preparingLabel }).count();
  const errorText = await page.locator(".modal-title.text-color-danger").count();
  outcome = `E2E_ERROR preparing=${preparing} errorModal=${errorText} message=${error instanceof Error ? error.message : String(error)}`;
}
console.log(JSON.stringify({ projectRef: actualProjectRef, userId, patrolId: started.patrol_id, questId: quest.id, enemyId: enemy.id, outcome, authoritativeDamageObserved, events }, null, 2));
await browser.close();
