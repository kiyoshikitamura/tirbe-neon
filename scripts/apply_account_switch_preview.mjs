import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const PREVIEW_REF = "sufvuqdnqohpfzkwxohq";
assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, PREVIEW_REF, "Preview project guard failed");
assert.equal(process.env.SUPABASE_PREVIEW_PROJECT_REF, PREVIEW_REF, "Preview ref mismatch");
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
assert.ok(token, "SUPABASE_ACCESS_TOKEN is required");

const sql = await readFile(new URL("../supabase/migrations/20260825000196_account_switch_lifecycle.sql", import.meta.url), "utf8");
assert.match(sql, /discard_current_anonymous_account_for_switch\(\)/);
assert.doesNotMatch(sql, /supabase_migrations|migration history/i, "Migration history must not be repaired");

const response = await fetch(`https://api.supabase.com/v1/projects/${PREVIEW_REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
await response.json();
console.log(JSON.stringify({ status: "APPLIED", projectRef: PREVIEW_REF, migration: "00196", production: false }));
