"use client";

import { usePathname } from "next/navigation";
import { documentBySlug, type DocId } from "@/content/documents";
import { isLocale, type Locale } from "@/lib/i18n";

export function useLegalRoute(): { locale: Locale; active: DocId | "overview" } {
  const pathname = usePathname();
  const [first, slug] = pathname.split("/").filter(Boolean);
  const locale: Locale = first && isLocale(first) ? first : "nl-be";
  const document = slug ? documentBySlug(locale, slug) : undefined;
  return { locale, active: document?.id ?? "overview" };
}
