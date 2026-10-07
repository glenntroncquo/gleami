import {
  getAllPublishedSalonCards,
  getSalons,
  getPublishedSalonCardsPage,
  hasLiveMarketplace,
  localesForCountry,
} from "@/data/marketplace";
import { blogPosts } from "@/data/blog";
import {
  blogPostSlugs,
  cityNames,
  localeConfig,
  locales,
  localesForCity,
  routeFor,
  treatmentSlugs,
  type BlogPostKey,
  type CityKey,
  type Locale,
  type RouteDescriptor,
  type TreatmentKey,
} from "@/lib/i18n";
import { absoluteUrl, languageAlternates } from "@/lib/seo";

export const revalidate = 3600;

const URLS_PER_SITEMAP = 10_000;
const SALON_RECORDS_PER_SITEMAP = URLS_PER_SITEMAP / 2;
const LOCAL_PAGE_MINIMUM_SALONS = 3;
const CITY_PAGE_MINIMUM_SALONS = 2;
const validTypes = ["static", "salons", "cities", "treatments", "blog"] as const;
type SitemapType = (typeof validTypes)[number];

type SitemapEntry = {
  route: RouteDescriptor;
  locale: Locale;
  alternates?: readonly Locale[];
  lastModified?: string;
  images?: string[];
};

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function entryXml(entry: SitemapEntry): string {
  const path = routeFor(entry.locale, entry.route);
  const alternates = languageAlternates(
    entry.route,
    entry.alternates ?? locales,
  );
  return `  <url>
    <loc>${xmlEscape(absoluteUrl(path))}</loc>
${Object.entries(alternates)
  .map(
    ([hreflang, href]) =>
      `    <xhtml:link rel="alternate" hreflang="${xmlEscape(hreflang)}" href="${xmlEscape(href)}" />`,
  )
  .join("\n")}
${entry.lastModified ? `    <lastmod>${xmlEscape(entry.lastModified)}</lastmod>\n` : ""}${(entry.images ?? [])
    .slice(0, 10)
    .map(
      (image) =>
        `    <image:image><image:loc>${xmlEscape(absoluteUrl(image))}</image:loc></image:image>`,
    )
    .join("\n")}
  </url>`;
}

async function staticEntries(): Promise<SitemapEntry[]> {
  return locales.flatMap((locale) => [
    { locale, route: { kind: "home" } as const },
    ...(hasLiveMarketplace()
      ? [{ locale, route: { kind: "salons" } as const }]
      : []),
    { locale, route: { kind: "business" } as const },
  ]);
}

async function salonEntries(page: number): Promise<SitemapEntry[]> {
  const cards = await getPublishedSalonCardsPage(
    page,
    SALON_RECORDS_PER_SITEMAP,
  );
  return cards
    .filter(
      (card) =>
        card.name.trim().length > 0 &&
        card.city.trim().length > 0 &&
        card.treatmentNames.length > 0,
    )
    .flatMap((card) => {
      const supported = localesForCountry(card.countryCode);
      return supported.map((locale) => ({
        locale,
        route: {
          kind: "salon" as const,
          city: card.cityKey ?? card.city,
          salon: card.slug,
        },
        alternates: supported,
        images: card.imageUrl ? [card.imageUrl] : [],
      }));
    });
}

async function cityEntries(): Promise<SitemapEntry[]> {
  const cards = await getAllPublishedSalonCards();
  const counts = new Map<CityKey, number>();
  for (const card of cards) {
    if (!card.cityKey) continue;
    counts.set(card.cityKey, (counts.get(card.cityKey) ?? 0) + 1);
  }

  return [...counts.entries()].flatMap(([city, count]) => {
    if (count < CITY_PAGE_MINIMUM_SALONS) return [];
    const supported = localesForCity(city);
    return supported.map((locale) => ({
      locale,
      route: { kind: "city" as const, city },
      alternates: supported,
    }));
  });
}

async function treatmentEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  const treatments = Object.keys(treatmentSlugs) as TreatmentKey[];

  for (const locale of locales) {
    entries.push({ locale, route: { kind: "treatments" } });
    for (const treatment of treatments) {
      entries.push({
        locale,
        route: { kind: "treatment", treatment },
      });
    }
  }

  const candidateCities = Object.keys(cityNames) as CityKey[];
  for (const city of candidateCities) {
    const supported = localesForCity(city);
    for (const treatment of treatments) {
      const locale = supported[0];
      if (!locale) continue;
      const salons = await getSalons({
        locale,
        city,
        treatment,
        limit: LOCAL_PAGE_MINIMUM_SALONS,
      });
      if (
        salons.filter((salon) => salon.source === "live").length <
        LOCAL_PAGE_MINIMUM_SALONS
      ) {
        continue;
      }
      for (const item of supported) {
        entries.push({
          locale: item,
          route: { kind: "local-treatment", treatment, city },
          alternates: supported,
        });
      }
    }
  }

  return entries;
}

async function blogEntries(): Promise<SitemapEntry[]> {
  return locales.flatMap((locale) => [
    { locale, route: { kind: "blog" } as const },
    ...(Object.keys(blogPostSlugs) as BlogPostKey[]).map((post) => ({
      locale,
      route: { kind: "blog-post" as const, post },
      lastModified:
        blogPosts[post][localeConfig[locale].language].updatedAt,
    })),
  ]);
}

async function entriesFor(
  type: SitemapType,
  page: number,
): Promise<SitemapEntry[]> {
  if (type === "static") return staticEntries();
  if (type === "salons") return salonEntries(page);
  if (type === "cities") return cityEntries();
  if (type === "treatments") return treatmentEntries();
  return blogEntries();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ type: string; page: string }> },
) {
  const { type: rawType, page: rawPage } = await context.params;
  if (!validTypes.includes(rawType as SitemapType) || !/^\d+\.xml$/.test(rawPage)) {
    return new Response("Not found", { status: 404 });
  }
  const type = rawType as SitemapType;
  const page = Number(rawPage.replace(".xml", ""));
  const entries = await entriesFor(type, page);
  const chunk =
    type === "salons"
      ? entries
      : entries.slice(
          page * URLS_PER_SITEMAP,
          (page + 1) * URLS_PER_SITEMAP,
        );
  if (page > 0 && chunk.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${chunk.map(entryXml).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
