export const launchLocales = ["nl-be", "fr-be", "en"] as const;

export type Locale = (typeof launchLocales)[number];
export type Language = "nl" | "fr" | "en";

type LocaleConfig = {
  locale: Locale;
  language: Language;
  hreflang: string;
  htmlLang: string;
  label: string;
  regionLabel: string;
  short: string;
  paths: {
    salons: string;
    treatments: string;
    business: string;
    blog: string;
  };
};

export const defaultLocale: Locale = "nl-be";

export const localeConfig: Record<Locale, LocaleConfig> = {
  "nl-be": {
    locale: "nl-be",
    language: "nl",
    hreflang: "nl-BE",
    htmlLang: "nl-BE",
    label: "Nederlands",
    regionLabel: "België",
    short: "NL",
    paths: {
      salons: "salons",
      treatments: "behandelingen",
      business: "voor-salons",
      blog: "blog",
    },
  },
  "fr-be": {
    locale: "fr-be",
    language: "fr",
    hreflang: "fr-BE",
    htmlLang: "fr-BE",
    label: "Français",
    regionLabel: "Belgique",
    short: "FR",
    paths: {
      salons: "salons",
      treatments: "traitements",
      business: "pour-salons",
      blog: "blog",
    },
  },
  en: {
    locale: "en",
    language: "en",
    hreflang: "en-BE",
    htmlLang: "en-BE",
    label: "English",
    regionLabel: "Belgium",
    short: "EN",
    paths: {
      salons: "salons",
      treatments: "treatments",
      business: "for-salons",
      blog: "blog",
    },
  },
};

export function isLocale(value: string): value is Locale {
  return launchLocales.includes(value as Locale);
}

export function languageOf(locale: Locale): Language {
  return localeConfig[locale].language;
}

export const MARKETPLACE_ORIGIN = (
  process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "https://gleami.eu"
).replace(/\/$/, "");

export function marketplacePath(locale: Locale, path = ""): string {
  const suffix = path ? `/${path.replace(/^\//, "")}` : "";
  if (locale === defaultLocale && suffix === "") return MARKETPLACE_ORIGIN;
  return `${MARKETPLACE_ORIGIN}/${locale}${suffix}`;
}
