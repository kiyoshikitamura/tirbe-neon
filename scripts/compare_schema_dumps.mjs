import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [leftPath, rightPath] = process.argv.slice(2);
if (!leftPath || !rightPath) {
  console.error("Usage: node scripts/compare_schema_dumps.mjs <left.sql> <right.sql>");
  process.exit(1);
}

function normalize(contents) {
  return contents
    .replace(/\r\n/g, "\n")
    .replace(/^\\(?:un)?restrict\s+.*\n/gm, "")
    .trim();
}

const [left, right] = await Promise.all([
  readFile(leftPath, "utf8").then(normalize),
  readFile(rightPath, "utf8").then(normalize),
]);
const digest = (value) => createHash("sha256").update(value).digest("hex");
if (left !== right) {
  console.error(`FAIL: normalized schemas differ (left=${digest(left)}, right=${digest(right)}).`);
  process.exit(1);
}
console.log(`PASS: normalized public schemas are identical (sha256=${digest(left)}).`);
