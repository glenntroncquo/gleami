"use client";

import { SearchBar } from "./SearchBar";

type HeroProps = {
  placeLabel: string;
  onSearch: (query: string) => void;
};

export function Hero({ placeLabel, onSearch }: HeroProps) {
  return (
    <section className="pb-8 pt-12 lg:pb-12 lg:pt-20">
      <div className="mx-auto max-w-5xl px-5 text-center md:px-8">
        <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-navy sm:text-6xl lg:text-[84px]">
          Beauty & wellness,
          <br />
          booked <span className="text-peri">beautifully.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          Find and book salons near {placeLabel}. Real availability, on Gleami.
        </p>

        <div className="mx-auto mt-10 max-w-4xl text-left">
          <SearchBar placeLabel={placeLabel} onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}
