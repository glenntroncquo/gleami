import type { EventColor } from "@/components/event-calendar";

export interface ScheduleStaff {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imagePath: string | null;
}

export interface ScheduleAvailabilityBlock {
  id: string;
  /** The underlying schedule rule or available_addition exception id. */
  sourceId: string;
  staffId: string;
  start: Date;
  end: Date;
  recurring: boolean;
}

export interface ScheduleUnavailabilityBlock {
  id: string;
  staffId: string;
  start: Date;
  end: Date;
}

export interface ScheduleAppointmentService {
  serviceName: string;
  serviceVariantName: string | null;
}

export interface ScheduleAppointmentBlock {
  id: string;
  appointmentId: string;
  staffId: string;
  start: Date;
  end: Date;
  clientName: string | null;
  services: ScheduleAppointmentService[];
  /** Event color derived from the primary service, matching the calendar. */
  color: EventColor;
}

export interface WeekScheduleData {
  staff: ScheduleStaff[];
  availabilities: ScheduleAvailabilityBlock[];
  unavailabilities: ScheduleUnavailabilityBlock[];
  appointments: ScheduleAppointmentBlock[];
}
