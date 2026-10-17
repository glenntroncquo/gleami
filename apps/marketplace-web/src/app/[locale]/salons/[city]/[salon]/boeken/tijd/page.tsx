import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { isLocale } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string; city: string; salon: string }>;
};

export default async function BookingTimePage({ params }: Props) {
  const { locale, city, salon } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <Suspense fallback={<p className="mx-auto max-w-xl px-5 py-16 text-muted">Loading…</p>}>
      <BookingFlow locale={locale} city={city} slug={salon} step="time" />
    </Suspense>
  );
}
