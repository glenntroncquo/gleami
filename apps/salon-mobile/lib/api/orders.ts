import { appointmentPaymentStatuses, type PaymentHistoryItem } from '@/lib/appointment-payment-state';
import { supabase } from '@/lib/supabase';

/** Live `order.location_id` predates the generated snapshot in this repo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = supabase as any;

export type OrderListItem = {
  id: string;
  order_number: string | null;
  date: string | null;
  created_at: string;
  total_amount: number | null;
  payment_status: string | null;
  status: string | null;
  client: { id: string; first_name: string | null; last_name: string | null } | null;
};

export async function fetchOrders(companyId: string, locationId?: string | null, limit = 50): Promise<OrderListItem[]> {
  let query = live
    .from('order')
    .select('id, order_number, date, created_at, total_amount, payment_status, status, client:client_id ( id, first_name, last_name )')
    .eq('company_id', companyId);
  if (locationId) query = query.eq('location_id', locationId);
  query = query.order('date', { ascending: false }).order('created_at', { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) throw error;
  return (data as unknown as OrderListItem[]) ?? [];
}

export type OrderDetail = OrderListItem & {
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  notes: string | null;
  order_item: Array<{
    id: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
    appointment_segment: {
      service: { name: string } | null;
      service_variant: { name: string } | null;
    } | null;
    product: { name: string } | null;
  }>;
  payment: Array<{
    id: string;
    payment_method: string | null;
    amount_gross: number | null;
    status: string | null;
    payment_status: string | null;
    paid_at: string | null;
  }>;
};

const ORDER_DETAIL_SELECT = `
  id, order_number, date, created_at, total_amount, subtotal, tax_amount, discount_amount, payment_status, status, notes,
  client:client_id ( id, first_name, last_name ),
  order_item (
    id, quantity, unit_price, total,
    appointment_segment:appointment_segment_id (
      service:service_id ( name ),
      service_variant:service_variant_id ( name )
    ),
    product:product_id ( name )
  ),
  payment ( id, payment_method, amount_gross, status, payment_status, paid_at )
`;

export async function fetchOrder(orderId: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase.from('order').select(ORDER_DETAIL_SELECT).eq('id', orderId).maybeSingle();
  if (error) throw error;
  return data as unknown as OrderDetail | null;
}

export { normalizePaymentStatus } from '@/lib/appointment-payment-state';
export type { AppointmentPaymentInfo, AppointmentPaymentStatus } from '@/lib/appointment-payment-state';

const ORDER_LINK_SELECT = 'appointment_id, appointment_segment_id, order:order_id ( id, payment_status, amount_paid, total_amount, created_at )';

/** Linked orders, with payment rows attached when that read succeeds. */
export async function fetchAppointmentPaymentItems(companyId: string, appointmentIds: string[]): Promise<PaymentHistoryItem[]> {
  if (!appointmentIds.length) return [];
  const { data, error } = await supabase
    .from('order_item')
    .select(ORDER_LINK_SELECT)
    .eq('company_id', companyId)
    .in('appointment_id', appointmentIds);
  if (error) throw error;
  const items = (data ?? []) as PaymentHistoryItem[];
  const orderIds = [...new Set(items.flatMap(item => {
    if (!item.order) return [];
    return (Array.isArray(item.order) ? item.order : [item.order]).map(order => order.id);
  }))];
  if (!orderIds.length) return items;
  const { data: payments, error: paymentError } = await supabase
    .from('payment')
    .select('order_id, status, payment_status, amount_gross')
    .eq('company_id', companyId)
    .in('order_id', orderIds);
  if (paymentError || !payments) return items;
  const byOrder = new Map<string, Array<{ status: string | null; payment_status: string | null; amount: number | null; amount_gross: number | null }>>();
  payments.forEach(payment => {
    if (!payment.order_id) return;
    const row = { status: payment.status, payment_status: payment.payment_status, amount: payment.amount_gross, amount_gross: payment.amount_gross };
    byOrder.set(payment.order_id, [...(byOrder.get(payment.order_id) ?? []), row]);
  });
  return items.map(item => {
    if (!item.order) return item;
    const orders = (Array.isArray(item.order) ? item.order : [item.order]).map(order => ({ ...order, payment: byOrder.get(order.id) ?? order.payment ?? [] }));
    return { ...item, order: Array.isArray(item.order) ? orders : orders[0] };
  });
}

/** Read linked service orders. A failed payment read still keeps the order status. */
export async function fetchAppointmentPaymentStatuses(companyId: string, appointmentIds: string[]) {
  return appointmentPaymentStatuses(appointmentIds, await fetchAppointmentPaymentItems(companyId, appointmentIds));
}
