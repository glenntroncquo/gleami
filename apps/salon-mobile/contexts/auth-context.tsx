import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { hydrateCompanyIds, jwtCompanyIds, pickPreferredId } from '@/lib/api/memberships';
import { clearSessionPreferences, readPreferredCompanyId, writePreferredCompanyId } from '@/lib/preferences';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  companyId: string | null;
  companyIds: string[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [membershipReady, setMembershipReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: next } }) => {
      setSession(next);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const user = session?.user ?? null;
    if (!user) {
      setCompanyId(null);
      setCompanyIds([]);
      setMembershipReady(true);
      return;
    }

    let cancelled = false;
    setMembershipReady(false);

    const jwtIds = jwtCompanyIds(user.app_metadata as Record<string, unknown> | undefined);

    (async () => {
      const stored = await readPreferredCompanyId();
      // Seed a working companyId immediately so screens never wait on null forever.
      const seed = pickPreferredId(jwtIds, stored);
      if (!cancelled && seed) {
        setCompanyId(seed);
        setCompanyIds(jwtIds.length > 0 ? jwtIds : seed ? [seed] : []);
      }

      const membershipIds = await hydrateCompanyIds(jwtIds);
      const picked = pickPreferredId(membershipIds, stored);
      if (cancelled) return;

      setCompanyIds(membershipIds);
      setCompanyId(picked);
      if (picked) {
        void writePreferredCompanyId(picked);
      }
      setMembershipReady(true);
    })().catch(() => {
      if (cancelled) return;
      const fallback = pickPreferredId(jwtIds, null) ?? jwtIds[0] ?? null;
      setCompanyIds(jwtIds);
      setCompanyId(fallback);
      setMembershipReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await clearSessionPreferences();
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      loading: sessionLoading || (!!session && !membershipReady),
      companyId,
      companyIds,
      signIn,
      signOut,
    }),
    [session, sessionLoading, membershipReady, companyId, companyIds]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
