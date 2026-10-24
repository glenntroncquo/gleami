"use client";

import Link from "next/link";
import { HeartIcon, StarIcon } from "lucide-react";

export type HomeSalon = {
  id: string;
  name: string;
  href: string;
  image: string | null;
  city: string;
  distance: string | null;
  category: string;
  rating: number | null;
  reviews: number;
};

type VenueCardProps = {
  venue: HomeSalon;
  isFavorite: boolean;
  showFavorite: boolean;
  saveLabel: string;
  unsaveLabel: string;
  onToggleFavorite: (id: string) => void;
};

export function VenueCard({
  venue,
  isFavorite,
  showFavorite,
  saveLabel,
  unsaveLabel,
  onToggleFavorite,
}: VenueCardProps) {
  return (
    <article className="group relative flex flex-col">
      <Link
        href={venue.href}
        className="flex flex-1 flex-col rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-4 focus-visible:ring-offset-page"
      >
        <div className="aspect-[3/2] w-full overflow-hidden rounded-xl bg-surface">
          {venue.image ? (
            <img
              src={venue.image}
              alt={`${venue.name}, ${venue.city}`}
              className="h-full w-full object-cover transition-transform duration-300 ease-snappy group-hover:scale-[1.03]"
            />
          ) : null}
        </div>
        <div className="mt-2.5 flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold text-navy">{venue.name}</h3>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-navy">
            <StarIcon className="h-3.5 w-3.5 fill-star text-star" aria-hidden="true" />
            {venue.rating != null ? venue.rating.toFixed(1) : "-"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
          {[venue.city, venue.distance, venue.category].filter(Boolean).join(" · ")}
        </p>
      </Link>
      {showFavorite ? (
        <button
          type="button"
          aria-label={isFavorite ? unsaveLabel : saveLabel}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(venue.id)}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 shadow-soft transition-transform duration-150 ease-snappy active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
        >
          <HeartIcon
            className={`h-3.5 w-3.5 transition-colors duration-150 ${
              isFavorite ? "fill-orchid text-orchid" : "text-navy"
            }`}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </article>
  );
}
