import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/20260825000195_tutorial_durability_and_anonymous_cleanup.sql", import.meta.url), "utf8");

assert.match(sql, /step_id\s*=\s*'TUTORIAL_BATTLE'/i);
assert.match(sql, /\*\s*0\.35/i);
assert.doesNotMatch(sql, /update\s+public\.quest/i);
assert.doesNotMatch(sql, /p_player_snapshot\s*#/i, "player snapshot must not be modified");
assert.match(sql, /apply_tutorial_enemy_snapshot\(v_uid, v_player, v_enemy\)/i);
assert.match(sql, /au\.is_anonymous\s+is\s+true/i);
assert.match(sql, /interval\s+'7 days'/i);
assert.match(sql, /tp\.step_id\s+not\s+in\s*\('COMPLETE',\s*'AUTHENTICATION'\)/i);
assert.match(sql, /user_account_auth_methods/i);
assert.match(sql, /identity_row\.provider\s*<>\s*'anonymous'/i);
assert.match(sql, /auth\.sessions/i);
assert.match(sql, /foreign_key_violation/i);
for (const durableTable of ["user_invitations", "guild_members", "raid_damage_logs", "pvp_defense_logs", "gvg_attack_logs", "payment_transactions"]) {
  assert.match(sql, new RegExp(`not exists \\(select 1 from public\\.${durableTable}`, "i"));
}
assert.match(sql, /0 18 \* \* \*/);
assert.match(sql, /revoke all on function public\.cleanup_expired_anonymous_onboarding/i);

console.log("Tutorial durability / anonymous cleanup migration: PASS");
