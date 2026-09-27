import type { AvailabilityDay, AvailabilitySlot } from '@/src/api/booking-types';

/** One clock time in the grid, with every staff member free at that time. */
export type DaySlot = {
  time: string;
  options: AvailabilitySlot[];
};

/**
 * `availability-list` groups slots per staff member. The picker shows times, so
 * the same time offered by two people collapses into one button holding both.
 */
export function mergeDaySlots(day: AvailabilityDay | undefined): DaySlot[] {
  if (!day) return [];
  const byTime = new Map<string, AvailabilitySlot[]>();
  for (const group of Object.values(day.staff)) {
    for (const slot of group.slots) {
      const options = byTime.get(slot.start_time);
      if (options) options.push(slot);
      else byTime.set(slot.start_time, [slot]);
    }
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, options]) => ({ time, options }));
}

export function staffName(slot: AvailabilitySlot): string {
  return [slot.first_name, slot.last_name].filter(Boolean).join(' ').trim();
}
