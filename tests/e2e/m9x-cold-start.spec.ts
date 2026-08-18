import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(60_000);

test("tutorial ten-pull guarantees slot 10 SSR and formation advances without Growth", async ({ page }) => {
  const userId = "00000000-0000-4000-8000-000000009901";
  await page.addInitScript(({ userId }) => {
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "ANONYMOUS");
    localStorage.setItem("mock_db_users", JSON.stringify([{ id:userId,username:"M9X QA",level:1,cash:0,neon_diamonds:0,vitality:100,current_base_id:"shinjuku" }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id:userId,step_id:"FREE_GACHA" }]));
    localStorage.setItem("mock_db_gacha_masters", JSON.stringify([{ id:"CHAR_NORMAL",gacha_type:"CHARACTER",cost_cash:1000,cost_diamond:100,is_active:true }]));
    localStorage.setItem("mock_db_gacha_items_master", JSON.stringify([
      { gacha_id:"CHAR_NORMAL",item_id:"char_go_01",rarity:"R" },
      { gacha_id:"CHAR_NORMAL",item_id:"char_kengo_01",rarity:"SR" },
      { gacha_id:"CHAR_SPECIAL",item_id:"char_ssr_01",rarity:"SSR" },
    ]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{ id:"starter-m9x",user_id:userId,character_id:"char_go_01",level:1,awakening_level:0 }]));
    localStorage.setItem("mock_db_user_skills", "[]");
    localStorage.setItem("mock_db_user_main_formations", "[]");
    localStorage.setItem("mock_db_gacha_execution_history", "[]");
  }, { userId });

  await page.goto("/");
  await page.getByRole("button", { name:"TAP TO START" }).click();
  const freeCta = page.locator(".gacha-free-btn");
  await expect(freeCta).toBeEnabled();
  await freeCta.click();
  const reveal = page.locator(".tutorial-gacha-reveal");
  await expect(reveal).toBeVisible({ timeout:15_000 });
  for (let index=0; index<9; index+=1) await reveal.click();
  await expect(reveal).toHaveClass(/is-guaranteed/);
  await expect(reveal).toContainText("SSR GUARANTEED");
  await reveal.click();
  await expect(page.locator(".gacha-result-card")).toHaveCount(10);
  const payload = await page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_gacha_execution_history") || "[]")[0]?.result_payload);
  expect(payload.results).toHaveLength(10);
  expect(payload.results[9].rarity).toBe("SSR");
  expect(payload.guaranteed_ssr_slot).toBe(10);

  await page.locator(".gacha-result-next").click();
  const formation = page.locator(".char-party-auto-btn");
  await expect(formation).toBeVisible();
  await formation.click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("DISPATCH");
  await expect(page.locator(".tutorial-character-step")).toHaveCount(0);
  await expect(page.locator(".patrol-container")).toBeVisible();
});

test("M9-X entry and Mission Hub remain mobile-safe", async ({ page }) => {
  await page.goto("/");
  for (const width of [375,390,430]) {
    await page.setViewportSize({ width,height:844 });
    const title = page.locator(".title-view-overlay");
    await expect(title).toBeVisible();
    const metrics = await title.evaluate(node=>({ scrollWidth:node.scrollWidth,clientWidth:node.clientWidth }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  }
});
