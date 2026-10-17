import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Boeken",
};

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string; city: string; salon: string }>;
};

export default async function BookingLayout({ children, params }: LayoutProps) {
  const { locale, city, salon } = await params;
  if (!isLocale(locale)) notFound();
  const route = { kind: "salon" as const, city, salon };

  return (
    <>
      <SiteHeader locale={locale} route={route} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} route={route} />
    </>
  );
}
