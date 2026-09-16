import { BookingLocationError } from "../infrastructure/errors.ts";
import { locationRepository } from "./repository.ts";
import { resolvedLocationFrom, type ResolvedBookingLocation } from "./resolved.ts";

export type { ResolvedBookingLocation } from "./resolved.ts";
export { resolvedLocationFrom } from "./resolved.ts";

export async function resolveBookingLocation(
  companyId: string,
  locationId?: string,
): Promise<ResolvedBookingLocation> {
  if (locationId) {
    const location = await locationRepository.findByIdForCompany(companyId, locationId);
    if (!location || !location.isActive) {
      throw new BookingLocationError(
        "INVALID_LOCATION",
        "location_id does not belong to this company",
      );
    }
    return resolvedLocationFrom(location);
  }

  return resolvedLocationFrom(await locationRepository.findPrimary(companyId));
}
