"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseAccountSnapshot, type AccountDraft } from "@/lib/auth/account-access";
import { useAuth } from "@/providers/auth-provider";

export function SetupResumeBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();
  const [drafts, setDrafts] = useState<AccountDraft[]>([]);

  useEffect(() => {
    if (!user) {
      setDrafts([]);
      return;
    }
    const supabase = createClient() as unknown as {
      rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
    };
    void supabase.rpc("account_workspaces").then(({ data, error }) => {
      if (error) {
        setDrafts([]);
        return;
      }
      const snapshot = parseAccountSnapshot(data);
      setDrafts(snapshot.ok ? snapshot.drafts : []);
    });
  }, [user]);

  if (!user || drafts.length === 0 || pathname.includes("/setup") || pathname.includes("/workspaces")) {
    return null;
  }

  const href = drafts.length === 1
    ? `/${locale}/setup?draft=${drafts[0].id}`
    : `/${locale}/workspaces`;

  return (
    <a
      href={href}
      className="fixed right-5 top-4 z-[80] inline-flex items-center gap-2 rounded-full bg-[#5B7CF0] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#4361DB] sm:right-8"
    >
      <Sparkles className="h-4 w-4" />
      <span>Continue setup</span>
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}
