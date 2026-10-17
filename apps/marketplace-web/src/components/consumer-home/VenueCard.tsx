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
  onToggleFavorite: (id: string) => void;
};

export function VenueCard({ venue, isFavorite, showFavorite, onToggleFavorite }: VenueCardProps) {
  return (
    <article className="group relative flex flex-col">
      <Link
        href={venue.href}
        className="flex flex-1 flex-col rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-4 focus-visible:ring-offset-page"
      >
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface">
          {venue.image ? (
            <img
              src={venue.image}
              alt={`${venue.name}, ${venue.city}`}
              className="h-full w-full object-cover transition-transform duration-300 ease-snappy group-hover:scale-[1.03]"
            />
          ) : null}
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <h3 className="truncate text-[17px] font-semibold text-navy">{venue.name}</h3>
          {venue.rating != null && venue.reviews > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy">
              <StarIcon className="h-4 w-4 fill-star text-star" aria-hidden="true" />
              {venue.rating.toFixed(1)}
              <span className="font-normal text-ink-faint">({venue.reviews})</span>
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {[venue.city, venue.distance, venue.category].filter(Boolean).join(" · ")}
        </p>
      </Link>
      {showFavorite ? (
        <button
          type="button"
          aria-label={isFavorite ? `Remove ${venue.name} from saved` : `Save ${venue.name}`}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(venue.id)}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-soft transition-transform duration-150 ease-snappy active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
        >
          <HeartIcon
            className={`h-[18px] w-[18px] transition-colors duration-150 ${
              isFavorite ? "fill-orchid text-orchid" : "text-navy"
            }`}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </article>
  );
}
