import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import {
  asLocationClient,
  fetchClientIdsForCompany,
  fetchClientIdsForLocation,
  fetchServiceIdsForLocation,
  withLocationId,
} from "@/lib/location";

export type MonthlyCount = {
  month: string;
  count: number;
};

export type MonthlyCountData = {
  monthlyData: MonthlyCount[];
  total: number;
};

export type DashboardServiceOption = {
  id: string;
  name: string;
};

type TableRow = {
  created_at?: string | null;
  start?: string | null;
};

const buildMonthlySkeleton = (startMonth: Date, monthCount: number): MonthlyCount[] => {
  return Array.from({ length: monthCount }).map((_, i) => ({
    month: format(startOfMonth(addMonths(startMonth, i)), "MMM yyyy"),
    count: 0,
  }));
};

export async function fetchMonthlyClients(
  companyId: string,
  locationId?: string | null,
): Promise<{ data: MonthlyCountData | null; error: PostgrestError | null }> {
  const supabase = createClient();
  const now = new Date();
  const rangeStart = startOfMonth(addMonths(now, -23));
  const rangeEnd = endOfMonth(now);

  try {
    const locClient = asLocationClient(supabase);
    const scoped = locationId
      ? await fetchClientIdsForLocation(locClient, locationId)
      : await fetchClientIdsForCompany(locClient, companyId);

    if (scoped.error && scoped.tablePresent) {
      return { data: null, error: scoped.error as PostgrestError };
    }

    if (!scoped.tablePresent || scoped.data.length === 0) {
      return {
        data: { monthlyData: buildMonthlySkeleton(rangeStart, 24), total: 0 },
        error: null,
      };
    }

    const { data, error } = await supabase
      .from("client")
      .select("created_at")
      .in("id", scoped.data)
      .gte("created_at", rangeStart.toISOString())
      .lte("created_at", rangeEnd.toISOString());
    if (error) return { data: null, error };

    const rows: TableRow[] = (data || []).map((row) => ({
      created_at: row.created_at,
    }));
    const monthlyData = buildMonthlySkeleton(rangeStart, 24);
    const monthMap = new Map(monthlyData.map((item) => [item.month, item]));
    for (const row of rows) {
      if (!row.created_at) continue;
      const monthKey = format(startOfMonth(new Date(row.created_at)), "MMM yyyy");
      const slot = monthMap.get(monthKey);
      if (!slot) continue;
      slot.count += 1;
    }
    const total = monthlyData.reduce((sum, month) => sum + month.count, 0);

    return {
      data: { monthlyData, total },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching monthly clients:", error);
    return { data: null, error: error as PostgrestError };
  }
}

export async function fetchMonthlyAppointments(
  companyId: string,
  serviceIds?: string[],
  locationId?: string | null,
): Promise<{ data: MonthlyCountData | null; error: PostgrestError | null }> {
  const supabase = createClient();
  const now = new Date();
  const rangeStart = startOfMonth(addMonths(now, -23));
  const rangeEnd = endOfMonth(now);

  try {
    let rows: TableRow[] = [];
    let error: PostgrestError | null = null;

    if (serviceIds && serviceIds.length > 0) {
      // Scope via the visit row. appointment_segment has no location_id;
      // withLocationId on that table 400s or silently misses the shop.
      let treatmentQuery = supabase
        .from("appointment_segment")
        .select(
          "appointment_id, appointment:appointment_id(start, is_canceled, company_id)",
        )
        .eq("company_id", companyId)
        .in("service_id", serviceIds)
        .gte("appointment.start", rangeStart.toISOString())
        .lte("appointment.start", rangeEnd.toISOString());
      if (locationId) {
        treatmentQuery = treatmentQuery.eq("appointment.location_id", locationId);
      }

      const { data: treatmentRows, error: treatmentError } = await treatmentQuery;

      error = treatmentError;

      if (!treatmentError) {
        const uniqueAppointments = new Map<string, string>();
        for (const row of (treatmentRows || []) as Array<{
          appointment_id: string | null;
          appointment:
            | { start: string | null; is_canceled: boolean | null; company_id: string | null }
            | null;
        }>) {
          if (!row.appointment_id || !row.appointment?.start) continue;
          if (row.appointment.is_canceled) continue;
          if (row.appointment.company_id !== companyId) continue;
          if (!uniqueAppointments.has(row.appointment_id)) {
            uniqueAppointments.set(row.appointment_id, row.appointment.start);
          }
        }
        rows = Array.from(uniqueAppointments.values()).map((start) => ({ start }));
      }
    } else {
      const { data, error: appointmentsError } = await withLocationId(
        supabase
          .from("appointment")
          .select("start")
          .eq("company_id", companyId)
          .eq("is_canceled", false)
          .gte("start", rangeStart.toISOString())
          .lte("start", rangeEnd.toISOString()),
        locationId,
      );

      error = appointmentsError;
      rows = (data || []) as TableRow[];
    }

    if (error) {
      return { data: null, error };
    }

    const monthlyData = buildMonthlySkeleton(rangeStart, 24);
    const monthMap = new Map(monthlyData.map((item) => [item.month, item]));
    for (const row of rows) {
      if (!row.start) continue;
      const monthKey = format(startOfMonth(new Date(row.start)), "MMM yyyy");
      const slot = monthMap.get(monthKey);
      if (!slot) continue;
      slot.count += 1;
    }
    const total = monthlyData.reduce((sum, month) => sum + month.count, 0);

    return {
      data: { monthlyData, total },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching monthly appointments:", error);
    return { data: null, error: error as PostgrestError };
  }
}

export async function fetchDashboardServices(
  companyId: string,
  locationId?: string | null,
): Promise<{ data: DashboardServiceOption[]; error: PostgrestError | null }> {
  const supabase = createClient();
  let query = supabase
    .from("service")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  if (locationId) {
    const offered = await fetchServiceIdsForLocation(
      asLocationClient(supabase),
      locationId,
    );
    if (offered.tablePresent) {
      if (offered.data.length === 0) return { data: [], error: null };
      query = query.in("id", offered.data);
    }
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error };
  }

  return {
    data: ((data || []) as Array<{ id: string; name: string | null }>)
      .filter((row) => !!row.id && !!row.name)
      .map((row) => ({ id: row.id, name: row.name as string })),
    error: null,
  };
}
