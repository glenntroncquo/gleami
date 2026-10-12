export const MARKETPLACE_LOCALES = ["nl", "fr", "de", "en", "pt"] as const;

export type MarketplaceLocale = (typeof MARKETPLACE_LOCALES)[number];

/** Dutch when the visitor's language is missing or not one of the five. */
export function marketplaceLocale(value: string | null | undefined): MarketplaceLocale {
  const code = (value ?? "").trim().toLowerCase().slice(0, 2);
  return (MARKETPLACE_LOCALES as readonly string[]).includes(code)
    ? (code as MarketplaceLocale)
    : "nl";
}
