import { formatLocalTimestamp } from "../layout-segments";
import { parseCalendarTimestamp } from "../calendar-display-bounds";

function shiftDate(value: Date, deltaMs: number): Date {
  return new Date(value.getTime() + deltaMs);
}

/** Appointment.start/end are timestamp without time zone (local wall clock). */
export function shiftLocalTimestamp(value: string, deltaMs: number): string {
  return formatLocalTimestamp(shiftDate(parseCalendarTimestamp(value), deltaMs));
}

/** Segment/phase bounds are timestamptz. */
export function shiftIsoTimestamp(value: string, deltaMs: number): string {
  return shiftDate(parseCalendarTimestamp(value), deltaMs).toISOString();
}
