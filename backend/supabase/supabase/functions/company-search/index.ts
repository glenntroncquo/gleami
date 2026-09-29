import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError } from "@/shared/errors";
import { listNearbyCompaniesHandler } from "../_shared/company/queries/list/handler.ts";
import { getCompaniesListSchema } from "../_shared/company/queries/list/schema.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    // M7: validated and bounded (radius <= 100 km, term <= 120 chars).
    const validatedInput = validateInput(getCompaniesListSchema, await req.json());
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    const result = await listNearbyCompaniesHandler({
      latitude: validatedInput.lat,
      longitude: validatedInput.long,
      radiusM: validatedInput.radius,
      searchTerm: validatedInput.search_term ?? null,
    });

    return new OkResponse(result);
  } catch (err) {
    if (err instanceof RepositoryError) {
      console.error(err);
      return new BadResponse("Database query failed", 500);
    }
    console.error(err);
    return new BadResponse("Internal server error", 500);
  }
});
