import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon, MapPinIcon, StarIcon } from "lucide-react";
import type { SalonCard as SalonCardData } from "@/data/marketplace";
import { getCopy } from "@/lib/copy";
import { formatMoney, routeFor, type Locale } from "@/lib/i18n";

type SalonCardProps = {
  locale: Locale;
  salon: SalonCardData;
  priority?: boolean;
};

export function SalonCard({
  locale,
  salon,
  priority = false,
}: SalonCardProps) {
  const copy = getCopy(locale);
  const route = {
    kind: "salon" as const,
    city: salon.cityKey ?? salon.city,
    salon: salon.slug,
  };
  const image =
    salon.imageUrl ?? "/c22595c4-33c0-4e1b-9d3b-228dabf74ef8.jpg";

  return (
    <article className="group">
      <Link href={routeFor(locale, route)} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-shell">
          <Image
            src={image}
            alt={`${salon.name}, ${salon.city}`}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
          />
          <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft backdrop-blur">
            <ArrowUpRightIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          {salon.source === "demo" ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
              Preview
            </span>
          ) : null}
        </div>
        <div className="px-1 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-semibold tracking-tight">
                {salon.name}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                <MapPinIcon aria-hidden="true" className="h-3.5 w-3.5" />
                {salon.city}
              </p>
            </div>
            {salon.rating != null && salon.reviewCount > 0 ? (
              <p className="flex shrink-0 items-center gap-1 text-[13px] font-medium">
                <StarIcon
                  aria-hidden="true"
                  className="h-3.5 w-3.5 fill-ink"
                />
                {salon.rating.toFixed(1)}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
            {salon.treatmentNames.slice(0, 2).map((treatment) => (
              <span
                key={treatment}
                className="rounded-full bg-white px-2.5 py-1 text-muted ring-1 ring-line"
              >
                {treatment}
              </span>
            ))}
            {salon.minimumPrice != null ? (
              <span className="ml-auto font-medium text-ink">
                {copy.salon.from} {formatMoney(salon.minimumPrice, locale)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
