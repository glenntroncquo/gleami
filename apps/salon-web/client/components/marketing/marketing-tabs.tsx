"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const stripLocalePrefix = (pathname: string) =>
  pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";

type TabValue = "overview" | "referrals";

export function MarketingTabs() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const { value, hrefByValue } = useMemo(() => {
    const route = stripLocalePrefix(pathname);

    const hrefByValue: Record<TabValue, string> = {
      overview: "/marketing",
      referrals: "/marketing/referrals",
    };

    const value: TabValue = route.startsWith("/marketing/referrals")
      ? "referrals"
      : "overview";

    return { value, hrefByValue };
  }, [pathname]);

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        router.push(hrefByValue[next as TabValue]);
      }}
    >
      <TabsList variant="line" aria-label={t("marketing.tabs.ariaLabel")}>
        <TabsTrigger variant="line" value="overview">
          {t("marketing.tabs.overview")}
        </TabsTrigger>
        <TabsTrigger variant="line" value="referrals">
          {t("marketing.tabs.referrals")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

