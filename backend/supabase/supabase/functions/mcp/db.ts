export type DbError = { message: string };
export type DbResult<T> = { data: T | null; error: DbError | null };

export type UserDb = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<DbResult<unknown>>;
  from: (table: string) => {
    select: (columns: string) => Query;
  };
  auth: {
    getUser: () => PromiseLike<{
      data: { user: { id: string; email?: string | null } | null };
      error: DbError | null;
    }>;
  };
};

type Query = PromiseLike<DbResult<unknown>> & {
  eq: (column: string, value: unknown) => Query;
  in: (column: string, values: unknown[]) => Query;
  gte: (column: string, value: unknown) => Query;
  lt: (column: string, value: unknown) => Query;
  or: (filters: string) => Query;
  not: (column: string, operator: string, value: unknown) => Query;
  order: (column: string, options?: { ascending?: boolean }) => Query;
  limit: (count: number) => Query;
  maybeSingle: () => PromiseLike<DbResult<unknown>>;
};

export type Shop = {
  id: string;
  name: string;
  timezone: string;
  companyId: string;
};

const PERMISSIONS = [
  "calendar:manage",
  "clients:manage",
  "dashboard:read",
  "staff:manage",
  "treatments:manage",
  "pos:manage",
  "orders:manage",
  "products:manage",
  "marketing:manage",
  "billing:manage",
  "settings:manage",
] as const;

export function toolText(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export async function runTool(work: () => Promise<string>) {
  try {
    return toolText(await work());
  } catch (error) {
    const message = error instanceof Error ? error.message : "The tool failed.";
    return toolError(message);
  }
}

export async function queryRows<T>(query: PromiseLike<DbResult<T>>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export async function queryOne<T>(query: PromiseLike<DbResult<T>>): Promise<T | null> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export function wallClock(value: string | null | undefined): { date: string; time: string } {
  const match = (value ?? "").match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!match) return { date: value ?? "", time: "" };
  return { date: match[1], time: match[2] };
}

export function personName(first: string | null | undefined, last: string | null | undefined): string {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || "Walk-in";
}

export function oneLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export async function loadShops(db: UserDb): Promise<Shop[]> {
  const { data, error } = await db.rpc("my_locations");
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const shop = row as Record<string, unknown>;
    return {
      id: String(shop.id),
      name: String(shop.name ?? "Shop"),
      timezone: String(shop.timezone || "Europe/Brussels"),
      companyId: String(shop.company_id),
    };
  });
}

export async function resolveShop(
  db: UserDb,
  locationId?: string,
): Promise<Shop | { choices: Shop[] }> {
  const shops = await loadShops(db);
  if (locationId) {
    const shop = shops.find((item) => item.id === locationId);
    if (!shop) throw new Error("That shop is not one this login can open.");
    return shop;
  }
  if (shops.length === 1) return shops[0];
  if (shops.length === 0) throw new Error("This login cannot open a shop.");
  return { choices: shops };
}

export function shopChoices(choices: Shop[]): string {
  const lines = choices.map((shop) => `- ${shop.name} (${shop.timezone})\n  id: ${shop.id}`);
  return `This login can open more than one shop. Ask which shop.\n${lines.join("\n")}`;
}

export function isShop(value: Shop | { choices: Shop[] }): value is Shop {
  return "id" in value;
}

export function todayInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function weekdayIndex(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  return asUtc - instant.getTime();
}

export function shopDayBounds(date: string, timeZone: string): { start: string; end: string } {
  const midnight = new Date(`${date}T00:00:00Z`);
  const start = new Date(midnight.getTime() - zoneOffsetMs(midnight, timeZone));
  const next = new Date(`${addDays(date, 1)}T00:00:00Z`);
  const end = new Date(next.getTime() - zoneOffsetMs(next, timeZone));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function shopPermissions(db: UserDb, locationId: string): Promise<string[]> {
  const checks = await Promise.all(PERMISSIONS.map(async (perm) => {
    const { data, error } = await db.rpc("has_permission", { perm, location_id: locationId });
    if (error || data !== true) return null;
    return perm;
  }));
  return checks.filter((perm): perm is string => perm !== null);
}
