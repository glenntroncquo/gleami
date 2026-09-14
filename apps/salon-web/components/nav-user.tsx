"use client";

import {
  RiExpandUpDownLine,
  RiUserLine,
  RiSettings3Line,
  RiLogoutCircleLine,
  RiMoonClearLine,
  RiSunLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { NAV_PERMISSION } from "@/lib/auth";
import { useLocaleNavigation } from "@/hooks/use-locale-navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function NavUser() {
  const { user, signOut, hasAnyPermission, membershipReady } = useAuth();
  const canSeeSettings = !membershipReady || hasAnyPermission(NAV_PERMISSION.settings);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { currentLocale } = useLocaleNavigation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const userEmail = user.email || '';
  const avatarUrl = user.user_metadata?.avatar_url || '';

  const handleLogout = async () => {
    await signOut();
  };

  const goToSettings = () => {
    router.push(`/${currentLocale}/settings`);
  };

  const handleThemeToggle = () => {
    if (!mounted) return;
    const prefersDarkScheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (theme === "system") {
      setTheme(prefersDarkScheme ? "light" : "dark");
    } else if (
      (theme === "light" && !prefersDarkScheme) ||
      (theme === "dark" && prefersDarkScheme)
    ) {
      setTheme(theme === "light" ? "dark" : "light");
    } else {
      setTheme("system");
    }
  };

  const getThemeLabel = () => {
    if (!mounted) return "Theme";
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "Dark Mode" : "Light Mode";
    }
    return theme === "dark" ? "Dark Mode" : "Light Mode";
  };

  const getThemeIcon = () => {
    if (!mounted) return <RiSunLine size={20} className="size-5 text-muted-foreground/80" />;
    const currentTheme = theme === "system" 
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    return currentTheme === "dark" ? (
      <RiMoonClearLine size={20} className="size-5 text-muted-foreground/80" />
    ) : (
      <RiSunLine size={20} className="size-5 text-muted-foreground/80" />
    );
  };
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>svg]:size-5"
            >
              <Avatar className="size-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
              </div>
              <RiExpandUpDownLine className="ml-auto size-5 text-muted-foreground/80" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) dark bg-sidebar"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-3 focus:bg-sidebar-accent cursor-pointer"
                onClick={goToSettings}
              >
                <RiUserLine
                  size={20}
                  className="size-5 text-muted-foreground/80"
                />
                Profile
              </DropdownMenuItem>
              {canSeeSettings && (
              <DropdownMenuItem
                className="gap-3 focus:bg-sidebar-accent cursor-pointer"
                onClick={goToSettings}
              >
                <RiSettings3Line
                  size={20}
                  className="size-5 text-muted-foreground/80"
                />
                Settings
              </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="gap-3 focus:bg-sidebar-accent cursor-pointer"
                onClick={handleThemeToggle}
              >
                {getThemeIcon()}
                {getThemeLabel()}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-3 focus:bg-sidebar-accent cursor-pointer"
                onClick={handleLogout}
              >
                <RiLogoutCircleLine
                  size={20}
                  className="size-5 text-muted-foreground/80"
                />
                Logout
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
