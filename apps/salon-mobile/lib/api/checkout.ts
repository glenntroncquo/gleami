import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type CheckoutAppointment = {
  id: string;
  client_id: string | null;
  client: { id: string; first_name: string | null; last_name: string | null } | null;
  appointment_segment: Array<{
    id: string;
    sequence: number;
    price: number | null;
    service_id: string;
    service_variant_id: string;
    service: { id: string; name: string } | null;
    service_variant: { id: string; name: string; price: number; vat_rate: number | null } | null;
  }>;
};

export type CheckoutLineItem = {
  appointmentSegmentId: string;
  serviceId: string;
  serviceVariantId: string;
  name: string;
  price: number;
  vatRate: number;
};

const CHECKOUT_APPOINTMENT_SELECT = `
  id,
  client_id,
  client:client_id ( id, first_name, last_name ),
  appointment_segment (
    id, sequence, price, service_id, service_variant_id,
    service:service_id ( id, name ),
    service_variant:service_variant_id ( id, name, price, vat_rate )
  )
`;

export async function fetchAppointmentForCheckout(appointmentId: string): Promise<CheckoutAppointment | null> {
  const { data, error } = await supabase
    .from('appointment')
    .select(CHECKOUT_APPOINTMENT_SELECT)
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as CheckoutAppointment | null;
}

export function checkoutLineItems(appointment: CheckoutAppointment): CheckoutLineItem[] {
  return [...(appointment.appointment_segment ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .filter((segment) => segment.service && segment.service_variant)
    .map((segment) => ({
      appointmentSegmentId: segment.id,
      serviceId: segment.service_id,
      serviceVariantId: segment.service_variant_id,
      name: `${segment.service!.name} - ${segment.service_variant!.name}`,
      price: Math.round(Number(segment.price ?? segment.service_variant!.price ?? 0) * 100) / 100,
      vatRate: segment.service_variant!.vat_rate ?? 0,
    }));
}

export type CheckoutPaymentType = 'cash' | 'card' | 'invoice' | 'bank_transfer';

export type CreateOrderPayload = {
  companyId: string;
  locationId?: string;
  appointmentId: string;
  clientId?: string;
  lineItems: CheckoutLineItem[];
  paymentType: CheckoutPaymentType;
  amount: number;
};

export async function createOrderWithPayment(payload: CreateOrderPayload): Promise<{ order_number?: string }> {
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
        quantity: 1,
        unit_price: item.price,
        vat_rate: item.vatRate,
        discount_amount: 0,
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
  return { order_number: orderNumber };
}
