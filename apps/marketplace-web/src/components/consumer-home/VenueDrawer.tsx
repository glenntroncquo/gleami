"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2Icon, MapPinIcon, StarIcon, XIcon } from "lucide-react";
import { BookingSuccess } from "./BookingSuccess";
import { formatCount, formatDuration, formatPrice, formatWeekday } from "./format";
import { useBooking } from "./useBooking";
import type { Venue } from "./types";

type VenueDrawerProps = {
  venue: Venue | null;
  onClose: () => void;
};

const ease = [0.23, 1, 0.32, 1] as const;

export function VenueDrawer({ venue, onClose }: VenueDrawerProps) {
  const booking = useBooking(venue);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!venue) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [venue, onClose]);

  return (
    <AnimatePresence>
      {venue ? (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-navy/40"
            aria-hidden="true"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="venue-title"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ duration: 0.28, ease }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col bg-white shadow-float"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-navy shadow-soft transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
            >
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            {booking.status === "success" && booking.service && booking.time ? (
              <BookingSuccess
                venue={venue}
                service={booking.service}
                dayLabel={booking.dayLabel}
                time={booking.time}
                onDone={onClose}
              />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <img
                    src={venue.image}
                    alt={`${venue.name} interior`}
                    style={{ objectPosition: venue.imagePosition }}
                    className="h-56 w-full object-cover sm:h-64"
                  />
                  <div className="px-6 pb-10 pt-6 sm:px-8">
                    <h2 id="venue-title" className="text-[28px] font-semibold tracking-[-0.025em] text-navy">
                      {venue.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                      <span className="flex items-center gap-1 font-semibold text-navy">
                        <StarIcon className="h-4 w-4 fill-star text-star" aria-hidden="true" />
                        {venue.rating.toFixed(1)}
                        <span className="font-normal text-ink-muted">({formatCount(venue.reviews)} reviews)</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                        {venue.address}
                      </span>
                    </div>

                    <h3 className="mt-9 text-lg font-semibold text-navy">Choose a service</h3>
                    <div className="mt-3 space-y-2" role="radiogroup" aria-label="Services">
                      {venue.services.map((service) => {
                        const selected = service.id === booking.serviceId;
                        return (
                          <button
                            key={service.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => booking.setServiceId(service.id)}
                            className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri ${
                              selected ? "border-peri bg-peri-tint" : "border-line hover:border-line-strong"
                            }`}
                          >
                            <span
                              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 ${
                                selected ? "border-peri" : "border-line-strong"
                              }`}
                              aria-hidden="true"
                            >
                              {selected ? <span className="h-2.5 w-2.5 rounded-full bg-peri" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-navy">{service.name}</span>
                              <span className="mt-0.5 block text-sm text-ink-muted">{service.description}</span>
                              <span className="mt-1.5 block text-sm text-ink-faint">{formatDuration(service.duration)}</span>
                            </span>
                            <span className="font-semibold text-navy">{formatPrice(service.price)}</span>
                          </button>
                        );
                      })}
                    </div>

                    <h3 className="mt-9 text-lg font-semibold text-navy">Pick a time</h3>
                    <div className="-mx-6 mt-3 overflow-x-auto px-6 sm:-mx-8 sm:px-8">
                      <div className="flex w-max gap-2">
                        {booking.days.map((day, index) => {
                          const active = index === booking.dayIndex;
                          return (
                            <button
                              key={day.toISOString()}
                              type="button"
                              aria-pressed={active}
                              onClick={() => booking.selectDay(index)}
                              className={`flex w-[60px] flex-col items-center rounded-2xl py-2.5 transition-colors duration-150 ${
                                active ? "bg-navy text-white" : "bg-surface text-navy hover:bg-peri-soft"
                              }`}
                            >
                              <span className={`text-xs ${active ? "text-white/80" : "text-ink-muted"}`}>
                                {index === 0 ? "Today" : formatWeekday(day)}
                              </span>
                              <span className="mt-0.5 text-lg font-semibold">{day.getDate()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {booking.slots.map((slot) => {
                        const active = slot.time === booking.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            aria-pressed={active}
                            onClick={() => booking.setTime(slot.time)}
                            className={`h-11 rounded-xl text-[15px] font-medium transition-colors duration-150 disabled:cursor-not-allowed ${
                              active
                                ? "bg-peri text-white"
                                : slot.available
                                  ? "border border-line text-navy hover:border-peri hover:text-peri-dark"
                                  : "bg-page text-ink-faint line-through"
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <footer className="flex items-center justify-between gap-4 border-t border-line bg-white px-6 py-4 sm:px-8">
                  <div className="min-w-0">
                    {booking.service ? (
                      <>
                        <p className="truncate font-semibold text-navy">
                          {booking.service.name} · {formatPrice(booking.service.price)}
                        </p>
                        <p className="truncate text-sm text-ink-muted">
                          {booking.time ? `${booking.dayLabel}, ${booking.time}` : "Select a time"} ·{" "}
                          {formatDuration(booking.service.duration)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted">Select a service to continue</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!booking.canBook}
                    onClick={booking.confirm}
                    className="inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-navy px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-faint"
                  >
                    {booking.status === "submitting" ? (
                      <>
                        <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Booking…
                      </>
                    ) : (
                      "Book now"
                    )}
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
