import type { PaymentType } from "./mutations/order-create-payload";
import type { CreateOrderV3PaymentResult } from "./mutations/order-create-response";

export type CardSaleFollowup =
  | { kind: "terminal"; intentIds: string[] }
  | { kind: "done" };

export function collectCardIntentIds(
  payments: CreateOrderV3PaymentResult[] | undefined,
): string[] {
  if (!payments) return [];
  return payments
    .filter(
      (payment) =>
        payment.payment_type === ("card" satisfies PaymentType) &&
        !!payment.payment_intent_id,
    )
    .map((payment) => payment.payment_intent_id!)
    .filter(Boolean);
}

/**
 * Credit/Debit Card is the terminal / reader path. Payment Element is gone.
 */
export function resolveCardSaleFollowup(input: {
  requestedTerminal: boolean;
  data:
    | {
        payments?: CreateOrderV3PaymentResult[];
      }
    | null
    | undefined;
}): CardSaleFollowup {
  if (!input.requestedTerminal) {
    return { kind: "done" };
  }
  const intentIds = collectCardIntentIds(input.data?.payments);
  if (intentIds.length > 0) {
    return { kind: "terminal", intentIds };
  }
  return { kind: "done" };
}
