"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const stripLocalePrefix = (pathname: string) =>
  pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";

type Item = {
  href: string;
  label: string;
};

export function MarketingSubnav() {
  const t = useTranslations();
  const pathname = usePathname();
  const route = stripLocalePrefix(pathname);

  const items: Item[] = [
    { href: "/marketing/referrals", label: t("marketing.tabs.referrals") },
  ];

  return (
    <nav
      aria-label={t("marketing.tabs.ariaLabel")}
      className="self-start"
    >
      <div className="inline-flex rounded-full border border-border/60 bg-muted/50 p-1 shadow-sm backdrop-blur">
        {items.map((item) => {
          const isActive =
            route === item.href || (item.href !== "/marketing" && route.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all",
                "hover:text-foreground",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
