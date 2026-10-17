import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./browser-supabase";
import type { AvailabilityDay } from "./booking/slots";

export const GHENT = { lat: 51.0543, lng: 3.7174 };
export const SEARCH_RADIUS_KM = 25;

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
};

export type SearchSalon = {
  locationId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  city: string | null;
  distanceKm: number | null;
  categoryIds: string[];
  rating: number | null;
  reviewCount: number;
};

export type FavoriteSalon = {
  locationId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  city: string | null;
};

export type PublicLocation = {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  city: string | null;
  services: Array<{
    serviceId: string;
    name: string;
    description: string | null;
    variants: Array<{
      serviceVariantId: string;
      name: string;
      price: number;
      durationMinutes: number;
    }>;
  }>;
  /** False when the catalog came from search rows and has no prices. */
  priced: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profileComplete: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  marketplace_category_translation?: Array<{ locale: string; name: string }> | null;
};

function client() {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("Marketplace is not configured.");
  return supabase;
}

export function userFromSession(session: Session | null): AuthUser | null {
  const user = session?.user;
  if (!user?.email) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email,
    firstName: String(meta.first_name ?? ""),
    lastName: String(meta.last_name ?? ""),
    phone: String(meta.phone ?? ""),
    profileComplete: Boolean(user.app_metadata?.marketplace_profile_completed_at),
  };
}

export async function listCategories(locale: string): Promise<MarketplaceCategory[]> {
  const { data, error } = await client()
    .from("marketplace_category")
    .select("id,name,slug,marketplace_category_translation(locale,name)")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return ((data ?? []) as CategoryRow[]).map((row) => {
    const translated = row.marketplace_category_translation?.find(
      (item) => item.locale === locale,
    )?.name;
    return { id: row.id, name: translated?.trim() || row.name, slug: row.slug };
  });
}

export async function searchSalons(input: {
  q?: string;
  categoryIds?: string[];
  center: { lat: number; lng: number };
  radiusKm?: number;
  limit?: number;
}): Promise<SearchSalon[]> {
  const { data, error } = await client().rpc("marketplace_search", {
    p_q: input.q?.trim() ? input.q.trim() : null,
    p_category_ids: input.categoryIds?.length ? input.categoryIds : null,
    p_lat: input.center.lat,
    p_lng: input.center.lng,
    p_radius_km: input.radiusKm ?? SEARCH_RADIUS_KM,
    p_limit: input.limit ?? 24,
  });
  if (error) throw new Error(error.message);
  const limit = input.limit ?? 24;
  return ((data ?? []) as SearchRpcRow[]).slice(0, limit).map(toSearchSalon);
}

type SearchRpcRow = {
  location_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  image_paths: string[] | string | null;
  city: string | null;
  distance_km: number | string | null;
  category_ids: string[] | null;
  rating: number | string | null;
  review_count: number | null;
};

function publicMarketplaceImage(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || storagePath.length === 0) return null;
  const encoded = storagePath.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${base}/storage/v1/object/public/marketplace/${encoded}`;
}

function imagePaths(value: SearchRpcRow["image_paths"]): string[] {
  if (Array.isArray(value)) return value.filter((path) => typeof path === "string");
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((path) => typeof path === "string") : [];
  } catch {
    return [];
  }
}

function toSearchSalon(row: SearchRpcRow): SearchSalon {
  const gallery = imagePaths(row.image_paths)
    .map((path) => publicMarketplaceImage(path))
    .find((url): url is string => Boolean(url));
  const rating = row.rating == null ? null : Number(row.rating);
  const distance = row.distance_km == null ? null : Number(row.distance_km);
  return {
    locationId: row.location_id,
    name: row.name,
    slug: row.slug,
    imageUrl: gallery ?? row.image_url,
    city: row.city,
    distanceKm: distance != null && Number.isFinite(distance) ? distance : null,
    categoryIds: row.category_ids ?? [],
    rating: rating != null && Number.isFinite(rating) ? rating : null,
    reviewCount: row.review_count ?? 0,
  };
}

export async function setLike(userId: string, locationId: string, liked: boolean): Promise<void> {
  const supabase = client();
  if (liked) {
    const { error } = await supabase
      .from("marketplace_location_like")
      .insert({ user_id: userId, location_id: locationId });
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase
    .from("marketplace_location_like")
    .delete()
    .eq("user_id", userId)
    .eq("location_id", locationId);
  if (error) throw new Error(error.message);
}

export async function listFavorites(userId: string): Promise<FavoriteSalon[]> {
  const supabase = client();
  const { data: likes, error } = await supabase
    .from("marketplace_location_like")
    .select("location_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (likes ?? []).map((row) => String(row.location_id));
  if (ids.length === 0) return [];
  const { data: rows, error: rowError } = await supabase
    .from("marketplace_search_location")
    .select("location_id, name, slug, image_url, city")
    .in("location_id", ids);
  if (rowError) throw new Error(rowError.message);
  const byId = new Map(
    (rows ?? []).map((row) => [
      String(row.location_id),
      {
        locationId: String(row.location_id),
        name: String(row.name),
        slug: String(row.slug),
        imageUrl: row.image_url ? String(row.image_url) : null,
        city: row.city ? String(row.city) : null,
      } satisfies FavoriteSalon,
    ]),
  );
  return ids.flatMap((id) => {
    const salon = byId.get(id);
    return salon ? [salon] : [];
  });
}

export async function locationBySlug(
  slug: string,
  locale: string,
): Promise<PublicLocation> {
  const { data, error } = await client().rpc("marketplace_location", {
    p_slug: slug,
    p_locale: locale.slice(0, 2),
  });
  const profile = data as {
    location?: {
      locationId: string;
      companyId: string;
      name: string;
      slug: string;
      city: string | null;
    };
    services?: PublicLocation["services"];
  } | null;
  if (!error && profile?.location) {
    return {
      locationId: profile.location.locationId,
      companyId: profile.location.companyId,
      name: profile.location.name,
      slug: profile.location.slug,
      city: profile.location.city,
      services: profile.services ?? [],
      priced: true,
    };
  }
  return locationFromProjection(slug);
}

async function locationFromProjection(slug: string): Promise<PublicLocation> {
  const { data, error } = await client()
    .from("marketplace_search_location")
    .select("location_id,company_id,name,slug,city,treatments")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("NOT_FOUND");
  const treatments = Array.isArray(data.treatments) ? data.treatments : [];
  return {
    locationId: String(data.location_id),
    companyId: String(data.company_id),
    name: String(data.name),
    slug: String(data.slug),
    city: data.city ? String(data.city) : null,
    priced: false,
    services: treatments.flatMap((treatment) => {
      if (!treatment || typeof treatment !== "object") return [];
      const row = treatment as { serviceId?: string; serviceVariantId?: string; name?: string };
      if (!row.serviceId || !row.serviceVariantId || !row.name) return [];
      return [{
        serviceId: row.serviceId,
        name: row.name,
        description: null,
        variants: [{
          serviceVariantId: row.serviceVariantId,
          name: row.name,
          price: 0,
          durationMinutes: 0,
        }],
      }];
    }),
  };
}

export async function listAvailability(input: {
  companyId: string;
  locationId: string;
  services: Array<{ serviceId: string; serviceVariantId: string }>;
  startDate: string;
  endDate: string;
}): Promise<Record<string, AvailabilityDay>> {
  const { data, error } = await client().functions.invoke<{
    dates: Record<string, AvailabilityDay>;
  }>("availability-list", {
    body: {
      companyId: input.companyId,
      location_id: input.locationId,
      locationId: input.locationId,
      services: input.services,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });
  if (error) {
    const taken = await slotTaken(error);
    if (taken) throw new SlotTakenError();
    throw new Error(error.message);
  }
  return data?.dates ?? {};
}

export class SlotTakenError extends Error {
  constructor() {
    super("SLOT_TAKEN");
    this.name = "SlotTakenError";
  }
}

async function slotTaken(error: { message: string; context?: unknown }): Promise<boolean> {
  const response = error.context;
  if (!(response instanceof Response)) return false;
  try {
    const body = (await response.clone().json()) as { message?: string; code?: string };
    const key = body.code ?? body.message ?? "";
    return ["BOOKING_SLOT_TAKEN", "CONFLICT_DETECTED", "CONCURRENCY_RETRY"].includes(key);
  } catch {
    return false;
  }
}

export async function createAppointment(input: {
  companyId: string;
  locationId: string;
  start: string;
  staffId: string;
  services: Array<{ serviceId: string; serviceVariantId: string }>;
  price: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}): Promise<{ bookingId: string }> {
  const { companyId, locationId, ...rest } = input;
  const { data, error } = await client().functions.invoke<{ booking_id: string }>(
    "appointment-create",
    { body: { ...rest, companyId, location_id: locationId, locationId } },
  );
  if (error) {
    if (await slotTaken(error)) throw new SlotTakenError();
    throw new Error(error.message);
  }
  if (!data?.booking_id) throw new Error("Booking failed.");
  return { bookingId: data.booking_id };
}

export async function lookupEmail(email: string): Promise<{ exists: boolean; hasPassword: boolean }> {
  const { data, error } = await client().functions.invoke<{
    exists: boolean;
    hasPassword: boolean;
  }>("marketplace-auth-lookup", { body: { email } });
  if (error) throw new Error(error.message);
  return { exists: Boolean(data?.exists), hasPassword: Boolean(data?.hasPassword) };
}

export async function completeAccount(input: {
  firstName: string;
  lastName: string;
  phone: string;
  password?: string;
}): Promise<void> {
  const { error } = await client().functions.invoke("marketplace-account-complete", {
    body: input,
  });
  if (error) throw new Error(error.message);
  await client().auth.refreshSession();
}
