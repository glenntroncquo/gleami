"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { getBrowserSupabase } from "@/lib/browser-supabase";
import type { Locale } from "@/lib/i18n";
import { completeAccount, lookupEmail, type AuthUser } from "@/lib/marketplace-browser";
import { useMarketplaceUser } from "@/components/consumer-home/useMarketplaceUser";
import { textField } from "@/components/ui/fields";
import { LoadingDots } from "@/components/ui/loading-dots";
import { authCopy } from "./copy";

export function profileReady(user: AuthUser | null): user is AuthUser {
  return Boolean(user?.profileComplete && user.firstName && user.lastName && user.phone && user.email);
}

type AuthPurpose = "book" | "save" | "account";

type AuthDialogProps = {
  locale: Locale;
  open: boolean;
  purpose?: AuthPurpose;
  allowGuest?: boolean;
  embedded?: boolean;
  initialEmail?: string;
  onClose: () => void;
  onGuest?: () => void;
};

export function AuthDialog({
  locale,
  open,
  purpose = "account",
  allowGuest = false,
  embedded = false,
  initialEmail = "",
  onClose,
  onGuest,
}: AuthDialogProps) {
  const copy = authCopy(locale);
  const { user } = useMarketplaceUser();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"email" | "password" | "code" | "profile">("email");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setMode("email");
    setMessage(null);
    setNeedsPassword(false);
  }, [open, initialEmail]);

  useEffect(() => {
    if (!user) return;
    if (user.firstName) setFirstName(user.firstName);
    if (user.lastName) setLastName(user.lastName);
    if (user.phone) setPhone(user.phone);
    if (user.email) setEmail(user.email);
  }, [user]);

  if (!open) return null;

  const ready = profileReady(user);
  const step = user && !ready ? "profile" : mode;
  const title =
    step === "password"
      ? copy.welcome
      : step === "code"
        ? copy.checkEmail
        : step === "profile"
          ? copy.profileTitle
          : purpose === "save"
            ? copy.saveTitle
            : purpose === "book"
              ? copy.bookTitle
              : copy.accountTitle;
  const body =
    step === "password"
      ? copy.welcomeBody
      : step === "code"
        ? copy.checkEmailBody(email.trim())
        : step === "profile"
          ? copy.profileBody
          : purpose === "save"
            ? copy.saveBody
            : purpose === "book"
              ? copy.bookBody
              : copy.accountBody;

  const field = textField;
  const submit =
    "mt-5 flex h-[58px] w-full items-center justify-center rounded-full bg-ink text-[17px] font-semibold text-white disabled:opacity-40 data-[busy=true]:opacity-100";

  const social = async (provider: "google" | "apple") => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const next = `${window.location.pathname}${window.location.search}`;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  };

  const panel = (
      <div
        role={embedded ? "region" : "dialog"}
        aria-modal={embedded ? undefined : true}
        aria-label={title}
        className={
          embedded
            ? "mt-8"
            : "relative max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-[28px] bg-white px-6 pb-8 pt-4 shadow-float"
        }
      >
        {embedded ? null : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink"
          >
            <XIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        )}
        <h2 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h2>
        <p className="mt-2 text-[15px] leading-6 text-muted">{body}</p>

        {step === "email" ? (
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              setMessage(null);
              void lookupEmail(email.trim())
                .then(async (status) => {
                  if (status.hasPassword) {
                    setMode("password");
                    return;
                  }
                  const supabase = getBrowserSupabase();
                  if (!supabase) return;
                  const { error } = await supabase.auth.signInWithOtp({
                    email: email.trim(),
                    options: { shouldCreateUser: true },
                  });
                  if (error) setMessage(error.message);
                  else setMode("code");
                })
                .catch(() => setMessage(copy.emailError))
                .finally(() => setBusy(false));
            }}
          >
            <label className="block text-[15px] font-semibold">
              {copy.email}
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={field}
              />
            </label>
            <p className="mt-3 text-sm text-muted">{copy.codeHint}</p>
            <button type="submit" disabled={busy} data-busy={busy || undefined} className={submit}>
              {busy ? <LoadingDots label={copy.working} /> : copy.continue}
            </button>
          </form>
        ) : null}

        {step === "password" ? (
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              const supabase = getBrowserSupabase();
              if (!supabase) return;
              setBusy(true);
              setMessage(null);
              void supabase.auth
                .signInWithPassword({ email: email.trim(), password })
                .then(({ error }) => {
                  if (error) setMessage(copy.passwordError);
                })
                .finally(() => setBusy(false));
            }}
          >
            <label className="block text-[15px] font-semibold">
              {copy.password}
              <input
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={field}
              />
            </label>
            <button type="submit" disabled={busy} data-busy={busy || undefined} className={submit}>
              {busy ? <LoadingDots label={copy.working} /> : copy.continue}
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="mt-4 text-sm font-medium text-muted"
            >
              {copy.otherEmail}
            </button>
          </form>
        ) : null}

        {step === "code" ? (
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              const supabase = getBrowserSupabase();
              if (!supabase) return;
              setBusy(true);
              setMessage(null);
              void supabase.auth
                .verifyOtp({ email: email.trim(), token: code.trim(), type: "email" })
                .then(({ error }) => {
                  if (error) setMessage(copy.codeError);
                  else setNeedsPassword(true);
                })
                .finally(() => setBusy(false));
            }}
          >
            <label className="block text-[15px] font-semibold">
              {copy.code}
              <input
                inputMode="numeric"
                required
                autoFocus
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className={field}
              />
            </label>
            <button type="submit" disabled={busy} data-busy={busy || undefined} className={submit}>
              {busy ? <LoadingDots label={copy.working} /> : copy.continue}
            </button>
          </form>
        ) : null}

        {step === "profile" ? (
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              setMessage(null);
              void completeAccount({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim(),
                ...(needsPassword ? { password } : {}),
              })
                .catch(() => setMessage(copy.profileError))
                .finally(() => setBusy(false));
            }}
          >
            <label className="block text-[15px] font-semibold">
              {copy.firstName}
              <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className={field} />
            </label>
            <label className="mt-4 block text-[15px] font-semibold">
              {copy.lastName}
              <input required value={lastName} onChange={(event) => setLastName(event.target.value)} className={field} />
            </label>
            <label className="mt-4 block text-[15px] font-semibold">
              {copy.phone}
              <input
                required
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={field}
              />
            </label>
            {needsPassword ? (
              <label className="mt-4 block text-[15px] font-semibold">
                {copy.password}
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={field}
                />
              </label>
            ) : null}
            <button type="submit" disabled={busy} data-busy={busy || undefined} className={submit}>
              {busy ? <LoadingDots label={copy.working} /> : copy.saveProfile}
            </button>
          </form>
        ) : null}

        {step === "email" ? (
          <div className="mt-6">
            <div className="flex items-center gap-3 text-xs font-semibold tracking-wide text-muted">
              <span className="h-px flex-1 bg-line" />
              {copy.or}
              <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void social("google")}
              className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-semibold text-ink ring-1 ring-line"
            >
              <GoogleMark />
              {copy.google}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void social("apple")}
              className="mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-semibold text-ink ring-1 ring-line"
            >
              <AppleMark />
              {copy.apple}
            </button>
            {allowGuest && onGuest ? (
              <button
                type="button"
                onClick={onGuest}
                className="mt-4 w-full text-center text-sm font-semibold text-ink"
              >
                {copy.guest}
              </button>
            ) : null}
          </div>
        ) : null}

        {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
      </div>
  );

  if (embedded) return panel;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-4 sm:items-center">
      {panel}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 11l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.2c.7-1 1.2-2 1.5-3.1-3.9-1.5-3.8-5.4-3.8-5.4zM14.7 6.2c.6-.8 1.1-1.9.9-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.8-.9 2.9 1.1.1 2.1-.5 2.8-1.3z" />
    </svg>
  );
}
