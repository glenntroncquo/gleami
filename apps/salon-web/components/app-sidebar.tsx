"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  RiCalendarLine,
  RiTeamLine,
  RiScissorsLine,
  RiShoppingCartLine,
  RiUserLine,
  RiBox1Line,
  RiMegaphoneLine,
  RiDashboardLine,
  RiReceiptLine,
  RiBankCardLine,
} from "@remixicon/react";
import { useLocaleNavigation } from "@/hooks/use-locale-navigation";
import { localizedServiceCatalogPath } from "@/lib/api/catalog/service-catalog-path";

import { NavUser } from "@/components/nav-user";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocationSwitcher } from "@/components/location-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import SidebarCalendar from "@/components/sidebar-calendar";
import { motion } from "framer-motion";
import { NAV_PERMISSION, type PermissionKey } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { currentLocale } = useLocaleNavigation();
  const t = useTranslations();
  const { setOpenMobile, isMobile, openMobile } = useSidebar();
  const { hasAnyPermission, membershipReady } = useAuth();
  const canSee = (perms: readonly PermissionKey[]) =>
    !membershipReady || hasAnyPermission(perms);

  const handleNavClick = () => {
    if (isMobile || openMobile) {
      setOpenMobile(false);
    }
  };
  return (
    <>
      <MobileTabBar />
      <Sidebar
        variant="inset"
        collapsible="icon"
        {...props}
        className="max-lg:p-3 lg:pe-1"
      >
        <SidebarHeader>
          <div className="flex min-h-12 items-center justify-center group-data-[collapsible=icon]:hidden">
            <Link
              className="inline-flex items-center"
              href="/"
              title="Gleami"
              onClick={handleNavClick}
            >
              <Image
                src="/gleami-wordmark.svg"
                alt="Gleami"
                width={116}
                height={42}
                priority
                className="h-auto w-[116px]"
              />
            </Link>
          </div>
          <div className="hidden min-h-12 items-center justify-center group-data-[collapsible=icon]:flex">
            <Link href="/" title="Gleami" onClick={handleNavClick} className="inline-flex">
              <Image src="/gleami-mark.svg" alt="Gleami" width={28} height={28} priority />
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent className="gap-0 mt-3 pt-3 border-t">
          <SidebarTrigger />
          <SidebarGroup className="px-1">
            <SidebarGroupLabel className="uppercase text-muted-foreground/65">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {canSee(NAV_PERMISSION.dashboard) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/dashboard`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.dashboard")}
                    >
                      <Link
                        href={`/${currentLocale}/dashboard`}
                        onClick={handleNavClick}
                      >
                        <RiDashboardLine size={20} />
                        {t("navigation.dashboard")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.calendar) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/calendar`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.calendar")}
                    >
                      <Link
                        href={`/${currentLocale}/calendar`}
                        onClick={handleNavClick}
                      >
                        <RiCalendarLine size={20} />
                        {t("navigation.calendar")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.staff) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/staff`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.staff")}
                    >
                      <Link
                        href={`/${currentLocale}/staff`}
                        onClick={handleNavClick}
                      >
                        <RiTeamLine size={20} />
                        {t("navigation.staff")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.client) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/client`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.client")}
                    >
                      <Link
                        href={`/${currentLocale}/client`}
                        onClick={handleNavClick}
                      >
                        <RiUserLine size={20} />
                        {t("navigation.client")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {/* Timeline nav is parked until the route ships. */}
                {canSee(NAV_PERMISSION.catalog) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === localizedServiceCatalogPath(currentLocale)
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.treatment")}
                    >
                      <Link
                        href={localizedServiceCatalogPath(currentLocale)}
                        onClick={handleNavClick}
                      >
                        <RiScissorsLine size={20} />
                        {t("navigation.treatment")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.pos) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/pos`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.pos")}
                    >
                      <Link
                        href={`/${currentLocale}/pos`}
                        onClick={handleNavClick}
                      >
                        <RiShoppingCartLine size={20} />
                        {t("navigation.pos")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.orders) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/orders`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.orders")}
                    >
                      <Link
                        href={`/${currentLocale}/orders`}
                        onClick={handleNavClick}
                      >
                        <RiReceiptLine size={20} />
                        {t("navigation.orders")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.billing) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/billing`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.billing")}
                    >
                      <Link
                        href={`/${currentLocale}/billing`}
                        onClick={handleNavClick}
                      >
                        <RiBankCardLine size={20} />
                        {t("navigation.billing")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.products) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/products`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.products")}
                    >
                      <Link
                        href={`/${currentLocale}/products`}
                        onClick={handleNavClick}
                      >
                        <RiBox1Line size={20} />
                        {t("navigation.products")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
                {canSee(NAV_PERMISSION.marketing) && (
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      asChild
                      className={
                        pathname === `/${currentLocale}/marketing`
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                      tooltip={t("navigation.marketing")}
                    >
                      <Link
                        href={`/${currentLocale}/marketing`}
                        onClick={handleNavClick}
                      >
                        <RiMegaphoneLine size={20} />
                        {t("navigation.marketing")}
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {pathname === `/${currentLocale}/calendar` && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <SidebarGroup className="px-1 mt-3 pt-4 border-t group-data-[collapsible=icon]:hidden">
                <SidebarCalendar />
              </SidebarGroup>
            </motion.div>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col gap-2">
            <LocationSwitcher />
            <LanguageSwitcher />
            <NavUser />
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
