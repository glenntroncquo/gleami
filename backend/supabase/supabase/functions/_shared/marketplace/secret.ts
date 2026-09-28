import { constantTimeEquals } from "../infrastructure/crypto/constant-time.ts";

export const WEBHOOK_SECRET_PLACEHOLDER = "__MARKETPLACE_WEBHOOK_SECRET__";

/** Constant-time bearer check. Rejects a missing, empty, or still-placeholder secret. */
export function webhookSecretMatches(authorization: string | null, expected: string | undefined): boolean {
  if (!expected || expected === WEBHOOK_SECRET_PLACEHOLDER) return false;
  const token = authorization?.match(/^Bearer\s+(\S+)\s*$/i)?.[1] ?? "";
  return constantTimeEquals(token, expected);
}
