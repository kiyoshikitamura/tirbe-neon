import sharp from "sharp";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";

const writeProduction = process.argv.includes("--write-production");
const requestedCharacters = process.argv.slice(2).filter((argument) => argument !== "--write-production");
if (requestedCharacters.length === 0) {
  throw new Error("Pass one or more character asset slugs (for example: maya masato).");
}

const productionDirectory = path.resolve("public", "characters");
const sourceDirectory = path.resolve("public", "raw_assets");
const previewDirectory = path.resolve("test-results", "character-alpha-remediation-preview");

const pixelIndex = (x, y, width) => y * width + x;
const colorDistance = (red, green, blue, background) => Math.hypot(
  red - background.red,
  green - background.green,
  blue - background.blue,
);

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

async function loadRgba(filePath) {
  return sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function buildPreview(character) {
  const productionPath = path.join(productionDirectory, `${character}_transparent_asset.png`);
  const sourcePath = path.join(sourceDirectory, `${character}_raw.jpg`);
  await Promise.all([access(productionPath), access(sourcePath)]);

  const [production, source] = await Promise.all([loadRgba(productionPath), loadRgba(sourcePath)]);
  if (production.info.width !== source.info.width || production.info.height !== source.info.height) {
    throw new Error(`${character}: source and production dimensions differ`);
  }

  const { width, height } = source.info;
  const sourceData = source.data;
  const productionData = production.data;
  const rowBackground = [];
  const sampleWidth = Math.max(8, Math.floor(width * 0.025));

  for (let y = 0; y < height; y += 1) {
    const red = [];
    const green = [];
    const blue = [];
    for (let x = 0; x < sampleWidth; x += 1) {
      for (const sampleX of [x, width - x - 1]) {
        const offset = pixelIndex(sampleX, y, width) * source.info.channels;
        red.push(sourceData[offset]);
        green.push(sourceData[offset + 1]);
        blue.push(sourceData[offset + 2]);
      }
    }
    rowBackground.push({ red: median(red), green: median(green), blue: median(blue) });
  }

  // Only pixels connected to the canvas exterior can become newly transparent.
  // This prevents similarly coloured clothing inside the silhouette from being keyed out.
  const exterior = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    const index = pixelIndex(x, y, width);
    if (exterior[index]) return;
    const offset = index * source.info.channels;
    const distance = colorDistance(
      sourceData[offset],
      sourceData[offset + 1],
      sourceData[offset + 2],
      rowBackground[y],
    );
    if (distance > 68) return;
    exterior[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  const exteriorBoundaryBand = new Uint8Array(exterior);
  let boundaryFrontier = queue.slice();
  for (let step = 0; step < 3; step += 1) {
    const nextFrontier = [];
    for (const index of boundaryFrontier) {
      const x = index % width;
      const y = Math.floor(index / width);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = pixelIndex(nx, ny, width);
        if (exteriorBoundaryBand[next]) continue;
        exteriorBoundaryBand[next] = 1;
        nextFrontier.push(next);
      }
    }
    boundaryFrontier = nextFrontier;
  }

  const result = Buffer.alloc(width * height * 4);
  let recoveredOpaquePixels = 0;
  let removedExteriorPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = pixelIndex(x, y, width);
      const sourceOffset = index * source.info.channels;
      const productionOffset = index * production.info.channels;
      const resultOffset = index * 4;
      const productionAlpha = productionData[productionOffset + 3];
      const distance = colorDistance(
        sourceData[sourceOffset],
        sourceData[sourceOffset + 1],
        sourceData[sourceOffset + 2],
        rowBackground[y],
      );

      if (exterior[index]) {
        result[resultOffset] = productionData[productionOffset];
        result[resultOffset + 1] = productionData[productionOffset + 1];
        result[resultOffset + 2] = productionData[productionOffset + 2];
        result[resultOffset + 3] = 0;
        if (productionAlpha > 0) removedExteriorPixels += 1;
        continue;
      }

      // Preserve genuine enclosed green-screen gaps already identified by the production mask.
      const preserveTransparentGap = productionAlpha <= 8 && distance <= 48;
      if (preserveTransparentGap) {
        result[resultOffset] = productionData[productionOffset];
        result[resultOffset + 1] = productionData[productionOffset + 1];
        result[resultOffset + 2] = productionData[productionOffset + 2];
        result[resultOffset + 3] = 0;
        continue;
      }

      // Recovered body/clothing pixels use the intact source colour. Existing antialiased
      // silhouette pixels keep the production RGB and alpha to avoid jagged edges.
      if (productionAlpha < 240 && !exteriorBoundaryBand[index]) {
        result[resultOffset] = sourceData[sourceOffset];
        result[resultOffset + 1] = sourceData[sourceOffset + 1];
        result[resultOffset + 2] = sourceData[sourceOffset + 2];
        result[resultOffset + 3] = 255;
        recoveredOpaquePixels += 1;
      } else {
        result[resultOffset] = productionData[productionOffset];
        result[resultOffset + 1] = productionData[productionOffset + 1];
        result[resultOffset + 2] = productionData[productionOffset + 2];
        result[resultOffset + 3] = productionAlpha;
      }
    }
  }

  const outputPath = writeProduction
    ? productionPath
    : path.join(previewDirectory, `${character}_transparent_asset.png`);
  await sharp(result, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);
  return { character, productionPath, sourcePath, outputPath, width, height, recoveredOpaquePixels, removedExteriorPixels };
}

await mkdir(previewDirectory, { recursive: true });
const results = [];
for (const character of requestedCharacters) results.push(await buildPreview(character));
console.log(JSON.stringify({ mode: writeProduction ? "production" : "preview", results }, null, 2));
