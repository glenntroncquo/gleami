import Image from "next/image";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  HeartIcon,
  MapPinIcon,
  MenuIcon,
  QrCodeIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react";
import {
  getSalons,
  hasLiveMarketplace,
  type SalonCard as SalonCardData,
} from "@/data/marketplace";
import { Logo } from "@/for-businesses/components/ui/Logo";
import { formatMoney, routeFor } from "@/lib/i18n";

const locale = "nl-be" as const;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.gleami.eu";

function MarketplaceSearch() {
  return (
    <form
      action={routeFor(locale, { kind: "salons" })}
      className="mx-auto flex w-full max-w-[690px] flex-col rounded-[22px] bg-white p-2 shadow-[0_2px_12px_rgba(11,28,63,0.12)] ring-1 ring-ink/[0.06] sm:flex-row sm:items-center sm:rounded-full"
    >
      <label className="flex h-12 min-w-0 flex-[1.25] items-center gap-3 px-3 sm:h-10 sm:px-3">
        <SearchIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        <span className="sr-only">Behandeling</span>
        <select
          name="q"
          defaultValue=""
          className="h-full min-w-0 flex-1 appearance-none bg-transparent pr-2 text-[13px] font-medium text-ink outline-none"
        >
          <option value="">Alle behandelingen</option>
          <option value="knippen">Knippen</option>
          <option value="balayage">Balayage</option>
          <option value="keratine">Keratine</option>
          <option value="nagels">Nagels</option>
        </select>
        <ChevronDownIcon aria-hidden="true" className="h-3.5 w-3.5 text-subtle sm:hidden" />
      </label>

      <span aria-hidden="true" className="mx-3 h-px bg-line sm:mx-0 sm:h-6 sm:w-px" />

      <label className="flex h-12 min-w-0 flex-1 items-center gap-3 px-3 sm:h-10 sm:px-4">
        <MapPinIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        <span className="sr-only">Locatie</span>
        <input
          name="place"
          placeholder="Huidige locatie"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-ink"
        />
      </label>

      <span aria-hidden="true" className="mx-3 h-px bg-line sm:mx-0 sm:h-6 sm:w-px" />

      <label className="flex h-12 min-w-0 flex-1 items-center gap-3 px-3 sm:h-10 sm:px-4">
        <CalendarDaysIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        <span className="sr-only">Tijdstip</span>
        <select
          name="when"
          defaultValue=""
          className="h-full min-w-0 flex-1 appearance-none bg-transparent pr-2 text-[13px] font-medium text-ink outline-none"
        >
          <option value="">Willekeurige tijd</option>
          <option value="today">Vandaag</option>
          <option value="tomorrow">Morgen</option>
          <option value="week">Deze week</option>
        </select>
        <ChevronDownIcon aria-hidden="true" className="h-3.5 w-3.5 text-subtle sm:hidden" />
      </label>

      <button
        type="submit"
        className="mt-2 flex h-12 shrink-0 items-center justify-center rounded-full bg-ink px-7 text-[13px] font-semibold text-white transition hover:bg-ink-soft sm:mt-0 sm:h-10 sm:px-6"
      >
        Zoeken
      </button>
    </form>
  );
}

function MarketplaceHeader() {
  return (
    <header className="relative z-20">
      <nav
        aria-label="Hoofdnavigatie"
        className="mx-auto flex h-[58px] max-w-[850px] items-center justify-between px-5 md:px-1"
      >
        <Link href="/" aria-label="Gleami home" className="rounded-lg">
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={appUrl}
            className="hidden rounded-full px-3 py-2 text-[13px] font-medium text-ink transition hover:bg-white/60 sm:block"
          >
            Inloggen
          </a>
          <Link
            href="/for-businesses"
            className="rounded-full bg-white/80 px-4 py-2.5 text-[13px] font-medium text-ink shadow-sm ring-1 ring-ink/10 backdrop-blur transition hover:bg-white"
          >
            Voor bedrijven
          </Link>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-[13px] font-medium text-ink shadow-sm ring-1 ring-ink/10 backdrop-blur transition hover:bg-white">
              <span className="hidden sm:inline">Menu</span>
              <MenuIcon aria-hidden="true" className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-[0_18px_50px_rgba(11,28,63,0.14)] ring-1 ring-ink/10">
              <Link
                href={routeFor(locale, { kind: "salons" })}
                className="block rounded-xl px-4 py-3 text-[14px] font-medium hover:bg-shell"
              >
                Ontdek salons
              </Link>
              <Link
                href={routeFor(locale, { kind: "treatments" })}
                className="block rounded-xl px-4 py-3 text-[14px] font-medium hover:bg-shell"
              >
                Behandelingen
              </Link>
              <Link
                href="/for-businesses"
                className="block rounded-xl px-4 py-3 text-[14px] font-medium hover:bg-shell"
              >
                Voor bedrijven
              </Link>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}

function FreshaSalonCard({
  salon,
  priority,
}: {
  salon: SalonCardData;
  priority: boolean;
}) {
  const image =
    salon.imageUrl ?? "/c22595c4-33c0-4e1b-9d3b-228dabf74ef8.jpg";
  const href = routeFor(locale, {
    kind: "salon",
    city: salon.cityKey ?? salon.city,
    salon: salon.slug,
  });

  return (
    <article className="w-[230px] shrink-0 sm:w-auto">
      <Link href={href} className="group block">
        <div className="relative aspect-[1.22/1] overflow-hidden rounded-xl bg-shell">
          <Image
            src={image}
            alt={`${salon.name} in ${salon.city}`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 230px, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-ink shadow-sm">
            Aanbevolen
          </span>
          <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/30 text-white backdrop-blur">
            <HeartIcon aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
        <div className="pt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-[15px] font-semibold text-ink">
              {salon.name}
            </h3>
            {salon.rating != null ? (
              <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium">
                <StarIcon aria-hidden="true" className="h-3 w-3 fill-ink" />
                {salon.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-[12px] text-muted">
            {salon.city}
            {salon.minimumPrice != null
              ? ` · vanaf ${formatMoney(salon.minimumPrice, locale)}`
              : ""}
          </p>
        </div>
      </Link>
    </article>
  );
}

export async function FreshaHome() {
  const salons = await getSalons({ locale, limit: 4 });

  return (
    <div className="min-h-screen bg-white text-ink">
      <section className="relative min-h-[620px] overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(125,150,243,0.52),transparent_36%),radial-gradient(circle_at_50%_78%,rgba(216,115,170,0.34),transparent_34%),radial-gradient(circle_at_31%_48%,rgba(199,211,251,0.72),transparent_30%),linear-gradient(90deg,#fff_2%,#f8f9ff_28%,#f6f8ff_72%,#fff_98%)]"
        />
        <MarketplaceHeader />

        <div className="relative z-10 mx-auto px-5 pb-10 pt-10 text-center sm:pt-11 md:pt-12">
          <h1 className="mx-auto max-w-[760px] text-balance text-[40px] font-semibold leading-[1.03] tracking-[-0.045em] text-ink sm:text-[48px] md:text-[52px]">
            Boek selfcare bij jou in de buurt
          </h1>
          <p className="mx-auto mt-1 max-w-2xl text-[14px] text-muted sm:text-[15px]">
            Ontdek de best beoordeelde beauty- en wellnessprofessionals over de hele wereld
          </p>

          <div className="mx-auto mt-10 max-w-[690px] sm:mt-11">
            <MarketplaceSearch />
          </div>

          <p className="mt-8 text-[16px] text-ink">
            <strong className="font-semibold">660.004</strong> afspraken gemaakt vandaag
          </p>

          <button
            type="button"
            className="mt-7 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[12px] font-semibold text-ink shadow-sm ring-1 ring-ink/10 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Download de app
            <QrCodeIcon aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </section>

      <main id="main" className="relative z-10 pb-24 sm:-mt-[205px]">
        <section
          aria-labelledby="recent-title"
          className="mx-auto max-w-[850px] px-5 md:px-1"
        >
          <div className="flex items-end justify-between gap-4">
            <h2
              id="recent-title"
              className="text-[21px] font-semibold tracking-[-0.025em] text-ink"
            >
              Recent bekeken
            </h2>
            <Link
              href={routeFor(locale, { kind: "salons" })}
              className="text-[13px] font-semibold underline-offset-4 hover:underline"
            >
              Alles bekijken
            </Link>
          </div>

          {salons.length > 0 ? (
            <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
              {salons.map((salon, index) => (
                <FreshaSalonCard
                  key={salon.id}
                  salon={salon}
                  priority={index < 2}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-canvas p-8 text-center text-[14px] text-muted ring-1 ring-line">
              Binnenkort vind je hier salons bij jou in de buurt.
            </div>
          )}

          {!hasLiveMarketplace() ? (
            <p className="mt-2 text-[11px] text-muted">
              Voorbeeldsalons worden alleen lokaal getoond.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
