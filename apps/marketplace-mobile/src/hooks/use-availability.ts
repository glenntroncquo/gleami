import { useQueries } from '@tanstack/react-query';

import { listAvailability } from '@/src/api/booking';
import type { AvailabilityDays } from '@/src/api/booking-types';
import type { CatalogItem } from '@/src/booking/catalog';
import { addDays, dateKey } from '@/src/lib/booking-date';
import { useOnline } from '@/src/lib/online';

/** `availability-list` caps a request at 31 days; 28 keeps the day strip whole weeks. */
export const AVAILABILITY_WINDOW_DAYS = 28;

export type AvailabilityWindows = {
  /** Every subscribed window merged into one day map. */
  days: AvailabilityDays;
  /** Windows that returned data, so an empty day map can be told from an unasked one. */
  loaded: Set<number>;
  /** Resolved either way: the strip stops showing skeletons for a window that failed. */
  settled: Set<number>;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Availability for the windows currently on screen. The day strip scrolls across
 * three months but the backend only answers 28 days at a time, so each window is
 * its own cached query and the caller subscribes to the one or two it is showing.
 */
export function useAvailabilityWindows(input: {
  companyId: string;
  locationId: string;
  items: CatalogItem[];
  /** Day 0 of the strip; window `n` starts `n * 28` days after it. */
  base: Date;
  windows: number[];
}): AvailabilityWindows {
  const online = useOnline();
  const services = input.items.map((item) => ({
    serviceId: item.service.serviceId,
    serviceVariantId: item.variant.serviceVariantId,
  }));
  const variantKey = services.map((service) => service.serviceVariantId).join('|');
  const enabled = online && services.length > 0 && Boolean(input.companyId && input.locationId);

  return useQueries({
    queries: input.windows.map((window) => {
      const start = addDays(input.base, window * AVAILABILITY_WINDOW_DAYS);
      const startKey = dateKey(start);
      return {
        queryKey: ['availability', input.locationId, variantKey, startKey],
        queryFn: () =>
          listAvailability({
            companyId: input.companyId,
            locationId: input.locationId,
            services,
            startDate: startKey,
            endDate: dateKey(addDays(start, AVAILABILITY_WINDOW_DAYS - 1)),
          }),
        enabled,
        // Slots go stale fast, but not within the few seconds a user spends deciding.
        staleTime: 60_000,
      };
    }),
    // Merging here keeps the day map referentially stable between renders.
    combine: (results) => ({
      days: Object.assign({}, ...results.map((result) => result.data ?? {})) as AvailabilityDays,
      loaded: new Set(input.windows.filter((_, index) => results[index]?.data !== undefined)),
      settled: new Set(
        input.windows.filter((_, index) => results[index]?.data !== undefined || results[index]?.isError === true),
      ),
      isPending: results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
      refetch: () => results.forEach((result) => void result.refetch()),
    }),
  });
}
