import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const expected = new Map([
  ...["n", "r", "sr", "ssr"].map((rarity) => [`${rarity}.png`, [640, 1040]]),
  ...["n", "r", "sr", "ssr"].map((rarity) => [`character-card-${rarity}.png`, [300, 420]]),
  ...["n", "r", "sr", "ssr"].map((rarity) => [`skill-frame-${rarity}.png`, [192, 192]]),
  ...["n", "r", "sr", "ssr"].map((rarity) => [`equipment-frame-${rarity}.png`, [192, 192]]),
  ...["n", "r", "sr", "ssr"].map((rarity) => [`rarity-badge-${rarity}.png`, [256, 160]]),
  ["badge-new.png", [384, 192]],
  ...[1, 2, 3, 4, 5].map((level) => [`badge-awakening-plus-${level}.png`, [384, 192]]),
]);

const root = path.resolve("public", "ui", "rarity");
const results = [];
for (const [filename, [expectedWidth, expectedHeight]] of expected) {
  const absolute = path.join(root, filename);
  const file = await readFile(absolute);
  const fileStat = await stat(absolute);
  const pngSignature = file.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const width = file.readUInt32BE(16);
  const height = file.readUInt32BE(20);
  const colorType = file[25];
  if (!pngSignature || width !== expectedWidth || height !== expectedHeight || ![4, 6].includes(colorType)) {
    throw new Error(`Invalid Production rarity asset ${filename}: ${JSON.stringify({ pngSignature, width, height, colorType })}`);
  }
  results.push({ filename, width, height, bytes: fileStat.size, rgba: colorType === 6 });
}

if (results.length !== 26) throw new Error(`Expected 26 rarity assets, found ${results.length}`);
console.log(JSON.stringify({ status: "PASS", count: results.length, assets: results }, null, 2));
