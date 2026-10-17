"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { CategoryPills } from "./CategoryPills";
import { VenueCard, type HomeSalon } from "./VenueCard";

type ExploreSectionProps = {
  venues: HomeSalon[];
  favorites: HomeSalon[];
  savedIds: Set<string>;
  showFavorite: boolean;
  query: string;
  placeLabel: string;
  categoryId: string | null;
  categories: Array<{ id: string | null; name: string }>;
  seeAllHref: string;
  loading: boolean;
  onCategoryChange: (id: string | null) => void;
  onClearQuery: () => void;
  onToggleFavorite: (id: string) => void;
};

export function ExploreSection({
  venues,
  favorites,
  savedIds,
  showFavorite,
  query,
  placeLabel,
  categoryId,
  categories,
  seeAllHref,
  loading,
  onCategoryChange,
  onClearQuery,
  onToggleFavorite,
}: ExploreSectionProps) {
  return (
    <section id="explore" aria-labelledby="explore-title" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 md:px-8 lg:pb-32">
      {favorites.length > 0 ? (
        <div className="mb-12">
          <h2 className="text-xl font-semibold tracking-tight text-navy">Favorieten</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {favorites.map((venue) => (
              <Link key={venue.id} href={venue.href} className="w-60 shrink-0">
                <div className="h-36 overflow-hidden rounded-2xl bg-surface">
                  {venue.image ? (
                    <img src={venue.image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="mt-3 truncate font-semibold text-navy">{venue.name}</p>
                <p className="text-sm text-ink-muted">{venue.city}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="explore-title" className="text-3xl font-semibold tracking-[-0.025em] text-navy md:text-[40px]">
            {query ? `Results for “${query}”` : "Recommended near you"}
          </h2>
          <p className="mt-2 text-ink-muted">
            {loading
              ? "Looking for salons…"
              : `${venues.length} ${venues.length === 1 ? "salon" : "salons"} near ${placeLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <Link href={seeAllHref} className="text-sm font-semibold text-navy underline-offset-2 hover:underline">
            See all
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <CategoryPills categories={categories} active={categoryId} onChange={onCategoryChange} />
      </div>

      <div className="mt-10">
        {venues.length === 0 && !loading ? (
          <div className="rounded-3xl bg-surface px-6 py-16 text-center">
            <p className="text-lg font-semibold text-navy">Nothing matches that just yet</p>
            <p className="mx-auto mt-2 max-w-sm text-ink-muted">
              Try a different treatment, or browse everything available near you.
            </p>
            <button
              type="button"
              onClick={() => {
                onClearQuery();
                onCategoryChange(null);
              }}
              className="mt-6 rounded-full bg-navy px-5 py-2.5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700"
            >
              Show all salons
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
                      isFavorite={savedIds.has(venue.id)}
                      showFavorite={showFavorite}
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
