import { locationRepository } from "../../../location/repository.ts";
import { resolveBookingLocation } from "../../../location/resolve.ts";
import { staffRepository } from "../../repository.ts";
import type { ListStaffQueryInput } from "./schema.ts";
import { toStaffListItemDto, type StaffListItemDto } from "./dto.ts";

export async function listStaffHandler(
  input: ListStaffQueryInput
): Promise<StaffListItemDto[]> {
  const location = await resolveBookingLocation(input.companyId, input.locationId);
  const staffIds = location.locationId
    ? await locationRepository.findStaffIdsForLocation(location.locationId)
    : undefined;
  const entities = await staffRepository.findManyByCompanyId(input.companyId, staffIds);
  return entities.map(toStaffListItemDto);
}
