"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SalonService } from "@/data/marketplace";
import { writeDraft, type DraftItem } from "@/lib/booking/draft";
import { localeConfig, type Locale } from "@/lib/i18n";

type SalonServicesProps = {
  locale: Locale;
  slug: string;
  bookingUrl: string;
  services: SalonService[];
  heading: string;
  book: string;
  bookNow: string;
  minutes: string;
  available: string;
};

function priceLabel(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeConfig[locale].htmlLang, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function SalonServices({
  locale,
  slug,
  bookingUrl,
  services,
  heading,
  book,
  bookNow,
  minutes,
  available,
}: SalonServicesProps) {
  const router = useRouter();
  const bookable = services.filter((service) => service.variants.length > 0);
  const [activeId, setActiveId] = useState(bookable[0]?.id ?? "");
  const active = bookable.find((service) => service.id === activeId) ?? bookable[0];

  const bookVariant = (service: SalonService, variant: SalonService["variants"][number]) => {
    const item: DraftItem = {
      serviceId: service.id,
      serviceName: service.name,
      variantId: variant.id,
      variantName: variant.name,
      price: variant.price,
      durationMinutes: variant.durationMinutes,
    };
    writeDraft(slug, {
      items: [item],
      dayKey: null,
      slot: null,
      note: "",
      bookingId: null,
    });
    router.push(`${bookingUrl}/tijd`);
  };

  if (!active) return null;

  return (
    <section id="services" className="mt-12 min-w-0 border-t border-line pt-10">
      <h2 className="text-xl font-semibold tracking-tight text-navy">{heading}</h2>
      {bookable.length > 1 ? (
        <div className="mt-4 w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            {bookable.map((service) => {
              const selected = service.id === active.id;
              return (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveId(service.id)}
                  className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${
                    selected
                      ? "bg-navy text-white"
                      : "border border-line bg-transparent text-navy"
                  }`}
                >
                  {service.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <ul className="mt-2">
        {active.variants.map((variant, index) => {
          const name = variant.name.trim() || active.name;
          return (
            <li
              key={variant.id}
              className={`flex items-center gap-4 py-5 ${index === 0 ? "" : "border-t border-line"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-navy">{name}</p>
                {variant.durationMinutes > 0 ? (
                  <p className="mt-1 text-sm text-muted">
                    {variant.durationMinutes} {minutes}
                  </p>
                ) : null}
                <p className="mt-2 text-base font-semibold text-navy">
                  {priceLabel(variant.price, locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => bookVariant(active, variant)}
                className="h-9 shrink-0 rounded-full border border-line px-4 text-sm font-semibold text-navy"
              >
                {book}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-line bg-canvas px-5 py-3 lg:hidden">
        <p className="text-sm text-muted">{available}</p>
        <Link
          href={bookingUrl}
          className="flex h-12 items-center rounded-full bg-navy px-6 text-base font-semibold text-white"
        >
          {bookNow}
        </Link>
      </div>
    </section>
  );
}
