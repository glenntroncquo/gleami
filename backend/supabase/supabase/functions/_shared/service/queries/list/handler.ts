import { staffRepository } from "../../../staff/repository.ts";
import { locationRepository } from "../../../location/repository.ts";
import { resolveBookingLocation } from "../../../location/resolve.ts";
import { serviceRepository } from "../../repository.ts";
import type { ListServicesQueryInput } from "./schema.ts";
import { toServiceListItemDto, type ServiceListItemDto } from "./dto.ts";

export async function listServicesHandler(
  input: ListServicesQueryInput,
): Promise<ServiceListItemDto[]> {
  const location = await resolveBookingLocation(input.companyId, input.locationId);
  const filterStaffIds = new Set<string>(input.staffIds ?? []);

  if (input.staffSlugs && input.staffSlugs.length > 0) {
    const idsBySlug = await staffRepository.findIdsBySlugs(input.companyId, input.staffSlugs);
    for (const id of idsBySlug) {
      filterStaffIds.add(id);
    }
  }

  let serviceIds: string[] | undefined;

  if (location.locationId) {
    serviceIds = await locationRepository.findServiceIdsForLocation(location.locationId);
    if (serviceIds.length === 0) {
      return [];
    }
  }

  if (filterStaffIds.size > 0) {
    const staffServiceIds = await serviceRepository.findServiceIdsForStaffIds(
      input.companyId,
      [...filterStaffIds],
      location.locationId,
    );

    if (staffServiceIds.length === 0) {
      return [];
    }

    serviceIds = serviceIds
      ? serviceIds.filter((id) => staffServiceIds.includes(id))
      : staffServiceIds;

    if (serviceIds.length === 0) {
      return [];
    }
  }

  const entities = await serviceRepository.findActiveWithVariants({
    companyId: input.companyId,
    serviceIds,
  });

  return entities.map(toServiceListItemDto);
}
