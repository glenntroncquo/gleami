import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookingFlow, BookingSkeleton } from "@/components/booking/BookingFlow";
import { isLocale } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string; city: string; salon: string }>;
};

export default async function BookingServicesPage({ params }: Props) {
  const { locale, city, salon } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <Suspense fallback={<BookingSkeleton />}>
      <BookingFlow locale={locale} city={city} slug={salon} step="services" />
    </Suspense>
  );
}
