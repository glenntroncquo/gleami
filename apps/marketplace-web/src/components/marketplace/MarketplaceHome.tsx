import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  ScissorsIcon,
  SparklesIcon,
  SprayCanIcon,
} from "lucide-react";
import { getSalons, hasLiveMarketplace } from "@/data/marketplace";
import { getCopy } from "@/lib/copy";
import {
  cityNames,
  localeConfig,
  routeFor,
  treatmentNames,
  treatmentSlugs,
  type CityKey,
  type Locale,
  type TreatmentKey,
} from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SearchForm } from "@/components/marketplace/SearchForm";
import { SalonCard } from "@/components/marketplace/SalonCard";
import { SectionIntro } from "@/components/ui/SectionIntro";

type MarketplaceHomeProps = {
  locale: Locale;
};

const cityImages: Record<CityKey, string> = {
  amsterdam: "/b23af3a5-f1bd-4962-b0c7-fb3d1f6aaeb0.jpg",
  antwerp: "/7dffc13d-fe3b-49a8-b10d-0ab518d31b7a.jpg",
  brussels: "/bffac2f4-5acb-4c67-b55f-1909523c2416.jpg",
  cologne: "/bffac2f4-5acb-4c67-b55f-1909523c2416.jpg",
  ghent: "/8ac9a3fa-97f7-4191-ab3a-0564c2356ee1.jpg",
  kruishoutem: "/bffac2f4-5acb-4c67-b55f-1909523c2416.jpg",
  merelbeke: "/c22595c4-33c0-4e1b-9d3b-228dabf74ef8.jpg",
  paris: "/7dffc13d-fe3b-49a8-b10d-0ab518d31b7a.jpg",
};

function featuredCities(locale: Locale): CityKey[] {
  switch (localeConfig[locale].country) {
    case "BE":
      return ["ghent", "antwerp", "brussels"];
    case "NL":
      return ["amsterdam"];
    case "FR":
      return ["paris"];
    case "DE":
      return ["cologne"];
  }
}

const treatmentIcons = [
  ScissorsIcon,
  SparklesIcon,
  SprayCanIcon,
  BriefcaseBusinessIcon,
];

export async function MarketplaceHome({ locale }: MarketplaceHomeProps) {
  const copy = getCopy(locale);
  const language = localeConfig[locale].language;
  const salons = await getSalons({ locale, limit: 6 });
  const cities = featuredCities(locale);
  const treatments = Object.keys(treatmentSlugs) as TreatmentKey[];

  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-6 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-rose-100/50 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-5 text-center md:px-8">
          <p className="text-[14px] font-medium text-rose-600">
            {copy.consumer.eyebrow}
          </p>
          <h1 className="mx-auto mt-5 max-w-5xl text-balance text-[48px] font-semibold leading-[1.02] tracking-tightest sm:text-[64px] md:text-[80px] lg:text-[92px]">
            {copy.consumer.title}{" "}
            <span className="text-subtle">{copy.consumer.mutedTitle}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-[18px] leading-relaxed text-muted md:text-[21px]">
            {copy.consumer.description}
          </p>
          <div className="mt-10">
            <SearchForm locale={locale} />
          </div>
          {!hasLiveMarketplace() ? (
            <p className="mx-auto mt-4 max-w-xl text-[12px] text-muted">
              {copy.consumer.demoNotice}
            </p>
          ) : null}
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionIntro
            align="split"
            title={copy.consumer.categoriesTitle}
            description={copy.treatment.indexDescription}
          />
          <div className="mt-12 grid grid-cols-2 gap-3 md:mt-16 md:grid-cols-4">
            {treatments.map((treatment, index) => {
              const Icon = treatmentIcons[index];
              return (
                <Link
                  key={treatment}
                  href={routeFor(locale, { kind: "treatment", treatment })}
                  className="group rounded-[22px] bg-canvas p-5 ring-1 ring-line transition hover:-translate-y-1 hover:shadow-soft md:p-7"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-soft ring-1 ring-line">
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-7 text-[17px] font-semibold tracking-tight">
                    {treatmentNames[treatment][language]}
                  </p>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="mt-3 h-4 w-4 text-subtle transition group-hover:translate-x-1 group-hover:text-ink"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionIntro
            align="split"
            title={copy.consumer.popularTitle}
            description={copy.consumer.popularDescription}
          />
          <div
            className={`mt-14 grid gap-4 md:mt-20 ${
              cities.length === 1 ? "md:grid-cols-1" : "md:grid-cols-3"
            }`}
          >
            {cities.map((city) => (
              <Link
                key={city}
                href={routeFor(locale, { kind: "city", city })}
                className="group relative aspect-[4/3] overflow-hidden rounded-[28px] bg-ink"
              >
                <Image
                  src={cityImages[city]}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-70"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
                <span className="absolute inset-x-6 bottom-6 flex items-end justify-between text-white">
                  <span className="text-[26px] font-semibold tracking-tight">
                    {cityNames[city][language]}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink">
                    <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionIntro
            align="split"
            title={copy.consumer.featuredTitle}
            description={copy.consumer.featuredDescription}
          >
            <ButtonLink
              href={routeFor(locale, { kind: "salons" })}
              variant="secondary"
              arrow
            >
              {copy.actions.viewAll}
            </ButtonLink>
          </SectionIntro>
          {salons.length > 0 ? (
            <div className="mt-14 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
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
            <p className="mt-14 rounded-3xl bg-canvas p-8 text-center text-muted ring-1 ring-line">
              {copy.consumer.noResults}
            </p>
          )}
        </div>
      </section>

      <section className="px-3 py-10 md:px-6 md:py-16">
        <div className="mx-auto grid max-w-[1400px] overflow-hidden rounded-[32px] bg-ink px-6 py-16 text-white md:rounded-[48px] md:px-14 md:py-20 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-8">
            <p className="text-[14px] font-medium text-rose-300">
              {copy.nav.business}
            </p>
            <h2 className="mt-4 max-w-3xl text-balance text-[38px] font-semibold leading-[1.04] tracking-tightest md:text-[56px]">
              {copy.consumer.businessCalloutTitle}
            </h2>
            <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-white/65">
              {copy.consumer.businessCalloutBody}
            </p>
          </div>
          <div className="mt-8 flex lg:col-span-4 lg:mt-0 lg:justify-end">
            <ButtonLink
              href={routeFor(locale, { kind: "business" })}
              variant="inverse"
              size="lg"
              arrow
            >
              {copy.nav.business}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
