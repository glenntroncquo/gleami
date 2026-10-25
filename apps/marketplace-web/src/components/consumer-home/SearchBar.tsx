"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MapIcon, SearchIcon } from "lucide-react";
import { routeFor, type Locale } from "@/lib/i18n";
import type { MapPoint } from "@/lib/places";
import { CityField } from "./CityField";
import type { HomeCopy } from "./messages";
import { searchFieldClass } from "./search-field";
import { WhenField, type WhenValue } from "./WhenField";

type SearchBarProps = {
  locale: Locale;
  copy: HomeCopy;
  nearby: boolean;
  near?: MapPoint | null;
  initialQuery?: string;
  onSearch: (query: string) => void;
};

export function SearchBar({
  locale,
  copy,
  nearby,
  near = null,
  initialQuery = "",
  onSearch,
}: SearchBarProps) {
  const router = useRouter();
  const [treatment, setTreatment] = useState(initialQuery);
  const [city, setCity] = useState<string | null>(null);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [when, setWhen] = useState<WhenValue>({ date: null, part: "any" });
  const lastSearchRef = useRef(initialQuery.trim());
  const debounceRef = useRef<number | null>(null);
  const onSearchRef = useRef(onSearch);
  const latestRef = useRef({ city, point, when, near, copy, locale });
  onSearchRef.current = onSearch;
  latestRef.current = { city, point, when, near, copy, locale };

  function openMap(query: string) {
    const { city: placeLabel, point: placePoint, when: whenValue, near: nearPoint, copy: labels, locale: currentLocale } = latestRef.current;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const automatic = !placeLabel && nearPoint && !(nearPoint.lat === 0 && nearPoint.lng === 0)
      ? { label: labels.placeNear, ...nearPoint }
      : null;
    const chosen = placeLabel && placePoint && !(placePoint.lat === 0 && placePoint.lng === 0)
      ? { label: placeLabel, ...placePoint }
      : automatic;
    if (chosen) {
      params.set("where", chosen.label);
      params.set("lat", String(chosen.lat));
      params.set("lng", String(chosen.lng));
    }
    if (whenValue.date) params.set("date", whenValue.date);
    if (whenValue.part !== "any") params.set("part", whenValue.part);
    const path = routeFor(currentLocale, { kind: "salons" });
    const search = params.toString();
    router.push(search ? `${path}?${search}` : path);
  }

  function searchNow(value: string) {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const trimmed = value.trim();
    if (trimmed === lastSearchRef.current) return;
    lastSearchRef.current = trimmed;
    onSearchRef.current(trimmed);
  }

  useEffect(() => {
    const trimmed = treatment.trim();
    if (trimmed === lastSearchRef.current) return;
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      if (trimmed === lastSearchRef.current) return;
      lastSearchRef.current = trimmed;
      onSearchRef.current(trimmed);
    }, 500);
    return () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [treatment]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        searchNow(treatment);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
        if (event.target.id !== "treatment") return;
        event.preventDefault();
        searchNow(treatment);
        event.target.blur();
      }}
      className="grid gap-1 rounded-3xl border border-line bg-white p-2 shadow-soft md:flex md:items-center md:rounded-full"
    >
      <Field label={copy.treatment} htmlFor="treatment" className="md:flex-[1.3]">
        <input
          id="treatment"
          value={treatment}
          enterKeyHint="search"
          onChange={(event) => setTreatment(event.target.value)}
          placeholder={copy.treatmentPlaceholder}
          className="w-full bg-transparent text-base text-navy placeholder:text-ink-faint focus:outline-none md:text-[15px]"
        />
      </Field>
      <Divider />
      <CityField
        locale={locale}
        copy={copy}
        value={city}
        fallback={nearby ? copy.placeNear : copy.placeBelgium}
        onChange={(label, nextPoint) => {
          setCity(label);
          setPoint(label && nextPoint ? nextPoint : null);
        }}
      />
      <Divider />
      <WhenField locale={locale} copy={copy} value={when} onChange={setWhen} />
      <div className="mt-1 flex h-12 overflow-hidden rounded-full md:mt-0 md:h-14">
        <button
          type="submit"
          className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap bg-navy px-5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-2"
        >
          <SearchIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          {copy.search}
        </button>
        <button
          type="button"
          aria-label={copy.showMapBar}
          onClick={() => openMap(treatment.trim())}
          className="grid w-12 shrink-0 place-items-center border-l border-white/20 bg-navy text-white transition-colors duration-150 hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri focus-visible:ring-offset-2"
        >
          <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block min-w-0 cursor-text ${searchFieldClass} ${className}`}
    >
      <span className="block text-xs font-semibold text-navy">{label}</span>
      <span className="mt-0.5 block">{children}</span>
    </label>
  );
}

function Divider() {
  return <span className="hidden h-8 w-px shrink-0 bg-line md:block" aria-hidden="true" />;
}
