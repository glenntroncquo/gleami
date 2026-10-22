import Link from "next/link";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { ChevronDownIcon, GlobeIcon, MenuIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Logo } from "@/components/ui/Logo";
import { getCopy } from "@/lib/copy";
import {
  localeConfig,
  locales,
  routeFor,
  type Locale,
  type RouteDescriptor,
} from "@/lib/i18n";

type SiteHeaderProps = {
  locale: Locale;
  route: RouteDescriptor;
  mode?: "marketplace" | "business";
  availableLocales?: readonly Locale[];
};

export function SiteHeader({
  locale,
  route,
  mode = "marketplace",
  availableLocales = locales,
}: SiteHeaderProps) {
  const copy = getCopy(locale);
  const links =
    mode === "business"
      ? [
          { label: copy.nav.product, href: "#product" },
          { label: copy.nav.discover, href: routeFor(locale, { kind: "salons" }) },
          { label: copy.nav.treatments, href: routeFor(locale, { kind: "treatments" }) },
          { label: copy.business.faqEyebrow, href: "#faq" },
        ]
      : [
          { label: copy.nav.discover, href: routeFor(locale, { kind: "salons" }) },
          { label: copy.nav.treatments, href: routeFor(locale, { kind: "treatments" }) },
          { label: copy.nav.business, href: routeFor(locale, { kind: "business" }) },
        ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
      <nav
        aria-label="Main"
        className="relative mx-auto grid h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 md:px-8"
      >
        <Link
          href={routeFor(locale, { kind: "home" })}
          aria-label="Gleami"
          className="rounded-lg"
        >
          <Logo />
        </Link>

        <ul className="no-scrollbar hidden min-w-0 items-center justify-center gap-0.5 overflow-x-auto lg:flex">
          {links.map((link) => (
            <li key={link.label} className="shrink-0">
              <Link
                href={link.href}
                className="whitespace-nowrap rounded-full px-2.5 py-2 text-[14px] text-ink/70 transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2">
        <div className="hidden items-center gap-2 lg:flex">
          <details className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-2.5 text-[13px] text-muted hover:bg-ink/[0.04] hover:text-ink">
              <GlobeIcon aria-hidden="true" className="h-4 w-4" />
              {localeConfig[locale].hreflang.slice(0, 2).toUpperCase()}
              <ChevronDownIcon
                aria-hidden="true"
                className="h-3.5 w-3.5 transition group-open:rotate-180"
              />
            </summary>
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white p-2 shadow-float ring-1 ring-line">
              {availableLocales.map((item) => (
                <Link
                  key={item}
                  href={routeFor(item, route)}
                  hrefLang={localeConfig[item].hreflang}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] hover:bg-shell ${
                    item === locale ? "font-semibold text-ink" : "text-muted"
                  }`}
                >
                  <span>{localeConfig[item].label}</span>
                  <span className="text-[11px] text-subtle">
                    {localeConfig[item].regionLabel}
                  </span>
                </Link>
              ))}
            </div>
          </details>
          <AccountMenu locale={locale} />
          <ButtonLink
            href={routeFor(locale, { kind: "business" }) + "#contact"}
            size="sm"
          >
            {copy.nav.business}
          </ButtonLink>
        </div>

        <details className="group lg:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-white ring-1 ring-line">
            <MenuIcon aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">{copy.nav.menu}</span>
          </summary>
          <div className="fixed inset-x-0 top-16 border-b border-line bg-canvas px-5 pb-7 pt-2 shadow-soft">
            <ul>
              {links.map((link) => (
                <li key={link.label} className="border-b border-line">
                  <Link
                    href={link.href}
                    className="block py-4 text-[19px] font-medium tracking-tight"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {availableLocales.map((item) => (
                <Link
                  key={item}
                  href={routeFor(item, route)}
                  hrefLang={localeConfig[item].hreflang}
                  className={`rounded-full px-3 py-2 text-[12px] ring-1 ring-line ${
                    item === locale ? "bg-ink text-white" : "bg-white text-muted"
                  }`}
                >
                  {localeConfig[item].hreflang}
                </Link>
              ))}
            </div>
            <AccountMenu locale={locale} stacked />
            <ButtonLink
              href={routeFor(locale, { kind: "business" }) + "#contact"}
              className="mt-5 w-full"
            >
              {copy.nav.business}
            </ButtonLink>
          </div>
        </details>
        </div>
      </nav>
    </header>
  );
}
