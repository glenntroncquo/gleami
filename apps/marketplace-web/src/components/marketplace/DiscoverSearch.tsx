"use client";

import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { CityField } from "@/components/consumer-home/CityField";
import type { HomeCopy } from "@/components/consumer-home/messages";
import { WhenField, type WhenValue } from "@/components/consumer-home/WhenField";
import type { Locale } from "@/lib/i18n";
import type { MapPoint } from "@/lib/places";

type DiscoverSearchProps = {
  locale: Locale;
  copy: HomeCopy;
  treatment: string;
  city: string | null;
  when: WhenValue;
  pending?: boolean;
  onTreatment: (value: string) => void;
  onCity: (label: string | null, point?: MapPoint | null) => void;
  onWhen: (value: WhenValue) => void;
  onSearch: () => void;
};

export function DiscoverSearch({
  locale,
  copy,
  treatment,
  city,
  when,
  pending = false,
  onTreatment,
  onCity,
  onWhen,
  onSearch,
}: DiscoverSearchProps) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }}
      className="flex h-12 items-center gap-0 rounded-full border border-line bg-white pl-4 pr-1.5 shadow-[0_2px_6px_-3px_rgba(11,28,63,0.12)] transition-[box-shadow,border-color] duration-200 focus-within:border-peri/40 focus-within:shadow-[0_0_0_3px_#F1F4FE]"
    >
      <label className="flex min-w-0 flex-[1.25] items-center gap-2">
        <SearchIcon className="hidden h-4 w-4 shrink-0 text-ink-muted sm:block" aria-hidden="true" />
        <span className="sr-only">{copy.treatment}</span>
        <input
          value={treatment}
          enterKeyHint="search"
          placeholder={copy.allTreatments}
          onChange={(event) => onTreatment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            onSearch();
            event.currentTarget.blur();
          }}
          className="h-10 min-w-0 w-full bg-transparent text-base text-navy placeholder:text-ink-muted focus:outline-none sm:text-[14px]"
        />
      </label>
      {treatment ? (
        <button type="button" aria-label={copy.clearSearch} onClick={() => onTreatment("")} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-page">
          <XIcon size={13} aria-hidden="true" />
        </button>
      ) : null}
      <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-line sm:mx-3" />
      <CityField
        locale={locale}
        copy={copy}
        value={city}
        fallback={copy.placeBelgium}
        compact
        onChange={onCity}
      />
      <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-line sm:mx-3" />
      <WhenField locale={locale} copy={copy} value={when} compact onChange={onWhen} />
      <button
        type="submit"
        aria-label={copy.search}
        className="ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-white transition-[background-color,transform] duration-200 hover:bg-peri-dark active:scale-95"
      >
        {pending ? <LoaderCircleIcon className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <SearchIcon className="h-4 w-4" aria-hidden="true" />}
      </button>
    </form>
  );
}
