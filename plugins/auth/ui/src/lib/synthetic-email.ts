/**
 * Detect emails fabricated during passkey / NEAR SIWN signup — addresses the
 * user never chose and cannot be reached at:
 *
 *   passkey-{8hex}@<recipient>   passkey signup (plugins/auth/src/passkey-sign-up.ts)
 *   temp-{hex}@<recipient>       SIWN implicit / testnet (better-near-auth deriveEmail)
 *   <local>@near.email           SIWN named .near account (not deliverable)
 *
 * A real user-supplied email returns false.
 */
export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  const lower = email.toLowerCase();
  if (/^passkey-[0-9a-f]{8}@/.test(lower)) return true;
  if (/^temp-[0-9a-f]+@/.test(lower)) return true;
  if (lower.endsWith("@near.email")) return true;
  return false;
}
