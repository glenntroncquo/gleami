import { createClient } from "@/lib/supabase/client";
import {
  clientListRange,
  clientSearchFilters,
  isClientSortColumn,
  type ClientSortColumn,
} from "./client-page";

export type ClientListRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ClientPage = {
  rows: ClientListRow[];
  total: number;
};

const CLIENT_LIST_FIELDS =
  "id, first_name, last_name, email, phone, created_at, updated_at";

type ClientQuery = {
  select: (columns: string, options: { count: "exact" }) => ClientQuery;
  eq: (column: string, value: string) => ClientQuery;
  or: (filters: string) => ClientQuery;
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) => ClientQuery;
  range: (from: number, to: number) => PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
    count: number | null;
  }>;
};

function asClientQuery(supabase: ReturnType<typeof createClient>): {
  from: (relation: string) => ClientQuery;
} {
  return supabase as unknown as { from: (relation: string) => ClientQuery };
}

function asClientRow(value: unknown): ClientListRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<ClientListRow>;
  if (typeof row.id !== "string" || row.id.length === 0) return null;
  return {
    id: row.id,
    first_name: typeof row.first_name === "string" ? row.first_name : null,
    last_name: typeof row.last_name === "string" ? row.last_name : null,
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

/**
 * One page of clients. With a location, membership is `client_location`
 * (a client belongs to a shop). Without one, the page is unscoped — the
 * same fallback the list used when location ids could not be resolved.
 */
export async function fetchClientPage(args: {
  locationId: string | null;
  pageIndex: number;
  pageSize: number;
  search: string;
  sortColumn: string;
  sortDescending: boolean;
}): Promise<ClientPage> {
  const supabase = asClientQuery(createClient());
  const { from, to } = clientListRange(args.pageIndex, args.pageSize);
  const select = args.locationId
    ? `${CLIENT_LIST_FIELDS}, client_location!inner(location_id)`
    : CLIENT_LIST_FIELDS;

  let query = supabase.from("client").select(select, { count: "exact" });
  if (args.locationId) {
    query = query.eq("client_location.location_id", args.locationId);
  }
  for (const filter of clientSearchFilters(args.search)) {
    query = query.or(filter);
  }

  const sortColumn: ClientSortColumn = isClientSortColumn(args.sortColumn)
    ? args.sortColumn
    : "first_name";
  query = query
    .order(sortColumn, { ascending: !args.sortDescending, nullsFirst: false })
    .order("id", { ascending: true });

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message || "Failed to load clients");
  }

  const rows = (Array.isArray(data) ? data : [])
    .map(asClientRow)
    .filter((row): row is ClientListRow => row !== null);

  return { rows, total: count ?? rows.length };
}
