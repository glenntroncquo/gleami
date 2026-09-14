import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { RepositoryError, UnauthenticatedError, ForbiddenError, BookingLocationError } from "@/shared/errors";
import { getAuthContext } from "@/shared/auth-context";
import { requireShopAccess } from "@/shared/auth-guard";
import { createStaffAppointmentSchema } from "../_shared/appointment/commands/create-staff/schema.ts";
import { createStaffAppointmentHandler } from "../_shared/appointment/commands/create-staff/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  try {
    const authContext = await getAuthContext(req);

    const body = await req.json();
    const validatedInput = validateInput(createStaffAppointmentSchema, body);
    if (validatedInput instanceof BadResponse) {
      return validatedInput;
    }

    requireShopAccess(authContext, validatedInput.companyId, validatedInput.locationId);

    const result = await createStaffAppointmentHandler(validatedInput);

    switch (result.outcome) {
      case "success":
        return new OkResponse({
          success: true,
          booking_id: result.bookingId,
          client_id: result.clientId,
          image_path: result.imagePath,
          total_services: result.totalServices,
          total_duration: result.totalDuration,
        });
      case "invalid_service_variant":
        return new BadResponse(
          `Could not retrieve duration from service variant ${result.serviceVariantId}`,
          400,
        );
      case "invalid_image_data":
        return new BadResponse("Invalid image data format", 400);
      case "image_upload_failed":
        return new BadResponse("Image upload failed", 500);
      case "booking_failed":
        return new BadResponse("Booking failed", 400, result.errorKey);
    }
  } catch (err) {
    if (err instanceof BookingLocationError) {
      return new BadResponse(err.message, 400, err.code);
    }
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
