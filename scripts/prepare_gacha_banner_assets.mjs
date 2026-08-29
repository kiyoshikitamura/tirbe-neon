import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [sourceDirectory, destinationDirectory] = process.argv.slice(2);
if (!sourceDirectory || !destinationDirectory) {
  throw new Error("Usage: node scripts/prepare_gacha_banner_assets.mjs <source-directory> <destination-directory>");
}

const mappings = [
  { source: "1-写真1.jpg", destination: "gacha_sp_character.png", transparentBands: true },
  { source: "2-写真2.jpg", destination: "gacha_sp_skill.jpg", transparentBands: false },
  { source: "3-写真3.jpg", destination: "gacha_normal_skill.jpg", transparentBands: false },
  { source: "4-写真4.jpg", destination: "gacha_normal_character.png", transparentBands: true },
  { source: "5-写真5.jpg", destination: "gacha_sp_equipment.jpg", transparentBands: false },
  { source: "6-写真6.jpg", destination: "gacha_normal_equipment.jpg", transparentBands: false },
];

const isNearWhite = (red, green, blue) => {
  const minimum = Math.min(red, green, blue);
  const maximum = Math.max(red, green, blue);
  return minimum >= 200 && maximum - minimum <= 24;
};

async function makeWhiteBandsTransparent(source, destination) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const whiteRatio = (row) => {
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (row * width + x) * channels;
      if (isNearWhite(data[offset], data[offset + 1], data[offset + 2])) count += 1;
    }
    return count / width;
  };

  let topEnd = 0;
  while (topEnd < height / 3 && whiteRatio(topEnd) >= 0.25) topEnd += 1;
  let bottomStart = height - 1;
  while (bottomStart > height * 2 / 3 && whiteRatio(bottomStart) >= 0.25) bottomStart -= 1;
  bottomStart += 1;

  if (topEnd === 0 || bottomStart === height) {
    throw new Error(`White canvas bands were not detected in ${source}`);
  }

  for (let y = 0; y < height; y += 1) {
    if (y >= topEnd && y < bottomStart) continue;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      if (!isNearWhite(red, green, blue)) continue;
      const minimum = Math.min(red, green, blue);
      const alpha = Math.max(0, Math.min(255, Math.round(((245 - minimum) * 255) / 45)));
      data[offset + 3] = alpha;
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(destination);
  return { width, height, topEnd, bottomStart };
}

await mkdir(destinationDirectory, { recursive: true });
for (const mapping of mappings) {
  const source = path.join(sourceDirectory, mapping.source);
  const destination = path.join(destinationDirectory, mapping.destination);
  if (mapping.transparentBands) {
    const result = await makeWhiteBandsTransparent(source, destination);
    process.stdout.write(`${mapping.destination}: ${result.width}x${result.height}, alpha rows 0-${result.topEnd - 1} and ${result.bottomStart}-${result.height - 1}\n`);
  } else {
    await copyFile(source, destination);
    process.stdout.write(`${mapping.destination}: original JPEG preserved\n`);
  }
}
