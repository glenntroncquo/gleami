"use client";

import type { Locale } from "@/lib/i18n";
import type { MapPoint } from "@/lib/places";
import { SearchBar } from "./SearchBar";
import type { HomeCopy } from "./messages";

type HeroProps = {
  locale: Locale;
  copy: HomeCopy;
  nearby: boolean;
  near?: MapPoint | null;
  onSearch: (query: string) => void;
};

export function Hero({ locale, copy, nearby, near = null, onSearch }: HeroProps) {
  return (
    <section className="pb-8 pt-12 lg:pb-12 lg:pt-20">
      <div className="mx-auto max-w-5xl px-5 text-center md:px-8">
        <h1 className="text-[36px] font-semibold leading-[1.02] tracking-[-0.04em] text-navy sm:text-5xl lg:text-[84px]">
          {copy.heroLead}
          <br />
          <span className="text-peri">{copy.heroAccent}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          {nearby ? copy.heroNear : copy.heroBelgium}
        </p>

        <div className="mx-auto mt-10 max-w-4xl text-left">
          <SearchBar locale={locale} copy={copy} nearby={nearby} near={near} onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}
