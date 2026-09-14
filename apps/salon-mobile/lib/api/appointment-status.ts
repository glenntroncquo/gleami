/** Canonical cancel flag is `appointment.status`. `is_canceled` is leftover. */
export function isAppointmentCanceled(appointment: {
  status?: string | null;
  is_canceled?: boolean | null;
}): boolean {
  const status = appointment.status?.trim().toLowerCase();
  if (status) {
    return status === 'canceled' || status === 'cancelled';
  }
  return appointment.is_canceled === true;
}
