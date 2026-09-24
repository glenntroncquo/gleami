export type AvailabilityBucket = "today" | "tomorrow" | "this_week" | "none_soon";

const RANK: Record<AvailabilityBucket, number> = {
  today: 0,
  tomorrow: 1,
  this_week: 2,
  none_soon: 3,
};

export function addCalendarDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Coarse bucket for salon-local yyyy-MM-dd keys inside today..+6. */
export function bucketForDates(dates: string[], today: string): AvailabilityBucket {
  if (dates.length === 0) return "none_soon";
  const tomorrow = addCalendarDays(today, 1);
  const weekEnd = addCalendarDays(today, 6);
  if (dates.includes(today)) return "today";
  if (dates.includes(tomorrow)) return "tomorrow";
  if (dates.some((date) => date > tomorrow && date <= weekEnd)) return "this_week";
  return "none_soon";
}

export function soonerBucket(left: AvailabilityBucket, right: AvailabilityBucket): AvailabilityBucket {
  return RANK[left] <= RANK[right] ? left : right;
}
