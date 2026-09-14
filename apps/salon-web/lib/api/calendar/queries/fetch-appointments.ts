import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { withLocationId } from "@/lib/location";

export type AppointmentSegmentPhase = {
  id: string;
  staff_id: string;
  sequence: number;
  phase_type: "busy" | "free" | "buffer";
  starts_at: string;
  ends_at: string;
};

export type AppointmentSegment = {
  id: string;
  sequence: number;
  staff_id: string;
  service_id: string;
  service_variant_id: string;
  starts_at: string;
  ends_at: string;
  price: number | null;
  staff: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_path: string | null;
  } | null;
  service: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  service_variant: {
    id: string;
    name: string;
    price: number;
    client_duration_minutes: number;
    staff_duration_minutes: number | null;
  } | null;
  appointment_segment_phase: AppointmentSegmentPhase[];
};

export type AppointmentCalendarEvent = {
  company_id: string;
  id: string;
  location_id?: string | null;
  start: string;
  end: string;
  notes: string | null;
  staff_notes: string | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  appointment_segment: AppointmentSegment[];
};

const APPOINTMENT_SELECT = `
    company_id,
    id,
    location_id,
    start,
    end,
    notes,
    staff_notes,
    client:client_id (
      id,
      first_name,
      last_name,
      email
    ),
    appointment_segment (
      id,
      sequence,
      staff_id,
      service_id,
      service_variant_id,
      starts_at,
      ends_at,
      price,
      staff:staff_id (
        id,
        first_name,
        last_name,
        image_path
      ),
      service:service_id ( id, name, color ),
      service_variant:service_variant_id (
        id,
        name,
        price,
        client_duration_minutes,
        staff_duration_minutes
      ),
      appointment_segment_phase (
        id,
        staff_id,
        sequence,
        phase_type,
        starts_at,
        ends_at
      )
    )
`;

export async function fetchAppointments(locationId?: string | null): Promise<{
  data: AppointmentCalendarEvent[];
  error: PostgrestError | null;
}> {
  const supabase = createClient();

  const { data, error } = await withLocationId(
    supabase
      .from("appointment")
      .select(APPOINTMENT_SELECT)
      .eq("is_canceled", false),
    locationId,
  );

  return {
    data: (data as unknown as AppointmentCalendarEvent[]) || [],
    error,
  };
}

export { APPOINTMENT_SELECT };
