"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/client";

type Staff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export default function StaffDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const t = useTranslations();
  const staffId = params.staffId as string;
  const locale = params.locale as string;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaff() {
      if (!staffId) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("staff")
          .select("id, first_name, last_name")
          .eq("id", staffId)
          .single();

        if (error) {
          console.error("Error fetching staff:", error);
          setStaff(null);
        } else {
          setStaff(data);
        }
      } catch (error) {
        console.error("Error:", error);
        setStaff(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, [staffId]);

  const staffName = staff
    ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Staff"
    : "Loading...";

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-6">
          {/* Breadcrumbs */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${locale}/staff`}>
                    {t("navigation.staff")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{staffName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page Content */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">{t("common.loading")}</div>
            </div>
          ) : (
            children
          )}
        </div>
      </SidebarInset>
    </ProtectedRoute>
  );
}
