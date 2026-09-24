/** Salon wall-clock history: newest date first, earliest start within each day. */
export function compareAppointmentHistory(a: { start: string }, b: { start: string }): number {
  const dateOrder = b.start.slice(0, 10).localeCompare(a.start.slice(0, 10));
  return dateOrder || a.start.slice(11).localeCompare(b.start.slice(11));
}
