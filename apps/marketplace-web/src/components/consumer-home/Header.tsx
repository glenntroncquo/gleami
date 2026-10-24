"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LanguagePicker } from "@/components/LanguagePicker";
import type { Locale } from "@/lib/i18n";
import { Logo } from "./Logo";
import { homeCopy, type HomeCopy } from "./messages";

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
          <LanguagePicker locale={locale} route={{ kind: "home" }} variant="home" />
          <Link
            href={businessHref}
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface md:inline-flex"
          >
            {copy.forBusiness}
          </Link>
          <AccountMenu locale={locale} variant="home" />
        </nav>
      </div>
    </header>
  );
}
