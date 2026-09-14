import type {
  CreateOrderV3PaymentInput,
  PaymentType,
} from "@/lib/api/pos/mutations/order-create-payload";

export type PaymentMethod =
  | "cash"
  | "card"
  | "invoice"
  | "bank_transfer"
  | "terminal"
  | "pay_link";

export type SplitPayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

export function paymentMethodMessageKey(method: string): string {
  if (method === "bank_transfer") return "bankTransfer";
  if (method === "pay_link") return "payLink";
  return method;
}

/** Card, terminal, and Betaallink all need Connect charges_enabled. */
export function isStripeChargeMethod(method: PaymentMethod): boolean {
  return method === "card" || method === "terminal" || method === "pay_link";
}

export function isTerminalMethod(method: PaymentMethod): boolean {
  return method === "card" || method === "terminal";
}

export function isPayLinkMethod(method: PaymentMethod): boolean {
  return method === "pay_link";
}

export function toOrderPaymentType(method: PaymentMethod): PaymentType {
  if (method === "terminal") return "card";
  return method;
}

export function splitHasCardAmount(
  payments: SplitPayment[] | undefined,
): boolean {
  return !!payments?.some(
    (payment) => isStripeChargeMethod(payment.method) && payment.amount > 0,
  );
}

export function splitHasTerminalAmount(
  payments: SplitPayment[] | undefined,
): boolean {
  return !!payments?.some(
    (payment) => isTerminalMethod(payment.method) && payment.amount > 0,
  );
}

export function splitHasPayLinkAmount(
  payments: SplitPayment[] | undefined,
): boolean {
  return !!payments?.some(
    (payment) => isPayLinkMethod(payment.method) && payment.amount > 0,
  );
}

export function splitPayLinkAmount(payments: SplitPayment[] | undefined): number {
  if (!payments) return 0;
  return (
    Math.round(
      payments
        .filter((payment) => isPayLinkMethod(payment.method) && payment.amount > 0)
        .reduce((sum, payment) => sum + payment.amount, 0) * 100,
    ) / 100
  );
}

export function buildOrderCreatePayments(
  payments: SplitPayment[],
): CreateOrderV3PaymentInput[] {
  return payments
    .filter((payment) => payment.amount > 0)
    .map((payment) => ({
      payment_type: toOrderPaymentType(payment.method),
      amount: Math.round(payment.amount * 100) / 100,
      // Betaallink stays unpaid until the Checkout webhook marks it paid.
      paid: !isPayLinkMethod(payment.method),
    }));
}
