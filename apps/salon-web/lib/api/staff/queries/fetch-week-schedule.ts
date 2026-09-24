import { createClient } from "@/lib/supabase/client";
import { getDay } from "date-fns";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  asLocationClient,
  fetchStaffIdsForLocation,
  withLocationId,
} from "@/lib/location";
import type {
  ScheduleAppointmentBlock,
  ScheduleAvailabilityBlock,
  ScheduleUnavailabilityBlock,
  WeekScheduleData,
} from "@/components/staff-schedule/types";
import { mapServiceColorToEventColor } from "@/lib/service-colors";
import { applyTimeOnDate } from "@/lib/api/calendar/layout-segments";
import { layoutCalendarSegmentBounds } from "@/lib/api/calendar/calendar-display-bounds";

type SegmentRow = {
  id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  appointment: {
    id: string;
    is_canceled: boolean | null;
    start: string;
    end: string;
    client: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    appointment_segment: Array<{ id: string }> | null;
  } | null;
  service: { name: string | null; color: string | null } | null;
  service_variant: { name: string | null } | null;
  appointment_segment_phase: Array<{
    id: string;
    staff_id: string;
    phase_type: string;
    starts_at: string;
    ends_at: string;
  }> | null;
};

function isRuleEffectiveOn(day: Date, from: string | null, to: string | null): boolean {
  const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  if (from && dayKey < from) return false;
  if (to && dayKey > to) return false;
  return true;
}

export async function fetchWeekSchedule(
  companyId: string,
  weekDays: Date[],
  locationId?: string | null,
): Promise<{ data: WeekScheduleData | null; error: PostgrestError | null }> {
  const supabase = createClient();

  if (weekDays.length === 0) {
    return {
      data: {
        staff: [],
        availabilities: [],
        unavailabilities: [],
        appointments: [],
      },
      error: null,
    };
  }

  const weekStart = weekDays[0];
  const weekEnd = weekDays[weekDays.length - 1];
  const weekEndExclusive = new Date(weekEnd);
  weekEndExclusive.setHours(23, 59, 59, 999);

  let staffQuery = supabase
    .from("staff")
    .select("id, first_name, last_name, image_path")
    .eq("company_id", companyId)
    .order("first_name", { ascending: true });

  if (locationId) {
    const scoped = await fetchStaffIdsForLocation(
      asLocationClient(supabase),
      locationId,
    );
    if (scoped.tablePresent) {
      if (scoped.data.length === 0) {
        return {
          data: {
            staff: [],
            availabilities: [],
            unavailabilities: [],
            appointments: [],
          },
          error: null,
        };
      }
      staffQuery = staffQuery.in("id", scoped.data);
    }
  }

  const { data: staff, error: staffError } = await staffQuery;

  if (staffError) {
    return { data: null, error: staffError };
  }

  const { data: ruleRows, error: ruleError } = await withLocationId(
    supabase
      .from("staff_schedule_rule")
      .select("id, staff_id, day_of_week, start_time, end_time, effective_from, effective_to, is_active")
      .eq("company_id", companyId)
      .eq("is_active", true),
    locationId,
  );

  if (ruleError) {
    return { data: null, error: ruleError };
  }

  const { data: exceptionRows, error: exceptionError } = await withLocationId(
    supabase
      .from("staff_schedule_exception")
      .select("id, staff_id, starts_at, ends_at, kind")
      .eq("company_id", companyId)
      .lte("starts_at", weekEndExclusive.toISOString())
      .gte("ends_at", weekStart.toISOString()),
    locationId,
  );

  if (exceptionError) {
    return { data: null, error: exceptionError };
  }

  const { data: segmentRows, error: segmentError } = await withLocationId(
    supabase
      .from("appointment_segment")
      .select(
        `
      id,
      staff_id,
      starts_at,
      ends_at,
      appointment:appointment_id (
        id,
        is_canceled,
        start,
        end,
        client:client_id ( first_name, last_name ),
        appointment_segment ( id )
      ),
      service:service_id ( name, color ),
      service_variant:service_variant_id ( name ),
      appointment_segment_phase ( id, staff_id, phase_type, starts_at, ends_at )
    `
      )
      .eq("company_id", companyId)
      .lte("starts_at", weekEndExclusive.toISOString())
      .gte("ends_at", weekStart.toISOString()),
    locationId,
  );

  if (segmentError) {
    return { data: null, error: segmentError };
  }

  const availabilities: ScheduleAvailabilityBlock[] = [];

  (ruleRows || []).forEach((row) => {
    weekDays.forEach((day) => {
      if (getDay(day) !== row.day_of_week) return;
      if (!isRuleEffectiveOn(day, row.effective_from, row.effective_to)) return;

      availabilities.push({
        id: `${row.id}-${day.toISOString().slice(0, 10)}`,
        sourceId: row.id,
        staffId: row.staff_id,
        start: applyTimeOnDate(day, row.start_time),
        end: applyTimeOnDate(day, row.end_time),
        recurring: true,
      });
    });
  });

  const unavailabilities: ScheduleUnavailabilityBlock[] = [];

  (exceptionRows || []).forEach((row) => {
    if (row.kind === "available_addition") {
      availabilities.push({
        id: row.id,
        sourceId: row.id,
        staffId: row.staff_id,
        start: new Date(row.starts_at),
        end: new Date(row.ends_at),
        recurring: false,
      });
      return;
    }
    unavailabilities.push({
      id: row.id,
      staffId: row.staff_id,
      start: new Date(row.starts_at),
      end: new Date(row.ends_at),
    });
  });

  const appointments: ScheduleAppointmentBlock[] = [];
  const liveRows = ((segmentRows as unknown as SegmentRow[]) || []).filter(
    (row) => row.appointment && !row.appointment.is_canceled,
  );
  const rowsByAppointment = new Map<string, SegmentRow[]>();
  for (const row of liveRows) {
    const appointmentId = row.appointment!.id;
    const group = rowsByAppointment.get(appointmentId) || [];
    group.push(row);
    rowsByAppointment.set(appointmentId, group);
  }

  for (const group of rowsByAppointment.values()) {
    const appointment = group[0]!.appointment!;
    const laidOut = layoutCalendarSegmentBounds({
      segments: group.map((row) => ({
        phases: row.appointment_segment_phase,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      })),
      appointmentStart: appointment.start,
      appointmentEnd: appointment.end,
    });

    group.forEach((row, index) => {
      const bounds = laidOut.segments[index];
      if (!bounds) return;

      const clientName = appointment.client
        ? `${appointment.client.first_name || ""} ${appointment.client.last_name || ""}`.trim()
        : "";

      appointments.push({
        id: row.id,
        appointmentId: appointment.id,
        staffId: row.staff_id,
        start: bounds.start,
        end: bounds.end,
        clientName: clientName || null,
        services: [
          {
            serviceName: row.service?.name || "",
            serviceVariantName: row.service_variant?.name || null,
          },
        ],
        color: mapServiceColorToEventColor(
          row.service?.color ?? null,
          row.service?.name ?? undefined,
        ),
      });
    });
  }

  return {
    data: {
      staff: (staff || []).map((s) => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        imagePath: s.image_path,
      })),
      availabilities,
      unavailabilities,
      appointments,
    },
    error: null,
  };
}
