"use client";

import { HeartIcon, StarIcon } from "lucide-react";
import { formatCount } from "./format";
import type { Venue } from "./types";

type VenueCardProps = {
  venue: Venue;
  isFavorite: boolean;
  onOpen: (venue: Venue) => void;
  onToggleFavorite: (id: string) => void;
};

export function VenueCard({ venue, isFavorite, onOpen, onToggleFavorite }: VenueCardProps) {
  return (
    <article className="group relative flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(venue)}
        className="flex flex-1 flex-col rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-4 focus-visible:ring-offset-page"
      >
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface">
          <img
            src={venue.image}
            alt={`${venue.name} interior`}
            style={{ objectPosition: venue.imagePosition }}
            className="h-full w-full object-cover transition-transform duration-300 ease-snappy group-hover:scale-[1.03]"
          />
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <h3 className="truncate text-[17px] font-semibold text-navy">{venue.name}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy">
            <StarIcon className="h-4 w-4 fill-star text-star" aria-hidden="true" />
            {venue.rating.toFixed(1)}
            <span className="font-normal text-ink-faint">({formatCount(venue.reviews)})</span>
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {venue.area} · {venue.distance} · {venue.category}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3 text-sm">
          <span className="rounded-full bg-peri-tint px-2.5 py-1 font-medium text-peri-dark">{venue.nextSlot}</span>
          <span className="text-ink-muted">
            from <span className="font-semibold text-navy">£{venue.priceFrom}</span>
          </span>
        </div>
      </button>
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
    </article>
  );
}
