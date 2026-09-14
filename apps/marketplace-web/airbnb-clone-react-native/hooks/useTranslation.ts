import { translations, TranslationKey } from "@/constants/Translations";

export const useTranslation = () => {
  const t = (
    key: TranslationKey,
    params?: Record<string, string | number>
  ): string => {
    let text = translations[key];

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }

    return text;
  };

  return { t };
};
