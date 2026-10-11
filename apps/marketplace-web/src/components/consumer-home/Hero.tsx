"use client";

import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";
import { popularSearches, venues } from "./data";
import { SearchBar } from "./SearchBar";
import type { Venue } from "./types";

type HeroProps = {
  onSearch: (query: string) => void;
  onOpenVenue: (venue: Venue) => void;
};

const heroOrder = ["fade-fellow", "atelier-nord", "lilac-nail-bar", "stillwater", "dermis"];
const tileHeights = ["lg:h-[300px]", "lg:h-[360px]", "lg:h-[420px]", "lg:h-[360px]", "lg:h-[300px]"];
const ease = [0.23, 1, 0.32, 1] as const;

export function Hero({ onSearch, onOpenVenue }: HeroProps) {
  const tiles = heroOrder
    .map((id) => venues.find((venue) => venue.id === id))
    .filter((venue): venue is Venue => Boolean(venue));

  return (
    <section className="overflow-hidden pb-20 pt-12 lg:pb-28 lg:pt-20">
      <div className="mx-auto max-w-5xl px-5 text-center md:px-8">
        <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-navy sm:text-6xl lg:text-[84px]">
          Beauty & wellness,
          <br />
          booked <span className="text-peri">beautifully.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          Find and book the best salons, barbers and spas near you. Real availability, instant confirmation.
        </p>

        <div className="mx-auto mt-10 max-w-4xl text-left">
          <SearchBar onSearch={onSearch} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="mr-1 text-ink-faint">Popular</span>
          {popularSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => onSearch(term)}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 font-medium text-navy transition-colors duration-150 hover:border-peri-light hover:bg-peri-tint"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-7xl lg:mt-20 lg:px-8">
        <ul className="flex snap-x gap-4 overflow-x-auto px-5 pb-2 lg:grid lg:grid-cols-5 lg:items-end lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
          {tiles.map((venue, index) => (
            <motion.li
              key={venue.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05, ease }}
              className="w-[240px] shrink-0 snap-start lg:w-auto"
            >
              <button
                type="button"
                onClick={() => onOpenVenue(venue)}
                aria-label={`Book at ${venue.name}, next available ${venue.nextSlot}`}
                className={`group relative block h-[320px] w-full overflow-hidden rounded-[24px] bg-surface text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-4 focus-visible:ring-offset-page ${tileHeights[index]}`}
              >
                <img
                  src={venue.image}
                  alt=""
                  style={{ objectPosition: venue.imagePosition }}
                  className="h-full w-full object-cover transition-transform duration-300 ease-snappy group-hover:scale-[1.04]"
                />
                <span className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 p-3 shadow-soft backdrop-blur">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-navy">{venue.name}</span>
                    <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-navy">
                      <StarIcon className="h-3.5 w-3.5 fill-star text-star" aria-hidden="true" />
                      {venue.rating.toFixed(1)}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-peri-dark">
                    <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
                    {venue.nextSlot}
                  </span>
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
