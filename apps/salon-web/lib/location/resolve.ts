import type { LocationRecord } from "./types";

export function mergeAccessibleLocationIds(
  membershipIds: readonly string[],
  locationRows: readonly { id: string }[],
): string[] {
  return [
    ...new Set(
      [...membershipIds, ...locationRows.map((row) => row.id)].filter(Boolean),
    ),
  ];
}

export function primaryOrSoleLocationId(
  locationRows: readonly { id: string; is_primary?: boolean }[],
): string | null {
  const primary = locationRows.find((row) => row.is_primary)?.id;
  if (primary) return primary;
  if (locationRows.length === 1) return locationRows[0].id;
  return null;
}

export function pickSelectedLocationId(input: {
  accessibleIds: string[];
  persistedId?: string | null;
  fallbackId?: string | null;
  primaryId?: string | null;
}): string | null {
  const accessible = input.accessibleIds.filter(Boolean);

  // Keep a stored id while locations are still loading (empty accessible).
  // Do not treat "not in an empty list" as invalid — that wiped Safari
  // localStorage on 1:1 tenants before company locations hydrated.
  if (
    input.persistedId &&
    (accessible.length === 0 || accessible.includes(input.persistedId))
  ) {
    return input.persistedId;
  }
  if (accessible.length === 0) {
    return input.fallbackId ?? input.primaryId ?? null;
  }
  if (input.fallbackId && accessible.includes(input.fallbackId)) {
    return input.fallbackId;
  }
  if (input.primaryId && accessible.includes(input.primaryId)) {
    return input.primaryId;
  }
  return accessible[0] ?? null;
}

/**
 * Switcher is hidden in 1:1 / flag-off (prod today).
 * Show when the user can actually reach more than one location
 * and either the tenant flag is on or they have multiple memberships
 * (e.g. a freelancer across locations).
 */
export function shouldShowLocationSwitcher(input: {
  accessibleCount: number;
  multiLocationEnabled: boolean;
  locationMembershipCount: number;
}): boolean {
  if (input.accessibleCount <= 1) return false;
  return input.multiLocationEnabled || input.locationMembershipCount > 1;
}

export function companyIdForLocation(
  locations: Pick<LocationRecord, "id" | "company_id">[],
  locationId: string | null,
  fallbackCompanyId: string | null,
): string | null {
  if (!locationId) return fallbackCompanyId;
  return (
    locations.find((row) => row.id === locationId)?.company_id ?? fallbackCompanyId
  );
}

export function withLocationId<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  locationId: string | null | undefined,
): T {
  if (!locationId) return query;
  return (query as { eq: (column: string, value: string) => T }).eq(
    "location_id",
    locationId,
  );
}

/** Pages may wait for hydrate, but must stop once locationsReady. */
export function shouldWaitForLocationPick(
  locationId: string | null | undefined,
  locationsReady: boolean,
): boolean {
  return !locationId && !locationsReady;
}

export function canCreateAnotherLocation(input: {
  multiLocationEnabled: boolean;
  activeCount: number;
}): boolean {
  if (input.activeCount <= 0) return true;
  if (input.activeCount === 1) return input.multiLocationEnabled;
  return input.multiLocationEnabled;
}
