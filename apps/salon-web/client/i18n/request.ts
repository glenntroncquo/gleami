import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config";

export default getRequestConfig(async ({ locale }) => {
  // Use default locale if locale is undefined
  const resolvedLocale = locale || defaultLocale;

  // Validate that the resolved locale is valid
  if (!locales.includes(resolvedLocale as (typeof locales)[number])) {
    // Fallback to default locale
    const fallbackLocale = defaultLocale;
    return {
      locale: fallbackLocale,
      messages: (await import(`../messages/${fallbackLocale}.json`)).default,
    };
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
