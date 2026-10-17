"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { StarIcon } from "lucide-react";
import { SearchBar } from "./SearchBar";
import type { HomeSalon } from "./VenueCard";

type HeroProps = {
  placeLabel: string;
  tiles: HomeSalon[];
  onSearch: (query: string) => void;
};

const tileHeights = ["lg:h-[300px]", "lg:h-[360px]", "lg:h-[420px]", "lg:h-[360px]", "lg:h-[300px]"];
const ease = [0.23, 1, 0.32, 1] as const;

export function Hero({ placeLabel, tiles, onSearch }: HeroProps) {
  return (
    <section className="overflow-hidden pb-20 pt-12 lg:pb-28 lg:pt-20">
      <div className="mx-auto max-w-5xl px-5 text-center md:px-8">
        <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-navy sm:text-6xl lg:text-[84px]">
          Beauty & wellness,
          <br />
          booked <span className="text-peri">beautifully.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          Find and book salons near {placeLabel}. Real availability, on Gleami.
        </p>

        <div className="mx-auto mt-10 max-w-4xl text-left">
          <SearchBar placeLabel={placeLabel} onSearch={onSearch} />
        </div>
      </div>

      {tiles.length > 0 ? (
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
                <Link
                  href={venue.href}
                  className={`group relative block h-[320px] w-full overflow-hidden rounded-[24px] bg-surface text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-4 focus-visible:ring-offset-page ${tileHeights[index] ?? ""}`}
                >
                  {venue.image ? (
                    <img
                      src={venue.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 ease-snappy group-hover:scale-[1.04]"
                    />
                  ) : null}
                  <span className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 p-3 shadow-soft backdrop-blur">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-navy">{venue.name}</span>
                      {venue.rating != null ? (
                        <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-navy">
                          <StarIcon className="h-3.5 w-3.5 fill-star text-star" aria-hidden="true" />
                          {venue.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">{venue.city}</span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
