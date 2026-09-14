"use client";

import { RiMapPinLine } from "@remixicon/react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";

export function LocationSwitcher() {
  const t = useTranslations("locations");
  const {
    showLocationSwitcher,
    locations,
    locationId,
    locationIds,
    setLocationId,
  } = useAuth();
  const { state } = useSidebar();

  if (!showLocationSwitcher) return null;

  const options = locations.filter(
    (row) => row.is_active && locationIds.includes(row.id),
  );
  if (options.length <= 1) return null;

  const current = options.find((row) => row.id === locationId) ?? options[0];
  const collapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={current?.name ?? t("switcherLabel")}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <RiMapPinLine className="size-5 text-muted-foreground/80" />
              {!collapsed && (
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-xs text-muted-foreground">
                    {t("switcherLabel")}
                  </span>
                  <span className="truncate font-medium">
                    {current?.name ?? t("unknown")}
                  </span>
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 dark bg-sidebar"
            side="bottom"
            align="start"
            sideOffset={4}
          >
            {options.map((location) => (
              <DropdownMenuItem
                key={location.id}
                className="cursor-pointer gap-3 focus:bg-sidebar-accent"
                onClick={() => setLocationId(location.id)}
              >
                <RiMapPinLine
                  size={18}
                  className="size-4 text-muted-foreground/80"
                />
                <span className="flex-1 truncate">{location.name}</span>
                {location.id === locationId && (
                  <span className="text-xs text-muted-foreground">
                    {t("current")}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
