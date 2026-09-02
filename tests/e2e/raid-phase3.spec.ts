import { expect, test, type Page } from "@playwright/test";

const ME = "00000000-0000-4000-8000-000000000801";
const RAID_ID = "20000000-0000-4000-8000-000000000801";
const CHARACTER_IDS = ["char_ageha_01", "char_reiji_01", "char_kengo_01", "char_koharu_01", "char_mio_01"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ me, raidId, characterIds }) => {
    const now = new Date().toISOString();
    localStorage.setItem("tribe_demo_uuid", me);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: me, step_id: "AUTHENTICATION" }]));
    localStorage.setItem("mock_db_user_account_auth_methods", JSON.stringify([{ user_id: me, auth_method: "EMAIL" }]));
    localStorage.setItem("mock_db_users", JSON.stringify([
      { id: me, username: "RaidTester", current_base_id: "shinjuku", favorite_character_id: characterIds[0], level: 10, raid_points: location.search.includes("emptyRp=1") ? 0 : 3, raid_free_entry_consumed: true, cash: 10000, neon_diamonds: 200 },
      ...[1, 2, 3].map((rank) => ({ id: `raid-rival-${rank}`, username: `RaidRival${rank}`, level: 10 })),
    ]));
    const owned = characterIds.map((characterId: string, index: number) => ({ id: `owned-raid-${index}`, user_id: me, character_id: characterId, level: 12 - index, awakening_level: index % 2, created_at: now }));
    localStorage.setItem("mock_db_user_characters", JSON.stringify(owned));
    localStorage.setItem("mock_db_user_main_formations", JSON.stringify(owned.map((entry: any, index: number) => ({ user_id: me, slot: index + 1, user_character_id: entry.id }))));
    localStorage.setItem("mock_db_user_power_rankings", JSON.stringify([{ user_id: me, total_power: 61096, rank_position: 4, updated_at: now }]));
    localStorage.setItem("mock_db_user_items", JSON.stringify([{ id: "raid-ticket", user_id: me, item_id: "RAID_POINT_TICKET", quantity: 2 }]));
    localStorage.setItem("mock_db_raid_bosses", JSON.stringify([{ id: raidId, boss_master_id: "RAID_BOSS_004", boss_name: "六本木・幻惑頭領", level: 30, current_hp: 16650000, max_hp: 22200000, base_id: "roppongi", profile_type: "DEBUFF", status: "ACTIVE", expires_at: new Date(Date.now() + 20 * 3600_000).toISOString(), skill_loadout: [{ id: "BASIC_ATTACK", name: "通常攻撃", target: "ENEMY_SINGLE", cooldown: 0, availableFromRound: 1, effects: ["DAMAGE 80% ATK"] }, { id: "RAID_SKILL_DEBUFF", name: "威圧", activationType: "ACTIVE", target: "ENEMY_ALL", cooldown: 4, availableFromRound: 2, effects: ["DAMAGE 110% ATK", "ATK -20% / 2T"] }] }]));
    localStorage.setItem("mock_db_raid_boss_master", JSON.stringify([{ id: "RAID_BOSS_004", boss_name: "六本木・幻惑頭領", level: 30, max_hp: 22200000, atk: 6455, def: 5740, spd: 358, luk: 28, skills: [{ id: "BASIC_ATTACK", name: "通常攻撃", target: "ENEMY_SINGLE", cooldown: 0, effects: ["DAMAGE 80% ATK"] }, { id: "RAID_SKILL_DEBUFF", name: "威圧", target: "ENEMY_ALL", cooldown: 4, effects: ["DAMAGE 110% ATK", "ATK -20% / 2T"] }] }]));
    localStorage.setItem("mock_db_raid_damage_logs", JSON.stringify([
      { user_id: me, raid_boss_instance_id: raidId, raw_damage: 123456, created_at: now },
      ...[1, 2, 3].map((rank) => ({ user_id: `raid-rival-${rank}`, raid_boss_instance_id: raidId, raw_damage: 500000 - rank * 50000, created_at: now })),
    ]));
    localStorage.setItem("mock_db_guilds", JSON.stringify([]));
    localStorage.setItem("mock_db_guild_members", JSON.stringify([]));
  }, { me: ME, raidId: RAID_ID, characterIds: CHARACTER_IDS });
});

async function openRaid(page: Page, path = "/") {
  await page.goto(path);
  await page.getByRole("button", { name: "TAP TO START" }).click();
  await page.getByRole("button", { name: "続きから" }).click();
  await expect(page.locator(".header-mobile")).toBeVisible();
  await page.locator(".mypage-sub-icons-left .sub-icon-unit").filter({ hasText: "レイド" }).click();
  await expect(page.locator(".raid-view")).toBeVisible();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`Raid Top and pre-battle mobile hierarchy ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openRaid(page);
    await expect(page.locator(".raid-context")).toHaveCount(0);
    await expect(page.locator(".raid-view")).not.toContainText("出現中の強敵");
    await expect(page.locator(".raid-boss-stage")).toContainText("六本木・幻惑頭領");
    await expect(page.locator(".raid-boss-visual")).toBeVisible();
    await expect(page.locator(".raid-hp-text")).toContainText("16,650,000 / 22,200,000");
    await expect(page.locator(".raid-status-grid")).toContainText("3 / 5");
    await expect(page.locator(".raid-status-grid")).toContainText("4位");
    const topGeometry = await page.locator(".raid-view").evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    expect(topGeometry.scrollWidth).toBeLessThanOrEqual(topGeometry.clientWidth + 1);
    const challenge = page.getByRole("button", { name: "挑戦する" });
    expect(await challenge.evaluate((node) => node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(viewport.height);

    await challenge.click();
    await expect(page.locator(".raid-battle-setup")).toBeVisible();
    await expect(page.locator(".raid-battle-target")).toContainText("六本木・幻惑頭領");
    await expect(page.locator(".raid-battle-boss-visual")).toBeVisible();
    await expect(page.locator(".raid-battle-boss-skills .shared-skill-icon")).toHaveCount(2);
    await page.locator(".raid-battle-boss-skills .shared-skill-icon").nth(1).click();
    await expect(page.getByRole("dialog", { name: "威圧の詳細" })).toContainText("威圧");
    await page.getByRole("dialog", { name: "威圧の詳細" }).getByRole("button", { name: "閉じる", exact: true }).last().click();
    expect(await page.locator(".raid-battle-setup").evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("bg_street_roppongi.jpg");
    await expect(page.locator(".raid-battle-deck .character-presentation")).toHaveCount(5);
    await expect(page.locator(".raid-battle-deck")).toContainText("総合力");
    await expect(page.locator(".raid-battle-resource")).toContainText("3 / 5");
    await expect(page.getByRole("button", { name: "討伐開始" })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_users") || "[]")[0].raid_points)).toBe(3);
    const briefingGeometry = await page.locator(".raid-battle-setup").evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    expect(briefingGeometry.scrollWidth).toBeLessThanOrEqual(briefingGeometry.clientWidth + 1);
    await page.getByRole("button", { name: "レイドへ戻る" }).click();
    await expect(page.locator(".raid-view")).toBeVisible();
  });
}

test("RP zero opens canonical recovery without starting Raid", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openRaid(page, "/?emptyRp=1");
  await page.evaluate(({ me }) => localStorage.setItem("mock_db_user_items", JSON.stringify([{ id: "raid-ticket", user_id: me, item_id: "RAID_POINT_TICKET", quantity: 2 }])), { me: ME });
  await page.getByRole("button", { name: "最新状態へ更新" }).click();
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "挑戦する" }).click();
  await expect(page.getByRole("dialog", { name: "RPが不足しています" })).toBeVisible();
  await page.getByRole("button", { name: "回復する" }).click();
  await expect(page.getByRole("dialog", { name: "RP回復" })).toContainText("所持 ×2");
  await expect(page.locator(".raid-battle-setup")).toHaveCount(0);
});
