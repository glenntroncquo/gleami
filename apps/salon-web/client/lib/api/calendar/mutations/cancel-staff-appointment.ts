import { createClient } from "@/lib/supabase/client";
import {
  asLocationClient,
  resolveWriteLocationId,
  withLocationId,
} from "@/lib/location";
import { buildCancelStaffAppointmentBody } from "./cancel-staff-appointment-payload";

export {
  buildCancelStaffAppointmentBody,
  type CancelStaffAppointmentBody,
} from "./cancel-staff-appointment-payload";

export type CancelStaffAppointmentInput = {
  appointmentId: string;
  companyId: string;
  clientId?: string | null;
  locationId?: string | null;
};

type EdgeCancelResponse = {
  message?: string;
  error?: string;
  appointment?: {
    id: string;
    is_canceled?: boolean;
  };
};

export async function cancelStaffAppointment(
  input: CancelStaffAppointmentInput,
): Promise<{ error: string | null }> {
  if (!input.appointmentId) {
    return { error: "Appointment id is required" };
  }
  if (!input.companyId) {
    return { error: "Company id is required" };
  }

  const supabase = createClient();

  let lookup = asLocationClient(supabase)
    .from("appointment")
    .select("id, client_id, company_id, location_id")
    .eq("id", input.appointmentId)
    .eq("company_id", input.companyId);
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
    client_id: string | null;
    company_id: string;
    location_id?: string | null;
  };
  const clientId = input.clientId?.trim() || appointment.client_id;
  if (!clientId) {
    return { error: "Appointment has no client" };
  }

  const locationId = resolveWriteLocationId(
    input.locationId,
    appointment.location_id,
  );

  const body = buildCancelStaffAppointmentBody({
    appointmentId: appointment.id,
    clientId,
    companyId: appointment.company_id,
    locationId,
  });

  const { data, error } = await supabase.functions.invoke("appointment-cancel", {
    body,
  });

  const payload = data as EdgeCancelResponse | null;
  if (error) {
    return {
      error:
        payload?.message ||
        payload?.error ||
        error.message ||
        "Failed to cancel appointment",
    };
  }

  return { error: null };
}
