import postgres from "npm:postgres";
import type { MarketplaceSql } from "./sql.ts";

let cached: MarketplaceSql | undefined;

/**
 * Direct Postgres for queries PostgREST cannot express (PostGIS, FTS,
 * keyset, set-based like recount). Prefer MARKETPLACE_DATABASE_URL, the
 * session pooler URL. Fall back to SUPABASE_DB_URL. The direct database
 * host is IPv6-only and unreachable from many edge runtimes. The
 * transaction pooler is a poor fit for these statements. max: 1 per isolate.
 */
export function getMarketplaceDb(): MarketplaceSql {
  if (!cached) {
    const url = Deno.env.get("MARKETPLACE_DATABASE_URL") || Deno.env.get("SUPABASE_DB_URL");
    if (!url) {
      throw new Error("MARKETPLACE_DATABASE_URL or SUPABASE_DB_URL is not set");
    }
    cached = postgres(url, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
    }) as unknown as MarketplaceSql;
  }
  return cached;
}
