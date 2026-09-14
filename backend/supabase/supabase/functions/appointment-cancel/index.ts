import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError, ForbiddenError } from "@/shared/errors";
import { tryGetAuthContext } from "@/shared/auth-context";
import { cancelAppointmentSchema } from "../_shared/appointment/commands/cancel/schema.ts";
import { cancelAppointmentHandler } from "../_shared/appointment/commands/cancel/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const body = await req.json();

    const validatedInput = validateInput(cancelAppointmentSchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    const authContext = await tryGetAuthContext(req);
    const canceled = await cancelAppointmentHandler(validatedInput, authContext);

    if (!canceled) {
      return new BadResponse("Appointment not found", 404);
    }

    return new OkResponse({
      message: "Appointment cancelled successfully",
      appointment: {
        id: canceled.id,
        start: canceled.start,
        end: canceled.end,
        is_canceled: canceled.isCanceled,
      },
    });
  } catch (err) {
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
