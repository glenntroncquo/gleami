import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError, ForbiddenError, UnauthenticatedError } from "@/shared/errors";
import { tryGetAuthContext } from "@/shared/auth-context";
import { requireCompanyAccess } from "@/shared/auth-guard";
import { listAppointmentsSchema } from "../_shared/appointment/queries/list/schema.ts";
import { listAppointmentsHandler } from "../_shared/appointment/queries/list/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const body = await req.json();

    const validatedInput = validateInput(listAppointmentsSchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    // Guest token requests skip JWT; staff requests must prove membership for
    // the company they are listing. The unauthenticated (client_id,
    // company_id) listing was an enumeration oracle and is gone.
    if (!validatedInput.token) {
      const authContext = await tryGetAuthContext(req);
      if (!authContext) {
        throw new UnauthenticatedError();
      }
      requireCompanyAccess(authContext, validatedInput.companyId!);
    }

    const appointments = await listAppointmentsHandler(validatedInput);

    return new OkResponse({
      success: true,
      appointments,
      total_appointments: appointments.length,
      timestamp: new Date().toISOString(),
    });
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
