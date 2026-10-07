"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { RiAppleFill } from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingDots } from "@/components/ui/loading-dots";
import { createClient } from "@/lib/supabase/client";
import { lookupAuthEmail, startEmailAuth, startSocialAuth } from "@/lib/api/auth/new-onboarding";

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="h-6 w-6"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#FF3D00" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#4CAF50" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#1976D2" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg>;
}

export default function StartPage() {
  const locale = useLocale();
  const t = useTranslations("onboarding");
  const common = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const nextPath = requestedNext?.startsWith(`/${locale}/invite`) && !requestedNext.startsWith("//") && !requestedNext.includes("\\")
    ? requestedNext
    : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password" | "verify">("email");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const account = await lookupAuthEmail(email);
      if (account.exists && !account.hasPassword) {
        await startEmailAuth(email, locale);
        setStep("verify");
      } else {
        setCreatingAccount(!account.exists);
        setStep("password");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const supabase = createClient();
    try {
      if (creatingAccount) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=/${locale}/setup` },
        });
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
          setStep("verify");
          return;
        }
        if (data.session) {
          router.push(`/${locale}/setup`);
          return;
        }
        setStep("verify");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      router.push(nextPath ?? `/${locale}/calendar`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: "google" | "apple") => {
    setBusy(true);
    try {
      await startSocialAuth(provider, locale, nextPath ?? `/${locale}/setup`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#101114] lg:grid lg:grid-cols-[1fr_1fr]">
      <section className="relative flex min-h-screen items-start justify-center px-6 pb-10 pt-12 sm:px-12 sm:pt-14 lg:px-16 lg:pt-12 xl:px-24">
        <div className="w-full max-w-[510px]">
          <div className="mb-8 text-center">
            <Image src="/gleami-wordmark.svg" alt="Gleami" width={142} height={48} priority className="mx-auto h-10 w-auto" />
            <h1 className="mt-6 text-[30px] font-semibold leading-tight tracking-[-0.035em] sm:text-[34px]">
              {step === "verify" ? t("checkEmailTitle") : step === "password" ? (creatingAccount ? t("createPasswordTitle") : t("passwordTitle")) : t("startTitle")}
            </h1>
            <p className="mx-auto mt-2 max-w-[460px] text-base leading-6 text-[#777A82] sm:text-[18px]">
              {step === "verify" ? t("checkEmailBody", { email }) : step === "password" ? (creatingAccount ? t("createPasswordBody") : t("passwordBody", { email })) : t("startBody")}
            </p>
          </div>

          {step === "email" ? (
            <>
              <form onSubmit={submit} className="space-y-3">
                <label htmlFor="email" className="block text-[15px] font-semibold">{t("email")}</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-[58px] rounded-[13px] border-[#D7D7D9] bg-white px-4 text-base shadow-none focus-visible:border-[#5B7CF0] focus-visible:ring-2 focus-visible:ring-[#5B7CF0]/20"
                />
                <Button disabled={busy} className="mt-7 h-[58px] w-full rounded-full bg-[#0B1C3F] text-[17px] font-semibold text-white hover:bg-[#14295A]">
                  {busy ? <LoadingDots label={t("loadingLabel")} /> : t("continue")}
                </Button>
              </form>

              <div className="my-8 flex items-center gap-5 text-sm text-[#85878D]">
                <span className="h-px flex-1 bg-[#D8D8DA]" />{t("or")}<span className="h-px flex-1 bg-[#D8D8DA]" />
              </div>

              <div className="space-y-3">
                <Button variant="outline" disabled={busy} onClick={() => void social("google")} className="relative h-[56px] w-full rounded-full border border-[#D7D7D9] bg-white text-[16px] font-semibold text-[#17181B] shadow-none hover:bg-[#FAFAFB]">
                  <span className="absolute left-5"><GoogleMark /></span>{t("continueGoogle")}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => void social("apple")} className="relative h-[56px] w-full rounded-full border border-[#D7D7D9] bg-white text-[16px] font-semibold text-[#17181B] shadow-none hover:bg-[#FAFAFB]">
                  <RiAppleFill className="absolute left-[21px] h-[25px] w-[25px] text-black" />{t("continueApple")}
                </Button>
              </div>

            </>
          ) : step === "password" ? (
            <>
              <form onSubmit={submitPassword} className="space-y-3">
                <label htmlFor="password" className="block text-[15px] font-semibold">{common("auth.password")}</label>
                <PasswordInput id="password" autoFocus autoComplete={creatingAccount ? "new-password" : "current-password"} required minLength={creatingAccount ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} showPasswordLabel={common("auth.showPassword")} hidePasswordLabel={common("auth.hidePassword")} className="h-[58px] rounded-[13px] border-[#D7D7D9] bg-white px-4 text-base shadow-none focus-visible:border-[#5B7CF0] focus-visible:ring-2 focus-visible:ring-[#5B7CF0]/20" />
                {creatingAccount && <p className="text-sm text-[#777A82]">{common("auth.passwordMinLength")}</p>}
                <Button disabled={busy} className="mt-7 h-[58px] w-full rounded-full bg-[#0B1C3F] text-[17px] font-semibold text-white hover:bg-[#14295A]">
                  {busy ? <LoadingDots label={t("loadingLabel")} /> : creatingAccount ? common("auth.createAccount") : common("auth.signIn")}
                </Button>
              </form>
              <div className="mt-5 flex flex-col items-center gap-3 text-sm">
                {!creatingAccount && <a href={`/${locale}/reset-password`} className="font-medium text-[#4361DB] hover:underline">{common("auth.forgotPassword")}</a>}
                <button type="button" onClick={() => { setStep("email"); setPassword(""); }} className="text-[#777A82] hover:underline">{t("changeEmail")}</button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#E3E7F2] bg-[#F7F8FC] p-5 text-sm leading-6 text-[#4F5667]">
              <Mail className="mb-3 h-5 w-5 text-[#4361DB]" />
              <p>{t("checkEmailHint")}</p>
              <p className="mt-2">{email}</p>
              <button onClick={() => { setStep("email"); setPassword(""); }} className="mt-4 font-semibold text-[#4361DB] hover:underline">{t("changeEmail")}</button>
            </div>
          )}
        </div>
      </section>

      <aside className="relative hidden min-h-screen overflow-hidden bg-[#E9E4DE] lg:block lg:[clip-path:polygon(0_0,100%_0,100%_100%,5%_100%)]">
        <Image src="/salon-onboarding.jpg" alt="A stylist caring for a client in a salon" fill priority sizes="50vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071D43]/75 via-[#071D43]/5 to-transparent" />
        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-3 px-8 text-center text-white">
          <Image src="/gleami-wordmark.svg" alt="Gleami" width={220} height={74} className="h-14 w-auto brightness-0 invert" />
          <p className="text-sm font-medium tracking-wide text-white/90">{t("photoCaption")}</p>
        </div>
      </aside>
    </main>
  );
}
