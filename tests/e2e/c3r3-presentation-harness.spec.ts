import { expect, test } from "@playwright/test";

const openScenario = async (page: import("@playwright/test").Page, id: string) => {
  await page.locator(`[data-scenario-id="${id}"]`).click();
  await expect(page.locator(".qa-stage")).toHaveAttribute("data-active-scenario", id);
};

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error(`[qa-harness pageerror] ${error.stack || error.message}`));
  await page.goto("/qa/presentation");
  await expect(page.locator('[data-qa-harness="presentation"]')).toBeVisible();
});

test("launcher exposes every approved presentation fixture and preserves human-only judgments", async ({ page }) => {
  await expect(page.locator("nav [data-scenario-id]")).toHaveCount(20);
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
  await expect(quote).not.toContainText("SSR");
  await expect(quote.getByText("TAP", { exact: true })).toBeVisible();
  await quote.click();
  await expect(page.locator('[data-presentation-state="SSR_FLASH"]')).toBeVisible();
  const reveal = page.locator('[data-presentation-state="SSR_REVEAL"]');
  await expect(reveal).toHaveAttribute("data-character-id", /char_/);
  await expect(reveal).toContainText("レイジ");
  await expect(reveal.locator(".character-presentation-background")).toHaveAttribute("src", /bg_street_/);
});

test("name duplicate error is owned by the current screen and does not return after retry", async ({ page }) => {
  await openScenario(page, "name-input-error");
  await expect(page.getByRole("alertdialog")).toContainText("すでに使用");
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.locator('[data-name-lifecycle="retry"]')).toBeVisible();
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await expect(page.locator('[data-name-lifecycle="success"]')).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("auto formation waits for explicit OK before the next route", async ({ page }) => {
  await openScenario(page, "auto-formation");
  await page.getByRole("button", { name: "おすすめ編成にする" }).click();
  await expect(page.locator('[data-auto-formation-state="complete"]')).toContainText("編成しました");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator('[data-auto-formation-state="continued"]')).toContainText("クエストへ進みます");
});

for (const [scenario, mode] of [["quest-normal-battle", "normal"], ["quest-instant-battle", "instant"]] as const) {
  test(`${mode} quest completion reaches encounter and battle`, async ({ page }) => {
    await openScenario(page, scenario);
    await page.getByRole("button", { name: mode === "normal" ? "通常完了を再現" : "時短完了を再現" }).click();
    await expect(page.locator('[data-quest-transition-state="complete"]')).toContainText("クエスト完了");
    await page.getByRole("button", { name: "次へ" }).click();
    await expect(page.locator('[data-quest-transition-state="encounter"]')).toContainText("バトル発生");
    await page.getByRole("button", { name: "バトルへ" }).click();
    await expect(page.locator(".quest-battle-viewer")).toBeVisible();
  });
}

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

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`tutorial primary actions and growth result remain mobile-centered at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const scenario of ["skill-tutorial", "growth-before"] as const) {
      await openScenario(page, scenario);
      const action = page.locator(".qa-stage .semantic-cta--primary").last();
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 80);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    }
    await openScenario(page, "growth-result");
    const stage = await page.locator(".qa-stage").boundingBox();
    const modal = await page.locator(".outlaw-confirm-dialog.kind-result").boundingBox();
    expect(stage).not.toBeNull();
    expect(modal).not.toBeNull();
    expect(Math.abs((modal!.y + modal!.height / 2) - (stage!.y + stage!.height / 2))).toBeLessThan(36);
    await expect(page.locator(".growth-result-level")).toHaveText("Lv.1 → Lv.7");
  });
}
