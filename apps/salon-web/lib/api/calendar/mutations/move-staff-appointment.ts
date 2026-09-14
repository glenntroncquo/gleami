import { createClient } from "@/lib/supabase/client";
import { asLocationClient, withLocationId } from "@/lib/location";
import {
  shiftIsoTimestamp,
  shiftLocalTimestamp,
} from "@/lib/api/calendar/mutations/move-staff-appointment-times";

export { shiftIsoTimestamp, shiftLocalTimestamp } from "./move-staff-appointment-times";

export type MoveStaffAppointmentInput = {
  appointmentId: string;
  locationId?: string | null;
  deltaMs: number;
};

type TimedRow = {
  id: string;
  starts_at: string;
  ends_at: string;
};

export async function moveStaffAppointment(
  input: MoveStaffAppointmentInput,
): Promise<{ error: string | null }> {
  if (!input.appointmentId) {
    return { error: "Appointment id is required" };
  }
  if (!Number.isFinite(input.deltaMs) || input.deltaMs === 0) {
    return { error: null };
  }

  const supabase = createClient();
  const locationClient = asLocationClient(supabase);

  let lookup = locationClient
    .from("appointment")
    .select(
      `
      id,
      start,
      end,
      appointment_segment (
        id,
        starts_at,
        ends_at,
        appointment_segment_phase (
          id,
          starts_at,
          ends_at
        )
      )
    `,
    )
    .eq("id", input.appointmentId);
  lookup = withLocationId(lookup, input.locationId);

  const { data: row, error: lookupError } = await lookup.maybeSingle();

  if (lookupError) {
    return { error: lookupError.message || "Failed to load appointment" };
  }
  if (!row) {
    return { error: "Appointment not found for this shop" };
  }

  const appointment = row as {
    id: string;
    start: string;
    end: string;
    appointment_segment:
      | Array<
          TimedRow & {
            appointment_segment_phase: TimedRow[] | null;
          }
        >
      | null;
  };

  const segments = appointment.appointment_segment || [];
  const phases = segments.flatMap(
    (segment) => segment.appointment_segment_phase || [],
  );

  for (const phase of phases) {
    const { error } = await withLocationId(
      locationClient
        .from("appointment_segment_phase")
        .update({
          starts_at: shiftIsoTimestamp(phase.starts_at, input.deltaMs),
          ends_at: shiftIsoTimestamp(phase.ends_at, input.deltaMs),
        })
        .eq("id", phase.id),
      input.locationId,
    );
    if (error) {
      return { error: error.message || "Failed to move appointment phase" };
    }
  }

  for (const segment of segments) {
    const { error } = await withLocationId(
      locationClient
        .from("appointment_segment")
        .update({
          starts_at: shiftIsoTimestamp(segment.starts_at, input.deltaMs),
          ends_at: shiftIsoTimestamp(segment.ends_at, input.deltaMs),
        })
        .eq("id", segment.id),
      input.locationId,
    );
    if (error) {
      return { error: error.message || "Failed to move appointment segment" };
    }
  }

  const { error: appointmentError } = await withLocationId(
    locationClient
      .from("appointment")
      .update({
        start: shiftLocalTimestamp(appointment.start, input.deltaMs),
        end: shiftLocalTimestamp(appointment.end, input.deltaMs),
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.id),
    input.locationId,
  );

  if (appointmentError) {
    return { error: appointmentError.message || "Failed to move appointment" };
  }

  return { error: null };
}
