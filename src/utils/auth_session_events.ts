export type AuthSessionEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "MFA_CHALLENGE_VERIFIED";

export function shouldRevalidateAuthSession(
  event: AuthSessionEvent,
  lastValidatedUserId: string | null,
  nextUserId: string | null
): boolean {
  if (!nextUserId || event === "TOKEN_REFRESHED") return false;
  if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && lastValidatedUserId === nextUserId) return false;
  return true;
}
