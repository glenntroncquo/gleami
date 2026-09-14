import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError, BookingLocationError } from "@/shared/errors";
import { getAvailabilitySchema } from "../_shared/appointment/queries/availability/schema.ts";
import { getAvailabilityHandler } from "../_shared/appointment/queries/availability/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const body = await req.json();

    const validatedInput = validateInput(getAvailabilitySchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    const dates = await getAvailabilityHandler(validatedInput);

    return new OkResponse({ dates });
  } catch (err) {
    if (err instanceof BookingLocationError) {
      return new BadResponse(err.message, 400, err.code);
    }
    if (err instanceof RepositoryError) {
      console.error(err);
      return new BadResponse("Database query failed", 500);
    }
    console.error(err);
    return new BadResponse("Internal server error", 500);
  }
});
