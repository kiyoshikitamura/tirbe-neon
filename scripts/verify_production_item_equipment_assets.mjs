import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { Jimp } from "jimp";

const root = resolve(import.meta.dirname, "..");
const items = JSON.parse(await readFile(resolve(root, "src/domain/gameplay/canonical/data/items_20260822.json"), "utf8")).items;
const equipments = JSON.parse(await readFile(resolve(root, "src/domain/gameplay/canonical/data/equipment_20260821.json"), "utf8")).equipments;
assert.equal(items.length, 18, "Canonical Item count must remain 18");
assert.equal(equipments.length, 170, "Canonical Equipment count must remain 170");

const anomalies = [];
async function verifyImage(assetPath, { requireAlpha = false, dimensions = null } = {}) {
  const absolute = resolve(root, "public", assetPath.replace(/^\//, ""));
  assert.ok((await stat(absolute)).isFile(), `Missing asset: ${assetPath}`);
  const bytes = await readFile(absolute);
  const isPngBody = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (!isPngBody) anomalies.push(`${assetPath}: extension/body mismatch`);
  const image = await Jimp.read(absolute);
  assert.ok(image.bitmap.width > 0 && image.bitmap.height > 0, `Undecodable asset: ${assetPath}`);
  if (dimensions) assert.deepEqual([image.bitmap.width, image.bitmap.height], dimensions, `Dimension mismatch: ${assetPath}`);
  if (requireAlpha) {
    let transparent = false;
    for (let i = 3; i < image.bitmap.data.length; i += 4) if (image.bitmap.data[i] < 255) { transparent = true; break; }
    assert.ok(transparent, `Alpha channel content required: ${assetPath}`);
  }
}

assert.equal(new Set(items.map((item) => item.assetPath)).size, 18, "Item paths must be unique");
for (const item of items) await verifyImage(item.assetPath, { requireAlpha: true, dimensions: [512, 512] });
const equipmentPaths = equipments.map((equipment) => {
  const serial = String(Number(equipment.equipment_id.split("_").at(-1))).padStart(3, "0");
  return `/equipments/${equipment.category.toLowerCase()}_${serial}.png`;
});
assert.equal(new Set(equipmentPaths).size, 170, "Equipment paths must be unique");
for (const assetPath of equipmentPaths) await verifyImage(assetPath);

console.log(JSON.stringify({ status: "PASS", items: 18, equipments: 170, broken: 0, missing: 0, wrongMapping: 0, p1FormatAnomalies: anomalies }, null, 2));
