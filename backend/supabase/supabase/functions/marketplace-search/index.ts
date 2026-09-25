import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { getMarketplaceDb } from "../_shared/marketplace/db.ts";
import { SearchCursorError, searchMarketplace } from "../_shared/marketplace/search.ts";
import { marketplaceSearchSchema } from "./schema.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  const started = Date.now();
  try {
    const validated = validateInput(marketplaceSearchSchema, await req.json());
    if (validated instanceof BadResponse) return validated;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return new BadResponse("SUPABASE_URL is not set", 500);

    const result = await searchMarketplace(getMarketplaceDb(), validated, supabaseUrl);
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
