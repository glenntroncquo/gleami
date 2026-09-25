import { getAvailabilityHandler } from "../appointment/queries/availability/handler.ts";
import { BookingLocationError } from "../infrastructure/errors.ts";
import { formatInSalonZone, zonedWallTimeToUtc } from "../time/salon-timezone.ts";
import { addCalendarDays, bucketForDates, soonerBucket, type AvailabilityBucket } from "./buckets.ts";
import { supabaseAdmin } from "../infrastructure/supabase/client.ts";

export interface AvailabilityPair {
  locationId: string;
  serviceId: string;
  serviceVariantId: string;
}

interface LocationRow {
  id: string;
  company_id: string;
  timezone: string;
  is_listed: boolean;
  is_active: boolean;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/**
 * Coarse availability for search cards. Reuses getAvailabilityHandler (same
 * slot math as availability-list). One bucket per location: the soonest
 * across that location's pairs. Unlisted or inactive locations are
 * none_soon and do not call the availability engine.
 *
 * Window is today..+6 calendar days in the location timezone.
 */
export async function nextAvailable(
  pairs: AvailabilityPair[],
): Promise<Record<string, AvailabilityBucket>> {
  const started = Date.now();
  const locationIds = [...new Set(pairs.map((pair) => pair.locationId))];
  const { data, error } = await supabaseAdmin
    .from("location")
    .select("id, company_id, timezone, is_listed, is_active")
    .in("id", locationIds);

  if (error) {
    throw new Error(`Failed to load locations: ${error.message}`);
  }

  const locations = new Map<string, LocationRow>(
    ((data ?? []) as LocationRow[]).map((row) => [row.id, row]),
  );

  const results: Record<string, AvailabilityBucket> = {};
  for (const locationId of locationIds) results[locationId] = "none_soon";

  const outcomes = await mapPool(pairs, 6, async (pair) => {
    const location = locations.get(pair.locationId);
    if (!location || !location.is_listed || !location.is_active) {
      return { locationId: pair.locationId, bucket: "none_soon" as const };
    }

    const today = formatInSalonZone(new Date(), "yyyy-MM-dd", location.timezone);
    const start = zonedWallTimeToUtc(today, "00:00:00", location.timezone);
    const end = zonedWallTimeToUtc(addCalendarDays(today, 6), "23:59:59", location.timezone);

    try {
      const dates = await getAvailabilityHandler({
        companyId: location.company_id,
        services: [{ serviceId: pair.serviceId, serviceVariantId: pair.serviceVariantId }],
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        locationId: location.id,
      });
      return {
        locationId: pair.locationId,
        bucket: bucketForDates(Object.keys(dates), today),
      };
    } catch (err) {
      if (err instanceof BookingLocationError) {
        return { locationId: pair.locationId, bucket: "none_soon" as const };
      }
      throw err;
    }
  });

  for (const outcome of outcomes) {
    results[outcome.locationId] = soonerBucket(results[outcome.locationId] ?? "none_soon", outcome.bucket);
  }

  console.log(JSON.stringify({
    msg: "marketplace-next-available",
    pairCount: pairs.length,
    locationCount: locationIds.length,
    elapsedMs: Date.now() - started,
  }));

  return results;
}
