import {
  destinationChargeCreateParams,
  type DestinationChargeCreateParams,
} from "../../../company/payment-account/destination-charge.ts";

/** POS Credit/Debit mounts Payment Element — not Terminal `card_present`. */
export const CARD_PAYMENT_METHOD_TYPES = ["card"] as const;

export type CardPaymentElementCreateParams = {
  amount: number;
  currency: string;
  payment_method_types: string[];
  capture_method: "automatic";
} & DestinationChargeCreateParams;

/**
 * Destination PaymentIntent params that Payment Element can confirm.
 * `card_present` PIs have a client_secret but Elements cannot use them.
 */
export function cardPaymentElementCreateParams(
  amountCents: number,
  currency: string,
  destinationAccountId: string,
): CardPaymentElementCreateParams {
  return {
    amount: amountCents,
    currency: currency.toLowerCase(),
    payment_method_types: [...CARD_PAYMENT_METHOD_TYPES],
    capture_method: "automatic",
    ...destinationChargeCreateParams(destinationAccountId, amountCents),
  };
}

export function paymentElementClientSecret(
  paymentIntent: { client_secret?: string | null } | null | undefined,
): string | null {
  const secret = paymentIntent?.client_secret;
  if (typeof secret !== "string") {
    return null;
  }
  const trimmed = secret.trim();
  return trimmed.length > 0 ? trimmed : null;
}
