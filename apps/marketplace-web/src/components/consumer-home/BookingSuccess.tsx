"use client";

import { motion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import { formatDuration, formatPrice } from "./format";
import type { Service, Venue } from "./types";

type BookingSuccessProps = {
  venue: Venue;
  service: Service;
  dayLabel: string;
  time: string;
  onDone: () => void;
};

export function BookingSuccess({ venue, service, dayLabel, time, onDone }: BookingSuccessProps) {
  const rows: Array<[string, string]> = [
    ["Where", venue.name],
    ["Service", service.name],
    ["When", `${dayLabel}, ${time}`],
    ["Duration", formatDuration(service.duration)],
  ];

  return (
    <div className="flex h-full flex-col justify-center px-6 py-10 sm:px-10">
      <motion.span
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="grid h-16 w-16 place-items-center rounded-full bg-green-light"
      >
        <CheckIcon className="h-8 w-8 text-green" strokeWidth={2.5} aria-hidden="true" />
      </motion.span>
      <h2 className="mt-6 text-3xl font-semibold tracking-[-0.025em] text-navy">You’re booked</h2>
      <p className="mt-2 text-ink-muted">
        A confirmation is on its way to your inbox. {venue.name} is looking forward to seeing you.
      </p>

      <dl className="mt-8 divide-y divide-line rounded-2xl bg-page px-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3.5 text-[15px]">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right font-medium text-navy">{value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-3.5 text-[15px]">
          <dt className="text-ink-muted">Pay at venue</dt>
          <dd className="text-lg font-semibold text-navy">{formatPrice(service.price)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onDone}
        className="mt-8 h-12 rounded-full bg-navy text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700"
      >
        Done
      </button>
      <p className="mt-4 text-center text-sm text-ink-faint">Free cancellation up to 24 hours before.</p>
    </div>
  );
}
