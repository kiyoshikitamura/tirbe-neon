import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const userId = "00000000-0000-4000-8000-000000000829";
    const now = new Date().toISOString();
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_users", JSON.stringify([{ id: userId, username: "Presentation QA", current_base_id: "shinjuku", favorite_character_id: "char_reiji_01", level: 10, cash: 50000, vitality: 100 }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([
      { id: "character-owned-1", user_id: userId, character_id: "char_reiji_01", level: 12, awakening_level: 3, created_at: now },
      { id: "character-owned-2", user_id: userId, character_id: "char_rui_01", level: 10, awakening_level: 1, created_at: now },
      { id: "character-owned-3", user_id: userId, character_id: "char_chang_01", level: 9, awakening_level: 0, created_at: now },
    ]));
    localStorage.setItem("mock_db_user_main_formations", JSON.stringify([
      { user_id: userId, slot: 1, user_character_id: "character-owned-1" },
      { user_id: userId, slot: 2, user_character_id: "character-owned-2" },
      { user_id: userId, slot: 3, user_character_id: "character-owned-3" },
    ]));
    localStorage.setItem("mock_db_user_skills", JSON.stringify([
      { id: "skill-owned-1", user_id: userId, skill_card_id: "SKILL_001", level: 4, plus_val: 3, equipped_character_id: "character-owned-1", slot_index: 0 },
      { id: "skill-owned-2", user_id: userId, skill_card_id: "SKILL_005", level: 2, plus_val: 1, equipped_character_id: null, slot_index: null },
    ]));
    localStorage.setItem("mock_db_skill_battle_master", JSON.stringify([
      { skill_id: "SKILL_001", display_name: "ストリートパンチ", enabled: true, kind: "ATTACK", target: "ENEMY_SINGLE", cooldown: 2 },
      { skill_id: "SKILL_005", display_name: "毒針", enabled: true, kind: "ATTACK", target: "ENEMY_SINGLE", cooldown: 2 },
    ]));
    localStorage.setItem("mock_db_user_equipments", JSON.stringify([
      { id: "equipment-owned-1", user_id: userId, equipment_id: "WEAPON_001", level: 8, plus_val: 2, equipped_character_id: "character-owned-1", slot_index: 0, created_at: now },
      { id: "equipment-owned-2", user_id: userId, equipment_id: "BODY_001", level: 4, plus_val: 0, equipped_character_id: null, slot_index: null, created_at: now },
    ]));
    localStorage.setItem("mock_db_user_items", JSON.stringify([
      { id: "item-char-s", user_id: userId, item_id: "CHAR_EXP_S", quantity: 10 },
      { id: "item-char-m", user_id: userId, item_id: "CHAR_EXP_M", quantity: 5 },
      { id: "item-char-l", user_id: userId, item_id: "CHAR_EXP_L", quantity: 2 },
      { id: "item-awaken", user_id: userId, item_id: "AWAKENING_BOOK", quantity: 1 },
      { id: "item-equip-s", user_id: userId, item_id: "EQUIP_EXP_S", quantity: 5 },
    ]));
    localStorage.setItem("mock_db_quests", JSON.stringify([
      { id: "q_shinjuku_1", name: "歌舞伎町 夜間見回り", town_id: "shinjuku", level_type: "EASY", duration_seconds: 900, cost_vitality: 5, cash_reward: 300, exp_reward: 100 },
      { id: "q_shinjuku_2", name: "繁華街 警戒任務", town_id: "shinjuku", level_type: "NORMAL", duration_seconds: 1200, cost_vitality: 8, cash_reward: 450, exp_reward: 140 },
    ]));
    localStorage.setItem("mock_db_user_quest_first_clears", JSON.stringify([{ user_id: userId, quest_id: "q_shinjuku_1", cleared_at: now }]));
  });
});

async function enterGame(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /TAP TO START|続きから/ }).click();
  await expect(page.locator(".header-mobile")).toBeVisible();
}

async function expectMobileGeometry(page: import("@playwright/test").Page, selector: string) {
  const geometry = await page.locator(selector).evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    left: node.getBoundingClientRect().left,
    right: node.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
}

test("Character, Party, Growth, Skill and Equipment follow the fixed mobile hierarchy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterGame(page);
  await page.locator('.footer-item[aria-label="キャラ"]').click();
  await expect(page.locator(".character-v2-shell")).toBeVisible();
  await expect(page.locator(".character-v2-character-grid .character-v2-card")).toHaveCount(3);
  await expectMobileGeometry(page, ".character-v2-shell");
  await page.screenshot({ path: test.info().outputPath("character-list-390.png") });

  await page.locator(".character-v2-character-grid .character-v2-card").first().click();
  for (const label of ["HP", "ATK", "DEF", "SPD", "LUK"]) await expect(page.locator(".character-v2-stats")).toContainText(label);
  await expect(page.getByText("装備中Skill", { exact: true })).toBeVisible();
  await expect(page.getByText("装備中アイテム", { exact: true })).toBeVisible();
  await expect(page.getByText(/^(正義|悪|秩序|混沌)$/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("character-detail-390.png"), fullPage: true });
  await page.getByRole("button", { name: "強化", exact: true }).click();
  await expect(page.getByText("強化ドリンク・小", { exact: true })).toBeVisible();
  await expect(page.getByText("強化ドリンク・中", { exact: true })).toBeVisible();
  await expect(page.getByText("強化ドリンク・大", { exact: true })).toBeVisible();
  await expect(page.getByText("覚醒の書", { exact: true })).toBeVisible();
  await expect(page.getByText("同一Character Duplicate取得時は自動覚醒します。", { exact: true })).toHaveCount(0);
  await page.locator(".character-v2-material").first().locator("button").last().click();
  await expect(page.locator(".character-v2-current-after").first()).toContainText("Lv.13");
  await expect(page.locator(".character-v2-preview-stats")).toBeVisible();

  await page.locator(".character-v2-main-nav").getByRole("button", { name: "パーティ", exact: true }).click();
  await expect(page.locator(".character-v2-party-slots > *")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "おまかせ編成", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "おまかせ装備", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "パーティ保存", exact: true })).toBeVisible();

  await page.locator(".character-v2-main-nav").getByRole("button", { name: "スキル", exact: true }).click();
  await expect(page.locator(".character-v2-asset-grid .character-v2-asset-card")).toHaveCount(2);
  await page.locator(".character-v2-asset-grid .character-v2-asset-card").first().click();
  await expect(page.locator(".character-v2-mini-detail")).toBeVisible();
  await expect(page.locator(".canonical-dialog-close")).toHaveCount(0);
  await page.getByRole("button", { name: "強化", exact: true }).click();
  await expect(page.locator(".character-v2-asset-growth")).toBeVisible();
  await expect(page.locator(".character-v2-current-after")).toContainText("After");
  await page.getByRole("button", { name: "戻る", exact: true }).click();

  await page.locator(".character-v2-main-nav").getByRole("button", { name: "装備", exact: true }).click();
  await expect(page.locator(".character-v2-asset-grid .character-v2-asset-card")).toHaveCount(2);
  await page.locator(".character-v2-asset-grid .character-v2-asset-card").first().click();
  await page.getByRole("button", { name: "強化", exact: true }).click();
  await expect(page.locator(".character-v2-asset-growth")).toBeVisible();
  await expect(page.locator(".character-v2-current-after").first()).toContainText("After");
  await expectMobileGeometry(page, ".character-v2-shell");

  await page.setViewportSize({ width: 412, height: 915 });
  await expectMobileGeometry(page, ".character-v2-shell");
  await page.screenshot({ path: test.info().outputPath("character-system-412.png"), fullPage: true });
});

test("Normal Quest uses the tutorial-passed identity, enemy, reward and progress grammar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterGame(page);
  await page.locator('.footer-item[aria-label="クエスト"]').click();
  await expect(page.locator(".quest-v2-shell")).toBeVisible();
  await expect(page.locator(".quest-v2-shell > .ui-page-header")).toHaveCount(0);
  await expect(page.locator(".quest-v2-identity")).toContainText("クエスト選択");
  await expect(page.locator(".quest-v2-metrics")).toContainText("所要時間");
  await expect(page.locator(".quest-v2-enemies")).toContainText("出現する敵");
  await expect(page.locator(".quest-v2-enemies article > span").first()).toContainText(/^Lv /);
  await expect(page.locator(".quest-v2-enemies article > span").first()).not.toContainText(/^(N|R|SR|SSR)$/);
  await expect(page.locator(".quest-v2-rewards").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "新宿へ派遣する", exact: true })).toBeVisible();
  await expect(page.locator("[data-quest-state]" )).toHaveCount(0);
  await expectMobileGeometry(page, ".quest-v2-shell");

  const hometownCharacter = page.locator('.quest-v2-character-grid button[aria-label*="地元一致ボーナス"]').first();
  await expect(hometownCharacter).toBeVisible();
  await hometownCharacter.click();
  await expect(page.locator(".quest-v2-hometown-note")).toContainText("地元一致ボーナス対象");
  await page.getByRole("button", { name: "新宿へ派遣する", exact: true }).click();
  await expect(page.locator('[data-quest-state="PROGRESS"]')).toBeVisible();
  await expect(page.locator(".quest-v2-identity")).toHaveCount(0);
  await page.getByRole("button", { name: "別のクエストへ派遣", exact: true }).click();
  await expect(page.locator(".quest-v2-identity")).toBeVisible();
  const deployed = page.locator(".quest-v2-character-grid button.deployed");
  await expect(deployed).toHaveCount(1);
  await expect(deployed.locator(".quest-v2-character-visual > b")).toHaveText("派遣中");
  await deployed.click();
  await expect(page.locator('[data-quest-state="PROGRESS"]')).toBeVisible();
  await page.getByRole("button", { name: "別のクエストへ派遣", exact: true }).click();
  await page.locator(".quest-v2-courses").getByRole("button", { name: /中級/ }).click();
  await page.locator(".quest-v2-character-grid button:not(.deployed)").first().click();
  await page.getByRole("button", { name: "新宿へ派遣する", exact: true }).click();
  await expect(page.locator('[data-quest-state="PROGRESS"]')).toBeVisible();
  await page.getByRole("button", { name: "別のクエストへ派遣", exact: true }).click();
  await expect(page.locator(".quest-v2-character-grid button.deployed")).toHaveCount(2);
  await page.locator(".quest-v2-character-grid button.deployed").first().click();
  await expect(page.locator('[data-quest-state="PROGRESS"]')).toBeVisible();
  await page.getByRole("button", { name: "無料時短", exact: true }).click();
  await expect(page.locator('[data-quest-state="BATTLE_READY"], [data-quest-state="RESULT_READY"]')).toBeVisible();

  await page.setViewportSize({ width: 412, height: 915 });
  await expectMobileGeometry(page, ".quest-v2-shell");
  await page.screenshot({ path: test.info().outputPath("quest-parity-412.png"), fullPage: true });
});
