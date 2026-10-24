import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Overview } from "@/components/Overview";
import { getCopy } from "@/lib/copy";
import { isLocale, languageOf, launchLocales } from "@/lib/i18n";

const description = {
  nl: "Juridische documenten van Gleami: voorwaarden, privacy, cookies en gegevensbescherming.",
  fr: "Documents juridiques de Gleami : conditions, confidentialité, cookies et protection des données.",
  en: "Gleami legal documents: terms, privacy, cookies and data protection.",
} as const;

export function generateStaticParams() {
  return launchLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const language = languageOf(locale);
  return {
    title: getCopy(language).overview,
    description: description[language],
    alternates: { canonical: `/${locale}` },
  };
}

export default async function OverviewPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main id="main">
      <Overview locale={locale} />
    </main>
  );
}
