import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { RepositoryError } from "@/shared/errors";
import { listNearbyCompaniesHandler } from "../_shared/company/queries/list/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const body = await req.json();

    // Validation intentionally not applied here, preserving current
    // production behavior (see _shared/company/queries/list/schema.ts).
    const { lat, long, radius, search_term } = body;

    const result = await listNearbyCompaniesHandler({
      latitude: lat,
      longitude: long,
      radiusM: radius,
      searchTerm: search_term || null,
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
