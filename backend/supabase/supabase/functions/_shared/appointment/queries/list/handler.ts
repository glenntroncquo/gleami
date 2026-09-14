import { appointmentRepository } from "../../repository.ts";
import type { ListAppointmentsByClientInput } from "./schema.ts";
import { toAppointmentListItemDto, type AppointmentListItemDto } from "./dto.ts";

export async function listAppointmentsByClientHandler(
  input: ListAppointmentsByClientInput
): Promise<AppointmentListItemDto[]> {
  const entities = await appointmentRepository.findUpcomingByClientAndCompany(input);
  return entities.map(toAppointmentListItemDto);
}
