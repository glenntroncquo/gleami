import type { PermissionKey } from "./permission-keys";

export type CompanyMembershipRow = {
  company_id: string;
  role_id: string;
  user_id: string;
};

export type LocationMembershipRow = {
  location_id: string;
  role_id: string;
  user_id: string;
  is_active: boolean;
};

export type LocationCompanyRow = {
  id: string;
  company_id: string;
};

export type RolePermissionRow = {
  role_id: string;
  permission_key: string;
};

/**
 * Live session snapshot. Company/location IDs come from memberships
 * (or public RPCs: my_memberships / my_company_ids / my_location_ids).
 * JWT app_metadata.company_ids is never the source of truth.
 */
export type MembershipSnapshot = {
  companyIds: string[];
  companyId: string | null;
  locationIds: string[];
  locationId: string | null;
  permissionKeys: PermissionKey[];
  rolePermissions: RolePermissionRow[];
  companyMemberships: CompanyMembershipRow[];
  locationMemberships: LocationMembershipRow[];
  locationCompanies: LocationCompanyRow[];
  source: "rpc" | "membership_tables";
};

export const EMPTY_MEMBERSHIP_SNAPSHOT: MembershipSnapshot = {
  companyIds: [],
  companyId: null,
  locationIds: [],
  locationId: null,
  permissionKeys: [],
  rolePermissions: [],
  companyMemberships: [],
  locationMemberships: [],
  locationCompanies: [],
  source: "membership_tables",
};
