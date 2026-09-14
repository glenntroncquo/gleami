import { createClient } from "@/lib/supabase/client";
import {
  preferOrderItemServiceId,
  preferOrderItemVariantId,
  type OrderItemServiceIdFields,
} from "@/lib/api/orders/order-item-service-ids";

type CatalogName = { id: string; name: string | null };

export type OrderItemCatalogFields = OrderItemServiceIdFields & {
  service?: { id?: string; name: string | null } | null;
  service_variant?: {
    id?: string;
    name: string | null;
    service?: { id?: string; name: string | null } | null;
  } | null;
};

function asCatalogName(value: unknown): CatalogName | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as { id?: string; name?: string | null };
  if (!record.id && record.name == null) return null;
  return { id: record.id ?? "", name: record.name ?? null };
}

function asVariant(
  value: unknown,
): { id: string; name: string | null; service: CatalogName | null } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as {
    id?: string;
    name?: string | null;
    service?: unknown;
  };
  if (!record.id && record.name == null) return null;
  return {
    id: record.id ?? "",
    name: record.name ?? null,
    service: asCatalogName(record.service),
  };
}

/**
 * Resolve order_item catalog names from service / service_variant.
 * Reads only service_id / service_variant_id.
 */
export async function hydrateOrderItemCatalog<T extends OrderItemServiceIdFields>(
  items: T[],
  supabase: ReturnType<typeof createClient> = createClient(),
): Promise<
  Array<
    T & {
      service: CatalogName | null;
      service_variant: {
        id: string;
        name: string | null;
        service: CatalogName | null;
      } | null;
    }
  >
> {
  if (items.length === 0) return [];

  const serviceIds = new Set<string>();
  const variantIds = new Set<string>();

  for (const item of items) {
    const serviceId = preferOrderItemServiceId(item);
    const variantId = preferOrderItemVariantId(item);
    if (serviceId) serviceIds.add(serviceId);
    if (variantId) variantIds.add(variantId);
  }

  const [{ data: services }, { data: variants }] = await Promise.all([
    serviceIds.size
      ? supabase.from("service").select("id, name").in("id", [...serviceIds])
      : Promise.resolve({ data: [] as CatalogName[] }),
    variantIds.size
      ? supabase
          .from("service_variant")
          .select("id, name, service_id")
          .in("id", [...variantIds])
      : Promise.resolve({
          data: [] as Array<CatalogName & { service_id: string }>,
        }),
  ]);

  const missingServiceIds = [
    ...new Set(
      (variants || [])
        .map((variant) => variant.service_id)
        .filter((id) => id && !serviceIds.has(id)),
    ),
  ];

  let extraServices: CatalogName[] = [];
  if (missingServiceIds.length > 0) {
    const { data } = await supabase
      .from("service")
      .select("id, name")
      .in("id", missingServiceIds);
    extraServices = data || [];
  }

  const serviceMap = new Map<string, CatalogName>(
    [...(services || []), ...extraServices].map((row) => [row.id, row]),
  );
  const variantMap = new Map(
    (variants || []).map((row) => [row.id, row]),
  );

  return items.map((item) => {
    const existing = item as T & OrderItemCatalogFields;
    const serviceId = preferOrderItemServiceId(item);
    const variantId = preferOrderItemVariantId(item);
    const service = serviceId ? serviceMap.get(serviceId) || null : null;
    const variant = variantId ? variantMap.get(variantId) || null : null;
    const variantService = variant
      ? serviceMap.get(variant.service_id) || service
      : service;
    const existingService = asCatalogName(existing.service);
    const existingVariant = asVariant(existing.service_variant);

    return {
      ...item,
      service: service
        ? { id: service.id, name: service.name }
        : existingService,
      service_variant: variant
        ? {
            id: variant.id,
            name: variant.name,
            service: variantService
              ? { id: variantService.id, name: variantService.name }
              : existingService,
          }
        : existingVariant
          ? {
              ...existingVariant,
              service: existingVariant.service || existingService,
            }
          : null,
    };
  });
}
