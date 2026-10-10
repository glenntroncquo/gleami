"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { locales } from "@/i18n/config";
import { COMPANY_COOKIE, isUuid } from "@/lib/auth/account-access";
import { loadAccountSnapshot } from "@/lib/auth/account-resolver";

export async function selectEstablishedCompany(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  const locale = String(formData.get("locale") ?? "");
  if (!locales.includes(locale as (typeof locales)[number])) {
    throw new Error("Unknown locale");
  }
  if (!isUuid(companyId)) throw new Error("That salon isn't available");

  const snapshot = await loadAccountSnapshot();
  if (!snapshot.ok) throw new Error("Couldn't confirm this salon");
  if (!snapshot.companies.some((company) => company.id === companyId)) {
    throw new Error("That salon isn't available");
  }

  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(`/${locale}/calendar`);
}
