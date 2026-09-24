import { BOOKING_WEB_ORIGIN } from '@/src/config';

/**
 * booking-web public route:
 *   /{companyId}/{locationKey}?serviceIds=&serviceVariantIds=
 * locationKey is a location uuid or location.slug (not the marketplace slug).
 * We pass locationId so the handoff does not depend on marketplace_slug
 * matching location.slug. A single variant is preselected; several variants
 * stay in the widget so we don't preselect all of them.
 */
export function buildServiceBookingUrl(input: {
  companyId: string;
  locationId: string;
  serviceId: string;
  variantIds: string[];
}): string {
  const params = new URLSearchParams();
  params.set('serviceIds', input.serviceId);
  if (input.variantIds.length === 1) {
    params.set('serviceVariantIds', input.variantIds[0]);
  }
  return `${BOOKING_WEB_ORIGIN}/${input.companyId}/${input.locationId}?${params.toString()}`;
}
