import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketplaceHome } from "@/components/marketplace/MarketplaceHome";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCopy } from "@/lib/copy";
import { isLocale, type Locale } from "@/lib/i18n";
import { createPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

type Props = PageProps<"/[locale]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  if (!isLocale(value)) return {};
  const copy = getCopy(value);

  return createPageMetadata({
    locale: value,
    route: { kind: "home" },
    title: `${copy.consumer.title} ${copy.consumer.mutedTitle} | Gleami`,
    description: copy.consumer.description,
  });
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  const route = { kind: "home" } as const;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [{ name: "Gleami", route }])}
      />
      <SiteHeader locale={locale} route={route} />
      <main id="main">
        <MarketplaceHome locale={locale} />
      </main>
      <SiteFooter locale={locale} route={route} />
    </>
  );
}
