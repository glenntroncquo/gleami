/**
 * Global permission catalog (public.permission).
 * Matches Phase 2 seed keys. Companies do not create keys.
 */
export const PERMISSION_KEYS = [
  "billing:manage",
  "calendar:read",
  "calendar:write",
  "catalog:manage",
  "clients:manage",
  "clients:read",
  "invites:manage",
  "locations:manage",
  "locations:read",
  "pos:manage",
  "pos:read",
  "pos:refund",
  "schedule:manage",
  "settings:manage",
  "staff:manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

/** Nav / feature gates that used to assume JWT company access. */
export const NAV_PERMISSION = {
  dashboard: ["calendar:read", "pos:read"],
  calendar: ["calendar:read"],
  staff: ["staff:manage"],
  client: ["clients:read"],
  catalog: ["catalog:manage"],
  pos: ["pos:read"],
  orders: ["pos:read"],
  products: ["catalog:manage", "pos:manage"],
  marketing: ["settings:manage", "clients:manage"],
  billing: ["billing:manage"],
  settings: ["settings:manage"],
} as const satisfies Record<string, readonly PermissionKey[]>;
