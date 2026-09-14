/**
 * Body `location_id` is the primary source (POS walk-in / product-only).
 * Appointment location is only a fallback when the body omits it.
 */
export function resolveCreateOrderLocationId(
  bodyLocationId?: string,
  appointmentLocationId?: string | null,
): string | undefined {
  return bodyLocationId ?? appointmentLocationId ?? undefined;
}
