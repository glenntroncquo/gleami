import Link from "next/link";
import { GlobeIcon } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { getCopy } from "@/lib/copy";
import {
  cityNames,
  localeConfig,
  locales,
  routeFor,
  type Locale,
  type RouteDescriptor,
} from "@/lib/i18n";

type SiteFooterProps = {
  locale: Locale;
  route: RouteDescriptor;
  availableLocales?: readonly Locale[];
};

export function SiteFooter({
  locale,
  route,
  availableLocales = locales,
}: SiteFooterProps) {
  const copy = getCopy(locale);
  const language = localeConfig[locale].language;
  const cities = ["ghent", "antwerp", "brussels"] as const;

  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Logo />
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
              {copy.footer.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
              <GlobeIcon aria-hidden="true" className="h-4 w-4" />
              {localeConfig[locale].label} · {localeConfig[locale].regionLabel}
            </div>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7"
          >
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.marketplace}</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href={routeFor(locale, { kind: "salons" })}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.salons}
                  </Link>
                </li>
                <li>
                  <Link
                    href={routeFor(locale, { kind: "treatments" })}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.nav.treatments}
                  </Link>
                </li>
                {cities.map((city) => (
                  <li key={city}>
                    <Link
                      href={routeFor(locale, { kind: "city", city })}
                      className="text-[14px] text-muted hover:text-ink"
                    >
                      {cityNames[city][language]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.company}</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href={routeFor(locale, { kind: "business" })}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.nav.business}
                  </Link>
                </li>
                <li>
                  <Link
                    href={routeFor(locale, { kind: "business" }) + "#product"}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.business.overviewTitle}
                  </Link>
                </li>
                <li>
                  <Link
                    href={routeFor(locale, { kind: "business" }) + "#faq"}
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.business.faqEyebrow}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.legal}</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href="https://booking.salonify.co/privacy"
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.privacy}
                  </a>
                </li>
                <li>
                  <a
                    href="https://booking.salonify.co/terms"
                    className="text-[14px] text-muted hover:text-ink"
                  >
                    {copy.footer.terms}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-8 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Gleami. {copy.footer.rights}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {availableLocales.map((item) => (
                <Link
                  key={item}
                  href={routeFor(item, route)}
                  hrefLang={localeConfig[item].hreflang}
                  className="hover:text-ink"
                >
                  {localeConfig[item].hreflang}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
