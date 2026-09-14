import type Stripe from "stripe";
import { stripe } from "../../../infrastructure/stripe/client.ts";
import type { SimulatePaymentTerminalInput } from "./schema.ts";

/** Throws on failure (Stripe or otherwise) - the adapter distinguishes Stripe.errors.StripeError from generic errors. */
export async function simulatePaymentTerminalHandler(
  input: Pick<SimulatePaymentTerminalInput, "reader_id" | "card_number">,
): Promise<Stripe.Terminal.Reader> {
  const { reader_id, card_number } = input;

  return await stripe.testHelpers.terminal.readers.presentPaymentMethod(reader_id, {
    card_present: {
      number: card_number,
    },
    type: "card_present",
  });
}
