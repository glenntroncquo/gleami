"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/browser-supabase";
import type { Locale } from "@/lib/i18n";
import { setLike, type AuthUser } from "@/lib/marketplace-browser";
import { useMarketplaceUser } from "@/components/consumer-home/useMarketplaceUser";
import { AuthDialog, profileReady } from "./AuthDialog";
import { clearPendingLike, takePendingLike } from "./pending-like";

type AuthPurpose = "book" | "save" | "account";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  openAuth: (options?: { purpose?: AuthPurpose; email?: string }) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const { user, loading } = useMarketplaceUser();
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<AuthPurpose>("account");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const locationId = takePendingLike();
    if (!locationId) return;
    void setLike(user.id, locationId, true)
      .then(() => window.dispatchEvent(new Event("gleami-likes")))
      .catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    if (open && profileReady(user)) setOpen(false);
  }, [open, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      openAuth: (options) => {
        setPurpose(options?.purpose ?? "account");
        setEmail(options?.email ?? "");
        setOpen(true);
      },
      signOut: async () => {
        clearPendingLike();
        await getBrowserSupabase()?.auth.signOut();
      },
    }),
    [user, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDialog
        locale={locale}
        open={open}
        purpose={purpose}
        initialEmail={email}
        onClose={() => {
          clearPendingLike();
          setOpen(false);
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
