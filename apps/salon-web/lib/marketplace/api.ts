import type { LocationQueryError, LocationSupabase } from "@/lib/location/client";
import { isUniqueViolation } from "./slug";
import {
  MARKETPLACE_BUCKET,
  marketplaceObjectUrl,
  marketplaceStoragePath,
  validateMarketplaceImage,
} from "./media";

type DbError = LocationQueryError;

export type MarketplaceClient = LocationSupabase & {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: File,
        options?: { contentType?: string; upsert?: boolean; cacheControl?: string },
      ) => PromiseLike<{ data: unknown; error: DbError }>;
      remove: (paths: string[]) => PromiseLike<{ data: unknown; error: DbError }>;
    };
  };
};

export type MarketplaceService = {
  id: string;
  name: string;
  active: boolean;
  visible: boolean;
  categoryIds: string[];
};

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type MarketplacePhoto = {
  id: string;
  storagePath: string;
  sortOrder: number;
  url: string;
};

export type MarketplaceLocationRow = {
  id: string;
  companyId: string;
  name: string;
  slug: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  isListed: boolean;
  isActive: boolean;
  description: string;
  geo: unknown;
};

const LOCATION_FIELDS =
  "id, company_id, name, slug, street, postal_code, city, country, is_listed, is_active, marketplace_description, geo_location";

function asRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function loadMarketplaceLocation(
  supabase: MarketplaceClient,
  locationId: string,
): Promise<{ data: MarketplaceLocationRow | null; error: DbError }> {
  const { data, error } = await supabase
    .from("location")
    .select(LOCATION_FIELDS)
    .eq("id", locationId)
    .maybeSingle();
  if (error) return { data: null, error };
  if (!data || typeof data !== "object") return { data: null, error: null };
  const row = data as Record<string, unknown>;
  const id = text(row.id);
  const companyId = text(row.company_id);
  if (!id || !companyId) return { data: null, error: null };
  return {
    data: {
      id,
      companyId,
      name: text(row.name) ?? "",
      slug: text(row.slug),
      street: text(row.street),
      postalCode: text(row.postal_code),
      city: text(row.city),
      country: text(row.country),
      isListed: row.is_listed === true,
      isActive: row.is_active !== false,
      description: typeof row.marketplace_description === "string" ? row.marketplace_description : "",
      geo: row.geo_location,
    },
    error: null,
  };
}

export async function loadLocationServiceIds(
  supabase: MarketplaceClient,
  locationId: string,
): Promise<{ data: string[]; error: DbError }> {
  const { data, error } = await supabase
    .from("location_service")
    .select("service_id")
    .eq("location_id", locationId);
  if (error) return { data: [], error };
  const ids = asRows(data)
    .map((row) => text(row.service_id))
    .filter((id): id is string => Boolean(id));
  return { data: [...new Set(ids)], error: null };
}

export async function loadMarketplaceServices(
  supabase: MarketplaceClient,
  serviceIds: string[],
): Promise<{ data: MarketplaceService[]; error: DbError }> {
  if (serviceIds.length === 0) return { data: [], error: null };
  const [services, mappings] = await Promise.all([
    supabase
      .from("service")
      .select("id, name, is_active, is_deleted, is_marketplace_visible")
      .in("id", serviceIds),
    supabase
      .from("service_marketplace_category")
      .select("service_id, marketplace_category_id")
      .in("service_id", serviceIds),
  ]);
  if (services.error) return { data: [], error: services.error };
  if (mappings.error) return { data: [], error: mappings.error };

  const categoriesByService = new Map<string, string[]>();
  for (const row of asRows(mappings.data)) {
    const serviceId = text(row.service_id);
    const categoryId = text(row.marketplace_category_id);
    if (!serviceId || !categoryId) continue;
    const list = categoriesByService.get(serviceId) ?? [];
    list.push(categoryId);
    categoriesByService.set(serviceId, list);
  }

  const data = asRows(services.data)
    .filter((row) => row.is_deleted !== true)
    .map((row) => {
      const id = text(row.id) ?? "";
      return {
        id,
        name: text(row.name) ?? "",
        active: row.is_active !== false,
        visible: row.is_marketplace_visible !== false,
        categoryIds: categoriesByService.get(id) ?? [],
      };
    })
    .filter((row) => row.id)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  return { data, error: null };
}

export async function loadMarketplaceCategories(
  supabase: MarketplaceClient,
): Promise<{ data: MarketplaceCategory[]; error: DbError }> {
  const { data, error } = await supabase
    .from("marketplace_category")
    .select("id, name, slug, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return { data: [], error };
  const categories = asRows(data)
    .map((row) => ({
      id: text(row.id) ?? "",
      name: text(row.name) ?? "",
      slug: text(row.slug) ?? "",
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    }))
    .filter((row) => row.id);
  return { data: categories, error: null };
}

export async function loadMarketplacePhotos(
  supabase: MarketplaceClient,
  locationId: string,
  supabaseUrl: string,
): Promise<{ data: MarketplacePhoto[]; error: DbError }> {
  const { data, error } = await supabase
    .from("marketplace_media")
    .select("id, storage_path, sort_order, type")
    .eq("location_id", locationId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { data: [], error };
  const photos = asRows(data)
    .filter((row) => {
      const type = text(row.type);
      return !type || type === "IMAGE";
    })
    .map((row) => {
      const storagePath = text(row.storage_path) ?? "";
      return {
        id: text(row.id) ?? "",
        storagePath,
        sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
        url: storagePath ? marketplaceObjectUrl(supabaseUrl, storagePath) : "",
      };
    })
    .filter((row) => row.id && row.storagePath);
  return { data: photos, error: null };
}

function rowsWritten(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0;
  return Boolean(data);
}

const PERMISSION_ERROR: DbError = { code: "42501", message: "permission denied" };

export async function updateListing(
  supabase: MarketplaceClient,
  locationId: string,
  input: { isListed: boolean; slug: string | null },
): Promise<{ error: DbError; taken: boolean }> {
  const { data, error } = await supabase
    .from("location")
    .update({
      is_listed: input.isListed,
      slug: input.slug,
    })
    .eq("id", locationId)
    .select("id");
  if (error) return { error, taken: isUniqueViolation(error) };
  if (!rowsWritten(data)) return { error: PERMISSION_ERROR, taken: false };
  return { error: null, taken: false };
}

export async function updateMarketplaceProfile(
  supabase: MarketplaceClient,
  locationId: string,
  input: {
    description: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    geoEwkt: string | null;
  },
): Promise<{ error: DbError }> {
  const patch: Record<string, unknown> = {
    marketplace_description: input.description,
    street: input.street,
    postal_code: input.postalCode,
    city: input.city,
  };
  if (input.geoEwkt) patch.geo_location = input.geoEwkt;
  const { data, error } = await supabase
    .from("location")
    .update(patch)
    .eq("id", locationId)
    .select("id");
  if (error) return { error };
  if (!rowsWritten(data)) return { error: PERMISSION_ERROR };
  return { error: null };
}

export async function updateServiceVisibility(
  supabase: MarketplaceClient,
  serviceId: string,
  visible: boolean,
): Promise<{ error: DbError }> {
  const { data, error } = await supabase
    .from("service")
    .update({ is_marketplace_visible: visible })
    .eq("id", serviceId)
    .select("id");
  if (error) return { error };
  if (!rowsWritten(data)) return { error: PERMISSION_ERROR };
  return { error: null };
}

export async function addServiceCategory(
  supabase: MarketplaceClient,
  serviceId: string,
  categoryId: string,
): Promise<{ error: DbError }> {
  const { error } = await supabase.from("service_marketplace_category").insert({
    service_id: serviceId,
    marketplace_category_id: categoryId,
  });
  if (error && (error.code === "23505" || (error.message ?? "").includes("duplicate"))) {
    return { error: null };
  }
  return { error };
}

export async function removeServiceCategory(
  supabase: MarketplaceClient,
  serviceId: string,
  categoryId: string,
): Promise<{ error: DbError }> {
  const { data, error } = await supabase
    .from("service_marketplace_category")
    .delete()
    .eq("service_id", serviceId)
    .eq("marketplace_category_id", categoryId)
    .select("service_id");
  if (error) return { error };
  if (!rowsWritten(data)) return { error: PERMISSION_ERROR };
  return { error: null };
}

export async function uploadMarketplacePhoto(
  supabase: MarketplaceClient,
  input: {
    companyId: string;
    locationId: string;
    file: File;
    sortOrder: number;
  },
): Promise<{ data: { id: string; storagePath: string } | null; error: DbError; reason?: "type" | "size" }> {
  const validation = validateMarketplaceImage(input.file);
  if (!validation.ok) return { data: null, error: { message: validation.reason }, reason: validation.reason };

  const fileId = crypto.randomUUID();
  const storagePath = marketplaceStoragePath(
    input.companyId,
    input.locationId,
    fileId,
    validation.extension,
  );
  const uploaded = await supabase.storage.from(MARKETPLACE_BUCKET).upload(storagePath, input.file, {
    contentType: validation.mime,
    upsert: false,
    cacheControl: "3600",
  });
  if (uploaded.error) return { data: null, error: uploaded.error };

  const inserted = await supabase
    .from("marketplace_media")
    .insert({
      location_id: input.locationId,
      company_id: input.companyId,
      storage_path: storagePath,
      type: "IMAGE",
      sort_order: input.sortOrder,
    })
    .select("id, storage_path")
    .single();

  if (inserted.error || !inserted.data || typeof inserted.data !== "object") {
    await supabase.storage.from(MARKETPLACE_BUCKET).remove([storagePath]);
    return { data: null, error: inserted.error ?? { message: "insert failed" } };
  }
  const row = inserted.data as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  if (!id) {
    await supabase.storage.from(MARKETPLACE_BUCKET).remove([storagePath]);
    return { data: null, error: { message: "insert failed" } };
  }
  return { data: { id, storagePath }, error: null };
}

export async function persistPhotoOrder(
  supabase: MarketplaceClient,
  orderedIds: string[],
): Promise<{ error: DbError }> {
  for (let index = 0; index < orderedIds.length; index += 1) {
    const { data, error } = await supabase
      .from("marketplace_media")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .select("id");
    if (error) return { error };
    if (!rowsWritten(data)) return { error: PERMISSION_ERROR };
  }
  return { error: null };
}

export async function deleteMarketplacePhoto(
  supabase: MarketplaceClient,
  photo: { id: string; storagePath: string },
): Promise<{ error: DbError; storageError: DbError }> {
  const removed = await supabase.storage.from(MARKETPLACE_BUCKET).remove([photo.storagePath]);
  const deleted = await supabase
    .from("marketplace_media")
    .delete()
    .eq("id", photo.id)
    .select("id");
  if (deleted.error) return { error: deleted.error, storageError: removed.error };
  if (!rowsWritten(deleted.data)) return { error: PERMISSION_ERROR, storageError: removed.error };
  return { error: null, storageError: removed.error };
}
