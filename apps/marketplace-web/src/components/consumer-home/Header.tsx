"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.gleami.eu";

type HeaderProps = {
  homeHref: string;
  businessHref: string;
};

export function Header({ homeHref, businessHref }: HeaderProps) {
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
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          href={homeHref}
          aria-label="Gleami home"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link
            href={businessHref}
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface md:inline-flex"
          >
            For business
          </Link>
          <a
            href={appUrl}
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface sm:inline-flex"
          >
            Log in
          </a>
          <a
            href={appUrl}
            className="whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700"
          >
            Sign up
          </a>
        </nav>
      </div>
    </header>
  );
}
