"use client";

import { locales, type Locale } from "@/i18n/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Globe } from "lucide-react";
import { useLocaleNavigation } from "@/hooks/use-locale-navigation";
import { setCookie } from "cookies-next";

const languageNames: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  fr: "Français",
  pt: "Português",
};

const languageFlags: Record<Locale, string> = {
  en: "🇺🇸",
  nl: "🇳🇱",
  fr: "🇫🇷",
  pt: "🇧🇷",
};

export function LanguageSwitcher() {
  const { currentLocale, switchLocale } = useLocaleNavigation();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const handleLanguageChange = (newLocale: Locale) => {
    // Save language preference in cookie
    setCookie("locale", newLocale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    switchLocale(newLocale);
  };

  // Collapsed view: Show only flag icon with dropdown
  if (isCollapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={languageNames[currentLocale]}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground justify-center text-center [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:justify-center [&>span:first-child]:w-full [&>span:first-child]:h-full"
              >
                <span className="text-xl leading-none">
                  {languageFlags[currentLocale]}
                </span>
                <span className="sr-only">{languageNames[currentLocale]}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) dark bg-sidebar"
              side="right"
              align="start"
              sideOffset={4}
            >
              {locales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => handleLanguageChange(loc)}
                  className={currentLocale === loc ? "bg-sidebar-accent" : ""}
                >
                  <span className="flex items-center gap-2">
                    {languageFlags[loc]} {languageNames[loc]}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Expanded view: Show full selector with flag and language name
  return (
    <Select value={currentLocale} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-full gap-2 border-none bg-transparent px-2 shadow-none hover:bg-sidebar-accent">
        <Globe className="h-4 w-4" />
        <SelectValue>
          <span className="flex items-center gap-2">
            {languageFlags[currentLocale]} {languageNames[currentLocale]}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            <span className="flex items-center gap-2">
              {languageFlags[loc]} {languageNames[loc]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
