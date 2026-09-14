"use client";

import { useTranslations } from "next-intl";
import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { MarketingTabs } from "@/components/marketing/marketing-tabs";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-6 bg-[linear-gradient(180deg,hsl(var(--muted)/0.35),transparent_22%)] p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {t("navigation.marketing")}
              </h1>
            </div>

            <MarketingTabs />
          </div>

          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </SidebarInset>
    </ProtectedRoute>
  );
}
