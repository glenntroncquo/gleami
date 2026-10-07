"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { loadSalonSetup, type SetupDraft } from "@/lib/api/auth/new-onboarding";
import { useAuth } from "@/providers/auth-provider";

export function SetupResumeBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();
  const [setup, setSetup] = useState<SetupDraft | null>(null);
  useEffect(() => {
    if (!user) { setSetup(null); return; }
    loadSalonSetup().then(setSetup).catch(() => setSetup(null));
  }, [user]);
  if (!user || !setup || setup.completed_at || pathname.includes("/setup")) return null;
  return <a href={`/${locale}/setup`} className="fixed right-5 top-4 z-[80] inline-flex items-center gap-2 rounded-full bg-[#5B7CF0] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#4361DB] sm:right-8">
    <Sparkles className="h-4 w-4"/><span>Doorgaan met instellen</span><ArrowRight className="h-4 w-4"/>
  </a>;
}
