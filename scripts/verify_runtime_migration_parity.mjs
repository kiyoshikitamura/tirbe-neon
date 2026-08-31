import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  try {
    token = (await readFile(join(homedir(), ".supabase", "access-token"), "utf8")).trim();
  } catch {}
}
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required; this verifier never applies migrations.");

const refs = {
  development: "vosbyukxmskvisbgleug",
  preview: "sufvuqdnqohpfzkwxohq",
};
const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url)))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();
const repositoryHead = migrations.at(-1)?.split("_")[0];
assert(repositoryHead, "Repository migration head is unavailable");

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const heads = {};
for (const [environment, ref] of Object.entries(refs)) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: "select max(version)::text as head from supabase_migrations.schema_migrations" }),
  });
  if (!response.ok) throw new Error(`${environment} migration query failed: ${response.status}`);
  const rows = await response.json();
  heads[environment] = rows[0]?.head || null;
}

for (const [environment, head] of Object.entries(heads)) {
  assert.equal(head, repositoryHead, `${environment} migration head ${head} != repository ${repositoryHead}`);
}
console.log(JSON.stringify({ repositoryHead, ...heads, productionQueried: false, mutationPerformed: false }));
