import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { asLocationClient, fetchServiceIdsForLocation } from "@/lib/location";

export type Service = {
  id: string;
  name: string;
  color: string | null;
};

export async function fetchServices(locationId?: string | null): Promise<{
  data: Service[] | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();
  let query = supabase
    .from("service")
    .select("id, name, color")
    .eq("is_deleted", false)
    .limit(100);

  if (locationId) {
    const offered = await fetchServiceIdsForLocation(
      asLocationClient(supabase),
      locationId,
    );
    if (offered.tablePresent) {
      if (offered.data.length === 0) return { data: [], error: null };
      query = query.in("id", offered.data);
    }
  }

  const { data, error } = await query;

  return { data, error };
}
