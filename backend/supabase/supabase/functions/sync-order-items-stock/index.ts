import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "@/shared/cors";
import { BadResponse, OkResponse } from "@/shared/responses";
import { createSupabaseClient } from "@/shared/supabase";
import { validateInput } from "@/shared/validation";
import { syncOrderItemsStockFromWebhook } from "./logic.ts";
import { orderItemWebhookSchema } from "./schema.ts";
import { requireServiceRole } from "@/shared/require-service-role";
import { UnauthenticatedError, ForbiddenError } from "@/shared/errors";

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
    requireServiceRole(req);

    const body = await req.json();
    const validationResult = validateInput(orderItemWebhookSchema, body);

    if (validationResult instanceof BadResponse) {
      return validationResult;
    }

    const supabase = createSupabaseClient();
    const data = await syncOrderItemsStockFromWebhook(supabase, validationResult);

    return new OkResponse({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return new BadResponse(error.message, 401);
    }
    if (error instanceof ForbiddenError) {
      return new BadResponse(error.message, 403);
    }

    return new BadResponse(
      "Failed to sync order items stock",
      400,
      error?.message || "An unexpected error occurred",
    );
  }
});
