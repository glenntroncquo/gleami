"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeftIcon, LoaderCircleIcon, MapPinIcon, NavigationIcon, XIcon } from "lucide-react";
import { retrieveCity, suggestCities, type CitySuggestion, type MapPoint } from "@/lib/places";
import type { Locale } from "@/lib/i18n";
import type { HomeCopy } from "./messages";
import { searchFieldClass } from "./search-field";

type CityFieldProps = {
  locale: Locale;
  copy: HomeCopy;
  value: string | null;
  fallback: string;
  compact?: boolean;
  onChange: (city: string | null, point?: MapPoint | null) => void;
};

export function CityField({
  locale,
  copy,
  value,
  fallback,
  compact = false,
  onChange,
}: CityFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef(crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!open) return;
    const query = draft.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      suggestCities(locale, query, sessionRef.current, controller.signal)
        .then((next) => {
          setResults(next);
          setActive(-1);
          setStatus("idle");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResults([]);
          setStatus("error");
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft, locale, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    if (phone) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function closeWith(label: string | null, point?: MapPoint | null) {
    onChange(label, point);
    setDraft("");
    setResults([]);
    setStatus("idle");
    setActive(-1);
    setOpen(false);
    setLocationError("");
    sessionRef.current = crypto.randomUUID();
    desktopRef.current?.blur();
  }

  function choose(suggestion: CitySuggestion) {
    const token = sessionRef.current;
    closeWith(suggestion.name);
    retrieveCity(suggestion.id, token)
      .then((point) => onChange(suggestion.name, point))
      .catch(() => undefined);
  }

  function chooseCurrent() {
    if (locating) return;
    if (!navigator.geolocation) {
      setLocationError(copy.currentLocationError);
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        closeWith(copy.currentLocation, {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
      },
      () => {
        setLocating(false);
        setLocationError(copy.currentLocationError);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function onQueryChange(next: string) {
    setDraft(next);
    setOpen(true);
    if (next.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      setActive(-1);
      return;
    }
    setStatus("loading");
    setActive(-1);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => {
        const next = current + delta;
        if (next < 0) return results.length - 1;
        if (next >= results.length) return 0;
        return next;
      });
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const suggestion = results[active];
    if (suggestion) choose(suggestion);
    else event.currentTarget.blur();
  }

  const searching = draft.trim().length >= 2;
  const display = value ?? fallback;

  const field = (
    <>
      <input
        ref={desktopRef}
        value={open ? draft : display}
        placeholder={compact ? fallback : copy.cityPlaceholder}
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-label={copy.where}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => {
          setDraft(value ?? "");
          setOpen(true);
          if (window.matchMedia("(max-width: 767px)").matches) {
            window.setTimeout(() => sheetRef.current?.focus(), 0);
          }
        }}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onInputKeyDown}
        className={`w-full min-w-0 bg-transparent text-navy placeholder:text-ink-faint focus:outline-none ${
          compact ? "h-10 text-base sm:text-[14px]" : "text-base md:text-[15px]"
        }`}
      />
      {value ? (
        <button
          type="button"
          aria-label={copy.pickerClear}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => closeWith(null)}
          className="text-ink-faint hover:text-navy"
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </>
  );

  return (
    <div ref={rootRef} className={compact ? "relative min-w-0 flex-1" : "relative min-w-0 md:flex-1"}>
      {compact ? (
        <div className="flex min-w-0 items-center gap-2">{field}</div>
      ) : (
      <div className={searchFieldClass}>
        <span className="block text-xs font-semibold text-navy">{copy.where}</span>
        <div className="mt-0.5 hidden items-center gap-2 md:flex">{field}</div>
        <button
          type="button"
          onClick={() => {
            setDraft(value ?? "");
            setOpen(true);
            window.setTimeout(() => sheetRef.current?.focus(), 0);
          }}
          className="mt-0.5 w-full truncate bg-transparent text-left text-base text-navy md:hidden"
        >
          {display}
        </button>
      </div>
      )}

      {open ? (
        <SuggestionList
          id={listId}
          copy={copy}
          results={results}
          status={status}
          searching={searching}
          active={active}
          locating={locating}
          locationError={locationError}
          onChoose={choose}
          onCurrent={chooseCurrent}
          className="panel-in absolute left-0 top-full z-40 mt-3 hidden w-[340px] overflow-hidden rounded-3xl bg-white py-2 shadow-float ring-1 ring-line md:block"
        />
      ) : null}

      {open ? (
        <div className="panel-in fixed inset-0 z-40 bg-white md:hidden">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.pickerDone}
              className="flex h-11 w-8 items-center justify-center text-navy"
            >
              <ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <h2 className="text-xl font-semibold tracking-tight text-navy">{copy.cityTitle}</h2>
          </div>
          <div className="px-5">
            <label className="flex h-14 items-center gap-3 rounded-2xl border border-line px-4 focus-within:border-peri">
              <MapPinIcon className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
              <input
                ref={sheetRef}
                value={draft}
                placeholder={copy.cityPlaceholder}
                aria-label={copy.cityPlaceholder}
                autoComplete="off"
                enterKeyHint="search"
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={onInputKeyDown}
                className="w-full bg-transparent text-base text-navy placeholder:text-ink-faint focus:outline-none"
              />
              {draft ? (
                <button
                  type="button"
                  onClick={() => onQueryChange("")}
                  aria-label={copy.pickerClear}
                  className="text-navy"
                >
                  <XIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}
            </label>
          </div>
          <SuggestionList
            id={`${listId}-sheet`}
            copy={copy}
            results={results}
            status={status}
            searching={searching}
            active={active}
            locating={locating}
            locationError={locationError}
            onChoose={choose}
            onCurrent={chooseCurrent}
            className="mt-2 flex-1 overflow-y-auto"
          />
        </div>
        </div>
      ) : null}
    </div>
  );
}

function SuggestionList({
  id,
  copy,
  results,
  status,
  searching,
  active,
  locating,
  locationError,
  onChoose,
  onCurrent,
  className,
}: {
  id: string;
  copy: HomeCopy;
  results: CitySuggestion[];
  status: "idle" | "loading" | "error";
  searching: boolean;
  active: number;
  locating: boolean;
  locationError: string;
  onChoose: (suggestion: CitySuggestion) => void;
  onCurrent: () => void;
  className: string;
}) {
  const showResults = searching && status !== "loading";
  return (
    <div className={className}>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onCurrent}
        disabled={locating}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-page disabled:hover:bg-transparent"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peri-tint text-peri">
          {locating ? (
            <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <NavigationIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-navy">
            {copy.currentLocation}
          </span>
          {locationError ? (
            <span className="block truncate text-sm text-ink-muted">{locationError}</span>
          ) : null}
        </span>
      </button>
      {searching ? <div className="mx-4 border-t border-line" /> : null}
      {status === "loading" ? <CitySkeletons /> : null}
      {status === "error" ? (
        <p className="px-4 py-3 text-sm text-ink-muted">{copy.cityError}</p>
      ) : null}
      {showResults && results.length === 0 && status === "idle" ? (
        <p className="px-4 py-3 text-sm text-ink-muted">{copy.cityEmpty}</p>
      ) : null}
      {showResults && results.length > 0 ? (
        <ul id={id} role="listbox" aria-label={copy.cityTitle} className="panel-in">
          {results.map((suggestion, index) => (
            <li key={suggestion.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChoose(suggestion)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${
                  index === active ? "bg-peri-tint" : "hover:bg-page"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peri-tint text-peri">
                  <MapPinIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-navy">
                    {suggestion.name}
                  </span>
                  {suggestion.place ? (
                    <span className="block truncate text-sm text-ink-muted">{suggestion.place}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CitySkeletons() {
  return (
    <div aria-hidden="true" className="py-1">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-4 py-3">
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-peri-tint" />
          <span className="min-w-0 flex-1">
            <span className="block h-3.5 w-28 animate-pulse rounded-full bg-line" />
            <span className="mt-2 block h-3 w-40 animate-pulse rounded-full bg-line/70" />
          </span>
        </div>
      ))}
    </div>
  );
}
