"use client";

import { useTranslations } from "next-intl";
import { FilterIcon, LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TabFilter } from "./types";

interface TopNavigationProps {
  activeTab: TabFilter;
  onTabChange: (tab: TabFilter) => void;
}

export function TopNavigation({ activeTab, onTabChange }: TopNavigationProps) {
  const t = useTranslations("planning");

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: t("tabs.all") },
    { key: "backlog", label: t("tabs.backlog") },
    { key: "active", label: t("tabs.active") },
    { key: "closed", label: t("tabs.closed") },
  ];

  return (
    <div className="flex items-center justify-between gap-4 pb-4">
      {/* Left side - Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <FilterIcon size={14} />
          {t("filter")}
        </Button>

        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <LayoutGridIcon size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ListIcon size={14} />
          </Button>
        </div>

        <Button size="sm" className="gap-2 bg-slate-900 hover:bg-slate-800">
          <PlusIcon size={14} />
          {t("newTask")}
        </Button>
      </div>
    </div>
  );
}

