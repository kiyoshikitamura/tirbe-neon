import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class FakeAudioContext {
      state: "suspended" | "running" | "closed" = "suspended";
      currentTime = 0;
      destination = {};
      async resume() { this.state = "running"; }
      async suspend() { this.state = "suspended"; }
      async close() { this.state = "closed"; }
      async decodeAudioData() { return { duration: 2 } as AudioBuffer; }
      createBufferSource() {
        return { buffer: null, loop: false, connect() {}, start() {}, stop() {} } as unknown as AudioBufferSourceNode;
      }
      createGain() {
        const gain = { value: 0, cancelScheduledValues() {}, setValueAtTime(value: number) { this.value = value; }, linearRampToValueAtTime(value: number) { this.value = value; } };
        return { gain, connect() {} } as unknown as GainNode;
      }
      addEventListener() {}
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, writable: true, value: FakeAudioContext });
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/sounds/")) return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      return originalFetch(input, init);
    };
  });
});

test("QA-only audio lifecycle harness exposes canonical controls and context telemetry", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const liveValue = (label: string) => page.locator("dt", { hasText: label }).locator("..").locator("dd");
  await page.goto("/qa/audio");
  await expect(page.locator('[data-qa-harness="audio-lifecycle"]')).toBeVisible();
  await expect(liveValue("Context state")).toHaveText("not created");

  await page.getByRole("button", { name: "Arm probe + unlock (user gesture)" }).click();
  await expect(liveValue("Context state")).toHaveText("running");
  await expect(liveValue("Provider unlocked")).toHaveText("true");

  await page.getByRole("button", { name: "HOME", exact: true }).click();
  await expect(liveValue("Desired scene")).toHaveText("HOME");
  await expect(page.locator("details pre")).toContainText("/sounds/bgm/bgm_mypage.mp3");
  await expect(page.getByLabel("A result")).toHaveValue("NOT_RUN");
  expect(pageErrors).toEqual([]);
});
