import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError, UnauthenticatedError } from "@/shared/errors";
import { getCustomerUser } from "../_shared/marketplace/customer.ts";
import { cancelCustomerAppointmentSchema } from "../_shared/appointment/commands/cancel-customer/schema.ts";
import { cancelCustomerAppointmentHandler } from "../_shared/appointment/commands/cancel-customer/handler.ts";

/**
 * Marketplace customer self-cancel. Unlike appointment-cancel (staff JWT, or
 * the public manage-booking capability ids), identity here comes only from
 * the verified user JWT and ownership from client.user_id. The request body
 * carries just the appointment id, so there is nothing to spoof.
 *
 * verify_jwt stays enabled for this function; the handler verifies the token
 * again via auth.getUser so a gateway misconfiguration cannot turn this into
 * a decode-only check.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  if (req.method !== "POST") {
    return new BadResponse("Method not allowed", 405);
  }
  try {
    const user = await getCustomerUser(req);

    const validatedInput = validateInput(cancelCustomerAppointmentSchema, await req.json());
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    const canceled = await cancelCustomerAppointmentHandler(validatedInput, user);
    if (!canceled) {
      // Unknown id, someone else's appointment, already canceled, and already
      // started all land here — deliberately indistinguishable.
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
    if (err instanceof UnauthenticatedError) {
      return new BadResponse(err.message, 401);
    }
    if (err instanceof RepositoryError) {
      console.error(err);
      return new BadResponse("Database query failed", 500);
    }
    console.error(err);
    return new BadResponse("Internal server error", 500);
  }
});
