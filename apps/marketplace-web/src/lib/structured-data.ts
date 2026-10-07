import type { SalonProfile } from "@/data/marketplace";
import {
  formatMoney,
  localeConfig,
  routeFor,
  type Locale,
  type RouteDescriptor,
} from "@/lib/i18n";
import { absoluteUrl, canonicalUrl, SITE_NAME, SITE_ORIGIN } from "@/lib/seo";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl("/icon.svg"),
  };
}

export function websiteJsonLd(locale: Locale): JsonLd {
  const salonsRoute = routeFor(locale, { kind: "salons" });
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    inLanguage: localeConfig[locale].hreflang,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(salonsRoute)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export type BreadcrumbItem = {
  name: string;
  route: RouteDescriptor;
};

export function breadcrumbJsonLd(
  locale: Locale,
  items: BreadcrumbItem[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(locale, item.route),
    })),
  };
}

const schemaDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function businessType(salon: SalonProfile): "HairSalon" | "BeautySalon" {
  const categories = salon.categories
    .map((category) => `${category.name} ${category.slug}`)
    .join(" ")
    .toLowerCase();
  return categories.includes("hair") ||
    categories.includes("kapper") ||
    categories.includes("coiff")
    ? "HairSalon"
    : "BeautySalon";
}

export function salonJsonLd(
  locale: Locale,
  salon: SalonProfile,
): JsonLd {
  const city = salon.cityKey ?? salon.city;
  const route = { kind: "salon", city, salon: salon.slug } as const;
  const url = canonicalUrl(locale, route);
  const prices = salon.services.flatMap((service) =>
    service.variants.map((variant) => variant.price),
  );

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": businessType(salon),
    "@id": `${url}#salon`,
    name: salon.name,
    description: salon.description,
    url,
    image: salon.images,
    address: {
      "@type": "PostalAddress",
      streetAddress: salon.street || undefined,
      postalCode: salon.postalCode || undefined,
      addressLocality: salon.city,
      addressCountry: salon.countryCode,
    },
    priceRange:
      prices.length > 0
        ? `${formatMoney(Math.min(...prices), locale)}–${formatMoney(Math.max(...prices), locale)}`
        : undefined,
    currenciesAccepted: "EUR",
    openingHoursSpecification: salon.openingHours
      .filter((item) => item.opens && item.closes)
      .map((item) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${schemaDays[item.day - 1]}`,
        opens: item.opens,
        closes: item.closes,
      })),
    geo:
      salon.latitude != null && salon.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: salon.latitude,
            longitude: salon.longitude,
          }
        : undefined,
    aggregateRating:
      salon.rating != null && salon.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: salon.rating,
            reviewCount: salon.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    review:
      salon.reviews.length > 0
        ? salon.reviews.map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.author },
            datePublished: review.date,
            reviewBody: review.text,
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
          }))
        : undefined,
    makesOffer: salon.services.flatMap((service) =>
      service.variants.map((variant) => ({
        "@type": "Offer",
        price: variant.price,
        priceCurrency: variant.currency,
        itemOffered: {
          "@type": "Service",
          name:
            service.variants.length > 1
              ? `${service.name} · ${variant.name}`
              : service.name,
          description: service.description || undefined,
        },
      })),
    ),
  };

  return stripUndefined(data);
}

export function faqJsonLd(
  questions: Array<{ question: string; answer: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function serviceJsonLd({
  locale,
  route,
  name,
  description,
}: {
  locale: Locale;
  route: RouteDescriptor;
  name: string;
  description: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: canonicalUrl(locale, route),
    areaServed: {
      "@type": "Country",
      name: localeConfig[locale].country,
    },
    provider: { "@id": `${SITE_ORIGIN}/#organization` },
  };
}

function stripUndefined(value: JsonLd): JsonLd {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}
