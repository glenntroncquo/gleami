import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/Blog";
import { TreatmentLanding } from "@/components/marketplace/TreatmentLanding";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { blogPosts } from "@/data/blog";
import { getSalons } from "@/data/marketplace";
import { treatmentEditorial } from "@/data/treatments";
import { getCopy } from "@/lib/copy";
import {
  blogPostKeyFromSlug,
  blogPostSlugs,
  isLocale,
  localeConfig,
  locales,
  treatmentKeyFromSlug,
  treatmentNames,
  treatmentSlugs,
  type BlogPostKey,
  type Locale,
  type RouteDescriptor,
  type TreatmentKey,
} from "@/lib/i18n";
import { absoluteUrl, createPageMetadata, SITE_ORIGIN } from "@/lib/seo";
import {
  breadcrumbJsonLd,
  serviceJsonLd,
} from "@/lib/structured-data";

type Props = PageProps<"/[locale]/[section]/[slug]">;

type ResolvedPage =
  | { kind: "treatment"; treatment: TreatmentKey }
  | { kind: "blog-post"; post: BlogPostKey };

function resolvePage(
  locale: Locale,
  section: string,
  slug: string,
): ResolvedPage | null {
  const paths = localeConfig[locale].paths;
  if (section === paths.treatments) {
    const treatment = treatmentKeyFromSlug(locale, slug);
    return treatment ? { kind: "treatment", treatment } : null;
  }
  if (section === paths.blog) {
    const post = blogPostKeyFromSlug(locale, slug);
    return post ? { kind: "blog-post", post } : null;
  }
  return null;
}

export function generateStaticParams() {
  return locales.flatMap((locale) => [
    ...(Object.keys(treatmentSlugs) as TreatmentKey[]).map((treatment) => ({
      locale,
      section: localeConfig[locale].paths.treatments,
      slug: treatmentSlugs[treatment][locale],
    })),
    ...(Object.keys(blogPostSlugs) as BlogPostKey[]).map((post) => ({
      locale,
      section: localeConfig[locale].paths.blog,
      slug: blogPostSlugs[post][locale],
    })),
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value, section, slug } = await params;
  if (!isLocale(value)) return {};
  const resolved = resolvePage(value, section, slug);
  if (!resolved) return { robots: { index: false, follow: false } };
  const language = localeConfig[value].language;
  const copy = getCopy(value);

  if (resolved.kind === "treatment") {
    const name = treatmentNames[resolved.treatment][language];
    return createPageMetadata({
      locale: value,
      route: { kind: "treatment", treatment: resolved.treatment },
      title: `${copy.treatment.findTitle(name)} | Gleami`,
      description: `${copy.treatment.findDescription(name)} ${
        treatmentEditorial[resolved.treatment][language].summary
      }`,
    });
  }

  const post = blogPosts[resolved.post][language];
  const metadata = createPageMetadata({
    locale: value,
    route: { kind: "blog-post", post: resolved.post },
    title: `${post.title} | Gleami`,
    description: post.description,
    type: "article",
  });
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function LocalizedContentPage({ params }: Props) {
  const { locale: value, section, slug } = await params;
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  const resolved = resolvePage(locale, section, slug);
  if (!resolved) notFound();
  const language = localeConfig[locale].language;
  const copy = getCopy(locale);

  if (resolved.kind === "treatment") {
    const name = treatmentNames[resolved.treatment][language];
    const route = {
      kind: "treatment" as const,
      treatment: resolved.treatment,
    };
    const description = copy.treatment.findDescription(name);
    const salons = await getSalons({
      locale,
      treatment: resolved.treatment,
      limit: 12,
    });

    return (
      <>
        <JsonLd
          data={[
            breadcrumbJsonLd(locale, [
              { name: "Gleami", route: { kind: "home" } },
              { name: copy.nav.treatments, route: { kind: "treatments" } },
              { name, route },
            ]),
            serviceJsonLd({ locale, route, name, description }),
          ]}
        />
        <SiteHeader locale={locale} route={route} />
        <main id="main">
          <TreatmentLanding
            locale={locale}
            treatment={resolved.treatment}
            salons={salons}
          />
        </main>
        <SiteFooter locale={locale} route={route} />
      </>
    );
  }

  const route: RouteDescriptor = {
    kind: "blog-post",
    post: resolved.post,
  };
  const post = blogPosts[resolved.post][language];
  const url = absoluteUrl(
    `/${locale}/${localeConfig[locale].paths.blog}/${blogPostSlugs[resolved.post][locale]}`,
  );
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: localeConfig[locale].hreflang,
    mainEntityOfPage: url,
    author: { "@id": `${SITE_ORIGIN}/#organization` },
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: "Gleami", route: { kind: "home" } },
            { name: copy.footer.company, route: { kind: "blog" } },
            { name: post.title, route },
          ]),
          articleJsonLd,
        ]}
      />
      <SiteHeader locale={locale} route={route} mode="business" />
      <main id="main">
        <BlogArticle locale={locale} post={post} />
      </main>
      <SiteFooter locale={locale} route={route} />
    </>
  );
}
