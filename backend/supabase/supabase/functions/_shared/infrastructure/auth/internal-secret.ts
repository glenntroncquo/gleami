import { UnauthenticatedError } from "../errors.ts";
import { constantTimeEquals } from "../crypto/constant-time.ts";

/** Written into trigger/cron definitions in migrations; substituted at deploy time. */
export const INTERNAL_SECRET_PLACEHOLDER = "__INTERNAL_WEBHOOK_SECRET__";

/**
 * Sent in a dedicated header rather than `Authorization`, so the Authorization
 * slot stays available for the gateway's `verify_jwt` check. Callers therefore
 * pass both: the public anon key as the bearer (gateway layer) and this secret
 * (application layer).
 */
export const INTERNAL_SECRET_HEADER = "x-internal-secret";

export function internalSecretMatches(
  provided: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || expected === INTERNAL_SECRET_PLACEHOLDER) return false;
  if (!provided) return false;
  return constantTimeEquals(provided.trim(), expected);
}

/**
 * Gate for functions whose only legitimate callers are our own database
 * triggers and cron jobs.
 *
 * This exists so those callers stop presenting the service-role key. A
 * service-role JWT stored in `pg_trigger` / `cron.job` is a permanent
 * high-privilege credential sitting in database metadata; this secret is
 * scoped to "may invoke internal endpoints" and can be rotated on its own.
 */
export function assertInternalSecret(req: Request): void {
  const ok = internalSecretMatches(
    req.headers.get(INTERNAL_SECRET_HEADER),
    Deno.env.get("INTERNAL_WEBHOOK_SECRET"),
  );

  if (!ok) {
    throw new UnauthenticatedError("Unauthorized");
  }
}
