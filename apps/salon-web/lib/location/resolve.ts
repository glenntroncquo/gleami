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

/** Show the switcher only when the user can reach more than one location. */
export function shouldShowLocationSwitcher(input: {
  accessibleCount: number;
}): boolean {
  return input.accessibleCount > 1;
}

/**
 * Locations an owner or admin can open: every active location of each
 * company they lead, plus any location they belong to directly.
 */
export function locationPickerRows<
  T extends { id: string; company_id: string; is_active: boolean },
>(input: {
  locations: readonly T[];
  leaderCompanyIds: readonly string[];
  memberLocationIds: readonly string[];
}): T[] {
  const leaders = new Set(input.leaderCompanyIds);
  const members = new Set(input.memberLocationIds);
  const seen = new Set<string>();
  const rows: T[] = [];
  for (const row of input.locations) {
    if (!row.is_active) continue;
    if (!leaders.has(row.company_id) && !members.has(row.id)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
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

