import type { User } from "supabase";
import { appointmentRepository } from "../../repository.ts";
import type { CanceledAppointment } from "../../entity.ts";
import type { CancelCustomerAppointmentInput } from "./schema.ts";

/**
 * Thin orchestration: the entrypoint verified the user JWT, the repository
 * enforces ownership inside the UPDATE (client.user_id). Nothing here trusts
 * caller-supplied client/company identifiers — the schema doesn't even
 * accept them. Cancellation emails and the Timetree sync are not called from
 * here: they fire from the appointment table's database webhooks on update.
 */
export function cancelCustomerAppointmentHandler(
  input: CancelCustomerAppointmentInput,
  user: User,
): Promise<CanceledAppointment | null> {
  return appointmentRepository.cancelOwnedByUser({
    appointmentId: input.appointmentId,
    userId: user.id,
    cancelReason: input.cancelReason ?? null,
  });
}
