/**
 * Global permission catalog (public.permission).
 * One key per screen. Companies do not create keys.
 */
export const PERMISSION_KEYS = [
  "billing:manage",
  "calendar:manage",
  "clients:manage",
  "dashboard:read",
  "marketing:manage",
  "orders:manage",
  "pos:manage",
  "products:manage",
  "settings:manage",
  "staff:manage",
  "treatments:manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

/** Nav / feature gates. Each screen has exactly one key. */
export const NAV_PERMISSION = {
  dashboard: ["dashboard:read"],
  calendar: ["calendar:manage"],
  staff: ["staff:manage"],
  client: ["clients:manage"],
  catalog: ["treatments:manage"],
  pos: ["pos:manage"],
  orders: ["orders:manage"],
  products: ["products:manage"],
  marketing: ["marketing:manage"],
  billing: ["billing:manage"],
  settings: ["settings:manage"],
} as const satisfies Record<string, readonly PermissionKey[]>;
