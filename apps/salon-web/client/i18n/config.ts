export type Locale = (typeof locales)[number];

export const locales = ["en", "nl", "fr", "pt"] as const;
export const defaultLocale: Locale = "nl";
