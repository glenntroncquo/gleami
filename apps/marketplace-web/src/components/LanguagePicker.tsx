import Link from "next/link";
import { ChevronDownIcon, GlobeIcon } from "lucide-react";
import { DismissableDetails } from "@/components/ui/DismissableDetails";
import {
  localeConfig,
  locales,
  routeFor,
  type Locale,
  type RouteDescriptor,
} from "@/lib/i18n";

type LanguagePickerProps = {
  locale: Locale;
  route: RouteDescriptor;
  availableLocales?: readonly Locale[];
  variant?: "site" | "home";
};

export function LanguagePicker({
  locale,
  route,
  availableLocales = locales,
  variant = "site",
}: LanguagePickerProps) {
  const current = localeConfig[locale];
  const summary =
    variant === "home"
      ? "flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-navy hover:bg-surface [&::-webkit-details-marker]:hidden"
      : "flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-2.5 text-[13px] text-muted hover:bg-ink/[0.04] hover:text-ink [&::-webkit-details-marker]:hidden";

  return (
    <DismissableDetails className="group relative">
      <summary className={summary} aria-label={`${current.label}, ${current.regionLabel}`}>
        <GlobeIcon aria-hidden="true" className="h-4 w-4" />
        {current.hreflang.slice(0, 2).toUpperCase()}
        <ChevronDownIcon
          aria-hidden="true"
          className="h-3.5 w-3.5 transition group-open:rotate-180"
        />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl bg-white p-2 shadow-float ring-1 ring-line">
        {availableLocales.map((item) => (
          <Link
            key={item}
            href={routeFor(item, route)}
            hrefLang={localeConfig[item].hreflang}
            lang={localeConfig[item].htmlLang}
            aria-current={item === locale ? "true" : undefined}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] hover:bg-shell ${
              item === locale ? "font-semibold text-ink" : "text-muted"
            }`}
          >
            <span>{localeConfig[item].label}</span>
            <span className="text-[11px] text-subtle">{localeConfig[item].regionLabel}</span>
          </Link>
        ))}
      </div>
    </DismissableDetails>
  );
}
