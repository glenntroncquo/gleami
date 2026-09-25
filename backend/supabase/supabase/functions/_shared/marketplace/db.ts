import postgres from "npm:postgres";
import type { MarketplaceSql } from "./sql.ts";

let cached: MarketplaceSql | undefined;

/**
 * Direct Postgres for queries PostgREST cannot express (PostGIS, FTS,
 * keyset, set-based like recount). SUPABASE_DB_URL must be the session
 * connection (db.*:5432) or the session pooler. max: 1 per isolate.
 */
export function getMarketplaceDb(): MarketplaceSql {
  if (!cached) {
    const url = Deno.env.get("SUPABASE_DB_URL");
    if (!url) {
      throw new Error("SUPABASE_DB_URL is not set");
    }
    cached = postgres(url, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
    }) as unknown as MarketplaceSql;
  }
  return cached;
}
