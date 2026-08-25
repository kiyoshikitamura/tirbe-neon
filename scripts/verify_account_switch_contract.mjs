import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20260825000196_account_switch_lifecycle.sql", import.meta.url), "utf8");
const tutorial = await readFile(new URL("../src/app/components/TutorialAuthentication.tsx", import.meta.url), "utf8");
const callback = await readFile(new URL("../src/app/auth/callback/page.tsx", import.meta.url), "utf8");

assert.match(migration, /discard_current_anonymous_account_for_switch\(\)/);
assert.doesNotMatch(migration, /discard_current_anonymous_account_for_switch\([^)]*uuid/i);
assert.match(migration, /v_user_id uuid := auth\.uid\(\)/);
assert.match(migration, /is_anonymous is not true/);
for (const guard of ["payment_transactions", "user_monthly_passes", "user_invitations", "guild_members", "raid_damage_logs", "pvp_defense_logs", "gvg_attack_logs"]) {
  assert.ok(migration.includes(guard), `missing protected-history guard: ${guard}`);
}
assert.ok(migration.indexOf("delete from public.users") < migration.indexOf("delete from auth.users"));
assert.match(migration, /gameplayMerged', false/);
assert.match(tutorial, /既存のゲームデータが見つかりました/);
assert.match(tutorial, /既存データで続ける/);
assert.match(tutorial, /キャンセル/);
assert.match(tutorial, /authenticateExistingEmailAccount/);
assert.match(callback, /account_switch/);

console.log(JSON.stringify({ status: "PASS", rpc: "caller-only anonymous discard", google: true, email: true, merge: false }));
