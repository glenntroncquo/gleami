import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError } from "@/shared/errors";
import { getCompanyQuerySchema } from "../_shared/company/queries/get/schema.ts";
import { getCompanyHandler } from "../_shared/company/queries/get/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const body = await req.json();

    const validatedInput = validateInput(getCompanyQuerySchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    const result = await getCompanyHandler(validatedInput);

    if (!result) {
      return new BadResponse("Company not found", 404);
    }

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
