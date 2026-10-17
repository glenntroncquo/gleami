"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/browser-supabase";
import { userFromSession, type AuthUser } from "@/lib/marketplace-browser";

export function useMarketplaceUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured());

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(userFromSession(data.session));
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(userFromSession(session));
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
