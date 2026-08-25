import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
] as const;

async function openHomeScenario(page: Page, scenario: "first-home-fresh" | "first-home-raid") {
  await page.goto(`/qa/presentation?scenario=${scenario}`);
  await expect(page.locator(`[data-home-scenario="${scenario}"]`)).toBeVisible();
}

for (const viewport of viewports) {
  test(`production First Home preserves the R2 hierarchy at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openHomeScenario(page, "first-home-fresh");

    const activity = page.locator(".mypage-live-ticker--visual");
    await expect(activity).toContainText("ACTIVITY");
    await expect(activity).toContainText("KAI：SSRを獲得");
    await expect(page.locator(".mypage-leader-layer.is-ssr")).toBeVisible();
    await expect(page.locator(".mypage-visual-area")).not.toHaveClass(/mypage-event-raid/);
    await expect(page.locator(".header-mobile")).not.toContainText("自然回復停止");
    await expect(page.locator(".header-mobile")).toContainText("⚡");

    const actionOrder = await page.locator(".mypage-circle-menu-area > button").evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") || button.querySelector("img")?.getAttribute("alt")),
    );
    expect(actionOrder).toEqual(["連合", "喧嘩", "制圧", "抗争は準備中です"]);
    await expect(page.locator(".mypage-circle-menu-area")).toHaveAttribute("data-home-action-assets", "pending-production-delivery");
    await expect(page.locator('[data-action-slot="war"] img')).toHaveAttribute("src", "/menu/menu_war.png");
    await expect(page.getByRole("button", { name: "抗争は準備中です" })).toBeDisabled();

    const geometry = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      const visual = box(".mypage-visual-area");
      const leader = box(".mypage-leader-layer");
      const ticker = box(".mypage-live-ticker--visual");
      const cta = box(".mypage-primary-cta");
      const banner = box(".mypage-event-banner-area");
      const footer = box(".footer-mobile");
      const shortcutWidth = Math.max(...[...document.querySelectorAll<HTMLElement>(".sub-icon-unit")].map((node) => node.getBoundingClientRect().width));
      return {
        leaderRatio: leader.height / visual.height,
        activityClearsCharacterVisual: ticker.bottom <= visual.top + 1,
        ctaHeight: cta.height,
        bannerStartsAboveFooter: banner.top < footer.top,
        shortcutWidth,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ctaDetailDisplay: getComputedStyle(document.querySelector(".mypage-primary-cta > span:not(.mypage-primary-cta-eyebrow)")!).display,
        ctaWrap: getComputedStyle(document.querySelector<HTMLElement>(".mypage-primary-cta")!).flexWrap,
        bannerFilter: getComputedStyle(document.querySelector(".banner-bg-img")!).filter,
        townBackgroundPosition: getComputedStyle(document.querySelector(".mypage-visual-area")!).backgroundPosition,
      };
    });
    expect(geometry.leaderRatio).toBeGreaterThanOrEqual(0.84);
    expect(geometry.activityClearsCharacterVisual).toBe(true);
    expect(geometry.shortcutWidth).toBeLessThanOrEqual(39);
    expect(geometry.ctaHeight).toBeLessThanOrEqual(54);
    expect(geometry.ctaDetailDisplay).toBe("none");
    expect(geometry.ctaWrap).toBe("nowrap");
    expect(geometry.bannerStartsAboveFooter).toBe(true);
    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(geometry.bannerFilter).toContain("brightness(1.24)");
    expect(geometry.townBackgroundPosition).toContain("56%");

    await page.screenshot({ path: `test-results/first-home-r2-${viewport.width}x${viewport.height}.png`, fullPage: false });
  });
}

test("raid messaging only appears in the authoritative active-raid Home scenario", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHomeScenario(page, "first-home-fresh");
  await expect(page.locator(".mypage-event-chip.raid")).toHaveCount(0);
  await expect(page.locator(".banner-dots .dot")).toHaveCount(2);

  await openHomeScenario(page, "first-home-raid");
  await expect(page.locator(".mypage-event-chip.raid")).toBeVisible();
  await expect(page.locator(".banner-dots .dot")).toHaveCount(3);
  await expect(page.locator(".mypage-live-ticker--visual")).toContainText("KAI：SSRを獲得");
});

test("existing-account login uses the shared tutorial surface and CTA geometry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "TAP TO START" }).click();
  await page.getByRole("button", { name: "既存アカウントでログイン" }).click();
  const card = page.locator(".auth-card");
  await expect(card).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toHaveClass(/semantic-cta--primary/);
  await expect(page.locator(".auth-input")).toHaveCount(2);
  const geometry = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>(".auth-card")!;
    const primary = document.querySelector<HTMLElement>(".auth-btn-google")!;
    const input = document.querySelector<HTMLElement>(".auth-input")!;
    return {
      cardWidth: card.getBoundingClientRect().width,
      cardRadius: getComputedStyle(card).borderRadius,
      primaryHeight: primary.getBoundingClientRect().height,
      primaryBackground: getComputedStyle(primary).backgroundColor,
      inputHeight: input.getBoundingClientRect().height,
      overflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    };
  });
  expect(geometry.cardWidth).toBeLessThanOrEqual(390);
  expect(parseFloat(geometry.cardRadius)).toBeGreaterThanOrEqual(8);
  expect(geometry.primaryHeight).toBeGreaterThanOrEqual(52);
  expect(geometry.primaryBackground).not.toBe("rgb(255, 255, 255)");
  expect(geometry.inputHeight).toBeGreaterThanOrEqual(54);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/existing-account-login-r2-390x844.png", fullPage: false });
});
