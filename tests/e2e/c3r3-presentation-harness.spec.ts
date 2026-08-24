import { expect, test } from "@playwright/test";

const openScenario = async (page: import("@playwright/test").Page, id: string) => {
  await page.getByRole("button", { name: new RegExp(id === "gacha-ssr-reveal" ? "Gacha SSR" : id === "battle-5v3" ? "Battle 5v3" : id === "battle-result-win" ? "Battle Result WIN" : id) }).click();
  await expect(page.locator(".qa-stage")).toHaveAttribute("data-active-scenario", id);
};

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error(`[qa-harness pageerror] ${error.stack || error.message}`));
  await page.goto("/qa/presentation");
  await expect(page.locator('[data-qa-harness="presentation"]')).toBeVisible();
});

test("launcher exposes every approved presentation fixture and preserves human-only judgments", async ({ page }) => {
  await expect(page.locator("nav [data-scenario-id]")).toHaveCount(17);
  await expect(page.locator('[data-compliance-id="world-intro"]')).toHaveAttribute("data-status", "HUMAN_REQUIRED");
  await expect(page.locator('[data-compliance-id="skill-2x"]')).toHaveAttribute("data-status", "HUMAN_REQUIRED");
  await expect(page.locator('[data-compliance-id="battle-result"]')).toHaveAttribute("data-status", "HUMAN_REQUIRED");
});

test("SSR quote hides identity until explicit tap and then uses canonical town background", async ({ page }) => {
  await openScenario(page, "gacha-ssr-reveal");
  const quote = page.locator('[data-presentation-state="SSR_QUOTE"]');
  await expect(quote).toBeVisible();
  await expect(quote).not.toHaveAttribute("data-character-id");
  await expect(quote).not.toContainText("レイジ");
  await quote.click();
  const reveal = page.locator('[data-presentation-state="SSR_REVEAL"]');
  await expect(reveal).toHaveAttribute("data-character-id", /char_/);
  await expect(reveal).toContainText("レイジ");
  await expect(reveal.locator(".character-presentation-background")).toHaveAttribute("src", /bg_street_/);
});

test("production battle viewer renders actual 5v3 roster without empty slots", async ({ page }) => {
  await openScenario(page, "battle-5v3");
  await expect(page.locator('.battle-party-zone.is-player [id^="player-"]')).toHaveCount(5);
  await expect(page.locator('.battle-party-zone.is-enemy [id^="enemy-"]')).toHaveCount(3);
  await expect(page.locator('.battle-party-zone.is-enemy')).toHaveAttribute("data-party-size", "3");
  await expect(page.locator(".battle-unit")).toHaveCount(8);
});

test("production result shows opponent, left MVP art, score and comparison", async ({ page }) => {
  await openScenario(page, "battle-result-win");
  await expect(page.locator(".battle-result-opponent")).toContainText("新宿・初級");
  await expect(page.locator(".battle-result-outcome-label")).toHaveText("WIN");
  await expect(page.locator(".battle-result-mvp-hero .character-presentation")).toBeVisible();
  await expect(page.locator(".battle-result-mvp-copy b")).toContainText("PT");
  await expect(page.locator(".battle-result-score-grid")).toBeVisible();
  await expect(page.locator(".battle-result-comparison")).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }, { width: 1280, height: 900 }]) {
  test(`harness remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openScenario(page, "battle-5v3");
    const stage = page.locator(".qa-stage");
    await expect(stage).toBeVisible();
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  });
}
