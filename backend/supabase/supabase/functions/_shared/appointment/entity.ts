export interface Appointment {
  id: string;
  companyId: string;
  clientId: string;
  staffId: string;
  locationId: string;
  price: number;
  start: string;
  end: string;
  allowOverlap: boolean | null;
  status: string | null;
  isCanceled: boolean;
  cancelReason: string | null;
  canceledBy: string | null;
  clientEmail: string | null;
  notes: string | null;
  staffNotes: string | null;
  imagePath: string | null;
  staffImagePath: string | null;
  externalReferenceId: string | null;
  confirmationSent: boolean | null;
  sendConfirmation: boolean | null;
  reminderSent: boolean | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CanceledAppointment {
  id: string;
  start: string;
  end: string;
  isCanceled: boolean;
}

export interface AppointmentListItem {
  id: string;
  start: string;
  end: string;
  notes: string | null;
  isCanceled: boolean;
  staff: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  segments: Array<{
    id: string;
    staffId: string;
    sequence: number;
    startsAt: string;
    endsAt: string;
    service: { id: string; name: string };
    serviceVariant: { id: string; name: string };
  }>;
}

export interface StaffScheduleRule {
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface StaffScheduleException {
  staffId: string;
  kind: "available_addition" | "unavailable";
  startsAt: string;
  endsAt: string;
}

export interface BusyPhaseWindow {
  staffId: string;
  startsAt: string;
  endsAt: string;
}

export interface BookingSegmentInput {
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
}
