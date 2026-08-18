const { shouldRevalidateAuthSession } = await import("../src/utils/auth_session_events.ts");

const userA = "user-a";
const cases = [
  ["TOKEN_REFRESHED", userA, userA, false, "token refresh"],
  ["SIGNED_IN", userA, userA, false, "same-user visibility recovery"],
  ["INITIAL_SESSION", userA, userA, false, "duplicate initial session"],
  ["INITIAL_SESSION", null, userA, true, "first initial session"],
  ["SIGNED_IN", null, userA, true, "first login"],
  ["SIGNED_IN", userA, "user-b", true, "account change"],
  ["USER_UPDATED", userA, userA, true, "identity update"],
  ["SIGNED_OUT", userA, null, false, "signed out"],
];

for (const [event, previousUserId, nextUserId, expected, label] of cases) {
  const actual = shouldRevalidateAuthSession(event, previousUserId, nextUserId);
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

console.log("Auth session event filter verification passed.");
