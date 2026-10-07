import Link from "next/link";
import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  InfoIcon,
} from "lucide-react";
import type { SalonCard as SalonCardData } from "@/data/marketplace";
import { treatmentEditorial } from "@/data/treatments";
import { SalonCard } from "@/components/marketplace/SalonCard";
import { SearchForm } from "@/components/marketplace/SearchForm";
import { getCopy } from "@/lib/copy";
import {
  cityNames,
  localeConfig,
  routeFor,
  treatmentNames,
  type CityKey,
  type Locale,
  type TreatmentKey,
} from "@/lib/i18n";

type TreatmentLandingProps = {
  locale: Locale;
  treatment: TreatmentKey;
  city?: CityKey;
  salons: SalonCardData[];
};

function suggestedCities(locale: Locale): CityKey[] {
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

export function TreatmentLanding({
  locale,
  treatment,
  city,
  salons,
}: TreatmentLandingProps) {
  const copy = getCopy(locale);
  const language = localeConfig[locale].language;
  const name = treatmentNames[treatment][language];
  const cityName = city ? cityNames[city][language] : null;
  const editorial = treatmentEditorial[treatment][language];
  return (
    <>
      <section className="border-b border-line bg-white pb-16 pt-10 md:pb-24 md:pt-14">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted"
          >
            <Link href={routeFor(locale, { kind: "home" })}>Gleami</Link>
            <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            <Link href={routeFor(locale, { kind: "treatments" })}>
              {copy.nav.treatments}
            </Link>
            <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            <Link href={routeFor(locale, { kind: "treatment", treatment })}>
              {name}
            </Link>
            {cityName ? (
              <>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                <span className="text-ink">{cityName}</span>
              </>
            ) : null}
          </nav>
          <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="text-[14px] font-medium text-rose-600">
                {copy.nav.treatments}
              </p>
              <h1 className="mt-4 text-balance text-[46px] font-semibold leading-[1.02] tracking-tightest md:text-[72px]">
                {cityName
                  ? copy.treatment.localTitle(name, cityName)
                  : copy.treatment.findTitle(name)}
              </h1>
            </div>
            <p className="text-[18px] leading-relaxed text-muted lg:col-span-4 lg:pb-2">
              {cityName
                ? copy.treatment.localDescription(name, cityName)
                : copy.treatment.findDescription(name)}
            </p>
          </div>
          <div className="mt-10">
            <SearchForm
              locale={locale}
              defaultQuery={name}
              defaultPlace={cityName ?? ""}
              compact
            />
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <h2 className="text-[32px] font-semibold tracking-tight md:text-[42px]">
              {copy.treatment.guideTitle}
            </h2>
            <div className="mt-6 space-y-5 text-[16px] leading-7 text-muted">
              <p>{editorial.summary}</p>
              <p>{editorial.detail}</p>
              <p>{copy.treatment.guideBody}</p>
            </div>
          </div>
          <aside className="lg:col-span-5">
            <div className="rounded-[28px] bg-white p-7 ring-1 ring-line">
              <div className="flex gap-3">
                <ClockIcon
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-rose-700"
                />
                <p className="text-[14px] leading-relaxed text-muted">
                  {editorial.duration}
                </p>
              </div>
              <div className="mt-5 flex gap-3 border-t border-line pt-5">
                <InfoIcon
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-sand-700"
                />
                <p className="text-[14px] leading-relaxed text-muted">
                  {editorial.goodToKnow}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[28px] bg-sage-50 p-7 ring-1 ring-sage-100">
              <h3 className="font-semibold">{copy.treatment.qualityTitle}</h3>
              <ul className="mt-4 space-y-3">
                {copy.treatment.qualityItems.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[14px] leading-relaxed text-muted"
                  >
                    <CheckIcon
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-sage-700"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-[14px] font-medium text-rose-600">
                {copy.consumer.eyebrow}
              </p>
              <h2 className="mt-3 text-[34px] font-semibold tracking-tight md:text-[48px]">
                {cityName
                  ? copy.treatment.localTitle(name, cityName)
                  : copy.treatment.findTitle(name)}
              </h2>
            </div>
            <p className="text-[14px] text-muted">
              {copy.consumer.salonsCount(salons.length)}
            </p>
          </div>
          {salons.length > 0 ? (
            <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {salons.map((salon) => (
                <SalonCard key={salon.id} locale={locale} salon={salon} />
              ))}
            </div>
          ) : (
            <p className="mt-10 rounded-2xl bg-canvas p-7 text-center text-muted ring-1 ring-line">
              {copy.consumer.noResults}
            </p>
          )}
        </div>
      </section>

      {!city ? (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <h2 className="text-[30px] font-semibold tracking-tight">
              {copy.consumer.popularTitle}
            </h2>
            <div className="mt-7 flex flex-wrap gap-3">
              {suggestedCities(locale).map((item) => (
                <Link
                  key={item}
                  href={routeFor(locale, {
                    kind: "local-treatment",
                    treatment,
                    city: item,
                  })}
                  className="rounded-full bg-white px-4 py-2.5 text-[14px] font-medium ring-1 ring-line transition hover:ring-ink/30"
                >
                  {name} · {cityNames[item][language]}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
