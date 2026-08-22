import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const userId = "00000000-0000-4000-8000-000000000001";
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_users", JSON.stringify([{
      id: userId,
      username: "検証ユーザー",
      current_base_id: "shinjuku",
      favorite_character_id: "char_reiji_01",
    }]));
  });
});

async function enterGame(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator("html").evaluate((root) => root.style.setProperty("--app-safe-top", "47px"));
  await page.getByText("TAP TO START").click();
  await expect(page.locator(".header-mobile")).toBeVisible();
  const welcomeAction = page.getByRole("button", { name: "抗争に参入する" });
  await welcomeAction.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  if (await welcomeAction.isVisible()) await welcomeAction.click();
}

test("authenticated game shell keeps the header and footer inside its safe frame", async ({ page }) => {
  await enterGame(page);

  const header = page.locator(".header-mobile");
  const footer = page.locator(".footer-mobile");
  await expect(header).toBeVisible();
  await expect(footer).toBeVisible();

  const headerBox = await header.boundingBox();
  const footerBox = await footer.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(headerBox!.y).toBeGreaterThanOrEqual(36);
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(844);
});

test("shared shell preserves footer navigation", async ({ page }) => {
  await enterGame(page);
  await page.getByRole("button", { name: /キャラ/ }).click();
  await expect(page.locator(".footer-item.active")).toContainText("キャラ");
});

test("Open Beta home prioritizes the next action and keeps unreleased GvG unavailable", async ({ page }) => {
  await enterGame(page);
  await expect(page.locator(".mypage-primary-cta")).toBeVisible();
  await expect(page.locator(".circle-menu-btn.war")).toBeDisabled();
  await expect(page.locator(".circle-menu-btn.war")).toContainText("準備中");
});

test("stage two hubs share a mobile-safe page frame", async ({ page }) => {
  await enterGame(page);

  const cases = [
    { selector: ".circle-menu-btn.fight", title: "喧嘩（PvP）", period: true },
    { selector: ".circle-menu-btn.conquest", title: "クエスト", period: false },
    { selector: ".mypage-power-panel", title: "ランキング", period: true },
  ];

  for (const target of cases) {
    await page.locator(target.selector).click();
    const hub = page.locator(".ui-hub-page");
    await expect(hub.getByRole("heading", { name: target.title, exact: true })).toBeVisible();
    await expect(hub.locator(".ui-hero-panel").first()).toBeVisible();
    const pageMetrics = await hub.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    expect(pageMetrics.scrollWidth).toBeLessThanOrEqual(pageMetrics.clientWidth + 1);
    if (target.period) await expect(hub.locator(".period-status")).toBeVisible();
    if (target.title === "ランキング") {
      await expect(hub.locator(".ranking-category-nav")).toBeVisible();
      await expect(hub.locator(".ranking-category-nav .sub-tab-scroll-button.next")).toBeVisible();
      await expect(hub.locator(".ranking-hero-copy")).not.toContainText("--");
    }
    await page.locator(".footer-item").first().click();
    await expect(page.locator(target.selector)).toBeVisible();
  }
});
