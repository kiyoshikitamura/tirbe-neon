import { getJstDateString } from "../src/utils/jst_date.ts";

const cases = [
  ["2026-08-11T14:59:59.999Z", "2026-08-11"],
  ["2026-08-11T15:00:00.000Z", "2026-08-12"],
  ["2026-12-31T14:59:59.999Z", "2026-12-31"],
  ["2026-12-31T15:00:00.000Z", "2027-01-01"],
];

for (const [timestamp, expected] of cases) {
  const actual = getJstDateString(new Date(timestamp));
  if (actual !== expected) {
    throw new Error(`${timestamp}: expected ${expected}, received ${actual}`);
  }
}

console.log("JST daily reset verification passed.");
