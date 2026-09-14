import { isPermissionKey, type PermissionKey } from "./permission-keys";
import type {
  CompanyMembershipRow,
  LocationCompanyRow,
  LocationMembershipRow,
  MembershipSnapshot,
  RolePermissionRow,
} from "./membership-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].sort();
}

export function pickCurrentId(ids: string[]): string | null {
  return uniqueSorted(ids)[0] ?? null;
}

export function normalizeRpcUuidList(data: unknown): string[] {
  if (data == null) return [];
  const rows = Array.isArray(data) ? data : [data];
  const ids: string[] = [];

  for (const row of rows) {
    if (typeof row === "string" && UUID_RE.test(row)) {
      ids.push(row);
      continue;
    }
    if (row && typeof row === "object") {
      for (const value of Object.values(row as Record<string, unknown>)) {
        if (typeof value === "string" && UUID_RE.test(value)) {
          ids.push(value);
        }
      }
    }
  }

  return uniqueSorted(ids);
}

export function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42883" ||
    code === "404" ||
    message.includes("could not find the function") ||
    message.includes("could not find the") ||
    (message.includes("function") && message.includes("does not exist")) ||
    message.includes("404")
  );
}

export function isWrongArgsRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("without parameters") ||
    message.includes("with the specified")
  );
}

/**
 * my_company_ids (public wrapper of private.company_ids_for_user):
 * companies from company_membership UNION companies of locations
 * the user can access.
 */
export function resolveCompanyIds(input: {
  rpcCompanyIds?: string[] | null;
  companyMemberships: CompanyMembershipRow[];
  locationCompanies: LocationCompanyRow[];
}): string[] {
  if (input.rpcCompanyIds && input.rpcCompanyIds.length > 0) {
    return uniqueSorted(input.rpcCompanyIds);
  }

  return uniqueSorted([
    ...input.companyMemberships.map((row) => row.company_id),
    ...input.locationCompanies.map((row) => row.company_id),
  ]);
}

/**
 * my_location_ids (public wrapper of private.location_ids_for_user):
 * active location_membership UNION every location of a company the
 * user has company_membership on.
 */
export function resolveLocationIds(input: {
  rpcLocationIds?: string[] | null;
  locationMemberships: LocationMembershipRow[];
  locationCompanies: LocationCompanyRow[];
}): string[] {
  if (input.rpcLocationIds && input.rpcLocationIds.length > 0) {
    return uniqueSorted(input.rpcLocationIds);
  }

  const fromMembership = input.locationMemberships
    .filter((row) => row.is_active)
    .map((row) => row.location_id);
  const fromCompany = input.locationCompanies.map((row) => row.id);

  return uniqueSorted([...fromMembership, ...fromCompany]);
}

export function collectPermissionKeys(
  roleIds: string[],
  rolePermissions: RolePermissionRow[],
): PermissionKey[] {
  const wanted = new Set(roleIds);
  const keys = new Set<PermissionKey>();

  for (const row of rolePermissions) {
    if (!wanted.has(row.role_id)) continue;
    if (isPermissionKey(row.permission_key)) {
      keys.add(row.permission_key);
    }
  }

  return [...keys].sort() as PermissionKey[];
}

export function membershipRoleIds(
  companyMemberships: CompanyMembershipRow[],
  locationMemberships: LocationMembershipRow[],
): string[] {
  return uniqueSorted([
    ...companyMemberships.map((row) => row.role_id),
    ...locationMemberships.filter((row) => row.is_active).map((row) => row.role_id),
  ]);
}

/**
 * Mirrors private.has_permission(perm, p_location_id):
 * location_membership role at that location, or company_membership
 * on the location's company.
 */
export function evaluateHasPermission(input: {
  perm: string;
  locationId: string;
  snapshot: Pick<
    MembershipSnapshot,
    "companyMemberships" | "locationMemberships" | "locationCompanies"
  >;
  rolePermissions: RolePermissionRow[];
}): boolean {
  const locationRoles = input.snapshot.locationMemberships
    .filter((row) => row.is_active && row.location_id === input.locationId)
    .map((row) => row.role_id);

  const companyId = input.snapshot.locationCompanies.find(
    (row) => row.id === input.locationId,
  )?.company_id;

  const companyRoles = companyId
    ? input.snapshot.companyMemberships
        .filter((row) => row.company_id === companyId)
        .map((row) => row.role_id)
    : [];

  const roleIds = new Set([...locationRoles, ...companyRoles]);
  return input.rolePermissions.some(
    (row) => roleIds.has(row.role_id) && row.permission_key === input.perm,
  );
}

/**
 * Mirrors private.has_company_permission(perm, p_company_id).
 */
export function evaluateHasCompanyPermission(input: {
  perm: string;
  companyId: string;
  snapshot: Pick<MembershipSnapshot, "companyMemberships">;
  rolePermissions: RolePermissionRow[];
}): boolean {
  const roleIds = new Set(
    input.snapshot.companyMemberships
      .filter((row) => row.company_id === input.companyId)
      .map((row) => row.role_id),
  );

  return input.rolePermissions.some(
    (row) => roleIds.has(row.role_id) && row.permission_key === input.perm,
  );
}

export function snapshotHasPermission(
  snapshot: MembershipSnapshot,
  perm: PermissionKey,
  locationId?: string | null,
): boolean {
  if (locationId) {
    return evaluateHasPermission({
      perm,
      locationId,
      snapshot,
      rolePermissions: snapshot.rolePermissions,
    });
  }

  return snapshot.permissionKeys.includes(perm);
}

export function snapshotHasCompanyPermission(
  snapshot: MembershipSnapshot,
  perm: PermissionKey,
  companyId?: string | null,
): boolean {
  const target = companyId ?? snapshot.companyId;
  if (!target) return false;

  return evaluateHasCompanyPermission({
    perm,
    companyId: target,
    snapshot,
    rolePermissions: snapshot.rolePermissions,
  });
}

export function snapshotHasAnyPermission(
  snapshot: MembershipSnapshot,
  perms: readonly PermissionKey[],
): boolean {
  return perms.some((perm) => snapshot.permissionKeys.includes(perm));
}
