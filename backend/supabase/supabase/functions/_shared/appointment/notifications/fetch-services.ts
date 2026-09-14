import { supabaseAdmin } from "../../infrastructure/supabase/client.ts";

export interface AppointmentServiceForEmail {
  serviceName: string;
  serviceVariantName: string | null;
  price: number | null;
}

interface AppointmentSegmentForEmailRow {
  price: number | null;
  service: { name: string } | null;
  service_variant: { name: string; price: number | null } | null;
}

/** Segments only. No appointment_treatment / treatment / price_option fallback. */
export async function fetchAppointmentServicesForEmail(
  appointmentId: string,
): Promise<AppointmentServiceForEmail[]> {
  const { data: segments, error: segmentError } = await supabaseAdmin
    .from("appointment_segment")
    .select(
      `
      sequence,
      price,
      service:service_id (
        name
      ),
      service_variant:service_variant_id (
        name,
        price
      )
    `,
    )
    .eq("appointment_id", appointmentId)
    .order("sequence");

  if (segmentError) {
    throw new Error(`Error fetching appointment services: ${segmentError.message}`);
  }

  return ((segments ?? []) as unknown as AppointmentSegmentForEmailRow[]).map((segment) => ({
    serviceName: segment.service?.name || "Unknown service",
    serviceVariantName: segment.service_variant?.name || null,
    price: segment.price ?? segment.service_variant?.price ?? null,
  }));
}

