"use client";

import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, ChevronDownIcon, HeartIcon } from "lucide-react";
import { routeFor, type Locale } from "@/lib/i18n";
import type { AuthUser } from "@/lib/marketplace-browser";
import { authCopy } from "./copy";
import { useAuth } from "./AuthProvider";

type AccountMenuProps = {
  locale: Locale;
  variant?: "site" | "home";
  stacked?: boolean;
};

function initials(user: AuthUser): string {
  const letters = `${user.firstName} ${user.lastName}`
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
  return (letters || user.email[0] || "?").toUpperCase();
}

function displayName(user: AuthUser): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

export function AccountMenu({ locale, variant = "site", stacked = false }: AccountMenuProps) {
  const copy = authCopy(locale);
  const { user, loading, openAuth, signOut } = useAuth();
  const text = variant === "home" ? "text-navy" : "text-ink/70";
  const button = `rounded-full px-3.5 py-2 text-[14px] font-medium ${text} transition-colors hover:text-ink`;
  const row =
    "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-[15px] font-medium text-ink hover:bg-shell";

  if (loading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuth({ purpose: "account" })}
        className={stacked ? `mt-5 ${button}` : button}
      >
        {copy.login}
      </button>
    );
  }

  return (
    <details className={`group relative ${stacked ? "mt-5" : ""}`}>
      <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 ring-1 ring-line [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efeae4] text-[13px] font-semibold text-ink">
          {initials(user)}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="h-4 w-4 text-ink transition group-open:rotate-180"
        />
        <span className="sr-only">{displayName(user)}</span>
      </summary>
      <div
        className={`${
          stacked ? "mt-2 w-full" : "absolute right-0 z-50 mt-2 w-[280px]"
        } rounded-[22px] bg-white p-3 shadow-float ring-1 ring-line`}
      >
        <p className="px-2 pb-2 pt-1 text-[18px] font-semibold tracking-tight text-ink">
          {displayName(user)}
        </p>
        <Link href={routeFor(locale, { kind: "account" })} className={row}>
          <CalendarIcon aria-hidden="true" className="h-5 w-5" />
          {copy.appointments}
        </Link>
        <Link href={routeFor(locale, { kind: "favorites" })} className={row}>
          <HeartIcon aria-hidden="true" className="h-5 w-5" />
          {copy.favorites}
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center rounded-xl py-2.5 pl-10 pr-2 text-left text-[15px] font-medium text-ink hover:bg-shell"
        >
          {copy.logout}
        </button>
        <div className="my-2 h-px bg-line" />
        <Link
          href={routeFor(locale, { kind: "business" })}
          className="flex items-center justify-between rounded-xl px-2 py-2.5 text-[15px] font-semibold text-ink hover:bg-shell"
        >
          {copy.forBusiness}
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </details>
  );
}
