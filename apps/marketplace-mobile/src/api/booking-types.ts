/**
 * Booking edge-function contract (`availability-list`, `appointment-create`).
 * These functions predate the marketplace ones and mix casing on purpose:
 * the request body is camelCase, the slots it returns are snake_case.
 * Field names match that contract; do not rename them.
 */

/** One bookable service. The backend calls these "segments". */
export type BookingSegment = {
  serviceId: string;
  serviceVariantId: string;
  /** Leave unset to let the backend offer every eligible staff member. */
  staffId?: string;
};

export type AvailabilityRequest = {
  companyId: string;
  locationId: string;
  services: BookingSegment[];
  /** yyyy-MM-dd, inclusive. The backend caps the range at 31 days. */
  startDate: string;
  endDate: string;
  staffIds?: string[];
};

export type AvailabilitySlot = {
  staff_id: string;
  first_name: string;
  last_name: string;
  image_path: string | null;
  /** HH:mm, already formatted in the salon's timezone. */
  start_time: string;
  end_time: string;
  /** ISO instant to send back as the appointment start. */
  available_start: string;
  available_end: string;
};

export type AvailabilityStaffGroup = {
  first_name: string;
  last_name: string;
  image_path: string | null;
  slots: AvailabilitySlot[];
};

export type AvailabilityDay = {
  dayName: string;
  staff: Record<string, AvailabilityStaffGroup>;
};

/** Keyed by yyyy-MM-dd in the salon's timezone. Days without slots are absent. */
export type AvailabilityDays = Record<string, AvailabilityDay>;

export type CreateAppointmentRequest = {
  companyId: string;
  locationId: string;
  /** ISO instant, taken from the chosen slot's `available_start`. */
  start: string;
  staffId: string;
  services: BookingSegment[];
  price: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

export type CreateAppointmentResult = {
  bookingId: string;
  totalDuration: number;
};

/** Backend error keys we turn into their own message. Anything else is generic. */
export type BookingErrorKey = 'SLOT_TAKEN' | 'UNKNOWN';
