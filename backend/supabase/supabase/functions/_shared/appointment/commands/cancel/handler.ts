import type { AuthContext } from "../../../infrastructure/auth/context.ts";
import { appointmentRepository } from "../../repository.ts";
import type { CanceledAppointment } from "../../entity.ts";
import { appointmentMatchesCancelKeys, assertStaffCancelAccess } from "./access.ts";
import type { CancelAppointmentInput } from "./schema.ts";

export async function cancelAppointmentHandler(
  input: CancelAppointmentInput,
  auth: AuthContext | null = null,
): Promise<CanceledAppointment | null> {
  const appointment = await appointmentRepository.findById(input.appointmentId);
  if (!appointment || !appointmentMatchesCancelKeys(appointment, input)) {
    return null;
  }

  assertStaffCancelAccess(auth, appointment);

  return appointmentRepository.cancel({
    appointmentId: input.appointmentId,
    clientId: input.clientId,
    companyId: input.companyId,
    locationId: input.locationId,
    canceledBy: auth ? "staff" : undefined,
  });
}
