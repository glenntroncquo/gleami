import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./browser-supabase";
import type { AvailabilityDay } from "./booking/slots";

export const SEARCH_RADIUS_KM = 25;
export const BELGIUM_BBOX = {
  minLng: 2.52,
  minLat: 49.48,
  maxLng: 6.41,
  maxLat: 51.51,
};

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
};

export type SearchSalon = {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  images: string[];
  city: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  categoryIds: string[];
  rating: number | null;
  reviewCount: number;
  likeCount: number;
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
  center?: { lat: number; lng: number } | null;
  radiusKm?: number;
  bbox?: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null;
  limit?: number;
}): Promise<SearchSalon[]> {
  const { data, error } = await client().rpc("marketplace_search", {
    p_q: input.q?.trim() ? input.q.trim() : null,
    p_category_ids: input.categoryIds?.length ? input.categoryIds : null,
    p_lat: input.center?.lat ?? null,
    p_lng: input.center?.lng ?? null,
    p_radius_km: input.center ? input.radiusKm ?? SEARCH_RADIUS_KM : null,
    p_min_lng: input.bbox?.minLng ?? null,
    p_min_lat: input.bbox?.minLat ?? null,
    p_max_lng: input.bbox?.maxLng ?? null,
    p_max_lat: input.bbox?.maxLat ?? null,
    p_limit: input.limit ?? 24,
  });
  if (error) throw new Error(error.message);
  const limit = input.limit ?? 24;
  return ((data ?? []) as SearchRpcRow[]).slice(0, limit).map(toSearchSalon);
}

type SearchRpcRow = {
  location_id: string;
  company_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  image_paths: string[] | string | null;
  city: string | null;
  address: string | null;
  lat: number | string | null;
  lng: number | string | null;
  distance_km: number | string | null;
  category_ids: string[] | null;
  rating: number | string | null;
  review_count: number | null;
  like_count: number | null;
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

function finite(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSearchSalon(row: SearchRpcRow): SearchSalon {
  const images = imagePaths(row.image_paths)
    .map((path) => publicMarketplaceImage(path))
    .filter((url): url is string => Boolean(url));
  const rating = finite(row.rating);
  const distance = finite(row.distance_km);
  return {
    locationId: row.location_id,
    companyId: row.company_id,
    name: row.name,
    slug: row.slug,
    imageUrl: images[0] ?? null,
    images,
    city: row.city,
    address: row.address ?? "",
    latitude: finite(row.lat),
    longitude: finite(row.lng),
    distanceKm: distance,
    categoryIds: row.category_ids ?? [],
    rating,
    reviewCount: row.review_count ?? 0,
    likeCount: row.like_count ?? 0,
  };
}

export async function setLike(userId: string, locationId: string, liked: boolean): Promise<void> {
  const supabase = client();
  if (liked) {
    const { error } = await supabase
      .from("marketplace_location_like")
      .insert({ user_id: userId, location_id: locationId });
    if (error && error.code !== "23505") throw new Error(error.message);
    return;
  }
  const { error } = await supabase
    .from("marketplace_location_like")
    .delete()
    .eq("user_id", userId)
    .eq("location_id", locationId);
  if (error) throw new Error(error.message);
}

export async function isLiked(userId: string, locationId: string): Promise<boolean> {
  const { data, error } = await client()
    .from("marketplace_location_like")
    .select("location_id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export type MyAppointment = {
  id: string;
  startsAt: string;
  locationName: string;
  locationSlug: string;
  locationCity: string | null;
  services: string[];
  isCanceled: boolean;
  price: number | null;
};

export async function listMyAppointments(): Promise<MyAppointment[]> {
  const { data, error } = await client().rpc("marketplace_my_appointments", { p_limit: 50 });
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.location_name !== "string") return [];
    return [{
      id: item.id,
      startsAt: String(item.starts_at ?? ""),
      locationName: item.location_name,
      locationSlug: String(item.location_slug ?? ""),
      locationCity: item.location_city ? String(item.location_city) : null,
      services: Array.isArray(item.services) ? item.services.filter((name) => typeof name === "string") : [],
      isCanceled: Boolean(item.is_canceled),
      price: item.price == null ? null : Number(item.price),
    }];
  });
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
    .select("location_id, name, slug, city")
    .in("location_id", ids);
  if (rowError) throw new Error(rowError.message);
  const { data: mediaRows } = await supabase
    .from("marketplace_media")
    .select("location_id, storage_path, sort_order, id")
    .eq("type", "IMAGE")
    .in("location_id", ids)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  const covers = new Map<string, string>();
  for (const media of mediaRows ?? []) {
    const locationId = String(media.location_id);
    if (covers.has(locationId)) continue;
    const url = publicMarketplaceImage(String(media.storage_path ?? ""));
    if (url) covers.set(locationId, url);
  }
  const byId = new Map(
    (rows ?? []).map((row) => [
      String(row.location_id),
      {
        locationId: String(row.location_id),
        name: String(row.name),
        slug: String(row.slug),
        imageUrl: covers.get(String(row.location_id)) ?? null,
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
