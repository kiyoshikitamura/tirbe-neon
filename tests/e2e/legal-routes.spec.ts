import { expect, test, type Page } from "@playwright/test";

const USER_ID = "00000000-0000-4000-8000-0000000001a1";

async function seedAuthenticatedPlayer(page: Page) {
  await page.addInitScript((userId) => {
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_users", JSON.stringify([{
      id: userId,
      username: "法的情報確認",
      current_base_id: "shinjuku",
      favorite_character_id: "char_reiji_01",
    }]));
    localStorage.setItem("mock_db_feature_operating_states", JSON.stringify([
      { feature_key: "PRE_OPEN", state: "OPEN" },
    ]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{
      id: "legal-character-1",
      user_id: userId,
      character_id: "char_reiji_01",
      level: 1,
      awakening_level: 0,
    }]));
  }, USER_ID);
}

async function enterGame(page: Page) {
  await page.goto("/");
  const tap = page.getByRole("button", { name: "TAP TO START" });
  const resume = page.getByRole("button", { name: "続きから" });
  const header = page.locator(".header-mobile");
  await expect(tap.or(resume).or(header)).toBeVisible();
  if (await tap.isVisible()) await tap.click();
  if (await resume.isVisible()) await resume.click();
  await expect(header).toBeVisible();
  const loginBonus = page.getByRole("dialog", { name: "ログインボーナス" });
  await loginBonus.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  if (await loginBonus.isVisible()) await loginBonus.getByRole("button", { name: "閉じる", exact: true }).click();
}

const legalRoutes = [
  { path: "/legal/terms", title: "利用規約", notice: "開発・検証環境用の草案" },
  { path: "/legal/privacy", title: "プライバシーポリシー", notice: "開発・検証環境用の草案" },
  { path: "/legal/commercial", title: "特定商取引法に基づく表記", notice: "未確定" },
] as const;

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
  for (const legal of legalRoutes) {
    test(`${legal.title} remains explicit and mobile-safe at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(legal.path);
      await expect(page.getByRole("heading", { name: legal.title, level: 1 })).toBeVisible();
      await expect(page.locator(".legal-page-notice")).toContainText(legal.notice);
      await expect(page.getByRole("navigation", { name: "法的情報" }).getByRole("link")).toHaveCount(3);
      await expect(page.getByText("株式会社〇〇", { exact: false })).toHaveCount(0);
      await expect(page.getByText("info@example.com", { exact: false })).toHaveCount(0);

      const geometry = await page.locator(".legal-page").evaluate((root) => ({
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        linkHeights: Array.from(root.querySelectorAll("a")).map((link) => link.getBoundingClientRect().height),
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
      expect(geometry.linkHeights.every((height) => height >= 44)).toBe(true);
    });
  }
}

test("authenticated Settings exposes the canonical legal routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAuthenticatedPlayer(page);
  await enterGame(page);
  await page.getByRole("button", { name: /^MENU(?:\s|$)/ }).click();
  await page.getByRole("dialog", { name: "ホームメニュー" }).getByRole("button", { name: "設定", exact: true }).click();

  const legalNavigation = page.getByRole("navigation", { name: "法的情報" });
  await expect(legalNavigation.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/legal/terms");
  await expect(legalNavigation.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute("href", "/legal/privacy");
  await expect(legalNavigation.getByRole("link", { name: "特定商取引法に基づく表記" })).toHaveAttribute("href", "/legal/commercial");
});

test("pre-open keeps real-money products closed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAuthenticatedPlayer(page);
  await enterGame(page);

  await expect(page.getByRole("button", { name: "ショップは準備中です" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^¥/ })).toHaveCount(0);
});
