import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BlogIndex } from "@/components/Blog";
import { BusinessLanding } from "@/components/business/BusinessLanding";
import { TreatmentOverview } from "@/components/marketplace/TreatmentOverview";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCopy } from "@/lib/copy";
import {
  isLocale,
  defaultLocale,
  localeConfig,
  locales,
  type Locale,
  type RouteDescriptor,
} from "@/lib/i18n";
import { createPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

type Props = PageProps<"/[locale]/[section]">;

type SectionKind = "business" | "treatments" | "blog";

function sectionKind(locale: Locale, section: string): SectionKind | null {
  const paths = localeConfig[locale].paths;
  if (section === paths.business) return "business";
  if (section === paths.treatments) return "treatments";
  if (section === paths.blog) return "blog";
  return null;
}

function routeForSection(kind: SectionKind): RouteDescriptor {
  if (kind === "business") return { kind: "business" };
  if (kind === "treatments") return { kind: "treatments" };
  return { kind: "blog" };
}

export function generateStaticParams() {
  return locales.flatMap((locale) => [
    { locale, section: localeConfig[locale].paths.business },
    { locale, section: localeConfig[locale].paths.treatments },
    { locale, section: localeConfig[locale].paths.blog },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value, section } = await params;
  if (!isLocale(value)) return {};
  const kind = sectionKind(value, section);
  if (!kind) return { robots: { index: false, follow: false } };
  const copy = getCopy(value);
  const route = routeForSection(kind);

  if (kind === "business") {
    return createPageMetadata({
      locale: value,
      route,
      title: `${copy.business.title} ${copy.business.mutedTitle} | Gleami`,
      description: copy.business.description,
    });
  }

  if (kind === "treatments") {
    return createPageMetadata({
      locale: value,
      route,
      title: `${copy.treatment.indexTitle} | Gleami`,
      description: copy.treatment.indexDescription,
    });
  }

  const language = localeConfig[value].language;
  const title =
    language === "fr"
      ? "Conseils pour les salons | Gleami"
      : language === "de"
        ? "Tipps für Salons | Gleami"
        : "Inzichten voor salons | Gleami";
  return createPageMetadata({
    locale: value,
    route,
    title,
    description: copy.business.overviewBody,
  });
}

export default async function LocalizedSectionPage({ params }: Props) {
  const { locale: value, section } = await params;
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  const kind = sectionKind(locale, section);
  if (!kind) notFound();
  if (kind === "business" && locale === defaultLocale) {
    permanentRedirect("/for-businesses");
  }
  const route = routeForSection(kind);
  const copy = getCopy(locale);
  const title =
    kind === "business"
      ? copy.nav.business
      : kind === "treatments"
        ? copy.nav.treatments
        : copy.footer.company;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: "Gleami", route: { kind: "home" } },
          { name: title, route },
        ])}
      />
      <SiteHeader
        locale={locale}
        route={route}
        mode={kind === "business" ? "business" : "marketplace"}
      />
      <main id="main">
        {kind === "business" ? (
          <BusinessLanding locale={locale} />
        ) : kind === "treatments" ? (
          <TreatmentOverview locale={locale} />
        ) : (
          <BlogIndex locale={locale} />
        )}
      </main>
      <SiteFooter locale={locale} route={route} />
    </>
  );
}
