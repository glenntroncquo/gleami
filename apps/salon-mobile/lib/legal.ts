import Constants from 'expo-constants';

type LegalExtra = {
  privacyUrl?: string;
  termsUrl?: string;
};

function extra(): LegalExtra {
  return (Constants.expoConfig?.extra ?? {}) as LegalExtra;
}

/** Accept only http(s) URLs. Empty / unset / invalid values hide the row. */
export function normalizeLegalUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getPrivacyUrl(): string | null {
  return normalizeLegalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL || extra().privacyUrl);
}

export function getTermsUrl(): string | null {
  return normalizeLegalUrl(process.env.EXPO_PUBLIC_TERMS_URL || extra().termsUrl);
}
