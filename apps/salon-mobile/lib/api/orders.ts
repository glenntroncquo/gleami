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

export type AppointmentPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'unknown';

/** Read the actual orders linked to a visit, rather than its booking status. */
export async function fetchAppointmentPaymentStatuses(companyId: string, appointmentIds: string[]): Promise<Record<string, AppointmentPaymentStatus>> {
  if (!appointmentIds.length) return {};
  const { data, error } = await supabase
    .from('order_item')
    .select('appointment_id, order:order_id ( id, payment_status )')
    .eq('company_id', companyId)
    .in('appointment_id', appointmentIds);
  if (error) throw error;

  const byAppointment = new Map<string, Map<string, string | null>>();
  for (const item of data ?? []) {
    if (!item.appointment_id) continue;
    const orders = byAppointment.get(item.appointment_id) ?? new Map<string, string | null>();
    orders.set(item.order?.id ?? 'unknown', item.order?.payment_status ?? null);
    byAppointment.set(item.appointment_id, orders);
  }
  return Object.fromEntries(appointmentIds.map((id) => {
    const statuses = [...(byAppointment.get(id)?.values() ?? [])];
    let status: AppointmentPaymentStatus = 'unknown';
    if (statuses.length && statuses.every((value) => value === 'paid')) status = 'paid';
    else if (statuses.some((value) => value === 'partially_paid' || value === 'partial') ||
      (statuses.includes('paid') && statuses.includes('unpaid'))) status = 'partial';
    else if (statuses.length && statuses.every((value) => value === 'unpaid')) status = 'unpaid';
    return [id, status];
  }));
}
