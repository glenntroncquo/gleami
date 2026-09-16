import { SALON_TIMEZONE } from "../time/salon-timezone.ts";

export interface ResolvedBookingLocation {
  locationId: string | null;
  timezone: string;
}

export interface BookingLocationLookup {
  id: string;
  timezone: string | null;
  isActive: boolean;
}

/**
 * Public booking (and any other caller) may omit location_id. After
 * drop_multi_location_enabled_v1 there is no company flag — every company
 * has a primary location row, so omitted location_id resolves to that
 * primary instead of querying company.multi_location_enabled.
 */
export function resolvedLocationFrom(
  location: BookingLocationLookup | null,
): ResolvedBookingLocation {
  if (!location || !location.isActive) {
    return {
      locationId: null,
      timezone: location?.timezone || SALON_TIMEZONE,
    };
  }

  return {
    locationId: location.id,
    timezone: location.timezone || SALON_TIMEZONE,
  };
}
