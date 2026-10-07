"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startEmailAuth, startSocialAuth } from "@/lib/api/auth/new-onboarding";

export default function StartPage() {
  const locale = useLocale();
  const t = useTranslations("onboarding");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { await startEmailAuth(email, locale); setSent(true); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("error")); }
    finally { setBusy(false); }
  };
  const social = async (provider: "google" | "apple") => {
    setBusy(true);
    try { await startSocialAuth(provider, locale); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("error")); setBusy(false); }
  };
  return <main className="min-h-screen bg-[#F7F8FC] px-5 py-10 text-[#0B1C3F] sm:grid sm:place-items-center">
    <section className="mx-auto w-full max-w-md rounded-[28px] border border-[#E5E8F1] bg-white p-7 shadow-[0_18px_60px_-35px_rgba(11,28,63,.28)] sm:p-10">
      <a href={`/${locale}/login`} className="text-sm font-medium text-[#5B6480] hover:text-[#0B1C3F]">← {t("back")}</a>
      <div className="mt-9"><p className="text-sm font-semibold uppercase tracking-[.18em] text-[#4361DB]">Gleami</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{sent ? t("checkEmailTitle") : t("startTitle")}</h1>
        <p className="mt-3 leading-6 text-[#5B6480]">{sent ? t("checkEmailBody", { email }) : t("startBody")}</p></div>
      {!sent && <>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={busy} onClick={() => void social("google")} className="h-12 rounded-xl border-[#D3D8E6] text-[#0B1C3F]">Google</Button>
          <Button variant="outline" disabled={busy} onClick={() => void social("apple")} className="h-12 rounded-xl border-[#D3D8E6] text-[#0B1C3F]">Apple</Button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-[#7F87A2]"><span className="h-px flex-1 bg-[#E5E8F1]" />{t("orEmail")}<span className="h-px flex-1 bg-[#E5E8F1]" /></div>
        <form onSubmit={submit} className="space-y-4"><label htmlFor="email" className="text-sm font-semibold">{t("email")}</label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 rounded-xl border-[#D3D8E6] focus-visible:ring-[#5B7CF0]" />
          <Button disabled={busy} className="h-12 w-full rounded-xl bg-[#0B1C3F] text-white hover:bg-[#14295A]">{t("continueEmail")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-[#7F87A2]">{t("emailHint")}</p>
      </>}
      {sent && <div className="mt-8 rounded-2xl bg-[#F1F4FE] p-5 text-sm text-[#1C3166]"><Mail className="mb-2 h-5 w-5 text-[#4361DB]" />{t("checkEmailHint")}</div>}
      <p className="mt-8 text-center text-sm text-[#5B6480]">{t("existingAccount")} <a className="font-semibold text-[#4361DB] hover:underline" href={`/${locale}/login`}>{t("signIn")}</a></p>
    </section>
  </main>;
}
