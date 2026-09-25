import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { getMarketplaceDb } from "../_shared/marketplace/db.ts";
import { suggestMarketplace } from "../_shared/marketplace/suggest.ts";
import { marketplaceSuggestSchema } from "./schema.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  try {
    const validated = validateInput(marketplaceSuggestSchema, await req.json());
    if (validated instanceof BadResponse) return validated;
    const result = await suggestMarketplace(getMarketplaceDb(), validated);
    return new OkResponse(result);
  } catch (err) {
    console.error(err);
    return new BadResponse("Database query failed", 500);
  }
});
