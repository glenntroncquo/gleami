import { useMemo, useState } from "react";
import { addDays, formatDayLabel } from "./format";
import { buildSlots } from "./slots";
import type { Venue } from "./types";

export type BookingStatus = "idle" | "submitting" | "success";

export function useBooking(venue: Venue | null) {
  const venueId = venue?.id ?? null;
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [status, setStatus] = useState<BookingStatus>("idle");
  const [activeVenueId, setActiveVenueId] = useState(venueId);

  if (activeVenueId !== venueId) {
    setActiveVenueId(venueId);
    setServiceId(null);
    setDayIndex(0);
    setTime(null);
    setStatus("idle");
  }

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(), index)), []);
  const slots = useMemo(() => (venue ? buildSlots(venue.id, dayIndex) : []), [venue, dayIndex]);
  const service = venue?.services.find((item) => item.id === serviceId) ?? null;
  const dayLabel = dayIndex === 0 ? "Today" : formatDayLabel(days[dayIndex]);

  function selectDay(index: number) {
    setDayIndex(index);
    setTime(null);
  }

  function confirm() {
    if (!service || !time) return;
    setStatus("submitting");
    window.setTimeout(() => setStatus("success"), 900);
  }

  return {
    days,
    slots,
    service,
    serviceId,
    setServiceId,
    dayIndex,
    selectDay,
    dayLabel,
    time,
    setTime,
    status,
    confirm,
    canBook: Boolean(service && time) && status === "idle",
  };
}
