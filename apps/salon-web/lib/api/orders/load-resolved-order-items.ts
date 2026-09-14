import { createClient } from "@/lib/supabase/client";
import { hydrateOrderItemCatalog } from "@/lib/api/orders/hydrate-order-item-catalog";
import {
  ORDER_ITEM_CATALOG_SELECT,
  preferOrderItemServiceId,
  preferOrderItemVariantId,
} from "@/lib/api/orders/order-item-service-ids";

export type ResolvedOrderItemLine = {
  id: string;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  discount_amount: number | null;
  vat_rate: number | null;
  appointment_id: string | null;
  appointment_segment_id: string | null;
  product_id: string | null;
  service_id: string | null;
  service_variant_id: string | null;
  product: { id: string; name: string | null } | null;
  service: { id: string; name: string | null } | null;
  service_variant: {
    id: string;
    name: string | null;
    service: { id: string; name: string | null } | null;
  } | null;
};

type CatalogName = { id: string; name: string | null };

type RawOrderItemRow = {
  id: string;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  discount_amount: number | null;
  vat_rate?: number | null;
  appointment_id: string | null;
  appointment_segment_id?: string | null;
  product_id: string | null;
  service_id?: string | null;
  service_variant_id?: string | null;
  product?: CatalogName | CatalogName[] | null;
  service?: CatalogName | CatalogName[] | null;
  service_variant?:
    | (CatalogName & { service?: CatalogName | null })
    | Array<CatalogName & { service?: CatalogName | null }>
    | null;
};

function unwrapRelation<T extends object>(value: unknown): T | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as T) : null;
  }
  if (value && typeof value === "object") {
    return value as T;
  }
  return null;
}

/**
 * Load order_item rows for an order with service names resolved.
 * Joins service!service_id / service_variant!service_variant_id only.
 */
export async function loadResolvedOrderItems(
  orderId: string,
  supabase: ReturnType<typeof createClient> = createClient(),
): Promise<ResolvedOrderItemLine[]> {
  const { data, error } = await supabase
    .from("order_item")
    .select(
      `id, quantity, unit_price, total, discount_amount, vat_rate, appointment_id, appointment_segment_id, product_id, ${ORDER_ITEM_CATALOG_SELECT}, product:product_id(id, name)`,
    )
    .eq("order_id", orderId);

  if (error) {
    console.error("Error loading order items:", error);
    return [];
  }

  const rows = (data || []) as RawOrderItemRow[];
  if (rows.length === 0) return [];

  const hydrated = await hydrateOrderItemCatalog(rows, supabase);

  const appointmentIds = [
    ...new Set(hydrated.map((row) => row.appointment_id).filter(Boolean)),
  ] as string[];
  const segmentIds = [
    ...new Set(
      hydrated.map((row) => row.appointment_segment_id).filter(Boolean),
    ),
  ] as string[];

  const appointmentByVariant = new Map<
    string,
    { service: CatalogName | null; service_variant: CatalogName | null }
  >();
  const appointmentById = new Map<
    string,
    { service: CatalogName | null; service_variant: CatalogName | null }
  >();
  const appointmentBySegment = new Map<
    string,
    { service: CatalogName | null; service_variant: CatalogName | null }
  >();

  if (appointmentIds.length > 0 || segmentIds.length > 0) {
    let query = supabase
      .from("appointment_segment")
      .select(
        "id, appointment_id, service_variant_id, service:service_id(id, name), service_variant:service_variant_id(id, name)",
      );
    if (appointmentIds.length > 0) {
      query = query.in("appointment_id", appointmentIds);
    } else {
      query = query.in("id", segmentIds);
    }
    const { data: segmentRows } = await query;

    for (const raw of segmentRows || []) {
      const row = raw as {
        id?: string | null;
        appointment_id?: string | null;
        service_variant_id?: string | null;
        service?: CatalogName | CatalogName[] | null;
        service_variant?: CatalogName | CatalogName[] | null;
      };
      const catalog = {
        service: unwrapRelation<CatalogName>(row.service),
        service_variant: unwrapRelation<CatalogName>(row.service_variant),
      };
      const variantId =
        row.service_variant_id || catalog.service_variant?.id || null;
      if (variantId && !appointmentByVariant.has(variantId)) {
        appointmentByVariant.set(variantId, catalog);
      }
      if (row.id) {
        appointmentBySegment.set(row.id, catalog);
      }
      if (row.appointment_id && !appointmentById.has(row.appointment_id)) {
        appointmentById.set(row.appointment_id, catalog);
      }
    }
  }

  return hydrated.map((row) => {
    const product = unwrapRelation<CatalogName>(row.product);
    const serviceId = preferOrderItemServiceId(row);
    const variantId = preferOrderItemVariantId(row);
    const appointmentFallback =
      (row.appointment_segment_id
        ? appointmentBySegment.get(row.appointment_segment_id)
        : undefined) ||
      (variantId ? appointmentByVariant.get(variantId) : undefined) ||
      (row.appointment_id
        ? appointmentById.get(row.appointment_id)
        : undefined);

    const service =
      unwrapRelation<CatalogName>(row.service) ||
      appointmentFallback?.service ||
      null;
    const joinedVariant = unwrapRelation<
      CatalogName & { service?: CatalogName | null }
    >(row.service_variant);
    const service_variant = joinedVariant
      ? {
          id: joinedVariant.id,
          name: joinedVariant.name,
          service: joinedVariant.service || service,
        }
      : appointmentFallback?.service_variant
        ? {
            id: appointmentFallback.service_variant.id,
            name: appointmentFallback.service_variant.name,
            service: appointmentFallback.service || service,
          }
        : null;

    return {
      id: row.id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total: row.total,
      discount_amount: row.discount_amount,
      vat_rate: row.vat_rate ?? null,
      appointment_id: row.appointment_id,
      appointment_segment_id: row.appointment_segment_id ?? null,
      product_id: row.product_id,
      service_id: serviceId,
      service_variant_id: variantId,
      product,
      service,
      service_variant,
    };
  });
}
