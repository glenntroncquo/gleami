import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "@/shared/cors";
import { createOrderWithPaymentSchema } from "../_shared/order/commands/create-with-payment/schema.ts";
import { createOrderWithPaymentHandler } from "../_shared/order/commands/create-with-payment/handler.ts";
import { orderCreateSuccessEnvelope } from "../_shared/order/commands/create-with-payment/envelope.ts";
import { validateInput } from "@/shared/validation";
import { BadResponse, OkResponse } from "@/shared/responses";
import { RepositoryError, UnauthenticatedError, ForbiddenError, BookingLocationError } from "@/shared/errors";
import { getAuthContext } from "@/shared/auth-context";
import { requireCompanyAccess } from "@/shared/auth-guard";

// Comment-only redeploy so locationId from PR #17 is live after deploy-edge-functions landed.
// Retry deploy after SUPABASE_PROJECT_ID was set.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new BadResponse("Method not allowed", 405);
  }

  try {
    const authContext = await getAuthContext(req);

    const rawBody = await req.json();
    const validationResult = validateInput(createOrderWithPaymentSchema, rawBody);

    if (validationResult instanceof BadResponse) {
      return validationResult;
    }

    requireCompanyAccess(authContext, validationResult.company_id);

    const result = await createOrderWithPaymentHandler(validationResult, authContext);

    switch (result.outcome) {
      case "success":
        return new OkResponse(orderCreateSuccessEnvelope(result.orderId, result.payments));
      case "missing_client_secret":
        return new BadResponse(
          "STRIPE_CLIENT_SECRET_MISSING",
          502,
          "Stripe did not return a Payment Element client_secret",
        );
      case "appointment_not_found":
        return new BadResponse(
          "Appointment not found",
          404,
          "The specified appointment does not exist",
        );
      case "appointment_company_mismatch":
        return new BadResponse(
          "Appointment does not belong to the specified company",
          403,
        );
      case "client_not_found":
        return new BadResponse(
          "Client not found",
          404,
          "The specified client does not belong to this company",
        );
      case "invalid_card_amount":
        return new BadResponse("Card payment amount must be greater than zero", 400);
      case "charges_not_enabled":
        return new BadResponse(
          "CHARGES_NOT_ENABLED",
          409,
          "Complete Stripe Connect onboarding before taking card payments",
        );
      case "stripe_error":
        return new BadResponse("Failed to create payment intent", result.statusCode, result.message);
    }
  } catch (error: any) {
    if (error instanceof BookingLocationError) {
      return new BadResponse(error.message, 400, error.code);
    }
    if (error instanceof UnauthenticatedError) {
      return new BadResponse(error.message, 401);
    }
    if (error instanceof ForbiddenError) {
      return new BadResponse(error.message, 403);
    }
    if (error instanceof RepositoryError) {
      console.error(error);
      return new BadResponse("Database query failed", 500, error.message);
    }

    console.error("Error creating order with payment:", error);

    return new BadResponse(
      "Internal server error",
      500,
      error.message || "An unexpected error occurred",
    );
  }
});
