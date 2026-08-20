import { chromium, devices } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const previewUrl = process.env.MOBILE_PREVIEW_URL || "https://tribe-neon-mobile-preview.vercel.app";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF || process.env.SUPABASE_PREVIEW_PROJECT_REF;

if (!supabaseUrl || !serviceRoleKey || !expectedRef) {
  throw new Error("Preview Supabase URL, service role key, and expected project ref are required.");
}
const actualRef = new URL(supabaseUrl).hostname.split(".")[0];
if (actualRef !== expectedRef || actualRef !== "sufvuqdnqohpfzkwxohq") {
  throw new Error(`Refusing non-Preview Supabase target: ${actualRef}`);
}
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

const artifactsDirectory = path.resolve("test-results", "m9x-preview-tutorial-journey");
await mkdir(artifactsDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedResponses = [];
let userId = null;
let trace = [];
const acquisitionAudit = {};

const snapshotAcquisitionState = async (label) => {
  if (!userId) throw new Error(`Cannot snapshot ${label} without the Preview QA user id.`);
  const [{ data: characters, error: characterError }, { data: formation, error: formationError }, { data: history, error: historyError }] = await Promise.all([
    admin.from("user_characters").select("id,character_id,level,awakening_level,created_at").eq("user_id", userId).order("created_at"),
    admin.from("user_main_formations").select("slot,user_character_id").eq("user_id", userId).order("slot"),
    admin.from("gacha_execution_history").select("request_id,gacha_id,status,result_payload,created_at").eq("user_id", userId).order("created_at"),
  ]);
  if (characterError || formationError || historyError) throw new Error(`Acquisition snapshot ${label} failed: ${JSON.stringify({ characterError, formationError, historyError })}`);
  acquisitionAudit[label] = { characters: characters || [], formation: formation || [], history: history || [] };
};

page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() < 400) return;
  const requestUrl = new URL(response.url());
  failedResponses.push({ status: response.status(), pathname: requestUrl.pathname });
});

const visible = async (selector, timeout = 20_000) => {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible", timeout });
  return locator;
};

try {
  await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await (await visible(".title-tap-text")).click();
  await (await visible(".title-entry-primary")).click();

  await visible('[data-entry-state="WORLD_INFORMATION"]');
  await (await visible('[data-world-stage="4"] .setup-world-tap', 35_000)).click();
  await visible('[data-entry-state="AGEHA_INTRO"]');
  await page.locator(".setup-ageha-presentation .setup-primary-action").click();
  await visible('[data-entry-state="NAME_INPUT"]');
  await page.locator("#setup-player-name").fill(`QA${Date.now().toString(36).slice(-6)}`);
  await page.locator(".setup-name-dialog .setup-primary-action").click();

  // Preview cold starts may still be finishing the existing full bootstrap
  // after the authoritative profile transaction. This is a harness ceiling,
  // not a presentation delay introduced by the Battle remediation.
  await visible(".tutorial-world", 60_000);
  userId = await page.evaluate(() => {
    const authKey = Object.keys(localStorage).find((key) => /^sb-.*-auth-token$/.test(key));
    if (!authKey) return null;
    try { return JSON.parse(localStorage.getItem(authKey) || "null")?.user?.id || null; } catch { return null; }
  });
  await snapshotAcquisitionState("INITIAL_CHARACTER");
  await page.locator(".tutorial-world button").click();
  await (await visible(".gacha-free-btn", 25_000)).click();
  await (await visible(".gacha-pull-gate", 25_000)).click();
  const reveal = await visible(".tutorial-gacha-reveal", 25_000);
  for (let index = 0; index < 10; index += 1) {
    await reveal.waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForFunction(() => {
      const button = document.querySelector(".tutorial-gacha-reveal");
      return button instanceof HTMLButtonElement && !button.disabled;
    }, undefined, { timeout: 20_000 });
    await reveal.click();
  }

  await visible(".gacha-result-panel", 20_000);
  await snapshotAcquisitionState("TUTORIAL_GACHA_RESULT");
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-gacha-result.png"), fullPage: true });
  await (await visible(".gacha-result-next", 20_000)).click();
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-formation-owned.png"), fullPage: true });
  await (await visible(".char-party-auto-btn", 20_000)).click();
  await visible('[data-acceptance-state="FORMATION_SKILL_READY"]', 20_000);
  await snapshotAcquisitionState("RECOMMENDED_FORMATION");
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-formation-skill.png"), fullPage: true });
  await page.locator('[data-acceptance-state="FORMATION_SKILL_READY"] button').click();

  const stateSequence = [];
  const recordState = async (state, timeout = 25_000) => {
    await visible(`[data-acceptance-state="${state}"]`, timeout);
    stateSequence.push(state);
  };
  await recordState("Q1");
  await page.locator('[data-acceptance-state="Q1"] button').click();
  await recordState("Q2");
  await recordState("Q3");
  await page.locator('[data-acceptance-state="Q3"] button').click();
  await recordState("Q4");
  await recordState("Q5");
  await page.locator('[data-acceptance-state="Q5"] button').click();
  await recordState("Q6");
  await page.locator('[data-acceptance-state="Q6"] button').click();
  await recordState("B1");

  await page.screenshot({ path: path.join(artifactsDirectory, "preview-B1.png"), fullPage: true });
  await page.locator('[data-acceptance-state="B1"] .start-battle-btn').click();
  await recordState("B2");
  await recordState("B3");
  await recordState("B4", 30_000);
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-B4.png"), fullPage: true });
  await recordState("B5", 45_000);
  await recordState("B6", 45_000);
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-B6.png"), fullPage: true });
  await page.locator('[data-acceptance-state="B6"] button').click();

  await visible(".tutorial-rule-screen", 20_000);
  await visible('[data-acceptance-state="COMPLETION_DIALOGUE"]', 20_000);
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-M7-completion-dialogue.png"), fullPage: true });
  await page.locator('[data-acceptance-state="COMPLETION_DIALOGUE"] button').click();
  await visible('[data-acceptance-state="WORLD"]', 20_000);
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-M8-world-first.png"), fullPage: true });
  for (let index = 0; index < 3; index += 1) {
    await page.locator(".tutorial-rule-screen button").click();
  }
  await visible(".modal-overlay.background-black-95 .modal-card", 20_000);
  stateSequence.push("ACCOUNT_AUTHENTICATION");
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-account-authentication.png"), fullPage: true });
  const browserState = await page.evaluate(() => {
    const authKey = Object.keys(localStorage).find((key) => /^sb-.*-auth-token$/.test(key));
    let storedUserId = null;
    if (authKey) {
      try { storedUserId = JSON.parse(localStorage.getItem(authKey) || "null")?.user?.id || null; } catch { /* audit below */ }
    }
    return {
      userId: storedUserId,
      trace: window.__TRIBE_TUTORIAL_JOURNEY_TRACE__ || [],
      actionMetrics: window.__TRIBE_ACTION_METRICS__ || [],
      battlePresentation: window.__TRIBE_BATTLE_PRESENTATION__ || { history: [] },
      errorDialogs: Array.from(document.querySelectorAll(".modal-card.border-danger,[role=alert]")).map((node) => node.textContent?.trim()).filter(Boolean),
    };
  });
  userId = browserState.userId;
  trace = browserState.trace;
  if (!userId) throw new Error("The anonymous Preview user id could not be resolved from the browser session.");
  if (browserState.errorDialogs.length) throw new Error(`Unexpected error UI: ${browserState.errorDialogs.join(" | ")}`);
  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(" | ")}`);
  if (stateSequence.join(">") !== "Q1>Q2>Q3>Q4>Q5>Q6>B1>B2>B3>B4>B5>B6>ACCOUNT_AUTHENTICATION") {
    throw new Error(`Unexpected UI state sequence: ${stateSequence.join(">")}`);
  }
  const requiredTracePhases = ["dispatch_request", "dispatch_committed", "speed_up_request", "speed_up_committed", "quest_completion_observed", "quest_return_confirmed", "battle_cta_request"];
  const tracePhases = new Set(trace.map((entry) => entry.phase));
  const missingTracePhases = requiredTracePhases.filter((phase) => !tracePhases.has(phase));
  if (missingTracePhases.length) throw new Error(`Missing journey trace phases: ${missingTracePhases.join(", ")}`);
  const completedBattleActions = (browserState.battlePresentation.history || []).filter((entry) => entry?.actionCompleteAt);
  for (const kind of ["normal", "skill"]) {
    const metric = completedBattleActions.find((entry) => entry.kind === kind);
    const stages = metric && [metric.actorFocusAt, metric.targetFocusAt, metric.impactAt, metric.damageAt, metric.hpSettledAt, metric.actionCompleteAt];
    if (!metric || !stages.every((value) => typeof value === "number") || stages.some((value, index) => index > 0 && value < stages[index - 1])) {
      throw new Error(`Incomplete ${kind} action presentation timing: ${JSON.stringify(metric)}`);
    }
  }

  const [{ data: skills, error: skillError }, { data: replay, error: replayError }, { count: skillGachaCount, error: skillGachaError }] = await Promise.all([
    admin.from("user_skills").select("id,skill_card_id,plus_val,equipped_character_id,slot_index").eq("user_id", userId),
    admin.from("battle_replay_sessions").select("player_snapshot,enemy_snapshot,result").eq("requester_user_id", userId).eq("battle_mode", "QUEST").order("created_at", { ascending: false }).limit(1).single(),
    admin.from("gacha_execution_history").select("request_id", { count: "exact", head: true }).eq("user_id", userId).like("gacha_id", "SKILL%"),
  ]);
  if (skillError || replayError || skillGachaError) {
    throw new Error(`Preview contract query failed: ${JSON.stringify({ skillError, replayError, skillGachaError })}`);
  }
  const starterSkills = (skills || []).filter((skill) => skill.skill_card_id === "SKILL_001");
  if (starterSkills.length !== 1 || Number(starterSkills[0].plus_val) !== 0 || Number(starterSkills[0].slot_index) !== 0) {
    throw new Error(`Invalid tutorial starter skill ownership: ${JSON.stringify(starterSkills)}`);
  }
  if (skillGachaCount !== 0) throw new Error("Tutorial starter skill incorrectly created Skill Gacha history.");
  const leader = replay?.player_snapshot?.[0];
  const events = Array.isArray(replay?.result?.events) ? replay.result.events : [];
  const leaderActions = events.filter((event) => event.type === "ACTION" && event.payload?.actorId === leader?.id);
  const basicActionIndex = events.findIndex((event) => event === leaderActions.find((action) => action.payload?.skillId === "BASIC_ATTACK"));
  const skillAction = leaderActions.find((action) => action.payload?.skillId && action.payload.skillId !== "BASIC_ATTACK");
  const skillActionIndex = events.findIndex((event) => event === skillAction);
  const skillImpactIndex = events.findIndex((event, index) => index > skillActionIndex && ["DAMAGE", "HEAL", "EFFECT", "STATUS"].includes(event.type) && event.payload?.actorId === leader?.id);
  if (basicActionIndex < 0 || skillActionIndex <= basicActionIndex || skillImpactIndex <= skillActionIndex) {
    throw new Error(`Authoritative tutorial sequence is incomplete: ${JSON.stringify(leaderActions)}`);
  }
  const firstDefeatIndex = events.findIndex((event) => event.type === "DEFEAT" && String(event.payload?.targetId || "").startsWith("enemy_"));
  if (firstDefeatIndex >= 0 && firstDefeatIndex < skillImpactIndex) throw new Error("Tutorial enemy was defeated before the Skill impact.");
  if (replay?.result?.winner !== "PLAYER") throw new Error("Tutorial expected winner was not preserved.");

  const starterCharacterId = "11111111-1111-1111-1111-111111111111";
  const initialCharacters = acquisitionAudit.INITIAL_CHARACTER?.characters || [];
  if (initialCharacters.length !== 1 || initialCharacters[0].character_id !== starterCharacterId) {
    throw new Error(`Initialization starter provenance is invalid: ${JSON.stringify(initialCharacters)}`);
  }
  const postGachaOwnedIds = new Set((acquisitionAudit.TUTORIAL_GACHA_RESULT?.characters || []).map((character) => character.id));
  const formationRows = acquisitionAudit.RECOMMENDED_FORMATION?.formation || [];
  const unownedFormationRows = formationRows.filter((row) => !postGachaOwnedIds.has(row.user_character_id));
  if (formationRows.length !== 5 || unownedFormationRows.length) {
    throw new Error(`Recommended formation contains an unowned character: ${JSON.stringify({ formationRows, unownedFormationRows })}`);
  }

  const enemyParticipantIds = new Set((replay?.enemy_snapshot || []).map((participant) => String(participant.id)));
  const replayEvents = Array.isArray(replay?.result?.events) ? replay.result.events : [];
  const authoritativeActions = replayEvents.flatMap((event, index) => {
    if (event.type !== "ACTION") return [];
    const unit = replayEvents.slice(index + 1);
    const nextActionOffset = unit.findIndex((candidate) => candidate.type === "ACTION");
    const bounded = nextActionOffset < 0 ? unit : unit.slice(0, nextActionOffset);
    const impact = bounded.find((candidate) => ["DAMAGE", "HEAL", "STATUS"].includes(candidate.type));
    return [{ actorId: String(event.payload?.actorId || ""), targetId: String(event.payload?.targetId || impact?.payload?.targetId || "") }];
  });
  const completedPresentationActions = [...(browserState.battlePresentation.history || []), browserState.battlePresentation.current]
    .filter((entry) => entry?.actionCompleteAt);
  const enemyPresentationActions = completedPresentationActions.filter((entry) => enemyParticipantIds.has(String(entry.actorId))).slice(0, 3);
  if (enemyPresentationActions.length < 3) {
    throw new Error(`Expected at least 3 Enemy presentation actions: ${JSON.stringify({
      enemyPresentationActions,
      enemyParticipantIds: [...enemyParticipantIds],
      completedPresentationActorIds: completedPresentationActions.map((entry) => String(entry.actorId)),
      authoritativeEnemyActions: authoritativeActions.filter((entry) => enemyParticipantIds.has(entry.actorId)),
    })}`);
  }
  for (const presentation of enemyPresentationActions) {
    const authoritative = authoritativeActions.find((action) => action.actorId === String(presentation.actorId) && action.targetId === String(presentation.targetId));
    const stageTargets = [presentation.targetFocusAtTargetId, presentation.impactAtTargetId, presentation.damageAtTargetId, presentation.hpSettledAtTargetId].filter(Boolean);
    if (!authoritative || stageTargets.some((target) => target !== authoritative.targetId)) {
      throw new Error(`Enemy presentation target drift: ${JSON.stringify({ presentation, authoritative, stageTargets })}`);
    }
  }

  const report = {
    status: "PASS",
    previewUrl,
    projectRef: actualRef,
    userId,
    uiOnly: true,
    directStateMutation: false,
    stateSequence,
    pageErrors,
    consoleErrors,
    failedResponses,
    actionMetrics: browserState.actionMetrics,
    battlePresentation: browserState.battlePresentation,
    trace,
    starterSkill: { skillId: starterSkills[0].skill_card_id, plusValue: starterSkills[0].plus_val, slotIndex: starterSkills[0].slot_index },
    replayContract: { basicActionIndex, skillActionIndex, skillImpactIndex, winner: replay.result.winner },
    acquisitionAudit,
    enemyPresentationActions,
    artifact: path.join(artifactsDirectory, "preview-B1.png"),
  };
  await writeFile(path.join(artifactsDirectory, "preview-journey-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  trace = await page.evaluate(() => window.__TRIBE_TUTORIAL_JOURNEY_TRACE__ || []).catch(() => trace);
  userId ||= trace.find((entry) => typeof entry?.userId === "string")?.userId || null;
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-failure.png"), fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ status: "FAIL", previewUrl, userId, pageErrors, consoleErrors, failedResponses, trace }, null, 2));
  throw error;
} finally {
  await context.close();
  await browser.close();
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) {
      console.warn(`Disposable Preview user cleanup needs follow-up: ${userId} (${error.message})`);
    }
  }
}
