import { createClient } from "@/lib/supabase/client";

/**
 * Location queries stay on this untyped surface. Generated Database types
 * include location and the marketplace tables, but RPC payloads and
 * PostgREST filters are still loosely shaped.
 */
export type LocationQueryError = { code?: string; message?: string } | null;

type FilterBuilder = PromiseLike<{ data: unknown; error: LocationQueryError }> & {
  select: (columns: string) => FilterBuilder;
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => FilterBuilder;
  update: (values: Record<string, unknown>) => FilterBuilder;
  delete: () => FilterBuilder;
  eq: (column: string, value: string | boolean | number) => FilterBuilder;
  in: (column: string, values: string[]) => FilterBuilder;
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) => FilterBuilder;
  single: () => PromiseLike<{ data: unknown; error: LocationQueryError }>;
  maybeSingle: () => PromiseLike<{ data: unknown; error: LocationQueryError }>;
};

export type LocationSupabase = {
  from: (relation: string) => FilterBuilder;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: LocationQueryError }>;
};

export function asLocationClient(
  supabase: ReturnType<typeof createClient> | LocationSupabase = createClient(),
): LocationSupabase {
  return supabase as unknown as LocationSupabase;
}

export function locationClient() {
  return asLocationClient();
}
