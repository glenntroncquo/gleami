"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { type Locale, locales } from "@/i18n/config";

export function useLocaleNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;

  const getCurrentLocaleFromPath = (): Locale => {
    const pathSegments = pathname.split('/');
    const pathLocale = pathSegments[1] as Locale;
    return locales.includes(pathLocale) ? pathLocale : currentLocale;
  };

  const switchLocale = (newLocale: Locale) => {
    const pathSegments = pathname.split('/');
    pathSegments[1] = newLocale;
    const newPath = pathSegments.join('/');
    router.push(newPath);
  };

  const getLocalizedPath = (targetLocale: Locale, path?: string): string => {
    const targetPath = path || pathname;
    const pathSegments = targetPath.split('/');
    pathSegments[1] = targetLocale;
    return pathSegments.join('/');
  };

  return {
    currentLocale: getCurrentLocaleFromPath(),
    switchLocale,
    getLocalizedPath,
  };
}