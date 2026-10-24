import Link from "next/link";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LanguagePicker } from "@/components/LanguagePicker";
import { MenuIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Logo } from "@/components/ui/Logo";
import { getCopy } from "@/lib/copy";
import {
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
        <LanguagePicker locale={locale} route={route} availableLocales={availableLocales} />
        <div className="hidden items-center gap-2 lg:flex">
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
