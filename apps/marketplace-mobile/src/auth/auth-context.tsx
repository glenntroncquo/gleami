import { isAuthError, type Session, type UserIdentity } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  AccountApiError,
  completeAccount,
  deleteAccount as deleteAccountRequest,
  lookupEmail as lookupEmailRequest,
  type CompleteAccountInput,
  type CompleteAccountResult,
  type EmailStatus,
} from '@/src/api/account';
import {
  providerLabel,
  requestSocialCredential,
  SocialUnavailableError,
  type SocialProvider,
} from '@/src/auth/social';
import { supabaseConfigured, useMocks } from '@/src/config';
import { t } from '@/src/i18n';
import { authStorage } from '@/src/lib/secure-store';
import { getSupabase } from '@/src/lib/supabase';

const MOCK_USER_KEY = 'gleami.marketplace.mock-user';
const MOCK_ACCOUNT_KEY = 'gleami.marketplace.mock-account';
const MOCK_USER_ID = '00000000-0000-4000-8000-0000000000aa';
export const PASSWORD_MIN = 8;

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Set by marketplace-account-complete once the client is linked. */
  profileComplete: boolean;
  /** 'email', 'apple', 'google'. */
  providers: string[];
};

export type AuthResult<T = void> = { error: string; data?: undefined } | { error: null; data: T };

export type SocialSignIn = { user: AuthUser; firstName?: string; lastName?: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  lookupEmail: (email: string) => Promise<AuthResult<EmailStatus>>;
  sendEmailCode: (email: string, options: { createUser: boolean }) => Promise<AuthResult>;
  verifyEmailCode: (email: string, code: string) => Promise<AuthResult<AuthUser>>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult<AuthUser>>;
  /** `data` is null when the user dismissed the native sheet. */
  signInWithSocial: (provider: SocialProvider) => Promise<AuthResult<SocialSignIn | null>>;
  completeProfile: (input: CompleteAccountInput) => Promise<AuthResult<CompleteAccountResult>>;
  updatePassword: (password: string) => Promise<AuthResult>;
  listIdentities: () => Promise<UserIdentity[]>;
  /** `data` is false when the user dismissed the native sheet. */
  linkSocial: (provider: SocialProvider) => Promise<AuthResult<boolean>>;
  unlinkSocial: (provider: SocialProvider) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function friendlyError(error: unknown): string {
  if (error instanceof SocialUnavailableError) {
    return t('auth.errors.socialUnavailable', { provider: providerLabel[error.message as SocialProvider] ?? '' });
  }
  if (error instanceof AccountApiError) {
    if (error.code === 'WEAK_PASSWORD') return t('auth.errors.weakPassword');
    if (error.code === 'SALON_ACCOUNT') return t('profile.deleteSalonAccount');
    if (error.status === 429) return t('auth.errors.rateLimited');
  }
  if (isAuthError(error)) {
    const code = error.code ?? '';
    const message = error.message.toLowerCase();
    if (code === 'invalid_credentials' || message.includes('invalid login')) return t('auth.errors.invalidCredentials');
    if (code === 'otp_expired' || message.includes('expired or is invalid')) return t('auth.errors.invalidCode');
    if (code.startsWith('over_') || error.status === 429) return t('auth.errors.rateLimited');
    if (code === 'weak_password') return t('auth.errors.weakPassword');
    if (code === 'identity_already_exists') return t('auth.errors.identityInUse');
    if (code === 'manual_linking_disabled') return t('auth.errors.linkingDisabled');
    if (code === 'single_identity_not_deletable') return t('account.lastMethod');
    if (error.name === 'AuthRetryableFetchError') return t('auth.errors.network');
  }
  const message = error instanceof Error ? error.message : '';
  if (/network request failed|failed to fetch/i.test(message)) return t('auth.errors.network');
  if (__DEV__) console.warn('[auth]', error);
  return t('auth.errors.generic');
}

function userFromSession(session: Session | null): AuthUser | null {
  const user = session?.user;
  if (!user?.email) return null;
  const meta = user.user_metadata ?? {};
  const providers = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata.providers as string[])
    : [user.app_metadata?.provider].filter((value): value is string => typeof value === 'string');
  return {
    id: user.id,
    email: user.email,
    firstName: String(meta.first_name ?? meta.given_name ?? ''),
    lastName: String(meta.last_name ?? meta.family_name ?? ''),
    phone: String(meta.phone ?? ''),
    profileComplete: Boolean(user.app_metadata?.marketplace_profile_completed_at),
    providers,
  };
}

type MockAccount = AuthUser & { hasPassword: boolean };

async function readMock<T>(key: string): Promise<T | null> {
  const raw = await authStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function mockUser(email: string, provider: string): MockAccount {
  return {
    id: MOCK_USER_ID,
    email: email.trim().toLowerCase(),
    firstName: '',
    lastName: '',
    phone: '',
    profileComplete: false,
    providers: [provider],
    hasPassword: false,
  };
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        if (useMocks) {
          const stored = await readMock<AuthUser>(MOCK_USER_KEY);
          if (!cancelled && stored?.id && stored.email) setUser(stored);
          return;
        }
        if (!supabaseConfigured) return;
        const { data } = await getSupabase().auth.getSession();
        if (!cancelled) setUser(userFromSession(data.session));
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();

    if (useMocks || !supabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setUser(userFromSession(session));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const saveMock = useCallback(async (account: MockAccount) => {
    const { hasPassword: _hasPassword, ...next } = account;
    await authStorage.setItem(MOCK_ACCOUNT_KEY, JSON.stringify(account));
    await authStorage.setItem(MOCK_USER_KEY, JSON.stringify(next));
    setUser(next);
    return next;
  }, []);

  /** Re-reads the session so app_metadata (profile flag, providers) is current. */
  const refreshSessionUser = useCallback(async (): Promise<AuthUser | null> => {
    const { data, error } = await getSupabase().auth.refreshSession();
    if (error) throw error;
    const next = userFromSession(data.session);
    setUser(next);
    return next;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: useMocks || supabaseConfigured,

      lookupEmail: async (email) => {
        if (!isValidEmail(email)) return { error: t('auth.errors.invalidEmail') };
        try {
          if (useMocks) {
            const account = await readMock<MockAccount>(MOCK_ACCOUNT_KEY);
            const exists = account?.email === email.trim().toLowerCase();
            return { error: null, data: { exists, hasPassword: Boolean(exists && account?.hasPassword) } };
          }
          return { error: null, data: await lookupEmailRequest(email.trim()) };
        } catch (error) {
          return { error: friendlyError(error) };
        }
      },

      sendEmailCode: async (email, { createUser }) => {
        if (useMocks) return { error: null, data: undefined };
        const { error } = await getSupabase().auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: createUser },
        });
        return error ? { error: friendlyError(error) } : { error: null, data: undefined };
      },

      verifyEmailCode: async (email, code) => {
        if (useMocks) {
          if (code === '000000') return { error: t('auth.errors.invalidCode') };
          const existing = await readMock<MockAccount>(MOCK_ACCOUNT_KEY);
          const account =
            existing?.email === email.trim().toLowerCase() ? existing : mockUser(email, 'email');
          return { error: null, data: await saveMock(account) };
        }
        const { data, error } = await getSupabase().auth.verifyOtp({
          email: email.trim(),
          token: code,
          type: 'email',
        });
        const next = userFromSession(data.session);
        if (error || !next) return { error: friendlyError(error) };
        setUser(next);
        return { error: null, data: next };
      },

      signInWithPassword: async (email, password) => {
        if (!password) return { error: t('auth.errors.invalidCredentials') };
        if (useMocks) {
          const account = await readMock<MockAccount>(MOCK_ACCOUNT_KEY);
          if (!account || account.email !== email.trim().toLowerCase() || password.length < PASSWORD_MIN) {
            return { error: t('auth.errors.invalidCredentials') };
          }
          return { error: null, data: await saveMock(account) };
        }
        const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
        const next = userFromSession(data.session);
        if (error || !next) return { error: friendlyError(error) };
        setUser(next);
        return { error: null, data: next };
      },

      signInWithSocial: async (provider) => {
        try {
          if (useMocks) {
            const account = mockUser(`${provider}.demo@gleami.be`, provider);
            return { error: null, data: { user: await saveMock(account), firstName: 'Glenn', lastName: '' } };
          }
          const credential = await requestSocialCredential(provider);
          if (!credential) return { error: null, data: null };
          const { data, error } = await getSupabase().auth.signInWithIdToken({
            provider,
            token: credential.token,
            nonce: credential.nonce,
          });
          if (error) throw error;
          const next = userFromSession(data.session);
          if (!next) throw new Error('No session after social sign-in');
          setUser(next);
          return {
            error: null,
            data: { user: next, firstName: credential.firstName, lastName: credential.lastName },
          };
        } catch (error) {
          return { error: friendlyError(error) };
        }
      },

      completeProfile: async (input) => {
        if (input.password !== undefined && input.password.length < PASSWORD_MIN) {
          return { error: t('auth.errors.passwordTooShort') };
        }
        try {
          if (useMocks) {
            const account = await readMock<MockAccount>(MOCK_ACCOUNT_KEY);
            if (!account) return { error: t('auth.errors.generic') };
            await saveMock({
              ...account,
              firstName: input.firstName,
              lastName: input.lastName,
              phone: input.phone,
              profileComplete: true,
              hasPassword: account.hasPassword || Boolean(input.password),
            });
            return { error: null, data: { clientCount: 1, appointmentCount: 0 } };
          }
          const result = await completeAccount(input);
          await refreshSessionUser();
          return { error: null, data: result };
        } catch (error) {
          return { error: friendlyError(error) };
        }
      },

      updatePassword: async (password) => {
        if (password.length < PASSWORD_MIN) return { error: t('auth.errors.passwordTooShort') };
        if (useMocks) {
          const account = await readMock<MockAccount>(MOCK_ACCOUNT_KEY);
          if (account) await saveMock({ ...account, hasPassword: true });
          return { error: null, data: undefined };
        }
        const { error } = await getSupabase().auth.updateUser({ password });
        return error ? { error: friendlyError(error) } : { error: null, data: undefined };
      },

      listIdentities: async () => {
        if (useMocks) {
          return (user?.providers ?? []).map(
            (provider) =>
              ({
                id: provider,
                identity_id: provider,
                user_id: MOCK_USER_ID,
                provider,
                identity_data: { email: user?.email },
              }) as UserIdentity,
          );
        }
        const { data, error } = await getSupabase().auth.getUserIdentities();
        if (error) throw error;
        return data.identities;
      },

      linkSocial: async (provider) => {
        try {
          if (useMocks) {
            const account = await readMock<MockAccount>(MOCK_ACCOUNT_KEY);
            if (account && !account.providers.includes(provider)) {
              await saveMock({ ...account, providers: [...account.providers, provider] });
            }
            return { error: null, data: true };
          }
          const credential = await requestSocialCredential(provider);
          if (!credential) return { error: null, data: false };
          const { error } = await getSupabase().auth.linkIdentity({
            provider,
            token: credential.token,
            nonce: credential.nonce,
          });
          if (error) throw error;
          await refreshSessionUser();
          return { error: null, data: true };
        } catch (error) {
          return { error: friendlyError(error) };
        }
      },

      unlinkSocial: async (provider) => {
        try {
          if (useMocks) {
            const account = await readMock<MockAccount>(MOCK_ACCOUNT_KEY);
            if (account) await saveMock({ ...account, providers: account.providers.filter((p) => p !== provider) });
            return { error: null, data: undefined };
          }
          const supabase = getSupabase();
          const { data, error } = await supabase.auth.getUserIdentities();
          if (error) throw error;
          if (data.identities.length < 2) return { error: t('account.lastMethod') };
          const identity = data.identities.find((item) => item.provider === provider);
          if (!identity) return { error: null, data: undefined };
          const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
          if (unlinkError) throw unlinkError;
          await refreshSessionUser();
          return { error: null, data: undefined };
        } catch (error) {
          return { error: friendlyError(error) };
        }
      },

      signOut: async () => {
        if (useMocks) {
          await authStorage.removeItem(MOCK_USER_KEY);
          setUser(null);
          return;
        }
        await getSupabase().auth.signOut();
        setUser(null);
      },

      deleteAccount: async () => {
        try {
          if (useMocks) {
            await authStorage.removeItem(MOCK_ACCOUNT_KEY);
            await authStorage.removeItem(MOCK_USER_KEY);
            setUser(null);
            return { error: null, data: undefined };
          }
          await deleteAccountRequest();
          await getSupabase().auth.signOut({ scope: 'local' });
          setUser(null);
          return { error: null, data: undefined };
        } catch (error) {
          return { error: friendlyError(error) };
        }
      },
    }),
    [user, loading, saveMock, refreshSessionUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
