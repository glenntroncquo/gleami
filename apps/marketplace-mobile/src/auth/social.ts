import { Platform } from 'react-native';

import { googleIosClientId, googleWebClientId, useMocks } from '@/src/config';

export type SocialProvider = 'apple' | 'google';

/** Native ID token plus whatever name the provider shared (Apple: first sign-in only). */
export type SocialCredential = {
  provider: SocialProvider;
  token: string;
  /** Raw nonce. Apple receives its SHA-256; Supabase receives this value. */
  nonce?: string;
  firstName?: string;
  lastName?: string;
};

export class SocialUnavailableError extends Error {}

export const providerLabel: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google' };

export const googleConfigured = Boolean(
  googleWebClientId && (Platform.OS !== 'ios' || googleIosClientId),
);

/** Apple is iOS-only here; Android would need the web OAuth flow. */
export async function isSocialAvailable(provider: SocialProvider): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (useMocks) return provider === 'google' || Platform.OS === 'ios';
  if (provider === 'google') return googleConfigured;
  if (Platform.OS !== 'ios') return false;
  try {
    const Apple = await import('expo-apple-authentication');
    return await Apple.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Resolves null when the user cancels the native sheet. */
export async function requestSocialCredential(provider: SocialProvider): Promise<SocialCredential | null> {
  return provider === 'apple' ? appleCredential() : googleCredential();
}

async function appleCredential(): Promise<SocialCredential | null> {
  let Apple: typeof import('expo-apple-authentication');
  let Crypto: typeof import('expo-crypto');
  try {
    Apple = await import('expo-apple-authentication');
    Crypto = await import('expo-crypto');
  } catch {
    throw new SocialUnavailableError('apple');
  }

  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple returned no identity token');
    return {
      provider: 'apple',
      token: credential.identityToken,
      nonce,
      firstName: credential.fullName?.givenName ?? undefined,
      lastName: credential.fullName?.familyName ?? undefined,
    };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}

let googleReady = false;

async function googleCredential(): Promise<SocialCredential | null> {
  let Google: typeof import('@react-native-google-signin/google-signin');
  try {
    Google = await import('@react-native-google-signin/google-signin');
  } catch {
    throw new SocialUnavailableError('google');
  }
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = Google;

  if (!googleReady) {
    GoogleSignin.configure({
      webClientId: googleWebClientId,
      iosClientId: googleIosClientId || undefined,
    });
    googleReady = true;
  }

  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const { idToken, user } = response.data;
    if (!idToken) throw new Error('Google returned no ID token');
    // Supabase owns the session. Dropping Google's lets the user pick an account next time.
    void GoogleSignin.signOut().catch(() => undefined);
    return {
      provider: 'google',
      token: idToken,
      firstName: user.givenName ?? undefined,
      lastName: user.familyName ?? undefined,
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
    throw error;
  }
}
