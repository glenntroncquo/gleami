import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LegalNav } from "@/components/LegalNav";
import { getCopy } from "@/lib/copy";
import { isLocale, languageOf, launchLocales } from "@/lib/i18n";

export function generateStaticParams() {
  return launchLocales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = getCopy(languageOf(locale));

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        {copy.skip}
      </a>
      <div className="sticky top-0 z-30">
        <Header />
        <LegalNav />
      </div>
      {children}
      <Footer />
    </>
  );
}
