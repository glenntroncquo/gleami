import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { HtmlLang } from "@/components/HtmlLang";
import { isLocale, localeConfig } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://gleami.eu"),
  title: {
    default: "Gleami",
    template: "%s | Gleami",
  },
  applicationName: "Gleami",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headerStore = await headers();
  const value = headerStore.get("x-locale");
  const lang = value && isLocale(value) ? localeConfig[value].htmlLang : "nl-BE";

  return (
    <html lang={lang} className={`${inter.variable} bg-canvas`} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-canvas font-sans text-ink">
        <HtmlLang />
        {children}
      </body>
    </html>
  );
}
