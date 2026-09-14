import type Stripe from "stripe";
import { orderRepository } from "../../repository.ts";
import { cardDetailsFromCharge } from "./card-details.ts";

export type PaymentWebhookOutcome =
  | { outcome: "updated"; paymentId: string; orderId: string | null; status: string }
  | { outcome: "payment_not_found" }
  | { outcome: "unhandled_event_type"; eventType: string };

export async function handlePaymentWebhookEvent(event: Stripe.Event): Promise<PaymentWebhookOutcome> {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const payment = await orderRepository.findPaymentByProviderIntentId(paymentIntent.id);
      if (!payment) {
        return { outcome: "payment_not_found" };
      }

      const charges = (paymentIntent as unknown as { charges?: { data: Stripe.Charge[] } }).charges?.data ?? [];
      const charge = charges.length > 0 ? charges[0] : null;
      const paidAt = charge?.created
        ? new Date(charge.created * 1000).toISOString()
        : new Date().toISOString();
      const cardDetails = cardDetailsFromCharge(charge);
      const amount = paymentIntent.amount / 100;

      await orderRepository.markPaymentSucceeded(payment.id, {
        amount,
        amountGross: amount,
        providerChargeId: charge?.id ?? null,
        lastFourDigits: cardDetails.lastFourDigits,
        cardType: cardDetails.cardType,
        cardBrand: cardDetails.cardBrand,
        paidAt,
      });

      return { outcome: "updated", paymentId: payment.id, orderId: payment.orderId, status: "succeeded" };
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const payment = await orderRepository.findPaymentByProviderIntentId(paymentIntent.id);
      if (!payment) {
        return { outcome: "payment_not_found" };
      }

      await orderRepository.markPaymentFailed(payment.id);
      return { outcome: "updated", paymentId: payment.id, orderId: payment.orderId, status: "failed" };
    }

    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const payment = await orderRepository.findPaymentByProviderIntentId(paymentIntent.id);
      if (!payment) {
        return { outcome: "payment_not_found" };
      }

      await orderRepository.markPaymentCanceled(payment.id);
      return { outcome: "updated", paymentId: payment.id, orderId: payment.orderId, status: "canceled" };
    }

    default:
      return { outcome: "unhandled_event_type", eventType: event.type };
  }
}
