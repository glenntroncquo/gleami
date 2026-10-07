import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalonDirectory } from "@/components/marketplace/SalonDirectory";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSalons, hasLiveMarketplace } from "@/data/marketplace";
import { getCopy } from "@/lib/copy";
import { isLocale, type Locale } from "@/lib/i18n";
import { createPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

type Props = PageProps<"/[locale]/salons">;

function valueOf(
  value: string | string[] | undefined,
  maxLength = 80,
): string {
  return (Array.isArray(value) ? value[0] : value)?.slice(0, maxLength).trim() ?? "";
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale: value } = await params;
  if (!isLocale(value)) return {};
  const filters = await searchParams;
  const hasFilters = Object.values(filters).some((item) => item != null);
  const copy = getCopy(value);

  return createPageMetadata({
    locale: value,
    route: { kind: "salons" },
    title: `${copy.nav.discover} | Gleami`,
    description: copy.consumer.description,
    index: hasLiveMarketplace() && !hasFilters,
  });
}

export default async function SalonsPage({ params, searchParams }: Props) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  const filters = await searchParams;
  const query = valueOf(filters.q);
  const place = valueOf(filters.place);
  const copy = getCopy(locale);
  const salons = await getSalons({
    locale,
    q: query,
    city: place || undefined,
    limit: 48,
  });
  const route = { kind: "salons" } as const;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: "Gleami", route: { kind: "home" } },
          { name: copy.nav.discover, route },
        ])}
      />
      <SiteHeader locale={locale} route={route} />
      <main id="main">
        <SalonDirectory
          locale={locale}
          route={route}
          eyebrow={copy.consumer.eyebrow}
          title={copy.nav.discover}
          description={copy.consumer.description}
          salons={salons}
          query={query}
          place={place}
        />
      </main>
      <SiteFooter locale={locale} route={route} />
    </>
  );
}
