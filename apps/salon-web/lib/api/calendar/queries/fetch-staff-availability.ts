import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

export type StaffScheduleRule = {
  id: string;
  staff_id: string;
  company_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
};

export type StaffScheduleException = {
  id: string;
  staff_id: string;
  company_id: string;
  starts_at: string;
  ends_at: string;
  kind: "available_addition" | "unavailable";
};

export type StaffAvailabilityData = {
  rules: StaffScheduleRule[];
  exceptions: StaffScheduleException[];
};

export async function fetchStaffAvailability(
  staffId: string,
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  data: StaffAvailabilityData | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();

  const { data: rules, error: ruleError } = await supabase
    .from("staff_schedule_rule")
    .select(
      "id, staff_id, company_id, day_of_week, start_time, end_time, effective_from, effective_to, is_active",
    )
    .eq("staff_id", staffId)
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (ruleError) {
    return { data: null, error: ruleError };
  }

  const { data: exceptions, error: exceptionError } = await supabase
    .from("staff_schedule_exception")
    .select("id, staff_id, company_id, starts_at, ends_at, kind")
    .eq("staff_id", staffId)
    .eq("company_id", companyId)
    .lte("starts_at", endDate.toISOString())
    .gte("ends_at", startDate.toISOString());

  if (exceptionError) {
    return { data: null, error: exceptionError };
  }

  return {
    data: {
      rules: (rules as StaffScheduleRule[]) || [],
      exceptions: (exceptions as StaffScheduleException[]) || [],
    },
    error: null,
  };
}
