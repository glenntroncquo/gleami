"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { StaffSheet } from "@/components/staff-sheet";
import BigCalendar from "@/components/calendar/big-calendar";
import type { Staff } from "@/components/staff-sheet";
import { Button } from "@/components/ui/button";
import { CalendarProvider } from "@/components/event-calendar/calendar-context";
import { useLocationId } from "@/lib/company-util";
import { asLocationClient } from "@/lib/location";

const STAFF_DETAIL_SELECT =
  "id, first_name, last_name, email, phone, slug, specialization, image_path, status, hire_date, specialties";

async function fetchStaffRecord(staffId: string): Promise<Staff | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(STAFF_DETAIL_SELECT)
    .eq("id", staffId)
    .single();
  if (error || !data) return null;
  return data;
}

/** Role lives on location_membership + role, not staff. Prefer the selected shop. */
async function fetchMembershipRoleName(
  staffId: string,
  locationId: string | null,
): Promise<string | null> {
  const supabase = asLocationClient(createClient());
  const { data, error } = await supabase
    .from("location_membership")
    .select("location_id, role_id")
    .eq("staff_id", staffId)
    .eq("is_active", true);
  if (error || !Array.isArray(data) || data.length === 0) return null;

  const rows = data as { location_id: string; role_id: string | null }[];
  const preferred =
    (locationId && rows.find((row) => row.location_id === locationId)) || rows[0];
  if (!preferred?.role_id) return null;

  const { data: role, error: roleError } = await supabase
    .from("role")
    .select("name")
    .eq("id", preferred.role_id)
    .maybeSingle();
  const roleRow = role as { name?: string | null } | null;
  if (roleError || !roleRow?.name) return null;
  return roleRow.name.trim() || null;
}

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const staffId = params.staffId as string;
  const locationId = useLocationId();

  const [staff, setStaff] = useState<Staff | null>(null);
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    async function fetchStaff() {
      if (!staffId) return;

      try {
        const data = await fetchStaffRecord(staffId);
        if (!data) {
          toast.error("Failed to load staff information");
          router.push(`/${params.locale}/staff`);
          return;
        }
        setStaff(data);
        setMembershipRole(await fetchMembershipRoleName(staffId, locationId));
      } catch (error) {
        console.error("Error:", error);
        toast.error("An error occurred while loading staff information");
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, [staffId, router, params.locale, locationId]);

  const handleSave = (updatedStaff: Staff) => {
    setStaff(updatedStaff);
    toast.success(t("staff.messages.updateSuccess"));
  };

  const handleRefresh = async () => {
    const data = await fetchStaffRecord(staffId);
    if (data) setStaff(data);
    setMembershipRole(await fetchMembershipRoleName(staffId, locationId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">
          {t("staff.messages.notFound")}
        </div>
      </div>
    );
  }

  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();
  const initials = staff.first_name && staff.last_name
    ? `${staff.first_name.charAt(0).toUpperCase()}${staff.last_name.charAt(0).toUpperCase()}`
    : "N/A";

  return (
    <CalendarProvider>
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left Side - Profile Info */}
        <div className="w-80 flex-shrink-0 sticky top-6 h-fit">
          <div className="flex flex-col space-y-6 pt-5">
            {/* Profile Image */}
            <div className="flex flex-col items-center">
              <div className="h-32 w-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {staff.image_path ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${staff.image_path}`}
                    alt={fullName || "Staff member"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div
                  className={`h-full w-full flex items-center justify-center text-3xl font-semibold text-gray-600 ${
                    staff.image_path ? "hidden" : ""
                  }`}
                >
                  {initials}
                </div>
              </div>
            </div>

            {/* Name and Email */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">{fullName || "N/A"}</h2>
              <p className="text-sm text-muted-foreground">{staff.email}</p>
            </div>

            {/* Statistics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {t("common.status")}
                </span>
                <span className="text-lg font-semibold">
                  {staff.status || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {t("staff.role")}
                </span>
                <span className="text-lg font-semibold capitalize">
                  {membershipRole || "—"}
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <Button
              onClick={() => setIsSheetOpen(true)}
              className="w-full"
              variant="outline"
            >
              {t("common.edit")}
            </Button>

            {/* Details Section */}
            <div className="space-y-3 pt-2">
              {staff.phone && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("common.phone")}
                  </p>
                  <p className="text-sm font-medium">{staff.phone}</p>
                </div>
              )}

              {staff.specialization && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("staff.specialization")}
                  </p>
                  <p className="text-sm font-medium">{staff.specialization}</p>
                </div>
              )}

              {staff.hire_date && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("staff.hireDate")}
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(staff.hire_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Calendar */}
        <div className="flex-1 min-w-0 flex flex-col">
          <BigCalendar />
        </div>
      </div>

      {/* Staff Sheet for editing */}
      <StaffSheet
        staff={staff}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onSave={handleSave}
        onRefresh={handleRefresh}
      />
    </CalendarProvider>
  );
}
