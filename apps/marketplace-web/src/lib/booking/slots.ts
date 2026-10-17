export type AvailabilitySlot = {
  staff_id: string;
  first_name: string;
  last_name: string;
  start_time: string;
  end_time: string;
  available_start: string;
  available_end: string;
};

export type AvailabilityDay = {
  staff: Record<
    string,
    {
      slots: AvailabilitySlot[];
    }
  >;
};

export type DaySlot = {
  time: string;
  options: AvailabilitySlot[];
};

export function mergeDaySlots(day: AvailabilityDay | undefined): DaySlot[] {
  if (!day) return [];
  const byTime = new Map<string, AvailabilitySlot[]>();
  for (const group of Object.values(day.staff ?? {})) {
    for (const slot of group.slots ?? []) {
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
  return [slot.first_name, slot.last_name].filter(Boolean).join(" ").trim();
}
