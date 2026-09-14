import { describe, expect, it } from "vitest";
import {
  resolveOrderItemCatalogIds,
  writeOrderItemCatalogColumns,
} from "../../supabase/functions/_shared/order/catalog-ids.ts";

const serviceId = "11111111-1111-1111-1111-111111111111";
const variantId = "22222222-2222-2222-2222-222222222222";
const leftoverTreatmentId = "33333333-3333-3333-3333-333333333333";
const leftoverPriceOptionId = "44444444-4444-4444-4444-444444444444";

describe("resolveOrderItemCatalogIds", () => {
  it("prefers service_id / service_variant_id when present", () => {
    expect(
      resolveOrderItemCatalogIds({
        service_id: serviceId,
        service_variant_id: variantId,
        treatment_id: leftoverTreatmentId,
        price_option_id: leftoverPriceOptionId,
      }),
    ).toEqual({ serviceId, serviceVariantId: variantId });
  });

  it("falls back to leftover treatment_id / price_option_id when new cols are null", () => {
    expect(
      resolveOrderItemCatalogIds({
        service_id: null,
        service_variant_id: null,
        treatment_id: leftoverTreatmentId,
        price_option_id: leftoverPriceOptionId,
      }),
    ).toEqual({
      serviceId: leftoverTreatmentId,
      serviceVariantId: leftoverPriceOptionId,
    });
  });

  it("returns nulls for product lines with no catalog ids", () => {
    expect(
      resolveOrderItemCatalogIds({
        service_id: null,
        service_variant_id: null,
        treatment_id: null,
        price_option_id: null,
      }),
    ).toEqual({ serviceId: null, serviceVariantId: null });
  });
});

describe("writeOrderItemCatalogColumns", () => {
  it("writes only service_id / service_variant_id", () => {
    expect(writeOrderItemCatalogColumns(serviceId, variantId)).toEqual({
      service_id: serviceId,
      service_variant_id: variantId,
    });
  });

  it("does not include leftover treatment_id / price_option_id", () => {
    const columns = writeOrderItemCatalogColumns(serviceId, variantId);
    expect(columns).not.toHaveProperty("treatment_id");
    expect(columns).not.toHaveProperty("price_option_id");
  });

  it("writes null catalog ids for product lines without leftover names", () => {
    expect(writeOrderItemCatalogColumns(null, null)).toEqual({
      service_id: null,
      service_variant_id: null,
    });
  });
});
