import { addMinutes } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { formatLocalTimestamp } from "@/lib/api/calendar/layout-segments";
import type { SaveStaffAppointmentResult } from "@/lib/api/calendar/mutations/save-staff-appointment";
import {
  buildCreateStaffAppointmentBody,
  type CreateStaffAppointmentInput,
} from "./create-staff-appointment-payload";

export {
  buildCreateStaffAppointmentBody,
  type CreateStaffAppointmentBody,
  type CreateStaffAppointmentInput,
  type CreateStaffAppointmentService,
} from "./create-staff-appointment-payload";

type EdgeCreateStaffAppointmentResponse = {
  success?: boolean;
  booking_id?: string;
  client_id?: string;
  image_path?: string | null;
  total_services?: number;
  total_duration?: number;
  error?: string;
  message?: string;
};

export async function fileToImageData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export async function createStaffAppointment(
  input: CreateStaffAppointmentInput,
): Promise<{ data: SaveStaffAppointmentResult | null; error: string | null }> {
  if (input.services.length === 0) {
    return { data: null, error: "At least one service is required" };
  }
  if (!input.staffId) {
    return { data: null, error: "Each service needs a staff member" };
  }

  const supabase = createClient();
  const body = buildCreateStaffAppointmentBody(input);
  const { data, error } = await supabase.functions.invoke(
    "appointment-create-staff",
    { body },
  );

  const payload = data as EdgeCreateStaffAppointmentResponse | null;
  if (error || !payload?.success || !payload.booking_id) {
    return {
      data: null,
      error:
        payload?.message ||
        payload?.error ||
        error?.message ||
        "Failed to create appointment",
    };
  }

  const durationMinutes = Number(payload.total_duration) || 0;
  const end = addMinutes(input.start, durationMinutes);

  return {
    data: {
      id: payload.booking_id,
      clientId: payload.client_id || "",
      start: body.start,
      end: formatLocalTimestamp(end),
    },
    error: null,
  };
}
