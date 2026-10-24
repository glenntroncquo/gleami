import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/DocumentView";
import { documentBySlug, documentPath, documents } from "@/content/documents";
import { isLocale, languageOf, launchLocales } from "@/lib/i18n";

export function generateStaticParams() {
  return launchLocales.flatMap((locale) =>
    documents.map((document) => ({
      locale,
      slug: document.slug[languageOf(locale)],
    })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const document = documentBySlug(locale, slug);
  if (!document) return {};
  const language = languageOf(locale);
  return {
    title: document.nav[language],
    description: document.summary[language],
    alternates: { canonical: documentPath(locale, document.id) },
  };
}

export default async function DocumentPage({
  params,
}: PageProps<"/[locale]/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const document = documentBySlug(locale, slug);
  if (!document) notFound();

  return (
    <main id="main">
      <DocumentView locale={locale} id={document.id} />
    </main>
  );
}
