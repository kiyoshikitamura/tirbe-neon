import sharp from "sharp";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDirectory = path.resolve("public", "characters");
const outputPath = path.resolve("test-results", "m9x-character-alpha-audit.json");
const filenames = (await readdir(sourceDirectory))
  .filter((name) => /_transparent_asset\.png$/i.test(name))
  .sort();

const pixelIndex = (x, y, width) => y * width + x;

async function inspect(filename) {
  const assetPath = path.join(sourceDirectory, filename);
  const { data, info } = await sharp(assetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alpha = new Uint8Array(width * height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let semiTransparentPixels = 0;
  let opaqueGreenResiduePixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const value = data[offset + 3];
      alpha[pixelIndex(x, y, width)] = value;
      if (value > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      if (value > 0 && value < 240) semiTransparentPixels += 1;
      if (value >= 240 && green >= 80 && green > red * 1.45 && green > blue * 1.25) opaqueGreenResiduePixels += 1;
    }
  }

  const exterior = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    const index = pixelIndex(x, y, width);
    if (exterior[index] || alpha[index] > 8) return;
    exterior[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y += 1) { enqueue(0, y); enqueue(width - 1, y); }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  const visited = new Uint8Array(width * height);
  const enclosedComponents = [];
  for (let y = Math.max(0, minY); y <= maxY; y += 1) {
    for (let x = Math.max(0, minX); x <= maxX; x += 1) {
      const start = pixelIndex(x, y, width);
      if (alpha[start] > 8 || exterior[start] || visited[start]) continue;
      visited[start] = 1;
      const component = [start];
      let size = 0;
      for (let cursor = 0; cursor < component.length; cursor += 1) {
        const index = component[cursor];
        size += 1;
        const px = index % width;
        const py = Math.floor(index / width);
        for (const neighbor of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) {
          const [nx, ny] = neighbor;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = pixelIndex(nx, ny, width);
          if (alpha[next] <= 8 && !exterior[next] && !visited[next]) {
            visited[next] = 1;
            component.push(next);
          }
        }
      }
      enclosedComponents.push(size);
    }
  }

  enclosedComponents.sort((a, b) => b - a);
  const bboxArea = maxX >= minX && maxY >= minY ? (maxX - minX + 1) * (maxY - minY + 1) : 0;
  return {
    character: filename.replace(/_transparent_asset\.png$/i, ""),
    assetPath: `/characters/${filename}`,
    rgba: channels === 4,
    dimensions: `${width}x${height}`,
    alphaBoundingBox: maxX >= 0 ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
    semiTransparentPixels,
    semiTransparentRatio: bboxArea ? Number((semiTransparentPixels / bboxArea).toFixed(5)) : 0,
    enclosedTransparentComponents: enclosedComponents.length,
    largestEnclosedTransparentComponent: enclosedComponents[0] || 0,
    opaqueGreenResiduePixels,
  };
}

const characters = [];
for (const filename of filenames) characters.push(await inspect(filename));
const report = {
  generatedAt: new Date().toISOString(),
  sourceDirectory,
  characterCount: characters.length,
  characters,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
