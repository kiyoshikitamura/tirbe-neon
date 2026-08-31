import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

export type AsyncTransitionPhase =
  | "tap"
  | "pending_paint"
  | "lock_active"
  | "server_completion"
  | "destination_paint"
  | "unlock";

export type AsyncTransitionSample = {
  phase: AsyncTransitionPhase;
  at: number;
  elapsedMs: number;
  detail?: Record<string, unknown>;
};

const ORDER: AsyncTransitionPhase[] = [
  "tap",
  "pending_paint",
  "lock_active",
  "server_completion",
  "destination_paint",
  "unlock",
];

async function browserNow(page: Page) {
  return page.evaluate(() => performance.timeOrigin + performance.now());
}

/** Test-only timeline recorder. It never adds a production route or UI marker. */
export class AsyncTransitionProbe {
  private readonly samples: AsyncTransitionSample[] = [];
  private startedAt: number | null = null;

  constructor(
    private readonly page: Page,
    private readonly surface: string,
    private readonly delayMs: number,
  ) {}

  async mark(phase: AsyncTransitionPhase, detail?: Record<string, unknown>) {
    const at = await browserNow(this.page);
    this.startedAt ??= at;
    this.samples.push({ phase, at, elapsedMs: Math.round((at - this.startedAt) * 10) / 10, detail });
  }

  async tap(action: Locator, options: { double?: boolean } = {}) {
    await this.mark("tap", { doubleAttempt: Boolean(options.double) });
    // Dispatch in the same task so the second attempt races the synchronous ref
    // guard, without Playwright's human-like dblclick interval hiding fast locks.
    if (options.double) await action.evaluate((element: HTMLElement) => { element.click(); element.click(); });
    else await action.click();
  }

  async pendingPaint(surface: Locator) {
    await expect(surface).toBeVisible();
    await this.page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await this.mark("pending_paint");
  }

  async lockActive(lockedSurface: Locator) {
    await expect(lockedSurface).toBeDisabled();
    await this.mark("lock_active");
  }

  async serverCompletion(predicate: () => Promise<boolean>) {
    await expect.poll(predicate).toBe(true);
    await this.mark("server_completion");
  }

  async destinationPaint(destination: Locator) {
    await expect(destination).toBeVisible();
    await this.page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await this.mark("destination_paint");
  }

  async unlock(lockedSurface: Locator) {
    await expect(lockedSurface).toBeEnabled();
    await this.mark("unlock");
  }

  assertContract() {
    expect(this.samples.map(({ phase }) => phase)).toEqual(ORDER);
    for (let index = 1; index < this.samples.length; index += 1) {
      expect(this.samples[index].at).toBeGreaterThanOrEqual(this.samples[index - 1].at);
    }
    expect(this.samples.find(({ phase }) => phase === "unlock")!.at)
      .toBeGreaterThanOrEqual(this.samples.find(({ phase }) => phase === "destination_paint")!.at);
  }

  async attach(testInfo: TestInfo) {
    const name = `async-transition-${this.surface}-${this.delayMs}ms.json`;
    const path = testInfo.outputPath(name);
    await writeFile(path, JSON.stringify({ surface: this.surface, delayMs: this.delayMs, samples: this.samples }, null, 2));
    await testInfo.attach(name, {
      path,
      contentType: "application/json",
    });
  }
}
