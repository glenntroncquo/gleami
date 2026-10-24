"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isLocale, localeConfig } from "@/lib/i18n";

export function HtmlLang() {
  const pathname = usePathname();
  const first = pathname.split("/").filter(Boolean)[0];

  useEffect(() => {
    if (first && isLocale(first)) {
      document.documentElement.lang = localeConfig[first].htmlLang;
    }
  }, [first]);

  return null;
}
