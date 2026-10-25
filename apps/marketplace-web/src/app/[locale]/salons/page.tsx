import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalonExplorer } from "@/components/marketplace/SalonExplorer";
import { readExplorerSearch } from "@/components/marketplace/salon-explorer-utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSalons, getSalonSearchCards, hasLiveMarketplace } from "@/data/marketplace";
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
  const search = readExplorerSearch({
    q: valueOf(filters.q),
    where: valueOf(filters.where),
    lat: valueOf(filters.lat, 32),
    lng: valueOf(filters.lng, 32),
    date: valueOf(filters.date, 10),
    part: valueOf(filters.part, 12),
  });
  const copy = getCopy(locale);
  const live = hasLiveMarketplace();
  const salons = live
    ? []
    : await getSalonSearchCards(await getSalons({ locale, limit: 48 }), locale);
  const route = { kind: "salons" } as const;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: "Gleami", route: { kind: "home" } },
          { name: copy.nav.discover, route },
        ])}
      />
      <main id="main">
        <SalonExplorer
          locale={locale}
          title={copy.nav.discover}
          live={live}
          salons={salons}
          initialQuery={search.query}
          initialWhere={search.where}
          initialLat={search.lat}
          initialLng={search.lng}
          initialDate={search.date}
          initialPart={search.part}
        />
      </main>
    </>
  );
}
