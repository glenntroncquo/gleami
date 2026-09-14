/** Location-scoped system roles used for shop staff (not owner/admin). */
export const LOCATION_STAFF_ROLE_NAMES = ["stylist", "staff"] as const;

/**
 * Prefer stylist, then staff, then any other location-scoped system role.
 */
export function pickLocationStaffRoleId(
  roles: readonly { id: string; name: string }[],
  fallbackId?: string | null,
): string | null {
  for (const name of LOCATION_STAFF_ROLE_NAMES) {
    const match = roles.find((role) => role.name === name);
    if (match?.id) return match.id;
  }
  if (fallbackId) return fallbackId;
  return roles[0]?.id ?? null;
}

export function buildLocationMembershipInsert(input: {
  locationId: string;
  roleId: string;
  staffId: string;
  userId?: string | null;
}): Record<string, unknown> {
  const row: Record<string, unknown> = {
    location_id: input.locationId,
    role_id: input.roleId,
    staff_id: input.staffId,
    is_active: true,
  };
  if (input.userId) row.user_id = input.userId;
  return row;
}

/**
 * Staff roster scope after `resolveLocationScopeIds`.
 * - `null` → do not filter (missing table, timeout, or 1:1 empty memberships)
 * - `[]` → empty roster (multi-location shop with no memberships — never
 *   fail-open to every company staff)
 * - `[ids]` → filter to those staff
 */
export function staffIdsForLocationScope(
  scopedIds: string[] | null,
  multiLocationEnabled: boolean,
): string[] | null {
  if (scopedIds == null) return null;
  if (scopedIds.length > 0) return scopedIds;
  return multiLocationEnabled ? [] : null;
}

/**
 * Prefer the selected shop. If nothing is selected, keep the location
 * already stored on the row (appointment / segment / phase).
 */
export function resolveWriteLocationId(
  selected: string | null | undefined,
  existing?: string | null | undefined,
): string | null {
  const selectedId = typeof selected === "string" ? selected.trim() : "";
  if (selectedId) return selectedId;
  const existingId = typeof existing === "string" ? existing.trim() : "";
  return existingId || null;
}

/** Attach location_id on schedule / time-off / appointment writes when a shop is known. */
export function withOptionalLocationFields<T extends Record<string, unknown>>(
  row: T,
  locationId: string | null | undefined,
): T {
  if (!locationId) return row;
  return { ...row, location_id: locationId };
}
