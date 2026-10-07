import Image from "next/image";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import {
  minimumServicePrice,
  type SalonCard,
  type SalonProfile,
} from "@/data/marketplace";
import { SalonCard as SalonCardComponent } from "@/components/marketplace/SalonCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getCopy } from "@/lib/copy";
import {
  formatMoney,
  localeConfig,
  routeFor,
  type Locale,
} from "@/lib/i18n";

type SalonProfileViewProps = {
  locale: Locale;
  salon: SalonProfile;
  nearby: SalonCard[];
};

const dayNames = {
  nl: ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"],
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  de: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
} as const;

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
      ? salon.images.slice(0, 5)
      : ["/c22595c4-33c0-4e1b-9d3b-228dabf74ef8.jpg"];
  const minimumPrice = minimumServicePrice(salon);
  const fallbackDescription =
    language === "fr"
      ? `${salon.name} propose des prestations de beauté professionnelles à ${salon.city}. Découvrez les services et les tarifs ci-dessous.`
      : language === "de"
        ? `${salon.name} bietet professionelle Beauty-Behandlungen in ${salon.city}. Entdecke Leistungen und Preise.`
        : `${salon.name} biedt professionele beautybehandelingen in ${salon.city}. Bekijk het aanbod en de prijzen hieronder.`;
  const bookingOrigin =
    process.env.NEXT_PUBLIC_BOOKING_URL ?? "https://booking.salonify.co";
  const bookingUrl =
    salon.source === "live"
      ? `${bookingOrigin.replace(/\/$/, "")}/${salon.companyId}/${salon.slug}`
      : `${routeFor(locale, salonRoute)}#services`;

  return (
    <>
      {salon.source === "demo" ? (
        <div className="bg-sand-100 px-5 py-2.5 text-center text-[12px] font-medium text-sand-700">
          {copy.salon.illustrative}
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted"
        >
          <Link href={routeFor(locale, { kind: "home" })}>Gleami</Link>
          <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
          <Link href={routeFor(locale, { kind: "salons" })}>
            {copy.nav.discover}
          </Link>
          <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
          <Link href={routeFor(locale, { kind: "city", city })}>
            {salon.city}
          </Link>
          <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="text-ink">{salon.name}</span>
        </nav>

        <section className="mt-6 grid h-[320px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[28px] md:h-[520px]">
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className={`relative overflow-hidden bg-shell ${
                index === 0
                  ? "col-span-4 row-span-2 md:col-span-2"
                  : "hidden md:block"
              }`}
            >
              <Image
                src={image}
                alt={
                  index === 0
                    ? `${salon.name}, ${salon.city}`
                    : `${copy.salon.photos} ${index + 1} · ${salon.name}`
                }
                fill
                priority={index === 0}
                sizes={index === 0 ? "(max-width: 768px) 100vw, 50vw" : "25vw"}
                className="object-cover"
              />
            </div>
          ))}
        </section>

        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <main className="lg:col-span-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  {salon.categories.map((category) => (
                    <span
                      key={category.id}
                      className="rounded-full bg-white px-3 py-1 text-[12px] text-muted ring-1 ring-line"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
                <h1 className="mt-4 text-balance text-[42px] font-semibold leading-[1.02] tracking-tightest md:text-[64px]">
                  {salon.name}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted">
                  {salon.rating != null && salon.reviewCount > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <StarIcon
                        aria-hidden="true"
                        className="h-4 w-4 fill-ink text-ink"
                      />
                      <strong className="text-ink">{salon.rating.toFixed(1)}</strong>
                      · {salon.reviewCount} {copy.salon.reviews.toLowerCase()}
                    </span>
                  ) : (
                    <span>{copy.salon.noReviews}</span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon aria-hidden="true" className="h-4 w-4" />
                    {[salon.street, salon.postalCode, salon.city]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Save salon"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-line transition hover:bg-rose-50 hover:text-rose-700"
              >
                <HeartIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <section className="mt-12 border-t border-line pt-10">
              <h2 className="text-[26px] font-semibold tracking-tight">
                {copy.salon.about}
              </h2>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-[16px] leading-7 text-muted">
                {salon.description ||
                  fallbackDescription}
              </p>
            </section>

            <section id="services" className="mt-12 border-t border-line pt-10">
              <h2 className="text-[26px] font-semibold tracking-tight">
                {copy.salon.services}
              </h2>
              <div className="mt-6 divide-y divide-line rounded-[24px] bg-white px-5 ring-1 ring-line md:px-7">
                {salon.services.map((service) => (
                  <article key={service.id} className="py-6">
                    <h3 className="text-[18px] font-semibold">{service.name}</h3>
                    {service.description ? (
                      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
                        {service.description}
                      </p>
                    ) : null}
                    <ul className="mt-4 grid gap-2">
                      {service.variants.map((variant) => (
                        <li
                          key={variant.id}
                          className="flex items-center justify-between gap-4 rounded-xl bg-canvas px-4 py-3 text-[14px]"
                        >
                          <span>
                            <span className="font-medium">{variant.name}</span>
                            <span className="ml-2 text-muted">
                              {variant.durationMinutes} {copy.salon.minutes}
                            </span>
                          </span>
                          <strong>{formatMoney(variant.price, locale)}</strong>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
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

            <section className="mt-12 grid gap-8 border-t border-line pt-10 md:grid-cols-2">
              <div>
                <h2 className="text-[26px] font-semibold tracking-tight">
                  {copy.salon.hours}
                </h2>
                {salon.openingHours.length > 0 ? (
                  <dl className="mt-5 divide-y divide-line">
                    {salon.openingHours.map((hours) => (
                      <div
                        key={hours.day}
                        className="flex justify-between gap-4 py-2.5 text-[14px]"
                      >
                        <dt>{dayNames[language][hours.day - 1]}</dt>
                        <dd className="text-muted">
                          {hours.opens && hours.closes
                            ? `${hours.opens} – ${hours.closes}`
                            : copy.salon.closed}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-4 text-[14px] text-muted">
                    {copy.salon.unavailable}
                  </p>
                )}
              </div>
              <div>
                <h2 className="text-[26px] font-semibold tracking-tight">
                  {copy.salon.location}
                </h2>
                <div className="map-grid relative mt-5 h-56 overflow-hidden rounded-[22px] ring-1 ring-line">
                  <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-white shadow-float">
                    <MapPinIcon aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-[14px] text-muted">
                  {[salon.street, salon.postalCode, salon.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </section>

            <section className="mt-12 border-t border-line pt-10">
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

          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-line md:p-7">
              <div className="flex items-center gap-3 text-[14px]">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                  <CalendarDaysIcon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{copy.actions.book}</p>
                  <p className="text-[12px] text-muted">{salon.name}</p>
                </div>
              </div>
              {minimumPrice != null ? (
                <p className="mt-7">
                  <span className="text-[13px] text-muted">{copy.salon.from}</span>
                  <span className="ml-2 text-[28px] font-semibold tracking-tight">
                    {formatMoney(minimumPrice, locale)}
                  </span>
                </p>
              ) : null}
              <ButtonLink
                href={bookingUrl}
                size="lg"
                arrow
                className="mt-6 w-full"
              >
                {copy.actions.book}
              </ButtonLink>
              <ul className="mt-6 space-y-3 border-t border-line pt-5 text-[13px] text-muted">
                <li className="flex items-center gap-2.5">
                  <ClockIcon className="h-4 w-4" />
                  {copy.salon.hours}
                </li>
                <li className="flex items-center gap-2.5">
                  <UsersIcon className="h-4 w-4" />
                  {copy.salon.team}
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Gleami
                </li>
              </ul>
            </div>
          </aside>
        </div>

        {nearby.length > 0 ? (
          <section className="mt-24 border-t border-line pt-16 md:mt-32">
            <h2 className="text-[32px] font-semibold tracking-tight">
              {copy.salon.nearby}
            </h2>
            <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.slice(0, 3).map((item) => (
                <SalonCardComponent key={item.id} locale={locale} salon={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
