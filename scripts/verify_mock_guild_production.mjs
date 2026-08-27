import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/utils/mock/mockRpc.ts", import.meta.url), "utf8");
assert.ok(source.includes('p_amount !== 5000'));
assert.ok(source.includes('source === "DONATION"'));
assert.ok(source.includes('Guild donation already completed today'));
assert.ok(source.includes('Number(user.level || 1) < 5'));
assert.ok(source.includes('members.some((member: any) => member.user_id === p_user_id)'));
assert.ok(source.includes('guild?.level === 4 ? 17 : guild?.level === 3 ? 14'));
assert.ok(source.includes('funcName === "update_guild_recruitment"'));
assert.ok(source.includes('["OPEN_JOIN", "APPLICATION_REQUIRED", "CLOSED"]'));
assert.ok(!source.includes('5000: { xp: 120'));
console.log("Mock Guild production verification PASS");
