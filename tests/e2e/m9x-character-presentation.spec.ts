import { expect, test } from "@playwright/test";

const SSR_CHARACTERS = ["ageha", "gou", "kaede", "karen", "kengo", "koharu", "leo", "mio", "miyabi", "reiji"];

const metadata: Record<string, { x: number; thumbnail: number; compact: number; reveal: number }> = {
  ageha: { x: 48, thumbnail: 2, compact: 1.48, reveal: .92 },
  gou: { x: 50, thumbnail: 2.05, compact: 1.5, reveal: .96 },
  kaede: { x: 49, thumbnail: 2.05, compact: 1.58, reveal: .96 },
  karen: { x: 50, thumbnail: 2.05, compact: 1.58, reveal: .96 },
  kengo: { x: 51, thumbnail: 2.05, compact: 1.58, reveal: .96 },
  koharu: { x: 49, thumbnail: 2.05, compact: 1.58, reveal: .96 },
  leo: { x: 54, thumbnail: 2.05, compact: 1.58, reveal: .96 },
  mio: { x: 50, thumbnail: 2.05, compact: 1.58, reveal: .96 },
  miyabi: { x: 50, thumbnail: 2.05, compact: 1.58, reveal: .96 },
  reiji: { x: 52, thumbnail: 2.15, compact: 1.58, reveal: .96 },
};

test("SSR ten-character presentation stays inside the canonical rarity frame", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(({ characters, framing }) => {
    const card = (name: string, variant: string, frame: "character" | "reveal") => {
      const item = framing[name];
      return `<figure class="character-presentation character-presentation-${variant} character-presentation-rarity-ssr has-rarity-frame is-frame-${frame}" style="--character-focal-x:${item.x}%;--character-thumbnail-scale:${item.thumbnail};--character-compact-scale:${item.compact};--character-reveal-scale:${item.reveal}"><div class="character-presentation-art"><img class="character-presentation-background" src="/bg/bg_street_shinjuku.png" alt=""><img class="character-presentation-character" src="/characters/${name}_transparent_asset.png" alt="${name}"><span class="character-presentation-light"></span></div><img class="character-presentation-frame is-${frame}" src="/ui/rarity/${frame === "character" ? "character-card-ssr" : "ssr"}.png" alt=""><figcaption>${name}</figcaption></figure>`;
    };
    document.body.innerHTML = `<main class="presentation-audit"><h1>SSR / thumbnail</h1><section data-variant="thumbnail" class="gallery thumbnail">${characters.map((name) => card(name, "thumbnail", "character")).join("")}</section><h1>SSR / compact</h1><section data-variant="compact" class="gallery compact">${characters.map((name) => card(name, "gacha-result-compact", "character")).join("")}</section><h1>SSR / card</h1><section data-variant="card" class="gallery card">${characters.map((name) => card(name, "card", "character")).join("")}</section><h1>SSR / reveal</h1><section data-variant="reveal" class="gallery reveal">${characters.map((name) => card(name, "reveal", "reveal")).join("")}</section></main>`;
    const style = document.createElement("style");
    style.textContent = `.presentation-audit{width:390px;box-sizing:border-box;padding:10px;background:#02050b;color:#fff}.presentation-audit h1{font:700 12px sans-serif;color:#00f0ff}.gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:14px}.gallery figure{width:100%;margin:0}.gallery.thumbnail figure{aspect-ratio:1}.gallery.compact figure{aspect-ratio:4/5}.gallery.card{grid-template-columns:repeat(2,1fr)}.gallery.card figure{aspect-ratio:3/4}.gallery.reveal{grid-template-columns:repeat(2,1fr)}.gallery.reveal figure{height:300px}.gallery figcaption{position:absolute;z-index:7;right:5px;bottom:4px;left:5px;color:white;text-align:center;font:700 9px sans-serif;text-shadow:0 1px 3px #000}`;
    document.head.appendChild(style);
  }, { characters: SSR_CHARACTERS, framing: metadata });
  await expect(page.locator(".character-presentation-character")).toHaveCount(40);
  await expect.poll(() => page.locator(".character-presentation-character").evaluateAll((images) => images.every((image) => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth === 768 && element.naturalHeight === 1376;
  }))).toBe(true);
  await page.screenshot({ path: test.info().outputPath("ssr-10-presentation-390.png"), fullPage: true });
  for (const variant of ["thumbnail", "compact", "card", "reveal"]) {
    await page.locator(`[data-variant="${variant}"]`).screenshot({ path: test.info().outputPath(`ssr-10-${variant}-390.png`) });
  }
});

test("N R SR SSR samples share the same production artwork viewport", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  const samples = [
    { name: "mei", rarity: "n" },
    { name: "yuuji", rarity: "r" },
    { name: "maya", rarity: "sr" },
    { name: "ageha", rarity: "ssr" },
  ];
  await page.evaluate((items) => {
    document.body.innerHTML = `<main class="rarity-audit">${items.map(({ name, rarity }) => `<figure class="character-presentation character-presentation-card character-presentation-rarity-${rarity} has-rarity-frame is-frame-character"><div class="character-presentation-art"><img class="character-presentation-background" src="/bg/bg_street_shinjuku.png" alt=""><img class="character-presentation-character" src="/characters/${name}_transparent_asset.png" alt="${name}"></div><img class="character-presentation-frame is-character" src="/ui/rarity/character-card-${rarity}.png" alt=""><figcaption>${rarity.toUpperCase()} / ${name}</figcaption></figure>`).join("")}</main>`;
    const style = document.createElement("style");
    style.textContent = `.rarity-audit{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:390px;box-sizing:border-box;padding:10px;background:#02050b}.rarity-audit figure{margin:0}.rarity-audit figcaption{position:absolute;z-index:7;right:8px;bottom:7px;left:8px;color:#fff;text-align:center;font:700 11px sans-serif;text-shadow:0 1px 3px #000}`;
    document.head.appendChild(style);
  }, samples);
  await expect(page.locator(".character-presentation-character")).toHaveCount(4);
  await page.screenshot({ path: test.info().outputPath("rarity-samples-card-390.png"), fullPage: true });
});
