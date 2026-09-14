import { pickSelectedLocationId } from "./resolve";

const STORAGE_PREFIX = "gleami.selectedLocationId";

export function locationStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

export function readPersistedLocationId(userId: string | null | undefined): string | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(locationStorageKey(userId));
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Use the stored id only when it is still reachable. A typo / deleted /
 * other-company id is wiped so the next load falls back to primary / sole.
 * An empty accessible list means locations have not hydrated yet — keep
 * the stored value instead of treating it as stale.
 */
export function resolvePersistedLocationId(
  userId: string | null | undefined,
  accessibleIds: readonly string[],
): string | null {
  const persisted = readPersistedLocationId(userId);
  if (!persisted) return null;
  if (accessibleIds.length === 0) return persisted;
  if (!accessibleIds.includes(persisted)) {
    clearPersistedLocationId(userId);
    return null;
  }
  return persisted;
}

export function writePersistedLocationId(
  userId: string | null | undefined,
  locationId: string | null,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    const key = locationStorageKey(userId);
    if (!locationId) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, locationId);
  } catch {
    // Private mode / quota — selection still works for this session.
  }
}

export function clearPersistedLocationId(userId: string | null | undefined): void {
  writePersistedLocationId(userId, null);
}

/**
 * After memberships + locations load: reuse a valid stored id, otherwise
 * pick primary / sole / first accessible and persist it. Empty Safari
 * localStorage (website-data clear) is the common path — 1:1 tenants
 * still get a locationId.
 */
export function settleLocationSelection(input: {
  userId: string;
  accessibleIds: readonly string[];
  persistedId?: string | null;
  fallbackId?: string | null;
  primaryId?: string | null;
}): string | null {
  const accessibleIds = [...input.accessibleIds];
  const persistedId =
    input.persistedId !== undefined
      ? input.persistedId
      : resolvePersistedLocationId(input.userId, accessibleIds);
  const nextId = pickSelectedLocationId({
    accessibleIds,
    persistedId,
    fallbackId: input.fallbackId,
    primaryId: input.primaryId,
  });
  if (nextId) {
    writePersistedLocationId(input.userId, nextId);
  }
  return nextId;
}
