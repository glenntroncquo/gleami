import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "@/shared/cors";
import { BadResponse, OkResponse } from "@/shared/responses";
import { createSupabaseClient } from "@/shared/supabase";
import { validateInput } from "@/shared/validation";
import { syncOrderPaymentStateSchema } from "./schema.ts";
import { syncOrderPaymentStateInFunction } from "./logic.ts";
import { requireServiceRole } from "@/shared/require-service-role";
import { UnauthenticatedError, ForbiddenError } from "@/shared/errors";

type WebhookPayload = {
  record?: {
    order_id?: string;
    company_id?: string;
  } | null;
  old_record?: {
    order_id?: string;
    company_id?: string;
  } | null;
};

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
    const supabase = createSupabaseClient();

    const isWebhookShape = body && (body.record || body.old_record);

    if (isWebhookShape) {
      const payload = body as WebhookPayload;
      const sourceRecord = payload.record || payload.old_record;

      if (!sourceRecord?.order_id) {
        return new BadResponse("No payment order_id found in webhook payload", 400);
      }

      const result = await syncOrderPaymentStateInFunction(supabase, {
        order_id: sourceRecord.order_id,
        company_id: sourceRecord.company_id,
      });

      return new OkResponse({
        success: true,
        data: result,
      });
    }

    const validationResult = validateInput(syncOrderPaymentStateSchema, body);
    if (validationResult instanceof BadResponse) {
      return validationResult;
    }

    const result = await syncOrderPaymentStateInFunction(supabase, {
      order_id: validationResult.order_id,
      company_id: validationResult.company_id,
    });

    return new OkResponse({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return new BadResponse(error.message, 401);
    }
    if (error instanceof ForbiddenError) {
      return new BadResponse(error.message, 403);
    }

    return new BadResponse(
      "Failed to sync order payment state",
      400,
      error?.message || "An unexpected error occurred",
    );
  }
});

