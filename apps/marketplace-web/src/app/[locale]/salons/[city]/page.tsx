import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalonDirectory } from "@/components/marketplace/SalonDirectory";
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
  type CityKey,
  type Locale,
} from "@/lib/i18n";
import { createPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

type Props = PageProps<"/[locale]/salons/[city]">;

const CITY_PAGE_MINIMUM_SALONS = 2;
const launchCities: Record<Locale, CityKey[]> = {
  "nl-be": ["ghent", "antwerp", "brussels"],
  "fr-be": ["ghent", "antwerp", "brussels"],
  "nl-nl": ["amsterdam"],
  "fr-fr": ["paris"],
  "de-de": ["cologne"],
};

function resolveCity(locale: Locale, slug: string): CityKey | null {
  const city = cityKeyFromSlug(locale, slug);
  if (!city || !localesForCity(city).includes(locale)) return null;
  return city;
}

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    launchCities[locale].map((city) => ({
      locale,
      city: localizedCitySlug(locale, city),
    })),
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale: value, city: citySlug } = await params;
  if (!isLocale(value)) return {};
  const city = resolveCity(value, citySlug);
  if (!city) return { robots: { index: false, follow: false } };
  const filters = await searchParams;
  const hasFilters = Object.values(filters).some((item) => item != null);
  const salons = await getSalons({ locale: value, city, limit: 48 });
  const liveCount = salons.filter((salon) => salon.source === "live").length;
  const copy = getCopy(value);
  const name = cityNames[city][localeConfig[value].language];

  return createPageMetadata({
    locale: value,
    route: { kind: "city", city },
    title: `${copy.city.title(name)} | Gleami`,
    description: copy.city.description(name),
    index: !hasFilters && liveCount >= CITY_PAGE_MINIMUM_SALONS,
    alternateLocales: localesForCity(city),
  });
}

export default async function CityPage({ params }: Props) {
  const { locale: value, city: citySlug } = await params;
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  const city = resolveCity(locale, citySlug);
  if (!city) notFound();
  const copy = getCopy(locale);
  const cityName = cityNames[city][localeConfig[locale].language];
  const salons = await getSalons({ locale, city, limit: 48 });
  const route = { kind: "city" as const, city };

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: "Gleami", route: { kind: "home" } },
          { name: copy.nav.discover, route: { kind: "salons" } },
          { name: cityName, route },
        ])}
      />
      <SiteHeader
        locale={locale}
        route={route}
        availableLocales={localesForCity(city)}
      />
      <main id="main">
        <SalonDirectory
          locale={locale}
          route={route}
          eyebrow={copy.consumer.eyebrow}
          title={copy.city.title(cityName)}
          description={copy.city.localIntro(cityName)}
          salons={salons}
        />
      </main>
      <SiteFooter
        locale={locale}
        route={route}
        availableLocales={localesForCity(city)}
      />
    </>
  );
}
