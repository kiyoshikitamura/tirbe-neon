import { expect, test, type Page } from "@playwright/test";

const EXISTING_USER_ID = "00000000-0000-4000-8000-000000000321";

async function seedExistingSave(page: Page, step = "COMPLETE", authMode = "ANONYMOUS") {
  await page.addInitScript(({ userId, tutorialStep, mode }) => {
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", mode);
    localStorage.setItem("mock_db_users", JSON.stringify([{
      id: userId,
      username: "継続確認",
      current_base_id: "town_shinjuku",
      favorite_character_id: "char_ageha_01",
    }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{
      user_id: userId,
      step_id: tutorialStep,
    }]));
    localStorage.setItem("mock_db_user_lifetime_onboarding_grants", JSON.stringify([{
      user_id: userId,
      canonical_payload: {
        gacha_results: Array.from({ length: 10 }, (_, index) => ({
          type: "CHARACTER", character_id: index === 9 ? "char_ageha_01" : `char_fixture_${index + 1}`,
          rarity: index === 9 ? "SSR" : "R", outcome: "new", tutorial_slot: index + 1,
        })),
        guaranteed_ssr: "char_ageha_01",
        growth_target_character: "char_ageha_01",
        growth_target_level: 7,
        starter_skill: "SKILL_001",
        formation_character_ids: ["char_ageha_01", "char_fixture_1", "char_fixture_2", "char_fixture_3", "char_fixture_4"],
        leader_character: "char_ageha_01",
      },
    }]));
  }, { userId: EXISTING_USER_ID, tutorialStep: step, mode: authMode });
}

test("title always exposes explicit new-game and continue choices", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "はじめから" })).toBeVisible();
  await expect(page.getByRole("button", { name: "続きから" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toHaveCount(0);
  await expect(page.locator(".home-container, .first-home-shell")).toHaveCount(0);
});

test("continue without a session opens the existing-account login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "続きから" }).click();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("new game without an existing save starts fresh anonymous tutorial", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "はじめから" }).click();
  await expect(page.getByRole("region", { name: "TRIBE NEON プロローグ" })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("mock_auth_mode"))).toBe("ANONYMOUS");
});

test("an authenticated identity without a gameplay save can start the fresh tutorial", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tribe_demo_uuid", "00000000-0000-4000-8000-000000000777");
    localStorage.setItem("mock_auth_mode", "GOOGLE");
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "はじめから" })).toBeEnabled();
  await page.getByRole("button", { name: "はじめから" }).click();
  await expect(page.getByRole("region", { name: "TRIBE NEON プロローグ" })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("mock_auth_mode"))).toBe("ANONYMOUS");
});

test("an existing save stays at title until continue is selected", async ({ page }) => {
  await seedExistingSave(page, "COMPLETE", "GOOGLE");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "続きから" })).toBeVisible();
  await expect(page.getByText("継続確認")).toHaveCount(0);
  await page.getByRole("button", { name: "続きから" }).click();
  await expect(page.getByRole("button", { name: "続きから" })).toHaveCount(0);
  await expect(page.getByRole("main")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_demo_uuid"))).toBe(EXISTING_USER_ID);
});

test("existing resettable save requires acknowledgement and resets through server authority", async ({ page }) => {
  await seedExistingSave(page);
  await page.goto("/");
  const original = await page.evaluate(() => ({
    userId: localStorage.getItem("tribe_demo_uuid"),
    users: localStorage.getItem("mock_db_users"),
    progress: localStorage.getItem("mock_db_tutorial_progress"),
  }));

  await page.getByRole("button", { name: "はじめから" }).click();
  const dialog = page.getByRole("dialog", { name: "ゲームデータの初期化" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("初期化対象 継続確認")).toBeVisible();
  await expect(dialog.getByText("継続確認", { exact: true })).toBeVisible();
  await expect(dialog.getByText("ACTIVITY", { exact: true })).toHaveCount(0);
  const destructive = dialog.getByRole("button", { name: "データを初期化してはじめる" });
  await expect(destructive).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await expect(destructive).toBeEnabled();
  await destructive.click();
  await expect(page.getByRole("dialog", { name: "アゲハからの案内" })).toBeVisible();

  const after = await page.evaluate(() => ({
    userId: localStorage.getItem("tribe_demo_uuid"),
    users: localStorage.getItem("mock_db_users"),
    progress: localStorage.getItem("mock_db_tutorial_progress"),
  }));
  expect(after.userId).toBe(original.userId);
  expect(JSON.parse(after.progress || "[]")[0].step_id).toBe("WORLD_INTRO");
  expect(JSON.parse(after.users || "[]")[0]).toMatchObject({ username: "継続確認", cash: 10000, neon_diamonds: 200, favorite_character_id: null });
});

test("cancel and payment denial preserve the existing save", async ({ page }) => {
  await seedExistingSave(page);
  await page.addInitScript(({ userId }) => localStorage.setItem("mock_db_payment_transactions", JSON.stringify([{ id: "paid", user_id: userId }])), { userId: EXISTING_USER_ID });
  await page.goto("/");
  const before = await page.evaluate(() => localStorage.getItem("mock_db_users"));
  await page.getByRole("button", { name: "はじめから" }).click();
  const dialog = page.getByRole("dialog", { name: "ゲームデータの初期化" });
  await expect(dialog.getByText("購入履歴があるアカウントはゲームデータを初期化できません。")).toBeVisible();
  await dialog.getByRole("checkbox").check();
  await expect(dialog.getByRole("button", { name: "データを初期化してはじめる" })).toBeDisabled();
  await dialog.getByRole("button", { name: "キャンセル" }).click();
  expect(await page.evaluate(() => localStorage.getItem("mock_db_users"))).toBe(before);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`title and reset dialog fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedExistingSave(page);
    await page.goto("/");
    await page.getByRole("button", { name: "はじめから" }).click();
    const geometry = await page.getByRole("dialog", { name: "ゲームデータの初期化" }).evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.horizontalOverflow).toBe(0);
  });
}
