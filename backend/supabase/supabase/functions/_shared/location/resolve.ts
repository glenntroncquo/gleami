import { BookingLocationError } from "../infrastructure/errors.ts";
import { SALON_TIMEZONE } from "../time/salon-timezone.ts";
import { locationRepository } from "./repository.ts";

export interface ResolvedBookingLocation {
  locationId: string | null;
  timezone: string;
}

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
    return { locationId: location.id, timezone: location.timezone || SALON_TIMEZONE };
  }

  if (await locationRepository.isCompanyMultiLocation(companyId)) {
    throw new BookingLocationError(
      "LOCATION_REQUIRED",
      "location_id is required when company.multi_location_enabled is true",
    );
  }

  const timezone =
    (await locationRepository.findPrimaryTimezone(companyId)) ?? SALON_TIMEZONE;
  return { locationId: null, timezone };
}
