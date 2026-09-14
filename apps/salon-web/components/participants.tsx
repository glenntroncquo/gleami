"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { useAuth } from "@/providers/auth-provider";
import {
  asLocationClient,
  fetchStaffIdsForLocation,
  staffIdsForLocationScope,
} from "@/lib/location";
import {
  PAGE_FETCH_TIMEOUT_MS,
  resolveLocationScopeIds,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";
import { useCalendarContext } from "@/components/event-calendar/calendar-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export interface Staff {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_path: string | null;
}

async function loadCalendarStaff(
  companyId: string,
  locationId: string | null,
  multiLocationEnabled: boolean,
): Promise<Staff[]> {
  const supabase = createClient();

  let query = supabase
    .from("staff")
    .select("id, first_name, last_name, image_path")
    .eq("company_id", companyId)
    .order("first_name", { ascending: true });

  if (locationId && multiLocationEnabled) {
    const scopedIds = staffIdsForLocationScope(
      await resolveLocationScopeIds(
        () => fetchStaffIdsForLocation(asLocationClient(supabase), locationId),
        "calendar staff location scope",
      ),
      multiLocationEnabled,
    );
    if (scopedIds) {
      if (scopedIds.length === 0) return [];
      query = query.in("id", scopedIds);
    }
  }

  const { data, error } = await withTimeout(
    query,
    PAGE_FETCH_TIMEOUT_MS,
    "calendar staff",
  );

  if (error) {
    console.error("Error fetching staff:", error);
    throw error;
  }

  return data || [];
}

export default function Participants() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {
    isStaffSelected,
    initializeStaffSelection,
    toggleStaffVisibility,
  } = useCalendarContext();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const { membershipReady, multiLocationEnabled } = useAuth();

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0).toUpperCase() || "";
    const last = lastName?.charAt(0).toUpperCase() || "";
    return `${first}${last}`;
  };

  useEffect(() => {
    // companyId is enough. Waiting on locationId left Safari skeletons up
    // after the staff XHR had already completed.
    if (!companyId) {
      if (membershipReady) {
        setStaff([]);
        setIsLoading(false);
        return;
      }
      // Keep the skeleton until AuthProvider sets companyId or
      // membershipReady. A one-shot 4s empty was the #25 prod miss:
      // Safari membership was still in-flight after the wait timed out.
      return;
    }

    return startFailClosedLoad(
      setIsLoading,
      async (isCancelled) => {
        try {
          const rows = await loadCalendarStaff(
            companyId,
            locationId,
            multiLocationEnabled,
          );
          if (isCancelled()) return;
          setStaff(rows);
          initializeStaffSelection(rows.map((member) => member.id));
        } catch (error) {
          console.error("Error fetching staff:", error);
          toast.error("Failed to fetch staff");
          if (!isCancelled()) setStaff([]);
        }
      },
      { label: "calendar-staff" },
    );
    // initializeStaffSelection is not a dep — a new identity every render
    // would cancel in-flight loads and leave the sidebar on skeletons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, locationId, membershipReady, multiLocationEnabled]);

  const handleStaffToggle = (staffId: string) => {
    toggleStaffVisibility(staffId);
  };

  if (isLoading && staff.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No staff members found
      </div>
    );
  }

  return (
    <div className="flex -space-x-1">
      {staff.map((member, index) => {
        const isSelected = isStaffSelected(member.id);
        const initials = getInitials(member.first_name, member.last_name);
        const fullName = `${member.first_name || ""} ${
          member.last_name || ""
        }`.trim();

        return (
          <button
            key={member.id}
            className={`relative z-${
              10 - index
            } ring-2 ring-background rounded-full transition-all hover:scale-110 hover:z-50 ${
              isSelected ? "ring-primary" : "ring-muted-foreground/20"
            }`}
            onClick={() => handleStaffToggle(member.id)}
            title={fullName}
          >
            <Avatar className="w-6 h-6">
              {member.image_path && (
                <AvatarImage
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${member.image_path}`}
                  alt={fullName}
                />
              )}
              <AvatarFallback className="text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        );
      })}
    </div>
  );
}
