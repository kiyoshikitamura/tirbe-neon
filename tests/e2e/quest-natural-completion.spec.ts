import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("normal Quest becomes claimable without reload after natural expiry", async ({ page }) => {
  await page.addInitScript(() => {
    const userId = "00000000-0000-4000-8000-000000000925";
    const now = Date.now();
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "GOOGLE");
    localStorage.setItem("mock_db_users", JSON.stringify([{
      id: userId,
      username: "通常クエストQA",
      level: 5,
      xp: 0,
      cash: 10000,
      vitality: 95,
      current_base_id: "shinjuku",
      favorite_character_id: "char_reiji_01",
    }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "AUTHENTICATION" }]));
    localStorage.setItem("mock_db_user_account_auth_methods", JSON.stringify([{ user_id: userId, auth_method: "GOOGLE" }]));
    localStorage.setItem("mock_db_auth_identities", JSON.stringify([{ user_id: userId, provider: "google" }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{
      id: `starter_${userId}`,
      user_id: userId,
      character_id: "char_reiji_01",
      level: 5,
      awakening_level: 0,
    }]));
    localStorage.setItem("mock_db_quests", JSON.stringify([{
      id: "q_shinjuku_1",
      name: "歌舞伎町 夜間見回り",
      town_id: "shinjuku",
      level_type: "EASY",
      duration_seconds: 15,
      cost_vitality: 5,
      cash_reward: 300,
      exp_reward: 100,
    }]));
    localStorage.setItem("mock_db_user_patrols", JSON.stringify([{
      id: "normal-natural-expiry",
      user_id: userId,
      course_id: "q_shinjuku_1",
      character_id: "char_reiji_01",
      started_at: new Date(now).toISOString(),
      expires_at: new Date(now + 15_000).toISOString(),
      status: "ONGOING",
      has_battle_event: true,
      battle_resolved: false,
      battle_result: null,
    }]));
  });

  await page.goto("/");
  await page.getByRole("button", { name: "続きから" }).click();
  const header = page.locator(".header-mobile");
  await expect(header).toBeVisible();

  await page.locator(".circle-menu-btn.conquest").click();
  await expect(page.locator(".patrol-container")).toBeVisible();
  await expect(page.getByText(/残り時間 00:\d{2}/)).toBeVisible();
  await expect(page.getByRole("button", { name: "バトルへ" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("クエスト完了")).toBeVisible();

  const geometry = await page.locator(".patrol-container").evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
});
