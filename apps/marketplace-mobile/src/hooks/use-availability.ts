import { useQuery } from '@tanstack/react-query';

import { listAvailability } from '@/src/api/booking';
import type { AvailabilityDays } from '@/src/api/booking-types';
import type { CatalogItem } from '@/src/booking/catalog';
import { addDays, dateKey } from '@/src/lib/booking-date';
import { useOnline } from '@/src/lib/online';

/** `availability-list` caps a request at 31 days; 28 keeps the day strip whole weeks. */
export const AVAILABILITY_WINDOW_DAYS = 28;

export function useAvailability(input: {
  companyId: string;
  locationId: string;
  items: CatalogItem[];
  /** First day of the window; page by 28 days to look further ahead. */
  windowStart: Date;
}) {
  const online = useOnline();
  const startKey = dateKey(input.windowStart);
  const endKey = dateKey(addDays(input.windowStart, AVAILABILITY_WINDOW_DAYS - 1));
  const services = input.items.map((item) => ({
    serviceId: item.service.serviceId,
    serviceVariantId: item.variant.serviceVariantId,
  }));

  return useQuery<AvailabilityDays>({
    queryKey: [
      'availability',
      input.locationId,
      services.map((service) => service.serviceVariantId).join('|'),
      startKey,
    ],
    queryFn: () =>
      listAvailability({
        companyId: input.companyId,
        locationId: input.locationId,
        services,
        startDate: startKey,
        endDate: endKey,
      }),
    enabled: online && services.length > 0 && Boolean(input.companyId && input.locationId),
    // Slots go stale fast, but not within the few seconds a user spends deciding.
    staleTime: 60_000,
  });
}
