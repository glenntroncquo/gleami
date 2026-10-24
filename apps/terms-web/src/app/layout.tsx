import type { Metadata, Viewport } from "next";
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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F8FC",
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
