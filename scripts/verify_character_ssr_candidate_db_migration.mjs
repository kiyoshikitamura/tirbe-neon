import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const sql = await readFile(new URL("../supabase/migrations/20260824000194_reconcile_character_ssr_candidate_pool.sql", import.meta.url), "utf8");
assert.match(sql, /character_id='char_reiji_01' and rarity='SSR'/);
assert.match(sql, /select min\(weight\)/i);
assert.match(sql, /weight<>v_ssr_weight/i);
assert.match(sql, /Production SSR candidate set parity failed/i);
for (const forbidden of ["gacha_rarity_rates", "cost_cash", "cost_diamond", "pity", "user_characters", "gacha_execution_history"]) {
  assert.ok(!sql.includes(forbidden), `00194 must not mutate ${forbidden}`);
}
console.log("Character SSR candidate DB migration verification PASS");
