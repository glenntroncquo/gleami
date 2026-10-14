import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type CheckoutLineItem = {
  appointmentSegmentId: string;
  serviceId: string;
  serviceVariantId: string;
  name: string;
  price: number;
  vatRate: number;
  quantity?: number;
  discountType?: 'percentage' | 'fixed';
  discountPercentage?: number;
  discountAmount?: number;
};

export type CheckoutPaymentType = 'cash' | 'card' | 'invoice' | 'bank_transfer';

export type CheckoutProductLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  vatRate: number;
  stockQty?: number | null;
  discountType?: 'percentage' | 'fixed';
  discountPercentage?: number;
  discountAmount?: number;
};

export type CreateOrderPayload = {
  companyId: string;
  locationId?: string;
  appointmentId: string;
  clientId?: string;
  lineItems: CheckoutLineItem[];
  productLines?: CheckoutProductLine[];
  paymentType: CheckoutPaymentType;
  amount: number;
};

export type CreatedCheckout = { order_number?: string; amountPaid: number };

/** Matches the web POS: discounts are sent as a gross amount for each line. */
export function checkoutItemDiscountAmount(item: {
  price: number;
  quantity: number;
  discountType?: 'percentage' | 'fixed';
  discountPercentage?: number;
  discountAmount?: number;
}): number {
  const lineBase = Math.max(0, item.price) * Math.max(0, item.quantity);
  if (lineBase <= 0) return 0;
  const discount =
    item.discountType === 'percentage'
      ? lineBase * ((item.discountPercentage ?? 0) / 100)
      : item.discountType === 'fixed'
        ? item.discountAmount ?? 0
        : 0;
  return Math.round(Math.min(Math.max(discount, 0), lineBase) * 100) / 100;
}

function settledPaymentAmount(payment: { status?: string; payment_status?: string; amount?: number; amount_gross?: number }): number {
  const status = String(payment.status ?? '').toLowerCase();
  const paymentStatus = String(payment.payment_status ?? '').toLowerCase();
  const succeeded = status === 'succeeded' || status === 'success' || status === 'completed';
  const paid = paymentStatus === 'paid' || paymentStatus === 'completed' || paymentStatus === 'succeeded' || paymentStatus === 'partially_paid';
  if (!succeeded || !paid) return 0;
  return Number(payment.amount ?? payment.amount_gross ?? 0);
}

function responsePayments(data: unknown): Array<{ status?: string; payment_status?: string; amount?: number; amount_gross?: number }> {
  if (!data || typeof data !== 'object') return [];
  const body = data as { payments?: unknown; data?: { payments?: unknown } };
  const payments = body.data?.payments ?? body.payments;
  return Array.isArray(payments) ? payments : [];
}

export async function createOrderWithPayment(payload: CreateOrderPayload): Promise<CreatedCheckout> {
  const { data, error } = await supabase.functions.invoke('order-create', {
    body: {
      company_id: payload.companyId,
      ...(payload.locationId ? { location_id: payload.locationId, locationId: payload.locationId } : {}),
      appointment_id: payload.appointmentId,
      client_id: payload.clientId,
      treatments: payload.lineItems.map((item) => ({
        appointment_segment_id: item.appointmentSegmentId,
        service_id: item.serviceId,
        service_variant_id: item.serviceVariantId,
        quantity: item.quantity ?? 1,
        unit_price: item.price,
        vat_rate: item.vatRate,
        discount_amount: checkoutItemDiscountAmount({
          price: item.price,
          quantity: item.quantity ?? 1,
          discountType: item.discountType,
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
        }),
      })),
      products: (payload.productLines ?? []).map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        vat_rate: item.vatRate,
        discount_amount: checkoutItemDiscountAmount(item),
      })),
      payments: [{ payment_type: payload.paymentType, amount: payload.amount, paid: true }],
      date: new Date().toISOString(),
      currency: 'eur',
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let detail = error.message;
      try {
        const body = await error.context.json();
        if (typeof body?.error === 'string') detail = body.error;
      } catch {
        // Body wasn't JSON — fall back to the generic message.
      }
      throw new Error(detail);
    }
    throw error;
  }

  const orderNumber =
    data?.order_number ??
    data?.data?.order_number ??
    data?.data?.order_id ??
    data?.order_id;
  const amountPaid = responsePayments(data).reduce((sum, payment) => sum + settledPaymentAmount(payment), 0);
  return { order_number: orderNumber, amountPaid: Math.round(amountPaid * 100) / 100 };
}
