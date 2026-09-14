"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { RevenueBarChart } from "@/components/charts/revenue-bar-chart";
import { ClientCountChart } from "@/components/charts/client-count-chart";
import { AppointmentCountChart } from "@/components/charts/appointment-count-chart";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations();

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
              <p className="text-muted-foreground">
                {t("dashboard.description")}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart />
            <RevenueBarChart />
            <ClientCountChart />
            <AppointmentCountChart />
          </div>
        </div>
      </SidebarInset>
    </ProtectedRoute>
  );
}
