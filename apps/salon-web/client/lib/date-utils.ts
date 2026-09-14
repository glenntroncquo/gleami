import { format } from "date-fns";
import { nl, fr, enUS, pt } from "date-fns/locale";
import { useLocale } from "next-intl";

const localeMap = {
  nl: nl,
  fr: fr,
  en: enUS,
  pt: pt,
} as const;

export function useLocaleAwareDateFormat() {
  const locale = useLocale() as keyof typeof localeMap;
  
  return (date: Date | number | string, formatStr: string): string => {
    return format(new Date(date), formatStr, { 
      locale: localeMap[locale] || enUS 
    });
  };
}

export function formatWithLocale(date: Date | number | string, formatStr: string, locale: string): string {
  const dateLocale = localeMap[locale as keyof typeof localeMap] || enUS;
  return format(new Date(date), formatStr, { locale: dateLocale });
}

export function useDateFnsLocale() {
  const locale = useLocale() as keyof typeof localeMap;
  return localeMap[locale] || enUS;
}