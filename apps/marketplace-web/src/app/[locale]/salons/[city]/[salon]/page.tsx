import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { SalonProfileView } from "@/components/marketplace/SalonProfileView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  getSalonBySlug,
  getSalons,
  isSalonIndexable,
  localesForCountry,
  profileMatchesLocale,
} from "@/data/marketplace";
import { getCopy } from "@/lib/copy";
import {
  isLocale,
  localeConfig,
  localizedCitySlug,
  treatmentNames,
  type Locale,
} from "@/lib/i18n";
import {
  canonicalUrl,
  createPageMetadata,
  truncateDescription,
} from "@/lib/seo";
import {
  breadcrumbJsonLd,
  salonJsonLd,
} from "@/lib/structured-data";

type Props = PageProps<"/[locale]/salons/[city]/[salon]">;

function metadataTitle(locale: Locale, salon: Awaited<ReturnType<typeof getSalonBySlug>>) {
  if (!salon) return "Salon | Gleami";
  const language = localeConfig[locale].language;
  const services = [
    ...new Set(
      salon.services.flatMap((item) =>
        item.treatmentKeys.map((key) => treatmentNames[key][language]),
      ),
    ),
  ].slice(0, 2);
  if (services.length === 0 && salon.services[0]?.name) {
    services.push(salon.services[0].name.slice(0, 42));
  }
  const qualifier =
    services.length > 0
      ? services.join(" & ")
      : language === "fr"
        ? "Salon de beauté"
        : language === "de"
          ? "Beauty-Salon"
          : "Beauty salon";
  const connector =
    language === "fr" ? "à" : "in";
  return `${salon.name} – ${qualifier} ${connector} ${salon.city} | Gleami`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value, salon: salonSlug } = await params;
  if (!isLocale(value)) return {};
  const salon = await getSalonBySlug(salonSlug.toLowerCase());
  if (!salon || !profileMatchesLocale(salon, value)) {
    return { robots: { index: false, follow: false } };
  }
  const route = {
    kind: "salon" as const,
    city: salon.cityKey ?? salon.city,
    salon: salon.slug,
  };
  const address = [salon.street, salon.postalCode, salon.city]
    .filter(Boolean)
    .join(", ");
  const language = localeConfig[value].language;
  const fallbackDescription =
    language === "fr"
      ? `${salon.name} à ${salon.city}. Consultez les prestations, les tarifs et l’adresse sur Gleami.`
      : language === "de"
        ? `${salon.name} in ${salon.city}. Entdecke Leistungen, Preise und Standort auf Gleami.`
        : `${salon.name} in ${salon.city}. Bekijk behandelingen, prijzen en locatie op Gleami.`;
  const description = truncateDescription(
    salon.description || `${fallbackDescription} ${address}`,
  );

  return createPageMetadata({
    locale: value,
    route,
    title: metadataTitle(value, salon),
    description,
    image: salon.images[0],
    index: isSalonIndexable(salon),
    alternateLocales: localesForCountry(salon.countryCode),
  });
}

export default async function SalonPage({ params }: Props) {
  const {
    locale: value,
    city: requestedCity,
    salon: requestedSalon,
  } = await params;
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  const salon = await getSalonBySlug(requestedSalon.toLowerCase());
  if (!salon || !profileMatchesLocale(salon, locale)) notFound();

  const city = salon.cityKey ?? salon.city;
  const canonicalCity = localizedCitySlug(locale, city);
  if (requestedCity !== canonicalCity || requestedSalon !== salon.slug) {
    permanentRedirect(
      canonicalUrl(locale, {
        kind: "salon",
        city,
        salon: salon.slug,
      }),
    );
  }

  const copy = getCopy(locale);
  const route = {
    kind: "salon" as const,
    city,
    salon: salon.slug,
  };
  const nearby = (
    await getSalons({ locale, city, limit: 6 })
  ).filter((item) => item.slug !== salon.slug);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: "Gleami", route: { kind: "home" } },
            { name: copy.nav.discover, route: { kind: "salons" } },
            { name: salon.city, route: { kind: "city", city } },
            { name: salon.name, route },
          ]),
          salonJsonLd(locale, salon),
        ]}
      />
      <SiteHeader
        locale={locale}
        route={route}
        availableLocales={localesForCountry(salon.countryCode)}
      />
      <main id="main">
        <SalonProfileView locale={locale} salon={salon} nearby={nearby} />
      </main>
      <SiteFooter
        locale={locale}
        route={route}
        availableLocales={localesForCountry(salon.countryCode)}
      />
    </>
  );
}
