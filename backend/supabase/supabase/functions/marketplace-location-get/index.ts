import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { getMarketplaceDb } from "../_shared/marketplace/db.ts";
import { getMarketplaceLocation } from "../_shared/marketplace/location-get.ts";
import { marketplaceLocationGetSchema } from "./schema.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  try {
    const validated = validateInput(marketplaceLocationGetSchema, await req.json());
    if (validated instanceof BadResponse) return validated;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return new BadResponse("SUPABASE_URL is not set", 500);

    const location = await getMarketplaceLocation(getMarketplaceDb(), validated.slug, supabaseUrl);
    if (!location) return new BadResponse("Location not found", 404);
    return new OkResponse(location);
  } catch (err) {
    console.error(err);
    return new BadResponse("Database query failed", 500);
  }
});
