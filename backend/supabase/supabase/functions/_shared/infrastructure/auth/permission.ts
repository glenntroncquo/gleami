import { supabaseAdmin } from "../supabase/client.ts";
import { ForbiddenError, RepositoryError } from "../errors.ts";
import type { AuthContext } from "./context.ts";
import { requireCompanyAccess, requireLocationAccess } from "./guard.ts";

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

async function roleHasPermission(roleId: string, permission: string): Promise<boolean> {
  const { data: grant, error } = await supabaseAdmin
    .from("role_permission")
    .select("permission_key")
    .eq("role_id", roleId)
    .eq("permission_key", permission)
    .maybeSingle();
  if (error) {
    throw new RepositoryError("Failed to load role permission", { cause: error });
  }
  return grant != null;
}

/**
 * Location-scoped grant, mirroring `private.has_permission`:
 * an active location membership whose role carries the permission, or a
 * company membership (company-scoped roles apply to all its locations).
 */
export async function userHasLocationPermission(
  userId: string,
  locationId: string,
  permission: string,
): Promise<boolean> {
  const { data: locationMembership, error: locationError } = await supabaseAdmin
    .from("location_membership")
    .select("role_id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .eq("is_active", true)
    .maybeSingle();
  if (locationError) {
    throw new RepositoryError("Failed to load location membership for permission check", {
      cause: locationError,
    });
  }
  if (locationMembership && (await roleHasPermission(locationMembership.role_id, permission))) {
    return true;
  }

  const { data: location, error: locationLoadError } = await supabaseAdmin
    .from("location")
    .select("company_id")
    .eq("id", locationId)
    .maybeSingle();
  if (locationLoadError) {
    throw new RepositoryError("Failed to load location for permission check", {
      cause: locationLoadError,
    });
  }
  if (!location) return false;

  const { data: companyMembership, error: companyError } = await supabaseAdmin
    .from("company_membership")
    .select("role_id")
    .eq("user_id", userId)
    .eq("company_id", location.company_id)
    .maybeSingle();
  if (companyError) {
    throw new RepositoryError("Failed to load company membership for permission check", {
      cause: companyError,
    });
  }
  return companyMembership != null &&
    (await roleHasPermission(companyMembership.role_id, permission));
}

/** Location access plus a location-scoped permission (e.g. calendar:write). */
export async function requireLocationPermission(
  context: AuthContext,
  locationId: string,
  permission: string,
): Promise<void> {
  requireLocationAccess(context, locationId);
  const allowed = await userHasLocationPermission(context.userId, locationId, permission);
  if (!allowed) {
    throw new ForbiddenError(`Missing permission ${permission} for location ${locationId}`);
  }
}
