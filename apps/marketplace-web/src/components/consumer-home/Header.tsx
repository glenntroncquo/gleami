"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localeConfig, launchLocales, routeFor, type Locale } from "@/lib/i18n";
import { Logo } from "./Logo";
import { homeCopy, languageShort, type HomeCopy } from "./messages";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.gleami.eu";

type HeaderProps = {
  locale: Locale;
  homeHref: string;
  businessHref: string;
  copy?: HomeCopy;
};

export function Header({ locale, homeHref, businessHref, copy = homeCopy(locale) }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-page/85 backdrop-blur-md transition-colors duration-200 ${
        scrolled ? "border-line" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
        <Link
          href={homeHref}
          aria-label={copy.homeLabel}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
        >
          <Logo />
        </Link>
        <nav aria-label={copy.navLabel} className="flex items-center gap-1 sm:gap-2">
          <nav className="mr-1 flex items-center gap-0.5" aria-label={copy.languageLabel}>
            {launchLocales.map((item) => {
              const active = item === locale;
              return (
                <Link
                  key={item}
                  href={routeFor(item, { kind: "home" })}
                  hrefLang={localeConfig[item].hreflang}
                  lang={localeConfig[item].htmlLang}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-full px-2 py-1 text-[13px] font-semibold tracking-wide transition-colors duration-150 ${
                    active ? "text-navy" : "text-ink-faint hover:text-navy"
                  }`}
                >
                  {languageShort[item]}
                </Link>
              );
            })}
          </nav>
          <Link
            href={businessHref}
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface md:inline-flex"
          >
            {copy.forBusiness}
          </Link>
          <a
            href={appUrl}
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface sm:inline-flex"
          >
            {copy.login}
          </a>
          <a
            href={appUrl}
            className="whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700"
          >
            {copy.signup}
          </a>
        </nav>
      </div>
    </header>
  );
}
