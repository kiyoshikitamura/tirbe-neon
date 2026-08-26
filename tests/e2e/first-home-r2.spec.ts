import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
] as const;

async function openHomeScenario(page: Page, scenario: "first-home-fresh" | "first-home-raid") {
  await page.goto(`/qa/presentation?scenario=${scenario}`);
  await expect(page.locator(`[data-home-scenario="${scenario}"]`)).toBeVisible();
}

const resumeSnapshot = {
  backgroundUrl: "/bg/bg_street_shibuya.png",
  leaderImageUrl: "/characters/reiji_transparent_asset.png",
  leaderName: "reiji",
};

test("reload uses the stable Home resume shell instead of branded boot loading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((snapshot) => {
    window.sessionStorage.setItem("tribe-neon.home-resume-visual.v1", JSON.stringify(snapshot));
  }, resumeSnapshot);
  await page.route("**/branding/title-key-visual.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1600));
    await route.continue();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-home-resume-shell="true"]')).toBeVisible();
  await expect(page.locator(".branded-loading")).toHaveCount(0);
  const stableGeometry = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>("[data-home-resume-shell]")!;
    const visual = document.querySelector<HTMLElement>(".home-resume-visual")!;
    const footer = document.querySelector<HTMLElement>(".home-resume-footer")!;
    return {
      shellHeight: shell.getBoundingClientRect().height,
      visualHeight: visual.getBoundingClientRect().height,
      footerBottom: footer.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
    };
  });
  expect(stableGeometry.shellHeight).toBe(stableGeometry.viewportHeight);
  expect(stableGeometry.visualHeight).toBeGreaterThanOrEqual(300);
  expect(stableGeometry.footerBottom).toBeLessThanOrEqual(stableGeometry.viewportHeight);
  await page.screenshot({ path: "test-results/first-home-r5-resume-shell-390x844.png", fullPage: false });
  const resumeStages = await page.evaluate(() => window.__TRIBE_HOME_RELOAD_METRICS__?.stages);
  expect(resumeStages?.reload).toBe(0);
  expect(resumeStages?.homeShellReady).toBeGreaterThanOrEqual(0);
});

test("Home re-entry keeps the previous combined visual until current Town and Leader are decoded", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((snapshot) => {
    window.sessionStorage.setItem("tribe-neon.home-resume-visual.v1", JSON.stringify(snapshot));
  }, resumeSnapshot);
  await page.route("**/characters/ageha_transparent_asset.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1600));
    await route.continue();
  });

  await page.goto("/qa/presentation?scenario=first-home-fresh", { waitUntil: "domcontentloaded" });
  const visual = page.locator(".mypage-visual-area");
  await expect(visual).toHaveAttribute("data-visual-readiness", "preparing");
  await expect(visual).toHaveClass(/has-resume-snapshot/);
  expect(await visual.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("bg_street_shibuya.png");
  await expect(page.locator(".mypage-visual-loading-leader")).toHaveAttribute("src", "/characters/reiji_transparent_asset.png");
  await page.screenshot({ path: "test-results/first-home-r5-reentry-placeholder-390x844.png", fullPage: false });

  await expect(visual).toHaveAttribute("data-visual-readiness", "ready");
  expect(await visual.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("bg_street_shinjuku.png");
  await expect(page.locator(".mypage-leader-layer.is-ssr")).toBeVisible();
});

test("Home reveals the Town and decoded Leader as one visual on a cold load and reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let delayedLeaderRequests = 0;
  let releaseLeader: () => void = () => undefined;
  const leaderGate = new Promise<void>((resolve) => { releaseLeader = resolve; });
  await page.route("**/characters/ageha_transparent_asset.png", async (route) => {
    delayedLeaderRequests += 1;
    await leaderGate;
    await route.continue();
  });

  await page.goto("/qa/presentation?scenario=first-home-fresh", { waitUntil: "domcontentloaded" });
  const visual = page.locator(".mypage-visual-area");
  await expect(visual).toHaveAttribute("data-visual-readiness", "preparing");
  await expect(page.locator(".mypage-visual-loading")).toBeVisible();
  await expect(page.locator(".mypage-leader-layer")).toHaveCount(0);
  expect(await visual.evaluate((node) => getComputedStyle(node).backgroundImage)).toBe("none");

  releaseLeader();
  await expect(visual).toHaveAttribute("data-visual-readiness", "ready");
  await expect(page.locator(".mypage-visual-loading")).toHaveCount(0);
  await expect(page.locator(".mypage-leader-layer.is-ssr")).toBeVisible();
  expect(await visual.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("bg_street_shinjuku.png");
  expect(delayedLeaderRequests).toBe(1);
  const readinessStages = await page.evaluate(() => window.__TRIBE_HOME_RELOAD_METRICS__?.stages);
  expect(readinessStages?.homeShellReady).toBeLessThanOrEqual(readinessStages?.townImageDecoded || 0);
  expect(readinessStages?.homeShellReady).toBeLessThanOrEqual(readinessStages?.leaderImageDecoded || 0);
  expect(readinessStages?.homeVisualReady).toBeGreaterThanOrEqual(readinessStages?.leaderImageDecoded || 0);

  await page.reload();
  await expect(page.locator(".mypage-visual-area")).toHaveAttribute("data-visual-readiness", "ready");
  await expect(page.locator(".mypage-leader-layer.is-ssr")).toBeVisible();
});

for (const viewport of viewports) {
  test(`production First Home preserves the compact R3 hierarchy at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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
      const view = document.querySelector<HTMLElement>(".mypage-view")!;
      const cta = box(".mypage-primary-cta");
      const banner = box(".mypage-event-banner-area");
      const footer = box(".footer-mobile");
      const shortcutWidth = Math.max(...[...document.querySelectorAll<HTMLElement>(".sub-icon-unit")].map((node) => node.getBoundingClientRect().width));
      const leaderNode = document.querySelector<HTMLElement>(".mypage-leader-layer.is-ssr")!;
      const leaderBefore = getComputedStyle(leaderNode, "::before");
      const leaderAfter = getComputedStyle(leaderNode, "::after");
      return {
        leaderRatio: leader.height / visual.height,
        activityClearsCharacterVisual: ticker.bottom <= visual.top + 1,
        activityToVisualGap: visual.top - ticker.bottom,
        viewPaddingTop: parseFloat(getComputedStyle(view).paddingTop),
        viewJustify: getComputedStyle(view).justifyContent,
        ctaHeight: cta.height,
        bannerStartsAboveFooter: banner.top < footer.top,
        shortcutWidth,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ctaDetailDisplay: getComputedStyle(document.querySelector(".mypage-primary-cta > span:not(.mypage-primary-cta-eyebrow)")!).display,
        ctaWrap: getComputedStyle(document.querySelector<HTMLElement>(".mypage-primary-cta")!).flexWrap,
        bannerFilter: getComputedStyle(document.querySelector(".banner-bg-img")!).filter,
        townBackgroundPosition: getComputedStyle(document.querySelector(".mypage-visual-area")!).backgroundPosition,
        ssrAuraAnimation: leaderBefore.animationName,
        ssrSweepAnimation: leaderAfter.animationName,
        leaderAnimation: getComputedStyle(leaderNode).animationName,
      };
    });
    expect(geometry.leaderRatio).toBeGreaterThanOrEqual(0.84);
    expect(geometry.activityClearsCharacterVisual).toBe(true);
    expect(geometry.activityToVisualGap).toBeLessThanOrEqual(3);
    expect(geometry.activityToVisualGap).toBeGreaterThanOrEqual(0);
    expect(geometry.viewPaddingTop).toBe(0);
    expect(geometry.viewJustify).toBe("flex-start");
    expect(geometry.shortcutWidth).toBeLessThanOrEqual(39);
    expect(geometry.ctaHeight).toBeLessThanOrEqual(54);
    expect(geometry.ctaDetailDisplay).toBe("none");
    expect(geometry.ctaWrap).toBe("nowrap");
    expect(geometry.bannerStartsAboveFooter).toBe(true);
    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(geometry.bannerFilter).toContain("brightness(1.24)");
    expect(geometry.townBackgroundPosition).toContain("56%");
    expect(geometry.ssrAuraAnimation).toContain("mypage-ssr-leader-glow");
    expect(geometry.ssrSweepAnimation).toContain("mypage-ssr-leader-sweep");
    expect(geometry.leaderAnimation).toBe("none");

    await page.screenshot({ path: `test-results/first-home-r3-${viewport.width}x${viewport.height}.png`, fullPage: false });
  });
}

test("SSR aura and sweep visibly change over a short loop without moving the Leader", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHomeScenario(page, "first-home-fresh");
  const sample = () => page.locator(".mypage-leader-layer.is-ssr").evaluate((leader) => {
    const aura = getComputedStyle(leader, "::before");
    const sweep = getComputedStyle(leader, "::after");
    return {
      auraOpacity: Number(aura.opacity),
      sweepOpacity: Number(sweep.opacity),
      sweepPosition: sweep.backgroundPosition,
      leaderTransform: getComputedStyle(leader).transform,
    };
  });
  const first = await sample();
  await page.waitForTimeout(850);
  const second = await sample();
  expect(Math.abs(first.auraOpacity - second.auraOpacity)).toBeGreaterThan(0.05);
  expect(second.sweepPosition).not.toBe(first.sweepPosition);
  expect(second.leaderTransform).toBe(first.leaderTransform);
});

test("raid messaging only appears in the authoritative active-raid Home scenario", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHomeScenario(page, "first-home-fresh");
  await expect(page.locator(".mypage-event-chip.raid")).toHaveCount(0);
  await expect(page.locator(".banner-dots .dot")).toHaveCount(2);

  await openHomeScenario(page, "first-home-raid");
  await expect(page.locator(".mypage-event-chip.raid")).toBeVisible();
  await expect(page.locator(".banner-dots .dot")).toHaveCount(3);
  await expect(page.locator(".mypage-live-ticker--visual")).toContainText("KAI：SSRを獲得");
  const hudDoesNotOverlap = await page.evaluate(() => {
    const raid = document.querySelector<HTMLElement>(".mypage-event-chip.raid")!.getBoundingClientRect();
    const power = document.querySelector<HTMLElement>(".mypage-power-panel")!.getBoundingClientRect();
    return raid.right <= power.left;
  });
  expect(hudDoesNotOverlap).toBe(true);
});

test("SSR leader effect keeps a static aura when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openHomeScenario(page, "first-home-fresh");
  const effect = await page.locator(".mypage-leader-layer.is-ssr").evaluate((leader) => {
    const aura = getComputedStyle(leader, "::before");
    const sweep = getComputedStyle(leader, "::after");
    return {
      auraAnimation: aura.animationName,
      auraOpacity: Number(aura.opacity),
      sweepAnimation: sweep.animationName,
    };
  });
  expect(effect.auraAnimation).toBe("none");
  expect(effect.auraOpacity).toBeGreaterThan(0);
  expect(effect.sweepAnimation).toBe("none");
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
