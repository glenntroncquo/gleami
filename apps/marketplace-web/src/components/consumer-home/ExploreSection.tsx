"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { RecoveryPanel } from "@/components/recovery/RecoveryPanel";
import type { Locale } from "@/lib/i18n";
import { CategoryPills } from "./CategoryPills";
import type { HomeCopy } from "./messages";
import { VenueCard, type HomeSalon } from "./VenueCard";

type ExploreSectionProps = {
  locale: Locale;
  venues: HomeSalon[];
  favorites: HomeSalon[];
  savedIds: Set<string>;
  showFavorite: boolean;
  query: string;
  nearby: boolean;
  copy: HomeCopy;
  categoryId: string | null;
  categories: Array<{ id: string | null; name: string }>;
  seeAllHref: string;
  loading: boolean;
  categoriesReady: boolean;
  onCategoryChange: (id: string | null) => void;
  onClearQuery: () => void;
  onToggleFavorite: (id: string) => void;
};

export function ExploreSection({
  locale,
  venues,
  favorites,
  savedIds,
  showFavorite,
  query,
  nearby,
  copy,
  categoryId,
  categories,
  seeAllHref,
  loading,
  categoriesReady,
  onCategoryChange,
  onClearQuery,
  onToggleFavorite,
}: ExploreSectionProps) {
  return (
    <section
      id="explore"
      aria-labelledby="explore-title"
      aria-busy={loading || !categoriesReady}
      className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 md:px-8 lg:pb-32"
    >
      {favorites.length > 0 ? (
        <div className="mb-12">
          <h2 className="text-xl font-semibold tracking-tight text-navy">{copy.favorites}</h2>
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
            {query ? copy.exploreResults(query) : nearby ? copy.exploreNear : copy.exploreBelgium}
          </h2>
          <p className="mt-2 text-ink-muted">
            {loading && venues.length === 0 ? (
              <>
                <span className="sr-only">{copy.loading}</span>
                <span className="inline-block h-4 w-40 rounded-full bg-navy/10 motion-safe:animate-pulse" />
              </>
            ) : nearby ? (
              copy.countNear(venues.length)
            ) : (
              copy.countBelgium(venues.length)
            )}
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
              {copy.clearSearch}
            </button>
          ) : null}
          <Link href={seeAllHref} className="text-sm font-semibold text-navy underline-offset-2 hover:underline">
            {copy.seeAll}
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {categoriesReady ? (
          <CategoryPills
            categories={categories}
            active={categoryId}
            label={copy.filterCategories}
            onChange={onCategoryChange}
          />
        ) : (
          <CategoryPillsSkeleton />
        )}
      </div>

      <div className="mt-10">
        {loading && venues.length === 0 ? (
          <SalonGridSkeleton />
        ) : venues.length === 0 ? (
          <RecoveryPanel
            locale={locale}
            onReset={() => {
              onClearQuery();
              onCategoryChange(null);
            }}
          />
        ) : (
          <motion.div layout className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      saveLabel={copy.save(venue.name)}
                      unsaveLabel={copy.unsave(venue.name)}
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

function CategoryPillsSkeleton() {
  return (
    <div className="-mx-5 overflow-hidden px-5 md:mx-0 md:px-0" aria-hidden="true">
      <div className="flex w-max gap-2">
        {["w-32", "w-28", "w-36", "w-24", "w-32", "w-28"].map((width, index) => (
          <span key={index} className={`h-11 rounded-full bg-navy/10 motion-safe:animate-pulse ${width}`} />
        ))}
      </div>
    </div>
  );
}

function SalonGridSkeleton() {
  return (
    <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col">
          <div className="aspect-[3/2] w-full rounded-xl bg-navy/10 motion-safe:animate-pulse" />
          <div className="mt-2.5 h-3.5 w-2/3 rounded-full bg-navy/10 motion-safe:animate-pulse" />
          <div className="mt-1.5 h-3 w-1/2 rounded-full bg-navy/10 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}
