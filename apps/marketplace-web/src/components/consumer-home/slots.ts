import type { Category, Venue } from "./types";

export function filterVenues(list: Venue[], category: "All" | Category, query: string): Venue[] {
  const normalized = query.trim().toLowerCase();
  return list.filter((venue) => {
    if (category !== "All" && venue.category !== category) return false;
    if (!normalized) return true;
    return (
      venue.name.toLowerCase().includes(normalized) ||
      venue.category.toLowerCase().includes(normalized) ||
      venue.area.toLowerCase().includes(normalized) ||
      venue.services.some((service) => service.name.toLowerCase().includes(normalized))
    );
  });
}

export interface Slot {
  time: string;
  available: boolean;
}

export function buildSlots(venueId: string, dayIndex: number): Slot[] {
  const seed = venueId.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const slots: Slot[] = [];
  for (let index = 0; index < 20; index += 1) {
    const hour = 9 + Math.floor(index / 2);
    const minutes = index % 2 === 0 ? "00" : "30";
    const available = (index * 7 + dayIndex * 3 + seed) % 4 !== 0 && !(dayIndex === 0 && index < 6);
    slots.push({ time: `${String(hour).padStart(2, "0")}:${minutes}`, available });
  }
  return slots;
}
