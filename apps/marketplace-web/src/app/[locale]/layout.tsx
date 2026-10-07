import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCopy } from "@/lib/copy";
import { isLocale, localeConfig, locales } from "@/lib/i18n";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Gleami",
    template: "%s | Gleami",
  },
  applicationName: SITE_NAME,
  category: "beauty",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF8F5",
  colorScheme: "light",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const copy = getCopy(value);

  return (
    <html
      lang={localeConfig[value].htmlLang}
      className={`${inter.variable} bg-canvas`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-canvas font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          {copy.skip}
        </a>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(value)]} />
        {children}
      </body>
    </html>
  );
}
