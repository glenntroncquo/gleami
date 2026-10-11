import { supabase } from '@/lib/supabase';

/** Live tables/RPCs exist; generated types in this repo predate memberships. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = supabase as any;

/** Same catalog as salon-web. One key per screen. */
export const PERMISSION_KEYS = [
  'billing:manage',
  'calendar:manage',
  'clients:manage',
  'dashboard:read',
  'marketing:manage',
  'orders:manage',
  'pos:manage',
  'products:manage',
  'settings:manage',
  'staff:manage',
  'treatments:manage',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

const PERMISSION_KEY_SET = new Set<string>(PERMISSION_KEYS);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value);
}

function roleIdsFromMemberships(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const ids = new Set<string>();
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    if (record.is_active === false) continue;
    if (typeof record.role_id === 'string' && record.role_id.length > 0) {
      ids.add(record.role_id);
    }
  }
  return [...ids];
}

async function membershipRoleIds(): Promise<string[]> {
  const { data, error } = await live.rpc('my_memberships');
  if (!error) return roleIdsFromMemberships(data);

  const [company, location] = await Promise.all([
    live.from('company_membership').select('role_id'),
    live.from('location_membership').select('role_id, is_active'),
  ]);
  if (company.error) throw company.error;
  if (location.error) throw location.error;
  return roleIdsFromMemberships([
    ...(Array.isArray(company.data) ? company.data : []),
    ...(Array.isArray(location.data) ? location.data : []),
  ]);
}

/** Permission keys for the signed-in user. Empty when they have no grants. */
export async function fetchPermissionKeys(): Promise<PermissionKey[]> {
  const roleIds = await membershipRoleIds();
  if (roleIds.length === 0) return [];

  const { data, error } = await live
    .from('role_permission')
    .select('permission_key')
    .in('role_id', roleIds);
  if (error) throw error;

  const keys = new Set<PermissionKey>();
  for (const row of Array.isArray(data) ? data : []) {
    const key = row && typeof row === 'object' ? (row as { permission_key?: unknown }).permission_key : null;
    if (typeof key === 'string' && isPermissionKey(key)) keys.add(key);
  }
  return [...keys].sort();
}
