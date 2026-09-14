import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  APPOINTMENT_SELECT,
  type AppointmentCalendarEvent,
} from "@/lib/api/calendar/queries/fetch-appointments";

export async function fetchAppointmentById(id: string): Promise<{
  data: AppointmentCalendarEvent | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("appointment")
    .select(APPOINTMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  return {
    data: (data as unknown as AppointmentCalendarEvent | null) ?? null,
    error,
  };
}
