import { expect, test } from "@playwright/test";

const openScenario = async (page: import("@playwright/test").Page, id: string) => {
  await page.locator(`[data-scenario-id="${id}"]`).click();
  await expect(page.locator(".qa-stage")).toHaveAttribute("data-active-scenario", id);
};

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error(`[qa-harness pageerror] ${error.stack || error.message}`));
  await page.goto("/qa/presentation");
  await expect(page.locator('[data-qa-harness="presentation"]')).toBeVisible();
});

test("launcher exposes every approved presentation fixture and preserves human-only judgments", async ({ page }) => {
  await expect(page.locator("nav [data-scenario-id]")).toHaveCount(22);
  await expect(page.locator('[data-compliance-id="world-intro"]')).toHaveAttribute("data-status", "HUMAN_REQUIRED");
  await expect(page.locator('[data-compliance-id="skill-2x"]')).toHaveAttribute("data-status", "HUMAN_REQUIRED");
  await expect(page.locator('[data-compliance-id="battle-result"]')).toHaveAttribute("data-status", "HUMAN_REQUIRED");
});

test("SSR quote hides identity until explicit tap and then uses canonical town background", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openScenario(page, "gacha-ssr-reveal");
  const quote = page.locator('[data-presentation-state="SSR_QUOTE"]');
  await expect(quote).toBeVisible();
  await expect(quote).not.toHaveAttribute("data-character-id");
  await expect(quote).not.toContainText("レイジ");
  await expect(quote).not.toContainText("SSR");
  await expect(quote.getByText("TAP", { exact: true })).toBeVisible();
  await quote.click();
  const flashStage = page.locator('[data-presentation-state="SSR_FLASH"]');
  await expect(flashStage).toBeVisible();
  await expect(flashStage).not.toHaveAttribute("data-character-id");
  const flash = await flashStage.locator(".tutorial-ssr-flash").boundingBox();
  expect(flash).not.toBeNull();
  expect(flash!.x).toBeLessThanOrEqual(1);
  expect(flash!.y).toBeLessThanOrEqual(1);
  expect(flash!.width).toBeGreaterThanOrEqual(389);
  expect(flash!.height).toBeGreaterThanOrEqual(843);
  const reveal = page.locator('[data-presentation-state="SSR_REVEAL"]');
  await expect(reveal).toHaveAttribute("data-character-id", /char_/);
  await expect(reveal).toContainText("レイジ");
  await expect(reveal.locator(".character-presentation-background")).toHaveAttribute("src", /bg_street_/);
});

test("name duplicate error is owned by the current screen and does not return after retry", async ({ page }) => {
  await openScenario(page, "name-input-error");
  await expect(page.getByRole("alertdialog")).toContainText("すでに使用");
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.locator('[data-name-lifecycle="retry"]')).toBeVisible();
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await expect(page.locator('[data-name-lifecycle="success"]')).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  const next = page.locator('.setup-ageha-presentation .setup-primary-action');
  await expect(next).toBeEnabled();
  await expect(next).not.toHaveCSS("background-color", "rgb(95, 101, 108)");
  await expect(next).toHaveCSS("opacity", "1");
});

test("auto formation waits for explicit OK before the next route", async ({ page }) => {
  await openScenario(page, "auto-formation");
  await page.getByRole("button", { name: "おすすめ編成にする" }).click();
  await expect(page.locator('[data-auto-formation-state="complete"]')).toContainText("編成しました");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator('[data-auto-formation-state="continued"]')).toContainText("クエストへ進みます");
});

for (const [scenario, mode] of [["quest-normal-battle", "normal"], ["quest-instant-battle", "instant"]] as const) {
  test(`${mode} quest completion reaches encounter and battle`, async ({ page }) => {
    await openScenario(page, scenario);
    await page.getByRole("button", { name: mode === "normal" ? "通常完了を再現" : "時短完了を再現" }).click();
    await expect(page.locator('[data-quest-transition-state="complete"]')).toContainText("クエスト完了");
    await page.getByRole("button", { name: "次へ" }).click();
    await expect(page.locator('[data-quest-transition-state="encounter"]')).toContainText("バトル発生");
    await page.getByRole("button", { name: "バトルへ" }).click();
    await expect(page.locator(".quest-battle-viewer")).toBeVisible();
  });
}

test("production battle viewer renders actual 5v3 roster without empty slots", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openScenario(page, "battle-5v3");
  await expect(page.locator('.battle-party-zone.is-player [id^="player-"]')).toHaveCount(5);
  await expect(page.locator('.battle-party-zone.is-enemy [id^="enemy-"]')).toHaveCount(3);
  await expect(page.locator('.battle-party-zone.is-enemy')).toHaveAttribute("data-party-size", "3");
  await expect(page.locator(".battle-unit")).toHaveCount(8);
  for (const zone of ["is-player", "is-enemy"]) {
    const geometry = await page.locator(`.battle-party-zone.${zone}`).evaluate((element) => {
      const zoneBox = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll<HTMLElement>(".battle-unit")].map((card) => card.getBoundingClientRect());
      const hpBars = [...element.querySelectorAll<HTMLElement>(".battle-unit-hp")].map((bar) => bar.getBoundingClientRect());
      return {
        firstOffset: cards[0]?.top - zoneBox.top,
        gaps: cards.slice(1).map((card, index) => card.top - cards[index].bottom),
        hpOverflow: hpBars.some((bar, index) => bar.left < cards[index].left - 1 || bar.right > cards[index].right + 1),
      };
    });
    expect(geometry.firstOffset).toBeLessThan(34);
    expect(Math.max(...geometry.gaps)).toBeLessThanOrEqual(8);
    expect(geometry.hpOverflow).toBe(false);
  }
});

test("tutorial presentation advances from learned 1x actions to 2x and remains user-toggleable", async ({ page }) => {
  await openScenario(page, "battle-2x");
  await expect(page.locator(".quest-battle-viewer")).toHaveAttribute("data-battle-speed", "2");
  await page.locator(".speed-toggle-btn").click();
  await expect(page.locator(".quest-battle-viewer")).toHaveAttribute("data-battle-speed", "1");
});

test("SSR skill cut-in overlays the full roster rather than the center action column", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openScenario(page, "battle-ssr-skill");
  const viewer = await page.locator(".quest-battle-viewer").boundingBox();
  const cutIn = await page.locator(".battle-skill-cutin.is-ssr").boundingBox();
  expect(viewer).not.toBeNull();
  expect(cutIn).not.toBeNull();
  expect(Math.abs(cutIn!.x - viewer!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(cutIn!.width - viewer!.width)).toBeLessThanOrEqual(2);
  const target = page.locator('.battle-party-zone.is-enemy article#enemy-1');
  const hpFill = target.locator(".battle-unit-hp i");
  const hpBefore = await hpFill.evaluate((element) => (element as HTMLElement).style.width);
  await expect(page.locator(".battle-skill-cutin")).toHaveCount(0, { timeout: 1_250 });
  await expect(page.locator(".battle-skill-resolution-vfx")).toBeVisible({ timeout: 700 });
  await expect(page.locator('[data-action-phase="impact"], [data-action-phase="damage"], [data-action-phase="hp-transition"]')).toBeVisible({ timeout: 1_600 });
  const impact = page.locator(".battle-unit-impact-vfx");
  await expect(impact).toBeVisible();
  const targetBox = await target.boundingBox();
  const impactBox = await impact.boundingBox();
  expect(targetBox).not.toBeNull();
  expect(impactBox).not.toBeNull();
  expect(impactBox!.y).toBeLessThan(targetBox!.y + targetBox!.height);
  expect(impactBox!.y + impactBox!.height).toBeGreaterThan(targetBox!.y);
  await expect(page.locator(".battle-unit-popup")).toContainText("2,940");
  await expect.poll(() => hpFill.evaluate((element) => (element as HTMLElement).style.width), { timeout: 1_200 }).not.toBe(hpBefore);
  await expect(page.locator('[data-action-phase="action-hold"]')).toBeVisible({ timeout: 1_200 });
});

test("consecutive skills keep a visible roster gap between full-screen cut-ins", async ({ page }) => {
  await openScenario(page, "battle-consecutive-skill");
  await expect(page.locator(".battle-skill-cutin")).toContainText("ストリートパンチ");
  await expect(page.locator(".battle-skill-cutin")).toHaveCount(0, { timeout: 1_250 });
  await expect(page.locator(".battle-skill-resolution-vfx")).toBeVisible({ timeout: 700 });
  await expect(page.locator(".battle-unit-popup")).toBeVisible({ timeout: 1_200 });
  await expect(page.locator('[data-action-phase="action-hold"]')).toBeVisible({ timeout: 1_200 });
  await expect(page.locator(".battle-skill-cutin")).toContainText("ネオンブレイク", { timeout: 1_400 });
});

test("FINAL HIT is a full-screen overlay and does not resize the roster", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openScenario(page, "battle-final-hit");
  const overlay = page.locator(".battle-final-hit-overlay");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS("position", "absolute");
  for (const edge of ["top", "right", "bottom", "left"]) await expect(overlay).toHaveCSS(edge, "0px");
  await expect(page.locator(".battle-roster-stage")).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`World Intro keeps pure-black viewport edges at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openScenario(page, "world-introduction");
    const geometry = await page.locator(".tutorial-world").evaluate((world) => {
      const worldBox = world.getBoundingClientRect();
      const contentBox = world.querySelector<HTMLElement>(".tutorial-world-content")!.getBoundingClientRect();
      const style = getComputedStyle(world);
      return { backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, worldBox: { left: worldBox.left, right: worldBox.right }, contentBox: { left: contentBox.left, right: contentBox.right } };
    });
    expect(geometry.backgroundColor).toBe("rgb(0, 0, 0)");
    expect(geometry.backgroundImage).toBe("none");
    expect(geometry.contentBox.left).toBeGreaterThan(geometry.worldBox.left);
    expect(geometry.contentBox.right).toBeLessThan(geometry.worldBox.right);
  });
}

test("production result shows opponent, left MVP art, score and comparison", async ({ page }) => {
  await openScenario(page, "battle-result-win");
  await expect(page.locator(".battle-result-opponent")).toContainText("新宿・初級");
  await expect(page.locator(".battle-result-outcome-label")).toHaveCount(0);
  await expect(page.locator(".battle-result-mode-label")).toHaveText("クエストクリア");
  await expect(page.locator(".battle-result-mvp-hero .character-presentation")).toBeVisible();
  await expect(page.locator(".battle-result-mvp-copy b")).toContainText("PT");
  await expect(page.locator(".battle-result-score-grid")).toBeVisible();
  await expect(page.locator(".battle-result-mvp-copy strong")).toHaveText("レイジ");
  await expect(page.locator(".battle-result-score-grid > div")).toHaveCount(5);
  await expect(page.locator(".battle-result-score-grid")).toContainText("0 / 20");
  await expect(page.locator(".battle-result-score-grid")).toContainText("0 / 15");
  const heroGeometry = await page.locator(".battle-result-mvp").evaluate((card) => {
    const art = card.querySelector<HTMLElement>(".battle-result-mvp-character")!.getBoundingClientRect();
    const copy = card.querySelector<HTMLElement>(".battle-result-mvp-copy > div")!.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    return { artWidth: art.width, cardWidth: cardBox.width, artLeft: art.left, cardLeft: cardBox.left, nameScoreSameRow: copy.height < 48 };
  });
  expect(heroGeometry.artWidth).toBeGreaterThan(heroGeometry.cardWidth * 0.65);
  expect(heroGeometry.artLeft).toBeLessThanOrEqual(heroGeometry.cardLeft + 4);
  expect(heroGeometry.nameScoreSameRow).toBe(true);
  await expect(page.locator(".battle-result-score-grid > div").first()).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".battle-result-comparison header")).toContainText("味方");
  await expect(page.locator(".battle-result-comparison header")).toContainText("敵");
  await expect(page.locator(".battle-result-comparison")).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`C3-R6 gacha and battle geometry stays viewport-safe at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);

    await openScenario(page, "battle-5v3");
    for (const side of ["player", "enemy"]) {
      const overflow = await page.locator(`.battle-party-zone.is-${side}`).evaluate((zone) => {
        const cards = [...zone.querySelectorAll<HTMLElement>(".battle-unit")].map((entry) => entry.getBoundingClientRect());
        return [...zone.querySelectorAll<HTMLElement>(".battle-unit-hp")].some((bar, index) => {
          const box = bar.getBoundingClientRect();
          return box.left < cards[index].left - 1 || box.right > cards[index].right + 1;
        });
      });
      expect(overflow).toBe(false);
    }

    await openScenario(page, "battle-ssr-skill");
    const viewer = await page.locator(".quest-battle-viewer").boundingBox();
    const cutIn = await page.locator(".battle-skill-cutin.is-ssr").boundingBox();
    expect(viewer).not.toBeNull();
    expect(cutIn).not.toBeNull();
    expect(Math.abs(cutIn!.width - viewer!.width)).toBeLessThanOrEqual(2);

    await openScenario(page, "battle-result-win");
    await expect(page.locator(".battle-result-mvp-copy strong")).not.toContainText(/ケンゴ|レオ|ミオ|ミヤビ|カレン/);
    await expect(page.locator(".battle-result-score-grid > div")).toHaveCount(5);
    const resultGeometry = await page.locator(".battle-result-summary").evaluate((summary) => {
      const button = summary.querySelector<HTMLElement>(".battle-result-continue")!.getBoundingClientRect();
      const box = summary.getBoundingClientRect();
      return { scrollHeight: summary.scrollHeight, clientHeight: summary.clientHeight, ctaBottom: button.bottom, visibleBottom: box.bottom };
    });
    expect(resultGeometry.scrollHeight).toBeLessThanOrEqual(resultGeometry.clientHeight + 1);
    expect(resultGeometry.ctaBottom).toBeLessThanOrEqual(resultGeometry.visibleBottom + 1);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }, { width: 1280, height: 900 }]) {
  test(`harness remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openScenario(page, "battle-5v3");
    const stage = page.locator(".qa-stage");
    await expect(stage).toBeVisible();
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`tutorial primary actions and growth result remain mobile-centered at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const scenario of ["skill-tutorial", "growth-before"] as const) {
      await openScenario(page, scenario);
      const action = page.locator(".qa-stage .semantic-cta--primary").last();
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 80);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    }
    await openScenario(page, "growth-result");
    const stage = await page.locator(".qa-stage").boundingBox();
    const modal = await page.locator(".outlaw-confirm-dialog.kind-result").boundingBox();
    expect(stage).not.toBeNull();
    expect(modal).not.toBeNull();
    expect(Math.abs((modal!.y + modal!.height / 2) - (stage!.y + stage!.height / 2))).toBeLessThan(36);
    await expect(page.locator(".growth-result-level")).toHaveText("Lv.1 → Lv.7");
  });
}
