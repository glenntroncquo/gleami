import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "supabase";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { decodeSearchCursor } from "../_shared/marketplace/cursor.ts";
import {
  mapSearchRows,
  SearchCursorError,
  type SearchRow,
} from "../_shared/marketplace/search.ts";
import { marketplaceSearchSchema } from "./schema.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  const started = Date.now();
  try {
    const validated = validateInput(marketplaceSearchSchema, await req.json());
    if (validated instanceof BadResponse) return validated;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return new BadResponse("SUPABASE_URL is not set", 500);

    const cursor = validated.cursor ? decodeSearchCursor(validated.cursor) : null;
    if (validated.cursor && !cursor) throw new SearchCursorError("Invalid cursor");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? `Bearer ${anonKey}`,
        },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("marketplace_search", {
      p_q: validated.q ?? null,
      p_category_ids: validated.categoryIds?.length ? validated.categoryIds : null,
      p_lat: validated.center?.lat ?? null,
      p_lng: validated.center?.lng ?? null,
      p_radius_km: validated.radiusKm ?? null,
      p_min_lng: validated.bbox?.minLng ?? null,
      p_min_lat: validated.bbox?.minLat ?? null,
      p_max_lng: validated.bbox?.maxLng ?? null,
      p_max_lat: validated.bbox?.maxLat ?? null,
      p_cursor_score: cursor?.score ?? null,
      p_cursor_location_id: cursor?.locationId ?? null,
      p_limit: validated.limit ?? null,
    });
    if (error) throw new Error(error.message);

    const result = mapSearchRows((data ?? []) as SearchRow[], validated, supabaseUrl);
    console.log(JSON.stringify({
      msg: "marketplace-search",
      elapsedMs: Date.now() - started,
      rows: result.items.length,
      hasBbox: Boolean(validated.bbox),
      hasCenter: Boolean(validated.center),
      hasQ: Boolean(validated.q),
      categories: validated.categoryIds?.length ?? 0,
    }));
    return new OkResponse(result);
  } catch (err) {
    if (err instanceof SearchCursorError) return new BadResponse(err.message, 400);
    console.error(err);
    return new BadResponse("Database query failed", 500);
  }
});
