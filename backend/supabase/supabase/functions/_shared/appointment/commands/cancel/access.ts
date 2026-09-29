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
 * Guest manage-booking (no user session) authorizes via an emailed random
 * token, verified in the handler against the stored SHA-256 hash.
 *
 * Staff JWTs are location-scoped the same way as appointment-create-staff:
 * company membership plus appointment.location_id.
 */
export function assertStaffCancelAccess(
  auth: AuthContext | null,
  appointment: { companyId: string; locationId: string },
): void {
  if (!auth) return;
  requireShopAccess(auth, appointment.companyId, appointment.locationId);
}
