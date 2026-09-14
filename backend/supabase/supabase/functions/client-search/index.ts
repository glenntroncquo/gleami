import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError, UnauthenticatedError, ForbiddenError } from "@/shared/errors";
import { getAuthContext } from "@/shared/auth-context";
import { requireCompanyAccess } from "@/shared/auth-guard";
import { searchClientsQuerySchema } from "../_shared/client/queries/search/schema.ts";
import { searchClientsHandler } from "../_shared/client/queries/search/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const authContext = await getAuthContext(req);

    const body = await req.json();
    const validatedInput = validateInput(searchClientsQuerySchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    requireCompanyAccess(authContext, validatedInput.companyId);

    const result = await searchClientsHandler(validatedInput);

    return new OkResponse(result);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return new BadResponse(err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return new BadResponse(err.message, 403);
    }
    if (err instanceof RepositoryError) {
      console.error(err);
      return new BadResponse("Database query failed", 500);
    }
    console.error(err);
    return new BadResponse("Internal server error", 500);
  }
});
