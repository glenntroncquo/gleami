import { requireShopAccess } from "../../../infrastructure/auth/guard.ts";
import type { AuthContext } from "../../../infrastructure/auth/context.ts";

export function appointmentMatchesCancelKeys(
  appointment: { clientId: string; companyId: string; locationId: string },
  input: { clientId: string; companyId: string; locationId?: string },
): boolean {
  if (appointment.clientId !== input.clientId) return false;
  if (appointment.companyId !== input.companyId) return false;
  if (input.locationId && appointment.locationId !== input.locationId) return false;
  return true;
}

/**
 * Public manage-booking (no user session) is a capability token:
 * appointmentId + clientId + companyId. Do not require membership.
 *
 * When a staff JWT is present, cancel is location-scoped the same way as
 * appointment-create-staff: company membership plus appointment.location_id.
 */
export function assertStaffCancelAccess(
  auth: AuthContext | null,
  appointment: { companyId: string; locationId: string },
): void {
  if (!auth) return;
  requireShopAccess(auth, appointment.companyId, appointment.locationId);
}
