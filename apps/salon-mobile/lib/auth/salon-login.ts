import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const RESEND_MS = 60_000;

export type EmailAccount = { exists: boolean; hasPassword: boolean };

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function isUnconfirmedEmailError(error: { code?: string; message?: string }) {
  return error.code === 'email_not_confirmed' || (error.message ?? '').toLowerCase().includes('email not confirmed');
}

export async function lookupAuthEmail(email: string): Promise<EmailAccount> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('Missing Supabase configuration');

  const response = await fetch(`${supabaseUrl}/functions/v1/marketplace-auth-lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ email: normalizeEmail(email) }),
  });
  const result = (await response.json()) as { error?: string; exists?: boolean; hasPassword?: boolean };
  if (!response.ok) throw new Error(result.error ?? 'Unable to check this email');
  return { exists: Boolean(result.exists), hasPassword: Boolean(result.hasPassword) };
}

/** Passwordless accounts get a one-time code. Matches salon-web `startEmailAuth`. */
export async function startEmailAuth(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export function authRedirectUrl() {
  return Linking.createURL('auth/callback');
}

function paramsFromUrl(url: string) {
  const params: Record<string, string> = {};
  const read = (part: string) => {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [rawKey, rawValue = ''] = pair.split('=');
      if (!rawKey) continue;
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    }
  };
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    const queryEnd = hashIndex > queryIndex ? hashIndex : url.length;
    read(url.slice(queryIndex + 1, queryEnd));
  }
  if (hashIndex >= 0) read(url.slice(hashIndex + 1));
  return params;
}

export async function completeSessionFromUrl(url: string) {
  const params = paramsFromUrl(url);
  if (params.error_description || params.error) {
    throw new Error(params.error_description || params.error);
  }
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return;
  }
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
  }
}

export async function signInWithSocial(provider: 'google' | 'apple') {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;
  if (Platform.OS === 'web' || !data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  await completeSessionFromUrl(result.url);
}

export function isAuthCallbackUrl(url: string) {
  return url.includes('auth/callback');
}

function cooldownKey(email: string) {
  return `gleami:email-resend:${normalizeEmail(email)}`;
}

export async function beginResendCooldown(email: string) {
  await AsyncStorage.setItem(cooldownKey(email), String(Date.now() + RESEND_MS));
}

export async function resendSecondsLeft(email: string) {
  const until = Number((await AsyncStorage.getItem(cooldownKey(email))) ?? 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
