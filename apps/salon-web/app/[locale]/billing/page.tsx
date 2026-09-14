"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { AppSidebar } from "@/components/app-sidebar";
import { ConnectAccountCard } from "@/components/billing/connect-account-card";
import { ProtectedRoute } from "@/components/protected-route";
import { SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  const t = useTranslations("billing");

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <div className="flex w-full flex-1 flex-col gap-8 p-6 lg:p-10 max-w-5xl">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Suspense fallback={<BillingSkeleton />}>
            <ConnectAccountCard />
          </Suspense>
        </div>
      </SidebarInset>
    </ProtectedRoute>
  );
}

function BillingSkeleton() {
  return (
    <div className="bg-card space-y-5 rounded-xl border p-6 shadow-sm">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
