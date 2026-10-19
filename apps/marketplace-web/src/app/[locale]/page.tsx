import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ConsumerHome } from "@/components/consumer-home/ConsumerHome";
import { homeCopy } from "@/components/consumer-home/messages";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCopy } from "@/lib/copy";
import {
  defaultLocale,
  isLocale,
  launchLocales,
  locales,
  routeFor,
  type Locale,
} from "@/lib/i18n";
import { createPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

type Props = PageProps<"/[locale]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  if (!isLocale(value)) return {};
  const copy = getCopy(value);
  const home = homeCopy(value);
  const alternateLocales = launchLocales.includes(value)
    ? launchLocales
    : locales.filter((locale) => !launchLocales.includes(locale));

  return createPageMetadata({
    locale: value,
    route: { kind: "home" },
    title: `${home.pageTitle} | Gleami`,
    description: copy.consumer.description,
    alternateLocales,
  });
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  if (value === defaultLocale) permanentRedirect("/");
  const locale: Locale = value;
  const route = { kind: "home" } as const;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [{ name: "Gleami", route }])}
      />
      <ConsumerHome
        locale={locale}
        homeHref={routeFor(locale, { kind: "home" })}
        businessHref={routeFor(locale, { kind: "business" })}
      />
    </>
  );
}
