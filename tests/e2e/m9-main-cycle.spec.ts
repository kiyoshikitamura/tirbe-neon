import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const me = "00000000-0000-4000-8000-000000000101";
    const rivals = ["00000000-0000-4000-8000-000000000102", "00000000-0000-4000-8000-000000000103"];
    const now = new Date().toISOString();
    localStorage.setItem("tribe_demo_uuid", me);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_users", JSON.stringify([
      { id: me, username: "V0確認", current_base_id: "shinjuku", favorite_character_id: "char_reiji_01", level: 10, cash: 50000, pvp_points: 5 },
      { id: rivals[0], username: "街の強敵A", level: 12, total_power: 23500 },
      { id: rivals[1], username: "街の強敵B", level: 11, total_power: 21000 },
    ]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([
      { id: "10000000-0000-4000-8000-000000000001", user_id: me, character_id: "char_reiji_01", level: 12, awakening_level: 2, created_at: now },
      { id: "10000000-0000-4000-8000-000000000002", user_id: me, character_id: "char_rui_01", level: 10, awakening_level: 1, created_at: now },
      { id: "10000000-0000-4000-8000-000000000003", user_id: me, character_id: "char_chang_01", level: 9, awakening_level: 0, created_at: now },
      { id: "10000000-0000-4000-8000-000000000102", user_id: rivals[0], character_id: "char_reiji_01", name: "レイジ", rarity: "SSR", level: 12, awakening_level: 1, created_at: now },
    ]));
    localStorage.setItem("mock_db_user_skills", JSON.stringify([
      { id: "skill-owned-1", user_id: me, skill_card_id: "SKILL_001", plus_val: 3, equipped_character_id: "10000000-0000-4000-8000-000000000001", slot_index: 0 },
      { id: "skill-owned-2", user_id: me, skill_card_id: "SKILL_005", plus_val: 1, equipped_character_id: null, slot_index: null },
    ]));
    localStorage.setItem("mock_db_skill_battle_master", JSON.stringify([
      { skill_id: "SKILL_001", display_name: "ストリートパンチ", enabled: true, kind: "ATTACK", target: "ENEMY_SINGLE", cooldown: 2 },
      { skill_id: "SKILL_005", display_name: "毒針", enabled: true, kind: "ATTACK", target: "ENEMY_SINGLE", cooldown: 2, status: "POISON" },
    ]));
    localStorage.setItem("mock_db_user_equipments", JSON.stringify([
      { id: "equip-owned-1", user_id: me, equipment_id: "WEAPON_001", level: 8, plus_val: 2, equipped_character_id: "10000000-0000-4000-8000-000000000001", slot_index: 0, created_at: now },
      { id: "equip-owned-2", user_id: me, equipment_id: "BODY_001", level: 4, plus_val: 0, equipped_character_id: null, slot_index: null, created_at: now },
    ]));
    localStorage.setItem("mock_db_user_items", JSON.stringify([{ id: "item-1", user_id: me, item_id: "CHAR_EXP_S", quantity: 10 }, { id: "item-2", user_id: me, item_id: "EQUIP_EXP_S", quantity: 5 }]));
    const pvpRanks = [
      { user_id: rivals[0], rank_points: 1250, daily_wins: 5, season_wins: 14, updated_at: now },
      { user_id: rivals[1], rank_points: 1150, daily_wins: 3, season_wins: 9, updated_at: now },
      { user_id: me, rank_points: 1100, daily_wins: 2, season_wins: 4, updated_at: now },
    ];
    localStorage.setItem("mock_db_pvp_ranks", JSON.stringify(location.search.includes("freshPvp=1") ? pvpRanks.filter((entry) => entry.user_id !== me) : pvpRanks));
    localStorage.setItem("mock_db_pvp_defense_decks", JSON.stringify([
      { user_id: rivals[0], character_1_id: "10000000-0000-4000-8000-000000000102", tactic: "BALANCED" },
      { user_id: rivals[1], character_1_id: "10000000-0000-4000-8000-000000000102", tactic: "BALANCED" },
    ]));
    localStorage.setItem("mock_db_user_main_formations", JSON.stringify([
      { user_id: me, slot: 1, user_character_id: "10000000-0000-4000-8000-000000000001" },
      { user_id: me, slot: 2, user_character_id: "10000000-0000-4000-8000-000000000002" },
      { user_id: me, slot: 3, user_character_id: "10000000-0000-4000-8000-000000000003" },
      { user_id: rivals[0], slot: 1, user_character_id: "10000000-0000-4000-8000-000000000102" },
    ]));
    localStorage.setItem("mock_db_user_power_rankings", JSON.stringify([
      { user_id: rivals[0], total_power: 23500, updated_at: now }, { user_id: rivals[1], total_power: 21000, updated_at: now }, { user_id: me, total_power: 19000, updated_at: now },
    ]));
    localStorage.setItem("mock_db_raid_bosses", JSON.stringify([{ id: "20000000-0000-4000-8000-000000000001", boss_master_id: "BOSS_001", boss_name: "極道連合組長", level: 99, current_hp: 7500000, max_hp: 10000000, base_id: "shinjuku", status: "ACTIVE", expires_at: new Date(Date.now() + 86400000).toISOString() }]));
    localStorage.setItem("mock_db_guilds", JSON.stringify([
      { id: "30000000-0000-4000-8000-000000000001", name: "NEON WOLVES", level: 8, member_count: 6, member_limit: 10, approval_required: false, description: "毎日活動中" },
      { id: "30000000-0000-4000-8000-000000000002", name: "夜街連合", level: 6, member_count: 5, member_limit: 10, approval_required: true, description: "レイド重視" },
      { id: "30000000-0000-4000-8000-000000000003", name: "CYAN EDGE", level: 5, member_count: 4, member_limit: 10, approval_required: false, description: "初心者歓迎" },
    ]));
    localStorage.setItem("mock_db_guild_members", JSON.stringify([]));
    const mission = { id: "ob_daily_patrol_01", title: "本日のシノギ", description: "クエスト派遣を1回完了する", category: "DAILY", trigger_type: "PATROL_CLEAR", target_value: 1, reward_item_id: "CASH", reward_quantity: 1000, condition_params: { cta_tab: "patrol", cta_label: "クエストへ" }, display_order: 20, is_enabled: true, is_provisional: false };
    localStorage.setItem("mock_db_missions", JSON.stringify([mission]));
    const cycleDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    localStorage.setItem("mock_db_user_missions", JSON.stringify([{ id: "user-ob-daily-patrol", user_id: me, mission_id: mission.id, cycle_date: cycleDate, current_progress: 1, status: "CLEAR", claimed_at: null, missions: mission }]));
  });
});

async function enterGame(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "TAP TO START" }).click();
  await expect(page.locator(".header-mobile")).toBeVisible();
}

async function mobileFramePass(page: import("@playwright/test").Page, selector: string, name: string) {
  for (const width of [375, 390, 412, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator(selector).first().evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    await page.screenshot({ path: test.info().outputPath(`${name}-${width}.png`) });
  }
}

test("M9-V0 main cycle presents growth, mission, PvP, ranking, raid and guild discovery", async ({ page }) => {
  await enterGame(page);

  await page.getByRole("button", { name: /キャラ/ }).click();
  await expect(page.locator(".char-identity-summary")).toContainText("RARITY");
  await expect(page.locator(".char-layer-character .character-presentation-portrait")).toBeVisible();
  await page.getByRole("button", { name: "強化", exact: true }).click();
  await page.getByRole("button", { name: "スキル", exact: true }).click();
  await expect(page.locator(".char-skill-spec").first()).toContainText("再使用 3T");
  await page.getByRole("button", { name: "装備", exact: true }).click();
  await expect(page.getByText("装備強化・限界突破")).toBeVisible();
  await mobileFramePass(page, ".char-tab-container", "character-skill-equipment");
  await page.getByRole("button", { name: /閉じる/ }).click();

  await page.getByRole("button", { name: /マイページ/ }).click();
  await page.getByRole("button", { name: /ミッション/ }).click();
  await expect(page.locator(".mission-status")).toHaveText("受取可能");
  await expect(page.locator(".mission-reward")).toContainText("CASH");
  await mobileFramePass(page, ".mission-panel-container-inner", "mission");
  await page.getByRole("button", { name: /閉じる/ }).click();

  await page.locator(".circle-menu-btn.fight").click();
  await expect(page.locator(".pvp-hero")).toBeVisible();
  await expect(page.locator(".pvp-self-summary")).toContainText("順位");
  await expect(page.locator(".pvp-self-summary")).toContainText("RATE");
  await expect(page.locator(".pvp-self-summary")).toContainText("BP");
  await expect(page.locator(".pvp-point-strip")).toContainText("BP回復");
  await expect(page.locator(".pvp-my-deck")).toContainText("総合力");
  await expect(page.locator(".pvp-opponent-card").first()).toContainText("総合力");
  await expect(page.locator(".pvp-opponent-card").first()).toContainText("順位 1位");
  await expect(page.locator(".pvp-opponent-card").first()).toContainText("LEADER");
  await expect(page.locator(".pvp-opponent-card").first()).toContainText("総合力差");
  await expect(page.locator(".pvp-opponent-card").first().getByRole("button", { name: "対戦する" })).toBeVisible();
  await expect(page.locator(".pvp-opponent-deck .character-presentation-thumbnail").first()).toBeVisible();
  expect(await page.locator(".pvp-opponent-card").first().evaluate((node) => node.getBoundingClientRect().top < window.innerHeight)).toBe(true);
  await mobileFramePass(page, ".pvp-view", "pvp");
  await page.getByRole("button", { name: "ランキング", exact: true }).click();
  await expect(page.locator(".ranking-hero-copy")).toContainText("あなたの現在地");
  await expect(page.getByRole("button", { name: "PvPへ戻る" })).toBeVisible();
  await page.locator(".ranking-tab-view .clickable-item").first().click();
  await expect(page.locator(".modal-card").getByText("街の強敵A", { exact: true })).toBeVisible();
  await expect(page.getByText("総合力", { exact: false }).last()).toBeVisible();
  await page.getByRole("button", { name: "閉じる" }).click();
  await mobileFramePass(page, ".ranking-tab-view", "ranking");

  await page.getByRole("button", { name: /マイページ/ }).click();
  await page.getByRole("button", { name: "⚠ レイド開催中", exact: true }).click();
  await expect(page.locator(".raid-boss-stage")).toContainText("極道連合組長");
  await expect(page.locator(".raid-contribution-grid")).toContainText("個人Contribution");
  await mobileFramePass(page, ".raid-view", "raid");

  await page.getByRole("button", { name: /ギルド/ }).click();
  await expect(page.locator(".guild-activity-line").first()).toContainText("Raid");
  await page.locator(".guild-detail-trigger").first().click();
  await expect(page.locator(".guild-public-status-grid")).toContainText("OPEN SLOTS");
  await expect(page.getByRole("button", { name: /このTRIBEに加入する|加入申請する/ })).toBeVisible();
  await mobileFramePass(page, ".guild-lobby-view", "guild-detail");
});

test("Fresh player outside public top 100 receives opponents on first PvP view", async ({ page }) => {
  test.setTimeout(35_000);
  await page.goto("/?freshPvp=1");
  await page.getByRole("button", { name: "TAP TO START" }).click();
  await page.locator(".circle-menu-btn.fight").click();
  await expect(page.locator(".pvp-opponent-card")).toHaveCount(2);
  await expect(page.getByText("対戦相手が見つかりません")).toHaveCount(0);
});

test("PvP MY DECK and pre-battle use the same main formation and mobile CTA flow", async ({ page }) => {
  await enterGame(page);
  await page.locator(".circle-menu-btn.fight").click();
  await expect(page.locator(".pvp-hero")).toBeVisible();
  await expect(page.locator(".pvp-my-deck-member")).toHaveCount(3);
  const deckIds = await page.locator(".pvp-my-deck-member").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-character-id")));
  expect(deckIds).toEqual(["char_reiji_01", "char_rui_01", "char_chang_01"]);

  await page.locator(".pvp-opponent-card").first().getByRole("button", { name: "対戦する" }).click();
  await expect(page.locator(".setup-container")).toBeVisible();
  const setupIds = await page.locator(".setup-char-card").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-character-id")));
  expect(setupIds).toEqual(deckIds);
  await expect(page.locator(".setup-char-card .character-presentation-meta")).toHaveCount(0);
  await expect(page.locator(".setup-enemy-mini-card .character-presentation-meta")).toHaveCount(0);
  await expect(page.locator(".setup-stat-summary").first()).toContainText("総合力");
  await expect(page.locator(".setup-stat-summary").first()).toContainText("ATK");

  const tactic = page.locator(".setup-tactic-wrapper");
  const cta = page.locator(".setup-cta-area");
  for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    const geometry = await Promise.all([tactic.boundingBox(), cta.boundingBox()]);
    expect(geometry[0]).not.toBeNull();
    expect(geometry[1]).not.toBeNull();
    expect(geometry[1]!.y).toBeGreaterThanOrEqual(geometry[0]!.y + geometry[0]!.height);
    const ctaBoxes = await cta.locator("button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect()).map((box) => ({ left: box.left, right: box.right, width: box.width })));
    expect(ctaBoxes).toHaveLength(2);
    expect(Math.abs(ctaBoxes[0].left - ctaBoxes[1].left)).toBeLessThanOrEqual(1);
    expect(Math.abs(ctaBoxes[0].width - ctaBoxes[1].width)).toBeLessThanOrEqual(1);
    expect(ctaBoxes.every((box) => box.left >= 0 && box.right <= viewport.width + 1)).toBe(true);
  }
  await page.getByRole("button", { name: "変更", exact: true }).click();
  await expect(page.locator(".tactic-dialog-options")).toBeVisible();
  await page.getByRole("button", { name: /バランス/ }).click();
  await expect(page.locator(".setup-tactic-current")).toContainText("バランス");
  await page.getByRole("button", { name: "対戦をやめる" }).click();
  await expect(page.locator(".pvp-view")).toBeVisible();
});
