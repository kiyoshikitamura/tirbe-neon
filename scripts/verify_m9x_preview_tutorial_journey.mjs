import { chromium, devices } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdir } from "node:fs/promises";
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

  await visible(".tutorial-world", 25_000);
  userId = await page.evaluate(() => {
    const authKey = Object.keys(localStorage).find((key) => /^sb-.*-auth-token$/.test(key));
    if (!authKey) return null;
    try { return JSON.parse(localStorage.getItem(authKey) || "null")?.user?.id || null; } catch { return null; }
  });
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

  await (await visible(".gacha-result-next", 20_000)).click();
  await (await visible(".char-party-auto-btn", 20_000)).click();

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
  await recordState("B5", 45_000);
  await recordState("B6", 45_000);
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-B6.png"), fullPage: true });
  await page.locator('[data-acceptance-state="B6"] button').click();

  await visible(".tutorial-rule-screen", 20_000);
  for (let index = 0; index < 3; index += 1) {
    await page.locator(".tutorial-rule-screen button").click();
  }
  const authenticationModal = await visible(".modal-overlay.background-black-95 .modal-card", 20_000);
  const qaEmail = `m9x-${Date.now()}@example.com`;
  await authenticationModal.locator('input[type="email"]').fill(qaEmail);
  await authenticationModal.locator('input[type="password"]').fill("m9x-preview-pass");
  await authenticationModal.locator("button.semantic-cta--secondary").click();
  await visible(".mypage-primary-cta", 20_000);
  stateSequence.push("MISSION_HUB");
  await page.screenshot({ path: path.join(artifactsDirectory, "preview-mission-hub.png"), fullPage: true });
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
      errorDialogs: Array.from(document.querySelectorAll(".modal-card.border-danger,[role=alert]")).map((node) => node.textContent?.trim()).filter(Boolean),
    };
  });
  userId = browserState.userId;
  trace = browserState.trace;
  if (!userId) throw new Error("The anonymous Preview user id could not be resolved from the browser session.");
  if (browserState.errorDialogs.length) throw new Error(`Unexpected error UI: ${browserState.errorDialogs.join(" | ")}`);
  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(" | ")}`);
  if (stateSequence.join(">") !== "Q1>Q2>Q3>Q4>Q5>Q6>B1>B2>B3>B5>B6>MISSION_HUB") {
    throw new Error(`Unexpected UI state sequence: ${stateSequence.join(">")}`);
  }
  const requiredTracePhases = ["dispatch_request", "dispatch_committed", "speed_up_request", "speed_up_committed", "quest_completion_observed", "quest_return_confirmed", "battle_cta_request"];
  const tracePhases = new Set(trace.map((entry) => entry.phase));
  const missingTracePhases = requiredTracePhases.filter((phase) => !tracePhases.has(phase));
  if (missingTracePhases.length) throw new Error(`Missing journey trace phases: ${missingTracePhases.join(", ")}`);

  console.log(JSON.stringify({
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
    trace,
    artifact: path.join(artifactsDirectory, "preview-B1.png"),
  }, null, 2));
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
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) {
      console.warn(`Disposable Preview user cleanup needs follow-up: ${userId} (${error.message})`);
    }
  }
}
