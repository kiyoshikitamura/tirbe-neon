import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/20260831000215_anonymous_tutorial_cleanup_24h.sql", import.meta.url), "utf8");

assert.match(sql, /au\.is_anonymous\s+is\s+true/i);
assert.match(sql, /step_id\s+not\s+in\s*\('COMPLETE',\s*'AUTHENTICATION'\)/i);
assert.match(sql, /interval\s+'24 hours'/i);
assert.doesNotMatch(sql, /interval\s+'7 days'/i);
assert.match(sql, /user_account_auth_methods/i);
assert.match(sql, /identity_row\.provider\s*<>\s*'anonymous'/i);
assert.match(sql, /auth\.sessions/i);
assert.match(sql, /foreign_key_violation/i);
for (const table of ["user_invitations", "guild_members", "raid_damage_logs", "pvp_defense_logs", "gvg_attack_logs", "payment_transactions"]) {
  assert.match(sql, new RegExp(`not exists \\(select 1 from public\\.${table}`, "i"));
}
assert.match(sql, /revoke all on function public\.cleanup_expired_anonymous_onboarding/i);

console.log("Anonymous tutorial cleanup 24h contract: PASS");
