import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import type { SalonCard as SalonCardData } from "@/data/marketplace";
import { hasLiveMarketplace } from "@/data/marketplace";
import { SearchForm } from "@/components/marketplace/SearchForm";
import { SalonCard } from "@/components/marketplace/SalonCard";
import { getCopy } from "@/lib/copy";
import { routeFor, type Locale, type RouteDescriptor } from "@/lib/i18n";

type SalonDirectoryProps = {
  locale: Locale;
  route: RouteDescriptor;
  title: string;
  description: string;
  salons: SalonCardData[];
  eyebrow?: string;
  query?: string;
  place?: string;
};

export function SalonDirectory({
  locale,
  route,
  title,
  description,
  salons,
  eyebrow,
  query,
  place,
}: SalonDirectoryProps) {
  const copy = getCopy(locale);

  return (
    <>
      <section className="border-b border-line bg-white pb-12 pt-12 md:pb-16 md:pt-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[13px] text-muted"
          >
            <Link href={routeFor(locale, { kind: "home" })}>Gleami</Link>
            <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            <Link href={routeFor(locale, { kind: "salons" })}>
              {copy.nav.discover}
            </Link>
            {route.kind !== "salons" ? (
              <>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                <span className="text-ink">{title}</span>
              </>
            ) : null}
          </nav>
          {eyebrow ? (
            <p className="mt-10 text-[14px] font-medium text-rose-600">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`max-w-4xl text-balance text-[42px] font-semibold leading-[1.04] tracking-tightest md:text-[64px] ${
              eyebrow ? "mt-3" : "mt-10"
            }`}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-[17px] leading-relaxed text-muted md:text-[19px]">
            {description}
          </p>
          <div className="mt-9">
            <SearchForm
              locale={locale}
              defaultQuery={query}
              defaultPlace={place}
              compact
            />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[14px] font-medium">
              {copy.consumer.salonsCount(salons.length)}
            </p>
            {query || place ? (
              <Link
                href={routeFor(locale, route)}
                className="text-[13px] font-medium text-muted underline underline-offset-4 hover:text-ink"
              >
                {copy.actions.viewAll}
              </Link>
            ) : null}
          </div>

          {!hasLiveMarketplace() ? (
            <div className="mt-6 rounded-2xl bg-sand-50 px-4 py-3 text-[13px] text-sand-700 ring-1 ring-sand-100">
              {copy.consumer.demoNotice}
            </div>
          ) : null}

          {salons.length > 0 ? (
            <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {salons.map((salon, index) => (
                <SalonCard
                  key={salon.id}
                  locale={locale}
                  salon={salon}
                  priority={index < 3}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[28px] bg-white px-6 py-16 text-center ring-1 ring-line">
              <p className="text-[17px] font-medium">{copy.consumer.noResults}</p>
              <Link
                href={routeFor(locale, { kind: "salons" })}
                className="mt-4 inline-block text-[14px] text-muted underline underline-offset-4 hover:text-ink"
              >
                {copy.actions.viewAll}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
