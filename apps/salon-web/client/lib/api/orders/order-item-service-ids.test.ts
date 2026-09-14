import {
  ORDER_ITEM_CATALOG_SELECT,
  orderItemServiceWriteFields,
  preferOrderItemServiceId,
  preferOrderItemVariantId,
} from "./order-item-service-ids";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

function run() {
  assertEqual(
    preferOrderItemServiceId({
      service_id: "svc-new",
    }),
    "svc-new",
    "read service_id",
  );
  assertEqual(
    preferOrderItemServiceId({
      service_id: null,
    }),
    null,
    "null service_id does not fall back to leftover treatment_id",
  );
  assertEqual(
    preferOrderItemVariantId({
      service_variant_id: "var-new",
    }),
    "var-new",
    "read service_variant_id",
  );
  assertEqual(
    preferOrderItemVariantId({
      service_variant_id: null,
    }),
    null,
    "null service_variant_id does not fall back to leftover price_option_id",
  );
  const written = orderItemServiceWriteFields("svc-1", "var-1");
  assertEqual(
    written,
    {
      service_id: "svc-1",
      service_variant_id: "var-1",
    },
    "write only service_id / service_variant_id",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(written, "treatment_id"),
    false,
    "must not write leftover treatment_id",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(written, "price_option_id"),
    false,
    "must not write leftover price_option_id",
  );

  const leftoverSelect = /\btreatment_id\b|\bprice_option_id\b/;
  assertEqual(
    leftoverSelect.test(ORDER_ITEM_CATALOG_SELECT),
    false,
    "ORDER_ITEM_CATALOG_SELECT must not request leftover columns",
  );
  assertEqual(
    ORDER_ITEM_CATALOG_SELECT.includes("service_id"),
    true,
    "ORDER_ITEM_CATALOG_SELECT requests service_id",
  );
  assertEqual(
    ORDER_ITEM_CATALOG_SELECT.includes("service_variant_id"),
    true,
    "ORDER_ITEM_CATALOG_SELECT requests service_variant_id",
  );
}

run();
console.log("order-item-service-ids.test.ts passed");
