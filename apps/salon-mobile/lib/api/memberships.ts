import { locationsVisibleToUser } from '@/lib/api/location-access';
import { supabase } from '@/lib/supabase';

/** Live tables/RPCs exist; generated types in this repo predate memberships. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = supabase as any;

const HYDRATE_TIMEOUT_MS = 4000;

export type ShopLocation = {
  id: string;
  company_id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  is_primary: boolean;
};

function asStringIds(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const ids: string[] = [];
  for (const row of data) {
    if (typeof row === 'string' && row.length > 0) {
      ids.push(row);
      continue;
    }
    if (row && typeof row === 'object') {
      const record = row as Record<string, unknown>;
      const value = record.my_company_ids ?? record.my_location_ids ?? record.id ?? record.company_id;
      if (typeof value === 'string' && value.length > 0) ids.push(value);
    }
  }
  return [...new Set(ids)];
}

function asLocations(data: unknown): ShopLocation[] {
  if (!Array.isArray(data)) return [];
  const locations: ShopLocation[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.company_id !== 'string') continue;
    locations.push({
      id: record.id,
      company_id: record.company_id,
      name: typeof record.name === 'string' ? record.name : '',
      image_url: typeof record.image_url === 'string' ? record.image_url : null,
      is_active: record.is_active !== false,
      is_primary: record.is_primary === true,
    });
  }
  return locations;
}

export function jwtCompanyIds(appMetadata: Record<string, unknown> | undefined): string[] {
  const raw = appMetadata?.company_ids;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function pickPreferredId(ids: string[], preferred: string | null | undefined): string | null {
  if (preferred && ids.includes(preferred)) return preferred;
  return ids[0] ?? null;
}

export function pickLocationId(locations: ShopLocation[], preferred: string | null | undefined): string | null {
  const ids = locations.map((location) => location.id);
  if (preferred && ids.includes(preferred)) return preferred;
  const primary = locations.find((location) => location.is_primary);
  if (primary) return primary.id;
  return locations[0]?.id ?? null;
}

async function withTimeout<T>(promise: Promise<T>, fallback: T | null): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T | null>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), HYDRATE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise.catch(() => fallback), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function fetchMyCompanyIds(): Promise<string[]> {
  const { data, error } = await live.rpc('my_company_ids');
  if (error) throw error;
  return asStringIds(data);
}

export async function fetchMyLocations(): Promise<ShopLocation[]> {
  const { data, error } = await live.rpc('my_locations');
  if (error) throw error;
  return asLocations(data);
}

/** Membership first; JWT `company_ids` is a cache fallback only. Always settles. */
export async function hydrateCompanyIds(jwtFallback: string[]): Promise<string[]> {
  try {
    const ids = await withTimeout(fetchMyCompanyIds(), null);
    // Empty array is a real "no memberships" result — do not treat it as a timeout.
    if (ids !== null) return ids;
  } catch {
    // Fall through to JWT cache so hydrate cannot hang (Safari-style).
  }
  return jwtFallback;
}

const LOCATION_COLUMNS = 'id, company_id, name, image_url, is_active, is_primary';

async function fetchLeaderCompanyIds(userId: string): Promise<string[]> {
  const { data, error } = await live
    .from('company_membership')
    .select('company_id')
    .eq('user_id', userId);
  if (error) throw error;
  return asStringIds(data);
}

async function fetchMemberLocationIds(userId: string): Promise<string[]> {
  const { data, error } = await live
    .from('location_membership')
    .select('location_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  const ids: string[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const id = (row as { location_id?: unknown }).location_id;
    if (typeof id === 'string' && id.length > 0) ids.push(id);
  }
  return [...new Set(ids)];
}

async function fetchLocationRows(filter: { companyIds?: string[]; locationIds?: string[] }): Promise<ShopLocation[]> {
  let query = live.from('location').select(LOCATION_COLUMNS).eq('is_active', true);
  if (filter.companyIds) query = query.in('company_id', filter.companyIds);
  if (filter.locationIds) query = query.in('id', filter.locationIds);
  const { data, error } = await query;
  if (error) throw error;
  return asLocations(data);
}

/**
 * Locations the signed-in user can open.
 * Company membership (owner/admin) includes every active shop of that company.
 * Location membership includes only that shop.
 */
export async function hydrateAccessibleLocations(userId: string): Promise<ShopLocation[]> {
  const [rpcLocations, leaderCompanyIds, memberLocationIds] = await Promise.all([
    withTimeout(fetchMyLocations().catch(() => [] as ShopLocation[]), []),
    withTimeout(fetchLeaderCompanyIds(userId).catch(() => [] as string[]), []),
    withTimeout(fetchMemberLocationIds(userId).catch(() => [] as string[]), []),
  ]);

  const byId = new Map<string, ShopLocation>();
  for (const row of rpcLocations ?? []) byId.set(row.id, row);

  if ((leaderCompanyIds ?? []).length > 0) {
    const companyRows = await withTimeout(fetchLocationRows({ companyIds: leaderCompanyIds ?? [] }).catch(() => []), []);
    for (const row of companyRows ?? []) byId.set(row.id, row);
  }

  const missingMemberIds = (memberLocationIds ?? []).filter((id) => !byId.has(id));
  if (missingMemberIds.length > 0) {
    const memberRows = await withTimeout(fetchLocationRows({ locationIds: missingMemberIds }).catch(() => []), []);
    for (const row of memberRows ?? []) byId.set(row.id, row);
  }

  return locationsVisibleToUser({
    locations: [...byId.values()],
    leaderCompanyIds: leaderCompanyIds ?? [],
    memberLocationIds: memberLocationIds ?? [],
  });
}

export async function hydrateLocationsForCompany(companyId: string): Promise<ShopLocation[]> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (userId) {
    const accessible = await hydrateAccessibleLocations(userId);
    const forCompany = accessible.filter((location) => location.company_id === companyId);
    if (forCompany.length > 0) return forCompany;
  }

  const { data: rows, error } = await live
    .from('location')
    .select(LOCATION_COLUMNS)
    .eq('company_id', companyId)
    .eq('is_active', true);
  if (error) throw error;
  return asLocations(rows).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name));
}
