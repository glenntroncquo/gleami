/**
 * Canonical cancel flag is `appointment.is_canceled` — the cancel command only
 * ever flips that column (see backend `appointmentRepository.cancel`), and web
 * reads cancellation the same way (`history-display-utils.ts`). `status` stays
 * `'scheduled'` on canceled rows, so it must not gate this check.
 */
export function isAppointmentCanceled(appointment: {
  status?: string | null;
  is_canceled?: boolean | null;
}): boolean {
  if (appointment.is_canceled === true) return true;
  const status = appointment.status?.trim().toLowerCase();
  return status === 'canceled' || status === 'cancelled';
}
