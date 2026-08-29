import assert from "node:assert/strict";
import { copyFile, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { Jimp } from "jimp";

const root = resolve(import.meta.dirname, "..");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

for (let serial = 1; serial <= 13; serial += 1) {
  const name = `weapon_${String(serial).padStart(3, "0")}.png`;
  const path = resolve(root, "public", "equipments", name);
  const temporaryPath = resolve(root, "public", "equipments", `${name}.normalized.png`);
  const source = await Jimp.read(path);
  const width = source.bitmap.width;
  const height = source.bitmap.height;
  const pixels = Buffer.from(source.bitmap.data);

  await source.write(temporaryPath);
  const normalized = await Jimp.read(temporaryPath);
  const normalizedBytes = await readFile(temporaryPath);
  assert.ok(normalizedBytes.subarray(0, 8).equals(pngSignature), `${name}: PNG encoding failed`);
  assert.deepEqual([normalized.bitmap.width, normalized.bitmap.height], [width, height], `${name}: dimensions changed`);
  assert.ok(Buffer.from(normalized.bitmap.data).equals(pixels), `${name}: decoded visual pixels changed`);

  await copyFile(temporaryPath, path);
  await unlink(temporaryPath);
}

console.log("Normalized weapon_001.png through weapon_013.png to canonical PNG bodies without resizing or pixel changes.");
