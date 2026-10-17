import type { CatalogItem } from "./catalog";
import type { AvailabilitySlot } from "./slots";

export type DraftItem = {
  serviceId: string;
  serviceName: string;
  variantId: string;
  variantName: string;
  price: number;
  durationMinutes: number;
};

export type DraftSlot = {
  start: string;
  end: string;
  time: string;
  staffId: string;
  staffName: string;
};

export type BookingDraft = {
  items: DraftItem[];
  dayKey: string | null;
  slot: DraftSlot | null;
  note: string;
  bookingId: string | null;
};

const EMPTY: BookingDraft = {
  items: [],
  dayKey: null,
  slot: null,
  note: "",
  bookingId: null,
};

function key(slug: string): string {
  return `gleami.booking.${slug}`;
}

export function readDraft(slug: string): BookingDraft {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(key(slug));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BookingDraft>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      dayKey: parsed.dayKey ?? null,
      slot: parsed.slot ?? null,
      note: parsed.note ?? "",
      bookingId: parsed.bookingId ?? null,
    };
  } catch {
    return EMPTY;
  }
}

export function writeDraft(slug: string, draft: BookingDraft): void {
  window.sessionStorage.setItem(key(slug), JSON.stringify(draft));
}

export function itemToDraft(item: CatalogItem): DraftItem {
  return {
    serviceId: item.service.serviceId,
    serviceName: item.service.name,
    variantId: item.variant.serviceVariantId,
    variantName: item.variant.name,
    price: item.variant.price,
    durationMinutes: item.variant.durationMinutes,
  };
}

export function slotToDraft(slot: AvailabilitySlot): DraftSlot {
  return {
    start: slot.available_start,
    end: slot.available_end,
    time: slot.start_time,
    staffId: slot.staff_id,
    staffName: [slot.first_name, slot.last_name].filter(Boolean).join(" ").trim(),
  };
}
