import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type Stripe from "stripe";
import { corsHeaders } from "@/shared/cors";
import { stripe } from "@/shared/stripe";
import { BadResponse, OkResponse } from "@/shared/responses";
import { RepositoryError } from "@/shared/errors";
import { handlePaymentWebhookEvent } from "../_shared/order/commands/handle-payment-webhook/handler.ts";
import { handleAccountUpdatedEvent } from "../_shared/company/commands/sync-account-from-webhook/handler.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
}

// Called directly by Stripe, not by our own frontend or DB triggers - auth
// here is the signature check below, not a Supabase JWT. verify_jwt must be
// disabled for this function (see supabase/config.toml) or Stripe's calls,
// which carry no Supabase token, will never reach this code.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new BadResponse("Method not allowed", 405, "Only POST requests are allowed");
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No stripe-signature header found");
      return new BadResponse("Missing signature", 400, "No stripe-signature header found");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      console.log("Webhook signature verified. Event type:", event.type, "Event ID:", event.id);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new BadResponse("Invalid signature", 400, err.message);
    }

    if (event.type === "account.updated") {
      const accountResult = await handleAccountUpdatedEvent(event);
      if (accountResult.outcome === "account_not_found") {
        // Acknowledge so Stripe does not retry an event we cannot match.
        console.error(
          "company_payment_account not found for",
          accountResult.providerAccountId,
        );
        return new OkResponse({
          success: true,
          message: "Connected account not found, but webhook acknowledged",
        });
      }

      return new OkResponse({
        success: true,
        message: "Connected account flags updated",
        data: {
          company_id: accountResult.companyId,
          provider: accountResult.provider,
          provider_account_id: accountResult.providerAccountId,
          charges_enabled: accountResult.chargesEnabled,
          payouts_enabled: accountResult.payoutsEnabled,
          details_submitted: accountResult.detailsSubmitted,
        },
      });
    }

    const result = await handlePaymentWebhookEvent(event);

    switch (result.outcome) {
      case "updated":
        return new OkResponse({
          success: true,
          message: "Payment updated successfully",
          data: {
            payment_id: result.paymentId,
            order_id: result.orderId,
            status: result.status,
          },
        });
      case "payment_not_found":
        // Acknowledge with 200 so Stripe doesn't keep retrying an event we'll never be able to match.
        console.error("Payment record not found for webhook event");
        return new OkResponse({
          success: true,
          message: "Payment record not found, but webhook acknowledged",
        });
      case "unhandled_event_type":
        console.log(`Unhandled event type: ${result.eventType}`);
        return new OkResponse({
          success: true,
          message: `Event type ${result.eventType} received but not handled`,
        });
    }
  } catch (error: any) {
    if (error instanceof RepositoryError) {
      console.error(error);
      return new BadResponse("Failed to update payment", 500, error.message);
    }

    console.error("Error processing webhook:", error);
    console.error("Stack:", error.stack);

    return new BadResponse(
      "Internal server error",
      500,
      error.message || "An unexpected error occurred",
    );
  }
});
