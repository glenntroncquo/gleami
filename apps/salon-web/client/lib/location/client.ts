import { createClient } from "@/lib/supabase/client";

/**
 * Location tables / location_id columns are live on SalonFlow but not
 * in the generated supabase-types yet. Keep those queries on this
 * untyped surface so Phase 4 typechecks without a full codegen.
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
