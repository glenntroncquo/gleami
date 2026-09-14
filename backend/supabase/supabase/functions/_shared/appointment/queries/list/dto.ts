import type { AppointmentListItem } from "../../entity.ts";

export interface AppointmentListItemDto {
  id: string;
  start: string;
  end: string;
  notes: string | null;
  is_canceled: boolean;
  staff: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  appointment_segment: Array<{
    id: string;
    staff_id: string;
    sequence: number;
    starts_at: string;
    ends_at: string;
    service: { id: string; name: string };
    service_variant: { id: string; name: string };
  }>;
}

export function toAppointmentListItemDto(entity: AppointmentListItem): AppointmentListItemDto {
  return {
    id: entity.id,
    start: entity.start,
    end: entity.end,
    notes: entity.notes,
    is_canceled: entity.isCanceled,
    staff: entity.staff
      ? {
          id: entity.staff.id,
          first_name: entity.staff.firstName,
          last_name: entity.staff.lastName,
        }
      : null,
    appointment_segment: entity.segments.map((segment) => ({
      id: segment.id,
      staff_id: segment.staffId,
      sequence: segment.sequence,
      starts_at: segment.startsAt,
      ends_at: segment.endsAt,
      service: segment.service,
      service_variant: segment.serviceVariant,
    })),
  };
}
