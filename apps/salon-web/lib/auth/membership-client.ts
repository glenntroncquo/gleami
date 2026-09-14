import {
  collectPermissionKeys,
  isMissingRpcError,
  isWrongArgsRpcError,
  membershipRoleIds,
  normalizeRpcUuidList,
  pickCurrentId,
  resolveCompanyIds,
  resolveLocationIds,
} from "./membership-resolve";
import { EMPTY_MEMBERSHIP_SNAPSHOT, type MembershipSnapshot } from "./membership-types";
import type {
  CompanyMembershipRow,
  LocationCompanyRow,
  LocationMembershipRow,
  RolePermissionRow,
} from "./membership-types";
import { LOCATION_SCOPE_TIMEOUT_MS, withTimeout } from "@/lib/async/fail-closed";

type RpcError = { code?: string; message?: string };

type RpcResult = {
  data: unknown;
  error: RpcError | null;
};

/**
 * Minimal surface used by membership loaders. Both the browser and
 * server Supabase clients satisfy this (server client is untyped).
 */
export type MembershipSupabase = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;
  from: (relation: string) => {
    select: (columns: string) => MembershipFilterBuilder;
  };
};

type MembershipFilterBuilder = PromiseLike<{ data: unknown; error: RpcError | null }> & {
  eq: (column: string, value: string | boolean) => MembershipFilterBuilder;
  in: (column: string, values: string[]) => MembershipFilterBuilder;
};

async function tryRpcData(
  supabase: MembershipSupabase,
  fn: string,
): Promise<unknown | null> {
  const { data, error } = await supabase.rpc(fn);
  if (error) {
    if (isMissingRpcError(error)) return null;
    console.warn(`RPC ${fn} failed; falling back to membership tables`, error);
    return null;
  }
  return data;
}

async function tryRpcUuidSet(
  supabase: MembershipSupabase,
  fn: string,
): Promise<string[] | null> {
  const data = await tryRpcData(supabase, fn);
  if (data == null) return null;
  return normalizeRpcUuidList(data);
}

/**
 * public.my_memberships(): company rows plus active location rows.
 * Never reads private.company_ids_for_user / location_ids_for_user.
 */
export function parseMyMemberships(
  data: unknown,
  userId: string,
): {
  companyMemberships: CompanyMembershipRow[];
  locationMemberships: LocationMembershipRow[];
  locationCompanies: LocationCompanyRow[];
} {
  const rows = Array.isArray(data) ? data : data == null ? [] : [data];
  const companyMemberships: CompanyMembershipRow[] = [];
  const locationMemberships: LocationMembershipRow[] = [];
  const locationCompanies: LocationCompanyRow[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const source = typeof record.source === "string" ? record.source : "";
    const companyId =
      typeof record.company_id === "string" ? record.company_id : "";
    const locationId =
      typeof record.location_id === "string" ? record.location_id : null;
    const roleId = typeof record.role_id === "string" ? record.role_id : "";
    const isActive = record.is_active !== false;

    if (source === "company" && companyId && roleId) {
      companyMemberships.push({
        company_id: companyId,
        role_id: roleId,
        user_id: userId,
      });
    }
    if (source === "location" && locationId && roleId && isActive) {
      locationMemberships.push({
        location_id: locationId,
        role_id: roleId,
        user_id: userId,
        is_active: true,
      });
      if (companyId) {
        locationCompanies.push({ id: locationId, company_id: companyId });
      }
    }
  }

  return { companyMemberships, locationMemberships, locationCompanies };
}

function locationCompaniesFromRpc(data: unknown): LocationCompanyRow[] {
  const rows = Array.isArray(data) ? data : data == null ? [] : [data];
  const out: LocationCompanyRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const companyId =
      typeof record.company_id === "string" ? record.company_id : "";
    if (id && companyId) out.push({ id, company_id: companyId });
  }
  return out;
}

async function tryRpcBool(
  supabase: MembershipSupabase,
  fn: string,
  primaryArgs: Record<string, unknown>,
  alternateArgs?: Record<string, unknown>,
): Promise<boolean | null> {
  const first = await supabase.rpc(fn, primaryArgs);
  if (!first.error) return Boolean(first.data);

  if (alternateArgs && isWrongArgsRpcError(first.error)) {
    const second = await supabase.rpc(fn, alternateArgs);
    if (!second.error) return Boolean(second.data);
    if (isMissingRpcError(second.error)) return null;
  }

  if (isMissingRpcError(first.error)) return null;
  console.warn(`RPC ${fn} failed; falling back to membership tables`, first.error);
  return null;
}

async function selectRows<T>(
  builder: MembershipFilterBuilder,
): Promise<T[]> {
  const { data, error } = await builder;
  if (error) {
    throw new Error(error.message ?? "Membership query failed");
  }
  return (Array.isArray(data) ? data : []) as T[];
}

export async function fetchCompanyMemberships(
  supabase: MembershipSupabase,
  userId: string,
): Promise<CompanyMembershipRow[]> {
  return selectRows<CompanyMembershipRow>(
    supabase
      .from("company_membership")
      .select("company_id, role_id, user_id")
      .eq("user_id", userId),
  );
}

export async function fetchLocationMemberships(
  supabase: MembershipSupabase,
  userId: string,
): Promise<LocationMembershipRow[]> {
  return selectRows<LocationMembershipRow>(
    supabase
      .from("location_membership")
      .select("location_id, role_id, user_id, is_active")
      .eq("user_id", userId)
      .eq("is_active", true),
  );
}

export async function fetchLocationsForCompanies(
  supabase: MembershipSupabase,
  companyIds: string[],
): Promise<LocationCompanyRow[]> {
  if (companyIds.length === 0) return [];
  return selectRows<LocationCompanyRow>(
    supabase.from("location").select("id, company_id").in("company_id", companyIds),
  );
}

export async function fetchLocationsById(
  supabase: MembershipSupabase,
  locationIds: string[],
): Promise<LocationCompanyRow[]> {
  if (locationIds.length === 0) return [];
  return selectRows<LocationCompanyRow>(
    supabase.from("location").select("id, company_id").in("id", locationIds),
  );
}

async function timedRows<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await withTimeout(promise, LOCATION_SCOPE_TIMEOUT_MS, label);
  } catch (error) {
    console.warn(`${label} timed out or failed; continuing`, error);
    return fallback;
  }
}

/**
 * Build a snapshot from already-fetched pieces. Company id does not
 * depend on location_membership — a hung location query must not
 * leave companyId null (Safari Web Locks).
 */
export function assembleMembershipSnapshot(input: {
  rpcCompanyIds?: string[] | null;
  rpcLocationIds?: string[] | null;
  companyMemberships: CompanyMembershipRow[];
  locationMemberships: LocationMembershipRow[];
  locationCompanies: LocationCompanyRow[];
  rolePermissions?: RolePermissionRow[];
  source?: MembershipSnapshot["source"];
}): MembershipSnapshot {
  const companyIds = resolveCompanyIds({
    rpcCompanyIds: input.rpcCompanyIds,
    companyMemberships: input.companyMemberships,
    locationCompanies: input.locationCompanies,
  });
  const locationIds = resolveLocationIds({
    rpcLocationIds: input.rpcLocationIds,
    locationMemberships: input.locationMemberships,
    locationCompanies: input.locationCompanies,
  });
  const roleIds = membershipRoleIds(
    input.companyMemberships,
    input.locationMemberships,
  );
  const rolePermissions = input.rolePermissions ?? [];
  return {
    companyIds,
    companyId: pickCurrentId(companyIds),
    locationIds,
    locationId: pickCurrentId(locationIds),
    permissionKeys: collectPermissionKeys(roleIds, rolePermissions),
    rolePermissions,
    companyMemberships: input.companyMemberships,
    locationMemberships: input.locationMemberships,
    locationCompanies: input.locationCompanies,
    source: input.source ?? "membership_tables",
  };
}

/**
 * PostgREST with the JWT we already have from onAuthStateChange /
 * getSession. Avoids supabase-js navigator.locks — on Safari 16
 * those locks can stall every subsequent .from() / rpc() forever.
 */
export async function fetchCompanyMembershipsWithToken(
  session: { access_token: string; user: { id: string } },
): Promise<CompanyMembershipRow[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon || !session.access_token) return [];

  const url = new URL(`${base}/rest/v1/company_membership`);
  url.searchParams.set("select", "company_id,role_id,user_id");
  url.searchParams.set("user_id", `eq.${session.user.id}`);

  const response = await withTimeout(
    fetch(url.toString(), {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
        Accept: "application/json",
      },
    }),
    LOCATION_SCOPE_TIMEOUT_MS,
    "company_membership lock-free",
  );
  if (!response.ok) {
    throw new Error(`company_membership ${response.status}`);
  }
  const data: unknown = await response.json();
  return (Array.isArray(data) ? data : []) as CompanyMembershipRow[];
}

export async function fetchRolePermissions(
  supabase: MembershipSupabase,
  roleIds: string[],
): Promise<RolePermissionRow[]> {
  if (roleIds.length === 0) return [];
  return selectRows<RolePermissionRow>(
    supabase
      .from("role_permission")
      .select("role_id, permission_key")
      .in("role_id", roleIds),
  );
}

/**
 * Load the signed-in user's companies, locations, and permission keys.
 *
 * Prefers public RPCs: `my_memberships`, `my_company_ids`,
 * `my_location_ids`, `my_locations`. Never calls private
 * `company_ids_for_user` / `location_ids_for_user`. On 404 / missing
 * RPC, falls back to `company_membership` + `location_membership` +
 * `location` and still sets companyId when those rows exist.
 */
export async function loadMembershipSnapshot(
  supabase: MembershipSupabase,
  userId: string,
): Promise<MembershipSnapshot> {
  if (!userId) return EMPTY_MEMBERSHIP_SNAPSHOT;

  const [rpcMemberships, rpcCompanyIds, rpcLocationIds, rpcLocations] =
    await Promise.all([
      tryRpcData(supabase, "my_memberships"),
      tryRpcUuidSet(supabase, "my_company_ids"),
      tryRpcUuidSet(supabase, "my_location_ids"),
      tryRpcData(supabase, "my_locations"),
    ]);

  const parsed =
    rpcMemberships != null ? parseMyMemberships(rpcMemberships, userId) : null;
  const rpcHadMembershipRows = Boolean(
    parsed &&
      (parsed.companyMemberships.length > 0 ||
        parsed.locationMemberships.length > 0),
  );

  let companyMemberships = parsed?.companyMemberships ?? [];
  let locationMemberships = parsed?.locationMemberships ?? [];
  let locationCompanies = [
    ...(parsed?.locationCompanies ?? []),
    ...locationCompaniesFromRpc(rpcLocations),
  ];

  if (!rpcHadMembershipRows) {
    companyMemberships = await timedRows(
      fetchCompanyMemberships(supabase, userId),
      [],
      "company_membership",
    );
    locationMemberships = await timedRows(
      fetchLocationMemberships(supabase, userId),
      [],
      "location_membership",
    );
  }

  if (locationCompanies.length === 0) {
    locationCompanies = await timedRows(
      fetchLocationsById(
        supabase,
        rpcLocationIds ?? locationMemberships.map((row) => row.location_id),
      ),
      [],
      "locations by id",
    );
  }

  const companyIds = resolveCompanyIds({
    rpcCompanyIds,
    companyMemberships,
    locationCompanies,
  });

  if (locationCompanies.length === 0 && companyIds.length > 0) {
    locationCompanies = await timedRows(
      fetchLocationsForCompanies(supabase, companyIds),
      [],
      "locations for companies",
    );
  } else if (companyIds.length > 0) {
    const known = new Set(locationCompanies.map((row) => row.company_id));
    const missing = companyIds.filter((id) => !known.has(id));
    if (missing.length > 0) {
      const extra = await timedRows(
        fetchLocationsForCompanies(supabase, missing),
        [],
        "locations for missing companies",
      );
      locationCompanies = [...locationCompanies, ...extra];
    }
  }

  const roleIds = membershipRoleIds(companyMemberships, locationMemberships);
  const rolePermissions = await timedRows(
    fetchRolePermissions(supabase, roleIds),
    [],
    "role_permission",
  );

  const usedRpc =
    rpcMemberships != null ||
    (rpcCompanyIds != null && rpcCompanyIds.length > 0) ||
    (rpcLocationIds != null && rpcLocationIds.length > 0) ||
    rpcLocations != null;

  return assembleMembershipSnapshot({
    rpcCompanyIds,
    rpcLocationIds,
    companyMemberships,
    locationMemberships,
    locationCompanies,
    rolePermissions,
    source: usedRpc ? "rpc" : "membership_tables",
  });
}

export async function rpcHasPermission(
  supabase: MembershipSupabase,
  perm: string,
  locationId: string,
): Promise<boolean | null> {
  return tryRpcBool(
    supabase,
    "has_permission",
    { perm, p_location_id: locationId },
    { perm, location_id: locationId },
  );
}

export async function rpcHasCompanyPermission(
  supabase: MembershipSupabase,
  perm: string,
  companyId: string,
): Promise<boolean | null> {
  return tryRpcBool(
    supabase,
    "has_company_permission",
    { perm, p_company_id: companyId },
    { perm, company_id: companyId },
  );
}

/**
 * Resolve the current company for a server action / server component.
 * Never reads JWT app_metadata.company_ids.
 */
type AuthAwareClient = {
  auth: {
    getUser: () => PromiseLike<{
      data: { user: { id: string } | null };
      error: RpcError | null;
    }>;
  };
};

export async function resolveCompanyIdFromMembership(
  supabase: AuthAwareClient,
): Promise<{ companyId: string } | { error: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const snapshot = await loadMembershipSnapshot(
    supabase as unknown as MembershipSupabase,
    user.id,
  );
  if (!snapshot.companyId) {
    return { error: "No company associated with this user" };
  }

  return { companyId: snapshot.companyId };
}
