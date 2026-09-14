export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarEventSegment {
  id: string;
  sequence: number;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  variantId: string;
  variantName: string;
  startsAt: string;
  endsAt: string;
  price: number;
}

export interface CalendarEvent {
  id: string;
  /** Parent appointment id. Calendar `id` is the segment id. */
  appointmentId?: string;
  /** Shop this appointment belongs to. Prefer over the sidebar selection on save. */
  locationId?: string | null;
  segmentId?: string;
  phaseId?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  /** Client-facing visit window for the parent appointment (email / details). */
  visitStart?: Date;
  visitEnd?: Date;
  allDay?: boolean;
  color?: EventColor;
  label?: string;
  location?: string;
  serviceId?: string;
  serviceIds?: string[];

  // Extended fields for appointment management
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    image_path?: string | null;
  };
  client?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  service?: {
    id: string;
    name: string;
    staffId?: string;
    staffName?: string;
    startsAt?: string;
    endsAt?: string;
    serviceVariant?: {
      id: string;
      name: string;
      price: number;
      durationInMinutes: number;
    };
  };
  services?: Array<{
    id: string;
    name: string;
    staffId?: string;
    staffName?: string;
    startsAt?: string;
    endsAt?: string;
    serviceVariant?: {
      id: string;
      name: string;
      price: number;
      durationInMinutes: number;
    };
  }>;
  segments?: CalendarEventSegment[];
  // Staff notes for appointments
  staff_notes?: string | null;
}

export type EventColor =
  | "blue"
  | "orange"
  | "violet"
  | "rose"
  | "emerald"
  | "cyan"
  | "lime"
  | "pink"
  | "indigo"
  | "amber"
  | "teal"
  | "purple";
