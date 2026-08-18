import { chromium, devices } from "@playwright/test";

const url = process.env.MOBILE_PREVIEW_URL || "https://tribe-neon-mobile-preview.vercel.app";
const profiles = [
  ["iPhone 13", devices["iPhone 13"]],
  ["Pixel 7", devices["Pixel 7"]],
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [name, profile] of profiles) {
    const context = await browser.newContext(profile);
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    const metrics = await page.evaluate(() => ({
      title: document.title,
      viewportWidth: window.innerWidth,
      bodyWidth: document.body.scrollWidth,
      hasInteractiveControl: Boolean(document.querySelector("button, a, input")),
    }));

    if (!response?.ok()) throw new Error(`${name}: HTTP ${response?.status() || "unknown"}`);
    if (!metrics.title.includes("TRIBE")) throw new Error(`${name}: unexpected title ${metrics.title}`);
    if (!metrics.hasInteractiveControl) throw new Error(`${name}: no interactive control rendered`);
    if (metrics.bodyWidth > metrics.viewportWidth + 1) {
      throw new Error(`${name}: horizontal overflow ${metrics.bodyWidth}px > ${metrics.viewportWidth}px`);
    }
    if (pageErrors.length) throw new Error(`${name}: ${pageErrors.join(" | ")}`);

    results.push({ device: name, status: "PASS", ...metrics });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ url, results }, null, 2));
