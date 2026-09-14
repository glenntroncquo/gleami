import { supabaseAdmin } from "../../infrastructure/supabase/client.ts";
import {
  resolveNotificationPlace,
  type CompanyContact,
  type NotificationPlace,
} from "./place.ts";

export {
  placeToEmailAddress,
  resolveNotificationPlace,
} from "./place.ts";
export type { CompanyContact, LocationContact, NotificationPlace } from "./place.ts";

export async function fetchNotificationPlace(
  company: CompanyContact,
  locationId?: string | null,
): Promise<NotificationPlace> {
  if (!locationId) {
    return resolveNotificationPlace(company, null);
  }

  const { data, error } = await supabaseAdmin
    .from("location")
    .select("street, city, postal_code, country, email, timezone")
    .eq("id", locationId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch location for notification:", error);
    return resolveNotificationPlace(company, null);
  }

  return resolveNotificationPlace(company, data);
}

export async function fetchNotificationPlacesByIds(
  company: CompanyContact,
  locationIds: Array<string | null | undefined>,
): Promise<Map<string, NotificationPlace>> {
  const ids = [...new Set(locationIds.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, NotificationPlace>();
  if (ids.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("location")
    .select("id, street, city, postal_code, country, email, timezone")
    .in("id", ids);

  if (error) {
    console.error("Failed to fetch locations for notification:", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id, resolveNotificationPlace(company, row));
  }
  return map;
}
