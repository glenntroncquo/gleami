import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError } from "@/shared/errors";
import { listAppointmentsByClientSchema } from "../_shared/appointment/queries/list/schema.ts";
import { listAppointmentsByClientHandler } from "../_shared/appointment/queries/list/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const body = await req.json();

    const validatedInput = validateInput(listAppointmentsByClientSchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    const appointments = await listAppointmentsByClientHandler(validatedInput);

    return new OkResponse({
      success: true,
      appointments,
      total_appointments: appointments.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof RepositoryError) {
      console.error(err);
      return new BadResponse("Database query failed", 500);
    }
    console.error(err);
    return new BadResponse("Internal server error", 500);
  }
});
