import {
  SERVICE_VARIANT_TABLE,
  VARIANT_DELETE_FAILED_MESSAGE,
  VARIANT_HISTORY_TABLES,
  VARIANT_SOFT_DELETE_PATCH,
  collectReferencedVariantIds,
  removeServiceVariants,
  variantRemovalAction,
  type VariantRemovalStore,
} from "./remove-service-variants";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

function mockStore(overrides: Partial<VariantRemovalStore> = {}): VariantRemovalStore & {
  hardCalls: string[][];
  softCalls: string[][];
} {
  const hardCalls: string[][] = [];
  const softCalls: string[][] = [];
  return {
    hardCalls,
    softCalls,
    findHistoryReferences: async () => ({ ids: new Set<string>(), error: null }),
    hardDelete: async (ids) => {
      hardCalls.push(ids);
      return { error: null };
    },
    softDelete: async (ids) => {
      softCalls.push(ids);
      return { error: null };
    },
    ...overrides,
  };
}

async function run() {
  const persistTable: string = SERVICE_VARIANT_TABLE;
  assertEqual(persistTable, "service_variant", "canonical table");
  assertEqual(
    persistTable === "price_option",
    false,
    "must not target dropped price_option",
  );
  assertEqual(
    VARIANT_HISTORY_TABLES,
    ["order_item", "appointment_segment"],
    "history FKs are order_item and appointment_segment",
  );
  assertEqual(
    VARIANT_SOFT_DELETE_PATCH,
    { is_deleted: true, is_active: false },
    "soft-delete hides the variant",
  );
  assertEqual(
    variantRemovalAction(true),
    "soft-delete",
    "referenced by history → soft-delete",
  );
  assertEqual(
    variantRemovalAction(false),
    "hard-delete",
    "unused → hard-delete",
  );
  assertEqual(
    [...collectReferencedVariantIds([
      { service_variant_id: "var-used" },
      { service_variant_id: null },
      { service_variant_id: "var-used" },
    ])],
    ["var-used"],
    "collect unique referenced variant ids",
  );

  const leftoverCopy = /price_option cannot be removed|Failed to delete removed price options\./;
  assertEqual(
    leftoverCopy.test(VARIANT_DELETE_FAILED_MESSAGE),
    false,
    "user-facing copy must not mention price_option table errors",
  );
  assertEqual(
    VARIANT_DELETE_FAILED_MESSAGE.includes("variant"),
    true,
    "user-facing copy talks about variants",
  );

  const unused = mockStore();
  const unusedResult = await removeServiceVariants(["var-1", "var-2"], unused);
  assertEqual(unusedResult.error, null, "unused removal succeeds");
  assertEqual(unused.hardCalls, [["var-1", "var-2"]], "unused variants hard-deleted");
  assertEqual(unused.softCalls, [], "unused variants are not soft-deleted");
  assertEqual(unusedResult.hardDeleted, ["var-1", "var-2"], "hardDeleted ids");

  const referenced = mockStore({
    findHistoryReferences: async () => ({
      ids: new Set(["var-hist"]),
      error: null,
    }),
  });
  const referencedResult = await removeServiceVariants(
    ["var-hist", "var-free"],
    referenced,
  );
  assertEqual(referencedResult.error, null, "mixed removal succeeds");
  assertEqual(referenced.hardCalls, [["var-free"]], "only unused is hard-deleted");
  assertEqual(
    referenced.softCalls,
    [["var-hist"]],
    "history-referenced variant is soft-deleted",
  );

  const fallback = mockStore({
    hardDelete: async (ids) => {
      fallback.hardCalls.push(ids);
      return { error: { message: "violates foreign key constraint" } };
    },
  });
  const fallbackResult = await removeServiceVariants(["var-blocked"], fallback);
  assertEqual(fallbackResult.error, null, "hard-delete FK failure falls back");
  assertEqual(
    fallback.softCalls,
    [["var-blocked"]],
    "blocked hard-delete becomes soft-delete",
  );
  assertEqual(fallbackResult.softDeleted, ["var-blocked"], "fallback ids");

  const empty = mockStore();
  const emptyResult = await removeServiceVariants([], empty);
  assertEqual(emptyResult, {
    error: null,
    hardDeleted: [],
    softDeleted: [],
  }, "empty id list is a no-op");
  assertEqual(empty.hardCalls, [], "no hard delete on empty list");
  assertEqual(empty.softCalls, [], "no soft delete on empty list");
}

run().then(() => {
  console.log("remove-service-variants.test.ts passed");
});
