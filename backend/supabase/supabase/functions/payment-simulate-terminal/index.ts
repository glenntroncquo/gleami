import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "stripe";
import { corsHeaders } from "@/shared/cors";
import { simulatePaymentTerminalSchema } from "../_shared/order/commands/simulate-payment-terminal/schema.ts";
import { simulatePaymentTerminalHandler } from "../_shared/order/commands/simulate-payment-terminal/handler.ts";
import { validateInput } from "@/shared/validation";
import { BadResponse } from "@/shared/responses";
import { getAuthContext } from "@/shared/auth-context";
import { requireCompanyAccess } from "@/shared/auth-guard";
import { UnauthenticatedError, ForbiddenError, ChargesNotEnabledError } from "@/shared/errors";
import { companyPaymentAccountRepository } from "../_shared/company/payment-account/repository.ts";
import { isCardChargesEnabled } from "../_shared/company/payment-account/flags.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
        message: "Only POST requests are allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const authContext = await getAuthContext(req);

    const body = await req.json();
    const validationResult = validateInput(simulatePaymentTerminalSchema, body);

    if (validationResult instanceof BadResponse) {
      return validationResult;
    }

    const { company_id, reader_id, card_number } = validationResult;

    requireCompanyAccess(authContext, company_id);

    const paymentAccount = await companyPaymentAccountRepository.findByCompanyId(company_id);
    if (!isCardChargesEnabled(paymentAccount)) {
      throw new ChargesNotEnabledError();
    }

    console.log("=== Simulating Payment ===");
    console.log("Reader ID:", reader_id);
    console.log("Card Number:", card_number);
    console.log("==========================");

    const reader = await simulatePaymentTerminalHandler({ reader_id, card_number });

    console.log("=== Simulation Result ===");
    console.log("Reader ID:", reader.id);
    console.log("Reader Status:", reader.status);
    if (reader.action) {
      console.log("Action Type:", reader.action.type);
      console.log("Action Status:", reader.action.status);
    }
    console.log("==========================");

    return new Response(
      JSON.stringify({
        success: true,
        data: reader,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return new BadResponse(error.message, 401);
    }
    if (error instanceof ForbiddenError) {
      return new BadResponse(error.message, 403);
    }
    if (error instanceof ChargesNotEnabledError) {
      return new BadResponse(error.code, 409, error.message);
    }

    console.error("Error simulating payment:", error);

    if (error instanceof Stripe.errors.StripeError) {
      console.log("=== Stripe Error ===");
      console.log("Type:", error.type);
      console.log("Code:", error.code);
      console.log("Message:", error.message);
      console.log("Status Code:", error.statusCode);
      console.log("===================");

      return new Response(
        JSON.stringify({
          success: false,
          error: error.type || "Stripe error",
          code: error.code,
          message: error.message,
        }),
        {
          status: error.statusCode || 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
