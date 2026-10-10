"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  RiApps2Line,
  RiBankCardLine,
  RiBox1Line,
  RiCalendarLine,
  RiDashboardLine,
  RiMegaphoneLine,
  RiReceiptLine,
  RiScissorsLine,
  RiShoppingCartLine,
  RiTeamLine,
  RiUserLine,
} from "@remixicon/react";
import { useLocaleNavigation } from "@/hooks/use-locale-navigation";
import { localizedServiceCatalogPath } from "@/lib/api/catalog/service-catalog-path";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocationSwitcher } from "@/components/location-switcher";
import { NavUser } from "@/components/nav-user";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NAV_PERMISSION, type PermissionKey } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type NavIcon = ComponentType<{ size?: number | string; className?: string }>;

type TabItem = {
  href: string;
  label: string;
  icon: NavIcon;
  permission: readonly PermissionKey[];
};

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { currentLocale } = useLocaleNavigation();
  const t = useTranslations();
  const { hasAnyPermission, membershipReady } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const canSee = (perms: readonly PermissionKey[]) =>
    !membershipReady || hasAnyPermission(perms);

  const primary: TabItem[] = [
    {
      href: `/${currentLocale}/calendar`,
      label: t("navigation.calendar"),
      icon: RiCalendarLine,
      permission: NAV_PERMISSION.calendar,
    },
    {
      href: `/${currentLocale}/client`,
      label: t("navigation.client"),
      icon: RiUserLine,
      permission: NAV_PERMISSION.client,
    },
    {
      href: `/${currentLocale}/pos`,
      label: t("navigation.pos"),
      icon: RiShoppingCartLine,
      permission: NAV_PERMISSION.pos,
    },
  ].filter((item) => canSee(item.permission));

  const moreItems: TabItem[] = [
    {
      href: `/${currentLocale}/dashboard`,
      label: t("navigation.dashboard"),
      icon: RiDashboardLine,
      permission: NAV_PERMISSION.dashboard,
    },
    {
      href: `/${currentLocale}/staff`,
      label: t("navigation.staff"),
      icon: RiTeamLine,
      permission: NAV_PERMISSION.staff,
    },
    {
      href: localizedServiceCatalogPath(currentLocale),
      label: t("navigation.treatment"),
      icon: RiScissorsLine,
      permission: NAV_PERMISSION.catalog,
    },
    {
      href: `/${currentLocale}/orders`,
      label: t("navigation.orders"),
      icon: RiReceiptLine,
      permission: NAV_PERMISSION.orders,
    },
    {
      href: `/${currentLocale}/billing`,
      label: t("navigation.billing"),
      icon: RiBankCardLine,
      permission: NAV_PERMISSION.billing,
    },
    {
      href: `/${currentLocale}/products`,
      label: t("navigation.products"),
      icon: RiBox1Line,
      permission: NAV_PERMISSION.products,
    },
    {
      href: `/${currentLocale}/marketing`,
      label: t("navigation.marketing"),
      icon: RiMegaphoneLine,
      permission: NAV_PERMISSION.marketing,
    },
  ].filter((item) => canSee(item.permission));

  const moreActive = moreItems.some((item) => isPathActive(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Navigation"
        className="bg-background/95 border-border fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid h-14"
          style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
        >
          {primary.map((item) => {
            const active = isPathActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon size={22} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
              moreActive || moreOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <RiApps2Line size={22} />
            <span className="max-w-full truncate">{t("navigation.more")}</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-1 text-left">
            <SheetTitle>{t("navigation.more")}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("navigation.more")}
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2">
            {moreItems.map((item) => {
              const active = isPathActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center text-xs font-medium",
                    active ? "bg-accent text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon size={22} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-2 flex flex-col gap-1 border-t pt-3">
            <LocationSwitcher />
            <LanguageSwitcher />
            <NavUser />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
