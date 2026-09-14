import type { useTranslations } from "next-intl";
import type { AppointmentCalendarEvent } from "@/lib/api/calendar/queries/fetch-appointments";
import type { CalendarEvent } from "@/components/event-calendar";
import {
  ServiceColor,
  mapServiceColorToEventColor,
} from "@/lib/service-colors";
import { layoutCalendarSegmentBounds } from "@/lib/api/calendar/calendar-display-bounds";

function staffName(
  staff: {
    first_name: string | null;
    last_name: string | null;
  } | null,
  unassigned: string,
): string {
  if (!staff) return unassigned;
  return `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || unassigned;
}

/**
 * Expand an appointment into one calendar event per segment, grouped by that
 * segment's staff. Block height is the client-facing visit (busy + free).
 * Clicking any event still opens the parent appointment.
 */
export const transformAppointmentToEvents = (
  appointment: AppointmentCalendarEvent,
  t: ReturnType<typeof useTranslations>,
): CalendarEvent[] => {
  const clientName = appointment.client
    ? `${appointment.client.first_name || ""} ${appointment.client.last_name || ""}`.trim()
    : t("common.unknown");

  const segments = [...(appointment.appointment_segment || [])].sort(
    (a, b) => a.sequence - b.sequence,
  );

  const services = segments
    .filter((segment) => segment.service && segment.service_variant)
    .map((segment) => ({
      id: segment.service!.id,
      name: segment.service!.name,
      staffId: segment.staff_id,
      staffName: staffName(segment.staff, "Unassigned"),
      startsAt: segment.starts_at,
      endsAt: segment.ends_at,
      serviceVariant: {
        id: segment.service_variant!.id,
        name: segment.service_variant!.name,
        price: Number(segment.price ?? segment.service_variant!.price ?? 0),
        durationInMinutes: Number(
          segment.service_variant!.client_duration_minutes ?? 0,
        ),
      },
    }));

  const serviceNames = services.map((item) => item.name).join(", ");
  const serviceName = serviceNames || "Service";
  const serviceIds = services.map((item) => item.id);
  const primaryColor = segments[0]?.service?.color || null;

  const shared = {
    appointmentId: appointment.id,
    locationId: appointment.location_id ?? null,
    title: serviceName,
    description: `Client: ${clientName}\nService${
      services.length > 1 ? "s" : ""
    }: ${serviceName}${
      appointment.staff_notes ? `\nNotes: ${appointment.staff_notes}` : ""
    }`,
    color: mapServiceColorToEventColor(
      (primaryColor as ServiceColor) ?? null,
    ),
    serviceId: serviceIds[0],
    serviceIds,
    client: appointment.client
      ? {
          id: appointment.client.id,
          email: appointment.client.email || "",
          first_name: appointment.client.first_name || t("common.unknown"),
          last_name: appointment.client.last_name || t("navigation.clients"),
        }
      : undefined,
    service: services[0],
    services,
    staff_notes: appointment.staff_notes || null,
    segments: segments.map((segment) => ({
      id: segment.id,
      sequence: segment.sequence,
      staffId: segment.staff_id,
      staffName: staffName(segment.staff, "Unassigned"),
      serviceId: segment.service?.id || segment.service_id,
      serviceName: segment.service?.name || "Service",
      variantId: segment.service_variant?.id || segment.service_variant_id,
      variantName: segment.service_variant?.name || "",
      startsAt: segment.starts_at,
      endsAt: segment.ends_at,
      price: Number(segment.price ?? 0),
    })),
  };

  const events: CalendarEvent[] = [];
  const laidOut = layoutCalendarSegmentBounds({
    segments: segments.map((segment) => ({
      phases: segment.appointment_segment_phase,
      startsAt: segment.starts_at,
      endsAt: segment.ends_at,
    })),
    appointmentStart: appointment.start,
    appointmentEnd: appointment.end,
  });

  for (const [index, segment] of segments.entries()) {
    const bounds = laidOut.segments[index];
    if (!bounds) continue;

    const staff = segment.staff;
    events.push({
      ...shared,
      id: segment.id,
      start: bounds.start,
      end: bounds.end,
      visitStart: laidOut.visit?.start,
      visitEnd: laidOut.visit?.end,
      location: staffName(staff, "Unassigned"),
      segmentId: segment.id,
      staff: staff
        ? {
            id: staff.id,
            first_name: staff.first_name || t("common.unknown"),
            last_name: staff.last_name || t("appointments.form.staff"),
            image_path: staff.image_path,
          }
        : {
            id: segment.staff_id,
            first_name: "Unassigned",
            last_name: "",
            image_path: null,
          },
    });
  }

  return events;
};

export const transformAppointmentToEvent = (
  appointment: AppointmentCalendarEvent,
  t: ReturnType<typeof useTranslations>,
): CalendarEvent => {
  const events = transformAppointmentToEvents(appointment, t);
  return (
    events[0] || {
      id: appointment.id,
      appointmentId: appointment.id,
      locationId: appointment.location_id ?? null,
      title: "Service",
      start: new Date(appointment.start),
      end: new Date(appointment.end),
      visitStart: new Date(appointment.start),
      visitEnd: new Date(appointment.end),
    }
  );
};
