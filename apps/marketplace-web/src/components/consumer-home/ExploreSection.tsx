"use client";

import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { CategoryPills } from "./CategoryPills";
import { categories } from "./data";
import { VenueCard } from "./VenueCard";
import type { Category, Venue } from "./types";

type ExploreSectionProps = {
  venues: Venue[];
  query: string;
  category: "All" | Category;
  favorites: Set<string>;
  onCategoryChange: (category: "All" | Category) => void;
  onClearQuery: () => void;
  onOpenVenue: (venue: Venue) => void;
  onToggleFavorite: (id: string) => void;
};

export function ExploreSection({
  venues,
  query,
  category,
  favorites,
  onCategoryChange,
  onClearQuery,
  onOpenVenue,
  onToggleFavorite,
}: ExploreSectionProps) {
  return (
    <section id="explore" aria-labelledby="explore-title" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 md:px-8 lg:pb-32">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="explore-title" className="text-3xl font-semibold tracking-[-0.025em] text-navy md:text-[40px]">
            {query ? `Results for “${query}”` : "Recommended near you"}
          </h2>
          <p className="mt-2 text-ink-muted">
            {venues.length} {venues.length === 1 ? "venue" : "venues"} in London with availability this week
          </p>
        </div>
        {query ? (
          <button
            type="button"
            onClick={onClearQuery}
            className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-semibold text-peri-dark transition-colors duration-150 hover:bg-peri-tint md:self-auto"
          >
            <XIcon className="h-4 w-4" aria-hidden="true" />
            Clear search
          </button>
        ) : null}
      </div>

      <div className="mt-8">
        <CategoryPills categories={categories} active={category} onChange={onCategoryChange} />
      </div>

      <div className="mt-10">
        {venues.length === 0 ? (
          <div className="rounded-3xl bg-surface px-6 py-16 text-center">
            <p className="text-lg font-semibold text-navy">Nothing matches that just yet</p>
            <p className="mx-auto mt-2 max-w-sm text-ink-muted">
              Try a different treatment, or browse everything available near you.
            </p>
            <button
              type="button"
              onClick={() => {
                onClearQuery();
                onCategoryChange("All");
              }}
              className="mt-6 rounded-full bg-navy px-5 py-2.5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700"
            >
              Show all venues
            </button>
          </div>
        ) : (
          <motion.div layout className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {venues.map((venue) => (
                <motion.div
                  key={venue.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="flex"
                >
                  <div className="flex w-full flex-col">
                    <VenueCard
                      venue={venue}
                      isFavorite={favorites.has(venue.id)}
                      onOpen={onOpenVenue}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
