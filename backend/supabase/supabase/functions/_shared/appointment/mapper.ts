import type { Database } from "@/types/database";
import type {
  Appointment,
  CanceledAppointment,
  AppointmentListItem,
  StaffScheduleRule,
  StaffScheduleException,
  BusyPhaseWindow,
} from "./entity.ts";

type AppointmentRow = Database["public"]["Tables"]["appointment"]["Row"];

export interface CanceledAppointmentRow {
  id: string;
  start: string;
  end: string;
  is_canceled: boolean;
}

export interface AppointmentListItemRow {
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

export function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    companyId: row.company_id,
    clientId: row.client_id,
    staffId: row.staff_id,
    locationId: row.location_id,
    price: row.price,
    start: row.start,
    end: row.end,
    allowOverlap: row.allow_overlap,
    status: row.status,
    isCanceled: row.is_canceled,
    cancelReason: row.cancel_reason,
    canceledBy: row.canceled_by,
    clientEmail: row.client_email,
    notes: row.notes,
    staffNotes: row.staff_notes,
    imagePath: row.image_path,
    staffImagePath: row.staff_image_path,
    externalReferenceId: row.external_reference_id,
    confirmationSent: row.confirmation_sent,
    sendConfirmation: row.send_confirmation,
    reminderSent: row.reminder_sent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCanceledAppointment(row: CanceledAppointmentRow): CanceledAppointment {
  return {
    id: row.id,
    start: row.start,
    end: row.end,
    isCanceled: row.is_canceled,
  };
}

export function toAppointmentListItem(row: AppointmentListItemRow): AppointmentListItem {
  const segments = [...(row.appointment_segment ?? [])].sort((a, b) => a.sequence - b.sequence);
  return {
    id: row.id,
    start: row.start,
    end: row.end,
    notes: row.notes,
    isCanceled: row.is_canceled,
    staff: row.staff
      ? {
          id: row.staff.id,
          firstName: row.staff.first_name,
          lastName: row.staff.last_name,
        }
      : null,
    segments: segments.map((segment) => ({
      id: segment.id,
      staffId: segment.staff_id,
      sequence: segment.sequence,
      startsAt: segment.starts_at,
      endsAt: segment.ends_at,
      service: segment.service,
      serviceVariant: segment.service_variant,
    })),
  };
}

export interface ScheduleRuleRow {
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
}

export function toStaffScheduleRule(row: ScheduleRuleRow): StaffScheduleRule {
  return {
    staffId: row.staff_id,
    dayOfWeek: Number(row.day_of_week),
    startTime: row.start_time,
    endTime: row.end_time,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    isActive: row.is_active,
  };
}

export interface ScheduleExceptionRow {
  staff_id: string;
  kind: "available_addition" | "unavailable";
  starts_at: string;
  ends_at: string;
}

export function toStaffScheduleException(row: ScheduleExceptionRow): StaffScheduleException {
  return {
    staffId: row.staff_id,
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

export interface BusyPhaseRow {
  staff_id: string;
  starts_at: string;
  ends_at: string;
}

export function toBusyPhaseWindow(row: BusyPhaseRow): BusyPhaseWindow {
  return {
    staffId: row.staff_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}
