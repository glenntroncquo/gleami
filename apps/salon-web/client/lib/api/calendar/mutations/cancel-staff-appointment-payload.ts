export type CancelStaffAppointmentBody = {
  appointmentId: string;
  clientId: string;
  companyId: string;
  locationId?: string;
};

/**
 * CamelCase body for appointment-cancel. Optional locationId is the same
 * shop id used for the client-side lookup (selected shop, else the row).
 */
export function buildCancelStaffAppointmentBody(input: {
  appointmentId: string;
  clientId: string;
  companyId: string;
  locationId?: string | null;
}): CancelStaffAppointmentBody {
  const body: CancelStaffAppointmentBody = {
    appointmentId: input.appointmentId,
    clientId: input.clientId,
    companyId: input.companyId,
  };
  const locationId = input.locationId?.trim();
  if (locationId) body.locationId = locationId;
  return body;
}
