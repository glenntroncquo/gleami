"use client";

import Link from "next/link";
import { documents, overviewPath } from "@/content/documents";
import { getCopy } from "@/lib/copy";
import {
  languageOf,
  launchLocales,
  localeConfig,
  marketplacePath,
} from "@/lib/i18n";
import { useLegalRoute } from "@/lib/route";
import { Logo } from "@/components/Logo";

export function Header() {
  const { locale, active } = useLegalRoute();
  const copy = getCopy(languageOf(locale));
  const paths = localeConfig[locale].paths;

  return (
    <header className="border-b border-transparent bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
        <a
          href={marketplacePath(locale)}
          aria-label={copy.homeLabel}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
        >
          <Logo />
        </a>
        <nav aria-label={copy.navLabel} className="flex items-center gap-1 sm:gap-2">
          <div className="mr-1 flex items-center gap-0.5" aria-label={copy.languageLabel}>
            {launchLocales.map((item) => {
              const current = item === locale;
              const href =
                active === "overview"
                  ? overviewPath(item)
                  : `/${item}/${documents.find((doc) => doc.id === active)?.slug[languageOf(item)]}`;
              return (
                <Link
                  key={item}
                  href={href}
                  hrefLang={localeConfig[item].hreflang}
                  lang={localeConfig[item].htmlLang}
                  aria-current={current ? "true" : undefined}
                  className={`rounded-full px-2 py-1 text-[13px] font-semibold tracking-wide transition-colors duration-150 ${
                    current ? "text-navy" : "text-ink-faint hover:text-navy"
                  }`}
                >
                  {localeConfig[item].short}
                </Link>
              );
            })}
          </div>
          <a
            href={marketplacePath(locale, paths.business)}
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface md:inline-flex"
          >
            {copy.forBusiness}
          </a>
          <a
            href={marketplacePath(locale, "account")}
            className="rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface"
          >
            {copy.login}
          </a>
        </nav>
      </div>
    </header>
  );
}
