import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError, BookingLocationError } from "@/shared/errors";
import { listStaffQuerySchema } from "../_shared/staff/queries/list/schema.ts";
import { listStaffHandler } from "../_shared/staff/queries/list/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const body = await req.json();

    const validatedInput = validateInput(listStaffQuerySchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    const result = await listStaffHandler(validatedInput);

    return new OkResponse(result);
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
