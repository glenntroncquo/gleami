import type { AuthContext } from "../../../infrastructure/auth/context.ts";
import { ForbiddenError, UnauthenticatedError } from "../../../infrastructure/errors.ts";
import { appointmentRepository } from "../../repository.ts";
import type { CanceledAppointment } from "../../entity.ts";
import { verifyAppointmentAccessToken } from "../../access-token.ts";
import { supabaseAdmin } from "../../../infrastructure/supabase/client.ts";
import { appointmentMatchesCancelKeys, assertStaffCancelAccess } from "./access.ts";
import type { CancelAppointmentInput } from "./schema.ts";

export async function cancelAppointmentHandler(
  input: CancelAppointmentInput,
  auth: AuthContext | null = null,
): Promise<CanceledAppointment | null> {
  const appointment = await appointmentRepository.findById(input.appointmentId);
  if (!appointment) {
    return null;
  }

  // Guest path: the emailed token is the capability. Unknown appointment,
  // wrong token, already canceled, and already started all surface as the
  // same 404/403 — no existence oracle.
  if (input.token) {
    const valid = await verifyAppointmentAccessToken(
      supabaseAdmin,
      input.appointmentId,
      input.token,
    );
    if (!valid) {
      throw new ForbiddenError("This manage-booking link is invalid or has expired");
    }
    return appointmentRepository.cancelAsGuest(input.appointmentId);
  }

  // Staff path: UUIDs alone no longer authorize anything.
  if (!auth) {
    throw new UnauthenticatedError();
  }
  if (
    !input.clientId ||
    !input.companyId ||
    !appointmentMatchesCancelKeys(appointment, {
      clientId: input.clientId,
      companyId: input.companyId,
      locationId: input.locationId,
    })
  ) {
    return null;
  }

  assertStaffCancelAccess(auth, appointment);

  return appointmentRepository.cancel({
    appointmentId: input.appointmentId,
    clientId: input.clientId,
    companyId: input.companyId,
    locationId: input.locationId,
    canceledBy: "staff",
  });
}
