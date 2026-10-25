import type { ReactNode } from "react";
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
  search?: ReactNode;
};

export function SiteHeader({
  locale,
  route,
  mode = "marketplace",
  availableLocales = locales,
  search,
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
    <header
      className={`sticky top-0 z-50 border-b border-line/80 ${
        search ? "bg-white" : "bg-canvas/90 backdrop-blur-xl"
      }`}
    >
      <nav
        aria-label="Main"
        className={
          search
            ? "flex flex-col gap-3 px-4 py-3 lg:h-[72px] lg:flex-row lg:items-center lg:gap-6 lg:px-6 lg:py-0"
            : "relative mx-auto grid h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 md:px-8"
        }
      >
        <div className={search ? "flex items-center justify-between lg:contents" : "contents"}>
          <Link
            href={routeFor(locale, { kind: "home" })}
            aria-label="Gleami"
            className="order-1 rounded-lg"
          >
            <Logo className={search ? "h-7 w-auto" : "h-8 w-auto"} />
          </Link>
          <div className="order-3 flex items-center justify-end gap-2">
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
          <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-white px-5 pb-7 pt-2 shadow-soft">
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
        </div>
        {search ? (
          <div className="order-2 min-w-0 lg:mx-auto lg:w-full lg:max-w-[680px]">{search}</div>
        ) : (
          <ul className="no-scrollbar order-2 hidden min-w-0 items-center justify-center gap-0.5 overflow-x-auto lg:flex">
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
        )}
      </nav>
    </header>
  );
}
