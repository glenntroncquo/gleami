import {
  MapPinIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { getCopy } from "@/lib/copy";
import { routeFor, type Locale } from "@/lib/i18n";

type SearchFormProps = {
  locale: Locale;
  defaultQuery?: string;
  defaultPlace?: string;
  compact?: boolean;
};

export function SearchForm({
  locale,
  defaultQuery = "",
  defaultPlace = "",
  compact = false,
}: SearchFormProps) {
  const copy = getCopy(locale);

  return (
    <form
      action={routeFor(locale, { kind: "salons" })}
      className={`mx-auto flex w-full items-center rounded-[22px] bg-white p-2 shadow-float ring-1 ring-line ${
        compact ? "max-w-3xl" : "max-w-4xl"
      }`}
    >
      <label className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-5">
        <SearchIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-muted" />
        <span className="sr-only">{copy.consumer.searchPlaceholder}</span>
        <input
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder={copy.consumer.searchPlaceholder}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
        />
      </label>
      <span aria-hidden="true" className="hidden h-8 w-px bg-line sm:block" />
      <label className="hidden min-w-0 flex-1 items-center gap-3 px-5 sm:flex">
        <MapPinIcon
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-muted"
        />
        <span className="sr-only">{copy.consumer.locationPlaceholder}</span>
        <input
          name="place"
          type="search"
          defaultValue={defaultPlace}
          placeholder={copy.consumer.locationPlaceholder}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
        />
      </label>
      <button
        type="submit"
        className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-[14px] font-medium text-white transition hover:bg-ink-soft sm:px-6"
      >
        <SlidersHorizontalIcon
          aria-hidden="true"
          className="h-4 w-4 sm:hidden"
        />
        <span className="hidden sm:inline">{copy.actions.search}</span>
        <SearchIcon aria-hidden="true" className="hidden h-4 w-4 sm:block" />
      </button>
    </form>
  );
}
