import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import { supabase } from '@/lib/supabase';

/** Live `client_location` / `location` tables predate the generated snapshot in this repo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = supabase as any;

export type MonthBucket = {
  key: string;
  year: number;
  monthIndex: number;
};

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function createdAtFromLocationRow(row: unknown): { id: string; created_at: string } | null {
  if (!row || typeof row !== 'object') return null;
  const raw = (row as { client?: { id?: string; created_at?: string } | { id?: string; created_at?: string }[] | null }).client;
  const client = Array.isArray(raw) ? raw[0] : raw;
  if (!client?.id || !client.created_at) return null;
  return { id: client.id, created_at: client.created_at };
}

/** Builds `count` consecutive month buckets ending at the current month, oldest first. */
function buildMonthSkeleton(count: number): MonthBucket[] {
  const now = new Date();
  const months: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d.getFullYear(), d.getMonth()), year: d.getFullYear(), monthIndex: d.getMonth() });
  }
  return months;
}

export type MonthlyRevenue = MonthBucket & { revenue: number; revenueExclVat: number };

export type RevenueData = {
  monthlyData: MonthlyRevenue[];
  totalRevenue: number;
  totalRevenueExclVat: number;
};

/**
 * Live `order` has `company_id` + `location_id` (generated snapshot is stale).
 * Sum `total_amount` (gross) and `subtotal` (net) per month. No payment-status
 * filter — every order in range counts.
 */
export async function fetchRevenue(companyId: string, locationId?: string | null): Promise<RevenueData> {
  const months = buildMonthSkeleton(12);
  const rangeStart = new Date(months[0].year, months[0].monthIndex, 1);
  const rangeEndExclusive = new Date(months[months.length - 1].year, months[months.length - 1].monthIndex + 1, 1);

  let query = live
    .from('order')
    .select('id, created_at, total_amount, subtotal')
    .eq('company_id', companyId)
    .gte('created_at', rangeStart.toISOString())
    .lt('created_at', rangeEndExclusive.toISOString());
  if (locationId) query = query.eq('location_id', locationId);

  const { data: orders, error: orderError } = await query;
  if (orderError) throw orderError;

  const byKey = new Map<string, { revenue: number; revenueExclVat: number }>();
  (orders ?? []).forEach((order: { created_at: string; total_amount: number | null; subtotal: number | null }) => {
    const d = new Date(order.created_at);
    const key = monthKey(d.getFullYear(), d.getMonth());
    const entry = byKey.get(key) ?? { revenue: 0, revenueExclVat: 0 };
    entry.revenue += order.total_amount ?? 0;
    entry.revenueExclVat += order.subtotal ?? 0;
    byKey.set(key, entry);
  });

  const monthlyData = months.map((month) => ({
    ...month,
    revenue: byKey.get(month.key)?.revenue ?? 0,
    revenueExclVat: byKey.get(month.key)?.revenueExclVat ?? 0,
  }));

  return {
    monthlyData,
    totalRevenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
    totalRevenueExclVat: monthlyData.reduce((sum, m) => sum + m.revenueExclVat, 0),
  };
}

export type MonthlyCount = MonthBucket & { count: number };

export type MonthlyCountData = {
  monthlyData: MonthlyCount[];
  total: number;
};

/**
 * Counts non-canceled appointments per month on `appointment.location_id`
 * (not `appointment_segment.location_id` — same as platform client #31).
 * A service-filter dropdown exists on web; Expo default view is unfiltered.
 */
export async function fetchMonthlyAppointments(companyId: string, locationId?: string | null): Promise<MonthlyCountData> {
  const months = buildMonthSkeleton(24);
  const rangeStart = new Date(months[0].year, months[0].monthIndex, 1);
  const rangeEndExclusive = new Date(months[months.length - 1].year, months[months.length - 1].monthIndex + 1, 1);

  if (!locationId) {
    return { monthlyData: months.map((month) => ({ ...month, count: 0 })), total: 0 };
  }

  const { data, error } = await supabase
    .from('appointment')
    .select('start, status, is_canceled')
    .eq('company_id', companyId)
    .eq('location_id', locationId)
    .gte('start', rangeStart.toISOString())
    .lt('start', rangeEndExclusive.toISOString());
  if (error) throw error;

  const byKey = new Map<string, number>();
  (data ?? []).forEach((row) => {
    if (isAppointmentCanceled(row)) return;
    const d = new Date(row.start);
    const key = monthKey(d.getFullYear(), d.getMonth());
    byKey.set(key, (byKey.get(key) ?? 0) + 1);
  });

  const monthlyData = months.map((month) => ({ ...month, count: byKey.get(month.key) ?? 0 }));
  const last12 = monthlyData.slice(-12);
  return { monthlyData, total: last12.reduce((sum, m) => sum + m.count, 0) };
}

/** New clients (by `client.created_at`) per month, linked via `client_location` ⋈ `location.company_id`. */
export async function fetchMonthlyClients(companyId: string, locationId?: string | null): Promise<MonthlyCountData> {
  const months = buildMonthSkeleton(24);
  const rangeStart = new Date(months[0].year, months[0].monthIndex, 1);
  const rangeEndExclusive = new Date(months[months.length - 1].year, months[months.length - 1].monthIndex + 1, 1);

  const query = locationId
    ? live.from('client_location').select('client:client_id ( id, created_at )').eq('location_id', locationId)
    : live
        .from('client_location')
        .select('client:client_id ( id, created_at ), location:location_id!inner ( company_id )')
        .eq('location.company_id', companyId);

  const { data, error } = await query;
  if (error) throw error;

  const seen = new Set<string>();
  const byKey = new Map<string, number>();
  for (const row of Array.isArray(data) ? data : []) {
    const client = createdAtFromLocationRow(row);
    if (!client || seen.has(client.id)) continue;
    seen.add(client.id);
    const d = new Date(client.created_at);
    if (d < rangeStart || d >= rangeEndExclusive) continue;
    const key = monthKey(d.getFullYear(), d.getMonth());
    byKey.set(key, (byKey.get(key) ?? 0) + 1);
  }

  const monthlyData = months.map((month) => ({ ...month, count: byKey.get(month.key) ?? 0 }));
  const last12 = monthlyData.slice(-12);
  return { monthlyData, total: last12.reduce((sum, m) => sum + m.count, 0) };
}
