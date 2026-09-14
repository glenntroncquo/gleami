export interface OrderItemCatalogIds {
  serviceId: string | null;
  serviceVariantId: string | null;
}

/**
 * Reads: prefer service_id / service_variant_id.
 * Fall back to leftover treatment_id / price_option_id when the new cols are null.
 * Leftover columns stay until a later SQL DROP — do not remove this fallback yet.
 */
export function resolveOrderItemCatalogIds(row: {
  service_id?: string | null;
  service_variant_id?: string | null;
  treatment_id?: string | null;
  price_option_id?: string | null;
}): OrderItemCatalogIds {
  return {
    serviceId: row.service_id ?? row.treatment_id ?? null,
    serviceVariantId: row.service_variant_id ?? row.price_option_id ?? null,
  };
}

/**
 * Writes: only service_id / service_variant_id.
 * Do not insert leftover treatment_id / price_option_id — live POS is signed
 * off and those leftover names must stay unused so a later SQL DROP is safe.
 */
export function writeOrderItemCatalogColumns(
  serviceId: string | null,
  serviceVariantId: string | null,
): {
  service_id: string | null;
  service_variant_id: string | null;
} {
  return {
    service_id: serviceId,
    service_variant_id: serviceVariantId,
  };
}
