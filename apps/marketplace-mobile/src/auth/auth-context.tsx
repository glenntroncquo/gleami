import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { supabaseConfigured, useMocks } from '@/src/config';
import { t } from '@/src/i18n';
import { authStorage } from '@/src/lib/secure-store';
import { getSupabase } from '@/src/lib/supabase';

const MOCK_USER_KEY = 'gleami.marketplace.mock-user';
const MOCK_USER_ID = '00000000-0000-4000-8000-0000000000aa';

export type AuthUser = {
  id: string;
  email: string;
};

type AuthResult = { error: string | null; confirmEmail?: boolean };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  sendMagicLink: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function validateEmail(email: string): string | null {
  if (!email.includes('@') || !email.includes('.')) return t('profile.invalidEmail');
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return t('profile.passwordTooShort');
  return null;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return t('profile.invalidCredentials');
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return t('profile.alreadyRegistered');
  }
  return message;
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
          const raw = await authStorage.getItem(MOCK_USER_KEY);
          if (!cancelled && raw) {
            const parsed = JSON.parse(raw) as AuthUser;
            if (parsed?.id && parsed.email) setUser(parsed);
          }
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: useMocks || supabaseConfigured,
      signIn: async (email, password) => {
        const emailError = validateEmail(email.trim());
        if (emailError) return { error: emailError };
        const passwordError = validatePassword(password);
        if (passwordError) return { error: passwordError };
        if (useMocks) {
          const next = { id: MOCK_USER_ID, email: email.trim() };
          await authStorage.setItem(MOCK_USER_KEY, JSON.stringify(next));
          setUser(next);
          return { error: null };
        }
        const { error } = await getSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return { error: error ? friendlyAuthError(error.message) : null };
      },
      signUp: async (email, password) => {
        const emailError = validateEmail(email.trim());
        if (emailError) return { error: emailError };
        const passwordError = validatePassword(password);
        if (passwordError) return { error: passwordError };
        if (useMocks) {
          const next = { id: MOCK_USER_ID, email: email.trim() };
          await authStorage.setItem(MOCK_USER_KEY, JSON.stringify(next));
          setUser(next);
          return { error: null };
        }
        const { data, error } = await getSupabase().auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) return { error: friendlyAuthError(error.message) };
        if (!data.session) return { error: null, confirmEmail: true };
        return { error: null };
      },
      sendMagicLink: async (email) => {
        const emailError = validateEmail(email.trim());
        if (emailError) return { error: emailError };
        if (useMocks) {
          const next = { id: MOCK_USER_ID, email: email.trim() };
          await authStorage.setItem(MOCK_USER_KEY, JSON.stringify(next));
          setUser(next);
          return { error: null };
        }
        const { error } = await getSupabase().auth.signInWithOtp({ email: email.trim() });
        return { error: error ? friendlyAuthError(error.message) : null };
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
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function userFromSession(session: Session | null): AuthUser | null {
  if (!session?.user.email) return null;
  return { id: session.user.id, email: session.user.email };
}
