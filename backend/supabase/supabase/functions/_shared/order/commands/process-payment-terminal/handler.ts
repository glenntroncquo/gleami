import type Stripe from "stripe";
import { stripe } from "../../../infrastructure/stripe/client.ts";
import type { ProcessPaymentTerminalInput } from "./schema.ts";

const MAX_RETRIES = 3;

export type ProcessPaymentTerminalOutcome =
  | { outcome: "success"; reader: Stripe.Terminal.Reader }
  | {
    outcome: "failed";
    error: string;
    code?: string;
    message: string;
    statusCode: number;
    attempts?: number;
    paymentIntentStatus?: string;
  };

/**
 * Terminal-only (`reader_id` + `card_present` PI). Readers stay on the platform
 * (destination-charge model). `order-create` `payment_type: "card"` now creates
 * Payment Element (`card`) PIs — do not send those here.
 *
 * Non-Stripe errors are rethrown - the adapter's generic catch maps those to a plain 500.
 */
export async function processPaymentTerminalHandler(
  input: Pick<ProcessPaymentTerminalInput, "reader_id" | "payment_intent_id">,
): Promise<ProcessPaymentTerminalOutcome> {
  const { reader_id, payment_intent_id } = input;

  let attempt = 0;

  while (true) {
    attempt++;

    try {
      const reader = await stripe.terminal.readers.processPaymentIntent(reader_id, {
        payment_intent: payment_intent_id,
      });

      return { outcome: "success", reader };
    } catch (error: any) {
      console.log(`Attempt ${attempt} failed:`, error);

      if (!error.type || !error.code) {
        throw error;
      }

      switch (error.code) {
        case "terminal_reader_timeout":
          // Temporary networking blip, automatically retry a few times
          if (attempt === MAX_RETRIES) {
            return {
              outcome: "failed",
              error: error.type || "Stripe error",
              code: error.code,
              message: error.message,
              statusCode: error.statusCode || 408,
              attempts: attempt,
            };
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000))
          );
          break;

        case "terminal_reader_offline":
          return {
            outcome: "failed",
            error: error.type || "Stripe error",
            code: error.code,
            message: error.message ||
              "Reader is offline. Make sure the reader is powered on and connected to the internet.",
            statusCode: error.statusCode || 503,
          };

        case "terminal_reader_busy":
          return {
            outcome: "failed",
            error: error.type || "Stripe error",
            code: error.code,
            message: error.message ||
              "Reader is busy. Please wait for the current operation to complete.",
            statusCode: error.statusCode || 409,
          };

        case "intent_invalid_state": {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
            console.log(`PaymentIntent is already in ${paymentIntent.status} state.`);
            return {
              outcome: "failed",
              error: error.type || "Stripe error",
              code: error.code,
              message: `PaymentIntent is already in ${paymentIntent.status} state.`,
              statusCode: error.statusCode || 400,
              paymentIntentStatus: paymentIntent.status,
            };
          } catch (_retrieveError) {
            return {
              outcome: "failed",
              error: error.type || "Stripe error",
              code: error.code,
              message: error.message,
              statusCode: error.statusCode || 400,
            };
          }
        }

        default:
          return {
            outcome: "failed",
            error: error.type || "Stripe error",
            code: error.code,
            message: error.message,
            statusCode: error.statusCode || 400,
          };
      }
    }
  }
}
