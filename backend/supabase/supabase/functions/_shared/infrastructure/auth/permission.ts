import { supabaseAdmin } from "../supabase/client.ts";
import { ForbiddenError, RepositoryError } from "../errors.ts";
import type { AuthContext } from "./context.ts";
import { requireCompanyAccess } from "./guard.ts";

/**
 * Company-scoped grant, matching `private.has_company_permission`.
 * `billing:manage` is owner-only (admin and location roles do not have it).
 */
export async function userHasCompanyPermission(
  userId: string,
  companyId: string,
  permission: string,
): Promise<boolean> {
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("company_membership")
    .select("role_id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (membershipError) {
    throw new RepositoryError("Failed to load company membership for permission check", {
      cause: membershipError,
    });
  }
  if (!membership) {
    return false;
  }

  const { data: grant, error: grantError } = await supabaseAdmin
    .from("role_permission")
    .select("permission_key")
    .eq("role_id", membership.role_id)
    .eq("permission_key", permission)
    .maybeSingle();

  if (grantError) {
    throw new RepositoryError("Failed to load role permission", { cause: grantError });
  }

  return grant != null;
}

/** Company membership plus a company-scoped permission (e.g. billing:manage). */
export async function requireCompanyPermission(
  context: AuthContext,
  companyId: string,
  permission: string,
): Promise<void> {
  requireCompanyAccess(context, companyId);
  const allowed = await userHasCompanyPermission(context.userId, companyId, permission);
  if (!allowed) {
    throw new ForbiddenError(`Missing permission ${permission} for company ${companyId}`);
  }
}
