import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __audioQa?: { resumes: number; suspends: number; starts: number; requests: string[]; hidden: boolean };
  }
}

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const qa = { resumes: 0, suspends: 0, starts: 0, requests: [] as string[], hidden: false };
    window.__audioQa = qa;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => qa.hidden });
    class FakeAudioContext {
      state: "suspended" | "running" | "closed" = "suspended";
      currentTime = 0;
      destination = {};
      async resume() { qa.resumes += 1; this.state = "running"; }
      async suspend() { qa.suspends += 1; this.state = "suspended"; }
      async close() { this.state = "closed"; }
      async decodeAudioData() { return { duration: 2 } as AudioBuffer; }
      createBufferSource() {
        return {
          buffer: null,
          loop: false,
          connect() {},
          start() { qa.starts += 1; },
          stop() {},
        } as unknown as AudioBufferSourceNode;
      }
      createGain() {
        const audioParam = {
          value: 0,
          cancelScheduledValues() {},
          setValueAtTime(value: number) { this.value = value; },
          linearRampToValueAtTime(value: number) { this.value = value; },
        };
        return { gain: audioParam, connect() {} } as unknown as GainNode;
      }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/sounds/")) {
        qa.requests.push(url);
        return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
      }
      return originalFetch(input, init);
    };
  });
});

test("Title continue unlocks audio once and starts the title scene lazily", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => window.__audioQa?.requests.length)).toBe(0);
  await page.getByRole("button", { name: "続きから" }).click();
  await expect.poll(() => page.evaluate(() => window.__audioQa?.resumes)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audioQa?.requests.some((url) => url.endsWith("/sounds/bgm/bgm_title.mp3")))).toBe(true);
  await page.getByPlaceholder("メールアドレス").click();
  expect(await page.evaluate(() => window.__audioQa?.resumes)).toBe(1);
});

test("background visibility suspends and resumes an unlocked audio context", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "続きから" }).click();
  await expect.poll(() => page.evaluate(() => window.__audioQa?.resumes)).toBe(1);
  await page.evaluate(() => {
    window.__audioQa!.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => window.__audioQa?.suspends)).toBe(1);
  await page.evaluate(() => {
    window.__audioQa!.hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => window.__audioQa?.resumes)).toBe(2);
});

test("missing audio assets stay silent without blocking title interaction", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => {
    const currentFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/sounds/")) return new Response(null, { status: 404 });
      return currentFetch(input, init);
    };
  });
  await page.getByRole("button", { name: "続きから" }).click();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("BGM and SE preferences persist locally across reload", async ({ page }) => {
  await page.addInitScript(() => {
    const userId = "00000000-0000-4000-8000-0000000000a0";
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_users", JSON.stringify([{ id: userId, username: "音響確認", current_base_id: "shinjuku", favorite_character_id: "char_reiji_01" }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{ id: "audio-char-1", user_id: userId, character_id: "char_reiji_01", level: 1, awakening_level: 0 }]));
    if (!localStorage.getItem("tribe_neon_audio_settings_v1")) {
      localStorage.setItem("tribe_neon_audio_settings_v1", JSON.stringify({ bgmEnabled: false, seEnabled: true, bgmVolume: 0.25, seVolume: 0.6 }));
    }
  });
  const openSettings = async () => {
    await page.getByRole("button", { name: "設定" }).click();
    await expect(page.getByRole("heading", { name: "サウンド設定" })).toBeVisible();
  };
  await page.goto("/");
  await page.getByRole("button", { name: "続きから" }).click();
  await openSettings();
  await expect(page.locator("#bgm-volume")).toHaveValue("0.25");
  await expect(page.locator("#se-volume")).toHaveValue("0.6");
  await page.getByText("BGM").locator("..").locator("..").getByRole("button", { name: "ON" }).click();
  await page.locator("#bgm-volume").fill("0.55");
  await page.reload();
  await page.getByRole("button", { name: "続きから" }).click();
  await openSettings();
  await expect(page.locator("#bgm-volume")).toHaveValue("0.55");
  await expect(page.getByText("BGM").locator("..").locator("..").getByRole("button", { name: "ON" })).toHaveClass(/active/);
});
