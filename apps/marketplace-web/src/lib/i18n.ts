export const locales = ["nl-be", "fr-be", "nl-nl", "fr-fr", "de-de"] as const;

export type Locale = (typeof locales)[number];
export type Language = "nl" | "fr" | "de";
export type Country = "BE" | "NL" | "FR" | "DE";

type LocaleConfig = {
  locale: Locale;
  language: Language;
  country: Country;
  hreflang: string;
  htmlLang: string;
  label: string;
  regionLabel: string;
  currency: "EUR";
  paths: {
    salons: string;
    treatments: string;
    business: string;
    blog: string;
  };
};

export const localeConfig: Record<Locale, LocaleConfig> = {
  "nl-be": {
    locale: "nl-be",
    language: "nl",
    country: "BE",
    hreflang: "nl-BE",
    htmlLang: "nl-BE",
    label: "Nederlands",
    regionLabel: "België",
    currency: "EUR",
    paths: {
      salons: "salons",
      treatments: "behandelingen",
      business: "voor-bedrijven",
      blog: "inspiratie",
    },
  },
  "fr-be": {
    locale: "fr-be",
    language: "fr",
    country: "BE",
    hreflang: "fr-BE",
    htmlLang: "fr-BE",
    label: "Français",
    regionLabel: "Belgique",
    currency: "EUR",
    paths: {
      salons: "salons",
      treatments: "traitements",
      business: "pour-les-pros",
      blog: "inspiration",
    },
  },
  "nl-nl": {
    locale: "nl-nl",
    language: "nl",
    country: "NL",
    hreflang: "nl-NL",
    htmlLang: "nl-NL",
    label: "Nederlands",
    regionLabel: "Nederland",
    currency: "EUR",
    paths: {
      salons: "salons",
      treatments: "behandelingen",
      business: "voor-bedrijven",
      blog: "inspiratie",
    },
  },
  "fr-fr": {
    locale: "fr-fr",
    language: "fr",
    country: "FR",
    hreflang: "fr-FR",
    htmlLang: "fr-FR",
    label: "Français",
    regionLabel: "France",
    currency: "EUR",
    paths: {
      salons: "salons",
      treatments: "traitements",
      business: "pour-les-pros",
      blog: "inspiration",
    },
  },
  "de-de": {
    locale: "de-de",
    language: "de",
    country: "DE",
    hreflang: "de-DE",
    htmlLang: "de-DE",
    label: "Deutsch",
    regionLabel: "Deutschland",
    currency: "EUR",
    paths: {
      salons: "salons",
      treatments: "behandlungen",
      business: "fuer-betriebe",
      blog: "inspiration",
    },
  },
};

export const defaultLocale: Locale = "nl-be";
export const launchLocales: readonly Locale[] = ["nl-be", "fr-be"];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function assertLocale(value: string): Locale {
  if (!isLocale(value)) {
    throw new Error(`Unsupported locale: ${value}`);
  }
  return value;
}

export function localeForCountry(country: Country): Locale {
  return (
    locales.find((locale) => localeConfig[locale].country === country) ??
    defaultLocale
  );
}

export const citySlugs = {
  amsterdam: {
    "nl-be": "amsterdam",
    "fr-be": "amsterdam",
    "nl-nl": "amsterdam",
    "fr-fr": "amsterdam",
    "de-de": "amsterdam",
  },
  antwerp: {
    "nl-be": "antwerpen",
    "fr-be": "anvers",
    "nl-nl": "antwerpen",
    "fr-fr": "anvers",
    "de-de": "antwerpen",
  },
  brussels: {
    "nl-be": "brussel",
    "fr-be": "bruxelles",
    "nl-nl": "brussel",
    "fr-fr": "bruxelles",
    "de-de": "bruessel",
  },
  cologne: {
    "nl-be": "keulen",
    "fr-be": "cologne",
    "nl-nl": "keulen",
    "fr-fr": "cologne",
    "de-de": "koeln",
  },
  ghent: {
    "nl-be": "gent",
    "fr-be": "gand",
    "nl-nl": "gent",
    "fr-fr": "gand",
    "de-de": "gent",
  },
  kruishoutem: {
    "nl-be": "kruishoutem",
    "fr-be": "kruishoutem",
    "nl-nl": "kruishoutem",
    "fr-fr": "kruishoutem",
    "de-de": "kruishoutem",
  },
  merelbeke: {
    "nl-be": "merelbeke",
    "fr-be": "merelbeke",
    "nl-nl": "merelbeke",
    "fr-fr": "merelbeke",
    "de-de": "merelbeke",
  },
  paris: {
    "nl-be": "parijs",
    "fr-be": "paris",
    "nl-nl": "parijs",
    "fr-fr": "paris",
    "de-de": "paris",
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type CityKey = keyof typeof citySlugs;

export const cityCountries: Record<CityKey, Country> = {
  amsterdam: "NL",
  antwerp: "BE",
  brussels: "BE",
  cologne: "DE",
  ghent: "BE",
  kruishoutem: "BE",
  merelbeke: "BE",
  paris: "FR",
};

export const cityNames: Record<CityKey, Record<Language, string>> = {
  amsterdam: { nl: "Amsterdam", fr: "Amsterdam", de: "Amsterdam" },
  antwerp: { nl: "Antwerpen", fr: "Anvers", de: "Antwerpen" },
  brussels: { nl: "Brussel", fr: "Bruxelles", de: "Brüssel" },
  cologne: { nl: "Keulen", fr: "Cologne", de: "Köln" },
  ghent: { nl: "Gent", fr: "Gand", de: "Gent" },
  kruishoutem: {
    nl: "Kruishoutem",
    fr: "Kruishoutem",
    de: "Kruishoutem",
  },
  merelbeke: { nl: "Merelbeke", fr: "Merelbeke", de: "Merelbeke" },
  paris: { nl: "Parijs", fr: "Paris", de: "Paris" },
};

export function cityKeyFromSlug(locale: Locale, slug: string): CityKey | null {
  const match = Object.entries(citySlugs).find(
    ([, localized]) => localized[locale] === slug.toLowerCase(),
  );
  return (match?.[0] as CityKey | undefined) ?? null;
}

export function cityKeyFromName(name: string): CityKey | null {
  const normalized = slugify(name);
  const match = Object.entries(citySlugs).find(([, localized]) =>
    Object.values(localized).some((value) => value === normalized),
  );
  return (match?.[0] as CityKey | undefined) ?? null;
}

export function localesForCity(city: CityKey): Locale[] {
  return locales.filter(
    (locale) => localeConfig[locale].country === cityCountries[city],
  );
}

export const treatmentSlugs = {
  balayage: {
    "nl-be": "balayage",
    "fr-be": "balayage",
    "nl-nl": "balayage",
    "fr-fr": "balayage",
    "de-de": "balayage",
  },
  haircut: {
    "nl-be": "knippen",
    "fr-be": "coupe",
    "nl-nl": "knippen",
    "fr-fr": "coupe",
    "de-de": "haarschnitt",
  },
  keratin: {
    "nl-be": "keratine",
    "fr-be": "keratine",
    "nl-nl": "keratine",
    "fr-fr": "keratine",
    "de-de": "keratin",
  },
  nails: {
    "nl-be": "nagels",
    "fr-be": "ongles",
    "nl-nl": "nagels",
    "fr-fr": "ongles",
    "de-de": "naegel",
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type TreatmentKey = keyof typeof treatmentSlugs;

export const treatmentNames: Record<
  TreatmentKey,
  Record<Language, string>
> = {
  balayage: { nl: "Balayage", fr: "Balayage", de: "Balayage" },
  haircut: { nl: "Knippen", fr: "Coupe", de: "Haarschnitt" },
  keratin: { nl: "Keratine", fr: "Kératine", de: "Keratin" },
  nails: { nl: "Nagels", fr: "Ongles", de: "Nägel" },
};

export function treatmentKeyFromSlug(
  locale: Locale,
  slug: string,
): TreatmentKey | null {
  const match = Object.entries(treatmentSlugs).find(
    ([, localized]) => localized[locale] === slug.toLowerCase(),
  );
  return (match?.[0] as TreatmentKey | undefined) ?? null;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const blogPostSlugs = {
  onlineBooking: {
    "nl-be": "online-boeken-voor-je-salon",
    "fr-be": "reservation-en-ligne-pour-votre-salon",
    "nl-nl": "online-boeken-voor-je-salon",
    "fr-fr": "reservation-en-ligne-pour-votre-salon",
    "de-de": "online-buchung-fuer-deinen-salon",
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type BlogPostKey = keyof typeof blogPostSlugs;

export function blogPostKeyFromSlug(
  locale: Locale,
  slug: string,
): BlogPostKey | null {
  const match = Object.entries(blogPostSlugs).find(
    ([, localized]) => localized[locale] === slug.toLowerCase(),
  );
  return (match?.[0] as BlogPostKey | undefined) ?? null;
}

export function formatMoney(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeConfig[locale].htmlLang, {
    style: "currency",
    currency: localeConfig[locale].currency,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export type RouteDescriptor =
  | { kind: "home" }
  | { kind: "business" }
  | { kind: "salons" }
  | { kind: "city"; city: CityKey | string }
  | { kind: "salon"; city: CityKey | string; salon: string }
  | { kind: "treatments" }
  | { kind: "treatment"; treatment: TreatmentKey }
  | {
      kind: "local-treatment";
      treatment: TreatmentKey;
      city: CityKey | string;
    }
  | { kind: "blog" }
  | { kind: "blog-post"; post: BlogPostKey };

export function localizedCitySlug(
  locale: Locale,
  city: CityKey | string,
): string {
  if (city in citySlugs) {
    return citySlugs[city as CityKey][locale];
  }
  return slugify(city);
}

export function routeFor(locale: Locale, route: RouteDescriptor): string {
  const paths = localeConfig[locale].paths;
  const prefix = `/${locale}`;

  switch (route.kind) {
    case "home":
      return locale === defaultLocale ? "/" : prefix;
    case "business":
      return locale === defaultLocale
        ? "/for-businesses"
        : `${prefix}/${paths.business}`;
    case "salons":
      return `${prefix}/${paths.salons}`;
    case "city":
      return `${prefix}/${paths.salons}/${localizedCitySlug(locale, route.city)}`;
    case "salon":
      return `${prefix}/${paths.salons}/${localizedCitySlug(locale, route.city)}/${route.salon}`;
    case "treatments":
      return `${prefix}/${paths.treatments}`;
    case "treatment":
      return `${prefix}/${paths.treatments}/${treatmentSlugs[route.treatment][locale]}`;
    case "local-treatment":
      return `${prefix}/${paths.treatments}/${treatmentSlugs[route.treatment][locale]}/${localizedCitySlug(locale, route.city)}`;
    case "blog":
      return `${prefix}/${paths.blog}`;
    case "blog-post":
      return `${prefix}/${paths.blog}/${blogPostSlugs[route.post][locale]}`;
  }
}

export function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && isLocale(segment) ? segment : defaultLocale;
}
