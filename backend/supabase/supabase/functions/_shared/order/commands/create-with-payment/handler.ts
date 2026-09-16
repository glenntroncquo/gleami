import Stripe from "stripe";
import { orderRepository } from "../../repository.ts";
import { appointmentRepository } from "../../../appointment/repository.ts";
import { clientRepository } from "../../../client/repository.ts";
import { supabaseAdmin } from "../../../infrastructure/supabase/client.ts";
import { stripe } from "../../../infrastructure/stripe/client.ts";
import { resolveBookingLocation } from "../../../location/resolve.ts";
import { syncOrderItemsStockInFunction } from "../../../../sync-order-items-stock/logic.ts";
import { calculateTotals } from "./calculate-totals.ts";
import { resolveCreateOrderLocationId } from "./location.ts";
import type { CreateOrderWithPaymentInput } from "./schema.ts";
import type { AuthContext } from "../../../infrastructure/auth/context.ts";
import { requireLocationAccess } from "../../../infrastructure/auth/guard.ts";
import { companyPaymentAccountRepository } from "../../../company/payment-account/repository.ts";
import { stripeDestinationAccountId } from "../../../company/payment-account/destination-charge.ts";
import {
  cardPaymentElementCreateParams,
  paymentElementClientSecret,
} from "./card-payment-intent.ts";
import type { PaymentResultDto } from "./envelope.ts";

interface OrderItemDraft {
  appointment_id: string | null;
  appointment_segment_id: string | null;
  service_id: string | null;
  service_variant_id: string | null;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_amount: number;
}

export type { PaymentResultDto } from "./envelope.ts";

export type CreateOrderWithPaymentOutcome =
  | { outcome: "success"; orderId: string; payments: PaymentResultDto[] }
  | { outcome: "appointment_not_found" }
  | { outcome: "appointment_company_mismatch" }
  | { outcome: "client_not_found" }
  | { outcome: "invalid_card_amount" }
  | { outcome: "charges_not_enabled" }
  | { outcome: "missing_client_secret" }
  | { outcome: "stripe_error"; message: string; statusCode: number };

function mapPaymentState(paid: boolean): {
  status: string;
  payment_status: string;
  paid_at: string | null;
} {
  if (paid) {
    return { status: "succeeded", payment_status: "paid", paid_at: new Date().toISOString() };
  }
  return { status: "pending", payment_status: "unpaid", paid_at: null };
}

async function rollbackCreatedOrder(
  orderId: string,
  companyId: string,
  createdPaymentIntentIds: string[],
): Promise<void> {
  const productOrderItemIds = await orderRepository.findProductOrderItemIds(orderId);

  if (productOrderItemIds.length > 0) {
    const removeOperations = productOrderItemIds.map((id) => ({
      op: "remove" as const,
      order_item_id: id,
    }));

    try {
      await syncOrderItemsStockInFunction(supabaseAdmin, {
        company_id: companyId,
        order_id: orderId,
        operations: removeOperations,
        recalculate_order_totals: false,
      });
    } catch (syncError) {
      console.error("Failed to rollback product stock through sync_order_items_stock:", syncError);
    }
  }

  await orderRepository.deleteCascade(orderId);

  for (const paymentIntentId of createdPaymentIntentIds) {
    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      console.error(
        `Failed to cancel Stripe PaymentIntent during rollback: ${paymentIntentId}`,
        error,
      );
    }
  }
}

export async function createOrderWithPaymentHandler(
  input: CreateOrderWithPaymentInput,
  authContext: AuthContext,
): Promise<CreateOrderWithPaymentOutcome> {
  const {
    company_id,
    appointment_id,
    client_id: requestClientId,
    treatments,
    products,
    payments,
    date,
    notes,
    currency = "eur",
    location_id: requestLocationId,
  } = input;

  let client_id: string | null = null;
  let appointmentLocationId: string | undefined;

  if (appointment_id) {
    const appointment = await appointmentRepository.findById(appointment_id);

    if (!appointment) {
      return { outcome: "appointment_not_found" };
    }
    if (appointment.companyId !== company_id) {
      return { outcome: "appointment_company_mismatch" };
    }

    client_id = appointment.clientId;
    appointmentLocationId = appointment.locationId;
  } else if (requestClientId) {
    const isLinked = await clientRepository.isLinkedToCompany(requestClientId, company_id);

    if (!isLinked) {
      return { outcome: "client_not_found" };
    }

    client_id = requestClientId;
  }

  // Walk-in / product-only POS sends location_id and often omits appointment_id.
  // Omitted location_id resolves to the company's primary location.
  // Appointment.location_id is fallback only.
  const location = await resolveBookingLocation(
    company_id,
    resolveCreateOrderLocationId(requestLocationId, appointmentLocationId),
  );

  // Body location_id or appointment.location_id — check after resolve so a
  // location-A stylist cannot checkout a location-B visit via appointment_id.
  if (location.locationId) {
    requireLocationAccess(authContext, location.locationId);
  }

  let destinationAccountId: string | null = null;
  if (payments.some((payment) => payment.payment_type === "card")) {
    const paymentAccount = await companyPaymentAccountRepository.findByCompanyId(company_id);
    destinationAccountId = stripeDestinationAccountId(paymentAccount);
    if (!destinationAccountId) {
      return { outcome: "charges_not_enabled" };
    }
  }

  const allOrderItems: OrderItemDraft[] = [
    // HTTP field stays `treatments`. Persist only service_* catalog ids.
    ...treatments.map((treatment): OrderItemDraft => ({
      appointment_id: appointment_id || null,
      appointment_segment_id: treatment.appointment_segment_id ?? null,
      service_id: treatment.service_id ?? null,
      service_variant_id: treatment.service_variant_id ?? null,
      product_id: null,
      quantity: treatment.quantity,
      unit_price: treatment.unit_price,
      vat_rate: treatment.vat_rate || 0,
      discount_amount: Math.min(
        Math.max(treatment.discount_amount || 0, 0),
        treatment.quantity * treatment.unit_price,
      ),
    })),
    ...products.map((product): OrderItemDraft => ({
      appointment_id: null,
      appointment_segment_id: null,
      service_id: null,
      service_variant_id: null,
      product_id: product.product_id,
      quantity: product.quantity,
      unit_price: product.unit_price,
      vat_rate: product.vat_rate || 0,
      discount_amount: Math.min(
        Math.max(product.discount_amount || 0, 0),
        product.quantity * product.unit_price,
      ),
    })),
  ];

  const { subtotal, tax_amount, total_amount } = calculateTotals(allOrderItems);
  const orderDiscountAmount = Math.round(
    allOrderItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0) * 100,
  ) / 100;
  const order_number = await orderRepository.generateUniqueOrderNumber(company_id);
  const orderDate = date || new Date().toISOString();

  const order = await orderRepository.create({
    companyId: company_id,
    clientId: client_id,
    locationId: location.locationId,
    orderNumber: order_number,
    subtotal,
    taxAmount: tax_amount,
    discountAmount: orderDiscountAmount,
    totalAmount: total_amount,
    date: orderDate,
    notes: notes || null,
  });

  try {
    await orderRepository.createOrderItems(
      allOrderItems.map((item) => ({
        orderId: order.id,
        companyId: company_id,
        locationId: location.locationId,
        appointmentId: item.appointment_id,
        appointmentSegmentId: item.appointment_segment_id,
        serviceId: item.service_id,
        serviceVariantId: item.service_variant_id,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        vatRate: item.vat_rate,
        discountAmount: item.discount_amount,
        total: Math.round((item.quantity * item.unit_price - item.discount_amount) * 100) / 100,
      })),
    );
  } catch (error) {
    await rollbackCreatedOrder(order.id, company_id, []);
    throw error;
  }

  const createdPaymentIntentIds: string[] = [];
  const paymentResults: PaymentResultDto[] = [];

  for (const [index, paymentInput] of payments.entries()) {
    if (paymentInput.payment_type === "card" && paymentInput.amount <= 0) {
      await rollbackCreatedOrder(order.id, company_id, createdPaymentIntentIds);
      return { outcome: "invalid_card_amount" };
    }

    let paymentIntentId: string | null = null;
    let clientSecret: string | null = null;

    if (paymentInput.payment_type === "card") {
      if (!destinationAccountId) {
        await rollbackCreatedOrder(order.id, company_id, createdPaymentIntentIds);
        return { outcome: "charges_not_enabled" };
      }

      try {
        const amountCents = Math.round(paymentInput.amount * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          ...cardPaymentElementCreateParams(amountCents, currency, destinationAccountId),
          metadata: {
            order_id: order.id,
            company_id,
            order_number,
            payment_index: `${index}`,
            provider_account_id: destinationAccountId,
            ...(client_id && { client_id }),
          },
        });

        paymentIntentId = paymentIntent.id;
        clientSecret = paymentElementClientSecret(paymentIntent);
        if (!paymentIntentId || !clientSecret) {
          if (paymentIntentId) {
            createdPaymentIntentIds.push(paymentIntentId);
          }
          await rollbackCreatedOrder(order.id, company_id, createdPaymentIntentIds);
          return { outcome: "missing_client_secret" };
        }
        createdPaymentIntentIds.push(paymentIntentId);
      } catch (stripeError: any) {
        await rollbackCreatedOrder(order.id, company_id, createdPaymentIntentIds);

        if (stripeError instanceof Stripe.errors.StripeError) {
          return {
            outcome: "stripe_error",
            message: stripeError.message,
            statusCode: stripeError.statusCode || 400,
          };
        }

        return {
          outcome: "stripe_error",
          message: stripeError.message || "Unknown error",
          statusCode: 500,
        };
      }
    }

    const mappedState = mapPaymentState(paymentInput.paid);

    let payment;
    try {
      payment = await orderRepository.createPayment({
        orderId: order.id,
        companyId: company_id,
        locationId: location.locationId,
        paymentMethod: paymentInput.payment_type,
        paymentProvider: paymentInput.payment_type === "card" ? "stripe" : paymentInput.payment_type,
        amount: paymentInput.amount,
        amountGross: paymentInput.amount,
        status: mappedState.status,
        paymentStatus: mappedState.payment_status,
        paidAt: mappedState.paid_at,
        providerPaymentIntentId: paymentIntentId,
      });
    } catch (error) {
      await rollbackCreatedOrder(order.id, company_id, createdPaymentIntentIds);
      throw error;
    }

    paymentResults.push({
      id: payment.id,
      payment_type: paymentInput.payment_type,
      amount: Number(payment.amount ?? paymentInput.amount),
      status: mappedState.status,
      payment_status: mappedState.payment_status,
      paid: paymentInput.paid,
      payment_intent_id: paymentIntentId,
      client_secret: clientSecret,
    });
  }

  return {
    outcome: "success",
    orderId: order.id,
    payments: paymentResults,
  };
}
