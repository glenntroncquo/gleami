import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "@/shared/cors";
import { processPaymentTerminalSchema } from "../_shared/order/commands/process-payment-terminal/schema.ts";
import { processPaymentTerminalHandler } from "../_shared/order/commands/process-payment-terminal/handler.ts";
import { validateInput } from "@/shared/validation";
import { BadResponse } from "@/shared/responses";
import { getAuthContext } from "@/shared/auth-context";
import { requireCompanyAccess, requireLocationAccess } from "@/shared/auth-guard";
import { UnauthenticatedError, ForbiddenError, ChargesNotEnabledError } from "@/shared/errors";
import { orderRepository } from "../_shared/order/repository.ts";
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
    const validationResult = validateInput(processPaymentTerminalSchema, body);

    if (validationResult instanceof BadResponse) {
      return validationResult;
    }

    const { company_id, reader_id, payment_intent_id } = validationResult;

    requireCompanyAccess(authContext, company_id);

    const paymentAccount = await companyPaymentAccountRepository.findByCompanyId(company_id);
    if (!isCardChargesEnabled(paymentAccount)) {
      throw new ChargesNotEnabledError();
    }

    const payment = await orderRepository.findPaymentByProviderIntentId(payment_intent_id);
    if (payment?.companyId && payment.companyId !== company_id) {
      throw new ForbiddenError(`Not authorized for company ${payment.companyId}`);
    }
    if (payment?.locationId) {
      requireLocationAccess(authContext, payment.locationId);
    }

    const result = await processPaymentTerminalHandler({ reader_id, payment_intent_id });

    if (result.outcome === "success") {
      return new Response(
        JSON.stringify({
          success: true,
          data: result.reader,
        }),
        {
          status: 200,
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
        error: result.error,
        code: result.code,
        message: result.message,
        ...(result.attempts !== undefined && { attempts: result.attempts }),
        ...(result.paymentIntentStatus !== undefined && {
          paymentIntentStatus: result.paymentIntentStatus,
        }),
      }),
      {
        status: result.statusCode,
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

    console.error("Error processing payment:", error);

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
