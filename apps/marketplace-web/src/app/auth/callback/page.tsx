"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/browser-supabase";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/nl-be";
  return value;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = safeNext(params.get("next"));
    const code = params.get("code");
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setFailed(true);
      return;
    }
    const finish = () => router.replace(next);
    if (!code) {
      void supabase.auth.getSession().then(finish);
      return;
    }
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setFailed(true);
      else finish();
    });
  }, [router]);

  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-lg font-semibold">{failed ? "Aanmelden mislukt." : "Bezig met aanmelden…"}</p>
    </main>
  );
}
