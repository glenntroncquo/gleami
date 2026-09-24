import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError } from "@/shared/errors";
import { nextAvailable } from "../_shared/marketplace/next-available.ts";
import { marketplaceNextAvailableSchema } from "./schema.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  try {
    const validated = validateInput(marketplaceNextAvailableSchema, await req.json());
    if (validated instanceof BadResponse) return validated;
    const results = await nextAvailable(validated.pairs);
    return new OkResponse({ results });
  } catch (err) {
    if (err instanceof RepositoryError) {
      console.error(err);
      return new BadResponse("Database query failed", 500);
    }
    console.error(err);
    return new BadResponse("Internal server error", 500);
  }
});
