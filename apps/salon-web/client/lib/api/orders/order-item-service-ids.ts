/**
 * Canonical order_item catalog columns are service_id / service_variant_id.
 * Do not select leftover treatment_id / price_option_id — those will be DROPped.
 */

export type OrderItemServiceIdFields = {
  service_id?: string | null;
  service_variant_id?: string | null;
};

export function preferOrderItemServiceId(
  row: OrderItemServiceIdFields,
): string | null {
  return row.service_id || null;
}

export function preferOrderItemVariantId(
  row: OrderItemServiceIdFields,
): string | null {
  return row.service_variant_id || null;
}

/** Canonical columns only. Leftover names stay off the write path until DROP. */
export function orderItemServiceWriteFields(
  serviceId: string | null | undefined,
  serviceVariantId: string | null | undefined,
) {
  return {
    service_id: serviceId ?? null,
    service_variant_id: serviceVariantId ?? null,
  };
}

export const ORDER_ITEM_CATALOG_SELECT =
  "service_id, service_variant_id, service:service!service_id(id, name), service_variant:service_variant!service_variant_id(id, name)";
