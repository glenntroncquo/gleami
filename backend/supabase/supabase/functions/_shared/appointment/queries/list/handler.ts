import { ForbiddenError } from "../../../infrastructure/errors.ts";
import { supabaseAdmin } from "../../../infrastructure/supabase/client.ts";
import { appointmentRepository } from "../../repository.ts";
import { verifyAppointmentAccessToken } from "../../access-token.ts";
import type { ListAppointmentsInput } from "./schema.ts";
import { toAppointmentListItemDto, type AppointmentListItemDto } from "./dto.ts";

export async function listAppointmentsHandler(
  input: ListAppointmentsInput,
): Promise<AppointmentListItemDto[]> {
  // Guest token-holder: exactly one appointment, never a listing. An invalid
  // token is indistinguishable from an expired one.
  if (input.token) {
    const valid = await verifyAppointmentAccessToken(
      supabaseAdmin,
      input.appointmentId!,
      input.token,
    );
    if (!valid) {
      throw new ForbiddenError("This manage-booking link is invalid or has expired");
    }
    const item = await appointmentRepository.findListItemById(input.appointmentId!);
    return item ? [toAppointmentListItemDto(item)] : [];
  }

  // Staff path: caller membership was enforced by the function entrypoint.
  const entities = await appointmentRepository.findUpcomingByClientAndCompany({
    clientId: input.clientId!,
    companyId: input.companyId!,
  });
  return entities.map(toAppointmentListItemDto);
}
