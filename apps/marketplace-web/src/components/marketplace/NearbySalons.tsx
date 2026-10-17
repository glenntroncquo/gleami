import { SalonCard as SalonCardComponent } from "@/components/marketplace/SalonCard";
import { getSalons } from "@/data/marketplace";
import { getCopy } from "@/lib/copy";
import type { CityKey, Locale } from "@/lib/i18n";

type NearbySalonsProps = {
  locale: Locale;
  city: CityKey | string;
  slug: string;
};

export async function NearbySalons({ locale, city, slug }: NearbySalonsProps) {
  const nearby = (await getSalons({ locale, city, limit: 6 })).filter(
    (item) => item.slug !== slug,
  );
  if (nearby.length === 0) return null;
  const copy = getCopy(locale);

  return (
    <section className="mt-24 border-t border-line pt-16 md:mt-32">
      <h2 className="text-[32px] font-semibold tracking-tight">{copy.salon.nearby}</h2>
      <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {nearby.slice(0, 3).map((item) => (
          <SalonCardComponent key={item.id} locale={locale} salon={item} />
        ))}
      </div>
    </section>
  );
}

export function NearbySalonsSkeleton() {
  return (
    <section className="mt-24 border-t border-line pt-16 md:mt-32" aria-hidden="true">
      <div className="h-8 w-48 rounded-full bg-navy/10 motion-safe:animate-pulse" />
      <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}>
            <div className="aspect-[4/3] rounded-[24px] bg-navy/10 motion-safe:animate-pulse" />
            <div className="mt-4 h-4 w-2/3 rounded-full bg-navy/10 motion-safe:animate-pulse" />
            <div className="mt-2 h-3.5 w-1/2 rounded-full bg-navy/10 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
