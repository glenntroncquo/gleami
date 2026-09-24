export type AppointmentPaymentStatus = 'paid' | 'partial' | 'unpaid';
export type AppointmentPaymentInfo = { status: AppointmentPaymentStatus; amountPaid: number | null; totalAmount: number | null };
export function normalizePaymentStatus(status: string | null | undefined): AppointmentPaymentStatus {
  if (status === 'paid' || status === 'completed') return 'paid';
  if (status === 'partial' || status === 'partially_paid') return 'partial';
  return 'unpaid';
}
type LinkedPayment = { status: string | null; payment_status: string | null; amount: number | null; amount_gross?: number | null };
export type LinkedOrder = {
  id: string;
  payment_status: string | null;
  amount_paid: number | null;
  total_amount: number | null;
  created_at: string;
  payment?: LinkedPayment[] | LinkedPayment | null;
};
export type PaymentHistoryItem = { appointment_id: string | null; appointment_segment_id: string | null; order: LinkedOrder | LinkedOrder[] | null };

const cents = (value: number | null | undefined) => Math.round(Number(value ?? 0) * 100) / 100;

function collectedAmount(payment: LinkedPayment): number {
  const status = String(payment.status ?? '').toLowerCase();
  const paymentStatus = String(payment.payment_status ?? '').toLowerCase();
  const succeeded = status === 'succeeded' || status === 'success' || status === 'completed';
  const paid = paymentStatus === 'paid' || paymentStatus === 'completed' || paymentStatus === 'succeeded';
  if (!succeeded || !paid) return 0;
  return cents(payment.amount ?? payment.amount_gross);
}

function orderPayments(order: LinkedOrder): LinkedPayment[] {
  if (!order.payment) return [];
  return Array.isArray(order.payment) ? order.payment : [order.payment];
}

export function ordersForAppointment(items: PaymentHistoryItem[], appointmentId: string): LinkedOrder[] {
  return [...new Map(items.filter(item => item.appointment_id === appointmentId).flatMap(item => {
    if (!item.order) return [];
    return Array.isArray(item.order) ? item.order : [item.order];
  }).map(order => [order.id, order])).values()];
}

/** Money already taken on one order. Payment rows win over a stale amount_paid. */
export function orderCollected(order: LinkedOrder): number {
  const payments = orderPayments(order);
  const fromPayments = cents(payments.reduce((sum, payment) => sum + collectedAmount(payment), 0));
  const recorded = cents(order.amount_paid);
  if (payments.length > 0) return Math.max(fromPayments, recorded);
  if (normalizePaymentStatus(order.payment_status) === 'paid') return Math.max(recorded, cents(order.total_amount));
  return recorded;
}

export type CheckoutBalance = { bill: number; collected: number; remainder: number };

/** Cart total minus every collected payment for the visit. Repeated checkouts are one bill. */
export function checkoutBalance(cartTotal: number, orders: LinkedOrder[]): CheckoutBalance {
  const bill = cents(cartTotal);
  const collected = cents(orders.reduce((sum, order) => sum + orderCollected(order), 0));
  return { bill, collected, remainder: Math.max(0, cents(bill - collected)) };
}

function visitSettlement(orders: LinkedOrder[]): AppointmentPaymentInfo {
  if (!orders.length) return { status: 'unpaid', amountPaid: null, totalAmount: null };
  const collected = cents(orders.reduce((sum, order) => sum + orderCollected(order), 0));
  const bill = cents(Math.max(...orders.map(order => Number(order.total_amount ?? 0))));
  const status: AppointmentPaymentStatus = bill > 0 && collected + 0.001 >= bill ? 'paid' : collected > 0 ? 'partial' : 'unpaid';
  return { status, amountPaid: status === 'paid' ? bill : collected, totalAmount: bill };
}

/** Payments across every order for the visit, so an earlier partial does not leave a covered visit unpaid. */
export function appointmentPaymentStatuses(ids: string[], items: PaymentHistoryItem[]): Record<string, AppointmentPaymentInfo> {
  return Object.fromEntries(ids.map(id => [id, visitSettlement(ordersForAppointment(items, id))]));
}

const cache = new Map<string, AppointmentPaymentInfo>();
const versions = new Map<string, number>();
const listeners = new Set<() => void>();
let revision = 0;
const keyFor = (companyId: string, id: string) => `${companyId}:${id}`;
export const paymentRevision = () => revision;
export function subscribePayments(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function cachedPayment(companyId: string, id: string) { return cache.get(keyFor(companyId, id)); }
const strength: Record<AppointmentPaymentStatus, number> = { unpaid: 0, partial: 1, paid: 2 };

export function publishPayments(companyId: string, statuses: Record<string, AppointmentPaymentInfo>, requestRevision = Infinity) {
  let changed = false;
  for (const [id, status] of Object.entries(statuses)) {
    const key = keyFor(companyId, id);
    const current = cache.get(key);
    if ((versions.get(key) ?? 0) > requestRevision) continue;
    if (current && requestRevision !== Infinity && strength[current.status] > strength[status.status]) continue;
    cache.set(key, status); versions.set(key, ++revision); changed = true;
  }
  if (changed) listeners.forEach(listener => listener());
}
