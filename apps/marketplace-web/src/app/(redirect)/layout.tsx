import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { SITE_ORIGIN } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "Gleami",
  description:
    "Ontdek salons en beautyprofessionals in België. Vergelijk behandelingen en boek jouw volgende afspraak.",
};

export default function RedirectLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="nl-BE"
      className={`${inter.variable} bg-canvas`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-canvas font-sans text-ink">{children}</body>
    </html>
  );
}
