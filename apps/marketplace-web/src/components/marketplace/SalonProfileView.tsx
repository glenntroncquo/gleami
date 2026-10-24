import type { ReactNode } from "react";
import Link from "next/link";
import { StarIcon } from "lucide-react";
import {
  minimumServicePrice,
  type OpeningHours,
  type SalonProfile,
} from "@/data/marketplace";
import { SalonActions } from "@/components/marketplace/SalonActions";
import { SalonGallery } from "@/components/marketplace/SalonGallery";
import { SalonMap } from "@/components/marketplace/SalonMap";
import { SalonServices } from "@/components/marketplace/SalonServices";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getCopy, type Copy } from "@/lib/copy";
import {
  formatMoney,
  localeConfig,
  routeFor,
  treatmentKeyFromAnySlug,
  type Country,
  type Language,
  type Locale,
  type TreatmentKey,
} from "@/lib/i18n";

type SalonProfileViewProps = {
  locale: Locale;
  salon: SalonProfile;
  nearby?: ReactNode;
};

function treatmentHref(locale: Locale, treatment: TreatmentKey): string {
  return routeFor(locale, { kind: "treatment", treatment });
}

const dayNames = {
  nl: ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"],
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  de: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
} as const;

const countryNames: Record<Language, Record<Country, string>> = {
  nl: { BE: "België", NL: "Nederland", FR: "Frankrijk", DE: "Duitsland" },
  fr: { BE: "Belgique", NL: "Pays-Bas", FR: "France", DE: "Allemagne" },
  en: { BE: "Belgium", NL: "Netherlands", FR: "France", DE: "Germany" },
  de: { BE: "Belgien", NL: "Niederlande", FR: "Frankreich", DE: "Deutschland" },
};

const weekdayIndex: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function clockLabel(value: string, language: Language): string {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = (rawMinute ?? "00").padStart(2, "0");
  if (Number.isNaN(hour)) return value;
  if (language === "en") {
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${period}`;
  }
  return `${hour}:${minute}`;
}

function minutesOf(value: string | null): number | null {
  if (!value) return null;
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function nowInTimezone(timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return {
    day: weekdayIndex[weekday] ?? 1,
    minutes: (hour % 24) * 60 + minute,
  };
}

function openingStatus(
  hours: OpeningHours[],
  timeZone: string,
  language: Language,
  copy: Copy,
): { open: boolean; detail: string } | null {
  if (hours.length === 0) return null;
  let now: { day: number; minutes: number };
  try {
    now = nowInTimezone(timeZone);
  } catch {
    return null;
  }

  for (let offset = 0; offset < 7; offset += 1) {
    const day = ((now.day - 1 + offset) % 7) + 1;
    const row = hours.find((item) => item.day === day);
    const opens = minutesOf(row?.opens ?? null);
    const closes = minutesOf(row?.closes ?? null);
    if (!row?.opens || !row.closes || opens == null || closes == null) continue;
    if (offset === 0 && now.minutes >= opens && now.minutes < closes) {
      return { open: true, detail: copy.salon.openUntil(clockLabel(row.closes, language)) };
    }
    if (offset === 0 && now.minutes < opens) {
      return { open: false, detail: copy.salon.opensToday(clockLabel(row.opens, language)) };
    }
    if (offset === 0) continue;
    const dayName = dayNames[language][day - 1];
    const label = language === "en" ? dayName : dayName.toLowerCase();
    return { open: false, detail: copy.salon.opensOn(label, clockLabel(row.opens, language)) };
  }

  return { open: false, detail: "" };
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((star) => {
        const fill = Math.max(0, Math.min(1, rating - star));
        return (
          <span key={star} className="relative h-3.5 w-3.5">
            <StarIcon className="h-3.5 w-3.5 text-line-strong" />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <StarIcon className="h-3.5 w-3.5 fill-gold text-gold" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function SalonProfileView({
  locale,
  salon,
  nearby,
}: SalonProfileViewProps) {
  const copy = getCopy(locale);
  const language = localeConfig[locale].language;
  const city = salon.cityKey ?? salon.city;
  const salonRoute = {
    kind: "salon" as const,
    city,
    salon: salon.slug,
  };
  const images =
    salon.images.length > 0
      ? salon.images
      : ["/og/home.jpg"];
  const minimumPrice = minimumServicePrice(salon);
  const address = [salon.street, salon.postalCode, salon.city]
    .filter(Boolean)
    .join(", ");
  const locality = [salon.city, salon.postalCode].filter(Boolean).join(", ");
  const directionsTarget =
    salon.latitude != null && salon.longitude != null
      ? `${salon.latitude},${salon.longitude}`
      : address;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsTarget)}`;
  const status = openingStatus(salon.openingHours, salon.timezone, language, copy);
  let today = 0;
  try {
    today = nowInTimezone(salon.timezone).day;
  } catch {
    today = 0;
  }
  const crumb = "text-muted/70";
  const fallbackDescription =
    language === "fr"
      ? `${salon.name} propose des prestations de beauté professionnelles à ${salon.city}. Découvrez les services et les tarifs ci-dessous.`
      : language === "de"
        ? `${salon.name} bietet professionelle Beauty-Behandlungen in ${salon.city}. Entdecke Leistungen und Preise.`
        : `${salon.name} biedt professionele beautybehandelingen in ${salon.city}. Bekijk het aanbod en de prijzen hieronder.`;
  const bookingUrl = `${routeFor(locale, salonRoute)}/boeken`;

  return (
    <>
      {salon.source === "demo" ? (
        <div className="bg-sand-100 px-5 py-2.5 text-center text-[12px] font-medium text-sand-700">
          {copy.salon.illustrative}
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl overflow-x-clip px-5 pb-28 pt-6 md:px-8 md:pt-8 lg:pb-20">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted"
        >
          <Link href={routeFor(locale, { kind: "home" })} className="hover:text-ink">
            {copy.salon.home}
          </Link>
          <span aria-hidden="true" className={crumb}>
            ·
          </span>
          <Link href={routeFor(locale, { kind: "salons" })} className="hover:text-ink">
            {copy.salon.beautySalons}
          </Link>
          <span aria-hidden="true" className={crumb}>
            ·
          </span>
          <span>{countryNames[language][salon.countryCode]}</span>
          <span aria-hidden="true" className={crumb}>
            ·
          </span>
          <Link href={routeFor(locale, { kind: "city", city })} className="hover:text-ink">
            {salon.city}
          </Link>
          <span aria-hidden="true" className={crumb}>
            ·
          </span>
          <span className="font-medium text-ink">{salon.name}</span>
        </nav>

        <div className="mt-5 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-balance text-[36px] font-bold leading-[1.05] tracking-tight text-ink md:text-[44px]">
              {salon.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14px] text-ink">
              {salon.rating != null && salon.reviewCount > 0 ? (
                <a href="#reviews" className="flex items-center gap-1.5">
                  <span className="font-semibold">{salon.rating.toFixed(1)}</span>
                  <RatingStars rating={salon.rating} />
                  <span className="text-muted">({salon.reviewCount})</span>
                </a>
              ) : (
                <span className="text-muted">{copy.salon.noReviews}</span>
              )}
              {status ? (
                <>
                  <span aria-hidden="true" className="text-muted/70">
                    ·
                  </span>
                  <span>
                    <span
                      className={`font-semibold ${
                        status.open ? "text-sage-600" : "text-red-600"
                      }`}
                    >
                      {status.open ? copy.salon.open : copy.salon.closed}
                    </span>
                    {status.detail ? (
                      <span className="text-muted"> – {status.detail}</span>
                    ) : null}
                  </span>
                </>
              ) : null}
              {locality ? (
                <>
                  <span aria-hidden="true" className="text-muted/70">
                    ·
                  </span>
                  <span className="text-muted">{locality}</span>
                </>
              ) : null}
              {directionsTarget ? (
                <>
                  <span aria-hidden="true" className="text-muted/70">
                    ·
                  </span>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-peri hover:text-peri-dark"
                  >
                    {copy.salon.directions}
                  </a>
                </>
              ) : null}
            </div>
          </div>
          <SalonActions
            locationId={salon.id}
            name={salon.name}
            shareLabel={copy.salon.share}
            saveLabel={copy.salon.save}
            savedLabel={copy.salon.saved}
            copiedLabel={copy.salon.linkCopied}
          />
        </div>

        <SalonGallery
          images={images}
          name={salon.name}
          city={salon.city}
          photosLabel={copy.salon.photos}
          seeAllLabel={copy.salon.seeAllImages}
          galleryLabel={copy.salon.gallery}
          closeLabel={copy.nav.close}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <main className="min-w-0 lg:col-span-8">
            <SalonServices
              locale={locale}
              slug={salon.slug}
              bookingUrl={bookingUrl}
              services={salon.services}
              heading={copy.salon.services}
              book={copy.salon.book}
              bookNow={copy.salon.bookNow}
              minutes={copy.salon.minutes}
              available={copy.salon.servicesAvailable(
                salon.services.reduce(
                  (sum, service) => sum + service.variants.length,
                  0,
                ),
              )}
              className="min-w-0"
            />

            <section className="mt-12 border-t border-line pt-10">
              <h2 className="text-[26px] font-semibold tracking-tight">
                {copy.salon.about}
              </h2>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-[16px] leading-7 text-muted">
                {salon.description || fallbackDescription}
              </p>
              {salon.categories.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {salon.categories.map((category) => {
                    const treatment = treatmentKeyFromAnySlug(category.slug);
                    const className =
                      "rounded-full bg-white px-3 py-1 text-[12px] text-muted ring-1 ring-line";
                    if (!treatment) {
                      return (
                        <span key={category.id} className={className}>
                          {category.name}
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={category.id}
                        href={treatmentHref(locale, treatment)}
                        className={`${className} transition hover:text-ink`}
                      >
                        {category.name}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>

            {salon.team.length > 0 ? (
              <section className="mt-12 border-t border-line pt-10">
                <h2 className="text-[26px] font-semibold tracking-tight">
                  {copy.salon.team}
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {salon.team.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-700">
                        {member.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <strong className="block text-[15px]">{member.name}</strong>
                        {member.role ? (
                          <span className="text-[13px] text-muted">
                            {member.role}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section
              className={`mt-12 grid gap-8 border-t border-line pt-10 ${
                salon.openingHours.length > 0 ? "md:grid-cols-2" : ""
              }`}
            >
              {salon.openingHours.length > 0 ? (
                <div>
                  <h2 className="text-[26px] font-semibold tracking-tight">
                    {copy.salon.hours}
                  </h2>
                  <dl className="mt-5 space-y-3.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const hours = salon.openingHours.find((item) => item.day === day);
                      const open = Boolean(hours?.opens && hours.closes);
                      const isToday = day === today;
                      return (
                        <div
                          key={day}
                          className="flex items-center justify-between gap-6 text-[15px]"
                        >
                          <dt
                            className={`flex items-center gap-3 ${
                              open
                                ? isToday
                                  ? "font-semibold text-ink"
                                  : "text-ink"
                                : "text-muted"
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                open ? "bg-sage-500" : "bg-[#C5C9D6]"
                              }`}
                            />
                            {dayNames[language][day - 1]}
                          </dt>
                          <dd
                            className={
                              open
                                ? isToday
                                  ? "font-semibold text-ink"
                                  : "text-ink"
                                : "text-muted"
                            }
                          >
                            {open && hours?.opens && hours.closes
                              ? `${clockLabel(hours.opens, language)} – ${clockLabel(hours.closes, language)}`
                              : copy.salon.closed}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ) : null}
              <div>
                <h2 className="text-[26px] font-semibold tracking-tight">
                  {copy.salon.location}
                </h2>
                <SalonMap
                  latitude={salon.latitude}
                  longitude={salon.longitude}
                  label={copy.salon.directions}
                  directionsUrl={directionsUrl}
                  token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null}
                />
                <p className="mt-3 text-[14px] text-muted">
                  {[salon.street, salon.postalCode, salon.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {salon.phone ? (
                  <p className="mt-2 text-[14px]">
                    <span className="text-muted">{copy.salon.phone}</span>{" "}
                    <a href={`tel:${salon.phone}`} className="font-medium">
                      {salon.phone}
                    </a>
                  </p>
                ) : null}
                {salon.website ? (
                  <p className="mt-2 text-[14px]">
                    <a
                      href={salon.website}
                      className="font-medium underline-offset-2 hover:underline"
                      rel="noopener noreferrer"
                    >
                      {copy.salon.website}
                    </a>
                  </p>
                ) : null}
                {salon.instagram ? (
                  <p className="mt-2 text-[14px]">
                    <a
                      href={salon.instagram}
                      className="font-medium underline-offset-2 hover:underline"
                      rel="noopener noreferrer"
                    >
                      {copy.salon.instagram}
                    </a>
                  </p>
                ) : null}
              </div>
            </section>

            <section id="reviews" className="mt-12 scroll-mt-24 border-t border-line pt-10">
              <h2 className="text-[26px] font-semibold tracking-tight">
                {copy.salon.reviews}
              </h2>
              {salon.reviews.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {salon.reviews.map((review) => (
                    <figure
                      key={review.id}
                      className="rounded-[22px] bg-white p-6 ring-1 ring-line"
                    >
                      <div className="flex items-center gap-1 text-[13px]">
                        <StarIcon className="h-3.5 w-3.5 fill-ink" />
                        <strong>{review.rating.toFixed(1)}</strong>
                      </div>
                      <blockquote className="mt-3 text-[14px] leading-relaxed text-muted">
                        “{review.text}”
                      </blockquote>
                      <figcaption className="mt-4 text-[13px] font-medium">
                        {review.author}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[14px] text-muted">
                  {copy.salon.noReviews}
                </p>
              )}
            </section>
          </main>

          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 rounded-[28px] bg-white p-6 shadow-[0_12px_40px_-18px_rgba(11,28,63,0.28)] ring-1 ring-line md:p-7">
              <p className="text-[13px] font-medium text-muted">{salon.name}</p>
              {salon.rating != null && salon.reviewCount > 0 ? (
                <p className="mt-2 flex items-center gap-1.5 text-[14px]">
                  <span className="font-semibold">{salon.rating.toFixed(1)}</span>
                  <RatingStars rating={salon.rating} />
                  <span className="text-muted">({salon.reviewCount})</span>
                </p>
              ) : null}
              {minimumPrice != null ? (
                <p className="mt-5">
                  <span className="text-[13px] text-muted">{copy.salon.from}</span>
                  <span className="ml-2 text-[32px] font-semibold tracking-tight">
                    {formatMoney(minimumPrice, locale)}
                  </span>
                </p>
              ) : null}
              <ButtonLink href={bookingUrl} size="lg" className="mt-6 w-full">
                {copy.salon.bookNow}
              </ButtonLink>
              {address ? (
                <p className="mt-4 text-center text-[13px] leading-5 text-muted">
                  {address}
                </p>
              ) : null}
            </div>
          </aside>
        </div>

        {nearby}
      </div>
    </>
  );
}
