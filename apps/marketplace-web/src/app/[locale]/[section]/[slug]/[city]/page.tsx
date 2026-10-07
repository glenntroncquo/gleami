import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TreatmentLanding } from "@/components/marketplace/TreatmentLanding";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSalons } from "@/data/marketplace";
import { getCopy } from "@/lib/copy";
import {
  cityKeyFromSlug,
  cityNames,
  isLocale,
  localeConfig,
  locales,
  localesForCity,
  localizedCitySlug,
  treatmentKeyFromSlug,
  treatmentNames,
  treatmentSlugs,
  type CityKey,
  type Locale,
  type TreatmentKey,
} from "@/lib/i18n";
import { createPageMetadata } from "@/lib/seo";
import {
  breadcrumbJsonLd,
  serviceJsonLd,
} from "@/lib/structured-data";

type Props = PageProps<"/[locale]/[section]/[slug]/[city]">;

const LOCAL_PAGE_MINIMUM_SALONS = 3;

const launchCities: Record<Locale, CityKey[]> = {
  "nl-be": ["ghent", "antwerp", "brussels"],
  "fr-be": ["ghent", "antwerp", "brussels"],
  "nl-nl": ["amsterdam"],
  "fr-fr": ["paris"],
  "de-de": ["cologne"],
};

function resolveParams(
  locale: Locale,
  section: string,
  slug: string,
  citySlug: string,
): { treatment: TreatmentKey; city: CityKey } | null {
  if (section !== localeConfig[locale].paths.treatments) return null;
  const treatment = treatmentKeyFromSlug(locale, slug);
  const city = cityKeyFromSlug(locale, citySlug);
  if (!treatment || !city) return null;
  if (!localesForCity(city).includes(locale)) return null;
  return { treatment, city };
}

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    launchCities[locale].flatMap((city) =>
      (Object.keys(treatmentSlugs) as TreatmentKey[]).map((treatment) => ({
        locale,
        section: localeConfig[locale].paths.treatments,
        slug: treatmentSlugs[treatment][locale],
        city: localizedCitySlug(locale, city),
      })),
    ),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const {
    locale: value,
    section,
    slug,
    city: citySlug,
  } = await params;
  if (!isLocale(value)) return {};
  const resolved = resolveParams(value, section, slug, citySlug);
  if (!resolved) return { robots: { index: false, follow: false } };
  const copy = getCopy(value);
  const language = localeConfig[value].language;
  const treatmentName = treatmentNames[resolved.treatment][language];
  const cityName = cityNames[resolved.city][language];
  const salons = await getSalons({
    locale: value,
    city: resolved.city,
    treatment: resolved.treatment,
    limit: 12,
  });
  const indexable =
    salons.filter((salon) => salon.source === "live").length >=
    LOCAL_PAGE_MINIMUM_SALONS;

  return createPageMetadata({
    locale: value,
    route: {
      kind: "local-treatment",
      treatment: resolved.treatment,
      city: resolved.city,
    },
    title: `${copy.treatment.localTitle(treatmentName, cityName)} | Gleami`,
    description: copy.treatment.localDescription(treatmentName, cityName),
    index: indexable,
    alternateLocales: localesForCity(resolved.city),
  });
}

export default async function LocalTreatmentPage({ params }: Props) {
  const {
    locale: value,
    section,
    slug,
    city: citySlug,
  } = await params;
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  const resolved = resolveParams(locale, section, slug, citySlug);
  if (!resolved) notFound();
  const language = localeConfig[locale].language;
  const copy = getCopy(locale);
  const treatmentName = treatmentNames[resolved.treatment][language];
  const cityName = cityNames[resolved.city][language];
  const route = {
    kind: "local-treatment" as const,
    treatment: resolved.treatment,
    city: resolved.city,
  };
  const salons = await getSalons({
    locale,
    city: resolved.city,
    treatment: resolved.treatment,
    limit: 12,
  });
  const description = copy.treatment.localDescription(
    treatmentName,
    cityName,
  );

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: "Gleami", route: { kind: "home" } },
            { name: copy.nav.treatments, route: { kind: "treatments" } },
            {
              name: treatmentName,
              route: {
                kind: "treatment",
                treatment: resolved.treatment,
              },
            },
            { name: cityName, route },
          ]),
          serviceJsonLd({
            locale,
            route,
            name: `${treatmentName} · ${cityName}`,
            description,
          }),
        ]}
      />
      <SiteHeader
        locale={locale}
        route={route}
        availableLocales={localesForCity(resolved.city)}
      />
      <main id="main">
        <TreatmentLanding
          locale={locale}
          treatment={resolved.treatment}
          city={resolved.city}
          salons={salons}
        />
      </main>
      <SiteFooter
        locale={locale}
        route={route}
        availableLocales={localesForCity(resolved.city)}
      />
    </>
  );
}
